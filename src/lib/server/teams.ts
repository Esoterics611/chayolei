// ═══════════════════════════════════════════════════════════════
// Teams in Firestore: the server side of the new UI (docs/TEAM_BACKEND.md)
//
// The server is the only writer. Every action is a Command applied by the
// same engine the demo runs (src/lib/team/engine.ts), inside a Firestore
// transaction that reads the whole team and writes back what changed, so
// the charter is enforced here and concurrent actions serialize on the
// team's core document.
//
// A team with a contract (team.chain) also records its settled actions
// on-chain (team-chain.ts): the member signs, the server relays, and only
// then applies the action with the transaction as its proof. Actions on
// such a team run one at a time under a lock, so the chain and the ledger
// agree on their order.
// ═══════════════════════════════════════════════════════════════

import { randomBytes } from 'node:crypto';
import type { DocumentReference, Transaction } from 'firebase-admin/firestore';
import { adminDb } from '$lib/server/firebase-admin';
import * as E from '$lib/team/engine';
import { applyCommand, LIMITS, OPENS_CHANGE } from '$lib/team/commands';
import type { Command, CommandResult } from '$lib/team/commands';
import { diffDocs, fromDocs, ledgerDocId, toDocs, viewFor } from '$lib/team/persist';
import type { StoredVersion, TeamCore, TeamDocs } from '$lib/team/persist';
import { activeMember, can, ruleValue } from '$lib/team/rules';
import { RULE_ORDER, TEMPLATES } from '$lib/team/templates';
import { DomainError } from '$lib/team/types';
import type { LedgerEntry, Message, Team, TemplateId } from '$lib/team/types';
import { FACTORY, SETTLED_COMMANDS, TEAM, batchRoot, callFor, charterConfig, idHash, teamDomain, INVITE_TYPES } from '$lib/team/chain';
import { anchorBatch, createdTeam, getChain, inviteSigner, prepareRequest, relay, verifyTransfer } from '$lib/server/team-chain';
import type { Chain, Proof, Signed } from '$lib/server/team-chain';
import { Contract } from 'ethers';

const teams = () => adminDb.collection('teams');
const invites = () => adminDb.collection('teamInvites');

/** Sign-in uids are `wallet_<address>` (src/routes/api/auth/verify). */
export const walletOf = (uid: string) => (uid.startsWith('wallet_') ? uid.slice('wallet_'.length) : '');

async function readDocs(tx: Transaction, ref: DocumentReference): Promise<TeamDocs | null> {
  const core = await tx.get(ref);
  if (!core.exists) return null;
  const [ledger, messages, versions] = await Promise.all([
    tx.get(ref.collection('ledger')),
    tx.get(ref.collection('messages')),
    tx.get(ref.collection('versions')),
  ]);
  return {
    core: core.data() as TeamCore,
    ledger: ledger.docs.map(d => d.data() as LedgerEntry),
    messages: messages.docs.map(d => d.data() as Message),
    versions: versions.docs.map(d => d.data() as StoredVersion),
  };
}

const EMPTY: Omit<TeamDocs, 'core'> = { ledger: [], messages: [], versions: [] };

function writeDocs(tx: Transaction, ref: DocumentReference, before: TeamDocs | null, after: TeamDocs): void {
  const d = diffDocs({ core: after.core, ...(before ?? EMPTY) }, after);
  tx.set(ref, after.core);
  // create(), not set(): two writers can never both append the same seq.
  for (const e of d.ledger) tx.create(ref.collection('ledger').doc(ledgerDocId(e.seq)), e);
  for (const e of d.proved) tx.set(ref.collection('ledger').doc(ledgerDocId(e.seq)), e);
  for (const m of d.messages) tx.create(ref.collection('messages').doc(m.id), m);
  for (const v of d.versions) tx.set(ref.collection('versions').doc(v.id), v);
  for (const id of d.removedVersions) tx.delete(ref.collection('versions').doc(id));
}

/** Load a team, let `fn` change it as `uid`, and save what changed, in one transaction. */
async function mutate<T>(teamId: string, fn: (team: Team, now: string, tx: Transaction) => T | Promise<T>): Promise<{ value: T; team: Team }> {
  const ref = teams().doc(teamId);
  return adminDb.runTransaction(async tx => {
    const before = await readDocs(tx, ref);
    if (!before) throw new DomainError('err.not_found');
    const team = fromDocs(structuredClone(before));
    const now = new Date().toISOString();
    const value = await fn(team, now, tx);
    writeDocs(tx, ref, before, toDocs(team, now));
    return { value, team };
  });
}

/** Only people on the team now may act on it (not those who left). */
export function requireMember(team: Team, uid: string): void {
  if (!activeMember(team, uid)) throw new DomainError('err.not_your_team');
}

const str = (v: unknown, max: number): string => {
  if (typeof v !== 'string' || !v.trim() || v.length > max) throw new DomainError('err.invalid_input');
  return v.trim();
};

const optionalStr = (v: unknown, max: number): string => (v === undefined || v === '' ? '' : str(v, max));

/** Initials from a name, as the start page makes them. */
const initialsOf = (name: string) =>
  name.trim().split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';

export interface Profile {
  name: string;
}

function profile(input: unknown): { name: string; initials: string } {
  const name = str((input as Profile | undefined)?.name, 80);
  return { name, initials: initialsOf(name) };
}

// ── On-chain teams ───────────────────────────────────────────────

/** The whole team, read outside a transaction (to prepare or check an action). */
export async function loadTeam(teamId: string): Promise<Team> {
  const ref = teams().doc(teamId);
  const [core, ledger, messages, versions] = await Promise.all([
    ref.get(), ref.collection('ledger').get(), ref.collection('messages').get(), ref.collection('versions').get(),
  ]);
  if (!core.exists) throw new DomainError('err.not_found');
  return fromDocs({
    core: core.data() as TeamCore,
    ledger: ledger.docs.map(d => d.data() as LedgerEntry),
    messages: messages.docs.map(d => d.data() as Message),
    versions: versions.docs.map(d => d.data() as StoredVersion),
  });
}

async function chainFor(team: Team): Promise<Chain> {
  const c = await getChain();
  if (!c || !team.chain || c.chainId !== team.chain.chainId) throw new DomainError('err.chain.unavailable');
  return c;
}

/** Would the engine accept this action now? (Throws its refusal if not.) */
const dryRun = (team: Team, uid: string, cmd: Command) =>
  applyCommand(structuredClone(team), uid, cmd, new Date().toISOString());

const LOCK_MS = 120_000;
const LOCK_WAIT_MS = 20_000;

/** Run `fn` while holding the team's lock: one recorded action at a time. */
async function withTeamLock<T>(teamId: string, fn: () => Promise<T>): Promise<T> {
  const ref = teams().doc(teamId).collection('system').doc('lock');
  const holder = randomBytes(8).toString('hex');
  const giveUp = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    const got = await adminDb.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (snap.exists && (snap.get('until') as number) > Date.now()) return false;
      tx.set(ref, { holder, until: Date.now() + LOCK_MS });
      return true;
    });
    if (got) break;
    if (Date.now() > giveUp) throw new DomainError('err.busy');
    await new Promise(r => setTimeout(r, 400));
  }
  try {
    return await fn();
  } finally {
    await adminDb.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (snap.exists && snap.get('holder') === holder) tx.delete(ref);
    }).catch(e => console.error('[teams] releasing the lock failed', e));
  }
}

/** Anchor every batch of signed entries whose anchor entry has no proof yet. */
export async function anchorPending(teamId: string): Promise<void> {
  const c = await getChain();
  if (!c) return;
  const team = await loadTeam(teamId);
  if (!team.chain || team.chain.chainId !== c.chainId) return;
  const onChain = Number(await new Contract(team.chain.address, TEAM, c.provider).anchoredBatches());
  for (const a of team.ledger.filter(e => e.kind === 'anchor' && !e.proof.tx).sort((x, y) => x.seq - y.seq)) {
    const batch = Number(a.data?.batch ?? 0);
    if (batch <= onChain) continue; // anchored before, but its proof wasn't saved; the event is on-chain
    const entries = team.ledger.filter(e => e.tier === 'signed' && e.proof.batch === batch).sort((x, y) => x.seq - y.seq);
    const root = batchRoot(entries);
    const proof = await anchorBatch(c, team.chain.address, batch, root, entries.length);
    await mutate(teamId, t => {
      const e = t.ledger.find(x => x.seq === a.seq);
      if (e) { e.proof = { ...proof }; e.data = { ...(e.data ?? {}), root }; }
    });
  }
}

/** Prepare a settled action for the member to sign: the exact forward request. */
export async function prepareCommand(teamId: string, uid: string, cmd: Command) {
  const team = await loadTeam(teamId);
  requireMember(team, uid);
  if (!team.chain || !SETTLED_COMMANDS.has(cmd.type)) return { onChain: false as const };
  const c = await chainFor(team);
  // The contract keys proposals by the change's id, so it is chosen here.
  const command: Command = OPENS_CHANGE.has(cmd.type) && !(cmd as { id?: string }).id
    ? { ...cmd, id: E.newId('c') } as Command : cmd;
  dryRun(team, uid, command);
  return { onChain: true as const, command, ...(await prepareRequest(c, walletOf(uid), callFor(team, command))) };
}

// ── Teams ────────────────────────────────────────────────────────

function teamInput(input: { name?: unknown; purpose?: unknown; templateId?: unknown; you?: unknown }) {
  const templateId = input.templateId as TemplateId;
  if (typeof templateId !== 'string' || !(templateId in TEMPLATES)) throw new DomainError('err.invalid_input');
  return {
    name: str(input.name, LIMITS.title), purpose: optionalStr(input.purpose, LIMITS.body), templateId, you: profile(input.you),
  };
}

const createCall = (c: Chain, v: ReturnType<typeof teamInput>) =>
  ({ to: c.factory, data: FACTORY.encodeFunctionData('createTeam', [charterConfig(v)]) });

/** With a chain configured, a new team is created on-chain: the founder signs this first. */
export async function prepareTeam(uid: string, input: { name?: unknown; purpose?: unknown; templateId?: unknown; you?: unknown }) {
  const c = await getChain();
  if (!c) return { onChain: false as const };
  return { onChain: true as const, ...(await prepareRequest(c, walletOf(uid), createCall(c, teamInput(input)))) };
}

/** Start a team; the signed-in member is its founder. */
export async function createTeamFor(
  uid: string,
  input: { name?: unknown; purpose?: unknown; templateId?: unknown; you?: unknown },
  signed?: Signed,
): Promise<Team> {
  const v = teamInput(input);
  const c = await getChain();
  let chain: Team['chain'];
  let proof: Proof | undefined;
  if (c) {
    const r = await relay(c, signed, { from: walletOf(uid), ...createCall(c, v) });
    chain = { address: createdTeam(r.receipt), chainId: c.chainId };
    proof = r.proof;
  }
  const ref = teams().doc();
  const now = new Date().toISOString();
  const team = E.createTeam({
    id: ref.id, live: true, chain, name: v.name, purpose: v.purpose, templateId: v.templateId,
    founder: { id: uid, name: v.you.name, initials: v.you.initials, wallet: walletOf(uid) },
  }, now);
  if (proof) team.ledger[0].proof = { ...proof };
  await adminDb.runTransaction(async tx => writeDocs(tx, ref, null, toDocs(team, now)));
  return team;
}

/** Run one member's action on a team. Settled actions on an on-chain team
 *  need the member's signed request (from prepareCommand); a contribution
 *  needs the transaction that moved the TMIM. */
export async function runTeamCommand(teamId: string, uid: string, cmd: Command, signed?: Signed): Promise<{ result: CommandResult; team: Team }> {
  const core = await teams().doc(teamId).get();
  if (!core.exists) throw new DomainError('err.not_found');
  if (!(core.data() as TeamCore).chain) {
    const { value, team } = await mutate(teamId, (team, now) => {
      requireMember(team, uid);
      return applyCommand(team, uid, cmd, now);
    });
    return { result: value, team: viewFor(team, uid) };
  }
  return withTeamLock(teamId, async () => {
    const team = await loadTeam(teamId);
    requireMember(team, uid);
    let proof: Proof | undefined;
    if (SETTLED_COMMANDS.has(cmd.type)) {
      const c = await chainFor(team);
      dryRun(team, uid, cmd);
      proof = (await relay(c, signed, { from: walletOf(uid), ...callFor(team, cmd) })).proof;
    } else if (cmd.type === 'contribute') {
      const c = await chainFor(team);
      dryRun(team, uid, cmd);
      if (!cmd.txHash) throw new DomainError('err.chain.transfer');
      proof = await verifyTransfer(c, cmd.txHash, walletOf(uid), team.chain!.address, cmd.amount);
    }
    const { value, team: after } = await mutate(teamId, async (t, now, tx) => {
      requireMember(t, uid);
      if (cmd.type === 'contribute' && cmd.txHash) {
        // Each transfer counts once.
        const used = teams().doc(teamId).collection('chainTxs').doc(cmd.txHash.toLowerCase());
        if ((await tx.get(used)).exists) throw new DomainError('err.chain.transfer');
        tx.create(used, { by: uid, at: now });
      }
      const from = t.ledger.length;
      const result = applyCommand(t, uid, cmd, now);
      if (proof) for (const e of t.ledger.slice(from)) if (e.tier === 'settled' && e.kind !== 'anchor') e.proof = { ...proof };
      return result;
    });
    await anchorPending(teamId).catch(e => console.error('[teams] anchoring failed; will retry', e));
    return { result: value, team: viewFor(after, uid) };
  });
}

// ── Invites ──────────────────────────────────────────────────────

export interface InviteDoc {
  teamId: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  maxUses: number;
  uses: number;
  /** On-chain teams: the invite as the inviter signed it (Team.join checks it). */
  signed?: { id: string; maxUses: number; expiresAt: number; inviter: string; signature: string };
}

export const INVITE_DAYS = 14;
export const INVITE_USES = 25;

async function admitter(teamId: string, uid: string): Promise<Team> {
  const snap = await teams().doc(teamId).get();
  if (!snap.exists) throw new DomainError('err.not_found');
  const team = fromDocs({ core: snap.data() as TeamCore, ...EMPTY });
  requireMember(team, uid);
  if (!can(team, uid, 'admit')) throw new DomainError('err.permission.admit');
  return team;
}

/** For an on-chain team, the inviter signs the invite: Team.join checks it. */
export async function prepareInvite(teamId: string, uid: string) {
  const team = await admitter(teamId, uid);
  if (!team.chain) return { onChain: false as const };
  const c = await chainFor(team);
  const token = randomBytes(18).toString('base64url');
  const invite = { id: idHash(token), maxUses: INVITE_USES, expiresAt: Math.floor(Date.now() / 1000) + INVITE_DAYS * 86_400 };
  return { onChain: true as const, token, invite, domain: teamDomain(c.chainId, team.chain.address), types: INVITE_TYPES };
}

/** A link that lets people join, made by a member who may admit people. */
export async function createInvite(
  teamId: string, uid: string,
  body: { token?: unknown; invite?: { id?: unknown; maxUses?: unknown; expiresAt?: unknown }; signature?: unknown } = {},
): Promise<{ token: string; expiresAt: string }> {
  const team = await admitter(teamId, uid);
  const now = new Date();
  let token = randomBytes(18).toString('base64url');
  let expiresAt = new Date(now.getTime() + INVITE_DAYS * 86_400_000);
  let signed: InviteDoc['signed'];
  if (team.chain) {
    const c = await chainFor(team);
    const t = body.token, inv = body.invite, sig = body.signature;
    if (typeof t !== 'string' || !/^[\w-]{20,40}$/.test(t) || typeof sig !== 'string' || !inv) throw new DomainError('err.chain.unsigned');
    const invite = { id: idHash(t), maxUses: Number(inv.maxUses), expiresAt: Number(inv.expiresAt) };
    const nowSec = Math.floor(now.getTime() / 1000);
    if (inv.id !== invite.id || invite.maxUses !== INVITE_USES || invite.expiresAt <= nowSec || invite.expiresAt > nowSec + (INVITE_DAYS + 1) * 86_400) {
      throw new DomainError('err.invalid_input');
    }
    const inviter = inviteSigner(c, team.chain.address, invite, sig);
    if (!inviter || inviter.toLowerCase() !== walletOf(uid)) throw new DomainError('err.chain.signature');
    token = t;
    expiresAt = new Date(invite.expiresAt * 1000);
    signed = { ...invite, inviter, signature: sig };
  }
  const doc: InviteDoc = {
    teamId, createdBy: uid, createdAt: now.toISOString(), expiresAt: expiresAt.toISOString(),
    maxUses: INVITE_USES, uses: 0, ...(signed ? { signed } : {}),
  };
  await invites().doc(token).create(doc);
  return { token, expiresAt: doc.expiresAt };
}

const usable = (inv: InviteDoc, now: string) => inv.expiresAt > now && inv.uses < inv.maxUses;

/** What someone opening an invite link may see before joining: the team's
 *  purpose and charter in plain words, not its members or records. */
export async function inviteInfo(token: string) {
  const inv = await invites().doc(token).get();
  if (!inv.exists) throw new DomainError('err.invite_invalid');
  const data = inv.data() as InviteDoc;
  const snap = await teams().doc(data.teamId).get();
  if (!snap.exists) throw new DomainError('err.invite_invalid');
  const core = snap.data() as TeamCore;
  const team = fromDocs({ core, ...EMPTY });
  return {
    teamId: core.id,
    name: core.name,
    purpose: core.purpose,
    templateId: core.templateId,
    roles: core.charter.roles,
    joinerRoleIds: TEMPLATES[core.templateId].joinerRoleIds,
    rules: Object.fromEntries(RULE_ORDER.map(k => [k, ruleValue(team, k)])),
    memberCount: core.memberUids.length,
    usable: usable(data, new Date().toISOString()),
    onChain: !!core.chain,
  };
}

async function inviteFor(token: string): Promise<InviteDoc> {
  const inv = await invites().doc(token).get();
  if (!inv.exists) throw new DomainError('err.invite_invalid');
  return inv.data() as InviteDoc;
}

const joinCall = (team: Team, inv: InviteDoc) => {
  const s = inv.signed;
  if (!team.chain || !s) throw new DomainError('err.invite_invalid');
  return { to: team.chain.address, data: TEAM.encodeFunctionData('join', [s.inviter, s.id, s.maxUses, s.expiresAt, s.signature]) };
};

/** For an on-chain team, the person joining signs Team.join with the invite. */
export async function prepareJoin(token: string, uid: string) {
  const inv = await inviteFor(token);
  const team = await loadTeam(inv.teamId);
  if (!team.chain || activeMember(team, uid)) return { onChain: false as const };
  if (!usable(inv, new Date().toISOString())) throw new DomainError('err.invite_invalid');
  const c = await chainFor(team);
  return { onChain: true as const, ...(await prepareRequest(c, walletOf(uid), joinCall(team, inv))) };
}

/** Join a team through an invite link, with the charter's joiner roles. */
export async function acceptInvite(token: string, uid: string, input: unknown, signed?: Signed): Promise<Team> {
  const you = profile(input);
  const invRef = invites().doc(token);
  const first = await inviteFor(token);
  const join = async (proof?: Proof) => {
    const { team } = await mutate(first.teamId, async (team, now, tx) => {
      const inv = await tx.get(invRef);
      const data = inv.data() as InviteDoc | undefined;
      if (activeMember(team, uid)) return; // already in: opening the link again is fine
      if (!data || data.teamId !== team.id || !usable(data, now)) throw new DomainError('err.invite_invalid');
      const from = team.ledger.length;
      E.addMember(team, { id: uid, name: you.name, initials: you.initials, wallet: walletOf(uid) }, now);
      if (proof) for (const e of team.ledger.slice(from)) if (e.tier === 'settled') e.proof = { ...proof };
      tx.update(invRef, { uses: data.uses + 1 });
    });
    return viewFor(team, uid);
  };
  const core = await teams().doc(first.teamId).get();
  if (!(core.data() as TeamCore | undefined)?.chain) return join();
  return withTeamLock(first.teamId, async () => {
    const team = await loadTeam(first.teamId);
    if (activeMember(team, uid)) return viewFor(team, uid);
    const inv = await inviteFor(token);
    if (!usable(inv, new Date().toISOString())) throw new DomainError('err.invite_invalid');
    const c = await chainFor(team);
    const { proof } = await relay(c, signed, { from: walletOf(uid), ...joinCall(team, inv) });
    return join(proof);
  });
}

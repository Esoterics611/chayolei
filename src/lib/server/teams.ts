// ═══════════════════════════════════════════════════════════════
// Teams in Firestore: the server side of the new UI (docs/TEAM_BACKEND.md)
//
// The server is the only writer. Every action is a Command applied by the
// same engine the demo runs (src/lib/team/engine.ts), inside a Firestore
// transaction that reads the whole team and writes back what changed, so
// the charter is enforced here and concurrent actions serialize on the
// team's core document.
// ═══════════════════════════════════════════════════════════════

import { randomBytes } from 'node:crypto';
import type { DocumentReference, Transaction } from 'firebase-admin/firestore';
import { adminDb } from '$lib/server/firebase-admin';
import * as E from '$lib/team/engine';
import { applyCommand, LIMITS } from '$lib/team/commands';
import type { Command, CommandResult } from '$lib/team/commands';
import { diffDocs, fromDocs, ledgerDocId, toDocs, viewFor } from '$lib/team/persist';
import type { StoredVersion, TeamCore, TeamDocs } from '$lib/team/persist';
import { can, ruleValue } from '$lib/team/rules';
import { RULE_ORDER, TEMPLATES } from '$lib/team/templates';
import { DomainError } from '$lib/team/types';
import type { LedgerEntry, Message, Team, TemplateId } from '$lib/team/types';

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

function requireMember(team: Team, uid: string): void {
  if (!team.members.some(m => m.id === uid)) throw new DomainError('err.not_your_team');
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

// ── Teams ────────────────────────────────────────────────────────

/** Start a team; the signed-in member is its founder. */
export async function createTeamFor(
  uid: string,
  input: { name?: unknown; purpose?: unknown; templateId?: unknown; you?: unknown },
): Promise<Team> {
  const templateId = input.templateId as TemplateId;
  if (typeof templateId !== 'string' || !(templateId in TEMPLATES)) throw new DomainError('err.invalid_input');
  const you = profile(input.you);
  const ref = teams().doc();
  const now = new Date().toISOString();
  const team = E.createTeam({
    id: ref.id, live: true,
    name: str(input.name, LIMITS.title), purpose: optionalStr(input.purpose, LIMITS.body), templateId,
    founder: { id: uid, name: you.name, initials: you.initials, wallet: walletOf(uid) },
  }, now);
  await adminDb.runTransaction(async tx => writeDocs(tx, ref, null, toDocs(team, now)));
  return team;
}

/** Run one member's action on a team. */
export async function runTeamCommand(teamId: string, uid: string, cmd: Command): Promise<{ result: CommandResult; team: Team }> {
  const { value, team } = await mutate(teamId, (team, now) => {
    requireMember(team, uid);
    return applyCommand(team, uid, cmd, now);
  });
  return { result: value, team: viewFor(team, uid) };
}

// ── Invites ──────────────────────────────────────────────────────

export interface InviteDoc {
  teamId: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  maxUses: number;
  uses: number;
}

export const INVITE_DAYS = 14;
export const INVITE_USES = 25;

/** A link that lets people join, made by a member who may admit people. */
export async function createInvite(teamId: string, uid: string): Promise<{ token: string; expiresAt: string }> {
  const snap = await teams().doc(teamId).get();
  if (!snap.exists) throw new DomainError('err.not_found');
  const team = fromDocs({ core: snap.data() as TeamCore, ...EMPTY });
  requireMember(team, uid);
  if (!can(team, uid, 'admit')) throw new DomainError('err.permission.admit');
  const token = randomBytes(18).toString('base64url');
  const now = new Date();
  const doc: InviteDoc = {
    teamId, createdBy: uid, createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + INVITE_DAYS * 86_400_000).toISOString(),
    maxUses: INVITE_USES, uses: 0,
  };
  await invites().doc(token).set(doc);
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
  };
}

/** Join a team through an invite link, with the charter's joiner roles. */
export async function acceptInvite(token: string, uid: string, input: unknown): Promise<Team> {
  const you = profile(input);
  const invRef = invites().doc(token);
  const first = await invRef.get();
  if (!first.exists) throw new DomainError('err.invite_invalid');
  const { team } = await mutate((first.data() as InviteDoc).teamId, async (team, now, tx) => {
    const inv = await tx.get(invRef);
    const data = inv.data() as InviteDoc | undefined;
    if (team.members.some(m => m.id === uid)) return; // already in: opening the link again is fine
    if (!data || data.teamId !== team.id || !usable(data, now)) throw new DomainError('err.invite_invalid');
    E.addMember(team, { id: uid, name: you.name, initials: you.initials, wallet: walletOf(uid) }, now);
    tx.update(invRef, { uses: data.uses + 1 });
  });
  return viewFor(team, uid);
}

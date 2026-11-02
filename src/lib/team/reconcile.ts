// Reconciliation: what happened on a team's contract without the app
// (docs/TEAM_BACKEND.md §6b). Members can call their team's contract
// directly, from a block explorer or their own wallet: vote, close a vote,
// approve, leave, put TMIM in. The chain is authoritative for the settled
// tier, so each such transaction is recorded here, in chain order: through
// the engine as the member who sent it where the engine agrees, and as the
// contract recorded it where the two disagree. A transaction the app already
// recorded (its hash is a ledger proof) is skipped, so replaying is harmless.
//
// Pure: the server reads and decodes the chain (src/lib/server/team-reconciler.ts).

import type { CharterChange, LedgerEntry, Member, MoneyChange, RoleChange, RuleChange, Team, Text, VoteChoice, WorkChange } from './types';
import { DomainError } from './types';
import * as E from './engine';
import { appendEntry } from './ledger';
import { activeMember, ruleValue } from './rules';
import { RULE_ORDER } from './templates';
import { idHash } from './chain';

/** One decoded event of a team's contract, or a TMIM transfer into it. Addresses are checksummed or lower case. */
export type ChainEvent =
  | { name: 'ProposalOpened'; ref: string; kind: number; proposer: string; byVote: boolean; closesAt: number; rule: number; to: string; objective: string; value: number; stake: number }
  | { name: 'VoteCast'; ref: string; voter: string; choice: number }
  | { name: 'ProposalDecided'; ref: string; status: number; forVotes: number; against: number; abstain: number; eligible: number }
  | { name: 'MemberJoined'; member: string; roles: number }
  | { name: 'MemberLeft'; member: string; roles: number }
  | { name: 'Accepted'; deliverable: string; objective: string; owner: string; reward: number; reviewer: string; reviewReward: number; approver: string }
  | { name: 'Released'; deliverable: string; contentHash: string; by: string }
  | { name: 'Paid'; ref: string; objective: string; to: string; amount: number; by: string }
  | { name: 'Anchored'; batch: number; root: string; entries: number; by: string }
  | { name: 'Transfer'; from: string; amount: number }
  // Consequences of a decision, carried by the transaction that decided it.
  | { name: 'RuleChanged' | 'RolesChanged' | 'MoneyMoved' | 'BudgetSet' | 'TeamInitialized' | 'InviteRevoked' };

/** One transaction touching the team: who sent it (the member, also through
 *  the forwarder), when, and its events in log order. */
export interface ChainTx {
  hash: string;
  block: number;
  /** Block time, ISO. */
  at: string;
  sender: string;
  events: ChainEvent[];
}

export type Outcome = 'known' | 'recorded' | 'noted';

const CHOICE: Record<number, VoteChoice> = { 1: 'for', 2: 'against', 3: 'abstain' };
const STATUS: Record<number, 'passed' | 'failed' | 'approved' | 'declined'> = { 2: 'passed', 3: 'failed', 4: 'approved', 5: 'declined' };
const same = (a: string | undefined, b: string | undefined) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
const ZERO = '0x0000000000000000000000000000000000000000';

/** Whether the ledger already holds this transaction. */
export const isRecorded = (team: Team, hash: string): boolean => team.ledger.some(e => same(e.proof.tx, hash));

const byWallet = (team: Team, address: string): Member | undefined =>
  team.members.find(m => same(m.wallet, address));

const changeByRef = (team: Team, ref: string): CharterChange | undefined =>
  team.changes.find((c): c is CharterChange => c.kind !== 'work' && (same(c.chainRef, ref) || same(idHash(c.id), ref)));

const objectiveByHash = (team: Team, hash: string) => team.objectives.find(o => same(idHash(o.id), hash));
const deliverableByHash = (team: Team, hash: string) => team.deliverables.find(d => same(idHash(d.id), hash));

const roleIdsOf = (team: Team, bits: number) => team.charter.roles.filter((_, i) => bits & (1 << i)).map(r => r.id);

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

const OPENED_ON_CHAIN: Text = { en: 'Proposed on the team’s contract', he: 'הוצע בחוזה של החבורה' };

/**
 * Record one transaction the app may not have seen. Returns 'known' when the
 * ledger already holds it (or it changes nothing the ledger shows), 'recorded'
 * when it was applied, and 'noted' when it couldn't be matched to the team's
 * records: then a `chain_noted` entry says so, for people to look at.
 */
export function reconcileTx(team: Team, tx: ChainTx): Outcome {
  if (isRecorded(team, tx.hash)) return 'known';
  const from = team.ledger.length;
  let outcome: Outcome;
  try {
    outcome = apply(team, tx);
  } catch (e) {
    if (!(e instanceof DomainError)) throw e;
    team.ledger.length = from; // nothing half-recorded
    outcome = 'noted';
  }
  if (outcome === 'noted') {
    const primary = tx.events.find(ev => !CONSEQUENCES.has(ev.name)) ?? tx.events[0];
    const actor = byWallet(team, tx.sender);
    appendEntry(team, {
      kind: 'chain_noted', at: tx.at, actorId: actor?.id ?? '', refs: actor ? { memberId: actor.id } : {},
      data: { event: primary?.name ?? 'unknown', from: tx.sender.toLowerCase() },
    });
  }
  // Every entry this transaction added carries it as its proof, and says it came from the chain.
  for (const e of team.ledger.slice(from)) {
    if (e.kind === 'anchor') continue;
    if (e.tier === 'settled') e.proof = { tx: tx.hash, block: tx.block };
    e.data = { ...(e.data ?? {}), via: 'chain' };
  }
  return outcome;
}

const CONSEQUENCES = new Set(['RuleChanged', 'RolesChanged', 'MoneyMoved', 'BudgetSet', 'TeamInitialized', 'InviteRevoked']);

function apply(team: Team, tx: ChainTx): Outcome {
  const events = tx.events.filter(ev => !CONSEQUENCES.has(ev.name));
  if (!events.length) return 'known';
  const decided = tx.events.find((ev): ev is Extract<ChainEvent, { name: 'ProposalDecided' }> => ev.name === 'ProposalDecided');
  const ev = events[0];
  const now = tx.at;
  const sender = byWallet(team, tx.sender);

  switch (ev.name) {
    case 'Transfer': {
      // TMIM sent to the team's address: a contribution, by a member or anyone.
      const m = byWallet(team, ev.from);
      team.treasury.teamAccount += ev.amount;
      appendEntry(team, {
        kind: 'money_moved', at: now, actorId: m?.id ?? '', refs: m ? { memberId: m.id } : {},
        ...(m ? { amounts: [{ memberId: m.id, amount: -ev.amount, source: 'contribution' as const }] } : {}),
        data: m ? { accountIn: ev.amount } : { accountIn: ev.amount, from: ev.from.toLowerCase() },
      });
      return 'recorded';
    }
    case 'VoteCast': {
      const c = changeByRef(team, ev.ref);
      const m = byWallet(team, ev.voter);
      const choice = CHOICE[ev.choice];
      if (!c || !m || !choice) return 'noted';
      if (c.status === 'open') {
        try {
          E.vote(team, m.id, c.id, choice, now);
        } catch (e) {
          if (!(e instanceof DomainError)) throw e;
          // The app's clock or voter list differs slightly: record the vote as the contract did.
          const v = c.votes.find(x => x.memberId === m.id);
          if (v) { v.choice = choice; v.at = now; } else c.votes.push({ memberId: m.id, choice, at: now });
          appendEntry(team, { kind: 'vote_cast', at: now, actorId: m.id, refs: { changeId: c.id }, data: { choice } });
        }
      }
      if (decided) settle(team, decided, sender?.id, now);
      return 'recorded';
    }
    case 'ProposalDecided':
      // closeVoting, approve or decline called directly.
      if (!changeByRef(team, ev.ref)) return 'noted';
      settle(team, ev, sender?.id, now);
      return 'recorded';
    case 'ProposalOpened':
      return opened(team, ev, now) ? 'recorded' : 'noted';
    case 'MemberJoined': {
      const existing = activeMember(team, byWallet(team, ev.member)?.id);
      if (existing) return 'known';
      // Joined with an invite on the contract directly: the app knows only the address.
      const former = byWallet(team, ev.member);
      const address = ev.member.toLowerCase();
      E.addMember(team, {
        id: former?.id ?? `wallet_${address}`, name: former?.name ?? short(address),
        initials: former?.initials ?? address.slice(2, 4).toUpperCase(), wallet: address, roleIds: roleIdsOf(team, ev.roles),
      }, now);
      return 'recorded';
    }
    case 'MemberLeft': {
      const m = activeMember(team, byWallet(team, ev.member)?.id);
      if (!m) return 'known';
      try {
        E.leave(team, m.id, now);
      } catch (e) {
        if (!(e instanceof DomainError)) throw e;
        return 'noted';
      }
      return 'recorded';
    }
    case 'Accepted':
      return accepted(team, ev, now) ? 'recorded' : 'noted';
    case 'Released': {
      const d = deliverableByHash(team, ev.deliverable);
      if (!d) return 'noted';
      if (d.stage === 'released') return 'known';
      const by = byWallet(team, ev.by);
      try {
        E.release(team, by?.id ?? '', d.id, now);
      } catch (e) {
        if (!(e instanceof DomainError)) throw e;
        d.stage = 'released';
        d.releasedAt = now;
        appendEntry(team, { kind: 'released', at: now, actorId: by?.id ?? '', refs: { deliverableId: d.id, objectiveId: d.objectiveId }, data: { n: E.versionById(d, d.acceptedVersionId)?.n ?? 0 } });
      }
      return 'recorded';
    }
    case 'Paid': {
      const to = byWallet(team, ev.to);
      const o = objectiveByHash(team, ev.objective);
      if (!to || !o) return 'noted';
      const s = team.treasury.schedules.find(x => same(idHash(`${x.id}@${x.nextAt}`), ev.ref));
      const by = byWallet(team, ev.by);
      appendEntry(team, {
        kind: 'scheduled_paid', at: now, actorId: by?.id ?? '', refs: { memberId: to.id, objectiveId: o.id },
        amounts: [{ memberId: to.id, amount: ev.amount, objectiveId: o.id, source: 'minted' }],
      });
      if (s) s.nextAt = new Date(new Date(s.nextAt).getTime() + 7 * 86_400_000).toISOString();
      return 'recorded';
    }
    case 'Anchored': {
      // Anchored, but the proof wasn't saved (the server stopped in between): fill it in.
      const a = team.ledger.find(e => e.kind === 'anchor' && Number(e.data?.batch) === ev.batch);
      if (!a || a.proof.tx) return 'known';
      a.proof = { tx: tx.hash, block: tx.block };
      a.data = { ...(a.data ?? {}), root: ev.root };
      return 'known';
    }
  }
  return 'known';
}

/** Apply the contract's decision, unless the app already reached the same one. */
function settle(team: Team, ev: Extract<ChainEvent, { name: 'ProposalDecided' }>, actorId: string | undefined, now: string): void {
  const c = changeByRef(team, ev.ref);
  const outcome = STATUS[ev.status];
  if (!c || !outcome || c.status !== 'open') return;
  const decisive = ev.forVotes + ev.against;
  const cast = decisive + ev.abstain;
  E.settleDecision(team, c.id, outcome, actorId, {
    forPct: decisive ? Math.round((ev.forVotes / decisive) * 100) : 0,
    turnout: ev.eligible ? Math.round((cast / ev.eligible) * 100) : 0,
  }, now);
}

/** A proposal opened on the contract directly: the app adds it under a new id,
 *  keeping the contract's ref so later votes go to the same proposal. */
function opened(team: Team, ev: Extract<ChainEvent, { name: 'ProposalOpened' }>, now: string): boolean {
  if (changeByRef(team, ev.ref)) return true;
  const proposer = byWallet(team, ev.proposer);
  if (!proposer) return false;
  const id = `chain-${ev.ref.slice(2, 14)}`;
  const closesAt = ev.closesAt ? new Date(ev.closesAt * 1000).toISOString() : undefined;
  const base = { id, title: OPENED_ON_CHAIN, why: '', proposerId: proposer.id, status: 'open' as const, votes: [], at: now, chainRef: ev.ref };
  if (ev.kind === 0) {
    const ruleKey = RULE_ORDER[ev.rule];
    if (!ruleKey) return false;
    const c: RuleChange = { ...base, kind: 'rule', ruleKey, from: ruleValue(team, ruleKey), to: ev.value, closesAt: closesAt ?? now };
    team.changes.push(c);
    appendEntry(team, { kind: 'change_opened', at: now, actorId: proposer.id, refs: { changeId: id, ruleKey }, data: { from: c.from, to: c.to } });
    return true;
  }
  if (ev.kind === 1 || ev.kind === 2) {
    const to = ev.kind === 1 ? byWallet(team, ev.to) : undefined;
    const o = ev.kind === 2 ? objectiveByHash(team, ev.objective) : undefined;
    if (ev.kind === 1 ? !to : !o) return false;
    const c: MoneyChange = {
      ...base, kind: 'money', amount: ev.stake,
      action: ev.kind === 1 ? { type: 'transfer', to: to!.id, amount: ev.value } : { type: 'budget', objectiveId: o!.id, to: ev.value },
      decidedBy: ev.byVote ? 'vote' : 'role', closesAt: ev.byVote ? closesAt : undefined,
    };
    team.changes.push(c);
    appendEntry(team, {
      kind: 'change_opened', at: now, actorId: proposer.id,
      refs: { changeId: id, objectiveId: o?.id, memberId: to?.id }, data: { amount: c.amount },
    });
    return true;
  }
  if (ev.kind === 3) {
    const m = byWallet(team, ev.to);
    if (!m) return false;
    const c: RoleChange = { ...base, kind: 'role', memberId: m.id, from: [...m.roleIds], to: roleIdsOf(team, ev.value), closesAt: closesAt ?? now };
    team.changes.push(c);
    appendEntry(team, { kind: 'change_opened', at: now, actorId: proposer.id, refs: { changeId: id, memberId: m.id }, data: { from: c.from.join(','), to: c.to.join(',') } });
    return true;
  }
  return false;
}

/** Work accepted and paid on the contract directly: through the engine if the
 *  app agrees it was ready, otherwise as the contract recorded it. */
function accepted(team: Team, ev: Extract<ChainEvent, { name: 'Accepted' }>, now: string): boolean {
  const d = deliverableByHash(team, ev.deliverable);
  const owner = byWallet(team, ev.owner);
  const approver = byWallet(team, ev.approver);
  if (!d || !owner) return false;
  if (d.stage === 'accepted' || d.stage === 'released') return true;
  const c = E.workChangesOf(team, d.id).find(x => x.status === 'reviewed' || x.status === 'open') as WorkChange | undefined;
  if (c && approver) {
    try {
      E.acceptAndPay(team, approver.id, c.id, now);
      return true;
    } catch (e) {
      if (!(e instanceof DomainError)) throw e;
    }
  }
  const reviewer = ev.reviewer && !same(ev.reviewer, ZERO) ? byWallet(team, ev.reviewer) : undefined;
  if (c) { c.status = 'accepted'; c.decidedAt = now; c.decidedBy = approver?.id; }
  d.stage = 'accepted';
  d.ownerId = owner.id;
  d.acceptedVersionId = c?.toVersionId ?? E.latestVersion(d)?.id;
  const amounts: NonNullable<LedgerEntry['amounts']> = [{ memberId: owner.id, amount: ev.reward, objectiveId: d.objectiveId, source: 'minted' }];
  if (reviewer && ev.reviewReward) amounts.push({ memberId: reviewer.id, amount: ev.reviewReward, objectiveId: d.objectiveId, source: 'minted' });
  appendEntry(team, {
    kind: 'accepted_paid', at: now, actorId: approver?.id ?? '',
    refs: { deliverableId: d.id, objectiveId: d.objectiveId, memberId: owner.id, ...(c ? { changeId: c.id } : {}) },
    amounts, data: { n: E.versionById(d, d.acceptedVersionId)?.n ?? 0 },
  });
  return true;
}

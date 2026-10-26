// The team ledger: appending entries with proof, and every figure derived
// from it (balances, budget use, issuance, statements). See
// docs/UX_TECH_DESIGN.md §6. Proofs here are deterministic stand-ins for the
// demo: nothing is on-chain.

import type { Deliverable, EntryKind, LedgerEntry, Objective, Team, Tier } from './types';
import { ruleValue } from './rules';

/** Signed entries are anchored on-chain in batches of this size. */
export const ANCHOR_BATCH = 8;
const BLOCK_BASE = 18_400_000;

/** FNV-1a over a string, repeated with the round appended to fill `bytes`.
 *  (The round goes at the end: mixed into both the seed and the first
 *  character, it cancels out and every round comes out the same.) */
export function fakeHash(input: string, bytes = 32): string {
  let out = '';
  for (let round = 0; out.length < bytes * 2; round++) {
    let h = 0x811c9dc5;
    const s = `${input}#${round}`;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    out += h.toString(16).padStart(8, '0');
  }
  return '0x' + out.slice(0, bytes * 2);
}

export type NewEntry = Omit<LedgerEntry, 'id' | 'seq' | 'tier' | 'proof'> & { tier?: Tier };

/** Kinds recorded as on-chain transactions; everything else is signed and anchored. */
const SETTLED: EntryKind[] = [
  'team_created', 'member_joined', 'accepted_paid', 'released', 'change_opened', 'vote_cast',
  'change_passed', 'change_failed', 'rule_changed', 'money_moved', 'budget_set', 'scheduled_paid', 'anchor',
];

export function tierOf(kind: EntryKind): Tier {
  return SETTLED.includes(kind) ? 'settled' : 'signed';
}

/** Append an entry (and, every ANCHOR_BATCH signed entries, an anchor entry).
 *  In the demo, proofs are stand-ins; in a live team a settled entry has no
 *  proof until its transaction confirms (the chain bridge fills it in). */
export function appendEntry(team: Team, e: NewEntry): LedgerEntry {
  const seq = team.ledger.length + 1;
  const tier = e.tier ?? tierOf(e.kind);
  const key = `${team.id}|${seq}|${e.kind}|${e.at}|${e.actorId}`;
  const proof: LedgerEntry['proof'] = {};
  if (tier === 'settled') {
    if (!team.live) {
      proof.tx = fakeHash(key);
      proof.block = BLOCK_BASE + seq * 3;
    }
  } else {
    const signedBefore = team.ledger.filter(x => x.tier === 'signed').length;
    if (!team.live) proof.sig = fakeHash(key, 8);
    proof.batch = Math.floor(signedBefore / ANCHOR_BATCH) + 1;
  }
  const entry: LedgerEntry = { ...e, id: `e${seq}`, seq, tier, proof };
  team.ledger.push(entry);

  if (tier === 'signed') {
    const signedCount = team.ledger.filter(x => x.tier === 'signed').length;
    if (signedCount % ANCHOR_BATCH === 0) {
      appendEntry(team, {
        kind: 'anchor', at: e.at, actorId: e.actorId, refs: {},
        data: { batch: signedCount / ANCHOR_BATCH, entries: ANCHOR_BATCH },
      });
    }
  }
  return entry;
}

/** Batches of signed entries whose anchor is confirmed on-chain. */
export function anchoredBatches(team: Team): Set<number> {
  const out = new Set<number>();
  for (const e of team.ledger) if (e.kind === 'anchor' && e.proof.tx) out.add(Number(e.data?.batch ?? 0));
  return out;
}

/** Whether an entry's proof is in: a settled entry's transaction, or the
 *  anchor of a signed entry's batch. (Always true in the demo.) */
export function isConfirmed(e: LedgerEntry, anchored: Set<number>): boolean {
  return e.tier === 'settled' ? !!e.proof.tx : anchored.has(e.proof.batch ?? 0);
}

// ── Derived figures ──────────────────────────────────────────────

export function memberBalance(team: Team, memberId: string): number {
  let total = 0;
  for (const e of team.ledger) for (const a of e.amounts ?? []) if (a.memberId === memberId) total += a.amount;
  return total;
}

/** TMIM paid out of an objective's budget so far. */
export function objectivePaid(team: Team, objectiveId: string): number {
  let total = 0;
  for (const e of team.ledger) {
    for (const a of e.amounts ?? []) if (a.objectiveId === objectiveId && a.source === 'minted') total += a.amount;
  }
  return total;
}

const IN_FLIGHT = new Set(['assigned', 'in_progress', 'in_review', 'changes_requested']);

/** What a deliverable will cost on acceptance: its reward plus the review reward
 *  (someone always reviews: the named reviewer, or else the approver). */
export function acceptanceCost(team: Team, d: Deliverable): number {
  return d.reward + ruleValue(team, 'review_reward');
}

/** Rewards promised to deliverables that are underway but not yet accepted. */
export function objectiveCommitted(team: Team, objectiveId: string): number {
  return team.deliverables
    .filter(d => d.objectiveId === objectiveId && IN_FLIGHT.has(d.stage))
    .reduce((sum, d) => sum + acceptanceCost(team, d), 0);
}

export function objectiveFigures(team: Team, o: Objective) {
  const paid = objectivePaid(team, o.id);
  const committed = objectiveCommitted(team, o.id);
  return { budget: o.budget, paid, committed, left: o.budget - paid - committed };
}

const monthKey = (iso: string) => iso.slice(0, 7);

/** TMIM minted in the calendar month containing `now`. */
export function issuedInMonth(team: Team, now: string): number {
  const m = monthKey(now);
  let total = 0;
  for (const e of team.ledger) {
    if (monthKey(e.at) !== m) continue;
    for (const a of e.amounts ?? []) if (a.source === 'minted') total += a.amount;
  }
  return total;
}

export interface Statement {
  month: string;           // YYYY-MM
  issued: number;
  paidByObjective: { objectiveId: string; amount: number }[];
  accountIn: number;
  accountOut: number;
  accountEnd: number;
  entries: number;
}

/** One statement per calendar month with ledger activity, newest first. */
export function statements(team: Team): Statement[] {
  const byMonth = new Map<string, Statement>();
  let account = 0;
  const ordered = [...team.ledger].sort((a, b) => a.seq - b.seq);
  for (const e of ordered) {
    const m = monthKey(e.at);
    let st = byMonth.get(m);
    if (!st) {
      st = { month: m, issued: 0, paidByObjective: [], accountIn: 0, accountOut: 0, accountEnd: account, entries: 0 };
      byMonth.set(m, st);
    }
    st.entries++;
    for (const a of e.amounts ?? []) {
      if (a.source === 'minted') {
        st.issued += a.amount;
        if (a.objectiveId) {
          const row = st.paidByObjective.find(r => r.objectiveId === a.objectiveId);
          if (row) row.amount += a.amount;
          else st.paidByObjective.push({ objectiveId: a.objectiveId, amount: a.amount });
        }
      } else if (a.source === 'team_account') {
        st.accountOut += a.amount;
        account -= a.amount;
      }
    }
    const into = Number(e.data?.accountIn ?? 0);
    if (into) { st.accountIn += into; account += into; }
    st.accountEnd = account;
  }
  return [...byMonth.values()].sort((a, b) => b.month.localeCompare(a.month));
}

/** Entries grouped by calendar day (local time), newest first. */
export function groupByDay(entries: LedgerEntry[]): { day: string; entries: LedgerEntry[] }[] {
  const groups = new Map<string, LedgerEntry[]>();
  for (const e of [...entries].sort((a, b) => b.seq - a.seq)) {
    const d = new Date(e.at);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const list = groups.get(day) ?? [];
    list.push(e);
    groups.set(day, list);
  }
  return [...groups.entries()].map(([day, list]) => ({ day, entries: list }));
}

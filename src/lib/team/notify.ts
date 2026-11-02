// What a member should hear about (UX_REDESIGN.md phase 8). Actions waiting
// on them are "needs you" (engine.needsYou); this is the news: what others
// did that concerns them, and votes about to close that they haven't cast.

import type { Change, CharterChange, LedgerEntry, Team } from './types';
import { approverOf, isOpenForVotes, reviewerOf } from './engine';
import { voters } from './rules';

/** Work news for the people on a deliverable. */
const WORK_NEWS = new Set<LedgerEntry['kind']>([
  'assigned', 'review_requested', 'commented', 'reviewed', 'changes_requested', 'accepted_paid', 'released', 'task_done', 'message',
]);
/** Decision news for a change's proposer and voters. */
const CHANGE_NEWS = new Set<LedgerEntry['kind']>([
  'change_passed', 'change_failed', 'rule_changed', 'roles_changed', 'budget_set', 'money_moved', 'message',
]);

function onDeliverable(team: Team, me: string, deliverableId: string): boolean {
  const d = team.deliverables.find(x => x.id === deliverableId);
  return !!d && (d.ownerId === me || reviewerOf(team, d) === me || approverOf(team, d) === me);
}

function inChange(c: Change | undefined, me: string): boolean {
  if (!c) return false;
  return c.proposerId === me || (c.kind !== 'work' && c.votes.some(v => v.memberId === me));
}

/** Whether an entry concerns `me` (and isn't their own doing). */
export function concerns(team: Team, me: string, e: LedgerEntry): boolean {
  if (e.actorId === me || e.kind === 'anchor') return false;
  if (e.amounts?.some(a => a.memberId === me)) return true;
  if (e.refs.memberId === me && e.kind !== 'member_joined') return true;
  if (e.refs.deliverableId && WORK_NEWS.has(e.kind) && onDeliverable(team, me, e.refs.deliverableId)) return true;
  if (e.refs.changeId && CHANGE_NEWS.has(e.kind) && inChange(team.changes.find(c => c.id === e.refs.changeId), me)) return true;
  return false;
}

/** Entries that concern `me` after `since`, newest first. */
export function newsFor(team: Team, me: string, since: string): LedgerEntry[] {
  return team.ledger.filter(e => e.at > since && concerns(team, me, e)).sort((a, b) => b.seq - a.seq);
}

/** Votes `me` hasn't cast that close within `hours`: the time-sensitive kind. */
export function closingSoon(team: Team, me: string, now: string, hours = 24): CharterChange[] {
  if (!voters(team).some(m => m.id === me)) return [];
  const limit = new Date(new Date(now).getTime() + hours * 3_600_000).toISOString();
  return team.changes.filter((c): c is CharterChange =>
    isOpenForVotes(c) && !!c.closesAt && c.closesAt > now && c.closesAt <= limit && !c.votes.some(v => v.memberId === me));
}

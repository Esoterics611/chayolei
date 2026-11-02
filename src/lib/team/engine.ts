// Every workflow of the new design as plain functions on a Team: propose →
// decide → record for work, rules and money (docs/UX_TECH_DESIGN.md §5).
// Actions check the charter, mutate the team and append ledger entries;
// refusals throw DomainError with an i18n key. `now` is an ISO timestamp.

import type {
  Assist, Change, CharterChange, Deliverable, MoneyAction, MoneyChange, Member, Objective, RoleChange, RuleChange, RuleKey,
  Stage, Task, Team, TemplateId, Text, Version, VoteChoice, WorkChange,
} from './types';
import { DomainError } from './types';
import { appendEntry, acceptanceCost, issuedInMonth, objectiveFigures, objectivePaid, fakeHash } from './ledger';
import {
  activeMember, can, leavesNoVoter, member, requirePermission, requireValidRuleValue, ruleCurrent, ruleValue, voters,
} from './rules';
import { charterFromTemplate, TEMPLATES } from './templates';

export const STALL_DAYS = 7;
const DAY = 86_400_000;

let counter = 0;
export function newId(prefix: string): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

const addHours = (iso: string, h: number) => new Date(new Date(iso).getTime() + h * 3_600_000).toISOString();

// ── Lookups ──────────────────────────────────────────────────────

export function objective(team: Team, id: string): Objective {
  const o = team.objectives.find(x => x.id === id);
  if (!o) throw new DomainError('err.not_found');
  return o;
}

export function deliverable(team: Team, id: string): Deliverable {
  const d = team.deliverables.find(x => x.id === id);
  if (!d) throw new DomainError('err.not_found');
  return d;
}

export function change(team: Team, id: string): Change {
  const c = team.changes.find(x => x.id === id);
  if (!c) throw new DomainError('err.not_found');
  return c;
}

export const tasksOf = (team: Team, deliverableId: string): Task[] =>
  team.tasks.filter(t => t.deliverableId === deliverableId);

/** Saved versions, oldest first (drafts excluded). */
export const versionsOf = (d: Deliverable): Version[] =>
  d.versions.filter(v => v.kind === 'version').sort((a, b) => a.n - b.n);

export const latestVersion = (d: Deliverable): Version | undefined => versionsOf(d).at(-1);
export const draftOf = (d: Deliverable): Version | undefined => d.versions.find(v => v.kind === 'draft');
export const versionById = (d: Deliverable, id: string | undefined) => d.versions.find(v => v.id === id);

export function workChangesOf(team: Team, deliverableId: string): WorkChange[] {
  return team.changes
    .filter((c): c is WorkChange => c.kind === 'work' && c.deliverableId === deliverableId)
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** The review request currently in play for a deliverable, if any: the latest
 *  round, while it is open, reviewed or waiting on requested changes. */
export function activeWorkChange(team: Team, deliverableId: string): WorkChange | undefined {
  const latest = workChangesOf(team, deliverableId).find(c => c.status !== 'superseded');
  return latest && ['open', 'reviewed', 'changes_requested'].includes(latest.status) ? latest : undefined;
}

export function isStalled(d: Deliverable, now: string): boolean {
  if (!['assigned', 'in_progress', 'changes_requested'].includes(d.stage)) return false;
  return new Date(now).getTime() - new Date(d.lastActivityAt).getTime() > STALL_DAYS * DAY;
}

/** Who decides acceptance: the named approver, else the objective's lead,
 *  while they are on the team (no one, once they have left). */
export function approverOf(team: Team, d: Deliverable): string | undefined {
  const id = d.approverId ?? team.objectives.find(o => o.id === d.objectiveId)?.ownerId;
  return activeMember(team, id) ? id : undefined;
}

/** Who reviews: the named reviewer, else the approver. */
export function reviewerOf(team: Team, d: Deliverable): string | undefined {
  return d.reviewerId && activeMember(team, d.reviewerId) ? d.reviewerId : approverOf(team, d);
}

/** An objective whose lead has left: someone who may change the plan can take the lead. */
export const leadVacant = (team: Team, o: Objective): boolean => !activeMember(team, o.ownerId);

export const isOpenForVotes = (c: Change): c is CharterChange =>
  c.status === 'open' && (c.kind === 'rule' || c.kind === 'role' || (c.kind === 'money' && c.decidedBy === 'vote'));

export function tally(team: Team, c: CharterChange) {
  const eligible = voters(team).length;
  const forVotes = c.votes.filter(v => v.choice === 'for').length;
  const against = c.votes.filter(v => v.choice === 'against').length;
  const abstain = c.votes.filter(v => v.choice === 'abstain').length;
  const cast = forVotes + against + abstain;
  const turnoutPct = eligible ? (cast / eligible) * 100 : 0;
  const forPct = forVotes + against ? (forVotes / (forVotes + against)) * 100 : 0;
  const quorum = ruleValue(team, 'quorum_pct');
  const majority = ruleValue(team, 'majority_pct');
  return {
    eligible, forVotes, against, abstain, cast, turnoutPct, forPct, quorum, majority,
    quorumReached: turnoutPct >= quorum,
    passing: turnoutPct >= quorum && forPct > majority,
  };
}

// ── What needs a member's attention ──────────────────────────────

export type NeedItem =
  | { kind: 'review'; changeId: string; deliverableId: string; since: string }
  | { kind: 'accept'; changeId: string; deliverableId: string; since: string }
  | { kind: 'revise'; deliverableId: string; since: string }
  | { kind: 'vote'; changeId: string; closesAt: string }
  | { kind: 'approve_money'; changeId: string; since: string }
  | { kind: 'stalled'; deliverableId: string; since: string }
  | { kind: 'pay_schedule'; scheduleId: string; since: string }
  | { kind: 'lead'; objectiveId: string; since: string };

export function needsYou(team: Team, me: string, now: string): NeedItem[] {
  const out: NeedItem[] = [];
  for (const c of team.changes) {
    if (c.kind === 'work') {
      const d = team.deliverables.find(x => x.id === c.deliverableId);
      if (!d) continue;
      if (c.status === 'open' && reviewerOf(team, d) === me) out.push({ kind: 'review', changeId: c.id, deliverableId: d.id, since: c.at });
      if (c.status === 'reviewed' && approverOf(team, d) === me) out.push({ kind: 'accept', changeId: c.id, deliverableId: d.id, since: c.at });
    } else if (isOpenForVotes(c) && voters(team).some(m => m.id === me) && !c.votes.some(v => v.memberId === me)) {
      out.push({ kind: 'vote', changeId: c.id, closesAt: c.closesAt! });
    } else if (c.kind === 'money' && c.decidedBy === 'role' && c.status === 'open' && c.proposerId !== me && can(team, me, 'spend')) {
      out.push({ kind: 'approve_money', changeId: c.id, since: c.at });
    }
  }
  for (const d of team.deliverables) {
    if (d.ownerId !== me) continue;
    if (d.stage === 'changes_requested') out.push({ kind: 'revise', deliverableId: d.id, since: d.lastActivityAt });
    else if (isStalled(d, now)) out.push({ kind: 'stalled', deliverableId: d.id, since: d.lastActivityAt });
  }
  if (can(team, me, 'spend')) {
    for (const s of team.treasury.schedules) {
      if (s.nextAt <= now && s.nextAt <= s.until) out.push({ kind: 'pay_schedule', scheduleId: s.id, since: s.nextAt });
    }
  }
  if (can(team, me, 'manage_plan')) {
    for (const o of team.objectives) {
      // Only objectives with work still to decide need a lead.
      const unfinished = team.deliverables.some(d => d.objectiveId === o.id && d.stage !== 'released' && d.stage !== 'accepted');
      if (unfinished && leadVacant(team, o)) out.push({ kind: 'lead', objectiveId: o.id, since: member(team, o.ownerId)?.leftAt ?? o.createdAt });
    }
  }
  return out;
}

// ── Plan ─────────────────────────────────────────────────────────

export function addObjective(team: Team, me: string, input: { title: Text; description: Text; due?: string }, now: string): Objective {
  requirePermission(team, me, 'manage_plan');
  if (!String(typeof input.title === 'string' ? input.title : input.title.en).trim()) throw new DomainError('err.empty');
  const o: Objective = { id: newId('o'), title: input.title, description: input.description, ownerId: me, budget: 0, due: input.due, createdAt: now };
  team.objectives.push(o);
  appendEntry(team, { kind: 'objective_created', at: now, actorId: me, refs: { objectiveId: o.id } });
  return o;
}

export function addDeliverable(
  team: Team, me: string, objectiveId: string,
  input: { title: Text; scope: Text; reviewerId?: string; approverId?: string; reward?: number; due?: string; assist?: Assist },
  now: string,
): Deliverable {
  requirePermission(team, me, 'manage_plan');
  const o = objective(team, objectiveId);
  if (!String(typeof input.title === 'string' ? input.title : input.title.en).trim()) throw new DomainError('err.empty');
  const d: Deliverable = {
    id: newId('d'), objectiveId: o.id, title: input.title, scope: input.scope,
    reviewerId: input.reviewerId, approverId: input.approverId ?? o.ownerId,
    reward: input.reward ?? ruleValue(team, 'deliverable_reward'), due: input.due,
    stage: 'open', versions: [], lastActivityAt: now, assist: input.assist,
  };
  team.deliverables.push(d);
  appendEntry(team, {
    kind: 'deliverable_created', at: now, actorId: me, refs: { objectiveId: o.id, deliverableId: d.id },
    data: input.assist ? { reward: d.reward, assist: input.assist } : { reward: d.reward },
  });
  return d;
}

export function addTask(team: Team, me: string, deliverableId: string, input: { title: Text; ownerId?: string; due?: string; assist?: Assist }, now: string): Task {
  const d = deliverable(team, deliverableId);
  if (d.ownerId !== me && !can(team, me, 'manage_plan')) throw new DomainError('err.not_owner');
  if (!String(typeof input.title === 'string' ? input.title : input.title.en).trim()) throw new DomainError('err.empty');
  const t: Task = { id: newId('t'), deliverableId: d.id, title: input.title, ownerId: input.ownerId, due: input.due, done: false, assist: input.assist };
  team.tasks.push(t);
  touch(d, now);
  appendEntry(team, {
    kind: 'task_created', at: now, actorId: me, refs: { deliverableId: d.id, taskId: t.id, objectiveId: d.objectiveId },
    ...(input.assist ? { data: { assist: input.assist } } : {}),
  });
  return t;
}

/** A breakdown of an objective, added at once: what a lead accepts from the
 *  AI planner after editing it, marked with the helper that suggested it. */
export function addPlan(
  team: Team, me: string, objectiveId: string,
  items: { title: Text; scope: Text; reward?: number; tasks?: Text[] }[],
  assist: Assist | undefined, now: string,
): Deliverable[] {
  requirePermission(team, me, 'manage_plan');
  objective(team, objectiveId);
  if (!items.length) throw new DomainError('err.empty');
  return items.map(item => {
    const d = addDeliverable(team, me, objectiveId, { title: item.title, scope: item.scope, reward: item.reward, assist }, now);
    for (const title of item.tasks ?? []) addTask(team, me, d.id, { title, assist }, now);
    return d;
  });
}

export function setTaskDone(team: Team, me: string, taskId: string, done: boolean, now: string): void {
  const t = team.tasks.find(x => x.id === taskId);
  if (!t) throw new DomainError('err.not_found');
  const d = deliverable(team, t.deliverableId);
  if (t.ownerId !== me && d.ownerId !== me && !can(team, me, 'manage_plan')) throw new DomainError('err.not_owner');
  if (t.done === done) return;
  t.done = done;
  touch(d, now);
  if (done) appendEntry(team, { kind: 'task_done', at: now, actorId: me, refs: { deliverableId: d.id, taskId: t.id, objectiveId: d.objectiveId } });
}

export function setPeople(team: Team, me: string, deliverableId: string, people: { reviewerId?: string; approverId?: string }, now: string): void {
  requirePermission(team, me, 'manage_plan');
  const d = deliverable(team, deliverableId);
  if (people.reviewerId !== undefined) d.reviewerId = people.reviewerId || undefined;
  if (people.approverId !== undefined) d.approverId = people.approverId || undefined;
  touch(d, now);
}

/** Take the lead of an objective whose lead has left: you then approve its
 *  deliverables that name no other approver. */
export function takeLead(team: Team, me: string, objectiveId: string, now: string): void {
  requirePermission(team, me, 'manage_plan');
  const o = objective(team, objectiveId);
  if (!leadVacant(team, o)) throw new DomainError('err.lead_taken');
  o.ownerId = me;
  appendEntry(team, { kind: 'objective_lead', at: now, actorId: me, refs: { objectiveId: o.id, memberId: me } });
}

function touch(d: Deliverable, now: string) {
  if (now > d.lastActivityAt) d.lastActivityAt = now;
}

// ── Work: take, version, review, accept, release ─────────────────

export function take(team: Team, me: string, deliverableId: string, now: string): void {
  requirePermission(team, me, 'take_work');
  const d = deliverable(team, deliverableId);
  if (d.stage !== 'open') throw new DomainError('err.stage');
  d.ownerId = me;
  d.stage = 'assigned';
  touch(d, now);
  appendEntry(team, { kind: 'assigned', at: now, actorId: me, refs: { deliverableId: d.id, objectiveId: d.objectiveId, memberId: me } });
}

const WORKING: Stage[] = ['assigned', 'in_progress', 'in_review', 'changes_requested'];

/** Private until saved as a version: drafts don't go on the ledger. */
export function saveDraft(team: Team, me: string, deliverableId: string, paragraphs: string[], now: string): Version {
  const d = deliverable(team, deliverableId);
  if (d.ownerId !== me) throw new DomainError('err.not_owner');
  if (!WORKING.includes(d.stage)) throw new DomainError('err.stage');
  const n = (latestVersion(d)?.n ?? 0) + 1;
  let draft = draftOf(d);
  if (draft) { draft.paragraphs = clean(paragraphs); draft.at = now; }
  else {
    draft = { id: newId('v'), n, kind: 'draft', authorId: me, note: '', paragraphs: clean(paragraphs), at: now };
    d.versions.push(draft);
  }
  if (d.stage === 'assigned') d.stage = 'in_progress';
  touch(d, now);
  return draft;
}

export function saveVersion(team: Team, me: string, deliverableId: string, paragraphs: string[], note: Text, now: string): Version {
  const d = deliverable(team, deliverableId);
  if (d.ownerId !== me) throw new DomainError('err.not_owner');
  if (!WORKING.includes(d.stage)) throw new DomainError('err.stage');
  const text = clean(paragraphs);
  if (!text.length) throw new DomainError('err.empty');
  const prev = latestVersion(d);
  if (prev && prev.paragraphs.join('\n') === text.join('\n')) throw new DomainError('err.no_changes');
  d.versions = d.versions.filter(v => v.kind !== 'draft');
  const v: Version = { id: newId('v'), n: (prev?.n ?? 0) + 1, kind: 'version', authorId: me, note, paragraphs: text, at: now };
  d.versions.push(v);
  if (d.stage === 'assigned' || d.stage === 'changes_requested') d.stage = 'in_progress';
  touch(d, now);
  appendEntry(team, { kind: 'version_saved', at: now, actorId: me, refs: { deliverableId: d.id, objectiveId: d.objectiveId }, data: { n: v.n } });
  return v;
}

const clean = (ps: string[]) => ps.map(p => p.trim()).filter(Boolean);

export function requestReview(team: Team, me: string, deliverableId: string, now: string): WorkChange {
  const d = deliverable(team, deliverableId);
  if (d.ownerId !== me) throw new DomainError('err.not_owner');
  if (!['in_progress', 'in_review', 'changes_requested'].includes(d.stage)) throw new DomainError('err.stage');
  const to = latestVersion(d);
  if (!to) throw new DomainError('err.no_version');
  const previous = workChangesOf(team, d.id);
  if (previous.some(c => c.toVersionId === to.id && c.status !== 'superseded')) throw new DomainError('err.no_new_version');
  // Rounds still in play are replaced by this one; decided rounds keep their outcome.
  for (const c of previous) if (c.status === 'open' || c.status === 'reviewed') c.status = 'superseded';
  // Compare with what was last put up for review, else what was accepted, else the previous version.
  const from = previous[0]?.toVersionId ?? d.acceptedVersionId ?? versionsOf(d).at(-2)?.id;
  const c: WorkChange = {
    kind: 'work', id: newId('c'), deliverableId: d.id, fromVersionId: from, toVersionId: to.id,
    proposerId: me, status: 'open', comments: [], at: now,
  };
  team.changes.push(c);
  d.stage = 'in_review';
  touch(d, now);
  appendEntry(team, {
    kind: 'review_requested', at: now, actorId: me,
    refs: { deliverableId: d.id, objectiveId: d.objectiveId, changeId: c.id },
    data: { from: versionById(d, from)?.n ?? 0, to: to.n },
  });
  return c;
}

export function comment(team: Team, me: string, changeId: string, body: string, paragraph: number | undefined, now: string): void {
  const c = change(team, changeId);
  if (!activeMember(team, me)) throw new DomainError('err.not_member');
  if (!body.trim()) throw new DomainError('err.empty');
  if (c.kind !== 'work') throw new DomainError('err.stage');
  c.comments.push({ id: newId('m'), authorId: me, body: body.trim(), at: now, paragraph });
  const d = deliverable(team, c.deliverableId);
  touch(d, now);
  appendEntry(team, { kind: 'commented', at: now, actorId: me, refs: { deliverableId: d.id, changeId: c.id, objectiveId: d.objectiveId }, data: paragraph !== undefined ? { paragraph: paragraph + 1 } : {} });
}

function workChange(team: Team, changeId: string): { c: WorkChange; d: Deliverable } {
  const c = change(team, changeId);
  if (c.kind !== 'work') throw new DomainError('err.not_found');
  return { c, d: deliverable(team, c.deliverableId) };
}

export function markReviewed(team: Team, me: string, changeId: string, now: string): void {
  const { c, d } = workChange(team, changeId);
  if (c.status !== 'open') throw new DomainError('err.stage');
  if (reviewerOf(team, d) !== me) throw new DomainError('err.not_reviewer');
  if (d.ownerId === me) throw new DomainError('err.self_review');
  c.status = 'reviewed';
  c.reviewedBy = me;
  touch(d, now);
  appendEntry(team, { kind: 'reviewed', at: now, actorId: me, refs: { deliverableId: d.id, changeId: c.id, objectiveId: d.objectiveId } });
}

export function requestChanges(team: Team, me: string, changeId: string, note: string, now: string): void {
  const { c, d } = workChange(team, changeId);
  if (c.status !== 'open' && c.status !== 'reviewed') throw new DomainError('err.stage');
  if (reviewerOf(team, d) !== me && approverOf(team, d) !== me) throw new DomainError('err.not_reviewer');
  if (note.trim()) c.comments.push({ id: newId('m'), authorId: me, body: note.trim(), at: now });
  c.status = 'changes_requested';
  c.decidedAt = now;
  c.decidedBy = me;
  d.stage = 'changes_requested';
  touch(d, now);
  appendEntry(team, { kind: 'changes_requested', at: now, actorId: me, refs: { deliverableId: d.id, changeId: c.id, objectiveId: d.objectiveId } });
}

/** What accepting a work change will pay, and whether the budget and the month's cap allow it. */
export function acceptancePreview(team: Team, changeId: string, now: string) {
  const { c, d } = workChange(team, changeId);
  const reviewReward = c.reviewedBy && c.reviewedBy !== d.ownerId ? ruleValue(team, 'review_reward') : 0;
  const cost = d.reward + reviewReward;
  const o = objective(team, d.objectiveId);
  const f = objectiveFigures(team, o);
  // `committed` already counts this deliverable at its expected cost; release it before comparing.
  const available = f.left + acceptanceCost(team, d);
  const issued = issuedInMonth(team, now);
  const cap = ruleValue(team, 'monthly_issuance_cap');
  return {
    ownerId: d.ownerId, reward: d.reward, reviewerId: reviewReward ? c.reviewedBy : undefined, reviewReward,
    cost, objectiveId: o.id, available, issued, cap,
    withinBudget: cost <= available, withinCap: issued + cost <= cap,
    ruleVersion: ruleCurrent(team, 'deliverable_reward').version,
  };
}

export function acceptAndPay(team: Team, me: string, changeId: string, now: string): void {
  const { c, d } = workChange(team, changeId);
  requirePermission(team, me, 'accept_work');
  if (approverOf(team, d) !== me) throw new DomainError('err.not_approver');
  if (d.ownerId === me) throw new DomainError('err.self_accept');
  if (c.status !== 'reviewed') throw new DomainError('err.review_first');
  if (!d.ownerId) throw new DomainError('err.stage');
  const p = acceptancePreview(team, changeId, now);
  if (!p.withinBudget) throw new DomainError('err.budget_exceeded', { cost: p.cost, left: p.available });
  if (!p.withinCap) throw new DomainError('err.cap_exceeded', { cost: p.cost, issued: p.issued, cap: p.cap });
  c.status = 'accepted';
  c.decidedAt = now;
  c.decidedBy = me;
  d.stage = 'accepted';
  d.acceptedVersionId = c.toVersionId;
  touch(d, now);
  const amounts = [{ memberId: d.ownerId, amount: p.reward, objectiveId: d.objectiveId, source: 'minted' as const }];
  if (p.reviewerId && p.reviewReward) amounts.push({ memberId: p.reviewerId, amount: p.reviewReward, objectiveId: d.objectiveId, source: 'minted' as const });
  appendEntry(team, {
    kind: 'accepted_paid', at: now, actorId: me,
    refs: { deliverableId: d.id, changeId: c.id, objectiveId: d.objectiveId, memberId: d.ownerId },
    amounts, data: { n: versionById(d, c.toVersionId)?.n ?? 0 },
  });
}

export function release(team: Team, me: string, deliverableId: string, now: string): void {
  requirePermission(team, me, 'release');
  const d = deliverable(team, deliverableId);
  if (d.stage !== 'accepted') throw new DomainError('err.stage');
  const v = versionById(d, d.acceptedVersionId);
  d.stage = 'released';
  d.releasedAt = now;
  touch(d, now);
  appendEntry(team, {
    kind: 'released', at: now, actorId: me, refs: { deliverableId: d.id, objectiveId: d.objectiveId },
    data: { n: v?.n ?? 0, fingerprint: fakeHash((v?.paragraphs ?? []).join('\n'), 16) },
  });
}

/** People credited on a released (or accepted) deliverable, from its ledger history. */
export function credits(team: Team, deliverableId: string) {
  const d = deliverable(team, deliverableId);
  const out: { memberId: string; role: 'owner' | 'reviewer' | 'approver' | 'task' }[] = [];
  const add = (memberId: string | undefined, role: (typeof out)[number]['role']) => {
    if (memberId && !out.some(x => x.memberId === memberId && x.role === role)) out.push({ memberId, role });
  };
  const accepted = team.ledger.filter(e => e.kind === 'accepted_paid' && e.refs.deliverableId === d.id).at(-1);
  add(d.ownerId, 'owner');
  for (const a of accepted?.amounts ?? []) if (a.memberId !== d.ownerId) add(a.memberId, 'reviewer');
  add(accepted?.actorId, 'approver');
  for (const t of tasksOf(team, d.id)) if (t.done && t.ownerId && t.ownerId !== d.ownerId) add(t.ownerId, 'task');
  return out;
}

// ── Decide: rules and money ──────────────────────────────────────

/** A new change's id: the one given (the live app chooses it, since the team's contract keys proposals by it), else a fresh one. */
function changeId(team: Team, id: string | undefined): string {
  if (id === undefined) return newId('c');
  if (team.changes.some(c => c.id === id)) throw new DomainError('err.invalid_input');
  return id;
}

export function proposeRule(team: Team, me: string, input: { ruleKey: RuleKey; to: number; title: Text; why: Text; id?: string }, now: string): RuleChange {
  requirePermission(team, me, 'propose');
  const from = ruleValue(team, input.ruleKey);
  requireValidRuleValue(input.ruleKey, input.to);
  if (input.to === from) throw new DomainError('err.rule_unchanged');
  if (team.changes.some(c => c.kind === 'rule' && c.ruleKey === input.ruleKey && c.status === 'open')) throw new DomainError('err.rule_open');
  const c: RuleChange = {
    kind: 'rule', id: changeId(team, input.id), title: input.title, why: input.why, ruleKey: input.ruleKey,
    from, to: input.to, proposerId: me, status: 'open', votes: [], at: now,
    closesAt: addHours(now, ruleValue(team, 'vote_hours')),
  };
  team.changes.push(c);
  appendEntry(team, { kind: 'change_opened', at: now, actorId: me, refs: { changeId: c.id, ruleKey: c.ruleKey }, data: { from, to: c.to } });
  return c;
}

export function requestMoney(team: Team, me: string, input: { action: MoneyAction; title: Text; why: Text; id?: string }, now: string): MoneyChange {
  requirePermission(team, me, 'propose');
  const a = input.action;
  let amount: number;
  if (a.type === 'transfer') {
    if (!activeMember(team, a.to)) throw new DomainError('err.not_member');
    if (!Number.isInteger(a.amount) || a.amount <= 0) throw new DomainError('err.invalid_value');
    amount = a.amount;
  } else {
    const o = objective(team, a.objectiveId);
    if (!Number.isInteger(a.to) || a.to < 0 || a.to === o.budget) throw new DomainError('err.invalid_value');
    const paid = objectivePaid(team, o.id);
    if (a.to < paid) throw new DomainError('err.budget_below_paid', { paid });
    amount = Math.abs(a.to - o.budget);
  }
  const decidedBy = amount <= ruleValue(team, 'spend_limit') ? 'role' : 'vote';
  const c: MoneyChange = {
    kind: 'money', id: changeId(team, input.id), title: input.title, why: input.why, action: a, amount,
    proposerId: me, decidedBy, status: 'open', votes: [], at: now,
    closesAt: decidedBy === 'vote' ? addHours(now, ruleValue(team, 'vote_hours')) : undefined,
  };
  team.changes.push(c);
  appendEntry(team, {
    kind: 'change_opened', at: now, actorId: me,
    refs: { changeId: c.id, objectiveId: a.type === 'budget' ? a.objectiveId : undefined, memberId: a.type === 'transfer' ? a.to : undefined },
    data: { amount },
  });
  return c;
}

/** Role ids as the charter lists them, each once; refuses ids the charter doesn't have. */
function rolesInOrder(team: Team, ids: string[]): string[] {
  const set = new Set(ids);
  if ([...set].some(id => !team.charter.roles.some(r => r.id === id))) throw new DomainError('err.invalid_input');
  return team.charter.roles.filter(r => set.has(r.id)).map(r => r.id);
}

const sameRoles = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x));

/** Propose new roles for a member, decided by vote like a rule. No roles removes them from the team. */
export function proposeRoles(
  team: Team, me: string, input: { memberId: string; to: string[]; title: Text; why: Text; id?: string }, now: string,
): RoleChange {
  requirePermission(team, me, 'propose');
  const m = activeMember(team, input.memberId);
  if (!m) throw new DomainError('err.not_member');
  const to = rolesInOrder(team, input.to);
  const from = rolesInOrder(team, m.roleIds);
  if (sameRoles(to, from)) throw new DomainError('err.roles_unchanged');
  if (team.changes.some(c => c.kind === 'role' && c.memberId === m.id && c.status === 'open')) throw new DomainError('err.roles_open');
  if (leavesNoVoter(team, m.id, to)) throw new DomainError('err.last_voter');
  const c: RoleChange = {
    kind: 'role', id: changeId(team, input.id), title: input.title, why: input.why, memberId: m.id, from, to,
    proposerId: me, status: 'open', votes: [], at: now, closesAt: addHours(now, ruleValue(team, 'vote_hours')),
  };
  team.changes.push(c);
  appendEntry(team, { kind: 'change_opened', at: now, actorId: me, refs: { changeId: c.id, memberId: m.id }, data: { from: from.join(','), to: to.join(',') } });
  return c;
}

/** Leave the team. What you were paid stays yours; your unfinished work goes back to the plan. */
export function leave(team: Team, me: string, now: string): void {
  const m = activeMember(team, me);
  if (!m) throw new DomainError('err.not_member');
  if (leavesNoVoter(team, me, [])) throw new DomainError('err.last_voter');
  const roles = m.roleIds.join(',');
  depart(team, m, now);
  appendEntry(team, { kind: 'member_left', at: now, actorId: me, refs: { memberId: me }, data: { roles } });
}

/** Someone leaves or is removed: no roles, and nothing left waiting on them. Their
 *  unfinished deliverables reopen for someone else to take (saved versions stay,
 *  their private draft goes); reviews and approvals fall back to the objective's lead. */
function depart(team: Team, m: Member, now: string): void {
  m.roleIds = [];
  m.leftAt = now;
  for (const d of team.deliverables) {
    if (d.ownerId === m.id && WORKING.includes(d.stage)) {
      d.ownerId = undefined;
      d.stage = 'open';
      d.versions = d.versions.filter(v => v.kind !== 'draft');
      for (const c of workChangesOf(team, d.id)) if (c.status === 'open' || c.status === 'reviewed') c.status = 'superseded';
      touch(d, now);
    }
    if (d.reviewerId === m.id) d.reviewerId = undefined;
    if (d.approverId === m.id) d.approverId = undefined;
  }
  for (const t of team.tasks) if (t.ownerId === m.id && !t.done) t.ownerId = undefined;
  team.treasury.schedules = team.treasury.schedules.filter(s => s.memberId !== m.id);
}

export function vote(team: Team, me: string, changeId: string, choice: VoteChoice, now: string): void {
  const c = change(team, changeId);
  if (!isOpenForVotes(c)) throw new DomainError('err.vote_closed');
  requirePermission(team, me, 'vote');
  if (member(team, me)?.ai) throw new DomainError('err.permission.vote');
  if (c.closesAt && now > c.closesAt) throw new DomainError('err.vote_closed');
  const existing = c.votes.find(v => v.memberId === me);
  if (existing) { existing.choice = choice; existing.at = now; }
  else c.votes.push({ memberId: me, choice, at: now });
  appendEntry(team, { kind: 'vote_cast', at: now, actorId: me, refs: { changeId: c.id }, data: { choice } });
  if (c.votes.length >= voters(team).length) decide(team, c.id, now);
}

/** Close voting: the proposer may close early; anyone may once the deadline has passed. */
export function closeVoting(team: Team, me: string, changeId: string, now: string): void {
  const c = change(team, changeId);
  if (!isOpenForVotes(c)) throw new DomainError('err.vote_closed');
  if (c.proposerId !== me && !(c.closesAt && now >= c.closesAt)) throw new DomainError('err.not_proposer');
  decide(team, changeId, now);
}

function decide(team: Team, changeId: string, now: string): void {
  const c = change(team, changeId) as CharterChange;
  const t = tally(team, c);
  if (!t.passing) {
    c.status = 'failed';
    c.decidedAt = now;
    appendEntry(team, { kind: 'change_failed', at: now, actorId: c.proposerId, refs: { changeId: c.id }, data: { forPct: Math.round(t.forPct), turnout: Math.round(t.turnoutPct) } });
    return;
  }
  // Passed, but no longer possible: more than the team account holds or to
  // someone who has left, a budget below what has been paid from it since it
  // was proposed, or roles for a member whose roles changed meanwhile, or that
  // would leave no one to vote. The same checks as Team.sol.
  const impossible = c.kind === 'role' ? roleChangeImpossible(team, c)
    : c.kind !== 'money' ? undefined
    : c.action.type === 'transfer' && c.action.amount > team.treasury.teamAccount ? 'insufficient'
    : c.action.type === 'transfer' && !activeMember(team, c.action.to) ? 'not_member'
    : c.action.type === 'budget' && c.action.to < objectivePaid(team, c.action.objectiveId) ? 'below_paid'
    : undefined;
  if (impossible) {
    c.status = 'failed';
    c.decidedAt = now;
    appendEntry(team, { kind: 'change_failed', at: now, actorId: c.proposerId, refs: { changeId: c.id }, data: { reason: impossible } });
    return;
  }
  c.status = 'passed';
  c.decidedAt = now;
  appendEntry(team, { kind: 'change_passed', at: now, actorId: c.proposerId, refs: { changeId: c.id }, data: { forPct: Math.round(t.forPct), turnout: Math.round(t.turnoutPct) } });
  apply(team, c, now);
}

function roleChangeImpossible(team: Team, c: RoleChange): string | undefined {
  const m = activeMember(team, c.memberId);
  if (!m || !sameRoles(rolesInOrder(team, m.roleIds), c.from)) return 'roles_moved';
  if (leavesNoVoter(team, m.id, c.to)) return 'last_voter';
  return undefined;
}

function apply(team: Team, c: CharterChange, now: string): void {
  if (c.kind === 'role') {
    const m = activeMember(team, c.memberId)!;
    if (c.to.length) m.roleIds = [...c.to];
    else depart(team, m, now);
    appendEntry(team, {
      kind: 'roles_changed', at: now, actorId: c.proposerId, refs: { changeId: c.id, memberId: m.id },
      data: { from: c.from.join(','), to: c.to.join(',') },
    });
    return;
  }
  if (c.kind === 'rule') {
    const r = team.charter.rules.find(x => x.key === c.ruleKey)!;
    const version = r.history[r.history.length - 1].version + 1;
    r.history.push({ value: c.to, version, at: now, setBy: { kind: 'proposal', changeId: c.id } });
    appendEntry(team, { kind: 'rule_changed', at: now, actorId: c.proposerId, refs: { changeId: c.id, ruleKey: c.ruleKey }, data: { from: c.from, to: c.to, version } });
    return;
  }
  const a = c.action;
  if (a.type === 'transfer') {
    team.treasury.teamAccount -= a.amount;
    appendEntry(team, {
      kind: 'money_moved', at: now, actorId: c.approvedBy ?? c.proposerId, refs: { changeId: c.id, memberId: a.to },
      amounts: [{ memberId: a.to, amount: a.amount, source: 'team_account' }],
    });
  } else {
    const o = objective(team, a.objectiveId);
    const from = o.budget;
    o.budget = a.to;
    appendEntry(team, { kind: 'budget_set', at: now, actorId: c.approvedBy ?? c.proposerId, refs: { changeId: c.id, objectiveId: o.id }, data: { from, to: a.to } });
  }
}

/** A money change within the spend limit, approved by a member who may spend (not the requester). */
export function approveMoney(team: Team, me: string, changeId: string, now: string): void {
  const c = change(team, changeId);
  if (c.kind !== 'money' || c.decidedBy !== 'role' || c.status !== 'open') throw new DomainError('err.stage');
  requirePermission(team, me, 'spend');
  if (c.proposerId === me) throw new DomainError('err.self_approve');
  if (c.action.type === 'transfer' && !activeMember(team, c.action.to)) throw new DomainError('err.not_member');
  if (c.action.type === 'transfer' && c.action.amount > team.treasury.teamAccount) {
    throw new DomainError('err.insufficient', { account: team.treasury.teamAccount, amount: c.action.amount });
  }
  if (c.action.type === 'budget') {
    const paid = objectivePaid(team, c.action.objectiveId);
    if (c.action.to < paid) throw new DomainError('err.budget_below_paid', { paid });
  }
  c.status = 'accepted';
  c.decidedAt = now;
  c.approvedBy = me;
  apply(team, c, now);
}

export function declineMoney(team: Team, me: string, changeId: string, now: string): void {
  const c = change(team, changeId);
  if (c.kind !== 'money' || c.decidedBy !== 'role' || c.status !== 'open') throw new DomainError('err.stage');
  requirePermission(team, me, 'spend');
  c.status = 'failed';
  c.decidedAt = now;
  c.approvedBy = me;
  appendEntry(team, { kind: 'change_failed', at: now, actorId: me, refs: { changeId: c.id }, data: { reason: 'declined' } });
}

// ── Treasury ─────────────────────────────────────────────────────

/** A member moves TMIM from their own balance into the team account. */
export function contribute(team: Team, me: string, amount: number, now: string): void {
  if (!activeMember(team, me)) throw new DomainError('err.not_member');
  if (!Number.isInteger(amount) || amount <= 0) throw new DomainError('err.invalid_value');
  const balance = team.ledger.reduce((s, e) => s + (e.amounts ?? []).filter(a => a.memberId === me).reduce((x, a) => x + a.amount, 0), 0);
  if (amount > balance) throw new DomainError('err.insufficient', { account: balance, amount });
  team.treasury.teamAccount += amount;
  appendEntry(team, {
    kind: 'money_moved', at: now, actorId: me, refs: { memberId: me },
    amounts: [{ memberId: me, amount: -amount, source: 'contribution' }], data: { accountIn: amount },
  });
}

export function paySchedule(team: Team, me: string, scheduleId: string, now: string): void {
  requirePermission(team, me, 'spend');
  const s = team.treasury.schedules.find(x => x.id === scheduleId);
  if (!s) throw new DomainError('err.not_found');
  if (s.nextAt > now || s.nextAt > s.until) throw new DomainError('err.not_due');
  const o = objective(team, s.objectiveId);
  const f = objectiveFigures(team, o);
  if (s.amount > f.left) throw new DomainError('err.budget_exceeded', { cost: s.amount, left: f.left });
  const issued = issuedInMonth(team, now);
  const cap = ruleValue(team, 'monthly_issuance_cap');
  if (issued + s.amount > cap) throw new DomainError('err.cap_exceeded', { cost: s.amount, issued, cap });
  appendEntry(team, {
    kind: 'scheduled_paid', at: now, actorId: me, refs: { memberId: s.memberId, objectiveId: o.id },
    amounts: [{ memberId: s.memberId, amount: s.amount, objectiveId: o.id, source: 'minted' }],
  });
  s.nextAt = new Date(new Date(s.nextAt).getTime() + 7 * DAY).toISOString();
}

// ── Threads ──────────────────────────────────────────────────────

export function postMessage(team: Team, me: string, ref: { type: 'deliverable' | 'change'; id: string }, body: string, now: string): void {
  if (!activeMember(team, me)) throw new DomainError('err.not_member');
  if (!body.trim()) throw new DomainError('err.empty');
  team.messages.push({ id: newId('m'), ref, authorId: me, body: body.trim(), at: now });
  const refs = ref.type === 'deliverable' ? { deliverableId: ref.id } : { changeId: ref.id };
  if (ref.type === 'deliverable') touch(deliverable(team, ref.id), now);
  appendEntry(team, { kind: 'message', at: now, actorId: me, refs });
}

export const messagesFor = (team: Team, ref: { type: 'deliverable' | 'change'; id: string }) =>
  team.messages.filter(m => m.ref.type === ref.type && m.ref.id === ref.id).sort((a, b) => a.at.localeCompare(b.at));

// ── Team ─────────────────────────────────────────────────────────

export function createTeam(
  input: {
    name: Text; purpose: Text; templateId: TemplateId; founder: { id?: string; name: Text; initials: string; wallet: string };
    id?: string; live?: boolean; chain?: Team['chain'];
  },
  now: string,
): Team {
  if (!String(typeof input.name === 'string' ? input.name : input.name.en).trim()) throw new DomainError('err.empty');
  const tpl = TEMPLATES[input.templateId];
  const founder: Member = {
    id: input.founder.id ?? newId('u'), name: input.founder.name, initials: input.founder.initials,
    roleIds: [...tpl.founderRoleIds], wallet: input.founder.wallet, joinedAt: now,
  };
  const team: Team = {
    id: input.id ?? newId('team'), ...(input.live ? { live: true } : {}), ...(input.chain ? { chain: input.chain } : {}),
    name: input.name, purpose: input.purpose, createdAt: now, templateId: input.templateId,
    members: [founder], charter: charterFromTemplate(input.templateId, now),
    objectives: [], deliverables: [], tasks: [], changes: [], messages: [], ledger: [],
    treasury: { teamAccount: 0, schedules: [] },
  };
  appendEntry(team, { kind: 'team_created', at: now, actorId: founder.id, refs: {}, data: { template: input.templateId } });
  return team;
}

/** Add a member by invite, with the template's joiner role unless roles are
 *  given. Someone who left and comes back is the same member again. */
export function addMember(team: Team, input: { id?: string; name: Text; initials: string; wallet: string; roleIds?: string[]; ai?: boolean }, now: string): Member {
  const roleIds = input.roleIds ?? [...TEMPLATES[team.templateId].joinerRoleIds];
  const former = input.id ? team.members.find(x => x.id === input.id) : undefined;
  if (former && !former.leftAt) throw new DomainError('err.invalid_input');
  const m: Member = former ?? {
    id: input.id ?? newId('u'), name: input.name, initials: input.initials, wallet: input.wallet,
    roleIds, joinedAt: now, ai: input.ai,
  };
  if (former) {
    Object.assign(m, { name: input.name, initials: input.initials, wallet: input.wallet, roleIds, joinedAt: now });
    delete m.leftAt;
  } else {
    team.members.push(m);
  }
  appendEntry(team, { kind: 'member_joined', at: now, actorId: m.id, refs: { memberId: m.id } });
  return m;
}

// Every action a member can take, as plain data. Screens send a Command to
// the store; the store applies it here (the demo) or sends it to the server,
// which applies it here too, in a transaction (docs/TEAM_BACKEND.md). One
// list of actions keeps the two in step and lets the server check every
// action against the charter itself.

import type { Assist, MoneyAction, RuleKey, Team, Text, VoteChoice } from './types';
import { DomainError } from './types';
import * as E from './engine';

export type Command =
  | { type: 'addObjective'; title: string; description: string; due?: string }
  | {
      type: 'addDeliverable'; objectiveId: string; title: string; scope: string;
      reviewerId?: string; approverId?: string; reward?: number; due?: string;
    }
  | { type: 'addTask'; deliverableId: string; title: string; ownerId?: string; due?: string }
  | {
      /** A breakdown of an objective added at once, e.g. the AI planner's after the lead edited it. */
      type: 'addPlan'; objectiveId: string; assist?: Assist;
      deliverables: { title: string; scope: string; reward?: number; tasks?: string[] }[];
    }
  | { type: 'setTaskDone'; taskId: string; done: boolean }
  | { type: 'take'; deliverableId: string }
  | { type: 'saveDraft'; deliverableId: string; paragraphs: string[] }
  | { type: 'saveVersion'; deliverableId: string; paragraphs: string[]; note: string }
  | { type: 'requestReview'; deliverableId: string }
  | { type: 'comment'; changeId: string; body: string; paragraph?: number }
  | { type: 'markReviewed'; changeId: string }
  | { type: 'requestChanges'; changeId: string; note: string }
  | { type: 'acceptAndPay'; changeId: string }
  | { type: 'release'; deliverableId: string }
  | { type: 'proposeRule'; ruleKey: RuleKey; to: number; title: string; why: string; id?: string }
  | { type: 'requestMoney'; action: MoneyAction; title: string; why: string; id?: string }
  | { type: 'proposeRoles'; memberId: string; to: string[]; title: string; why: string; id?: string }
  | { type: 'leave' }
  | { type: 'takeLead'; objectiveId: string }
  | { type: 'vote'; changeId: string; choice: VoteChoice }
  | { type: 'closeVoting'; changeId: string }
  | { type: 'approveMoney'; changeId: string }
  | { type: 'declineMoney'; changeId: string }
  | { type: 'contribute'; amount: number; txHash?: string }
  | { type: 'paySchedule'; scheduleId: string }
  | { type: 'postMessage'; ref: { type: 'deliverable' | 'change'; id: string }; body: string };

export type CommandType = Command['type'];

/** Commands an on-chain team records as transactions on its contract (the settled tier). */
export const SETTLED_COMMANDS = new Set<CommandType>([
  'proposeRule', 'requestMoney', 'proposeRoles', 'vote', 'closeVoting', 'approveMoney', 'declineMoney',
  'acceptAndPay', 'release', 'paySchedule', 'leave',
]);

/** Commands that open a change: the live app picks its id first, since the team's contract keys proposals by it. */
export const OPENS_CHANGE = new Set<CommandType>(['proposeRule', 'requestMoney', 'proposeRoles']);

/** What an action created, so the screen can open it. */
export interface CommandResult {
  id?: string;
}

const text = (s: unknown): Text => (typeof s === 'string' ? s : '');

/** Apply a command to a team as member `me`. Throws DomainError when the charter refuses it. */
export function applyCommand(team: Team, me: string, cmd: Command, now: string): CommandResult {
  checkInput(team, cmd);
  switch (cmd.type) {
    case 'addObjective':
      return { id: E.addObjective(team, me, { title: text(cmd.title), description: text(cmd.description), due: cmd.due }, now).id };
    case 'addDeliverable':
      return {
        id: E.addDeliverable(team, me, cmd.objectiveId, {
          title: text(cmd.title), scope: text(cmd.scope), reviewerId: cmd.reviewerId, approverId: cmd.approverId,
          reward: cmd.reward, due: cmd.due,
        }, now).id,
      };
    case 'addPlan': {
      const items = cmd.deliverables.map(x => ({ title: text(x.title), scope: text(x.scope), reward: x.reward, tasks: strings(x.tasks) }));
      return { id: E.addPlan(team, me, cmd.objectiveId, items, cmd.assist, now)[0]?.id };
    }
    case 'addTask':
      return { id: E.addTask(team, me, cmd.deliverableId, { title: text(cmd.title), ownerId: cmd.ownerId, due: cmd.due }, now).id };
    case 'setTaskDone':
      E.setTaskDone(team, me, cmd.taskId, !!cmd.done, now);
      return {};
    case 'take':
      E.take(team, me, cmd.deliverableId, now);
      return {};
    case 'saveDraft':
      return { id: E.saveDraft(team, me, cmd.deliverableId, strings(cmd.paragraphs), now).id };
    case 'saveVersion':
      return { id: E.saveVersion(team, me, cmd.deliverableId, strings(cmd.paragraphs), text(cmd.note), now).id };
    case 'requestReview':
      return { id: E.requestReview(team, me, cmd.deliverableId, now).id };
    case 'comment':
      E.comment(team, me, cmd.changeId, String(cmd.body ?? ''), cmd.paragraph, now);
      return {};
    case 'markReviewed':
      E.markReviewed(team, me, cmd.changeId, now);
      return {};
    case 'requestChanges':
      E.requestChanges(team, me, cmd.changeId, String(cmd.note ?? ''), now);
      return {};
    case 'acceptAndPay':
      E.acceptAndPay(team, me, cmd.changeId, now);
      return {};
    case 'release':
      E.release(team, me, cmd.deliverableId, now);
      return {};
    case 'proposeRule':
      return { id: E.proposeRule(team, me, { ruleKey: cmd.ruleKey, to: Number(cmd.to), title: text(cmd.title), why: text(cmd.why), id: cmd.id }, now).id };
    case 'requestMoney':
      return { id: E.requestMoney(team, me, { action: cmd.action, title: text(cmd.title), why: text(cmd.why), id: cmd.id }, now).id };
    case 'proposeRoles':
      return { id: E.proposeRoles(team, me, { memberId: cmd.memberId, to: strings(cmd.to), title: text(cmd.title), why: text(cmd.why), id: cmd.id }, now).id };
    case 'leave':
      E.leave(team, me, now);
      return {};
    case 'takeLead':
      E.takeLead(team, me, cmd.objectiveId, now);
      return {};
    case 'vote':
      E.vote(team, me, cmd.changeId, cmd.choice, now);
      return {};
    case 'closeVoting':
      E.closeVoting(team, me, cmd.changeId, now);
      return {};
    case 'approveMoney':
      E.approveMoney(team, me, cmd.changeId, now);
      return {};
    case 'declineMoney':
      E.declineMoney(team, me, cmd.changeId, now);
      return {};
    case 'contribute':
      E.contribute(team, me, Number(cmd.amount), now);
      return {};
    case 'paySchedule':
      E.paySchedule(team, me, cmd.scheduleId, now);
      return {};
    case 'postMessage':
      E.postMessage(team, me, cmd.ref, String(cmd.body ?? ''), now);
      return {};
  }
}

const strings = (xs: unknown): string[] => (Array.isArray(xs) ? xs.map(x => String(x)) : []);

// Limits that keep one team's records a sensible size.
export const LIMITS = { title: 200, body: 20_000, paragraphs: 2_000, document: 400_000 };
/** How much one addPlan may add. */
export const PLAN_LIMITS = { deliverables: 8, tasks: 6 };

const CHOICES = new Set(['for', 'against', 'abstain']);
const RULE_KEYS = new Set<RuleKey>([
  'deliverable_reward', 'review_reward', 'monthly_issuance_cap', 'spend_limit', 'quorum_pct', 'majority_pct', 'vote_hours',
]);

/** Checks the shape of a command whose values came from outside (a request
 *  body): the engine checks the charter, this checks the data. */
function checkInput(team: Team, cmd: Command): void {
  const bad = () => { throw new DomainError('err.invalid_input'); };
  const str = (v: unknown, max: number, optional = false) => {
    if (v === undefined && optional) return;
    if (typeof v !== 'string' || v.length > max) bad();
  };
  const id = (v: unknown, optional = false) => str(v, 120, optional);
  // An id chosen for a new change: letters, digits, '-' and '_'.
  const newId = (v: unknown) => { if (v !== undefined && (typeof v !== 'string' || !/^[\w-]{1,64}$/.test(v))) bad(); };
  const memberId = (v: unknown) => {
    if (v === undefined || v === '') return;
    if (typeof v !== 'string' || !team.members.some(m => m.id === v && !m.leftAt)) bad();
  };
  const date = (v: unknown) => {
    if (v === undefined) return;
    if (typeof v !== 'string' || v.length > 40 || Number.isNaN(Date.parse(v))) bad();
  };
  const doc = (v: unknown) => {
    if (!Array.isArray(v) || v.length > LIMITS.paragraphs || v.some(p => typeof p !== 'string')) bad();
    if ((v as string[]).reduce((n, p) => n + p.length, 0) > LIMITS.document) bad();
  };
  const c = cmd as Record<string, unknown>;
  for (const k of ['deliverableId', 'objectiveId', 'changeId', 'taskId', 'scheduleId'] as const) if (k in c) id(c[k]);
  switch (cmd.type) {
    case 'addObjective': str(cmd.title, LIMITS.title); str(cmd.description, LIMITS.body); date(cmd.due); break;
    case 'addDeliverable':
      str(cmd.title, LIMITS.title); str(cmd.scope, LIMITS.body); date(cmd.due);
      memberId(cmd.reviewerId); memberId(cmd.approverId);
      if (cmd.reward !== undefined && (!Number.isInteger(cmd.reward) || cmd.reward < 0)) bad();
      break;
    case 'addTask': str(cmd.title, LIMITS.title); memberId(cmd.ownerId); date(cmd.due); break;
    case 'addPlan':
      if (cmd.assist !== undefined && cmd.assist !== 'planner') bad();
      if (!Array.isArray(cmd.deliverables) || !cmd.deliverables.length || cmd.deliverables.length > PLAN_LIMITS.deliverables) bad();
      for (const x of cmd.deliverables as unknown[]) {
        if (!x || typeof x !== 'object') bad();
        const d = x as Record<string, unknown>;
        str(d.title, LIMITS.title); str(d.scope, LIMITS.body);
        if (d.reward !== undefined && (!Number.isInteger(d.reward) || (d.reward as number) < 0)) bad();
        if (d.tasks !== undefined && (!Array.isArray(d.tasks) || d.tasks.length > PLAN_LIMITS.tasks)) bad();
        for (const task of (d.tasks as unknown[] | undefined) ?? []) str(task, LIMITS.title);
      }
      break;
    case 'setTaskDone': if (typeof cmd.done !== 'boolean') bad(); break;
    case 'saveDraft': doc(cmd.paragraphs); break;
    case 'saveVersion': doc(cmd.paragraphs); str(cmd.note, LIMITS.title); break;
    case 'comment':
      str(cmd.body, LIMITS.body);
      if (cmd.paragraph !== undefined && (!Number.isInteger(cmd.paragraph) || cmd.paragraph < 0)) bad();
      break;
    case 'requestChanges': str(cmd.note, LIMITS.body); break;
    case 'proposeRule':
      if (!RULE_KEYS.has(cmd.ruleKey) || typeof cmd.to !== 'number') bad();
      str(cmd.title, LIMITS.title); str(cmd.why, LIMITS.body); newId(cmd.id);
      break;
    case 'requestMoney': {
      const a = cmd.action as Record<string, unknown> | undefined;
      if (!a || (a.type !== 'transfer' && a.type !== 'budget')) bad();
      if (a!.type === 'transfer') { memberId(a!.to); if (typeof a!.amount !== 'number') bad(); }
      else { id(a!.objectiveId); if (typeof a!.to !== 'number') bad(); }
      str(cmd.title, LIMITS.title); str(cmd.why, LIMITS.body); newId(cmd.id);
      break;
    }
    case 'proposeRoles':
      memberId(cmd.memberId);
      if (typeof cmd.memberId !== 'string' || !Array.isArray(cmd.to) || cmd.to.length > team.charter.roles.length) bad();
      for (const r of cmd.to) if (typeof r !== 'string' || !team.charter.roles.some(x => x.id === r)) bad();
      str(cmd.title, LIMITS.title); str(cmd.why, LIMITS.body); newId(cmd.id);
      break;
    case 'vote': if (!CHOICES.has(cmd.choice)) bad(); break;
    case 'contribute':
      if (typeof cmd.amount !== 'number') bad();
      if (cmd.txHash !== undefined && (typeof cmd.txHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(cmd.txHash))) bad();
      break;
    case 'postMessage':
      if (!cmd.ref || (cmd.ref.type !== 'deliverable' && cmd.ref.type !== 'change')) bad();
      id(cmd.ref.id); str(cmd.body, LIMITS.body);
      break;
  }
}

const TYPES: Record<CommandType, true> = {
  addObjective: true, addDeliverable: true, addPlan: true, addTask: true, setTaskDone: true, take: true, saveDraft: true,
  saveVersion: true, requestReview: true, comment: true, markReviewed: true, requestChanges: true,
  acceptAndPay: true, release: true, proposeRule: true, requestMoney: true, proposeRoles: true, vote: true, closeVoting: true,
  approveMoney: true, declineMoney: true, contribute: true, paySchedule: true, postMessage: true, leave: true, takeLead: true,
};

/** Whether untrusted input (a request body) names a known command. */
export function isCommand(x: unknown): x is Command {
  return !!x && typeof x === 'object' && typeof (x as { type?: unknown }).type === 'string'
    && (x as { type: string }).type in TYPES;
}

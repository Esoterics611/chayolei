// Small formatting helpers shared by the new UI's screens: names of people
// and things in the current language, and rule values with their units.

import type { Change, RuleKey, Team } from '$lib/team/types';
import { member } from '$lib/team/rules';
import { RULE_UNITS } from '$lib/team/templates';
import { fmtNum, fmtTmim, lt, t } from '$lib/team/i18n';

export const nameOf = (team: Team, id: string | undefined): string => lt(member(team, id)?.name) || '—';

export const firstName = (team: Team, id: string | undefined): string => nameOf(team, id).split(' ')[0];

/** The member's charter roles, e.g. "Lead" or "Reviewer · Contributor". */
export function rolesOf(team: Team, id: string | undefined): string {
  const m = member(team, id);
  if (!m) return '';
  return m.roleIds
    .map(r => team.charter.roles.find(x => x.id === r))
    .filter(r => r !== undefined)
    .map(r => lt(r.name))
    .join(' · ');
}

export function fmtRule(key: RuleKey, value: number): string {
  const unit = RULE_UNITS[key];
  if (unit === 'tmim') return fmtTmim(value);
  if (unit === 'pct') return t('unit.pct', { n: fmtNum(value) });
  return t('unit.hours', { n: fmtNum(value) });
}

export const objectiveTitle = (team: Team, id: string | undefined): string =>
  lt(team.objectives.find(o => o.id === id)?.title);

export const deliverableTitle = (team: Team, id: string | undefined): string =>
  lt(team.deliverables.find(d => d.id === id)?.title);

/** A change's title: rule and money changes carry one; work changes are named after their deliverable. */
export function changeTitle(team: Team, c: Change | undefined): string {
  if (!c) return '';
  if (c.kind === 'work') return deliverableTitle(team, c.deliverableId);
  return lt(c.title);
}

export const changeById = (team: Team, id: string | undefined): Change | undefined =>
  team.changes.find(c => c.id === id);

/** The one-line "what changes" summary of a rule or money change. */
export function changeSummary(team: Team, c: Change): string {
  if (c.kind === 'rule') return t('decide.ruleChange', { rule: t(`rule.${c.ruleKey}`), from: fmtRule(c.ruleKey, c.from), to: fmtRule(c.ruleKey, c.to) });
  if (c.kind === 'money') {
    const a = c.action;
    if (a.type === 'transfer') return t('decide.moneyTransfer', { amount: fmtTmim(a.amount), name: nameOf(team, a.to) });
    const o = team.objectives.find(x => x.id === a.objectiveId);
    return t('decide.moneyBudget', { objective: lt(o?.title), from: fmtTmim(budgetBefore(team, c.id, o?.budget ?? 0)), to: fmtTmim(a.to) });
  }
  return changeTitle(team, c);
}

/** The budget before a budget change: from its ledger entry once applied, else today's budget. */
function budgetBefore(team: Team, changeId: string, current: number): number {
  const e = team.ledger.find(x => x.kind === 'budget_set' && x.refs.changeId === changeId);
  return e?.data?.from !== undefined ? Number(e.data.from) : current;
}

/** "Mac" shows ⌘, everyone else Ctrl. */
export const isMac = (): boolean =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

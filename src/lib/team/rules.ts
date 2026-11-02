// Charter lookups: current rule values and who may do what.

import type { Member, Permission, Rule, RuleKey, RuleVersion, Team } from './types';
import { DomainError } from './types';

export function rule(team: Team, key: RuleKey): Rule {
  const r = team.charter.rules.find(x => x.key === key);
  if (!r) throw new Error(`Charter has no rule ${key}`);
  return r;
}

export function ruleCurrent(team: Team, key: RuleKey): RuleVersion {
  const h = rule(team, key).history;
  return h[h.length - 1];
}

export function ruleValue(team: Team, key: RuleKey): number {
  return ruleCurrent(team, key).value;
}

/** Values a rule may take, the same bounds the team contract enforces
 *  (contracts/contracts/team/Team.sol). A majority of 100% could never be
 *  exceeded and would freeze the charter. Other rules: any whole TMIM. */
export const RULE_RANGE: Partial<Record<RuleKey, [min: number, max: number]>> = {
  quorum_pct: [0, 100],
  majority_pct: [50, 99],
  vote_hours: [1, 720],
};

export function requireValidRuleValue(key: RuleKey, value: number): void {
  const [min, max] = RULE_RANGE[key] ?? [0, Number.MAX_SAFE_INTEGER];
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new DomainError(RULE_RANGE[key] ? 'err.rule_range' : 'err.invalid_value', { min, max });
  }
}

/** Anyone who is or was on the team (for names in the record). */
export function member(team: Team, id: string | undefined): Member | undefined {
  return id ? team.members.find(m => m.id === id) : undefined;
}

/** Someone on the team now: not one who has left. */
export function activeMember(team: Team, id: string | undefined): Member | undefined {
  const m = member(team, id);
  return m && !m.leftAt ? m : undefined;
}

export const activeMembers = (team: Team): Member[] => team.members.filter(m => !m.leftAt);

/** What a set of roles may do. */
export function permissionsFor(team: Team, roleIds: string[]): Set<Permission> {
  const out = new Set<Permission>();
  for (const roleId of roleIds) team.charter.roles.find(r => r.id === roleId)?.permissions.forEach(p => out.add(p));
  return out;
}

export function permissionsOf(team: Team, memberId: string): Set<Permission> {
  const m = activeMember(team, memberId);
  return m ? permissionsFor(team, m.roleIds) : new Set();
}

export function can(team: Team, memberId: string, p: Permission): boolean {
  return permissionsOf(team, memberId).has(p);
}

export function requirePermission(team: Team, memberId: string, p: Permission): void {
  if (!can(team, memberId, p)) throw new DomainError(`err.permission.${p}`);
}

/** Members who may vote on rule, role and money changes (AI members never vote). */
export function voters(team: Team): Member[] {
  return team.members.filter(m => !m.ai && !m.leftAt && can(team, m.id, 'vote'));
}

/** Whether giving `memberId` these roles would leave no one who can vote
 *  (the team could never decide anything again). Mirrors Team.sol. */
export function leavesNoVoter(team: Team, memberId: string, roleIds: string[]): boolean {
  if (!voters(team).some(m => m.id === memberId)) return false;
  return voters(team).length === 1 && !permissionsFor(team, roleIds).has('vote');
}

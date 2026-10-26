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

export function member(team: Team, id: string | undefined): Member | undefined {
  return id ? team.members.find(m => m.id === id) : undefined;
}

export function permissionsOf(team: Team, memberId: string): Set<Permission> {
  const m = member(team, memberId);
  const out = new Set<Permission>();
  if (!m) return out;
  for (const roleId of m.roleIds) {
    const role = team.charter.roles.find(r => r.id === roleId);
    role?.permissions.forEach(p => out.add(p));
  }
  return out;
}

export function can(team: Team, memberId: string, p: Permission): boolean {
  return permissionsOf(team, memberId).has(p);
}

export function requirePermission(team: Team, memberId: string, p: Permission): void {
  if (!can(team, memberId, p)) throw new DomainError(`err.permission.${p}`);
}

/** Members who may vote on rule and money changes (AI members never vote). */
export function voters(team: Team): Member[] {
  return team.members.filter(m => !m.ai && can(team, m.id, 'vote'));
}

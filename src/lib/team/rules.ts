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

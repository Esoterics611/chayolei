// Charter templates offered when a team is started (docs/UX_REDESIGN.md §7.1).
// A template sets the roles and the starting rules; the team amends them by vote.

import type { Charter, Permission, Role, RuleKey, RuleUnit, TemplateId } from './types';

const ALL: Permission[] = [
  'take_work', 'review_work', 'accept_work', 'release', 'manage_plan', 'propose', 'vote', 'spend',
];

export const RULE_UNITS: Record<RuleKey, RuleUnit> = {
  deliverable_reward: 'tmim',
  review_reward: 'tmim',
  monthly_issuance_cap: 'tmim',
  spend_limit: 'tmim',
  quorum_pct: 'pct',
  majority_pct: 'pct',
  vote_hours: 'hours',
};

/** Display order of rules in the charter. */
export const RULE_ORDER: RuleKey[] = [
  'deliverable_reward', 'review_reward', 'monthly_issuance_cap', 'spend_limit',
  'quorum_pct', 'majority_pct', 'vote_hours',
];

interface Template {
  id: TemplateId;
  roles: Role[];
  /** Role given to the person who starts the team. */
  founderRoleIds: string[];
  /** Role given to people who join by invite. */
  joinerRoleIds: string[];
  rules: Record<RuleKey, number>;
}

export const TEMPLATES: Record<TemplateId, Template> = {
  editorial: {
    id: 'editorial',
    roles: [
      { id: 'lead', name: { en: 'Lead', he: 'מוביל' }, permissions: ALL },
      { id: 'reviewer', name: { en: 'Reviewer', he: 'מבקר' }, permissions: ['take_work', 'review_work', 'propose', 'vote'] },
      { id: 'contributor', name: { en: 'Contributor', he: 'שותף' }, permissions: ['take_work', 'propose', 'vote'] },
    ],
    founderRoleIds: ['lead'],
    joinerRoleIds: ['contributor'],
    rules: {
      deliverable_reward: 1200, review_reward: 100, monthly_issuance_cap: 20000,
      spend_limit: 2000, quorum_pct: 40, majority_pct: 50, vote_hours: 72,
    },
  },
  studio: {
    id: 'studio',
    roles: [
      { id: 'owner', name: { en: 'Owner', he: 'בעלים' }, permissions: ALL },
      { id: 'maker', name: { en: 'Maker', he: 'יוצר' }, permissions: ['take_work', 'review_work', 'propose', 'vote'] },
    ],
    founderRoleIds: ['owner'],
    joinerRoleIds: ['maker'],
    rules: {
      deliverable_reward: 1000, review_reward: 100, monthly_issuance_cap: 30000,
      spend_limit: 5000, quorum_pct: 50, majority_pct: 50, vote_hours: 48,
    },
  },
  collective: {
    id: 'collective',
    roles: [
      {
        id: 'member', name: { en: 'Member', he: 'חבר' },
        permissions: ['take_work', 'review_work', 'accept_work', 'release', 'manage_plan', 'propose', 'vote'],
      },
    ],
    founderRoleIds: ['member'],
    joinerRoleIds: ['member'],
    // Spend limit 0: every movement of money goes to a vote.
    rules: {
      deliverable_reward: 500, review_reward: 50, monthly_issuance_cap: 10000,
      spend_limit: 0, quorum_pct: 50, majority_pct: 50, vote_hours: 72,
    },
  },
  blank: {
    id: 'blank',
    roles: [{ id: 'founder', name: { en: 'Founder', he: 'מייסד' }, permissions: ALL }],
    founderRoleIds: ['founder'],
    joinerRoleIds: ['founder'],
    rules: {
      deliverable_reward: 500, review_reward: 50, monthly_issuance_cap: 10000,
      spend_limit: 1000, quorum_pct: 50, majority_pct: 50, vote_hours: 72,
    },
  },
};

export function charterFromTemplate(id: TemplateId, at: string): Charter {
  const tpl = TEMPLATES[id];
  return {
    roles: tpl.roles.map(r => ({ ...r, permissions: [...r.permissions] })),
    rules: RULE_ORDER.map(key => ({
      key,
      unit: RULE_UNITS[key],
      history: [{ value: tpl.rules[key], version: 1, at, setBy: { kind: 'founding' as const } }],
    })),
  };
}

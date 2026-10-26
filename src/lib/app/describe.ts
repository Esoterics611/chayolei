// Ledger entries as sentences in the current language, with the icon, the
// object they link to and the filters they belong to (UX_TECH_DESIGN.md §6).
// History is re-rendered from kind + refs + data, so switching language
// translates the whole record.

import type { Component } from 'svelte';
import type { LedgerEntry, Team } from '$lib/team/types';
import { fmtTmim, t } from '$lib/team/i18n';
import { href } from '$lib/team/nav';
import { changeById, changeTitle, deliverableTitle, firstName, fmtRule, objectiveTitle } from './format';
import Sparkles from '@lucide/svelte/icons/sparkles';
import UserPlus from '@lucide/svelte/icons/user-plus';
import ListTree from '@lucide/svelte/icons/list-tree';
import FilePlus from '@lucide/svelte/icons/file-plus';
import Hand from '@lucide/svelte/icons/hand';
import GitCommitHorizontal from '@lucide/svelte/icons/git-commit-horizontal';
import GitPullRequest from '@lucide/svelte/icons/git-pull-request';
import MessageSquare from '@lucide/svelte/icons/message-square';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
import BadgeCheck from '@lucide/svelte/icons/badge-check';
import BookOpenCheck from '@lucide/svelte/icons/book-open-check';
import ListPlus from '@lucide/svelte/icons/list-plus';
import SquareCheck from '@lucide/svelte/icons/square-check';
import Scale from '@lucide/svelte/icons/scale';
import Coins from '@lucide/svelte/icons/hand-coins';
import Vote from '@lucide/svelte/icons/vote';
import Gavel from '@lucide/svelte/icons/gavel';
import CircleX from '@lucide/svelte/icons/circle-x';
import ScrollText from '@lucide/svelte/icons/scroll-text';
import ArrowDownToLine from '@lucide/svelte/icons/arrow-down-to-line';
import ArrowUpFromLine from '@lucide/svelte/icons/arrow-up-from-line';
import Target from '@lucide/svelte/icons/target';
import CalendarClock from '@lucide/svelte/icons/calendar-clock';
import MessageSquareText from '@lucide/svelte/icons/message-square-text';
import Anchor from '@lucide/svelte/icons/anchor';

export type LedgerFilter = 'all' | 'money' | 'decisions' | 'work' | 'rules' | 'people';
export const LEDGER_FILTERS: LedgerFilter[] = ['all', 'money', 'decisions', 'work', 'rules', 'people'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IconComponent = Component<any>;

export interface Described {
  text: string;
  href?: string;
  icon: IconComponent;
  groups: LedgerFilter[];
  /** TMIM moved by the entry, if any. */
  amount?: number;
  /** Money into the team account (rather than out to members). */
  inbound?: boolean;
}

function payees(team: Team, e: LedgerEntry): string {
  return (e.amounts ?? [])
    .map(a => t('entry.payee', { name: firstName(team, a.memberId), amount: fmtTmim(Math.abs(a.amount)) }))
    .join(', ');
}

const moved = (e: LedgerEntry) => (e.amounts ?? []).reduce((s, a) => s + Math.abs(a.amount), 0);

export function describe(team: Team, e: LedgerEntry): Described {
  const actor = firstName(team, e.actorId);
  const deliverable = deliverableTitle(team, e.refs.deliverableId);
  const objective = objectiveTitle(team, e.refs.objectiveId);
  const c = changeById(team, e.refs.changeId);
  const change = changeTitle(team, c);
  const d = e.data ?? {};
  const dLink = (tab = '') => href(`/d/${e.refs.deliverableId}${tab}`);
  const reviewLink = () => (e.refs.changeId ? href(`/d/${e.refs.deliverableId}/review/${e.refs.changeId}`) : dLink());
  const cLink = () => href(`/decide/p/${e.refs.changeId}`);
  const group = (...g: LedgerFilter[]): LedgerFilter[] => ['all', ...g];
  const kindGroups = (): LedgerFilter[] => (c?.kind === 'rule' ? ['rules'] : c?.kind === 'money' ? ['money'] : []);

  switch (e.kind) {
    case 'team_created':
      return { text: t('entry.team_created', { actor }), icon: Sparkles, groups: group('people'), href: href('/decide/charter') };
    case 'member_joined':
      return { text: t('entry.member_joined', { actor }), icon: UserPlus, groups: group('people'), href: href('/decide/members') };
    case 'objective_created':
      return { text: t('entry.objective_created', { actor, objective }), icon: ListTree, groups: group('work'), href: href(`/plan/${e.refs.objectiveId}`) };
    case 'deliverable_created':
      return { text: t(d.assist ? 'entry.deliverable_created_ai' : 'entry.deliverable_created', { actor, deliverable, reward: fmtTmim(Number(d.reward ?? 0)) }), icon: FilePlus, groups: group('work'), href: dLink() };
    case 'assigned':
      return { text: t('entry.assigned', { actor, deliverable }), icon: Hand, groups: group('work', 'people'), href: dLink() };
    case 'version_saved':
      return { text: t('entry.version_saved', { actor, n: d.n, deliverable }), icon: GitCommitHorizontal, groups: group('work'), href: dLink('/work') };
    case 'review_requested':
      return { text: t('entry.review_requested', { actor, deliverable, to: d.to }), icon: GitPullRequest, groups: group('work'), href: reviewLink() };
    case 'commented':
      return { text: t('entry.commented', { actor, deliverable }) + (d.paragraph ? ` ¶${d.paragraph}` : ''), icon: MessageSquare, groups: group('work'), href: reviewLink() };
    case 'reviewed':
      return { text: t('entry.reviewed', { actor, deliverable }), icon: CircleCheck, groups: group('work'), href: reviewLink() };
    case 'changes_requested':
      return { text: t('entry.changes_requested', { actor, deliverable }), icon: RotateCcw, groups: group('work'), href: reviewLink() };
    case 'accepted_paid':
      return { text: t('entry.accepted_paid', { actor, deliverable, payees: payees(team, e) }), icon: BadgeCheck, groups: group('work', 'money', 'decisions'), href: reviewLink(), amount: moved(e) };
    case 'released':
      return { text: t('entry.released', { actor, deliverable, n: d.n }), icon: BookOpenCheck, groups: group('work'), href: dLink() };
    case 'task_created':
      return { text: t(d.assist ? 'entry.task_created_ai' : 'entry.task_created', { actor, deliverable }), icon: ListPlus, groups: group('work'), href: dLink('/tasks') };
    case 'task_done':
      return { text: t('entry.task_done', { actor, deliverable }), icon: SquareCheck, groups: group('work'), href: dLink('/tasks') };
    case 'change_opened':
      if (c?.kind === 'rule') {
        return {
          text: t('entry.change_opened.rule', { actor, rule: t(`rule.${c.ruleKey}`), from: fmtRule(c.ruleKey, c.from), to: fmtRule(c.ruleKey, c.to) }),
          icon: Scale, groups: group('rules', 'decisions'), href: cLink(),
        };
      }
      return { text: t('entry.change_opened.money', { actor, amount: fmtTmim(Number(d.amount ?? 0)), change }), icon: Coins, groups: group('money', 'decisions'), href: cLink() };
    case 'vote_cast':
      return { text: t('entry.vote_cast', { actor, change }), icon: Vote, groups: group('decisions', ...kindGroups()), href: cLink() };
    case 'change_passed':
      return { text: t('entry.change_passed', { change, pct: d.forPct }), icon: Gavel, groups: group('decisions', ...kindGroups()), href: cLink() };
    case 'change_failed':
      return {
        text: d.reason === 'declined' ? t('entry.change_failed.declined', { actor, change }) : t('entry.change_failed', { change }),
        icon: CircleX, groups: group('decisions', ...kindGroups()), href: cLink(),
      };
    case 'rule_changed': {
      const key = e.refs.ruleKey!;
      return { text: t('entry.rule_changed', { rule: t(`rule.${key}`), to: fmtRule(key, Number(d.to)), version: d.version }), icon: ScrollText, groups: group('rules', 'decisions'), href: href('/decide/charter') };
    }
    case 'money_moved':
      if (d.accountIn) {
        return { text: t('entry.money_moved.in', { actor, amount: fmtTmim(Number(d.accountIn)) }), icon: ArrowDownToLine, groups: group('money'), href: href('/treasury'), amount: Number(d.accountIn), inbound: true };
      }
      return { text: t('entry.money_moved.out', { actor, payees: payees(team, e) }), icon: ArrowUpFromLine, groups: group('money', 'decisions'), href: e.refs.changeId ? cLink() : href('/treasury'), amount: moved(e) };
    case 'budget_set':
      return { text: t('entry.budget_set', { objective, to: fmtTmim(Number(d.to)) }), icon: Target, groups: group('money', 'decisions'), href: href(`/plan/${e.refs.objectiveId}`) };
    case 'scheduled_paid':
      return { text: t('entry.scheduled_paid', { actor, payees: payees(team, e) }), icon: CalendarClock, groups: group('money'), href: href('/treasury'), amount: moved(e) };
    case 'message': {
      const target = e.refs.deliverableId ? deliverable : change;
      return { text: t('entry.message', { actor, target }), icon: MessageSquareText, groups: group('work'), href: e.refs.deliverableId ? dLink('/thread') : cLink() };
    }
    case 'anchor':
      return { text: t('entry.anchor', { batch: d.batch }), icon: Anchor, groups: group() };
  }
}

export const inFilter = (team: Team, e: LedgerEntry, f: LedgerFilter): boolean => describe(team, e).groups.includes(f);

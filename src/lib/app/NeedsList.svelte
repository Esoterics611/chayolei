<script lang="ts">
  // "Needs you": every review, acceptance, vote, approval and stall waiting on
  // the acting member, each with the one action that clears it.
  import type { Team } from '$lib/team/types';
  import type { NeedItem } from '$lib/team/engine';
  import * as E from '$lib/team/engine';
  import { acceptanceCost } from '$lib/team/ledger';
  import { lt, t, fmtRelative, fmtTmim, fmtNum } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import { changeById, changeTitle, deliverableTitle, firstName, objectiveTitle } from './format';
  import GitPullRequest from '@lucide/svelte/icons/git-pull-request';
  import BadgeCheck from '@lucide/svelte/icons/badge-check';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import Vote from '@lucide/svelte/icons/vote';
  import Coins from '@lucide/svelte/icons/hand-coins';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';

  let { team, items, now }: { team: Team; items: NeedItem[]; now: string } = $props();

  const ICON = { review: GitPullRequest, accept: BadgeCheck, revise: RotateCcw, vote: Vote, approve_money: Coins, stalled: TriangleAlert, pay_schedule: CalendarClock };
  const TONE = { review: 'review', accept: 'accepted', revise: 'changes', vote: 'assigned', approve_money: 'progress', stalled: 'stalled', pay_schedule: 'progress' };
  const DAY = 86_400_000;

  function view(n: NeedItem): { title: string; meta: string; link: string } {
    switch (n.kind) {
      case 'review': {
        const c = changeById(team, n.changeId);
        const d = team.deliverables.find(x => x.id === n.deliverableId)!;
        const v = c?.kind === 'work' ? E.versionById(d, c.toVersionId)?.n : undefined;
        return {
          title: t('need.review', { title: lt(d.title), v: v ? `v${v}` : '' }),
          meta: t('need.review.meta', { name: firstName(team, c?.proposerId), when: fmtRelative(n.since, now) }),
          link: href(`/d/${d.id}/review/${n.changeId}`),
        };
      }
      case 'accept': {
        const c = changeById(team, n.changeId);
        const d = team.deliverables.find(x => x.id === n.deliverableId)!;
        return {
          title: t('need.accept', { title: lt(d.title) }),
          meta: t('need.accept.meta', { amount: fmtTmim(acceptanceCost(team, d)), name: firstName(team, c?.kind === 'work' ? c.reviewedBy : undefined) }),
          link: href(`/d/${d.id}/review/${n.changeId}`),
        };
      }
      case 'revise':
        return { title: t('need.revise', { title: deliverableTitle(team, n.deliverableId) }), meta: t('need.revise.meta', { when: fmtRelative(n.since, now) }), link: href(`/d/${n.deliverableId}/edit`) };
      case 'vote': {
        const c = changeById(team, n.changeId);
        return { title: t('need.vote', { title: changeTitle(team, c) }), meta: t('need.vote.meta', { when: fmtRelative(n.closesAt, now) }), link: href(`/decide/p/${n.changeId}`) };
      }
      case 'approve_money': {
        const c = changeById(team, n.changeId);
        return {
          title: t('need.approve_money', { title: changeTitle(team, c) }),
          meta: t('need.approve_money.meta', { amount: fmtTmim(c?.kind === 'money' ? c.amount : 0), name: firstName(team, c?.proposerId) }),
          link: href(`/decide/p/${n.changeId}`),
        };
      }
      case 'stalled':
        return {
          title: t('need.stalled', { title: deliverableTitle(team, n.deliverableId) }),
          meta: t('need.stalled.meta', { days: fmtNum(Math.floor((new Date(now).getTime() - new Date(n.since).getTime()) / DAY)) }),
          link: href(`/d/${n.deliverableId}`),
        };
      case 'pay_schedule': {
        const s = team.treasury.schedules.find(x => x.id === n.scheduleId)!;
        return { title: t('need.pay_schedule', { name: firstName(team, s.memberId) }), meta: t('need.pay_schedule.meta', { amount: fmtTmim(s.amount), objective: objectiveTitle(team, s.objectiveId) }), link: href('/treasury') };
      }
    }
  }
</script>

<ul class="needs">
  {#each items as n, i (i)}
    {@const v = view(n)}
    {@const Icon = ICON[n.kind]}
    <li>
      <a class="need" href={v.link}>
        <span class="ic" data-tone={TONE[n.kind]}><Icon size={16} strokeWidth={2.1} /></span>
        <span class="txt">
          <span class="title">{v.title}</span>
          <span class="meta">{v.meta}</span>
        </span>
        <span class="go">{t(`need.action.${n.kind}`)}<ArrowRight size={14} class="flip-rtl" /></span>
      </a>
    </li>
  {/each}
</ul>

<style>
  .needs { display: flex; flex-direction: column; border: 1px solid var(--rule); border-radius: var(--r-md); background: var(--surface-raised); overflow: hidden; }
  li + li { border-block-start: 1px solid var(--rule); }
  .need { display: flex; align-items: center; gap: 14px; padding: 12px 16px; }
  .need:hover { background: var(--surface); }
  .need:hover .go { color: var(--accent-text); }
  .ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 9px; flex: none; }
  [data-tone='review'] { color: var(--st-review); background: var(--st-review-bg); }
  [data-tone='accepted'] { color: var(--st-accepted); background: var(--st-accepted-bg); }
  [data-tone='changes'] { color: var(--st-changes); background: var(--st-changes-bg); }
  [data-tone='assigned'] { color: var(--st-assigned); background: var(--st-assigned-bg); }
  [data-tone='progress'] { color: var(--st-progress); background: var(--st-progress-bg); }
  [data-tone='stalled'] { color: var(--st-stalled); background: var(--st-stalled-bg); }
  .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .title { font-weight: 500; line-height: 1.4; text-wrap: pretty; }
  .meta { font-size: var(--fs-sm); color: var(--ink-3); }
  .go { display: inline-flex; align-items: center; gap: 4px; font-size: var(--fs-sm); font-weight: 500; color: var(--ink-2); white-space: nowrap; }
  @media (max-width: 639px) {
    .need { padding: 12px; gap: 12px; }
    .go { display: none; }
  }
</style>

<script lang="ts">
  // The top of a deliverable: where it sits, its stage and version, who is
  // responsible, the reward, and the next step with whose move it is.
  import type { Deliverable, Team } from '$lib/team/types';
  import * as E from '$lib/team/engine';
  import { lt, t, fmtDate } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import StageChip from '$lib/ui/StageChip.svelte';
  import Amount from '$lib/ui/Amount.svelte';
  import People from './People.svelte';
  import { nextStep } from './next';
  import { runStep } from './actions';
  import { objectiveTitle } from './format';
  import AiMark from '$lib/ui/AiMark.svelte';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';
  import GitCommitHorizontal from '@lucide/svelte/icons/git-commit-horizontal';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';

  let { team, d, me, now }: { team: Team; d: Deliverable; me: string; now: string } = $props();
  const latest = $derived(E.latestVersion(d));
  const step = $derived(nextStep(team, d, me));
  const DAY = 86_400_000;
  const stalledDays = $derived(E.isStalled(d, now) ? Math.floor((new Date(now).getTime() - new Date(d.lastActivityAt).getTime()) / DAY) : undefined);
</script>

<header class="dh">
  <p class="trail">
    <a href={href('/plan')}>{t('nav.plan')}</a><span aria-hidden="true">/</span>
    <a href={href(`/plan/${d.objectiveId}`)}>{objectiveTitle(team, d.objectiveId)}</a>
  </p>
  <div class="row">
    <h1>{lt(d.title)}</h1>
    <div class="facts">
      <StageChip stage={d.stage} {stalledDays} size="md" />
      {#if latest}<span class="fact"><GitCommitHorizontal size={14} />v{latest.n}</span>{/if}
      <span class="fact"><Amount value={d.reward} /></span>
      {#if d.due}<span class="fact"><CalendarClock size={14} />{t('common.due', { date: fmtDate(d.due) })}</span>{/if}
      {#if d.assist}<AiMark />{/if}
    </div>
  </div>
  <People {team} {d} labels />
  <div class="next" class:mine={step.mine}>
    <span class="lab">{step.mine ? t('work.yourTurn') : t('d.nextStep')}</span>
    <p>{step.text}</p>
    {#if step.action}
      <button type="button" class="btn {step.mine ? 'btn-primary' : ''}" onclick={() => runStep(d, step.action!)}>
        {step.action.label}<ArrowRight size={15} class="flip-rtl" />
      </button>
    {/if}
  </div>
</header>

<style>
  .dh { display: flex; flex-direction: column; gap: 12px; margin-block-end: var(--s5); }
  .trail { display: flex; gap: 6px; flex-wrap: wrap; font-size: var(--fs-sm); color: var(--ink-3); }
  .trail a:hover { color: var(--accent-text); }
  .row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px 20px; flex-wrap: wrap; }
  h1 { font-size: var(--fs-2xl); font-weight: 600; letter-spacing: -0.015em; line-height: 1.25; flex: 1 1 360px; text-wrap: balance; }
  .facts { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding-block-start: 4px; }
  .fact { display: inline-flex; align-items: center; gap: 5px; color: var(--ink-2); font-size: var(--fs-sm); font-variant-numeric: tabular-nums; }
  .next {
    display: flex;
    align-items: center;
    gap: 12px 16px;
    flex-wrap: wrap;
    margin-block-start: 4px;
    padding: 12px 14px 12px 16px;
    border-radius: var(--r-md);
    border: 1px solid var(--rule);
    border-inline-start: 3px solid var(--rule-strong);
    background: var(--surface-raised);
  }
  .next.mine { border-inline-start-color: var(--accent); background: var(--accent-weak); border-color: color-mix(in srgb, var(--accent) 30%, var(--rule)); }
  .lab { font-size: var(--fs-xs); font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-3); }
  .mine .lab { color: var(--accent-text); }
  .next p { flex: 1 1 260px; }
  @media (max-width: 639px) {
    h1 { font-size: var(--fs-xl); }
    .next .btn { width: 100%; }
  }
</style>

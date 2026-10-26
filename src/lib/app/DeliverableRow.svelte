<script lang="ts">
  // One deliverable in the plan: title and progress, stage, who is
  // responsible (owner → reviewer ✓ approver), reward and the next action.
  import type { Snippet } from 'svelte';
  import type { Deliverable, Team } from '$lib/team/types';
  import * as E from '$lib/team/engine';
  import { lt, t, fmtDate, fmtNum } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import StageChip from '$lib/ui/StageChip.svelte';
  import Amount from '$lib/ui/Amount.svelte';
  import People from './People.svelte';
  import { objectiveTitle } from './format';
  import AiMark from '$lib/ui/AiMark.svelte';
  import ListChecks from '@lucide/svelte/icons/list-checks';
  import GitCommitHorizontal from '@lucide/svelte/icons/git-commit-horizontal';
  import MessageSquare from '@lucide/svelte/icons/message-square';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';

  interface Props {
    team: Team;
    d: Deliverable;
    now: string;
    showObjective?: boolean;
    action?: Snippet;
    children?: Snippet;
  }
  let { team, d, now, showObjective = false, action, children }: Props = $props();

  const DAY = 86_400_000;
  const tasks = $derived(E.tasksOf(team, d.id));
  const done = $derived(tasks.filter(x => x.done).length);
  const latest = $derived(E.latestVersion(d));
  const active = $derived(E.activeWorkChange(team, d.id));
  const comments = $derived(active?.comments.length ?? 0);
  const stalledDays = $derived(E.isStalled(d, now) ? Math.floor((new Date(now).getTime() - new Date(d.lastActivityAt).getTime()) / DAY) : undefined);
</script>

<div class="row">
  <div class="main">
    <a class="title" href={href(`/d/${d.id}`)}>{lt(d.title)}</a>
    <div class="meta">
      {#if showObjective}<span>{objectiveTitle(team, d.objectiveId)}</span>{/if}
      {#if latest}<span class="m"><GitCommitHorizontal size={13} />v{latest.n}</span>{/if}
      {#if tasks.length}<span class="m"><ListChecks size={13} />{t('plan.tasks', { done: fmtNum(done), total: fmtNum(tasks.length) })}</span>{/if}
      {#if comments}<span class="m"><MessageSquare size={13} />{fmtNum(comments)}</span>{/if}
      {#if d.due}<span class="m"><CalendarClock size={13} />{fmtDate(d.due)}</span>{/if}
      {#if d.assist}<AiMark compact />{/if}
    </div>
  </div>
  <div class="stage"><StageChip stage={d.stage} {stalledDays} /></div>
  <div class="people"><People {team} {d} /></div>
  <div class="reward"><Amount value={d.reward} size="sm" /></div>
  <div class="act">{@render action?.()}</div>
</div>
{@render children?.()}

<style>
  .row {
    display: grid;
    grid-template-columns: minmax(0, 2.1fr) minmax(150px, auto) minmax(0, 1.7fr) 104px 72px;
    align-items: center;
    gap: 14px;
    padding: 10px 16px;
    min-height: 56px;
  }
  .main { min-width: 0; }
  .title { font-weight: 500; line-height: 1.35; }
  .title:hover { text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--rule-strong); }
  .meta { display: flex; flex-wrap: wrap; gap: 2px 12px; margin-block-start: 2px; font-size: var(--fs-xs); color: var(--ink-3); }
  .m { display: inline-flex; align-items: center; gap: 4px; font-variant-numeric: tabular-nums; }
  .stage { display: flex; flex-wrap: wrap; gap: 4px; }
  .reward { text-align: end; }
  .act { display: flex; justify-content: flex-end; }
  @media (max-width: 1279px) {
    .row { grid-template-columns: minmax(0, 2fr) minmax(140px, auto) 96px 72px; }
    .people { display: none; }
  }
  @media (max-width: 639px) {
    .row { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: 'main reward' 'stage act'; gap: 8px 12px; padding: 12px; }
    .main { grid-area: main; }
    .stage { grid-area: stage; }
    .reward { grid-area: reward; }
    .act { grid-area: act; }
  }
</style>

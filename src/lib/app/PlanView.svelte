<script lang="ts">
  // Plan (workforce): objectives → deliverables → tasks, with who is
  // responsible, budgets and stalls on one screen; outline or board.
  import type { Deliverable, Stage } from '$lib/team/types';
  import { STAGES } from '$lib/team/types';
  import { store } from '$lib/team/store.svelte';
  import { ui } from '$lib/team/ui.svelte';
  import * as E from '$lib/team/engine';
  import { can } from '$lib/team/rules';
  import { objectiveFigures } from '$lib/team/ledger';
  import { lt, t, fmtDate, fmtNum, fmtTmim } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import StageChip from '$lib/ui/StageChip.svelte';
  import Amount from '$lib/ui/Amount.svelte';
  import Meter from '$lib/ui/Meter.svelte';
  import DeliverableRow from './DeliverableRow.svelte';
  import StageStrip from './StageStrip.svelte';
  import People from './People.svelte';
  import Person from './Person.svelte';
  import { takeWork } from './actions';
  import { objectiveTitle } from './format';
  import Plus from '@lucide/svelte/icons/plus';
  import LayoutList from '@lucide/svelte/icons/layout-list';
  import SquareKanban from '@lucide/svelte/icons/square-kanban';
  import Target from '@lucide/svelte/icons/target';
  import Coins from '@lucide/svelte/icons/hand-coins';
  import Square from '@lucide/svelte/icons/square';
  import SquareCheck from '@lucide/svelte/icons/square-check';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';
  import ListTree from '@lucide/svelte/icons/list-tree';

  let { objectiveId }: { objectiveId?: string } = $props();

  const VIEW_KEY = 'chayolei-plan-view';
  let view = $state<'outline' | 'board'>(readView());
  function readView(): 'outline' | 'board' {
    try { return localStorage.getItem(VIEW_KEY) === 'board' ? 'board' : 'outline'; } catch { return 'outline'; }
  }
  function setView(v: 'outline' | 'board') {
    view = v;
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* per-visit only */ }
  }

  const team = $derived(store.team);
  const me = $derived(store.me);
  const now = $derived(store.now);
  const objectives = $derived(objectiveId ? team.objectives.filter(o => o.id === objectiveId) : team.objectives);
  const shown = $derived(team.deliverables.filter(d => objectives.some(o => o.id === d.objectiveId)));
  const canPlan = $derived(can(team, me, 'manage_plan'));
  const canPropose = $derived(can(team, me, 'propose'));
  const canTake = $derived(can(team, me, 'take_work'));
  const DAY = 86_400_000;
  const stalledDays = (d: Deliverable) => (E.isStalled(d, now) ? Math.floor((new Date(now).getTime() - new Date(d.lastActivityAt).getTime()) / DAY) : undefined);
  const byStage = (s: Stage) => shown.filter(d => d.stage === s);

  function toggleTask(id: string, done: boolean) {
    store.run((tm, m, n) => E.setTaskDone(tm, m, id, done, n));
  }
</script>

<PageHeader title={objectiveId && objectives[0] ? lt(objectives[0].title) : t('plan.title')} subtitle={objectiveId ? lt(objectives[0]?.description) : lt(team.purpose)}>
  {#snippet eyebrow()}
    {#if objectiveId}<a href={href('/plan')}>{t('plan.title')}</a><span aria-hidden="true">/</span><span>{t('plan.objective')}</span>{/if}
  {/snippet}
  {#snippet actions()}
    <div class="seg" role="group" aria-label={t('plan.title')}>
      <button type="button" aria-pressed={view === 'outline'} onclick={() => setView('outline')}><LayoutList size={15} />{t('plan.outline')}</button>
      <button type="button" aria-pressed={view === 'board'} onclick={() => setView('board')}><SquareKanban size={15} />{t('plan.board')}</button>
    </div>
    {#if canPlan}
      <button type="button" class="btn btn-primary" onclick={() => (objectiveId ? ui.openDialog({ kind: 'newDeliverable', objectiveId }) : ui.openDialog({ kind: 'newObjective' }))}>
        <Plus size={16} />{objectiveId ? t('plan.newDeliverable') : t('plan.newObjective')}
      </button>
    {/if}
  {/snippet}
</PageHeader>

{#if team.objectives.length > 1}
  <nav class="chips" aria-label={t('plan.objective')}>
    <a href={href('/plan')} aria-current={!objectiveId ? 'page' : undefined}>{t('plan.all')}</a>
    {#each team.objectives as o (o.id)}
      <a href={href(`/plan/${o.id}`)} aria-current={objectiveId === o.id ? 'page' : undefined}>{lt(o.title)}</a>
    {/each}
  </nav>
{/if}

{#if !team.objectives.length}
  <EmptyState icon={Target} title={t('plan.noObjectives')} hint={t('plan.noObjectivesHint')}>
    {#if canPlan}<button type="button" class="btn btn-primary" onclick={() => ui.openDialog({ kind: 'newObjective' })}><Plus size={16} />{t('plan.newObjective')}</button>{/if}
  </EmptyState>
{:else if view === 'outline'}
  <div class="objectives">
    {#each objectives as o (o.id)}
      {@const ds = team.deliverables.filter(d => d.objectiveId === o.id)}
      {@const f = objectiveFigures(team, o)}
      {@const accepted = ds.filter(d => d.stage === 'accepted' || d.stage === 'released').length}
      <section class="objective" aria-labelledby="o-{o.id}">
        <header class="o-head">
          <div class="o-title">
            <h2 id="o-{o.id}"><a href={href(`/plan/${o.id}`)}>{lt(o.title)}</a></h2>
            <div class="o-meta">
              <Person {team} id={o.ownerId} />
              {#if o.due}<span class="m"><CalendarClock size={13} />{t('common.due', { date: fmtDate(o.due) })}</span>{/if}
              <span class="m">{t('plan.accepted', { done: fmtNum(accepted), total: fmtNum(ds.length) })}</span>
            </div>
            <StageStrip deliverables={ds} />
          </div>
          <div class="budget">
            {#if o.budget > 0}
              <div class="b-figs">
                <div><span class="eyebrow-label">{t('plan.budget')}</span><Amount value={f.budget} /></div>
                <div><span class="eyebrow-label"><i class="key solid"></i>{t('plan.paid')}</span><Amount value={f.paid} /></div>
                <div><span class="eyebrow-label"><i class="key soft"></i>{t('plan.committed')}</span><Amount value={f.committed} /></div>
                <div><span class="eyebrow-label">{t('plan.left')}</span><Amount value={f.left} tone={f.left < 0 ? 'negative' : 'default'} /></div>
              </div>
              <Meter total={f.budget} segments={[{ value: f.paid, tone: 'solid' }, { value: f.committed, tone: 'soft' }]} label="{t('plan.paid')} {fmtTmim(f.paid)}, {t('plan.committed')} {fmtTmim(f.committed)}, {t('plan.left')} {fmtTmim(f.left)}" />
            {:else}
              <p class="nobudget"><Coins size={15} />{t('plan.noBudget')}</p>
            {/if}
            <div class="o-actions">
              {#if canPropose}<button type="button" class="btn btn-sm btn-ghost" onclick={() => ui.openDialog({ kind: 'requestMoney', type: 'budget', objectiveId: o.id })}><Coins size={14} />{t('plan.requestBudget')}</button>{/if}
              {#if canPlan}<button type="button" class="btn btn-sm" onclick={() => ui.openDialog({ kind: 'newDeliverable', objectiveId: o.id })}><Plus size={14} />{t('plan.newDeliverable')}</button>{/if}
            </div>
          </div>
        </header>

        {#if ds.length}
          <div class="rows" role="list">
            {#each ds as d (d.id)}
              {@const tasks = E.tasksOf(team, d.id).filter(x => !x.done || d.stage !== 'released')}
              <div role="listitem" class="ritem">
                <DeliverableRow {team} {d} {now}>
                  {#snippet action()}
                    {#if d.stage === 'open' && canTake}<button type="button" class="btn btn-sm" onclick={() => takeWork(d)}>{t('plan.take')}</button>{/if}
                  {/snippet}
                </DeliverableRow>
                {#if tasks.length && d.stage !== 'released'}
                  <ul class="tasks">
                    {#each tasks as task (task.id)}
                      {@const mayTick = task.ownerId === me || d.ownerId === me || canPlan}
                      <li class:done={task.done}>
                        <button type="button" class="tick" disabled={!mayTick} aria-pressed={task.done} onclick={() => toggleTask(task.id, !task.done)} aria-label={lt(task.title)}>
                          {#if task.done}<SquareCheck size={15} />{:else}<Square size={15} />{/if}
                        </button>
                        <span class="t-title">{lt(task.title)}</span>
                        {#if task.ownerId}<Person {team} id={task.ownerId} first />{/if}
                        {#if task.due}<span class="m">{fmtDate(task.due)}</span>{/if}
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <EmptyState icon={ListTree} title={t('plan.noDeliverables')} hint={t('plan.noDeliverablesHint')} compact>
            {#if canPlan}<button type="button" class="btn btn-sm btn-primary" onclick={() => ui.openDialog({ kind: 'newDeliverable', objectiveId: o.id })}><Plus size={14} />{t('plan.newDeliverable')}</button>{/if}
          </EmptyState>
        {/if}
      </section>
    {/each}
  </div>
{:else}
  <div class="board" role="list">
    {#each STAGES as s (s)}
      {@const list = byStage(s)}
      <section class="col" role="listitem" aria-label={t(`stage.${s}`)} data-stage={s}>
        <header class="col-head"><StageChip stage={s} /><span class="n">{fmtNum(list.length)}</span></header>
        <div class="cards">
          {#each list as d (d.id)}
            {@const sd = stalledDays(d)}
            <article class="card" class:stalled={sd}>
              <a class="c-title" href={href(`/d/${d.id}`)}>{lt(d.title)}</a>
              {#if !objectiveId}<p class="c-obj">{objectiveTitle(team, d.objectiveId)}</p>{/if}
              {#if sd}<StageChip stage={d.stage} stalledDays={sd} />{/if}
              <div class="c-foot">
                <People {team} {d} compact />
                <Amount value={d.reward} size="sm" />
              </div>
              {#if d.stage === 'open' && canTake}<button type="button" class="btn btn-sm btn-block" onclick={() => takeWork(d)}>{t('plan.take')}</button>{/if}
            </article>
          {/each}
        </div>
      </section>
    {/each}
  </div>
{/if}

<style>
  .seg { display: inline-flex; padding: 2px; border-radius: var(--r-sm); background: var(--surface-3); }
  .seg button { display: inline-flex; align-items: center; gap: 6px; min-height: 30px; padding-inline: 10px; border-radius: 5px; color: var(--ink-2); font-weight: 500; }
  .seg button[aria-pressed='true'] { background: var(--surface-raised); color: var(--ink); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; margin-block: calc(-1 * var(--s2)) var(--s6); }
  .chips a { padding: 5px 12px; border-radius: 999px; border: 1px solid var(--rule); font-size: var(--fs-sm); color: var(--ink-2); background: var(--surface-raised); }
  .chips a:hover { border-color: var(--rule-strong); color: var(--ink); }
  .chips a[aria-current='page'] { background: var(--ink); color: var(--surface); border-color: var(--ink); }
  .objectives { display: flex; flex-direction: column; gap: var(--s8); }
  .objective { border: 1px solid var(--rule); border-radius: var(--r-lg); background: var(--surface-raised); overflow: hidden; }
  .o-head { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 440px); gap: var(--s6); padding: var(--s5); background: var(--surface); border-block-end: 1px solid var(--rule); }
  .o-title { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
  h2 { font-size: var(--fs-xl); font-weight: 600; letter-spacing: -0.01em; line-height: 1.3; }
  h2 a:hover { text-decoration: underline; text-underline-offset: 4px; text-decoration-color: var(--rule-strong); }
  .o-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 16px; font-size: var(--fs-sm); color: var(--ink-2); }
  .m { display: inline-flex; align-items: center; gap: 5px; color: var(--ink-3); font-size: var(--fs-sm); }
  .budget { display: flex; flex-direction: column; gap: 10px; }
  .b-figs { display: grid; grid-template-columns: repeat(4, auto); gap: 12px; justify-content: space-between; }
  .b-figs > div { display: flex; flex-direction: column; gap: 2px; }
  .key { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-inline-end: 5px; vertical-align: 0; }
  .key.solid { background: var(--accent); }
  .key.soft { background: color-mix(in srgb, var(--accent) 38%, var(--surface-3)); }
  .nobudget { display: flex; align-items: center; gap: 8px; color: var(--ink-3); font-size: var(--fs-sm); }
  .o-actions { display: flex; justify-content: flex-end; gap: 6px; flex-wrap: wrap; }
  .rows { display: flex; flex-direction: column; }
  .ritem + .ritem { border-block-start: 1px solid var(--rule); }
  .ritem:hover { background: color-mix(in srgb, var(--surface) 60%, transparent); }
  .tasks { display: flex; flex-direction: column; gap: 2px; padding: 0 16px 10px calc(16px + 22px); margin-block-start: -4px; }
  :global([dir='rtl']) .tasks { padding: 0 calc(16px + 22px) 10px 16px; }
  .tasks li { position: relative; display: flex; align-items: center; gap: 8px; font-size: var(--fs-sm); color: var(--ink-2); min-height: 26px; }
  .tasks li::before { content: ''; position: absolute; inset-inline-start: -14px; inset-block-start: -4px; width: 10px; height: 17px; border-inline-start: 1.5px solid var(--rule-strong); border-block-end: 1.5px solid var(--rule-strong); border-end-start-radius: 4px; }
  :global([dir='rtl']) .tasks li::before { border-end-start-radius: 0; border-end-end-radius: 4px; }
  .tasks li.done .t-title { text-decoration: line-through; color: var(--ink-3); }
  .tick { display: grid; place-items: center; color: var(--ink-3); }
  .tick[aria-pressed='true'] { color: var(--st-accepted); }
  .tick:disabled { cursor: default; }
  .t-title { flex: 1; min-width: 0; }

  .board { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(232px, 1fr); gap: var(--s3); overflow-x: auto; padding-block-end: var(--s3); scroll-snap-type: x proximity; }
  .col { display: flex; flex-direction: column; gap: var(--s2); min-width: 0; padding: 10px; border-radius: var(--r-md); background: var(--surface-2); scroll-snap-align: start; }
  .col-head { display: flex; align-items: center; justify-content: space-between; padding: 2px 2px 6px; }
  .col-head .n { font-size: var(--fs-sm); color: var(--ink-3); font-variant-numeric: tabular-nums; }
  .cards { display: flex; flex-direction: column; gap: var(--s2); }
  .card { display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid var(--rule); border-radius: var(--r-sm); background: var(--surface-raised); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03); }
  .card.stalled { border-color: color-mix(in srgb, var(--st-stalled) 45%, var(--rule)); }
  .c-title { font-weight: 500; line-height: 1.35; }
  .c-title:hover { text-decoration: underline; text-underline-offset: 3px; }
  .c-obj { font-size: var(--fs-xs); color: var(--ink-3); }
  .c-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  @media (max-width: 1099px) {
    .o-head { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 639px) {
    .o-head { padding: var(--s4); }
    .b-figs { grid-template-columns: repeat(2, auto); }
    .objective { border-radius: var(--r-md); }
    .board { grid-auto-columns: 82%; margin-inline: calc(-1 * var(--s4)); padding-inline: var(--s4); }
  }
</style>

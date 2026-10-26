<script lang="ts">
  // The AI planner (UX_REDESIGN.md phase 9): ask for a breakdown of an
  // objective, edit it, and add what you keep in one action. What is added
  // is marked AI-assisted in the plan, its history and its credits.
  import { store } from '$lib/team/store.svelte';
  import { objectiveFigures } from '$lib/team/ledger';
  import { PLAN_MAX } from '$lib/team/planner';
  import type { PlanSuggestion } from '$lib/team/planner';
  import { t, fmtNum, fmtTmim } from '$lib/team/i18n';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import Plus from '@lucide/svelte/icons/plus';
  import X from '@lucide/svelte/icons/x';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import Send from '@lucide/svelte/icons/send';

  let { done, objectiveId }: { done: () => void; objectiveId: string } = $props();

  interface Item { keep: boolean; title: string; scope: string; reward: number; tasks: string[] }

  let phase = $state<'ask' | 'thinking' | 'edit'>('ask');
  let items = $state<Item[]>([]);
  let note = $state('');
  let source = $state<PlanSuggestion['source']>('ai');
  let busy = $state(false);

  const team = $derived(store.team);
  const objective = $derived(team.objectives.find(o => o.id === objectiveId));
  const left = $derived(objective && objective.budget > 0 ? objectiveFigures(team, objective).left : undefined);
  const kept = $derived(items.filter(i => i.keep && i.title.trim()));
  const total = $derived(kept.reduce((n, i) => n + Math.max(0, Math.round(Number(i.reward) || 0)), 0));

  async function suggest() {
    const before = phase;
    phase = 'thinking';
    const s = await store.suggestPlan(objectiveId);
    if (!s) { phase = before === 'thinking' ? 'ask' : before; return; }
    items = s.deliverables.map(d => ({ keep: true, title: d.title, scope: d.scope, reward: d.reward, tasks: [...d.tasks] }));
    note = s.note;
    source = s.source;
    phase = 'edit';
  }

  async function add(e: SubmitEvent) {
    e.preventDefault();
    if (!kept.length || busy) return;
    busy = true;
    const r = await store.do({
      type: 'addPlan', objectiveId, assist: 'planner',
      deliverables: kept.map(i => ({
        title: i.title.trim(),
        scope: i.scope.trim(),
        reward: Math.max(0, Math.round(Number(i.reward) || 0)),
        tasks: i.tasks.map(x => x.trim()).filter(Boolean),
      })),
    }, t('planner.added', { n: fmtNum(kept.length) }));
    busy = false;
    if (r) done();
  }
</script>

{#if phase === 'ask'}
  <div class="form">
    <p class="note sends">{store.live ? t('planner.sends') : t('planner.sendsDemo')}</p>
    <div class="form-actions">
      <button type="button" class="btn" onclick={done}>{t('common.cancel')}</button>
      <button type="button" class="btn btn-primary" onclick={suggest}><Sparkles size={15} />{t('planner.go')}</button>
    </div>
  </div>
{:else if phase === 'thinking'}
  <p class="thinking" role="status"><span class="spin" aria-hidden="true"></span>{t('planner.thinking')}</p>
{:else}
  <form class="form" onsubmit={add}>
    <div class="source" class:sample={source === 'sample'}>
      <p class="label-line"><Sparkles size={14} aria-hidden="true" />{source === 'sample' ? t('planner.sampleLabel') : t('planner.aiLabel')}</p>
      {#if note}<p class="pnote"><span class="label">{t('planner.note')}:</span> {note}</p>{/if}
    </div>

    <ol class="items">
      {#each items as item, i (i)}
        <li>
          <fieldset class="item" class:off={!item.keep}>
            <legend class="visually-hidden">{t('planner.item', { n: fmtNum(i + 1) })}</legend>
            <div class="item-head">
              <span class="n" aria-hidden="true">{fmtNum(i + 1)}</span>
              <label class="keep"><input type="checkbox" bind:checked={item.keep} />{t('planner.include')}</label>
            </div>
            <div class="title-row">
              <label class="field">
                <span class="label">{t('plan.field.title')}</span>
                <input class="input" bind:value={item.title} disabled={!item.keep} maxlength={PLAN_MAX.title} required={item.keep} />
              </label>
              <label class="field">
                <span class="label">{t('plan.field.reward')}</span>
                <input class="input num" type="number" min="0" step="1" bind:value={item.reward} disabled={!item.keep} required={item.keep} />
              </label>
            </div>
            <label class="field">
              <span class="label">{t('plan.field.scope')}</span>
              <textarea class="input" rows="2" bind:value={item.scope} disabled={!item.keep}></textarea>
            </label>
            <div class="field">
              <span class="label" id="tasks-{i}">{t('planner.tasks')}</span>
              <ul class="tasks" aria-labelledby="tasks-{i}">
                {#each item.tasks as _, j (j)}
                  <li>
                    <input class="input" bind:value={item.tasks[j]} disabled={!item.keep} maxlength={PLAN_MAX.title} aria-label={t('planner.task', { n: fmtNum(j + 1) })} />
                    <button type="button" class="btn btn-ghost btn-sm x" disabled={!item.keep} onclick={() => item.tasks.splice(j, 1)} aria-label={t('planner.removeTask', { n: fmtNum(j + 1) })}><X size={14} /></button>
                  </li>
                {/each}
              </ul>
              {#if item.tasks.length < PLAN_MAX.tasks}
                <button type="button" class="btn btn-ghost btn-sm add-task" disabled={!item.keep} onclick={() => item.tasks.push('')}><Plus size={14} />{t('planner.addTask')}</button>
              {/if}
            </div>
          </fieldset>
        </li>
      {/each}
    </ol>

    <!-- Stays in view while the list scrolls: the total and what to do with it. -->
    <div class="foot">
      <div class="sum" aria-live="polite">
        <span class="num">{t('planner.total', { total: fmtTmim(total) })}</span>
        {#if left !== undefined}<span class="num muted">· {t('planner.left', { left: fmtTmim(left) })}</span>{/if}
      </div>
      {#if left !== undefined && total > left}<p class="note over">{t('planner.over')}</p>{/if}
      <div class="form-actions">
        <button type="button" class="btn btn-ghost again" onclick={suggest}><RotateCcw size={15} />{t('planner.again')}</button>
        <button type="button" class="btn" onclick={done}>{t('common.cancel')}</button>
        <button type="submit" class="btn btn-primary" disabled={!kept.length || busy}><Send size={15} class="flip-rtl" />{t('planner.accept', { n: fmtNum(kept.length) })}</button>
      </div>
    </div>
  </form>
{/if}

<style>
  .sends { line-height: 1.55; }
  .thinking { display: flex; align-items: center; gap: 10px; min-height: 120px; justify-content: center; color: var(--ink-2); }
  .spin { width: 16px; height: 16px; border-radius: 999px; border: 2px solid var(--rule-strong); border-block-start-color: var(--accent); animation: turn 0.8s linear infinite; }
  @keyframes turn { to { transform: rotate(360deg); } }
  .source { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border: 1px dashed var(--rule-strong); border-radius: var(--r-sm); font-size: var(--fs-sm); color: var(--ink-2); }
  .label-line { display: flex; align-items: center; gap: 6px; font-weight: 500; color: var(--ink); }
  .pnote { line-height: 1.5; }
  .items { display: flex; flex-direction: column; gap: var(--s3); }
  .item { display: flex; flex-direction: column; gap: 10px; padding: 10px var(--s4) var(--s4); border: 1px solid var(--rule); border-radius: var(--r-md); background: var(--surface); min-width: 0; }
  .title-row { display: grid; grid-template-columns: minmax(0, 1fr) 132px; gap: var(--s3); }
  .item.off { background: var(--surface-2); }
  .item.off .field { opacity: 0.6; }
  .item-head { display: flex; align-items: center; justify-content: space-between; }
  .n { font-size: var(--fs-sm); font-weight: 600; color: var(--ink-3); font-variant-numeric: tabular-nums; }
  .keep { display: inline-flex; align-items: center; gap: 8px; min-height: 28px; font-size: var(--fs-sm); font-weight: 500; cursor: pointer; }
  .keep input { width: 16px; height: 16px; accent-color: var(--accent); }
  .tasks { display: flex; flex-direction: column; gap: 4px; }
  .tasks li { display: flex; align-items: center; gap: 6px; }
  .tasks .input { min-height: 32px; padding-block: 4px; font-size: var(--fs-sm); }
  .x { width: 32px; padding: 0; flex: none; }
  .add-task { align-self: flex-start; }
  .foot {
    position: sticky; inset-block-end: calc(-1 * var(--s5)); z-index: 1;
    display: flex; flex-direction: column; gap: var(--s2);
    margin-block-end: calc(-1 * var(--s5)); padding-block: var(--s3) var(--s5);
    border-block-start: 1px solid var(--rule); background: var(--surface-raised);
  }
  .foot .form-actions { padding-block-start: 0; }
  .sum { display: flex; flex-wrap: wrap; gap: 6px; font-size: var(--fs-sm); font-weight: 500; }
  .over { color: var(--st-changes); background: var(--st-changes-bg); }
  .again { margin-inline-end: auto; }
  @media (max-width: 520px) {
    .title-row { grid-template-columns: minmax(0, 1fr); }
  }
</style>

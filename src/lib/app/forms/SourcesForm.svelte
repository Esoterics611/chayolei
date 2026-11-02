<script lang="ts">
  // The source finder (UX_REDESIGN.md §8): references from a web search, each
  // with what it offers this work. The member keeps what helps and posts it to
  // the deliverable's thread, marked AI-assisted.
  import { store } from '$lib/team/store.svelte';
  import { sourcesMessage } from '$lib/team/helpers';
  import type { FoundSource, Sources } from '$lib/team/helpers';
  import { t, fmtNum } from '$lib/team/i18n';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import Send from '@lucide/svelte/icons/send';
  import ExternalLink from '@lucide/svelte/icons/external-link';

  let { done, deliverableId }: { done: () => void; deliverableId: string } = $props();

  interface Item extends FoundSource { keep: boolean }

  let phase = $state<'ask' | 'thinking' | 'pick'>('ask');
  let items = $state<Item[]>([]);
  let source = $state<Sources['source']>('ai');
  let busy = $state(false);
  const kept = $derived(items.filter(i => i.keep));

  async function ask() {
    const before = phase;
    phase = 'thinking';
    const s = await store.askHelper('sources', { deliverableId });
    if (!s) { phase = before === 'thinking' ? 'ask' : before; return; }
    items = s.sources.map(x => ({ ...x, keep: true }));
    source = s.source;
    phase = 'pick';
  }

  async function post(e: SubmitEvent) {
    e.preventDefault();
    if (!kept.length || busy) return;
    busy = true;
    const body = sourcesMessage(kept.map(({ keep: _, ...x }) => x));
    const ok = await store.do({ type: 'postMessage', ref: { type: 'deliverable', id: deliverableId }, body, assist: 'sources' }, t('helper.sources.posted'));
    busy = false;
    if (ok) done();
  }
</script>

{#if phase === 'ask'}
  <div class="form">
    <p class="note sends">{store.live ? t('helper.sources.sends') : t('helper.sendsDemo')}</p>
    <div class="form-actions">
      <button type="button" class="btn" onclick={done}>{t('common.cancel')}</button>
      <button type="button" class="btn btn-primary" onclick={ask}><Sparkles size={15} />{t('helper.sources.go')}</button>
    </div>
  </div>
{:else if phase === 'thinking'}
  <p class="thinking" role="status"><span class="spin" aria-hidden="true"></span>{t('helper.sources.thinking')}</p>
{:else}
  <form class="form" onsubmit={post}>
    <div class="source">
      <p class="label-line"><Sparkles size={14} aria-hidden="true" />{source === 'sample' ? t('helper.sampleLabel') : t('helper.sources.aiLabel')}</p>
    </div>
    <ol class="items">
      {#each items as item, i (item.url)}
        <li class="item" class:off={!item.keep}>
          <div class="item-head">
            <a class="title" href={item.url} target="_blank" rel="noopener noreferrer" dir="auto">{item.title}<ExternalLink size={12} aria-hidden="true" /></a>
            <label class="keep"><input type="checkbox" bind:checked={item.keep} aria-label={t('helper.sources.keep', { n: fmtNum(i + 1) })} />{t('helper.keep')}</label>
          </div>
          <p class="url"><bdi>{item.url}</bdi></p>
          {#if item.why}<p class="why" dir="auto">{item.why}</p>{/if}
        </li>
      {/each}
    </ol>
    <div class="form-actions">
      <button type="button" class="btn btn-ghost again" onclick={ask}><RotateCcw size={15} />{t('helper.again')}</button>
      <button type="button" class="btn" onclick={done}>{t('common.cancel')}</button>
      <button type="submit" class="btn btn-primary" disabled={!kept.length || busy}><Send size={15} class="flip-rtl" />{t('helper.sources.post', { n: fmtNum(kept.length) })}</button>
    </div>
  </form>
{/if}

<style>
  .sends { line-height: 1.55; }
  .thinking { display: flex; align-items: center; gap: 10px; min-height: 120px; justify-content: center; color: var(--ink-2); }
  .spin { width: 16px; height: 16px; border-radius: 999px; border: 2px solid var(--rule-strong); border-block-start-color: var(--accent); animation: turn 0.8s linear infinite; }
  @keyframes turn { to { transform: rotate(360deg); } }
  .source { padding: 10px 12px; border: 1px dashed var(--rule-strong); border-radius: var(--r-sm); font-size: var(--fs-sm); }
  .label-line { display: flex; align-items: center; gap: 6px; font-weight: 500; }
  .items { display: flex; flex-direction: column; gap: var(--s3); }
  .item { display: flex; flex-direction: column; gap: 4px; padding: 10px var(--s4); border: 1px solid var(--rule); border-radius: var(--r-md); background: var(--surface); min-width: 0; }
  .item.off { background: var(--surface-2); opacity: 0.75; }
  .item-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .title { display: inline-flex; align-items: center; gap: 5px; font-weight: 600; text-decoration: underline; min-width: 0; }
  .url { font-family: var(--font-mono); font-size: var(--fs-xs); color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .why { font-size: var(--fs-sm); color: var(--ink-2); line-height: 1.5; }
  .keep { display: inline-flex; align-items: center; gap: 8px; min-height: 28px; font-size: var(--fs-sm); font-weight: 500; cursor: pointer; flex: none; }
  .keep input { width: 16px; height: 16px; accent-color: var(--accent); }
  .again { margin-inline-end: auto; }
</style>

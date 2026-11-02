<script lang="ts">
  // The summarizer (UX_REDESIGN.md §8): a digest of a thread, for whoever
  // wasn't following it. It can be posted to the thread, marked AI-assisted.
  import { store } from '$lib/team/store.svelte';
  import { summaryMessage } from '$lib/team/helpers';
  import type { Summary, ThreadRef } from '$lib/team/helpers';
  import { t } from '$lib/team/i18n';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import Send from '@lucide/svelte/icons/send';

  let { done, threadRef }: { done: () => void; threadRef: ThreadRef } = $props();

  let phase = $state<'ask' | 'thinking' | 'show'>('ask');
  let result = $state<Summary | null>(null);
  let busy = $state(false);

  async function ask() {
    const before = phase;
    phase = 'thinking';
    const s = await store.askHelper('summary', { ref: threadRef });
    if (!s) { phase = before === 'thinking' ? 'ask' : before; return; }
    result = s;
    phase = 'show';
  }

  async function post() {
    if (!result || busy) return;
    busy = true;
    const body = summaryMessage(result, { decided: t('helper.summary.decided'), open: t('helper.summary.open') });
    const ok = await store.do({ type: 'postMessage', ref: threadRef, body, assist: 'summarizer' }, t('helper.summary.posted'));
    busy = false;
    if (ok) done();
  }
</script>

{#if phase === 'ask'}
  <div class="form">
    <p class="note sends">{store.live ? t('helper.summary.sends') : t('helper.sendsDemo')}</p>
    <div class="form-actions">
      <button type="button" class="btn" onclick={done}>{t('common.cancel')}</button>
      <button type="button" class="btn btn-primary" onclick={ask}><Sparkles size={15} />{t('helper.summary.go')}</button>
    </div>
  </div>
{:else if phase === 'thinking' || !result}
  <p class="thinking" role="status"><span class="spin" aria-hidden="true"></span>{t('helper.summary.thinking')}</p>
{:else}
  <div class="form">
    <div class="source">
      <p class="label-line"><Sparkles size={14} aria-hidden="true" />{result.source === 'sample' ? t('helper.sampleLabel') : t('helper.aiLabel')}</p>
    </div>
    <p class="sum" dir="auto">{result.summary}</p>
    {#if result.decisions.length}
      <h3 class="h">{t('helper.summary.decided')}</h3>
      <ul class="pts">{#each result.decisions as x, i (i)}<li dir="auto">{x}</li>{/each}</ul>
    {/if}
    {#if result.open.length}
      <h3 class="h">{t('helper.summary.open')}</h3>
      <ul class="pts">{#each result.open as x, i (i)}<li dir="auto">{x}</li>{/each}</ul>
    {/if}
    <p class="muted small">{t('helper.summary.postHint')}</p>
    <div class="form-actions">
      <button type="button" class="btn btn-ghost again" onclick={ask}><RotateCcw size={15} />{t('helper.again')}</button>
      <button type="button" class="btn" onclick={done}>{t('common.close')}</button>
      <button type="button" class="btn btn-primary" disabled={busy} onclick={post}><Send size={15} class="flip-rtl" />{t('helper.summary.post')}</button>
    </div>
  </div>
{/if}

<style>
  .sends { line-height: 1.55; }
  .thinking { display: flex; align-items: center; gap: 10px; min-height: 120px; justify-content: center; color: var(--ink-2); }
  .spin { width: 16px; height: 16px; border-radius: 999px; border: 2px solid var(--rule-strong); border-block-start-color: var(--accent); animation: turn 0.8s linear infinite; }
  @keyframes turn { to { transform: rotate(360deg); } }
  .source { padding: 10px 12px; border: 1px dashed var(--rule-strong); border-radius: var(--r-sm); font-size: var(--fs-sm); }
  .label-line { display: flex; align-items: center; gap: 6px; font-weight: 500; }
  .sum { line-height: 1.6; }
  .h { font-size: var(--fs-sm); font-weight: 600; color: var(--ink-2); }
  .pts { display: flex; flex-direction: column; gap: 4px; padding-inline-start: 1.2em; list-style: disc; }
  .small { font-size: var(--fs-sm); }
  .again { margin-inline-end: auto; }
</style>

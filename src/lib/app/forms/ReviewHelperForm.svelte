<script lang="ts">
  // The first-pass reviewer (UX_REDESIGN.md §8): notes on the version up for
  // review, anchored to its paragraphs. The reviewer keeps and edits what
  // helps and adds it as comments, marked AI-assisted; the review stays theirs.
  import { store } from '$lib/team/store.svelte';
  import { ui } from '$lib/team/ui.svelte';
  import { HELPER_MAX } from '$lib/team/helpers';
  import type { ReviewNote, ReviewSuggestion } from '$lib/team/helpers';
  import { t, fmtNum } from '$lib/team/i18n';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import Send from '@lucide/svelte/icons/send';

  let { done, changeId }: { done: () => void; changeId: string } = $props();

  interface Item extends ReviewNote { keep: boolean }

  let phase = $state<'ask' | 'thinking' | 'edit'>('ask');
  let items = $state<Item[]>([]);
  let summary = $state('');
  let source = $state<ReviewSuggestion['source']>('ai');
  let busy = $state(false);
  const kept = $derived(items.filter(i => i.keep && i.text.trim()));

  async function ask() {
    const before = phase;
    phase = 'thinking';
    const s = await store.askHelper('review', { changeId });
    if (!s) { phase = before === 'thinking' ? 'ask' : before; return; }
    items = s.notes.map(n => ({ ...n, keep: true }));
    summary = s.summary;
    source = s.source;
    phase = 'edit';
  }

  async function add(e: SubmitEvent) {
    e.preventDefault();
    if (!kept.length || busy) return;
    busy = true;
    let added = 0;
    for (const n of kept) {
      const ok = await store.do({ type: 'comment', changeId, body: n.text.trim(), paragraph: n.paragraph, assist: 'reviewer' });
      if (!ok) break;
      added++;
    }
    busy = false;
    if (added) {
      ui.toast('success', t('helper.review.added', { n: fmtNum(added) }));
      done();
    }
  }
</script>

{#if phase === 'ask'}
  <div class="form">
    <p class="note sends">{store.live ? t('helper.review.sends') : t('helper.sendsDemo')}</p>
    <div class="form-actions">
      <button type="button" class="btn" onclick={done}>{t('common.cancel')}</button>
      <button type="button" class="btn btn-primary" onclick={ask}><Sparkles size={15} />{t('helper.review.go')}</button>
    </div>
  </div>
{:else if phase === 'thinking'}
  <p class="thinking" role="status"><span class="spin" aria-hidden="true"></span>{t('helper.review.thinking')}</p>
{:else}
  <form class="form" onsubmit={add}>
    <div class="source">
      <p class="label-line"><Sparkles size={14} aria-hidden="true" />{source === 'sample' ? t('helper.sampleLabel') : t('helper.aiLabel')}</p>
      {#if summary}<p class="pnote" dir="auto">{summary}</p>{/if}
    </div>
    {#if items.length}
      <ol class="items">
        {#each items as item, i (i)}
          <li class="item" class:off={!item.keep}>
            <div class="item-head">
              <span class="where">{item.paragraph === undefined ? t('helper.review.whole') : t('helper.review.para', { n: fmtNum(item.paragraph + 1) })} · {t(`helper.kind.${item.kind}`)}</span>
              <label class="keep"><input type="checkbox" bind:checked={item.keep} />{t('helper.keep')}</label>
            </div>
            <textarea class="input" rows="2" bind:value={item.text} disabled={!item.keep} maxlength={HELPER_MAX.text * 2} dir="auto" aria-label={t('helper.review.note', { n: fmtNum(i + 1) })}></textarea>
          </li>
        {/each}
      </ol>
    {:else}
      <p class="muted">{t('helper.review.empty')}</p>
    {/if}
    <div class="form-actions">
      <button type="button" class="btn btn-ghost again" onclick={ask}><RotateCcw size={15} />{t('helper.again')}</button>
      <button type="button" class="btn" onclick={done}>{t('common.cancel')}</button>
      <button type="submit" class="btn btn-primary" disabled={!kept.length || busy}><Send size={15} class="flip-rtl" />{t('helper.review.add', { n: fmtNum(kept.length) })}</button>
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
  .item { display: flex; flex-direction: column; gap: 8px; padding: 10px var(--s4) var(--s4); border: 1px solid var(--rule); border-radius: var(--r-md); background: var(--surface); }
  .item.off { background: var(--surface-2); }
  .item.off textarea { opacity: 0.6; }
  .item-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .where { font-size: var(--fs-sm); font-weight: 600; color: var(--ink-2); }
  .keep { display: inline-flex; align-items: center; gap: 8px; min-height: 28px; font-size: var(--fs-sm); font-weight: 500; cursor: pointer; }
  .keep input { width: 16px; height: 16px; accent-color: var(--accent); }
  .again { margin-inline-end: auto; }
</style>

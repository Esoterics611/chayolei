<script lang="ts">
  // Two versions of a document side by side in one column: paragraphs added,
  // removed and changed (word by word), numbered by their place in the new
  // version so comments can anchor to them.
  import type { Snippet } from 'svelte';
  import { diffParagraphs, diffStats, type ParaDiff } from '$lib/team/diff';
  import { t, fmtNum } from '$lib/team/i18n';

  interface Props {
    from?: string[];
    to: string[];
    /** Rendered under each paragraph of the new version (comments, composer). */
    annotate?: Snippet<[number]>;
    /** Hide unchanged paragraphs behind a count. */
    collapse?: boolean;
    summary?: boolean;
  }
  let { from = [], to, annotate, collapse = false, summary = true }: Props = $props();

  const diff = $derived(diffParagraphs(from, to));
  const stats = $derived(diffStats(diff));
  let expanded = $state(false);

  type Row = ParaDiff | { kind: 'fold'; count: number };
  const rows = $derived.by((): Row[] => {
    if (!collapse || expanded) return diff;
    const out: Row[] = [];
    let run = 0;
    for (const p of diff) {
      if (p.kind === 'same') { run++; continue; }
      if (run) { out.push({ kind: 'fold', count: run }); run = 0; }
      out.push(p);
    }
    if (run) out.push({ kind: 'fold', count: run });
    return out;
  });
</script>

{#if summary}
  <p class="summary">
    <span class="key changed"></span><span class="key added"></span><span class="key removed"></span>
    {t('review.diffSummary', { changed: fmtNum(stats.changed), added: fmtNum(stats.added), removed: fmtNum(stats.removed) })}
  </p>
{/if}

<div class="doc">
  {#each rows as p, i (i)}
    {#if p.kind === 'fold'}
      <button type="button" class="fold" onclick={() => (expanded = true)}>⋯ {p.count} ¶</button>
    {:else}
      <div class="para {p.kind}">
        <span class="gutter" aria-hidden="true">{p.kind === 'removed' ? '−' : `¶${p.toIndex + 1}`}</span>
        <div class="text">
          {#if p.kind === 'changed'}
            <p dir="auto">{#each p.ops as op, j (j)}{#if op.op === 'eq'}{op.text}{:else if op.op === 'ins'}<ins>{op.text}</ins>{:else}<del>{op.text}</del>{/if}{/each}</p>
          {:else if p.kind === 'removed'}
            <p dir="auto"><del>{p.text}</del></p>
          {:else}
            <p dir="auto">{p.text}</p>
          {/if}
          {#if annotate && p.kind !== 'removed'}{@render annotate(p.toIndex)}{/if}
        </div>
      </div>
    {/if}
  {/each}
</div>

<style>
  .summary {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-block-end: var(--s3);
    font-size: var(--fs-sm);
    color: var(--ink-3);
  }
  .key { width: 10px; height: 10px; border-radius: 2px; }
  .key:last-of-type { margin-inline-end: 6px; }
  .key.changed { background: var(--st-review); }
  .key.added { background: var(--st-accepted); }
  .key.removed { background: var(--st-stalled); }
  .doc {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-family: var(--font-doc);
    font-size: 17px;
    line-height: 1.7;
  }
  .para {
    position: relative;
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr);
    gap: 8px;
    padding: 8px 12px 8px 0;
    border-radius: var(--r-sm);
    border-inline-start: 3px solid transparent;
  }
  :global([dir='rtl']) .para { padding: 8px 0 8px 12px; }
  .gutter {
    padding-inline-start: 6px;
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 29px;
    color: var(--ink-3);
    user-select: none;
  }
  .text { max-width: 66ch; min-width: 0; }
  .text p { text-wrap: pretty; }
  .same .text p { color: var(--ink-2); }
  .added { background: var(--st-accepted-bg); border-inline-start-color: var(--st-accepted); }
  .removed { background: var(--st-stalled-bg); border-inline-start-color: var(--st-stalled); }
  .changed { background: var(--surface-2); border-inline-start-color: var(--st-review); }
  ins {
    text-decoration: none;
    background: color-mix(in srgb, var(--st-accepted) 22%, transparent);
    border-radius: 3px;
    padding-inline: 1px;
  }
  del {
    color: var(--st-stalled);
    text-decoration-thickness: 1px;
    background: color-mix(in srgb, var(--st-stalled) 12%, transparent);
    border-radius: 3px;
    padding-inline: 1px;
  }
  .removed del { background: none; }
  .fold {
    align-self: flex-start;
    margin-inline-start: 48px;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--surface-2);
    color: var(--ink-3);
    font-family: var(--font-ui);
    font-size: var(--fs-xs);
  }
  @media (max-width: 639px) {
    .doc { font-size: 16px; }
    .para { grid-template-columns: 30px minmax(0, 1fr); gap: 4px; }
  }
</style>

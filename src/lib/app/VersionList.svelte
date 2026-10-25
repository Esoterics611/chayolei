<script lang="ts">
  // A deliverable's versions as a commit line: the private draft on top,
  // then each saved version with its note; accepted and in-review marked.
  import type { Deliverable, Team, Version } from '$lib/team/types';
  import * as E from '$lib/team/engine';
  import { lt, t, fmtRelative } from '$lib/team/i18n';
  import { firstName } from './format';
  import Lock from '@lucide/svelte/icons/lock';

  interface Props { team: Team; d: Deliverable; me: string; now: string; selected?: string; onselect: (v: Version) => void }
  let { team, d, me, now, selected, onselect }: Props = $props();

  const versions = $derived([...E.versionsOf(d)].reverse());
  const draft = $derived(d.ownerId === me ? E.draftOf(d) : undefined);
  const inReview = $derived(E.activeWorkChange(team, d.id)?.toVersionId);
</script>

<ol class="vl">
  {#if draft}
    <li>
      <button type="button" class="v draft" aria-pressed={selected === draft.id} onclick={() => onselect(draft)}>
        <span class="dot"></span>
        <span class="body">
          <span class="top"><span class="n">{t('d.draft')}</span><Lock size={12} /></span>
          <span class="meta">{fmtRelative(draft.at, now)}</span>
        </span>
      </button>
    </li>
  {/if}
  {#each versions as v (v.id)}
    <li>
      <button type="button" class="v" aria-pressed={selected === v.id} onclick={() => onselect(v)}>
        <span class="dot" class:acc={d.acceptedVersionId === v.id}></span>
        <span class="body">
          <span class="top">
            <span class="n">v{v.n}</span>
            {#if d.acceptedVersionId === v.id}<span class="tag acc">{t('d.accepted')}</span>{/if}
            {#if inReview === v.id && d.stage === 'in_review'}<span class="tag rev">{t('d.underReview')}</span>{/if}
          </span>
          <span class="vnote" dir="auto">{lt(v.note) || '—'}</span>
          <span class="meta">{firstName(team, v.authorId)} · {fmtRelative(v.at, now)}</span>
        </span>
      </button>
    </li>
  {/each}
</ol>

<style>
  .vl { position: relative; display: flex; flex-direction: column; }
  .vl::before { content: ''; position: absolute; inset-block: 18px; inset-inline-start: 15px; width: 2px; background: var(--rule); }
  .v { position: relative; display: flex; gap: 12px; width: 100%; padding: 8px 10px 8px 8px; border-radius: var(--r-sm); text-align: start; }
  .v:hover { background: var(--surface-2); }
  .v[aria-pressed='true'] { background: var(--accent-weak); }
  .dot { position: relative; z-index: 1; flex: none; width: 16px; height: 16px; margin-block-start: 2px; border-radius: 999px; background: var(--surface-raised); border: 2.5px solid var(--ink-3); }
  .dot.acc { border-color: var(--st-accepted); background: var(--st-accepted); box-shadow: inset 0 0 0 2px var(--surface-raised); }
  .draft .dot { border-style: dashed; border-color: var(--warning); }
  .body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .top { display: flex; align-items: center; gap: 6px; color: var(--ink-3); }
  .n { font-family: var(--font-mono); font-weight: 500; color: var(--ink); font-size: var(--fs-sm); }
  .vnote { font-size: var(--fs-sm); color: var(--ink); line-height: 1.4; }
  .meta { font-size: var(--fs-xs); color: var(--ink-3); }
  .tag { font-size: 10.5px; font-weight: 600; padding: 1px 6px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.03em; }
  .tag.acc { color: var(--st-accepted); background: var(--st-accepted-bg); }
  .tag.rev { color: var(--st-review); background: var(--st-review-bg); }
</style>

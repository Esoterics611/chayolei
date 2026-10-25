<script lang="ts">
  // The one interaction for every change (work, rules, money): what changes,
  // who proposed it, who decides and by when, what happens if accepted, and
  // its status. Learn it once, use it everywhere (UX_REDESIGN.md §2).
  import type { Snippet } from 'svelte';
  import type { ChangeStatus } from '$lib/team/types';
  import { t } from '$lib/team/i18n';
  import StatusChip from './StatusChip.svelte';
  import PenLine from '@lucide/svelte/icons/pen-line';
  import Scale from '@lucide/svelte/icons/scale';
  import Coins from '@lucide/svelte/icons/hand-coins';
  import Gavel from '@lucide/svelte/icons/gavel';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import Quote from '@lucide/svelte/icons/quote';

  interface Props {
    kind: 'work' | 'rule' | 'money';
    title: string;
    href?: string;
    status: ChangeStatus;
    statusLabel?: string;
    meta?: string;
    children?: Snippet;
    why?: string;
    decider?: string;
    consequencesTitle?: string;
    consequences?: string[];
    warnings?: string[];
    aside?: Snippet;
    actions?: Snippet;
    compact?: boolean;
    headingLevel?: 2 | 3;
  }
  let {
    kind, title, href, status, statusLabel, meta, children, why, decider,
    consequencesTitle, consequences = [], warnings = [], aside, actions, compact = false, headingLevel = 2,
  }: Props = $props();

  const ICON = { work: PenLine, rule: Scale, money: Coins };
  const KindIcon = $derived(ICON[kind]);
</script>

<article class="card" class:compact data-kind={kind}>
  <div class="top">
    <span class="kind"><KindIcon size={13} strokeWidth={2.25} />{t(`change.kind.${kind}`)}</span>
    <StatusChip {status} label={statusLabel} />
    {#if meta}<span class="meta">{meta}</span>{/if}
  </div>

  <svelte:element this={headingLevel === 2 ? 'h2' : 'h3'} class="title">
    {#if href}<a {href}>{title}</a>{:else}{title}{/if}
  </svelte:element>

  {#if children}<div class="body">{@render children()}</div>{/if}

  {#if why}
    <blockquote class="why"><Quote size={14} /><span>{why}</span></blockquote>
  {/if}

  {#if aside}<div class="aside">{@render aside()}</div>{/if}

  {#if decider}<p class="decider"><Gavel size={14} /><span>{decider}</span></p>{/if}

  {#if consequences.length}
    <div class="cons">
      <p class="cons-title">{consequencesTitle ?? t('change.consequences')}</p>
      <ul>
        {#each consequences as line, i (i)}<li><ArrowRight size={13} class="flip-rtl" /><span>{line}</span></li>{/each}
      </ul>
    </div>
  {/if}

  {#if warnings.length}
    <ul class="warnings" role="note">
      {#each warnings as w, i (i)}<li><TriangleAlert size={14} /><span>{w}</span></li>{/each}
    </ul>
  {/if}

  {#if actions}<div class="actions">{@render actions()}</div>{/if}
</article>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: var(--s4);
    padding: var(--s5);
    border: 1px solid var(--rule);
    border-radius: var(--r-md);
    background: var(--surface-raised);
  }
  .compact { gap: var(--s3); padding: var(--s4); }
  .top { display: flex; align-items: center; gap: var(--s2); flex-wrap: wrap; }
  .kind {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: var(--fs-xs);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .meta { margin-inline-start: auto; font-size: var(--fs-sm); color: var(--ink-3); }
  .title { font-size: var(--fs-xl); font-weight: 600; line-height: 1.3; letter-spacing: -0.01em; text-wrap: balance; }
  .compact .title { font-size: var(--fs-lg); }
  .title a:hover { text-decoration: underline; text-underline-offset: 3px; }
  .why {
    display: flex;
    gap: 8px;
    padding: 10px 12px;
    border-inline-start: 3px solid var(--rule-strong);
    background: var(--surface);
    border-radius: 0 var(--r-sm) var(--r-sm) 0;
    color: var(--ink-2);
  }
  :global([dir='rtl']) .why { border-radius: var(--r-sm) 0 0 var(--r-sm); }
  .why :global(svg) { flex: none; margin-block-start: 3px; color: var(--ink-3); }
  .decider { display: flex; gap: 8px; align-items: flex-start; font-size: var(--fs-sm); color: var(--ink-2); }
  .decider :global(svg) { flex: none; margin-block-start: 2px; color: var(--ink-3); }
  .cons {
    padding: 12px 14px;
    border-radius: var(--r-sm);
    background: var(--accent-weak);
    color: var(--ink);
  }
  .cons-title { font-size: var(--fs-xs); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--accent-text); margin-block-end: 6px; }
  .cons ul { display: flex; flex-direction: column; gap: 5px; }
  .cons li { display: flex; gap: 8px; align-items: flex-start; font-size: var(--fs-sm); line-height: 1.45; }
  .cons :global(svg) { flex: none; margin-block-start: 3px; color: var(--accent-text); }
  .warnings { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: var(--r-sm); background: var(--st-stalled-bg); color: var(--st-stalled); font-size: var(--fs-sm); }
  .warnings li { display: flex; gap: 8px; align-items: flex-start; }
  .warnings :global(svg) { flex: none; margin-block-start: 2px; }
  .actions { display: flex; flex-wrap: wrap; gap: var(--s2); justify-content: flex-end; padding-block-start: var(--s1); }
  @media (max-width: 639px) {
    .card { padding: var(--s4); }
    .meta { margin-inline-start: 0; flex-basis: 100%; }
    .actions { justify-content: stretch; }
    .actions :global(.btn) { flex: 1 1 auto; }
  }
</style>

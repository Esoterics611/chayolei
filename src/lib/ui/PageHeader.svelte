<script lang="ts">
  // The top of every screen: an optional trail back, the title, a line of
  // context, and the screen's actions at the inline end.
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    subtitle?: string;
    eyebrow?: Snippet;
    actions?: Snippet;
    meta?: Snippet;
  }
  let { title, subtitle, eyebrow, actions, meta }: Props = $props();
</script>

<header class="ph">
  {#if eyebrow}<div class="eyebrow">{@render eyebrow()}</div>{/if}
  <div class="row">
    <div class="titles">
      <h1>{title}</h1>
      {#if subtitle}<p class="sub">{subtitle}</p>{/if}
    </div>
    {#if actions}<div class="actions">{@render actions()}</div>{/if}
  </div>
  {#if meta}<div class="meta">{@render meta()}</div>{/if}
</header>

<style>
  .ph { display: flex; flex-direction: column; gap: var(--s2); margin-block-end: var(--s6); }
  .eyebrow { font-size: var(--fs-sm); color: var(--ink-3); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .row { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--s4); flex-wrap: wrap; }
  .titles { min-width: 0; flex: 1 1 320px; }
  h1 {
    font-size: var(--fs-2xl);
    font-weight: 600;
    letter-spacing: -0.015em;
    line-height: 1.25;
    text-wrap: balance;
  }
  .sub { margin-block-start: 4px; color: var(--ink-2); max-width: 70ch; text-wrap: pretty; }
  .actions { display: flex; gap: var(--s2); flex-wrap: wrap; align-items: center; }
  .meta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--s2) var(--s4); color: var(--ink-2); font-size: var(--fs-sm); }
  @media (max-width: 639px) {
    h1 { font-size: var(--fs-xl); }
    .ph { margin-block-end: var(--s5); }
  }
</style>

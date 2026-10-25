<script lang="ts">
  // Says what belongs here and how to add the first one (teach in place).
  import type { Component, Snippet } from 'svelte';

  interface Props {
    icon: Component<{ size?: number; strokeWidth?: number }>;
    title: string;
    hint?: string;
    children?: Snippet;
    compact?: boolean;
  }
  let { icon: Icon, title, hint, children, compact = false }: Props = $props();
</script>

<div class="empty" class:compact>
  <span class="icon"><Icon size={compact ? 18 : 22} strokeWidth={1.75} /></span>
  <p class="title">{title}</p>
  {#if hint}<p class="hint">{hint}</p>{/if}
  {#if children}<div class="actions">{@render children()}</div>{/if}
</div>

<style>
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 6px;
    padding: var(--s10) var(--s6);
    border: 1px dashed var(--rule-strong);
    border-radius: var(--r-md);
    color: var(--ink-2);
  }
  .compact { padding: var(--s6) var(--s4); }
  .icon {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 999px;
    background: var(--surface-2);
    color: var(--ink-3);
    margin-block-end: 4px;
  }
  .compact .icon { width: 32px; height: 32px; }
  .title { font-weight: 600; color: var(--ink); }
  .hint { max-width: 52ch; font-size: var(--fs-sm); color: var(--ink-3); text-wrap: pretty; }
  .actions { margin-block-start: var(--s3); display: flex; gap: var(--s2); flex-wrap: wrap; justify-content: center; }
</style>

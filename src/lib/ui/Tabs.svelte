<script lang="ts" module>
  export interface TabItem {
    href: string;
    label: string;
    count?: number | string;
    active: boolean;
  }
</script>

<script lang="ts">
  // Section tabs as links, so each tab has its own address.
  let { items, label }: { items: TabItem[]; label: string } = $props();
</script>

<nav class="tabs" aria-label={label}>
  {#each items as it (it.href)}
    <a href={it.href} aria-current={it.active ? 'page' : undefined}>
      {it.label}
      {#if it.count !== undefined && it.count !== 0}<span class="count">{it.count}</span>{/if}
    </a>
  {/each}
</nav>

<style>
  .tabs {
    display: flex;
    gap: 2px;
    overflow-x: auto;
    scrollbar-width: none;
    border-block-end: 1px solid var(--rule);
    margin-block-end: var(--s6);
  }
  .tabs::-webkit-scrollbar { display: none; }
  a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 12px 11px;
    color: var(--ink-2);
    font-weight: 500;
    white-space: nowrap;
    border-block-end: 2px solid transparent;
    margin-block-end: -1px;
    border-radius: 0;
  }
  a:hover { color: var(--ink); }
  a[aria-current='page'] { color: var(--ink); border-block-end-color: var(--accent); }
  .count {
    min-width: 18px;
    height: 18px;
    padding-inline: 5px;
    border-radius: 999px;
    background: var(--surface-3);
    color: var(--ink-2);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    display: inline-grid;
    place-items: center;
  }
</style>

<script lang="ts">
  // A disclosure panel anchored to its trigger: closes on outside click and Esc.
  import type { Snippet } from 'svelte';

  interface Props {
    open?: boolean;
    align?: 'start' | 'end';
    placement?: 'below' | 'above';
    width?: string;
    trigger: Snippet<[{ open: boolean; toggle: () => void; id: string }]>;
    children: Snippet<[{ close: () => void }]>;
  }
  let { open = $bindable(false), align = 'start', placement = 'below', width = '280px', trigger, children }: Props = $props();

  let root: HTMLElement | undefined = $state();
  const id = `pop-${Math.random().toString(36).slice(2, 8)}`;
  const close = () => (open = false);

  function outside(e: MouseEvent) {
    if (open && root && !root.contains(e.target as Node)) open = false;
  }
  function key(e: KeyboardEvent) {
    if (open && e.key === 'Escape') {
      open = false;
      root?.querySelector<HTMLElement>('[aria-controls]')?.focus();
    }
  }
</script>

<svelte:window onclick={outside} onkeydown={key} />

<div class="pop" bind:this={root}>
  {@render trigger({ open, toggle: () => (open = !open), id })}
  {#if open}
    <div class="panel {align} {placement}" {id} style:width>
      {@render children({ close })}
    </div>
  {/if}
</div>

<style>
  .pop { position: relative; }
  .panel {
    position: absolute;
    z-index: 40;
    max-width: calc(100vw - 24px);
    padding: 6px;
    border: 1px solid var(--rule);
    border-radius: var(--r-md);
    background: var(--surface-raised);
    box-shadow: var(--shadow-pop);
    animation: pop var(--fast) var(--ease);
  }
  .below { inset-block-start: calc(100% + 6px); }
  .above { inset-block-end: calc(100% + 6px); }
  .start { inset-inline-start: 0; }
  .end { inset-inline-end: 0; }
  @keyframes pop { from { opacity: 0; transform: translateY(-4px); } }
</style>

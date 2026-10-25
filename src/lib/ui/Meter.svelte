<script lang="ts">
  // A horizontal bar of parts of a whole: budget paid / committed / left,
  // or TMIM issued against the month's cap. `label` is read by screen readers.
  interface Segment {
    value: number;
    tone: 'solid' | 'soft' | 'warn' | 'hatch';
  }
  interface Props {
    total: number;
    segments: Segment[];
    label: string;
    height?: number;
  }
  let { total, segments, label, height = 8 }: Props = $props();

  const parts = $derived.by(() => {
    const sum = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
    const whole = Math.max(total, sum, 1);
    return segments.map(s => ({ ...s, pct: (Math.max(0, s.value) / whole) * 100 }));
  });
  const over = $derived(segments.reduce((s, x) => s + Math.max(0, x.value), 0) > total && total > 0);
</script>

<div class="meter" class:over style:height="{height}px" role="img" aria-label={label}>
  {#each parts as p, i (i)}
    {#if p.pct > 0}<span class="seg {p.tone}" style:width="{p.pct}%"></span>{/if}
  {/each}
</div>

<style>
  .meter {
    display: flex;
    width: 100%;
    overflow: hidden;
    border-radius: 999px;
    background: var(--surface-3);
  }
  .seg { display: block; height: 100%; }
  .seg + .seg { box-shadow: inset 2px 0 0 var(--surface-raised); }
  :global([dir='rtl']) .seg + .seg { box-shadow: inset -2px 0 0 var(--surface-raised); }
  .solid { background: var(--accent); }
  .soft { background: color-mix(in srgb, var(--accent) 38%, var(--surface-3)); }
  .hatch {
    background: repeating-linear-gradient(135deg, var(--warning) 0 4px, color-mix(in srgb, var(--warning) 55%, transparent) 4px 8px);
  }
  .warn { background: var(--danger); }
  .over { outline: 1.5px solid var(--danger); outline-offset: 1px; }
</style>

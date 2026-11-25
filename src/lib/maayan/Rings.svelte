<script lang="ts">
  // Water rings: the wellspring's mark behind a page's opening. Decorative.
  let { class: cls = 'm-rings' }: { class?: string } = $props();
</script>

<svg class={cls} viewBox="0 0 760 520" fill="none" stroke="currentColor" aria-hidden="true" focusable="false">
  {#each [60, 120, 185, 255, 330, 410] as r, i (r)}
    <ellipse cx="380" cy="260" rx={r * 1.25} ry={r * 0.62} stroke-width={2.2 - i * 0.28} />
  {/each}
  <circle cx="380" cy="260" r="7" fill="currentColor" stroke="none" />
</svg>

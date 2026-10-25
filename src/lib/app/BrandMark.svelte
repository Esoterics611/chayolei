<script lang="ts">
  // The mark: three bars on one base — three parallel systems on one ledger.
  let { size = 26 }: { size?: number } = $props();
</script>

<svg class="mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
  <rect x="0.5" y="0.5" width="31" height="31" rx="8" class="bg" />
  <rect x="8" y="8" width="4" height="12" rx="1.5" class="bar" />
  <rect x="14" y="6" width="4" height="14" rx="1.5" class="bar" />
  <rect x="20" y="10" width="4" height="10" rx="1.5" class="bar" />
  <rect x="7" y="22.5" width="18" height="3" rx="1.5" class="base" />
</svg>

<style>
  .mark { flex: none; }
  .bg { fill: var(--accent); }
  .bar { fill: var(--accent-ink); opacity: 0.92; }
  .base { fill: var(--accent-ink); opacity: 0.6; }
</style>

<script lang="ts">
  // TMIM as a token: a coin carrying the three-bar ledger mark.
  let { size = 16 }: { size?: number } = $props();
</script>

<svg class="token" width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
  <circle cx="10" cy="10" r="9" class="rim" />
  <circle cx="10" cy="10" r="6.6" class="face" />
  <rect x="6.6" y="7.2" width="1.6" height="4.6" rx="0.6" class="bar" />
  <rect x="9.2" y="6.4" width="1.6" height="5.4" rx="0.6" class="bar" />
  <rect x="11.8" y="8" width="1.6" height="3.8" rx="0.6" class="bar" />
  <rect x="6.2" y="12.6" width="7.6" height="1.2" rx="0.6" class="bar" />
</svg>

<style>
  .token { flex: none; }
  .rim { fill: var(--accent); }
  .face { fill: none; stroke: var(--accent-ink); stroke-opacity: 0.45; stroke-width: 0.8; }
  .bar { fill: var(--accent-ink); }
</style>

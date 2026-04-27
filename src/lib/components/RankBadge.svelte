<script lang="ts">
  import { RANK_META, type Rank } from '$lib/types';

  interface Props {
    rank: Rank;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }

  let { rank, showLabel = false, size = 'sm' }: Props = $props();
  let meta = $derived(RANK_META[rank]);

  // Map rank to tier CSS class and color vars
  const tierBg: Record<string, string> = {
    enlisted: 'var(--color-tier-enlisted-light)',
    nco:      'var(--color-tier-nco-light)',
    officer:  'var(--color-tier-officer-light)',
  };
  const tierColor: Record<string, string> = {
    enlisted: 'var(--color-tier-enlisted)',
    nco:      'var(--color-tier-nco)',
    officer:  'var(--color-tier-officer)',
  };
  const tierBorder: Record<string, string> = {
    enlisted: 'rgba(93, 109, 63, 0.2)',
    nco:      'rgba(27, 79, 114, 0.2)',
    officer:  'rgba(125, 108, 63, 0.2)',
  };

  const sizeClasses = {
    sm: 'text-[11px] gap-1',
    md: 'text-xs gap-1.5',
    lg: 'text-sm gap-2',
  };
  const paddingClasses = {
    sm: 'px-2 py-0.5',
    md: 'px-2.5 py-1',
    lg: 'px-3 py-1.5',
  };
</script>

<div class="flex items-center gap-1.5">
  <span
    class="inline-flex items-center font-semibold {sizeClasses[size]} {paddingClasses[size]}"
    style="
      border-radius: var(--radius-sm);
      background-color: {tierBg[meta.tier]};
      color: {tierColor[meta.tier]};
      border: 1px solid {tierBorder[meta.tier]};
    "
  >
    {meta.shem}
  </span>
  {#if showLabel && meta.tier}
    <span class="text-xs" style="color: var(--color-text-tertiary);">{meta.transliteration}</span>
  {/if}
</div>

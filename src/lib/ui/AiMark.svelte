<script lang="ts">
  // Marks work added from an AI helper's suggestion (UX_REDESIGN.md §8):
  // an icon and words, never colour alone. Compact shows the icon, with the
  // words for screen readers and on hover.
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import { t } from '$lib/team/i18n';

  let { compact = false }: { compact?: boolean } = $props();
</script>

<span class="ai" class:compact title={t('ai.assistedHint')}>
  <Sparkles size={compact ? 13 : 12} aria-hidden="true" />
  {#if compact}<span class="visually-hidden">{t('ai.assisted')}</span>{:else}{t('ai.assisted')}{/if}
</span>

<style>
  .ai {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 7px;
    border: 1px dashed var(--rule-strong);
    border-radius: 999px;
    color: var(--ink-2);
    font-size: var(--fs-xs);
    font-weight: 500;
    line-height: 1.5;
    white-space: nowrap;
  }
  .compact { padding: 0; border: 0; color: var(--ink-3); }
</style>

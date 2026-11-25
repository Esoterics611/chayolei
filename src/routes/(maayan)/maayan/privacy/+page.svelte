<script lang="ts">
  // Privacy in the wellsprings, in plain words: what is kept, who sees it, how to leave.
  import { t } from '$lib/team/i18n';
  import { maayan } from '$lib/maayan/store.svelte';
</script>

<svelte:head><title>{t('maayan.privacy.title')}</title></svelte:head>

<div class="m-wrap" style="max-width: 42rem; padding-block: 40px">
  <h1 class="m-h1" style="font-size: 2rem">{t('maayan.privacy.title')}</h1>
  <div class="body">
    {#if !maayan.live}<p class="note">{t('maayan.privacy.demo')}</p>{/if}
    {#each ['p1', 'google', 'p2', 'p3', 'p4', 'p5', 'p6'] as k (k)}<p>{t(`maayan.privacy.${k}`)}</p>{/each}
  </div>
</div>

<style>
  .body { display: flex; flex-direction: column; gap: var(--s4); margin-block-start: var(--s5); line-height: 1.7; color: var(--ink-2); }
</style>

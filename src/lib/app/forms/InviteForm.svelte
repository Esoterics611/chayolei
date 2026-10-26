<script lang="ts">
  // A join link for the team. People who open it see the purpose and the
  // charter, then join with the charter's joiner role. Real in the live app
  // (expires, limited uses); illustrative in the demo.
  import { onMount } from 'svelte';
  import { store } from '$lib/team/store.svelte';
  import { ui } from '$lib/team/ui.svelte';
  import { TEMPLATES } from '$lib/team/templates';
  import { lt, t } from '$lib/team/i18n';
  import Copy from '@lucide/svelte/icons/copy';

  let { done }: { done: () => void } = $props();
  let link = $state<string | undefined>();
  let failed = $state(false);
  const joiner = $derived(
    TEMPLATES[store.team.templateId].joinerRoleIds
      .map(id => lt(store.team.charter.roles.find(r => r.id === id)?.name)).join(', '),
  );

  onMount(async () => {
    link = await store.inviteLink();
    failed = !link;
  });

  async function copy() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); ui.toast('info', t('start.copied')); } catch { /* clipboard blocked */ }
  }
</script>

<div class="form">
  <p>{t('invite.explain', { role: joiner })}</p>
  {#if link}
    <div class="link"><code>{link}</code><button type="button" class="btn btn-sm" onclick={copy}><Copy size={14} />{t('start.copy')}</button></div>
    <p class="note">{t(store.live ? 'invite.terms' : 'invite.demo')}</p>
  {:else if !failed}
    <p class="note" aria-live="polite">{t('invite.making')}</p>
  {/if}
  <div class="form-actions">
    <button type="button" class="btn btn-primary" onclick={done}>{t('common.done')}</button>
  </div>
</div>

<style>
  .link { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: var(--r-sm); background: var(--surface-2); }
  .link code { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono); font-size: var(--fs-sm); direction: ltr; }
</style>

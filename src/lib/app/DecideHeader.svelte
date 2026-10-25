<script lang="ts">
  // Decide (corporate organization): open proposals, the decision log (its
  // minutes), the charter (its bylaws) and the members.
  import { page } from '$app/state';
  import { store } from '$lib/team/store.svelte';
  import { ui } from '$lib/team/ui.svelte';
  import { can } from '$lib/team/rules';
  import { t } from '$lib/team/i18n';
  import { href, currentPath } from '$lib/team/nav';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import Tabs from '$lib/ui/Tabs.svelte';
  import Scale from '@lucide/svelte/icons/scale';
  import Coins from '@lucide/svelte/icons/hand-coins';

  let { subtitle }: { subtitle?: string } = $props();
  const p = $derived(currentPath(page.url));
  const open = $derived(store.team.changes.filter(c => c.kind !== 'work' && c.status === 'open').length);
  const canPropose = $derived(can(store.team, store.me, 'propose'));
</script>

<PageHeader title={t('decide.title')} {subtitle}>
  {#snippet actions()}
    {#if canPropose}
      <button type="button" class="btn" onclick={() => ui.openDialog({ kind: 'requestMoney' })}><Coins size={15} />{t('decide.requestMoney')}</button>
      <button type="button" class="btn btn-primary" onclick={() => ui.openDialog({ kind: 'proposeRule' })}><Scale size={15} />{t('decide.proposeRule')}</button>
    {/if}
  {/snippet}
</PageHeader>
<Tabs
  label={t('decide.title')}
  items={[
    { href: href('/decide'), label: t('decide.tab.open'), count: open, active: p === '/decide' },
    { href: href('/decide/log'), label: t('decide.tab.log'), active: p === '/decide/log' },
    { href: href('/decide/charter'), label: t('decide.tab.charter'), active: p === '/decide/charter' },
    { href: href('/decide/members'), label: t('decide.tab.members'), active: p === '/decide/members' },
  ]}
/>

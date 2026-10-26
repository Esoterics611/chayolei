<script lang="ts">
  // How an entry is recorded: settled on-chain (a link of chain) or signed and
  // anchored. `pending` while its transaction or anchor isn't in yet.
  import type { Tier } from '$lib/team/types';
  import { t } from '$lib/team/i18n';
  import Link2 from '@lucide/svelte/icons/link-2';
  import Signature from '@lucide/svelte/icons/signature';

  let { tier, label = false, pending = false }: { tier: Tier; label?: boolean; pending?: boolean } = $props();
  const text = $derived(t(tier === 'settled'
    ? pending ? 'ledger.settledPending' : 'ledger.settled'
    : pending ? 'ledger.signedPending' : 'ledger.signed'));
</script>

<span class="tier" data-tier={tier} class:pending title={text}>
  {#if tier === 'settled'}<Link2 size={13} strokeWidth={2.25} />{:else}<Signature size={13} strokeWidth={2} />{/if}
  {#if label}<span>{text}</span>{:else}<span class="visually-hidden">{text}</span>{/if}
</span>

<style>
  .tier {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: var(--fs-xs);
    color: var(--ink-3);
    white-space: nowrap;
  }
  [data-tier='settled'] { color: var(--accent-text); }
  .pending { color: var(--ink-3); font-style: italic; }
</style>

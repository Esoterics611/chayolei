<script lang="ts">
  // A member moves TMIM from their own wallet into the team account.
  import { store } from '$lib/team/store.svelte';
  import { ui } from '$lib/team/ui.svelte';
  import * as E from '$lib/team/engine';
  import { memberBalance } from '$lib/team/ledger';
  import { t, fmtTmim } from '$lib/team/i18n';
  import Amount from '$lib/ui/Amount.svelte';

  let { done }: { done: () => void } = $props();
  let amount = $state<number | ''>('');
  const balance = $derived(memberBalance(store.team, store.me));
  const valid = $derived(Number(amount) > 0 && Number(amount) <= balance);

  function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!valid) return;
    const value = Number(amount);
    ui.askToSign({
      title: t('treasury.contribute'),
      lines: [
        t('treasury.contributeLine', { amount: fmtTmim(value) }),
        t('decide.accountAfter', { amount: fmtTmim(store.team.treasury.teamAccount + value) }),
        t('treasury.contributeRule'),
      ],
      onConfirm: () => {
        const ok = store.run((tm, me, now) => { E.contribute(tm, me, value, now); return true; }, t('treasury.contributed'));
        if (!ok) return false;
        done();
      },
    });
  }
</script>

<form class="form" onsubmit={submit}>
  <div class="balance">
    <span class="label">{t('treasury.wallet')}</span>
    <Amount value={balance} size="lg" />
  </div>
  <label class="field">
    <span class="label">{t('treasury.contributeAmount')}</span>
    <input class="input num" type="number" min="1" step="1" max={balance} bind:value={amount} required />
  </label>
  <p class="note">{t('treasury.accountHint')}</p>
  <div class="form-actions">
    <button type="button" class="btn" onclick={done}>{t('common.cancel')}</button>
    <button type="submit" class="btn btn-primary" disabled={!valid}>{t('treasury.contribute')}</button>
  </div>
</form>

<style>
  .balance { display: flex; align-items: baseline; justify-content: space-between; padding: 12px 14px; border-radius: var(--r-sm); background: var(--surface-2); }
</style>

<script lang="ts">
  // My wallet: the member's TMIM balance from this team and its history.
  // TMIM only: no prices, swaps or off-ramps (CLAUDE.md, economic model).
  import { store } from '$lib/team/store.svelte';
  import { ui } from '$lib/team/ui.svelte';
  import { memberBalance } from '$lib/team/ledger';
  import { lt, t } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import Amount from '$lib/ui/Amount.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import LedgerList from '$lib/app/LedgerList.svelte';
  import { rolesOf } from '$lib/app/format';
  import Wallet from '@lucide/svelte/icons/wallet';
  import Copy from '@lucide/svelte/icons/copy';
  import Info from '@lucide/svelte/icons/info';
  import ArrowDownToLine from '@lucide/svelte/icons/arrow-down-to-line';

  const team = $derived(store.team);
  const me = $derived(store.meMember!);
  const mine = $derived(team.ledger.filter(e => (e.amounts ?? []).some(a => a.memberId === me.id)));
  const earned = $derived(mine.reduce((s, e) => s + (e.amounts ?? []).filter(a => a.memberId === me.id && a.amount > 0).reduce((x, a) => x + a.amount, 0), 0));
  const contributed = $derived(-mine.reduce((s, e) => s + (e.amounts ?? []).filter(a => a.memberId === me.id && a.amount < 0).reduce((x, a) => x + a.amount, 0), 0));

  async function copy() {
    try { await navigator.clipboard.writeText(me.wallet); ui.toast('info', t('start.copied')); } catch { /* clipboard blocked */ }
  }
</script>

<svelte:head><title>{t('wallet.title')} · {lt(team.name)}</title></svelte:head>

<PageHeader title={t('wallet.title')} subtitle={t('wallet.subtitle', { team: lt(team.name) })}>
  {#snippet actions()}
    <button type="button" class="btn" onclick={() => ui.openDialog({ kind: 'contribute' })}><ArrowDownToLine size={15} />{t('treasury.contribute')}</button>
  {/snippet}
</PageHeader>

<div class="card">
  <div class="who">
    <Avatar id={me.id} initials={me.initials} name={lt(me.name)} size="md" />
    <div><p class="name">{lt(me.name)}</p><p class="role">{rolesOf(team, me.id)}</p></div>
  </div>
  <div class="balance"><Amount value={memberBalance(team, me.id)} size="xl" /></div>
  <div class="addr">
    <span class="lab">{t('wallet.address')}</span>
    <code>{me.wallet}</code>
    <button type="button" class="btn btn-sm btn-ghost" onclick={copy} aria-label={t('start.copy')}><Copy size={14} /></button>
  </div>
  <div class="figs">
    <div><span class="lab">{t('wallet.earned')}</span><Amount value={earned} /></div>
    <div><span class="lab">{t('wallet.contributed')}</span><Amount value={contributed} /></div>
  </div>
</div>

<p class="only"><Info size={15} />{t('treasury.walletOnly')}</p>

<section>
  <h2 class="sec">{t('treasury.walletHistory')}</h2>
  {#if mine.length}
    <LedgerList {team} entries={mine} now={store.now} memberId={me.id} />
  {:else}
    <EmptyState icon={Wallet} title={t('treasury.walletEmpty')} hint={t('treasury.walletEmptyHint')} compact>
      <a class="btn btn-sm" href={href('/plan')}>{t('nav.plan')}</a>
    </EmptyState>
  {/if}
</section>

<style>
  .card {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--s5);
    max-width: 720px;
    padding: var(--s6);
    border-radius: var(--r-lg);
    color: #eef6f3;
    background:
      radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, var(--accent) 55%, #0b1f1b) 0%, transparent 60%),
      linear-gradient(135deg, #12322c, #0d2420 70%);
    box-shadow: var(--shadow-pop);
  }
  .who { display: flex; align-items: center; gap: 12px; }
  .name { font-weight: 600; }
  .role { font-size: var(--fs-sm); opacity: 0.75; }
  .balance { justify-self: end; align-self: center; }
  .balance :global(.u) { color: rgba(238, 246, 243, 0.7); }
  .addr { grid-column: 1 / -1; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .addr code { font-family: var(--font-mono); font-size: var(--fs-sm); word-break: break-all; opacity: 0.9; }
  .addr .btn { color: inherit; }
  .addr .btn:hover { background: rgba(255, 255, 255, 0.1); }
  .lab { font-size: var(--fs-xs); letter-spacing: 0.05em; text-transform: uppercase; opacity: 0.7; }
  .figs { grid-column: 1 / -1; display: flex; gap: var(--s8); padding-block-start: var(--s4); border-block-start: 1px solid rgba(255, 255, 255, 0.14); }
  .figs > div { display: flex; flex-direction: column; gap: 2px; }
  .figs :global(.u) { color: rgba(238, 246, 243, 0.7); }
  .only { display: flex; align-items: center; gap: 8px; margin-block: var(--s4) var(--s8); font-size: var(--fs-sm); color: var(--ink-3); }
  .sec { font-size: var(--fs-lg); font-weight: 600; margin-block-end: var(--s3); }
  @media (max-width: 639px) {
    .card { grid-template-columns: minmax(0, 1fr); padding: var(--s5); }
    .balance { justify-self: start; }
  }
</style>

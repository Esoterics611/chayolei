<script lang="ts">
  // The ledger: the team's complete record, filtered by system, grouped by
  // day; every entry a sentence with its tier and proof.
  import { page } from '$app/state';
  import { store } from '$lib/team/store.svelte';
  import { lt, t, fmtNum } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import Tabs from '$lib/ui/Tabs.svelte';
  import TierMark from '$lib/ui/TierMark.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import LedgerList from '$lib/app/LedgerList.svelte';
  import { LEDGER_FILTERS, inFilter, type LedgerFilter } from '$lib/app/describe';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import Anchor from '@lucide/svelte/icons/anchor';

  const team = $derived(store.team);
  const filter = $derived((page.params.filter ?? 'all') as LedgerFilter);
  const entries = $derived(team.ledger.filter(e => inFilter(team, e, filter)));
  const PAGE = 60;
  let shown = $state(PAGE);
  const visible = $derived([...entries].sort((a, b) => b.seq - a.seq).slice(0, shown));
  const settled = $derived(team.ledger.filter(e => e.tier === 'settled').length);
  const signed = $derived(team.ledger.filter(e => e.tier === 'signed').length);
  const batches = $derived(team.ledger.filter(e => e.kind === 'anchor').length);
</script>

<svelte:head><title>{t('ledger.title')} · {lt(team.name)}</title></svelte:head>

<PageHeader title={t('ledger.title')} subtitle={t('ledger.subtitle')}>
  {#snippet meta()}
    <span>{t('ledger.count', { n: fmtNum(team.ledger.length) })}</span>
    <span class="dotsep">·</span>
    <TierMark tier="settled" label /><span>{fmtNum(settled)}</span>
    <span class="dotsep">·</span>
    <TierMark tier="signed" label /><span>{fmtNum(signed)}</span>
    <span class="dotsep">·</span>
    <span class="anch"><Anchor size={13} />{t('ledger.batches', { n: fmtNum(batches) })}</span>
  {/snippet}
</PageHeader>

<Tabs
  label={t('ledger.title')}
  items={LEDGER_FILTERS.map(f => ({ href: href(f === 'all' ? '/ledger' : `/ledger/${f}`), label: t(`ledger.filter.${f}`), active: filter === f }))}
/>

<div class="layout">
  <div class="list">
    {#if entries.length}
      <LedgerList {team} entries={visible} now={store.now} />
      {#if entries.length > shown}
        <button type="button" class="btn more" onclick={() => (shown += PAGE)}>{t('ledger.more')} · {fmtNum(entries.length - shown)}</button>
      {/if}
    {:else}
      <EmptyState icon={BookOpen} title={t('ledger.empty')} />
    {/if}
  </div>
  <aside class="legend panel">
    <p class="lt">{t('ledger.legend')}</p>
    <ul>
      <li><span class="node settled"></span><span>{t('ledger.settled')}</span></li>
      <li><span class="node signed"></span><span>{t('ledger.signed')}</span></li>
      <li><span class="node anchor"><Anchor size={11} /></span><span>{t('entry.anchor', { batch: 'n' })}</span></li>
    </ul>
    <p class="demo">{t('ledger.demoProof')}</p>
  </aside>
</div>

<style>
  .more { margin-block-start: var(--s5); }
  .dotsep { color: var(--rule-strong); }
  .anch { display: inline-flex; align-items: center; gap: 5px; }
  .layout { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: var(--s8); align-items: start; }
  .list { min-width: 0; max-width: 820px; }
  .legend { position: sticky; inset-block-start: 76px; padding: var(--s4); display: flex; flex-direction: column; gap: 12px; font-size: var(--fs-sm); color: var(--ink-2); }
  .lt { text-wrap: pretty; }
  .legend ul { display: flex; flex-direction: column; gap: 8px; }
  .legend li { display: flex; align-items: center; gap: 10px; }
  .node { display: grid; place-items: center; width: 20px; height: 20px; flex: none; border: 1.5px solid var(--rule-strong); border-radius: 999px; background: var(--surface-raised); }
  .node.settled { border-radius: 6px; border-color: var(--accent); background: var(--accent-weak); }
  .node.anchor { border-radius: 999px; border-color: var(--accent); background: var(--accent); color: var(--accent-ink); }
  .demo { font-size: var(--fs-xs); color: var(--ink-3); font-style: italic; }
  @media (max-width: 1099px) {
    .layout { grid-template-columns: minmax(0, 1fr); }
    .legend { position: static; order: -1; }
  }
</style>

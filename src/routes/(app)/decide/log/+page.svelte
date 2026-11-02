<script lang="ts">
  // The decision log: the team's minutes. Every decision, by vote, by role or
  // by an approver, with its outcome and a link to the full record.
  import type { Change } from '$lib/team/types';
  import { store } from '$lib/team/store.svelte';
  import { lt, t, fmtDate, fmtMonth } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import StatusChip from '$lib/ui/StatusChip.svelte';
  import DecideHeader from '$lib/app/DecideHeader.svelte';
  import { changeSummary, deliverableTitle, firstName } from '$lib/app/format';
  import Gavel from '@lucide/svelte/icons/gavel';
  import Scale from '@lucide/svelte/icons/scale';
  import Coins from '@lucide/svelte/icons/hand-coins';
  import BadgeCheck from '@lucide/svelte/icons/badge-check';
  import UserCog from '@lucide/svelte/icons/user-cog';

  const team = $derived(store.team);
  const decided = $derived(
    team.changes
      .filter(c => c.decidedAt && (c.kind !== 'work' || c.status === 'accepted'))
      .sort((a, b) => (b.decidedAt ?? '').localeCompare(a.decidedAt ?? '')),
  );
  const months = $derived.by(() => {
    const m = new Map<string, Change[]>();
    for (const c of decided) {
      const k = c.decidedAt!.slice(0, 7);
      m.set(k, [...(m.get(k) ?? []), c]);
    }
    return [...m.entries()];
  });
  const ICON = { work: BadgeCheck, rule: Scale, money: Coins, role: UserCog };

  function outcome(c: Change): string {
    if (c.kind === 'work') return t('decide.outcome.work', { name: firstName(team, c.decidedBy) });
    if (c.kind === 'money' && c.decidedBy === 'role') {
      return c.status === 'accepted' ? t('decide.outcome.accepted', { name: firstName(team, c.approvedBy) }) : t('decide.outcome.declined', { name: firstName(team, c.approvedBy) });
    }
    const e = team.ledger.find(x => (x.kind === 'change_passed' || x.kind === 'change_failed') && x.refs.changeId === c.id);
    return c.status === 'passed' ? t('decide.outcome.passed', { pct: e?.data?.forPct ?? 0, turnout: e?.data?.turnout ?? 0 }) : t('decide.outcome.failed');
  }
  const by = (c: Change) => (c.kind === 'work' ? t('decide.byApprover') : c.kind === 'money' && c.decidedBy === 'role' ? t('decide.byRole') : t('decide.byVote'));
  const link = (c: Change) => (c.kind === 'work' ? href(`/d/${c.deliverableId}/review/${c.id}`) : href(`/decide/p/${c.id}`));
  const title = (c: Change) => (c.kind === 'work' ? deliverableTitle(team, c.deliverableId) : lt(c.title));
</script>

<svelte:head><title>{t('decide.tab.log')} · {lt(team.name)}</title></svelte:head>

<DecideHeader subtitle={t('decide.allDecisions')} />

{#if months.length}
  {#each months as [month, list] (month)}
    <h2 class="month">{fmtMonth(month)}</h2>
    <ol class="log">
      {#each list as c (c.id)}
        {@const Icon = ICON[c.kind]}
        <li>
          <span class="date">{fmtDate(c.decidedAt!)}</span>
          <span class="ic" data-kind={c.kind}><Icon size={15} /></span>
          <a class="body" href={link(c)}>
            <span class="title">{title(c)}</span>
            <span class="sum">{c.kind === 'work' ? '' : changeSummary(team, c) + ' · '}{outcome(c)}</span>
          </a>
          <span class="by">{by(c)}</span>
          <StatusChip status={c.status} />
        </li>
      {/each}
    </ol>
  {/each}
{:else}
  <EmptyState icon={Gavel} title={t('decide.log.empty')} />
{/if}

<style>
  .month { margin: var(--s6) 0 var(--s2); font-size: var(--fs-xs); font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-3); }
  .month:first-of-type { margin-block-start: 0; }
  .log { display: flex; flex-direction: column; border: 1px solid var(--rule); border-radius: var(--r-md); background: var(--surface-raised); }
  .log li { display: grid; grid-template-columns: 64px 32px minmax(0, 1fr) auto auto; align-items: center; gap: 12px; padding: 12px 16px; }
  .log li + li { border-block-start: 1px solid var(--rule); }
  .date { font-size: var(--fs-sm); color: var(--ink-3); font-variant-numeric: tabular-nums; }
  .ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; }
  [data-kind='work'] { color: var(--st-accepted); background: var(--st-accepted-bg); }
  [data-kind='rule'] { color: var(--st-review); background: var(--st-review-bg); }
  [data-kind='money'] { color: var(--st-progress); background: var(--st-progress-bg); }
  .body { display: flex; flex-direction: column; min-width: 0; }
  .body:hover .title { text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--rule-strong); }
  .title { font-weight: 500; }
  .sum { font-size: var(--fs-sm); color: var(--ink-3); }
  .by { font-size: var(--fs-xs); color: var(--ink-3); white-space: nowrap; }
  @media (max-width: 760px) {
    .log li { grid-template-columns: 32px minmax(0, 1fr) auto; }
    .date, .by { display: none; }
  }
</style>

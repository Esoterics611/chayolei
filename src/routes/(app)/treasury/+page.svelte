<script lang="ts">
  // Treasury (banking, in TMIM only): the team account, this month's issuance
  // against the charter's cap, budgets by objective, requests waiting for a
  // decision, scheduled pay and monthly statements generated from the ledger.
  import type { MoneyChange } from '$lib/team/types';
  import { store } from '$lib/team/store.svelte';
  import { ui } from '$lib/team/ui.svelte';
  import { can, ruleCurrent, ruleValue } from '$lib/team/rules';
  import { issuedInMonth, objectiveFigures, statements } from '$lib/team/ledger';
  import { lt, t, fmtDate, fmtMonth, fmtNum, fmtRelative, fmtTmim } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import Amount from '$lib/ui/Amount.svelte';
  import Meter from '$lib/ui/Meter.svelte';
  import StatusChip from '$lib/ui/StatusChip.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import Person from '$lib/app/Person.svelte';
  import { changeSummary, firstName, objectiveTitle } from '$lib/app/format';
  import Coins from '@lucide/svelte/icons/hand-coins';
  import ArrowDownToLine from '@lucide/svelte/icons/arrow-down-to-line';
  import Target from '@lucide/svelte/icons/target';
  import BadgeCheck from '@lucide/svelte/icons/badge-check';
  import UserRound from '@lucide/svelte/icons/user-round';
  import Landmark from '@lucide/svelte/icons/landmark';
  import Scale from '@lucide/svelte/icons/scale';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import FingerprintPattern from '@lucide/svelte/icons/fingerprint-pattern';

  const team = $derived(store.team);
  const me = $derived(store.me);
  const now = $derived(store.now);
  const issued = $derived(issuedInMonth(team, now));
  const capRule = $derived(ruleCurrent(team, 'monthly_issuance_cap'));
  const limit = $derived(ruleValue(team, 'spend_limit'));
  const canSpend = $derived(can(team, me, 'spend'));
  const canPropose = $derived(can(team, me, 'propose'));
  const pending = $derived(team.changes.filter((c): c is MoneyChange => c.kind === 'money' && c.status === 'open'));
  const stmts = $derived(statements(team));
  const maxIssued = $derived(Math.max(1, ...stmts.map(s => s.issued)));

  function pay(id: string) {
    const s = team.treasury.schedules.find(x => x.id === id);
    if (!s) return;
    const next = new Date(new Date(s.nextAt).getTime() + 7 * 86_400_000).toISOString();
    ui.askToSign({
      title: t('treasury.signPay', { name: firstName(team, s.memberId) }),
      lines: [
        t('treasury.signPayLine', { amount: fmtTmim(s.amount), name: firstName(team, s.memberId), objective: objectiveTitle(team, s.objectiveId) }),
        t('review.capLine', { issued: fmtTmim(issued), cap: fmtTmim(capRule.value) }),
        t('treasury.signPayNext', { date: fmtDate(next) }),
      ],
      confirmLabel: t('treasury.payNow'),
      onConfirm: async () => !!(await store.do({ type: 'paySchedule', scheduleId: id }, t('treasury.paid'))),
    });
  }
</script>

<svelte:head><title>{t('treasury.title')} · {lt(team.name)}</title></svelte:head>

<PageHeader title={t('treasury.title')} subtitle={t('shell.tmimOnlyHint')}>
  {#snippet actions()}
    <button type="button" class="btn" onclick={() => ui.openDialog({ kind: 'contribute' })}><ArrowDownToLine size={15} />{t('treasury.contribute')}</button>
    {#if canPropose}<button type="button" class="btn btn-primary" onclick={() => ui.openDialog({ kind: 'requestMoney' })}><Coins size={15} />{t('treasury.request')}</button>{/if}
  {/snippet}
</PageHeader>

<div class="stats">
  <div class="stat panel">
    <p class="eyebrow-label">{t('treasury.account')}</p>
    <Amount value={team.treasury.teamAccount} size="xl" />
    <p class="hint">{t('treasury.accountHint')}</p>
  </div>
  <div class="stat panel">
    <p class="eyebrow-label">{t('treasury.issued')} · {fmtMonth(now.slice(0, 7))}</p>
    <div class="fig"><Amount value={issued} size="xl" /><span class="of">/ {fmtTmim(capRule.value)}</span></div>
    <Meter total={capRule.value} segments={[{ value: issued, tone: 'solid' }]} label="{fmtTmim(issued)} / {fmtTmim(capRule.value)}" height={10} />
    <p class="hint"><a href={href('/decide/charter')}>{t('treasury.capRule', { v: capRule.version })}</a></p>
  </div>
  <div class="stat panel">
    <p class="eyebrow-label">{t('rule.spend_limit')}</p>
    <Amount value={limit} size="xl" />
    <p class="hint">{t('rule.spend_limit.desc')}</p>
  </div>
</div>

<section class="how" aria-labelledby="how-h">
  <h2 id="how-h" class="visually-hidden">{t('treasury.howTitle')}</h2>
  <ol class="flow">
    <li><span class="node"><Scale size={16} /></span><p>{t('treasury.how1')}</p></li>
    <li class="arrow" aria-hidden="true"><ArrowRight size={16} class="flip-rtl" /></li>
    <li><span class="node"><BadgeCheck size={16} /></span><p>{t('treasury.how2')}</p></li>
    <li class="arrow" aria-hidden="true"><ArrowRight size={16} class="flip-rtl" /></li>
    <li><span class="node"><Landmark size={16} /></span><p>{t('treasury.how3')}</p></li>
  </ol>
</section>

{#if pending.length}
  <section aria-labelledby="pend-h">
    <h2 id="pend-h" class="sec">{t('treasury.pending')}</h2>
    <ul class="table">
      {#each pending as c (c.id)}
        <li class="prow">
          <a class="ptitle" href={href(`/decide/p/${c.id}`)}>{lt(c.title)}</a>
          <span class="psum">{changeSummary(team, c)} · {c.decidedBy === 'vote' ? t('decide.byVote') : t('decide.byRole')} · {fmtRelative(c.at, now)}</span>
          <StatusChip status={c.status} />
        </li>
      {/each}
    </ul>
  </section>
{/if}

<section aria-labelledby="bud-h">
  <h2 id="bud-h" class="sec">{t('treasury.budgets')}</h2>
  <div class="table budgets" role="table" aria-labelledby="bud-h">
    <div class="brow head" role="row">
      <span role="columnheader">{t('treasury.objective')}</span>
      <span role="columnheader" class="num">{t('plan.budget')}</span>
      <span role="columnheader" class="num">{t('plan.paid')}</span>
      <span role="columnheader" class="num">{t('plan.committed')}</span>
      <span role="columnheader" class="num">{t('plan.left')}</span>
      <span role="columnheader"></span>
    </div>
    {#each team.objectives as o (o.id)}
      {@const f = objectiveFigures(team, o)}
      <div class="brow" role="row">
        <span role="cell" class="bname">
          <a href={href(`/plan/${o.id}`)}><Target size={14} />{lt(o.title)}</a>
          <Meter total={Math.max(f.budget, 1)} segments={[{ value: f.paid, tone: 'solid' }, { value: f.committed, tone: 'soft' }]} label="{t('plan.paid')} {fmtTmim(f.paid)}" height={5} />
        </span>
        <span role="cell" class="num" data-label={t('plan.budget')}><Amount value={f.budget} size="sm" /></span>
        <span role="cell" class="num" data-label={t('plan.paid')}><Amount value={f.paid} size="sm" /></span>
        <span role="cell" class="num" data-label={t('plan.committed')}><Amount value={f.committed} size="sm" /></span>
        <span role="cell" class="num" data-label={t('plan.left')}><Amount value={f.left} size="sm" tone={f.left < 0 ? 'negative' : 'default'} /></span>
        <span role="cell" class="act">
          {#if canPropose}<button type="button" class="btn btn-sm btn-ghost" onclick={() => ui.openDialog({ kind: 'requestMoney', type: 'budget', objectiveId: o.id })}>{t('plan.requestBudget')}</button>{/if}
        </span>
      </div>
    {/each}
  </div>
</section>

<section aria-labelledby="sch-h">
  <h2 id="sch-h" class="sec">{t('treasury.upcoming')}</h2>
  {#if team.treasury.schedules.length}
    <ul class="table">
      {#each team.treasury.schedules as s (s.id)}
        {@const due = s.nextAt <= now && s.nextAt <= s.until}
        <li class="srow" class:due>
          <span class="sicon"><CalendarClock size={16} /></span>
          <Person {team} id={s.memberId} size="sm" />
          <span class="sdesc">{objectiveTitle(team, s.objectiveId)} · {t('treasury.every', { date: fmtDate(s.until) })}</span>
          <span class="snext">{due ? t('treasury.due') : t('treasury.next', { date: fmtDate(s.nextAt) })}</span>
          <Amount value={s.amount} size="sm" />
          {#if due && canSpend}
            <button type="button" class="btn btn-sm btn-primary" onclick={() => pay(s.id)}><FingerprintPattern size={14} />{t('treasury.payNow')}</button>
          {:else}
            <span></span>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <EmptyState icon={CalendarClock} title={t('treasury.noSchedules')} compact />
  {/if}
</section>

<section aria-labelledby="st-h">
  <h2 id="st-h" class="sec">{t('treasury.statements')}</h2>
  <div class="bars" aria-hidden="true">
    {#each [...stmts].reverse().slice(-6) as s (s.month)}
      <div class="bar">
        <span class="bv">{fmtNum(s.issued)}</span>
        <span class="fill" style:height="{Math.max(2, (s.issued / maxIssued) * 100)}%"></span>
        <span class="bl">{fmtMonth(s.month).split(' ')[0]}</span>
      </div>
    {/each}
  </div>
  <div class="stmts">
    {#each stmts as s, i (s.month)}
      <details class="stmt" open={i === 0}>
        <summary>
          <span class="sm">{fmtMonth(s.month)}</span>
          <span class="sfig"><span class="lab">{t('treasury.statement.issued')}</span><Amount value={s.issued} size="sm" /></span>
          <span class="sfig"><span class="lab">{t('treasury.statement.in')}</span><Amount value={s.accountIn} size="sm" /></span>
          <span class="sfig"><span class="lab">{t('treasury.statement.out')}</span><Amount value={s.accountOut} size="sm" /></span>
          <span class="sfig"><span class="lab">{t('treasury.statement.end')}</span><Amount value={s.accountEnd} size="sm" /></span>
          <ChevronDown size={15} class="chev" />
        </summary>
        <div class="sbody">
          <p class="lab">{t('treasury.statement.byObjective')}</p>
          {#if s.paidByObjective.length}
            <ul>
              {#each s.paidByObjective as row (row.objectiveId)}
                <li><span>{objectiveTitle(team, row.objectiveId)}</span><Amount value={row.amount} size="sm" /></li>
              {/each}
            </ul>
          {:else}
            <p class="muted">—</p>
          {/if}
          <p class="muted small">{t('treasury.entries', { n: fmtNum(s.entries) })} · <a href={href('/ledger/money')}>{t('nav.ledger')}</a></p>
        </div>
      </details>
    {/each}
  </div>
</section>

<p class="tmim"><UserRound size={14} /><a href={href('/wallet')}>{t('treasury.wallet')}</a> · {t('treasury.walletOnly')}</p>

<style>
  section + section { margin-block-start: var(--s8); }
  .sec { font-size: var(--fs-lg); font-weight: 600; margin-block-end: var(--s3); }
  .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--s4); }
  .stat { display: flex; flex-direction: column; gap: 8px; padding: var(--s5); }
  .fig { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .of { color: var(--ink-3); font-variant-numeric: tabular-nums; }
  .hint { font-size: var(--fs-sm); color: var(--ink-3); text-wrap: pretty; }
  .hint a { color: var(--accent-text); }
  .how { margin-block: var(--s5) 0; }
  .flow { display: flex; align-items: stretch; gap: 10px; padding: var(--s4); border-radius: var(--r-md); border: 1px dashed var(--rule-strong); }
  .flow li:not(.arrow) { flex: 1; display: flex; gap: 10px; align-items: flex-start; font-size: var(--fs-sm); color: var(--ink-2); }
  .flow .arrow { display: grid; place-items: center; color: var(--ink-3); }
  .node { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; background: var(--accent-weak); color: var(--accent-text); flex: none; }
  .table { display: flex; flex-direction: column; border: 1px solid var(--rule); border-radius: var(--r-md); background: var(--surface-raised); }
  .table > :global(* + *) { border-block-start: 1px solid var(--rule); }
  .prow { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) auto; align-items: center; gap: 12px; padding: 12px 16px; }
  .ptitle { font-weight: 500; }
  .ptitle:hover { text-decoration: underline; text-underline-offset: 3px; }
  .psum { font-size: var(--fs-sm); color: var(--ink-3); }
  .brow { display: grid; grid-template-columns: minmax(0, 2fr) repeat(4, minmax(90px, 1fr)) 150px; align-items: center; gap: 12px; padding: 12px 16px; }
  .brow.head { padding-block: 8px; font-size: var(--fs-xs); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-3); background: var(--surface); border-start-start-radius: var(--r-md); border-start-end-radius: var(--r-md); }
  .num { text-align: end; }
  .bname { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .bname a { display: inline-flex; align-items: center; gap: 6px; font-weight: 500; }
  .bname a:hover { color: var(--accent-text); }
  .act { display: flex; justify-content: flex-end; }
  .srow { display: grid; grid-template-columns: 32px auto minmax(0, 1fr) auto auto 110px; align-items: center; gap: 12px; padding: 10px 16px; }
  .srow.due { background: color-mix(in srgb, var(--st-progress-bg) 60%, transparent); }
  .sicon { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; background: var(--st-progress-bg); color: var(--st-progress); }
  .sdesc { font-size: var(--fs-sm); color: var(--ink-3); }
  .snext { font-size: var(--fs-sm); color: var(--ink-2); white-space: nowrap; }
  .due .snext { color: var(--st-progress); font-weight: 600; }
  .bars { display: flex; align-items: flex-end; gap: 10px; height: 116px; padding: 8px 4px 0; margin-block-end: var(--s3); }
  .bar { flex: 1; max-width: 72px; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 4px; }
  .fill { width: 100%; border-radius: 4px 4px 1px 1px; background: linear-gradient(to top, var(--accent), color-mix(in srgb, var(--accent) 65%, var(--surface))); }
  .bv { font-size: 11px; color: var(--ink-3); font-variant-numeric: tabular-nums; }
  .bl { font-size: var(--fs-xs); color: var(--ink-3); }
  .stmts { display: flex; flex-direction: column; gap: 8px; }
  .stmt { border: 1px solid var(--rule); border-radius: var(--r-md); background: var(--surface-raised); }
  .stmt summary { display: grid; grid-template-columns: 150px repeat(4, minmax(0, 1fr)) 20px; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; list-style: none; }
  .stmt summary::-webkit-details-marker { display: none; }
  .stmt[open] summary :global(.chev) { transform: rotate(180deg); }
  .sm { font-weight: 600; }
  .sfig { display: flex; flex-direction: column; gap: 1px; }
  .lab { font-size: var(--fs-xs); color: var(--ink-3); }
  .sbody { padding: 4px 16px 14px; display: flex; flex-direction: column; gap: 8px; }
  .sbody ul { display: flex; flex-direction: column; gap: 4px; max-width: 520px; }
  .sbody li { display: flex; justify-content: space-between; gap: 12px; font-size: var(--fs-sm); padding-block: 4px; border-block-end: 1px dashed var(--rule); }
  .small { font-size: var(--fs-sm); }
  .small a { color: var(--accent-text); }
  .tmim { margin-block-start: var(--s8); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: var(--fs-sm); color: var(--ink-3); }
  .tmim a { color: var(--accent-text); font-weight: 500; }
  @media (max-width: 1099px) {
    .stats { grid-template-columns: 1fr 1fr; }
    .stats .stat:last-child { grid-column: 1 / -1; }
    .flow { flex-direction: column; }
    .flow .arrow { transform: rotate(90deg); }
    .brow { grid-template-columns: minmax(0, 1.6fr) repeat(4, minmax(80px, 1fr)); }
    .brow .act { display: none; }
  }
  @media (max-width: 760px) {
    .stats { grid-template-columns: minmax(0, 1fr); }
    .brow.head { display: none; }
    .brow { grid-template-columns: 1fr 1fr; }
    .bname { grid-column: 1 / -1; }
    .brow .num { display: flex; flex-direction: column; align-items: flex-start; text-align: start; }
    .brow .num::before { content: attr(data-label); font-size: var(--fs-xs); color: var(--ink-3); }
    .prow { grid-template-columns: minmax(0, 1fr) auto; }
    .psum { grid-column: 1 / -1; grid-row: 2; }
    .srow { grid-template-columns: auto minmax(0, 1fr) auto; }
    .sicon, .sdesc { display: none; }
    .srow .btn { grid-column: 1 / -1; }
    .stmt summary { grid-template-columns: 1fr 1fr 20px; }
    .stmt summary .sm { grid-column: 1 / -1; }
  }
</style>

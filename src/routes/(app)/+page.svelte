<script lang="ts">
  // Home: what needs you, your work, the team's pulse and a treasury glance.
  import { store } from '$lib/team/store.svelte';
  import * as E from '$lib/team/engine';
  import { can, ruleValue } from '$lib/team/rules';
  import { issuedInMonth, memberBalance } from '$lib/team/ledger';
  import { lt, t, fmtDate, fmtNum, fmtTmim } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import StageChip from '$lib/ui/StageChip.svelte';
  import Amount from '$lib/ui/Amount.svelte';
  import Meter from '$lib/ui/Meter.svelte';
  import NeedsList from '$lib/app/NeedsList.svelte';
  import SystemsStrip from '$lib/app/SystemsStrip.svelte';
  import LedgerList from '$lib/app/LedgerList.svelte';
  import { nextStep } from '$lib/app/next';
  import { runStep, takeWork } from '$lib/app/actions';
  import { firstName, objectiveTitle } from '$lib/app/format';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import PenLine from '@lucide/svelte/icons/pen-line';

  const team = $derived(store.team);
  const me = $derived(store.me);
  const now = $derived(store.now);
  const needs = $derived(E.needsYou(team, me, now));
  const mine = $derived(team.deliverables.filter(d => d.ownerId === me && d.stage !== 'released' && d.stage !== 'accepted'));
  const open = $derived(can(team, me, 'take_work') ? team.deliverables.filter(d => d.stage === 'open').slice(0, 3) : []);
  const pulse = $derived([...team.ledger].filter(e => e.kind !== 'anchor').sort((a, b) => b.seq - a.seq).slice(0, 7));
  const issued = $derived(issuedInMonth(team, now));
  const cap = $derived(ruleValue(team, 'monthly_issuance_cap'));
  const balance = $derived(memberBalance(team, me));
</script>

<svelte:head><title>{t('home.title')} · {lt(team.name)}</title></svelte:head>

<PageHeader title={t('home.greeting', { name: firstName(team, me) })} subtitle={t('home.subtitle', { team: lt(team.name), date: fmtDate(now, { withYear: true }) })} />

<SystemsStrip {team} {now} />

<div class="home">
  <div class="primary">
    <section aria-labelledby="needs-h">
      <div class="sec-head">
        <h2 id="needs-h" class="sec-title">{t('need.title')} {#if needs.length}<span class="count">{fmtNum(needs.length)}</span>{/if}</h2>
      </div>
      {#if needs.length}
        <NeedsList {team} items={needs} {now} />
      {:else}
        <EmptyState icon={CircleCheck} title={t('need.empty')} hint={t('need.emptyHint')} compact>
          <a class="btn btn-sm" href={href('/plan')}>{t('nav.plan')}<ArrowRight size={14} class="flip-rtl" /></a>
        </EmptyState>
      {/if}
    </section>

    <section aria-labelledby="work-h">
      <div class="sec-head">
        <h2 id="work-h" class="sec-title">{t('home.yourWork')}</h2>
        <a class="see" href={href('/work')}>{t('common.seeAll')}<ArrowRight size={13} class="flip-rtl" /></a>
      </div>
      {#if mine.length}
        <ul class="work">
          {#each mine as d (d.id)}
            {@const step = nextStep(team, d, me)}
            <li class="wi">
              <div class="wi-main">
                <a class="wi-title" href={href(`/d/${d.id}`)}>{lt(d.title)}</a>
                <p class="wi-step" class:mine={step.mine}>{step.mine ? t('work.yourTurn') + ' · ' : ''}{step.text}</p>
              </div>
              <StageChip stage={d.stage} stalledDays={E.isStalled(d, now) ? Math.floor((new Date(now).getTime() - new Date(d.lastActivityAt).getTime()) / 86_400_000) : undefined} />
              {#if step.mine && step.action}
                <button type="button" class="btn btn-sm" onclick={() => runStep(d, step.action!)}>{step.action.label}</button>
              {/if}
            </li>
          {/each}
        </ul>
      {:else}
        <EmptyState icon={PenLine} title={t('home.yourWork.empty')} hint={t('need.emptyHint')} compact />
      {/if}
    </section>

    {#if open.length}
      <section aria-labelledby="open-h">
        <div class="sec-head">
          <h2 id="open-h" class="sec-title">{t('home.openWork')}</h2>
          <a class="see" href={href('/plan')}>{t('nav.plan')}<ArrowRight size={13} class="flip-rtl" /></a>
        </div>
        <ul class="work">
          {#each open as d (d.id)}
            <li class="wi">
              <div class="wi-main">
                <a class="wi-title" href={href(`/d/${d.id}`)}>{lt(d.title)}</a>
                <p class="wi-step">{objectiveTitle(team, d.objectiveId)}</p>
              </div>
              <Amount value={d.reward} size="sm" />
              <button type="button" class="btn btn-sm" onclick={() => takeWork(d)}>{t('plan.take')}</button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>

  <aside class="secondary">
    <section class="panel glance" aria-labelledby="tr-h">
      <div class="sec-head">
        <h2 id="tr-h" class="sec-title">{t('home.treasury')}</h2>
        <a class="see" href={href('/treasury')}>{t('common.open')}<ArrowRight size={13} class="flip-rtl" /></a>
      </div>
      <div class="fig">
        <span class="eyebrow-label">{t('home.treasury.issued')}</span>
        <div class="fig-row"><Amount value={issued} size="lg" /><span class="of">/ {fmtTmim(cap)}</span></div>
        <Meter total={cap} segments={[{ value: issued, tone: 'solid' }]} label="{fmtTmim(issued)} / {fmtTmim(cap)}" />
      </div>
      <div class="two">
        <div>
          <span class="eyebrow-label">{t('home.treasury.account')}</span>
          <Amount value={team.treasury.teamAccount} />
        </div>
        <a href={href('/wallet')} class="bal">
          <span class="eyebrow-label">{t('home.treasury.balance')}</span>
          <Amount value={balance} />
        </a>
      </div>
    </section>

    <section aria-labelledby="pulse-h">
      <div class="sec-head">
        <h2 id="pulse-h" class="sec-title">{t('home.pulse')}</h2>
        <a class="see" href={href('/ledger')}>{t('nav.ledger')}<ArrowRight size={13} class="flip-rtl" /></a>
      </div>
      <LedgerList {team} entries={pulse} grouped={false} compact {now} />
    </section>
  </aside>
</div>

<style>
  .home { display: grid; grid-template-columns: minmax(0, 1.75fr) minmax(280px, 1fr); gap: var(--s8); align-items: start; }
  .primary, .secondary { display: flex; flex-direction: column; gap: var(--s8); min-width: 0; }
  .sec-head { display: flex; align-items: center; justify-content: space-between; gap: var(--s3); margin-block-end: var(--s3); }
  .sec-title { display: inline-flex; align-items: center; gap: 8px; font-size: var(--fs-lg); font-weight: 600; }
  .count { min-width: 22px; height: 22px; padding-inline: 7px; border-radius: 999px; background: var(--accent); color: var(--accent-ink); font-size: 12px; display: inline-grid; place-items: center; font-variant-numeric: tabular-nums; }
  .see { display: inline-flex; align-items: center; gap: 4px; font-size: var(--fs-sm); color: var(--ink-3); }
  .see:hover { color: var(--accent-text); }
  .work { display: flex; flex-direction: column; border: 1px solid var(--rule); border-radius: var(--r-md); background: var(--surface-raised); }
  .wi { display: flex; align-items: center; gap: 12px; padding: 12px 16px; }
  .wi + .wi { border-block-start: 1px solid var(--rule); }
  .wi-main { flex: 1; min-width: 0; }
  .wi-title { font-weight: 500; }
  .wi-title:hover { text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--rule-strong); }
  .wi-step { font-size: var(--fs-sm); color: var(--ink-3); text-wrap: pretty; }
  .wi-step.mine { color: var(--accent-text); }
  .glance { padding: var(--s5); display: flex; flex-direction: column; gap: var(--s4); }
  .glance .sec-head { margin: 0; }
  .fig { display: flex; flex-direction: column; gap: 6px; }
  .fig-row { display: flex; align-items: baseline; gap: 8px; }
  .of { color: var(--ink-3); font-size: var(--fs-sm); font-variant-numeric: tabular-nums; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s3); padding-block-start: var(--s3); border-block-start: 1px solid var(--rule); }
  .two > * { display: flex; flex-direction: column; gap: 2px; }
  .bal { border-radius: var(--r-sm); }
  .bal:hover :global(.n) { color: var(--accent-text); }
  @media (max-width: 1099px) {
    .home { grid-template-columns: minmax(0, 1fr); }
    .secondary { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s6); }
  }
  @media (max-width: 760px) {
    .secondary { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 639px) {
    .wi { flex-wrap: wrap; padding: 12px; }
    .wi-main { flex-basis: 100%; }
  }
</style>

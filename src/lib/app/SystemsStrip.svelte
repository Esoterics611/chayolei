<script lang="ts">
  // The three parallel systems on one ledger, each at a glance: workforce
  // (deliverables by stage), organization (decisions), banking (issuance).
  import type { Team } from '$lib/team/types';
  import { ruleValue } from '$lib/team/rules';
  import { issuedInMonth } from '$lib/team/ledger';
  import { t, fmtNum, fmtTmim } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import Meter from '$lib/ui/Meter.svelte';
  import StageStrip from './StageStrip.svelte';
  import ListTree from '@lucide/svelte/icons/list-tree';
  import Scale from '@lucide/svelte/icons/scale';
  import Landmark from '@lucide/svelte/icons/landmark';

  let { team, now }: { team: Team; now: string } = $props();

  const inFlight = $derived(team.deliverables.filter(d => ['assigned', 'in_progress', 'in_review', 'changes_requested'].includes(d.stage)).length);
  const accepted = $derived(team.deliverables.filter(d => d.stage === 'accepted' || d.stage === 'released').length);
  const openChanges = $derived(team.changes.filter(c => c.kind !== 'work' && c.status === 'open').length);
  const decisions = $derived(
    team.changes
      .filter(c => c.decidedAt && (c.kind !== 'work' || c.status === 'accepted'))
      .sort((a, b) => (a.decidedAt ?? '').localeCompare(b.decidedAt ?? ''))
      .slice(-14),
  );
  const amendments = $derived(team.charter.rules.reduce((n, r) => n + r.history.length - 1, 0));
  const issued = $derived(issuedInMonth(team, now));
  const cap = $derived(ruleValue(team, 'monthly_issuance_cap'));
</script>

<div class="strip">
  <a class="sys" href={href('/plan')}>
    <span class="name"><ListTree size={14} />{t('home.sys.work')}</span>
    <span class="fig">{fmtNum(inFlight)}<span class="unit">{t('home.sys.workUnit')}</span></span>
    <StageStrip deliverables={team.deliverables} />
    <span class="sub">{t('home.sys.workLine', { done: fmtNum(accepted), total: fmtNum(team.deliverables.length) })}</span>
  </a>
  <a class="sys" href={href('/decide')}>
    <span class="name"><Scale size={14} />{t('home.sys.corp')}</span>
    <span class="fig">{fmtNum(openChanges)}<span class="unit">{t('home.sys.corpUnit')}</span></span>
    <span class="dots" aria-hidden="true">
      {#each decisions as c (c.id)}<span class="dot" data-kind={c.kind} data-status={c.status}></span>{/each}
    </span>
    <span class="sub">{t('home.sys.corpLine', { n: fmtNum(decisions.length), amended: fmtNum(amendments) })}</span>
  </a>
  <a class="sys" href={href('/treasury')}>
    <span class="name"><Landmark size={14} />{t('home.sys.bank')}</span>
    <span class="fig">{fmtNum(team.treasury.teamAccount)}<span class="unit">TMIM</span></span>
    <Meter total={cap} segments={[{ value: issued, tone: 'solid' }]} label="{fmtTmim(issued)} / {fmtTmim(cap)}" height={6} />
    <span class="sub">{t('home.sys.bankLine', { issued: fmtTmim(issued), cap: fmtTmim(cap) })}</span>
  </a>
</div>

<style>
  .strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--s3); margin-block-end: var(--s8); }
  .sys {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: var(--s4) var(--s5);
    border: 1px solid var(--rule);
    border-radius: var(--r-md);
    background: var(--surface-raised);
    overflow: hidden;
    transition: border-color var(--fast) var(--ease), transform var(--fast) var(--ease);
  }
  .sys::after {
    content: '';
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    width: 3px;
    background: var(--accent);
    opacity: 0.85;
  }
  .sys:hover { border-color: var(--rule-strong); transform: translateY(-1px); }
  .name { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-xs); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); }
  .fig { display: flex; align-items: baseline; gap: 6px; font-size: var(--fs-2xl); font-weight: 600; letter-spacing: -0.015em; font-variant-numeric: tabular-nums; line-height: 1.1; }
  .unit { font-size: var(--fs-sm); font-weight: 500; letter-spacing: 0; color: var(--ink-3); }
  .sub { font-size: var(--fs-xs); color: var(--ink-3); }
  .dots { display: flex; gap: 3px; height: 6px; align-items: center; }
  .dot { flex: 1; max-width: 22px; height: 6px; border-radius: 2px; background: var(--rule-strong); }
  .dot[data-kind='work'] { background: color-mix(in srgb, var(--st-accepted) 70%, var(--surface)); }
  .dot[data-kind='rule'] { background: var(--st-review); }
  .dot[data-kind='money'] { background: var(--st-progress); }
  .dot[data-status='failed'] { background: var(--st-stalled); }
  @media (max-width: 760px) {
    .strip { grid-template-columns: minmax(0, 1fr); }
    .sys { padding: var(--s3) var(--s4); }
    .fig { font-size: var(--fs-xl); }
  }
</style>

<script lang="ts">
  // One member, one vote: for / against / abstain / not yet voted, with the
  // quorum marked on the bar and the outcome rule in words beside it.
  import { t, fmtNum } from '$lib/team/i18n';

  interface Props {
    forVotes: number;
    against: number;
    abstain: number;
    eligible: number;
    quorum: number;
    majority: number;
    turnoutPct: number;
    forPct: number;
    quorumReached: boolean;
    passing: boolean;
    compact?: boolean;
  }
  let p: Props = $props();
  const w = (n: number) => (p.eligible ? (n / p.eligible) * 100 : 0);
</script>

<div class="tally" class:compact={p.compact}>
  <div class="bar" role="img" aria-label="{t('decide.tally', { for: p.forVotes, against: p.against, abstain: p.abstain })}. {t('decide.turnout', { pct: fmtNum(Math.round(p.turnoutPct)), quorum: p.quorum })}">
    <span class="for" style:width="{w(p.forVotes)}%"></span>
    <span class="against" style:width="{w(p.against)}%"></span>
    <span class="abstain" style:width="{w(p.abstain)}%"></span>
    <span class="quorum" style:inset-inline-start="{p.quorum}%" title={t('rule.quorum_pct')}></span>
  </div>
  <div class="lines">
    <span class="counts">
      <span class="dot for"></span>{fmtNum(p.forVotes)} {t('decide.vote.for')}
      <span class="dot against"></span>{fmtNum(p.against)} {t('decide.vote.against')}
      <span class="dot abstain"></span>{fmtNum(p.abstain)} {t('decide.vote.abstain')}
    </span>
    {#if !p.compact}
      <span class="muted">{t('decide.turnout', { pct: fmtNum(Math.round(p.turnoutPct)), quorum: p.quorum })}</span>
      <span class:ok={p.quorumReached} class="state">{p.quorumReached ? t('decide.quorumReached') : t('decide.quorumNotReached')}{#if p.forVotes + p.against > 0}{` · ${t('decide.forShare', { pct: fmtNum(Math.round(p.forPct)) })}`}{/if}</span>
    {/if}
  </div>
</div>

<style>
  .tally { display: flex; flex-direction: column; gap: 8px; }
  .bar {
    position: relative;
    display: flex;
    height: 10px;
    border-radius: 999px;
    background: var(--surface-3);
  }
  .compact .bar { height: 6px; }
  .bar > span:not(.quorum) { height: 100%; }
  .bar > span:first-child { border-start-start-radius: 999px; border-end-start-radius: 999px; }
  .for { background: var(--accent); }
  .against { background: var(--st-changes); }
  .abstain { background: var(--rule-strong); }
  .quorum {
    position: absolute;
    inset-block: -4px;
    width: 2px;
    background: var(--ink);
    border-radius: 1px;
  }
  .lines {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    font-size: var(--fs-sm);
    color: var(--ink-2);
  }
  .counts { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-inline-start: 6px; }
  .dot:first-child { margin-inline-start: 0; }
  .dot.for { background: var(--accent); }
  .dot.against { background: var(--st-changes); }
  .dot.abstain { background: var(--rule-strong); }
  .state { color: var(--ink-3); }
  .state.ok { color: var(--st-accepted); }
</style>

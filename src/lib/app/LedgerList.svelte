<script lang="ts">
  // The team's record as a chain: each entry a sentence, its tier, its time and
  // the TMIM it moved; settled entries sit on the chain as blocks, signed ones
  // as signatures. Every entry opens to its proof and links to its object.
  import type { LedgerEntry, Team } from '$lib/team/types';
  import { anchoredBatches, groupByDay, isConfirmed } from '$lib/team/ledger';
  import { fmtDay, fmtRelative, fmtTime, fmtNum, t } from '$lib/team/i18n';
  import TierMark from '$lib/ui/TierMark.svelte';
  import Amount from '$lib/ui/Amount.svelte';
  import { describe } from './describe';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Copy from '@lucide/svelte/icons/copy';
  import { ui } from '$lib/team/ui.svelte';
  import { store } from '$lib/team/store.svelte';

  interface Props {
    team: Team;
    entries: LedgerEntry[];
    grouped?: boolean;
    compact?: boolean;
    now?: string;
    /** Show each entry's amount as this member's gain or loss (the wallet). */
    memberId?: string;
  }
  let { team, entries, grouped = true, compact = false, now, memberId }: Props = $props();

  const net = (e: LedgerEntry) => (e.amounts ?? []).filter(a => a.memberId === memberId).reduce((s, a) => s + a.amount, 0);

  let open = $state<string | null>(null);
  const anchored = $derived(anchoredBatches(team));
  const groups = $derived(grouped ? groupByDay(entries) : [{ day: '', entries: [...entries].sort((a, b) => b.seq - a.seq) }]);
  const short = (h: string) => `${h.slice(0, 10)}…${h.slice(-6)}`;

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); ui.toast('info', text.slice(0, 18) + '…'); } catch { /* clipboard blocked */ }
  }
</script>

<div class="ledger" class:compact>
  {#each groups as g (g.day)}
    {#if grouped}<h3 class="day">{fmtDay(g.day)}</h3>{/if}
    <ol class="chain">
      {#each g.entries as e (e.id)}
        {@const info = describe(team, e)}
        {@const Icon = info.icon}
        <li class="entry" data-tier={e.tier} class:anchor={e.kind === 'anchor'}>
          <span class="node" aria-hidden="true"><Icon size={compact ? 12 : 13} strokeWidth={2.25} /></span>
          <div class="main">
            <div class="line">
              {#if info.href}<a class="text" href={info.href}>{info.text}</a>{:else}<span class="text">{info.text}</span>{/if}
              {#if memberId && net(e)}
                <span class="amt"><Amount value={net(e)} signed size="sm" tone={net(e) > 0 ? 'positive' : 'negative'} /></span>
              {:else if info.amount && !compact && !memberId}
                <span class="amt"><Amount value={info.amount} signed={!info.inbound} size="sm" tone={info.inbound ? 'default' : 'positive'} /></span>
              {/if}
            </div>
            <div class="sub">
              <TierMark tier={e.tier} label={!compact} pending={!isConfirmed(e, anchored)} />
              <span class="time">{grouped ? fmtTime(e.at) : fmtRelative(e.at, now)}</span>
              {#if !compact}
                <button type="button" class="proof-btn" aria-expanded={open === e.id} onclick={() => (open = open === e.id ? null : e.id)}>
                  {t('ledger.entry', { n: fmtNum(e.seq) })}<ChevronDown size={12} />
                </button>
              {/if}
            </div>
            {#if open === e.id}
              <dl class="proof">
                {#if e.proof.tx}
                  <dt>{t('ledger.tx')}</dt>
                  <dd>
                    {#if store.chain.explorer && team.chain}
                      <a href="{store.chain.explorer}/tx/{e.proof.tx}" target="_blank" rel="noopener" title={t('ledger.onExplorer')}><code>{short(e.proof.tx)}</code></a>
                    {:else}
                      <code>{short(e.proof.tx)}</code>
                    {/if}
                    <button type="button" class="copy" onclick={() => copy(e.proof.tx!)} aria-label={t('ledger.tx')}><Copy size={12} /></button>
                  </dd>
                  <dt>{t('ledger.block')}</dt><dd><code>{fmtNum(e.proof.block ?? 0)}</code></dd>
                {:else if e.tier === 'settled'}
                  <dd class="demo">{t('ledger.pending')}</dd>
                {:else}
                  {#if e.proof.sig}<dt>{t('ledger.sig')}</dt><dd><code>{e.proof.sig}</code></dd>{/if}
                  <dt>{t('ledger.batch', { n: e.proof.batch ?? 0 })}</dt><dd></dd>
                {/if}
                {#if !store.live}<dd class="demo">{t('ledger.demoProof')}</dd>{/if}
              </dl>
            {/if}
          </div>
        </li>
      {/each}
    </ol>
  {/each}
</div>

<style>
  .ledger { display: flex; flex-direction: column; }
  .day {
    position: sticky;
    inset-block-start: 56px;
    z-index: 1;
    padding: 14px 0 6px;
    background: var(--surface);
    font-size: var(--fs-xs);
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .chain { position: relative; display: flex; flex-direction: column; }
  .chain::before {
    content: '';
    position: absolute;
    inset-block: 14px;
    inset-inline-start: 13px;
    width: 2px;
    background: var(--rule);
    border-radius: 1px;
  }
  .compact .chain::before { inset-inline-start: 11px; }
  .entry { position: relative; display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 12px; padding-block: 8px; }
  .compact .entry { grid-template-columns: 24px minmax(0, 1fr); gap: 10px; padding-block: 6px; }
  .node {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    color: var(--ink-2);
    background: var(--surface-raised);
    border: 1.5px solid var(--rule-strong);
    border-radius: 999px;
  }
  .compact .node { width: 24px; height: 24px; }
  /* Settled entries are blocks on the chain; signed entries are signatures. */
  [data-tier='settled'] .node { border-radius: 7px; border-color: var(--accent); color: var(--accent-text); background: var(--accent-weak); }
  .anchor .node { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  .main { min-width: 0; padding-block-start: 3px; }
  .compact .main { padding-block-start: 2px; }
  .line { display: flex; gap: 12px; align-items: baseline; justify-content: space-between; }
  .text { line-height: 1.45; text-wrap: pretty; }
  .compact .text { font-size: var(--fs-sm); }
  a.text:hover { text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--rule-strong); }
  .anchor .text { color: var(--ink-2); font-size: var(--fs-sm); }
  .amt { flex: none; }
  .sub { display: flex; align-items: center; gap: 10px; margin-block-start: 2px; font-size: var(--fs-xs); color: var(--ink-3); }
  .time { font-variant-numeric: tabular-nums; }
  .proof-btn { display: inline-flex; align-items: center; gap: 3px; color: var(--ink-3); font-size: var(--fs-xs); border-radius: 4px; padding: 1px 4px; }
  .proof-btn:hover { color: var(--ink); background: var(--surface-2); }
  .proof-btn[aria-expanded='true'] :global(svg) { transform: rotate(180deg); }
  .proof {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 4px 14px;
    margin-block-start: 8px;
    padding: 10px 12px;
    border: 1px solid var(--rule);
    border-radius: var(--r-sm);
    background: var(--surface);
    font-size: var(--fs-xs);
  }
  .proof dt { color: var(--ink-3); }
  .proof dd { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .proof code { font-family: var(--font-mono); color: var(--ink); overflow: hidden; text-overflow: ellipsis; }
  .copy { color: var(--ink-3); }
  .copy:hover { color: var(--ink); }
  .proof .demo { grid-column: 1 / -1; color: var(--ink-3); font-style: italic; }
</style>

<script lang="ts">
  // A TMIM amount in tabular figures, with the unit set smaller beside it.
  import { fmtNum } from '$lib/team/i18n';

  interface Props {
    value: number;
    /** Show a + for positive values. */
    signed?: boolean;
    unit?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    tone?: 'default' | 'muted' | 'positive' | 'negative';
  }
  let { value, signed = false, unit = true, size = 'md', tone = 'default' }: Props = $props();
  const text = $derived(`${signed && value > 0 ? '+' : ''}${fmtNum(value)}`);
</script>

<span class="amount {size}" data-tone={tone}><bdi class="n">{text}</bdi>{#if unit}<span class="u">TMIM</span>{/if}</span>

<style>
  .amount {
    display: inline-flex;
    align-items: baseline;
    gap: 0.3em;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .n { font-weight: 500; }
  .u {
    font-size: 0.72em;
    font-weight: 500;
    letter-spacing: 0.04em;
    color: var(--ink-3);
  }
  .sm { font-size: var(--fs-sm); }
  .md { font-size: var(--fs-md); }
  .lg { font-size: var(--fs-xl); }
  .lg .n, .xl .n { font-weight: 600; letter-spacing: -0.01em; }
  .xl { font-size: var(--fs-3xl); }
  [data-tone='muted'] { color: var(--ink-3); }
  [data-tone='positive'] .n { color: var(--st-accepted); }
  [data-tone='negative'] .n { color: var(--st-changes); }
</style>

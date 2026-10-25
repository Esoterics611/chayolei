<script lang="ts">
  // An objective's deliverables by stage, as one segmented strip.
  import type { Deliverable, Stage } from '$lib/team/types';
  import { STAGES } from '$lib/team/types';
  import { t, fmtNum } from '$lib/team/i18n';

  let { deliverables }: { deliverables: Deliverable[] } = $props();
  const counts = $derived(STAGES.map(s => ({ stage: s as Stage, n: deliverables.filter(d => d.stage === s).length })).filter(x => x.n));
  const label = $derived(counts.map(c => `${t(`stage.${c.stage}`)} ${fmtNum(c.n)}`).join(', '));
</script>

<div class="strip" role="img" aria-label={label} title={label}>
  {#each counts as c (c.stage)}
    <span class="seg" data-stage={c.stage} style:flex-grow={c.n}></span>
  {/each}
</div>

<style>
  .strip { display: flex; gap: 2px; height: 6px; width: 100%; min-width: 80px; }
  .seg { flex-basis: 0; border-radius: 2px; }
  [data-stage='open'] { background: var(--rule-strong); }
  [data-stage='assigned'] { background: var(--st-assigned); }
  [data-stage='in_progress'] { background: var(--st-progress); }
  [data-stage='in_review'] { background: var(--st-review); }
  [data-stage='changes_requested'] { background: var(--st-changes); }
  [data-stage='accepted'] { background: var(--st-accepted); }
  [data-stage='released'] { background: var(--accent); }
</style>

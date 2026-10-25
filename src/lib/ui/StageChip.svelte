<script lang="ts">
  // A deliverable's stage: icon + label on its tint. Never colour alone.
  import type { Stage } from '$lib/team/types';
  import { t } from '$lib/team/i18n';
  import CircleDashed from '@lucide/svelte/icons/circle-dashed';
  import CircleDot from '@lucide/svelte/icons/circle-dot';
  import PenLine from '@lucide/svelte/icons/pen-line';
  import GitPullRequest from '@lucide/svelte/icons/git-pull-request';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import BadgeCheck from '@lucide/svelte/icons/badge-check';
  import BookOpenCheck from '@lucide/svelte/icons/book-open-check';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

  interface Props {
    stage: Stage;
    /** Days without activity, when the deliverable is stalled. */
    stalledDays?: number;
    size?: 'sm' | 'md';
  }
  let { stage, stalledDays, size = 'sm' }: Props = $props();

  const ICONS = {
    open: CircleDashed,
    assigned: CircleDot,
    in_progress: PenLine,
    in_review: GitPullRequest,
    changes_requested: RotateCcw,
    accepted: BadgeCheck,
    released: BookOpenCheck,
  };
  const Icon = $derived(ICONS[stage]);
</script>

<span class="chip {size}" data-stage={stage}>
  <Icon size={size === 'sm' ? 13 : 15} strokeWidth={2.25} />
  <span>{t(`stage.${stage}`)}</span>
</span>
{#if stalledDays}
  <span class="chip {size}" data-stage="stalled">
    <TriangleAlert size={size === 'sm' ? 13 : 15} strokeWidth={2.25} />
    <span>{t('stage.stalled', { days: stalledDays })}</span>
  </span>
{/if}

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding-inline: 7px 8px;
    border-radius: 999px;
    font-weight: 500;
    white-space: nowrap;
    line-height: 1;
  }
  .sm { height: 22px; font-size: var(--fs-xs); }
  .md { height: 26px; font-size: var(--fs-sm); padding-inline: 9px 10px; }
  [data-stage='open'] { color: var(--st-open); background: var(--st-open-bg); }
  [data-stage='assigned'] { color: var(--st-assigned); background: var(--st-assigned-bg); }
  [data-stage='in_progress'] { color: var(--st-progress); background: var(--st-progress-bg); }
  [data-stage='in_review'] { color: var(--st-review); background: var(--st-review-bg); }
  [data-stage='changes_requested'] { color: var(--st-changes); background: var(--st-changes-bg); }
  [data-stage='accepted'] { color: var(--st-accepted); background: var(--st-accepted-bg); }
  [data-stage='released'] { color: var(--st-released); background: var(--st-released-bg); }
  [data-stage='stalled'] { color: var(--st-stalled); background: var(--st-stalled-bg); }
</style>

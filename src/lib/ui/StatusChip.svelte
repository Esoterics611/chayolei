<script lang="ts">
  // The status of a change (work, rule or money), with an icon and its tint.
  import type { ChangeStatus } from '$lib/team/types';
  import { t } from '$lib/team/i18n';
  import CircleDot from '@lucide/svelte/icons/circle-dot';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import BadgeCheck from '@lucide/svelte/icons/badge-check';
  import CircleX from '@lucide/svelte/icons/circle-x';
  import GitBranch from '@lucide/svelte/icons/git-branch';

  let { status, label }: { status: ChangeStatus; label?: string } = $props();

  const MAP = {
    open: { icon: CircleDot, tone: 'review' },
    reviewed: { icon: CircleCheck, tone: 'assigned' },
    changes_requested: { icon: RotateCcw, tone: 'changes' },
    accepted: { icon: BadgeCheck, tone: 'accepted' },
    passed: { icon: BadgeCheck, tone: 'accepted' },
    failed: { icon: CircleX, tone: 'stalled' },
    superseded: { icon: GitBranch, tone: 'open' },
  } as const;
  const s = $derived(MAP[status]);
</script>

<span class="chip" data-tone={s.tone}>
  <s.icon size={13} strokeWidth={2.25} />
  <span>{label ?? t(`change.status.${status}`)}</span>
</span>

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 22px;
    padding-inline: 7px 8px;
    border-radius: 999px;
    font-size: var(--fs-xs);
    font-weight: 500;
    white-space: nowrap;
    line-height: 1;
  }
  [data-tone='review'] { color: var(--st-review); background: var(--st-review-bg); }
  [data-tone='assigned'] { color: var(--st-assigned); background: var(--st-assigned-bg); }
  [data-tone='changes'] { color: var(--st-changes); background: var(--st-changes-bg); }
  [data-tone='accepted'] { color: var(--st-accepted); background: var(--st-accepted-bg); }
  [data-tone='stalled'] { color: var(--st-stalled); background: var(--st-stalled-bg); }
  [data-tone='open'] { color: var(--st-open); background: var(--st-open-bg); }
</style>

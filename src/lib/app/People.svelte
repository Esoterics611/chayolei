<script lang="ts">
  // Responsibility on one line: owner → reviewer ✓ approver (UX_REDESIGN.md §7.3).
  import type { Deliverable, Team } from '$lib/team/types';
  import { approverOf, reviewerOf } from '$lib/team/engine';
  import { member } from '$lib/team/rules';
  import { lt, t } from '$lib/team/i18n';
  import Avatar from '$lib/ui/Avatar.svelte';
  import Person from './Person.svelte';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Check from '@lucide/svelte/icons/check';

  let { team, d, compact = false, labels = false }: { team: Team; d: Deliverable; compact?: boolean; labels?: boolean } = $props();

  const owner = $derived(member(team, d.ownerId));
  const reviewer = $derived(member(team, reviewerOf(team, d)));
  const approver = $derived(member(team, approverOf(team, d)));
</script>

{#if compact}
  <span class="stack">
    {#if owner}<Avatar id={owner.id} initials={owner.initials} name="{t('people.owner')}: {lt(owner.name)}" size="xs" />{:else}<span class="slot" title={t('people.unassigned')}></span>{/if}
    <ArrowRight size={11} class="flip-rtl sep" />
    {#if reviewer}<Avatar id={reviewer.id} initials={reviewer.initials} name="{t('people.reviewer')}: {lt(reviewer.name)}" size="xs" />{/if}
    <Check size={11} class="sep" />
    {#if approver}<Avatar id={approver.id} initials={approver.initials} name="{t('people.approver')}: {lt(approver.name)}" size="xs" />{/if}
  </span>
{:else}
  <span class="line">
    <span class="who">
      {#if labels}<span class="lab">{t('people.owner')}</span>{/if}
      <Person {team} id={d.ownerId} first={!labels} />
    </span>
    <span class="who" title={t('people.reviewer')}>
      {#if labels}<span class="lab">{t('people.reviewer')}</span>{:else}<ArrowRight size={12} class="flip-rtl sep" />{/if}
      <Person {team} id={reviewerOf(team, d)} first={!labels} />
    </span>
    <span class="who" title={t('people.approver')}>
      {#if labels}<span class="lab">{t('people.approver')}</span>{:else}<Check size={12} class="sep" />{/if}
      <Person {team} id={approverOf(team, d)} first={!labels} />
    </span>
  </span>
{/if}

<style>
  .stack { display: inline-flex; align-items: center; gap: 3px; }
  .slot { width: 20px; height: 20px; border-radius: 999px; border: 1.5px dashed var(--rule-strong); }
  .stack :global(.sep), .line :global(.sep) { color: var(--ink-3); flex: none; }
  .line { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px 14px; font-size: var(--fs-sm); }
  .who { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
  .lab { font-size: var(--fs-xs); color: var(--ink-3); }
</style>

<script lang="ts">
  // Open proposals: rule changes and money requests waiting for a decision.
  import type { MoneyChange, RuleChange } from '$lib/team/types';
  import { store } from '$lib/team/store.svelte';
  import * as E from '$lib/team/engine';
  import { can, ruleValue, voters } from '$lib/team/rules';
  import { lt, t, fmtRelative, fmtTmim } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import ChangeCard from '$lib/ui/ChangeCard.svelte';
  import VoteTally from '$lib/ui/VoteTally.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import DecideHeader from '$lib/app/DecideHeader.svelte';
  import ChangeWhat from '$lib/app/ChangeWhat.svelte';
  import { firstName } from '$lib/app/format';
  import Gavel from '@lucide/svelte/icons/gavel';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';

  const team = $derived(store.team);
  const me = $derived(store.me);
  const now = $derived(store.now);
  const canVote = $derived(voters(team).some(m => m.id === me));
  const canSpend = $derived(can(team, me, 'spend'));
  const open = $derived(team.changes.filter((c): c is RuleChange | MoneyChange => c.kind !== 'work' && c.status === 'open').sort((a, b) => b.at.localeCompare(a.at)));
</script>

<svelte:head><title>{t('decide.title')} · {lt(team.name)}</title></svelte:head>

<DecideHeader subtitle={t('decide.membersCount', { n: team.members.filter(m => !m.ai).length })} />

{#if open.length}
  <div class="cards">
    {#each open as c (c.id)}
      {@const byVote = c.kind === 'rule' || c.decidedBy === 'vote'}
      {@const tl = byVote ? E.tally(team, c) : undefined}
      {@const myVote = c.votes.find(v => v.memberId === me)}
      <ChangeCard
        kind={c.kind}
        title={lt(c.title)}
        href={href(`/decide/p/${c.id}`)}
        status={c.status}
        compact
        headingLevel={2}
        meta={(c.kind === 'money' ? t('change.requestedBy', { name: firstName(team, c.proposerId), when: fmtRelative(c.at, now) }) : t('change.proposedBy', { name: firstName(team, c.proposerId), when: fmtRelative(c.at, now) }))}
        decider={byVote ? t('change.decider.vote', { majority: ruleValue(team, 'majority_pct'), quorum: ruleValue(team, 'quorum_pct'), when: fmtRelative(c.closesAt!, now) }) : t('change.decider.role', { limit: fmtTmim(ruleValue(team, 'spend_limit')) })}
      >
        <ChangeWhat {team} {c} compact />
        {#snippet aside()}
          {#if tl}<VoteTally {...tl} compact />{/if}
        {/snippet}
        {#snippet actions()}
          {#if myVote}<span class="voted">{t('decide.yourVote', { choice: t(`decide.vote.${myVote.choice}`) })}</span>{/if}
          <a class="btn btn-sm {(byVote && !myVote && canVote) || (!byVote && canSpend && c.proposerId !== me) ? 'btn-primary' : ''}" href={href(`/decide/p/${c.id}`)}>
            {byVote ? (myVote || !canVote ? t('common.open') : t('need.action.vote')) : canSpend && c.proposerId !== me ? t('need.action.approve_money') : t('common.open')}<ArrowRight size={14} class="flip-rtl" />
          </a>
        {/snippet}
      </ChangeCard>
    {/each}
  </div>
{:else}
  <EmptyState icon={Gavel} title={t('decide.open.empty')} hint={t('decide.open.emptyHint')} />
{/if}

<style>
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 440px), 1fr)); gap: var(--s4); align-items: start; }
  .voted { margin-inline-end: auto; font-size: var(--fs-sm); color: var(--ink-3); align-self: center; }
</style>

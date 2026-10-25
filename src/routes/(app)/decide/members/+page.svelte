<script lang="ts">
  // Members: charter roles and each person's record of work, from the ledger.
  // No leaderboard: people are listed in the order they joined.
  import { store } from '$lib/team/store.svelte';
  import * as E from '$lib/team/engine';
  import { memberBalance } from '$lib/team/ledger';
  import { lt, t, fmtDate, fmtNum } from '$lib/team/i18n';
  import Avatar from '$lib/ui/Avatar.svelte';
  import Amount from '$lib/ui/Amount.svelte';
  import DecideHeader from '$lib/app/DecideHeader.svelte';
  import { rolesOf } from '$lib/app/format';
  import BadgeCheck from '@lucide/svelte/icons/badge-check';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import BookOpenCheck from '@lucide/svelte/icons/book-open-check';

  const team = $derived(store.team);
  function record(id: string) {
    const accepted = team.ledger.filter(e => e.kind === 'accepted_paid' && e.refs.memberId === id).length;
    const reviews = team.ledger.filter(e => e.kind === 'reviewed' && e.actorId === id).length;
    const released = team.deliverables.filter(d => d.stage === 'released' && E.credits(team, d.id).some(c => c.memberId === id)).length;
    return { accepted, reviews, released };
  }
</script>

<svelte:head><title>{t('decide.tab.members')} · {lt(team.name)}</title></svelte:head>

<DecideHeader subtitle={t('decide.membersCount', { n: team.members.filter(m => !m.ai).length })} />

<ul class="members">
  {#each team.members as m (m.id)}
    {@const r = record(m.id)}
    <li class="panel">
      <div class="who">
        <Avatar id={m.id} initials={m.initials} name={lt(m.name)} ai={m.ai} size="lg" />
        <div>
          <p class="name">{lt(m.name)}{#if m.id === store.me}<span class="you"> ({t('common.you')})</span>{/if}</p>
          <p class="roles">{rolesOf(team, m.id)}</p>
          <p class="joined">{t('decide.joined', { date: fmtDate(m.joinedAt, { withYear: true }) })} · <code>{m.wallet.slice(0, 6)}…{m.wallet.slice(-4)}</code></p>
        </div>
      </div>
      <div class="rec">
        <p class="lab">{t('decide.members.record')}</p>
        <ul>
          <li><BadgeCheck size={14} />{t('decide.members.accepted', { n: fmtNum(r.accepted) })}</li>
          <li><CircleCheck size={14} />{t('decide.members.reviews', { n: fmtNum(r.reviews) })}</li>
          <li><BookOpenCheck size={14} />{t('decide.members.released', { n: fmtNum(r.released) })}</li>
        </ul>
      </div>
      <div class="bal">
        <p class="lab">{t('decide.members.balance')}</p>
        <Amount value={memberBalance(team, m.id)} />
      </div>
    </li>
  {/each}
</ul>

<style>
  .members { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: var(--s4); }
  .members > li { display: grid; grid-template-columns: 1fr auto; gap: 14px 16px; padding: var(--s5); }
  .who { grid-column: 1 / -1; display: flex; gap: 14px; align-items: center; }
  .name { font-weight: 600; font-size: var(--fs-lg); }
  .you { font-weight: 400; color: var(--ink-3); font-size: var(--fs-md); }
  .roles { font-size: var(--fs-sm); color: var(--accent-text); font-weight: 500; }
  .joined { font-size: var(--fs-xs); color: var(--ink-3); }
  .joined code { font-family: var(--font-mono); }
  .lab { font-size: var(--fs-xs); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-3); margin-block-end: 6px; }
  .rec ul { display: flex; flex-direction: column; gap: 3px; }
  .rec li { display: flex; align-items: center; gap: 7px; font-size: var(--fs-sm); color: var(--ink-2); }
  .rec li :global(svg) { color: var(--ink-3); }
  .bal { text-align: end; }
</style>

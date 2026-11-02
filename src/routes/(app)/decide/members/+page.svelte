<script lang="ts">
  // Members: charter roles and each person's record of work, from the ledger.
  // No leaderboard: people are listed in the order they joined. Roles change
  // by vote (a change card); anyone may leave; former members stay listed,
  // since their work is part of the record.
  import { store } from '$lib/team/store.svelte';
  import { ui } from '$lib/team/ui.svelte';
  import { activeMembers, can, leavesNoVoter } from '$lib/team/rules';
  import * as E from '$lib/team/engine';
  import { memberBalance } from '$lib/team/ledger';
  import { lt, t, fmtDate, fmtNum } from '$lib/team/i18n';
  import { go, href } from '$lib/team/nav';
  import Avatar from '$lib/ui/Avatar.svelte';
  import Amount from '$lib/ui/Amount.svelte';
  import DecideHeader from '$lib/app/DecideHeader.svelte';
  import { rolesOf } from '$lib/app/format';
  import type { Member } from '$lib/team/types';
  import BadgeCheck from '@lucide/svelte/icons/badge-check';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import BookOpenCheck from '@lucide/svelte/icons/book-open-check';
  import UserPlus from '@lucide/svelte/icons/user-plus';
  import UserCog from '@lucide/svelte/icons/user-cog';
  import LogOut from '@lucide/svelte/icons/log-out';
  import Vote from '@lucide/svelte/icons/vote';

  const team = $derived(store.team);
  const me = $derived(store.me);
  const current = $derived(activeMembers(team));
  const former = $derived(team.members.filter(m => m.leftAt).sort((a, b) => (b.leftAt ?? '').localeCompare(a.leftAt ?? '')));
  const mayPropose = $derived(can(team, me, 'propose'));

  function record(id: string) {
    const accepted = team.ledger.filter(e => e.kind === 'accepted_paid' && e.refs.memberId === id).length;
    const reviews = team.ledger.filter(e => e.kind === 'reviewed' && e.actorId === id).length;
    const released = team.deliverables.filter(d => d.stage === 'released' && E.credits(team, d.id).some(c => c.memberId === id)).length;
    return { accepted, reviews, released };
  }
  const openRoleChange = (id: string) => team.changes.find(c => c.kind === 'role' && c.memberId === id && c.status === 'open');

  function leave() {
    const mine = team.deliverables.filter(d => d.ownerId === me && ['assigned', 'in_progress', 'in_review', 'changes_requested'].includes(d.stage)).length;
    if (leavesNoVoter(team, me, [])) { ui.toast('error', t('err.last_voter')); return; }
    ui.askToSign({
      title: t('members.leaveTitle', { team: lt(team.name) }),
      lines: [
        mine ? t('members.leaveWork', { n: fmtNum(mine) }) : t('members.leaveNoWork'),
        t('members.leaveKeeps'),
        t('members.leaveRejoin'),
      ],
      confirmLabel: t('members.leave'),
      onConfirm: async () => {
        const ok = await store.do({ type: 'leave' }, t('members.left', { team: lt(team.name) }));
        if (!ok) return false;
        go('/');
      },
    });
  }
</script>

<svelte:head><title>{t('decide.tab.members')} · {lt(team.name)}</title></svelte:head>

<DecideHeader subtitle={t('decide.membersCount', { n: current.filter(m => !m.ai).length })} />

<p class="tools">
  {#if mayPropose}<button type="button" class="btn" onclick={() => ui.openDialog({ kind: 'proposeRoles' })}><UserCog size={15} />{t('decide.proposeRoles')}</button>{/if}
  {#if can(team, me, 'admit')}<button type="button" class="btn" onclick={() => ui.openDialog({ kind: 'invite' })}><UserPlus size={15} />{t('invite.title')}</button>{/if}
</p>

{#snippet card(m: Member)}
  {@const r = record(m.id)}
  {@const pending = m.leftAt ? undefined : openRoleChange(m.id)}
  <li class="panel" class:gone={!!m.leftAt}>
    <div class="who">
      <Avatar id={m.id} initials={m.initials} name={lt(m.name)} ai={m.ai} size="lg" />
      <div>
        <p class="name">{lt(m.name)}{#if m.id === me}<span class="you"> ({t('common.you')})</span>{/if}</p>
        {#if m.leftAt}
          <p class="joined">{t('members.leftOn', { date: fmtDate(m.leftAt, { withYear: true }) })}</p>
        {:else}
          <p class="roles">{rolesOf(team, m.id)}</p>
          <p class="joined">{t('decide.joined', { date: fmtDate(m.joinedAt, { withYear: true }) })} · <code>{m.wallet.slice(0, 6)}…{m.wallet.slice(-4)}</code></p>
        {/if}
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
    {#if !m.leftAt && (pending || (mayPropose && !m.ai) || m.id === me)}
      <div class="acts">
        {#if pending}
          <a class="pending" href={href(`/decide/p/${pending.id}`)}><Vote size={14} />{t('members.rolesVote')}</a>
        {:else if mayPropose && !m.ai}
          <button type="button" class="btn btn-sm btn-ghost" onclick={() => ui.openDialog({ kind: 'proposeRoles', memberId: m.id })}><UserCog size={14} />{t('members.changeRoles')}</button>
        {/if}
        {#if m.id === me}
          <button type="button" class="btn btn-sm btn-ghost leave" onclick={leave}><LogOut size={14} class="flip-rtl" />{t('members.leave')}</button>
        {/if}
      </div>
    {/if}
  </li>
{/snippet}

<ul class="members">
  {#each current as m (m.id)}{@render card(m)}{/each}
</ul>

{#if former.length}
  <h2 class="former">{t('members.former', { n: fmtNum(former.length) })}</h2>
  <ul class="members">
    {#each former as m (m.id)}{@render card(m)}{/each}
  </ul>
{/if}

<style>
  .tools { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; margin-block-end: var(--s4); }
  .members { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: var(--s4); }
  .members > li { display: grid; grid-template-columns: 1fr auto; gap: 14px 16px; padding: var(--s5); }
  .members > li.gone { background: var(--surface); }
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
  .acts { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding-block-start: 10px; border-block-start: 1px solid var(--rule); }
  .pending { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-sm); color: var(--accent-text); text-decoration: underline; min-height: 24px; }
  .leave { margin-inline-start: auto; }
  .former { font-size: var(--fs-md); font-weight: 600; color: var(--ink-2); margin-block: var(--s6) var(--s3); }
</style>

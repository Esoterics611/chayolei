<script lang="ts">
  // The change card for rules and money (UX_REDESIGN.md §7.6): what changes,
  // why, who decides and by when, the tally, the consequences, the vote or
  // the approval, then the discussion and the record.
  import { page } from '$app/state';
  import type { MoneyChange, RuleChange, VoteChoice } from '$lib/team/types';
  import { store } from '$lib/team/store.svelte';
  import { ui } from '$lib/team/ui.svelte';
  import * as E from '$lib/team/engine';
  import { can, ruleValue, voters } from '$lib/team/rules';
  import { lt, t, fmtRelative, fmtTmim } from '$lib/team/i18n';
  import { href, go } from '$lib/team/nav';
  import ChangeCard from '$lib/ui/ChangeCard.svelte';
  import VoteTally from '$lib/ui/VoteTally.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import ChangeWhat from '$lib/app/ChangeWhat.svelte';
  import Person from '$lib/app/Person.svelte';
  import LedgerList from '$lib/app/LedgerList.svelte';
  import NotFound from '$lib/app/NotFound.svelte';
  import { firstName, nameOf } from '$lib/app/format';
  import ThumbsUp from '@lucide/svelte/icons/thumbs-up';
  import ThumbsDown from '@lucide/svelte/icons/thumbs-down';
  import CircleSlash from '@lucide/svelte/icons/circle-slash';
  import FingerprintPattern from '@lucide/svelte/icons/fingerprint-pattern';
  import X from '@lucide/svelte/icons/x';
  import Timer from '@lucide/svelte/icons/timer';
  import Send from '@lucide/svelte/icons/send';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';

  const team = $derived(store.team);
  const me = $derived(store.me);
  const now = $derived(store.now);
  const any = $derived(team.changes.find(x => x.id === page.params.changeId));
  const c = $derived(any && any.kind !== 'work' ? (any as RuleChange | MoneyChange) : undefined);

  $effect(() => {
    // Work changes have their own card, next to the document.
    if (any?.kind === 'work') go(`/d/${any.deliverableId}/review/${any.id}`);
  });

  const byVote = $derived(!!c && (c.kind === 'rule' || c.decidedBy === 'vote'));
  const tl = $derived(c && byVote ? E.tally(team, c) : undefined);
  const myVote = $derived(c?.votes.find(v => v.memberId === me));
  const mayVote = $derived(!!c && c.status === 'open' && byVote && can(team, me, 'vote') && voters(team).some(m => m.id === me));
  const mayApprove = $derived(!!c && c.kind === 'money' && c.decidedBy === 'role' && c.status === 'open' && can(team, me, 'spend') && c.proposerId !== me);
  const thread = $derived(c ? E.messagesFor(team, { type: 'change', id: c.id }) : []);
  const history = $derived(c ? team.ledger.filter(e => e.refs.changeId === c.id) : []);

  const consequences = $derived.by(() => {
    if (!c) return [];
    if (c.kind === 'rule') return [t('decide.ifPasses.rule')];
    if (c.action.type === 'transfer') {
      return [
        t('decide.ifPasses.transfer', { amount: fmtTmim(c.action.amount), name: nameOf(team, c.action.to) }),
        t('decide.accountAfter', { amount: fmtTmim(team.treasury.teamAccount - c.action.amount) }),
      ];
    }
    const o = team.objectives.find(x => x.id === (c.action as { objectiveId: string }).objectiveId);
    return [t('decide.ifPasses.budget', { objective: lt(o?.title), to: fmtTmim(c.action.to) })];
  });
  const warnings = $derived(c && c.status === 'open' && c.kind === 'money' && c.action.type === 'transfer' && c.action.amount > team.treasury.teamAccount
    ? [t('err.insufficient', { account: fmtTmim(team.treasury.teamAccount), amount: fmtTmim(c.action.amount) })] : []);

  let message = $state('');

  function castVote(choice: VoteChoice) {
    if (!c) return;
    ui.askToSign({
      title: t('decide.signVote', { choice: t(`decide.vote.${choice}`) }),
      lines: [t('decide.signVoteLine', { title: lt(c.title) }), t('decide.signVoteChange')],
      confirmLabel: t(`decide.vote.${choice}`),
      onConfirm: () => !!store.run((tm, m, n) => { E.vote(tm, m, c.id, choice, n); return true; }, t('decide.voted')),
    });
  }
  function closeNow() {
    if (!c) return;
    ui.askToSign({
      title: t('decide.signClose', { title: lt(c.title) }),
      lines: [t('decide.signCloseLine'), ...(tl ? [t('decide.tally', { for: tl.forVotes, against: tl.against, abstain: tl.abstain })] : [])],
      confirmLabel: t('decide.close'),
      onConfirm: () => !!store.run((tm, m, n) => { E.closeVoting(tm, m, c.id, n); return true; }),
    });
  }
  function approve() {
    if (!c) return;
    ui.askToSign({
      title: t('decide.signApprove', { title: lt(c.title) }),
      lines: consequences,
      warnings,
      confirmLabel: t('decide.approve'),
      onConfirm: () => !!store.run((tm, m, n) => { E.approveMoney(tm, m, c.id, n); return true; }, t('decide.approved')),
    });
  }
  function decline() {
    if (!c) return;
    ui.askToSign({
      title: t('decide.signDecline', { title: lt(c.title) }),
      lines: [t('decide.signDeclineLine')],
      confirmLabel: t('decide.decline'),
      onConfirm: () => !!store.run((tm, m, n) => { E.declineMoney(tm, m, c.id, n); return true; }, t('decide.declined')),
    });
  }
  function send(e: SubmitEvent) {
    e.preventDefault();
    if (!c) return;
    const ok = store.run((tm, m, n) => { E.postMessage(tm, m, { type: 'change', id: c.id }, message, n); return true; });
    if (ok) message = '';
  }

  const decider = $derived.by(() => {
    if (!c) return '';
    if (byVote) {
      const when = c.status === 'open' ? fmtRelative(c.closesAt!, now) : fmtRelative(c.decidedAt ?? c.closesAt!, now);
      return t('change.decider.vote', { majority: ruleValue(team, 'majority_pct'), quorum: ruleValue(team, 'quorum_pct'), when });
    }
    return t('change.decider.role', { limit: fmtTmim(ruleValue(team, 'spend_limit')) });
  });
  const outcome = $derived.by(() => {
    if (!c || c.status === 'open') return '';
    if (c.kind === 'money' && c.decidedBy === 'role') return c.status === 'accepted' ? t('decide.outcome.accepted', { name: firstName(team, c.approvedBy) }) : t('decide.outcome.declined', { name: firstName(team, c.approvedBy) });
    const e = team.ledger.find(x => (x.kind === 'change_passed' || x.kind === 'change_failed') && x.refs.changeId === c.id);
    return c.status === 'passed' ? t('decide.outcome.passed', { pct: e?.data?.forPct ?? 0, turnout: e?.data?.turnout ?? 0 }) : t('decide.outcome.failed');
  });
</script>

<svelte:head><title>{c ? lt(c.title) : t('decide.title')} · {lt(team.name)}</title></svelte:head>

{#if !c}
  {#if !any}<NotFound back="/decide" />{/if}
{:else}
  <a class="back" href={href(c.status === 'open' ? '/decide' : '/decide/log')}><ArrowLeft size={15} class="flip-rtl" />{t(c.status === 'open' ? 'decide.tab.open' : 'decide.tab.log')}</a>

  <div class="layout">
    <div class="main">
      <ChangeCard
        kind={c.kind}
        title={lt(c.title)}
        status={c.status}
        meta={c.kind === 'money' ? t('change.requestedBy', { name: firstName(team, c.proposerId), when: fmtRelative(c.at, now) }) : t('change.proposedBy', { name: firstName(team, c.proposerId), when: fmtRelative(c.at, now) })}
        why={lt(c.why)}
        {decider}
        consequencesTitle={c.kind === 'money' && c.decidedBy === 'role' ? t('change.consequences') : t('change.consequences.passed')}
        consequences={c.status === 'open' ? consequences : []}
        {warnings}
      >
        <ChangeWhat {team} {c} />
        {#snippet aside()}
          {#if tl}<VoteTally {...tl} />{/if}
        {/snippet}
        {#snippet actions()}
          {#if c.status !== 'open'}
            <p class="outcome">{outcome}</p>
          {:else if byVote}
            {#if myVote}<p class="mine">{t('decide.yourVote', { choice: t(`decide.vote.${myVote.choice}`) })}</p>{/if}
            {#if c.proposerId === me}<button type="button" class="btn btn-ghost" onclick={closeNow} title={t('decide.closeHint')}><Timer size={15} />{t('decide.close')}</button>{/if}
            {#if mayVote}
              <div class="vote" role="group" aria-label={myVote ? t('decide.changeVote') : t('need.action.vote')}>
                <button type="button" class="btn" aria-pressed={myVote?.choice === 'abstain'} onclick={() => castVote('abstain')}><CircleSlash size={15} />{t('decide.vote.abstain')}</button>
                <button type="button" class="btn" aria-pressed={myVote?.choice === 'against'} onclick={() => castVote('against')}><ThumbsDown size={15} />{t('decide.vote.against')}</button>
                <button type="button" class="btn btn-primary" aria-pressed={myVote?.choice === 'for'} onclick={() => castVote('for')}><FingerprintPattern size={15} />{t('decide.vote.for')}</button>
              </div>
            {/if}
          {:else if mayApprove}
            <button type="button" class="btn" onclick={decline}><X size={15} />{t('decide.decline')}</button>
            <button type="button" class="btn btn-primary" disabled={warnings.length > 0} onclick={approve}><FingerprintPattern size={15} />{t('decide.approve')}</button>
          {:else}
            <p class="mine">{c.proposerId === me ? t('decide.youProposed') : t('decide.waitingRole')}</p>
          {/if}
        {/snippet}
      </ChangeCard>

      <section class="thread" aria-labelledby="th-h">
        <h2 id="th-h" class="h">{t('decide.thread')}</h2>
        {#each thread as m (m.id)}
          <div class="msg">
            <Person {team} id={m.authorId} size="sm" />
            <span class="when">{fmtRelative(m.at, now)}</span>
            <p dir="auto">{lt(m.body)}</p>
          </div>
        {/each}
        <form class="composer" onsubmit={send}>
          <textarea class="input" rows="2" bind:value={message} placeholder={t('d.threadPlaceholder')} aria-label={t('d.threadPlaceholder')} dir="auto" required></textarea>
          <button type="submit" class="btn"><Send size={15} class="flip-rtl" />{t('d.send')}</button>
        </form>
      </section>
    </div>

    <aside class="side">
      {#if byVote}
        <section class="panel box">
          <h2 class="h">{t('decide.voters')}</h2>
          <p class="sub">{t('decide.waitingVotes', { n: c.votes.length, total: voters(team).length })}</p>
          <ul class="voters">
            {#each voters(team) as m (m.id)}
              {@const v = c.votes.find(x => x.memberId === m.id)}
              <li>
                <Avatar id={m.id} initials={m.initials} name={lt(m.name)} size="xs" />
                <span class="vn">{lt(m.name)}</span>
                {#if v}
                  <span class="choice" data-choice={v.choice}>
                    {#if v.choice === 'for'}<ThumbsUp size={12} />{:else if v.choice === 'against'}<ThumbsDown size={12} />{:else}<CircleSlash size={12} />{/if}
                    {t(`decide.vote.${v.choice}`)}
                  </span>
                {:else}
                  <span class="choice none">{t('decide.notVoted')}</span>
                {/if}
              </li>
            {/each}
          </ul>
        </section>
      {/if}
      <section class="panel box">
        <h2 class="h">{t('decide.history')}</h2>
        <LedgerList {team} entries={history} grouped={false} compact {now} />
      </section>
    </aside>
  </div>
{/if}

<style>
  .back { display: inline-flex; align-items: center; gap: 6px; margin-block-end: var(--s4); font-size: var(--fs-sm); color: var(--ink-3); }
  .back:hover { color: var(--accent-text); }
  .layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: var(--s6); align-items: start; }
  .main { display: flex; flex-direction: column; gap: var(--s6); min-width: 0; }
  .side { display: flex; flex-direction: column; gap: var(--s4); position: sticky; inset-block-start: 76px; }
  .box { padding: var(--s4); }
  .h { font-size: var(--fs-sm); font-weight: 600; color: var(--ink-2); margin-block-end: 8px; }
  .sub { font-size: var(--fs-xs); color: var(--ink-3); margin-block: -4px 10px; }
  .outcome { margin-inline-end: auto; font-weight: 500; color: var(--ink-2); }
  .mine { margin-inline-end: auto; align-self: center; font-size: var(--fs-sm); color: var(--ink-3); }
  .vote { display: flex; gap: 6px; flex-wrap: wrap; }
  .vote .btn[aria-pressed='true']:not(.btn-primary) { border-color: var(--ink); }
  .voters { display: flex; flex-direction: column; gap: 8px; }
  .voters li { display: flex; align-items: center; gap: 8px; font-size: var(--fs-sm); }
  .vn { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .choice { display: inline-flex; align-items: center; gap: 4px; font-size: var(--fs-xs); font-weight: 500; padding: 2px 7px; border-radius: 999px; }
  [data-choice='for'] { color: var(--st-accepted); background: var(--st-accepted-bg); }
  [data-choice='against'] { color: var(--st-changes); background: var(--st-changes-bg); }
  [data-choice='abstain'] { color: var(--st-open); background: var(--st-open-bg); }
  .choice.none { color: var(--ink-3); font-weight: 400; }
  .thread { display: flex; flex-direction: column; gap: var(--s3); }
  .msg { display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; align-items: center; }
  .msg .when { justify-self: end; font-size: var(--fs-xs); color: var(--ink-3); }
  .msg p { grid-column: 1 / -1; padding: 10px 14px; border-radius: var(--r-md); background: var(--surface-raised); border: 1px solid var(--rule); }
  .composer { display: flex; gap: 8px; align-items: flex-end; }
  .composer .input { flex: 1; }
  @media (max-width: 1099px) {
    .layout { grid-template-columns: minmax(0, 1fr); }
    .side { position: static; }
  }
  @media (max-width: 639px) {
    .vote { width: 100%; }
    .vote .btn { flex: 1; }
    .composer { flex-direction: column; align-items: stretch; }
  }
</style>

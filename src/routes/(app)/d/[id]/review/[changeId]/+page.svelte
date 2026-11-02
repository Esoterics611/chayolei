<script lang="ts">
  // The change card for work (UX_REDESIGN.md §7.5): the diff from the last
  // round, comments anchored to paragraphs, who reviews and who accepts, and
  // exactly what accepting pays, from which budget, under which rule.
  import { page } from '$app/state';
  import type { WorkChange } from '$lib/team/types';
  import { store } from '$lib/team/store.svelte';
  import { ui } from '$lib/team/ui.svelte';
  import * as E from '$lib/team/engine';
  import { can, ruleCurrent, ruleValue } from '$lib/team/rules';
  import { objectiveFigures } from '$lib/team/ledger';
  import { lt, t, fmtRelative, fmtTmim } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import ChangeCard from '$lib/ui/ChangeCard.svelte';
  import TextDiff from '$lib/ui/TextDiff.svelte';
  import Person from '$lib/app/Person.svelte';
  import NotFound from '$lib/app/NotFound.svelte';
  import { firstName, objectiveTitle } from '$lib/app/format';
  import MessageSquarePlus from '@lucide/svelte/icons/message-square-plus';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import Circle from '@lucide/svelte/icons/circle';
  import BadgeCheck from '@lucide/svelte/icons/badge-check';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import FingerprintPattern from '@lucide/svelte/icons/fingerprint-pattern';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import Info from '@lucide/svelte/icons/info';
  import Quote from '@lucide/svelte/icons/quote';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import AiMark from '$lib/ui/AiMark.svelte';
  import RichText from '$lib/ui/RichText.svelte';

  const team = $derived(store.team);
  const me = $derived(store.me);
  const now = $derived(store.now);
  const d = $derived(team.deliverables.find(x => x.id === page.params.id));
  const c = $derived(team.changes.find((x): x is WorkChange => x.kind === 'work' && x.id === page.params.changeId));

  const from = $derived(d && c ? E.versionById(d, c.fromVersionId) : undefined);
  const to = $derived(d && c ? E.versionById(d, c.toVersionId) : undefined);
  const reviewer = $derived(d ? E.reviewerOf(team, d) : undefined);
  const approver = $derived(d ? E.approverOf(team, d) : undefined);
  const isReviewer = $derived(reviewer === me && d?.ownerId !== me);
  const isApprover = $derived(approver === me && d?.ownerId !== me && can(team, me, 'accept_work'));
  const latestRound = $derived(d ? E.workChangesOf(team, d.id)[0] : undefined);

  // What acceptance pays: the reward to the owner and, when reviewed by someone else, the review reward.
  const reviewReward = $derived(c?.reviewedBy ? (c.reviewedBy !== d?.ownerId ? ruleValue(team, 'review_reward') : 0) : ruleValue(team, 'review_reward'));
  const preview = $derived(c && c.status === 'reviewed' ? E.acceptancePreview(team, c.id, now) : undefined);
  const o = $derived(d ? team.objectives.find(x => x.id === d.objectiveId) : undefined);
  const figures = $derived(o ? objectiveFigures(team, o) : undefined);
  const rewardRule = $derived(ruleCurrent(team, 'deliverable_reward'));

  const consequences = $derived.by(() => {
    if (!d || !c || !to) return [];
    const lines = [t('review.becomes', { v: `v${to.n}` }), t('review.pays', { amount: fmtTmim(d.reward), name: firstName(team, d.ownerId) })];
    const rv = c.reviewedBy ?? reviewer;
    if (reviewReward && rv) lines.push(t('review.paysReview', { amount: fmtTmim(reviewReward), name: firstName(team, rv) }));
    const left = preview ? preview.available : (figures?.left ?? 0) + d.reward + ruleValue(team, 'review_reward');
    lines.push(t('review.fromBudget', { objective: objectiveTitle(team, d.objectiveId), left: fmtTmim(left) }));
    if (preview) lines.push(t('review.capLine', { issued: fmtTmim(preview.issued), cap: fmtTmim(preview.cap) }));
    if (d.reward === rewardRule.value) lines.push(t('review.underRule', { rule: t('rule.deliverable_reward'), v: rewardRule.version }));
    return lines;
  });
  const warnings = $derived(preview ? [
    ...(!preview.withinBudget ? [t('review.overBudget', { left: fmtTmim(preview.available) })] : []),
    ...(!preview.withinCap ? [t('review.overCap')] : []),
  ] : []);

  const general = $derived(c ? c.comments.filter(x => x.paragraph === undefined) : []);
  const anchored = (i: number) => (c ? c.comments.filter(x => x.paragraph === i) : []);

  let composing = $state<number | null>(null);
  let draft = $state('');
  let generalDraft = $state('');

  async function addComment(paragraph: number | undefined, body: string) {
    if (!c) return false;
    return !!(await store.do({ type: 'comment', changeId: c.id, body, paragraph }, t('review.commented')));
  }
  async function submitAnchored(e: SubmitEvent, i: number) {
    e.preventDefault();
    if (await addComment(i, draft)) { draft = ''; composing = null; }
  }
  async function submitGeneral(e: SubmitEvent) {
    e.preventDefault();
    if (await addComment(undefined, generalDraft)) generalDraft = '';
  }
  function markReviewed() {
    if (!c) return;
    void store.do({ type: 'markReviewed', changeId: c.id }, t('review.marked'));
  }
  function accept() {
    if (!c || !d) return;
    ui.askToSign({
      title: t('review.signAccept', { title: lt(d.title) }),
      lines: consequences,
      warnings,
      confirmLabel: t('review.accept'),
      onConfirm: async () => !!(await store.do({ type: 'acceptAndPay', changeId: c.id }, t('review.done'))),
    });
  }
  const statusLabel = $derived(c?.status === 'open' ? t('review.waitingReview', { name: firstName(team, reviewer) }) : undefined);
</script>

<svelte:head><title>{d ? lt(d.title) : ''} · {t('d.tab.reviews')}</title></svelte:head>

{#if !d || !c || !to}
  <NotFound back="/work" />
{:else}
  <a class="back" href={href(`/d/${d.id}/reviews`)}><ArrowLeft size={15} class="flip-rtl" />{lt(d.title)}</a>

  {#if c.status === 'superseded' && latestRound}
    <p class="banner"><Info size={15} />{t('review.superseded')} <a href={href(`/d/${d.id}/review/${latestRound.id}`)}>{t('d.openReview')}</a></p>
  {/if}

  <div class="layout">
    <div class="main">
      <ChangeCard
        kind="work"
        title={from ? t('review.title', { from: `v${from.n}`, to: `v${to.n}` }) : t('review.firstTitle', { to: `v${to.n}` })}
        status={c.status}
        {statusLabel}
        meta={t('change.requestedBy', { name: firstName(team, c.proposerId), when: fmtRelative(c.at, now) })}
        decider={t('change.decider.work', { name: firstName(team, approver), reviewer: firstName(team, reviewer) })}
        consequences={c.status === 'open' || c.status === 'reviewed' ? consequences : []}
        {warnings}
      >
        <p class="vnote"><Quote size={14} /><span><strong>v{to.n}</strong> <bdi>{lt(to.note)}</bdi></span><span class="by">{firstName(team, to.authorId)}</span></p>
        <TextDiff from={from?.paragraphs ?? []} to={to.paragraphs}>
          {#snippet annotate(i)}
            {#each anchored(i) as cm (cm.id)}
              <div class="cm">
                <Person {team} id={cm.authorId} first />
                <span class="when">{#if cm.assist}<AiMark compact helper={cm.assist} /> {/if}{fmtRelative(cm.at, now)}</span>
                <p dir="auto"><RichText text={lt(cm.body)} /></p>
              </div>
            {/each}
            {#if composing === i}
              <form class="cm-form" onsubmit={(e) => submitAnchored(e, i)}>
                <!-- svelte-ignore a11y_autofocus -->
                <textarea class="input" rows="2" bind:value={draft} placeholder={t('review.commentPlaceholder')} aria-label={t('review.yourComment', { n: i + 1 })} dir="auto" autofocus required></textarea>
                <div class="cm-actions">
                  <button type="button" class="btn btn-sm btn-ghost" onclick={() => (composing = null)}>{t('review.cancel')}</button>
                  <button type="submit" class="btn btn-sm btn-primary">{t('review.comment')}</button>
                </div>
              </form>
            {:else if c.status === 'open' || c.status === 'reviewed'}
              <button type="button" class="add-cm" onclick={() => { composing = i; draft = ''; }}>
                <MessageSquarePlus size={13} />{t('review.yourComment', { n: i + 1 })}
              </button>
            {/if}
          {/snippet}
        </TextDiff>

        {#snippet actions()}
          {#if (c.status === 'open' && isReviewer) || (c.status === 'reviewed' && isApprover)}
            <button type="button" class="btn btn-ghost helper" onclick={() => ui.openDialog({ kind: 'aiReview', changeId: c.id })}><Sparkles size={15} />{t('helper.ask.review')}</button>
          {/if}
          {#if c.status === 'open' && isReviewer}
            <button type="button" class="btn" onclick={() => ui.openDialog({ kind: 'requestChanges', changeId: c.id })}><RotateCcw size={15} />{t('review.requestChanges')}</button>
            <button type="button" class="btn btn-primary" onclick={markReviewed}><CircleCheck size={15} />{t('review.markReviewed')}</button>
          {:else if c.status === 'reviewed' && isApprover}
            <button type="button" class="btn" onclick={() => ui.openDialog({ kind: 'requestChanges', changeId: c.id })}><RotateCcw size={15} />{t('review.requestChanges')}</button>
            <button type="button" class="btn btn-primary" disabled={warnings.length > 0} onclick={accept}><FingerprintPattern size={15} />{t('review.accept')}</button>
          {:else if c.status === 'open'}
            <p class="wait">{t('review.waitingReview', { name: firstName(team, reviewer) })}</p>
          {:else if c.status === 'reviewed'}
            <p class="wait">{t('review.waitingAccept', { name: firstName(team, approver) })}</p>
          {:else if c.status === 'accepted'}
            <p class="wait done"><BadgeCheck size={15} />{t('review.outcome.accepted', { name: firstName(team, c.decidedBy), when: fmtRelative(c.decidedAt!, now) })}</p>
          {:else if c.status === 'changes_requested'}
            <p class="wait"><RotateCcw size={15} />{t('review.outcome.changes', { name: firstName(team, c.decidedBy), when: fmtRelative(c.decidedAt!, now) })}</p>
          {/if}
        {/snippet}
      </ChangeCard>
    </div>

    <aside class="side">
      <section class="panel steps">
        <h2 class="h">{t('review.decision')}</h2>
        <ol>
          <li class:done={!!c.reviewedBy || c.status === 'accepted'} class:now={c.status === 'open'}>
            <span class="mark">{#if c.reviewedBy}<CircleCheck size={18} />{:else}<Circle size={18} />{/if}</span>
            <div>
              <p class="st">{t('review.step.review')}</p>
              <Person {team} id={c.reviewedBy ?? reviewer} first />
              {#if c.reviewedBy}<p class="sub">{t('review.reviewedBy', { name: firstName(team, c.reviewedBy) })}</p>{/if}
            </div>
          </li>
          <li class:done={c.status === 'accepted'} class:now={c.status === 'reviewed'}>
            <span class="mark">{#if c.status === 'accepted'}<BadgeCheck size={18} />{:else}<Circle size={18} />{/if}</span>
            <div>
              <p class="st">{t('review.step.accept')}</p>
              <Person {team} id={approver} first />
              <p class="sub">{fmtTmim(d.reward + reviewReward)}</p>
            </div>
          </li>
        </ol>
      </section>

      <section class="panel general">
        <h2 class="h">{t('review.general')}</h2>
        {#each general as cm (cm.id)}
          <div class="cm">
            <Person {team} id={cm.authorId} first />
            <span class="when">{#if cm.assist}<AiMark compact helper={cm.assist} /> {/if}{fmtRelative(cm.at, now)}</span>
            <p dir="auto"><RichText text={lt(cm.body)} /></p>
          </div>
        {:else}
          <p class="muted small">—</p>
        {/each}
        <form class="cm-form" onsubmit={submitGeneral}>
          <textarea class="input" rows="2" bind:value={generalDraft} placeholder={t('review.commentPlaceholder')} aria-label={t('review.addComment')} required></textarea>
          <button type="submit" class="btn btn-sm">{t('review.comment')}</button>
        </form>
      </section>
    </aside>
  </div>
{/if}

<style>
  .helper { margin-inline-end: auto; }
  .back { display: inline-flex; align-items: center; gap: 6px; margin-block-end: var(--s4); font-size: var(--fs-sm); color: var(--ink-3); }
  .back:hover { color: var(--accent-text); }
  .banner { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-block-end: var(--s4); padding: 10px 14px; border-radius: var(--r-sm); background: var(--surface-2); font-size: var(--fs-sm); }
  .banner a { color: var(--accent-text); font-weight: 500; }
  .layout { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: var(--s6); align-items: start; }
  .main { min-width: 0; }
  .side { position: sticky; inset-block-start: 76px; display: flex; flex-direction: column; gap: var(--s4); }
  .h { font-size: var(--fs-sm); font-weight: 600; color: var(--ink-2); margin-block-end: 10px; }
  .steps, .general { padding: var(--s4); }
  .steps ol { position: relative; display: flex; flex-direction: column; gap: 14px; }
  .steps ol::before { content: ''; position: absolute; inset-block: 18px; inset-inline-start: 8px; width: 2px; background: var(--rule); }
  .steps li { position: relative; display: flex; gap: 10px; }
  .mark { position: relative; z-index: 1; display: grid; place-items: center; background: var(--surface-raised); color: var(--ink-3); height: 20px; }
  .steps li.done .mark { color: var(--st-accepted); }
  .steps li.now .mark { color: var(--st-review); }
  .st { font-size: var(--fs-xs); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-3); margin-block-end: 4px; }
  .sub { font-size: var(--fs-xs); color: var(--ink-3); margin-block-start: 3px; font-variant-numeric: tabular-nums; }
  .small { font-size: var(--fs-sm); }
  .cm { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 4px 8px; margin-block: 8px 4px; font-family: var(--font-ui); font-size: var(--fs-sm); line-height: 1.5; }
  .cm .when { justify-self: end; font-size: var(--fs-xs); color: var(--ink-3); }
  .cm p { grid-column: 1 / -1; padding: 8px 12px; border-radius: var(--r-sm); background: var(--surface-raised); border: 1px solid var(--rule); color: var(--ink); }
  .general .cm p { background: var(--surface); }
  .cm-form { display: flex; flex-direction: column; gap: 6px; margin-block: 8px 4px; font-family: var(--font-ui); }
  .cm-actions { display: flex; justify-content: flex-end; gap: 6px; }
  .general .cm-form { align-items: flex-end; }
  .add-cm { position: absolute; inset-block-start: 8px; inset-inline-end: 8px; display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 999px; border: 1px solid var(--rule); background: var(--surface-raised); font-family: var(--font-ui); font-size: var(--fs-xs); color: var(--ink-3); opacity: 0; transition: opacity var(--fast); }
  :global(.para:hover) .add-cm, .add-cm:focus-visible { opacity: 1; }
  .add-cm:hover { color: var(--accent-text); border-color: var(--accent); }
  .vnote { display: flex; align-items: center; gap: 8px; margin-block-end: var(--s4); padding: 10px 12px; border-radius: var(--r-sm); background: var(--surface); color: var(--ink-2); }
  .vnote :global(svg) { color: var(--ink-3); flex: none; }
  .vnote strong { font-family: var(--font-mono); font-weight: 500; color: var(--ink); margin-inline-end: 4px; }
  .vnote .by { margin-inline-start: auto; font-size: var(--fs-sm); color: var(--ink-3); }
  .wait { display: inline-flex; align-items: center; gap: 6px; margin-inline-end: auto; font-size: var(--fs-sm); color: var(--ink-3); }
  .wait.done { color: var(--st-accepted); }
  @media (hover: none) { .add-cm { opacity: 1; } }
  @media (max-width: 1099px) {
    .layout { grid-template-columns: minmax(0, 1fr); }
    .side { position: static; }
  }
</style>

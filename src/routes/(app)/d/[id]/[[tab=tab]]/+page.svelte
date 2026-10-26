<script lang="ts">
  // A deliverable as a "repository": overview, the work (document, versions,
  // compare), tasks, review requests, its thread and its history on the ledger.
  import { page } from '$app/state';
  import type { Version } from '$lib/team/types';
  import { store } from '$lib/team/store.svelte';
  import * as E from '$lib/team/engine';
  import { can, ruleValue } from '$lib/team/rules';
  import { objectiveFigures } from '$lib/team/ledger';
  import { lt, t, fmtDate, fmtNum, fmtRelative, fmtTmim } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import type { Tab } from '../../../../../params/tab';
  import Tabs from '$lib/ui/Tabs.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import StatusChip from '$lib/ui/StatusChip.svelte';
  import Amount from '$lib/ui/Amount.svelte';
  import TextDiff from '$lib/ui/TextDiff.svelte';
  import DeliverableHeader from '$lib/app/DeliverableHeader.svelte';
  import VersionList from '$lib/app/VersionList.svelte';
  import Doc from '$lib/app/Doc.svelte';
  import Person from '$lib/app/Person.svelte';
  import LedgerList from '$lib/app/LedgerList.svelte';
  import NotFound from '$lib/app/NotFound.svelte';
  import { firstName, objectiveTitle } from '$lib/app/format';
  import FileText from '@lucide/svelte/icons/file-text';
  import ListChecks from '@lucide/svelte/icons/list-checks';
  import GitPullRequest from '@lucide/svelte/icons/git-pull-request';
  import MessageSquare from '@lucide/svelte/icons/message-square';
  import Square from '@lucide/svelte/icons/square';
  import SquareCheck from '@lucide/svelte/icons/square-check';
  import Plus from '@lucide/svelte/icons/plus';
  import Send from '@lucide/svelte/icons/send';
  import GitCompare from '@lucide/svelte/icons/git-compare';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Lock from '@lucide/svelte/icons/lock';
  import FingerprintPattern from '@lucide/svelte/icons/fingerprint-pattern';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';

  const team = $derived(store.team);
  const me = $derived(store.me);
  const now = $derived(store.now);
  const d = $derived(team.deliverables.find(x => x.id === page.params.id));
  const tab = $derived((page.params.tab ?? 'overview') as Tab);

  const versions = $derived(d ? E.versionsOf(d) : []);
  const tasks = $derived(d ? E.tasksOf(team, d.id) : []);
  const rounds = $derived(d ? E.workChangesOf(team, d.id) : []);
  const thread = $derived(d ? E.messagesFor(team, { type: 'deliverable', id: d.id }) : []);
  const history = $derived(d ? team.ledger.filter(e => e.refs.deliverableId === d.id) : []);
  const isOwner = $derived(d?.ownerId === me);
  const canPlan = $derived(can(team, me, 'manage_plan'));

  // Work tab: which version is shown, and whether it is compared with the one before.
  let selectedId = $state<string | undefined>();
  let comparing = $state(false);
  const selected = $derived(d ? (E.versionById(d, selectedId) ?? E.latestVersion(d) ?? E.draftOf(d)) : undefined);
  const previous = $derived(d && selected ? versions.filter(v => v.n < selected.n).at(-1) : undefined);
  function select(v: Version) { selectedId = v.id; }

  const shownText = $derived(d ? (E.versionById(d, d.acceptedVersionId) ?? E.latestVersion(d)) : undefined);
  const credits = $derived(d && (d.stage === 'released' || d.stage === 'accepted') ? E.credits(team, d.id) : []);
  const fingerprint = $derived(history.find(e => e.kind === 'released')?.data?.fingerprint);

  let taskTitle = $state('');
  let taskOwner = $state('');
  let message = $state('');

  async function addTask(e: SubmitEvent) {
    e.preventDefault();
    if (!d) return;
    const ok = await store.do({ type: 'addTask', deliverableId: d.id, title: taskTitle, ownerId: taskOwner || undefined });
    if (ok) { taskTitle = ''; }
  }
  function toggle(id: string, done: boolean) {
    void store.do({ type: 'setTaskDone', taskId: id, done });
  }
  async function send(e: SubmitEvent) {
    e.preventDefault();
    if (!d) return;
    const ok = await store.do({ type: 'postMessage', ref: { type: 'deliverable', id: d.id }, body: message });
    if (ok) message = '';
  }
</script>

<svelte:head><title>{d ? lt(d.title) : t('nav.work')} · {lt(team.name)}</title></svelte:head>

{#if !d}
  <NotFound back="/plan" />
{:else}
  <DeliverableHeader {team} {d} {me} {now} />

  <Tabs
    label={lt(d.title)}
    items={[
      { href: href(`/d/${d.id}`), label: t('d.tab.overview'), active: tab === 'overview' },
      { href: href(`/d/${d.id}/work`), label: t('d.tab.work'), count: versions.length, active: tab === 'work' },
      { href: href(`/d/${d.id}/tasks`), label: t('d.tab.tasks'), count: tasks.length ? `${tasks.filter(x => x.done).length}/${tasks.length}` : 0, active: tab === 'tasks' },
      { href: href(`/d/${d.id}/reviews`), label: t('d.tab.reviews'), count: rounds.length, active: tab === 'reviews' },
      { href: href(`/d/${d.id}/thread`), label: t('d.tab.thread'), count: thread.length, active: tab === 'thread' },
      { href: href(`/d/${d.id}/history`), label: t('d.tab.history'), count: history.length, active: tab === 'history' },
    ]}
  />

  {#if tab === 'overview'}
    {@const o = team.objectives.find(x => x.id === d.objectiveId)}
    {@const f = o ? objectiveFigures(team, o) : undefined}
    <div class="ov">
      <div class="ov-main">
        <section>
          <h2 class="h">{t('d.scope')}</h2>
          <p class="scope">{lt(d.scope)}</p>
        </section>
        <section>
          <div class="h-row">
            <h2 class="h">{shownText && d.acceptedVersionId === shownText.id ? t('d.acceptedText', { n: shownText.n }) : t('d.current')}</h2>
            {#if shownText}<a class="link" href={href(`/d/${d.id}/work`)}>{t('d.tab.work')}<ArrowRight size={13} class="flip-rtl" /></a>{/if}
          </div>
          {#if shownText}
            <div class="excerpt"><Doc paragraphs={shownText.paragraphs.slice(0, 3)} /></div>
          {:else}
            <EmptyState icon={FileText} title={t('d.noVersions')} hint={t('d.noVersionsHint')} compact>
              {#if isOwner}<a class="btn btn-sm btn-primary" href={href(`/d/${d.id}/edit`)}><Pencil size={14} />{t('d.startDraft')}</a>{/if}
            </EmptyState>
          {/if}
        </section>
        {#if credits.length}
          <section class="credits">
            <h2 class="h">{t('d.credits')}</h2>
            <ul>
              {#each credits as c (c.memberId + c.role)}
                <li><span class="role">{t(`d.credit.${c.role}`)}</span><Person {team} id={c.memberId} size="sm" /></li>
              {/each}
            </ul>
            {#if fingerprint}
              <p class="fp"><FingerprintPattern size={15} /><span>{t('d.fingerprint')}</span><code>{fingerprint}</code></p>
              <p class="muted small">{t('d.released', { date: fmtDate(d.releasedAt!, { withYear: true }) })}</p>
            {/if}
          </section>
        {/if}
      </div>
      <aside class="facts panel">
        <dl>
          <dt>{t('d.objective')}</dt>
          <dd><a href={href(`/plan/${d.objectiveId}`)}>{objectiveTitle(team, d.objectiveId)}</a></dd>
          <dt>{t('d.reward')}</dt>
          <dd><Amount value={d.reward} /></dd>
          {#if d.stage !== 'accepted' && d.stage !== 'released'}
          <dt>{t('d.cost')}</dt>
          <dd>
            <Amount value={d.reward + ruleValue(team, 'review_reward')} />
            <span class="hint">{t('d.costHint', { reward: fmtTmim(d.reward), review: fmtTmim(ruleValue(team, 'review_reward')), objective: objectiveTitle(team, d.objectiveId) })}</span>
          </dd>
          {/if}
          {#if f && o && o.budget > 0}
            <dt>{t('plan.left')}</dt>
            <dd><Amount value={f.left} tone={f.left < 0 ? 'negative' : 'default'} /> <span class="hint">/ {fmtTmim(f.budget)}</span></dd>
          {/if}
          <dt>{t('d.versions')}</dt>
          <dd>{versions.length === 1 ? t('d.versionsCountOne') : t('d.versionsCount', { n: fmtNum(versions.length) })}</dd>
          <dt>{t('d.tab.history')}</dt>
          <dd>{t('d.lastActivity', { when: fmtRelative(d.lastActivityAt, now) })}</dd>
        </dl>
      </aside>
    </div>
  {:else if tab === 'work'}
    {#if !versions.length && !E.draftOf(d)}
      <EmptyState icon={FileText} title={t('d.noVersions')} hint={t('d.noVersionsHint')}>
        {#if isOwner && d.stage !== 'open'}<a class="btn btn-primary" href={href(`/d/${d.id}/edit`)}><Pencil size={15} />{t('d.startDraft')}</a>{/if}
      </EmptyState>
    {:else}
      <div class="work">
        <aside class="versions">
          <div class="h-row">
            <h2 class="h">{t('d.versions')}</h2>
            {#if isOwner && ['assigned', 'in_progress', 'in_review', 'changes_requested'].includes(d.stage)}
              <a class="btn btn-sm" href={href(`/d/${d.id}/edit`)}><Pencil size={13} />{t('d.edit')}</a>
            {/if}
          </div>
          <VersionList {team} {d} {me} {now} selected={selected?.id} onselect={select} />
        </aside>
        <section class="reader">
          {#if selected}
            <div class="reader-bar">
              <p>
                {#if selected.kind === 'draft'}<Lock size={14} /> {t('d.privateDraft')}{:else}<strong>v{selected.n}</strong> · <bdi>{lt(selected.note)}</bdi> · {firstName(team, selected.authorId)}, {fmtDate(selected.at)}{/if}
              </p>
              {#if previous && selected.kind === 'version'}
                <button type="button" class="btn btn-sm" aria-pressed={comparing} onclick={() => (comparing = !comparing)}>
                  <GitCompare size={14} />{comparing ? t('d.stopCompare') : t('d.compareWith', { v: `v${previous.n}` })}
                </button>
              {/if}
            </div>
            {#if comparing && previous && selected.kind === 'version'}
              <TextDiff from={previous.paragraphs} to={selected.paragraphs} />
            {:else}
              <Doc paragraphs={selected.paragraphs} />
            {/if}
          {/if}
        </section>
      </div>
    {/if}
  {:else if tab === 'tasks'}
    <section class="narrow">
      {#if tasks.length}
        <p class="muted small">{t('d.tasksDone', { done: fmtNum(tasks.filter(x => x.done).length), total: fmtNum(tasks.length) })}</p>
        <ul class="tasklist">
          {#each tasks as task (task.id)}
            {@const may = task.ownerId === me || isOwner || canPlan}
            <li class:done={task.done}>
              <button type="button" class="tick" disabled={!may} aria-pressed={task.done} onclick={() => toggle(task.id, !task.done)} aria-label={lt(task.title)}>
                {#if task.done}<SquareCheck size={18} />{:else}<Square size={18} />{/if}
              </button>
              <span class="tt">{lt(task.title)}</span>
              {#if task.ownerId}<Person {team} id={task.ownerId} first />{/if}
              {#if task.due}<span class="muted small">{fmtDate(task.due)}</span>{/if}
            </li>
          {/each}
        </ul>
      {:else}
        <EmptyState icon={ListChecks} title={t('d.noTasks')} hint={t('d.noTasksHint')} compact />
      {/if}
      {#if isOwner || canPlan}
        <form class="addtask" onsubmit={addTask}>
          <input class="input" bind:value={taskTitle} placeholder={t('d.taskPlaceholder')} aria-label={t('plan.field.task')} required />
          <select class="input who" bind:value={taskOwner} aria-label={t('plan.field.taskOwner')}>
            <option value="">{t('plan.field.taskOwner')}</option>
            {#each team.members as m (m.id)}<option value={m.id}>{lt(m.name)}</option>{/each}
          </select>
          <button type="submit" class="btn"><Plus size={15} />{t('d.addTask')}</button>
        </form>
      {/if}
    </section>
  {:else if tab === 'reviews'}
    <section class="narrow">
      {#if rounds.length}
        <ul class="rounds">
          {#each rounds as c, i (c.id)}
            {@const from = E.versionById(d, c.fromVersionId)}
            {@const to = E.versionById(d, c.toVersionId)}
            <li>
              <a class="round" href={href(`/d/${d.id}/review/${c.id}`)}>
                <span class="ic"><GitPullRequest size={16} /></span>
                <span class="rt">
                  <span class="title">{t('d.round', { n: fmtNum(rounds.length - i) })} · {from ? `v${from.n} → v${to?.n}` : t('review.firstTitle', { to: `v${to?.n}` })}</span>
                  <span class="meta">{t('change.requestedBy', { name: firstName(team, c.proposerId), when: fmtRelative(c.at, now) })}{#if c.reviewedBy} · {t('review.reviewedBy', { name: firstName(team, c.reviewedBy) })}{/if}</span>
                </span>
                {#if c.comments.length}<span class="cc"><MessageSquare size={13} />{fmtNum(c.comments.length)}</span>{/if}
                <StatusChip status={c.status} />
              </a>
            </li>
          {/each}
        </ul>
      {:else}
        <EmptyState icon={GitPullRequest} title={t('d.noReviews')} hint={t('d.noReviewsHint')} compact />
      {/if}
    </section>
  {:else if tab === 'thread'}
    <section class="narrow">
      {#if thread.length}
        <ol class="thread">
          {#each thread as m (m.id)}
            <li>
              <Person {team} id={m.authorId} size="sm" />
              <span class="when">{fmtRelative(m.at, now)}</span>
              <p dir="auto">{lt(m.body)}</p>
            </li>
          {/each}
        </ol>
      {:else}
        <EmptyState icon={MessageSquare} title={t('d.threadEmpty')} hint={t('d.threadHint')} compact />
      {/if}
      <form class="composer" onsubmit={send}>
        <textarea class="input" rows="2" bind:value={message} placeholder={t('d.threadPlaceholder')} aria-label={t('d.threadPlaceholder')} dir="auto" required></textarea>
        <button type="submit" class="btn btn-primary"><Send size={15} class="flip-rtl" />{t('d.send')}</button>
      </form>
    </section>
  {:else if tab === 'history'}
    <section class="narrow">
      <LedgerList {team} entries={history} {now} />
    </section>
  {/if}
{/if}

<style>
  .h { font-size: var(--fs-sm); font-weight: 600; color: var(--ink-2); }
  .h-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-block-end: 10px; }
  .link { display: inline-flex; align-items: center; gap: 4px; font-size: var(--fs-sm); color: var(--ink-3); }
  .link:hover { color: var(--accent-text); }
  .small { font-size: var(--fs-sm); }
  .hint { font-size: var(--fs-xs); color: var(--ink-3); }
  .narrow { max-width: 760px; display: flex; flex-direction: column; gap: var(--s4); }

  .ov { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: var(--s8); align-items: start; }
  .ov-main { display: flex; flex-direction: column; gap: var(--s6); min-width: 0; }
  .scope { margin-block-start: 6px; max-width: 70ch; color: var(--ink); }
  .excerpt { position: relative; max-height: 280px; overflow: hidden; padding: var(--s5); border: 1px solid var(--rule); border-radius: var(--r-md); background: var(--surface-raised); }
  .excerpt::after { content: ''; position: absolute; inset: auto 0 0; height: 64px; background: linear-gradient(to bottom, transparent, var(--surface-raised)); }
  .credits ul { display: flex; flex-direction: column; gap: 8px; margin-block: 10px; }
  .credits li { display: flex; align-items: center; gap: 12px; }
  .role { width: 110px; font-size: var(--fs-sm); color: var(--ink-3); }
  .fp { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: var(--fs-sm); color: var(--ink-2); }
  .fp code { font-family: var(--font-mono); font-size: var(--fs-xs); padding: 2px 6px; border-radius: 4px; background: var(--surface-2); }
  .facts { padding: var(--s4) var(--s5); }
  .facts dl { display: flex; flex-direction: column; }
  .facts dt { font-size: var(--fs-xs); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-3); margin-block-start: 14px; }
  .facts dt:first-child { margin-block-start: 0; }
  .facts dd { margin: 3px 0 0; display: flex; flex-direction: column; gap: 2px; }
  .facts dd a:hover { color: var(--accent-text); }

  .work { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: var(--s8); align-items: start; }
  .versions { position: sticky; inset-block-start: 76px; }
  .reader { min-width: 0; padding: var(--s6); border: 1px solid var(--rule); border-radius: var(--r-md); background: var(--surface-raised); }
  .reader-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding-block-end: var(--s4); margin-block-end: var(--s5); border-block-end: 1px solid var(--rule); font-size: var(--fs-sm); color: var(--ink-2); }
  .reader-bar p { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .reader-bar strong { font-family: var(--font-mono); font-weight: 500; color: var(--ink); }

  .tasklist { display: flex; flex-direction: column; border: 1px solid var(--rule); border-radius: var(--r-md); background: var(--surface-raised); }
  .tasklist li { display: flex; align-items: center; gap: 12px; padding: 10px 14px; }
  .tasklist li + li { border-block-start: 1px solid var(--rule); }
  .tasklist li.done .tt { text-decoration: line-through; color: var(--ink-3); }
  .tick { display: grid; place-items: center; color: var(--ink-3); }
  .tick[aria-pressed='true'] { color: var(--st-accepted); }
  .tick:disabled { cursor: default; opacity: 0.7; }
  .tt { flex: 1; min-width: 0; }
  .addtask { display: flex; gap: 8px; flex-wrap: wrap; }
  .addtask .input { flex: 1 1 260px; width: auto; }
  .addtask .who { flex: 0 1 180px; }

  .rounds { display: flex; flex-direction: column; border: 1px solid var(--rule); border-radius: var(--r-md); background: var(--surface-raised); }
  .rounds li + li { border-block-start: 1px solid var(--rule); }
  .round { display: flex; align-items: center; gap: 12px; padding: 12px 16px; }
  .round:hover { background: var(--surface); }
  .round .ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; color: var(--st-review); background: var(--st-review-bg); flex: none; }
  .rt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .rt .title { font-weight: 500; }
  .rt .meta { font-size: var(--fs-sm); color: var(--ink-3); }
  .cc { display: inline-flex; align-items: center; gap: 4px; color: var(--ink-3); font-size: var(--fs-sm); }

  .thread { display: flex; flex-direction: column; gap: var(--s4); }
  .thread li { display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; align-items: center; }
  .thread .when { font-size: var(--fs-xs); color: var(--ink-3); justify-self: end; }
  .thread p { grid-column: 1 / -1; padding: 10px 14px; border-radius: var(--r-md); background: var(--surface-raised); border: 1px solid var(--rule); margin-inline-start: 34px; }
  .composer { display: flex; gap: 8px; align-items: flex-end; }
  .composer .input { flex: 1; }

  @media (max-width: 1099px) {
    .ov { grid-template-columns: minmax(0, 1fr); }
    .work { grid-template-columns: minmax(0, 1fr); gap: var(--s5); }
    .versions { position: static; }
  }
  @media (max-width: 639px) {
    .reader { padding: var(--s4); }
    .composer { flex-direction: column; align-items: stretch; }
    .thread p { margin-inline-start: 0; }
  }
</style>

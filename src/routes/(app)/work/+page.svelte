<script lang="ts">
  // Work: your deliverables and their next step, review requests waiting on
  // you, and the latest versions saved across the team.
  import { store } from '$lib/team/store.svelte';
  import * as E from '$lib/team/engine';
  import { member } from '$lib/team/rules';
  import { lt, t, fmtRelative } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import type { Version, Deliverable } from '$lib/team/types';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import StageChip from '$lib/ui/StageChip.svelte';
  import StatusChip from '$lib/ui/StatusChip.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import { nextStep } from '$lib/app/next';
  import { runStep } from '$lib/app/actions';
  import { firstName, objectiveTitle } from '$lib/app/format';
  import PenLine from '@lucide/svelte/icons/pen-line';
  import GitPullRequest from '@lucide/svelte/icons/git-pull-request';
  import GitCommitHorizontal from '@lucide/svelte/icons/git-commit-horizontal';

  const team = $derived(store.team);
  const me = $derived(store.me);
  const now = $derived(store.now);
  const mine = $derived(team.deliverables.filter(d => d.ownerId === me).sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt)));
  const reviews = $derived(team.changes.filter(c => {
    if (c.kind !== 'work') return false;
    const d = team.deliverables.find(x => x.id === c.deliverableId);
    if (!d) return false;
    return (c.status === 'open' && E.reviewerOf(team, d) === me) || (c.status === 'reviewed' && E.approverOf(team, d) === me);
  }));
  const recent = $derived.by(() => {
    const all: { d: Deliverable; v: Version }[] = [];
    for (const d of team.deliverables) for (const v of E.versionsOf(d)) all.push({ d, v });
    return all.sort((a, b) => b.v.at.localeCompare(a.v.at)).slice(0, 8);
  });
</script>

<svelte:head><title>{t('work.title')} · {lt(team.name)}</title></svelte:head>

<PageHeader title={t('work.title')} subtitle={t('work.subtitle')} />

<div class="grid">
  <section class="mine" aria-labelledby="mine-h">
    <h2 id="mine-h" class="sec">{t('work.mine')}</h2>
    {#if mine.length}
      <ul class="list">
        {#each mine as d (d.id)}
          {@const step = nextStep(team, d, me)}
          {@const latest = E.latestVersion(d)}
          <li>
            <div class="top">
              <a class="title" href={href(`/d/${d.id}`)}>{lt(d.title)}</a>
              <StageChip stage={d.stage} />
            </div>
            <p class="meta">{objectiveTitle(team, d.objectiveId)}{#if latest} · v{latest.n} “<bdi>{lt(latest.note)}</bdi>”{/if}</p>
            <div class="step" class:mine={step.mine}>
              <p>{step.text}</p>
              {#if step.mine && step.action}<button type="button" class="btn btn-sm btn-primary" onclick={() => runStep(d, step.action!)}>{step.action.label}</button>{/if}
            </div>
          </li>
        {/each}
      </ul>
    {:else}
      <EmptyState icon={PenLine} title={t('work.mine.empty')} hint={t('need.emptyHint')} compact>
        <a class="btn btn-sm" href={href('/plan')}>{t('nav.plan')}</a>
      </EmptyState>
    {/if}
  </section>

  <div class="side">
    <section aria-labelledby="rev-h">
      <h2 id="rev-h" class="sec">{t('work.reviews')}</h2>
      {#if reviews.length}
        <ul class="list">
          {#each reviews as c (c.id)}
            {#if c.kind === 'work'}
              {@const d = team.deliverables.find(x => x.id === c.deliverableId)!}
              {@const to = E.versionById(d, c.toVersionId)}
              <li>
                <a class="rrow" href={href(`/d/${d.id}/review/${c.id}`)}>
                  <span class="ic"><GitPullRequest size={15} /></span>
                  <span class="rt"><span class="title">{lt(d.title)} · v{to?.n}</span><span class="meta">{t('change.requestedBy', { name: firstName(team, c.proposerId), when: fmtRelative(c.at, now) })}</span></span>
                  <StatusChip status={c.status} />
                </a>
              </li>
            {/if}
          {/each}
        </ul>
      {:else}
        <EmptyState icon={GitPullRequest} title={t('work.reviews.empty')} compact />
      {/if}
    </section>

    <section aria-labelledby="recent-h">
      <h2 id="recent-h" class="sec">{t('work.recent')}</h2>
      <ol class="commits">
        {#each recent as { d, v } (v.id)}
          {@const m = member(team, v.authorId)}
          <li>
            <span class="dot"><GitCommitHorizontal size={14} /></span>
            <div>
              <a href={href(`/d/${d.id}/work`)} class="title">{lt(d.title)} <span class="v">v{v.n}</span></a>
              <p class="meta">
                {#if m}<Avatar id={m.id} initials={m.initials} name={lt(m.name)} size="xs" />{/if}
                “<bdi>{lt(v.note)}</bdi>” · {fmtRelative(v.at, now)}
              </p>
            </div>
          </li>
        {/each}
      </ol>
    </section>
  </div>
</div>

<style>
  .grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: var(--s8); align-items: start; }
  .side { display: flex; flex-direction: column; gap: var(--s8); min-width: 0; }
  .sec { font-size: var(--fs-lg); font-weight: 600; margin-block-end: var(--s3); }
  .list { display: flex; flex-direction: column; border: 1px solid var(--rule); border-radius: var(--r-md); background: var(--surface-raised); }
  .list > li + li { border-block-start: 1px solid var(--rule); }
  .mine .list > li { padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
  .top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .title { font-weight: 500; }
  a.title:hover { text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--rule-strong); }
  .meta { font-size: var(--fs-sm); color: var(--ink-3); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .step { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-block-start: 6px; padding: 8px 10px; border-radius: var(--r-sm); background: var(--surface); font-size: var(--fs-sm); color: var(--ink-2); }
  .step.mine { background: var(--accent-weak); color: var(--ink); }
  .rrow { display: flex; align-items: center; gap: 10px; padding: 12px 14px; }
  .rrow:hover { background: var(--surface); }
  .ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; color: var(--st-review); background: var(--st-review-bg); flex: none; }
  .rt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .commits { position: relative; display: flex; flex-direction: column; gap: 12px; }
  .commits::before { content: ''; position: absolute; inset-block: 12px; inset-inline-start: 11px; width: 2px; background: var(--rule); }
  .commits li { position: relative; display: flex; gap: 10px; }
  .dot { position: relative; z-index: 1; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 999px; background: var(--surface-raised); border: 1.5px solid var(--rule-strong); color: var(--ink-3); flex: none; }
  .v { font-family: var(--font-mono); font-size: var(--fs-xs); color: var(--ink-3); }
  @media (max-width: 1099px) { .grid { grid-template-columns: minmax(0, 1fr); } }
</style>

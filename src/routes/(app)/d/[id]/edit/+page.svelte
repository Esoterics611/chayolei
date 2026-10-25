<script lang="ts">
  // The owner's editor: a private draft (off the ledger) until it is saved as
  // a version with a note; compare against the last version before saving.
  import { page } from '$app/state';
  import { untrack } from 'svelte';
  import { store } from '$lib/team/store.svelte';
  import * as E from '$lib/team/engine';
  import { lt, t, fmtNum, fmtRelative } from '$lib/team/i18n';
  import { href, go } from '$lib/team/nav';
  import TextDiff from '$lib/ui/TextDiff.svelte';
  import StageChip from '$lib/ui/StageChip.svelte';
  import NotFound from '$lib/app/NotFound.svelte';
  import { firstName } from '$lib/app/format';
  import Lock from '@lucide/svelte/icons/lock';
  import GitCommitHorizontal from '@lucide/svelte/icons/git-commit-horizontal';
  import GitPullRequest from '@lucide/svelte/icons/git-pull-request';
  import Save from '@lucide/svelte/icons/save';
  import PenLine from '@lucide/svelte/icons/pen-line';
  import GitCompare from '@lucide/svelte/icons/git-compare';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';

  const team = $derived(store.team);
  const me = $derived(store.me);
  const d = $derived(team.deliverables.find(x => x.id === page.params.id));
  const latest = $derived(d ? E.latestVersion(d) : undefined);
  const draft = $derived(d ? E.draftOf(d) : undefined);
  const editable = $derived(!!d && d.ownerId === me && ['assigned', 'in_progress', 'in_review', 'changes_requested'].includes(d.stage));

  // Start from the private draft if there is one, else the latest version.
  let text = $state(untrack(() => {
    const dd = store.team.deliverables.find(x => x.id === page.params.id);
    const start = dd ? (E.draftOf(dd) ?? E.latestVersion(dd)) : undefined;
    return start ? start.paragraphs.join('\n\n') : '';
  }));
  let note = $state('');
  let mode = $state<'write' | 'compare'>('write');

  const paragraphs = $derived(text.split(/\n\s*\n/).map(p => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean));
  const words = $derived(text.trim() ? text.trim().split(/\s+/).length : 0);
  const nextN = $derived((latest?.n ?? 0) + 1);
  const changed = $derived(!latest || latest.paragraphs.join('\n') !== paragraphs.join('\n'));

  function saveDraft() {
    if (!d) return;
    store.run((tm, m, n) => E.saveDraft(tm, m, d.id, paragraphs, n), t('edit.draftSaved'));
  }

  function saveVersion(thenReview: boolean) {
    if (!d) return;
    const v = store.run((tm, m, n) => E.saveVersion(tm, m, d.id, paragraphs, note.trim() || t('edit.firstVersion'), n), t('edit.versionSaved', { n: nextN }));
    if (!v) return;
    note = '';
    if (thenReview) {
      const c = store.run((tm, m, n) => E.requestReview(tm, m, d.id, n), t('d.reviewRequested'));
      if (c) { go(`/d/${d.id}/review/${c.id}`); return; }
    }
    go(`/d/${d.id}/work`);
  }
</script>

<svelte:head><title>{d ? t('edit.title', { title: lt(d.title) }) : ''} · {lt(team.name)}</title></svelte:head>

{#if !d}
  <NotFound back="/work" />
{:else}
  <header class="eh">
    <a class="back" href={href(`/d/${d.id}/work`)}><ArrowLeft size={15} class="flip-rtl" />{lt(d.title)}</a>
    <div class="row">
      <h1>{t('edit.title', { title: lt(d.title) })}</h1>
      <StageChip stage={d.stage} size="md" />
    </div>
    <p class="base">
      <GitCommitHorizontal size={14} />
      {latest ? t('edit.base', { v: `v${latest.n}` }) + ` · ${lt(latest.note)}` : t('edit.firstVersion')}
      {#if draft}<span class="sep">·</span><Lock size={13} />{t('d.draft')} · {fmtRelative(draft.at, store.now)}{/if}
    </p>
  </header>

  {#if !editable}
    <p class="note">{t('d.notOwner', { name: firstName(team, d.ownerId) })}</p>
  {:else}
    <div class="editor">
      <section class="sheet">
        <div class="bar">
          <div class="seg" role="group" aria-label={t('edit.title', { title: lt(d.title) })}>
            <button type="button" aria-pressed={mode === 'write'} onclick={() => (mode = 'write')}><PenLine size={14} />{t('edit.write')}</button>
            <button type="button" aria-pressed={mode === 'compare'} onclick={() => (mode = 'compare')} disabled={!latest}><GitCompare size={14} />{latest ? t('edit.preview', { v: `v${latest.n}` }) : t('edit.compare')}</button>
          </div>
          <span class="count">{t('edit.paragraphs', { n: fmtNum(paragraphs.length) })} · {fmtNum(words)} w</span>
        </div>
        {#if mode === 'write'}
          <textarea class="doc-input" bind:value={text} aria-label={t('edit.title', { title: lt(d.title) })} dir="auto" spellcheck="true"></textarea>
          <p class="hint">{t('edit.hint')}</p>
        {:else if latest}
          <div class="cmp"><TextDiff from={latest.paragraphs} to={paragraphs} /></div>
        {/if}
      </section>

      <aside class="side">
        <div class="private"><Lock size={15} /><p>{t('d.privateDraft')}</p></div>
        <button type="button" class="btn btn-block" onclick={saveDraft}><Save size={15} />{t('edit.saveDraft')}</button>
        <hr />
        <label class="field">
          <span class="label">{t('edit.note')}</span>
          <input class="input" bind:value={note} placeholder={t('edit.notePlaceholder')} />
        </label>
        <button type="button" class="btn btn-block" disabled={!changed || !paragraphs.length} onclick={() => saveVersion(false)}>
          <GitCommitHorizontal size={15} />{t('edit.saveVersion', { n: nextN })}
        </button>
        <button type="button" class="btn btn-primary btn-block" disabled={!changed || !paragraphs.length} onclick={() => saveVersion(true)}>
          <GitPullRequest size={15} />{t('edit.thenRequest')}
        </button>
        {#if !changed}<p class="hint">{t('err.no_changes')}</p>{/if}
      </aside>
    </div>
  {/if}
{/if}

<style>
  .eh { display: flex; flex-direction: column; gap: 8px; margin-block-end: var(--s5); }
  .back { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-sm); color: var(--ink-3); align-self: flex-start; }
  .back:hover { color: var(--accent-text); }
  .row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  h1 { font-size: var(--fs-2xl); font-weight: 600; letter-spacing: -0.015em; }
  .base { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: var(--fs-sm); color: var(--ink-3); }
  .sep { padding-inline: 2px; }
  .editor { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: var(--s6); align-items: start; }
  .sheet { min-width: 0; border: 1px solid var(--rule); border-radius: var(--r-md); background: var(--surface-raised); }
  .bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 10px 12px; border-block-end: 1px solid var(--rule); }
  .seg { display: inline-flex; padding: 2px; border-radius: var(--r-sm); background: var(--surface-2); }
  .seg button { display: inline-flex; align-items: center; gap: 6px; min-height: 28px; padding-inline: 10px; border-radius: 5px; font-size: var(--fs-sm); color: var(--ink-2); }
  .seg button[aria-pressed='true'] { background: var(--surface-raised); color: var(--ink); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); }
  .seg button:disabled { opacity: 0.5; }
  .count { font-size: var(--fs-xs); color: var(--ink-3); font-variant-numeric: tabular-nums; }
  .doc-input {
    display: block;
    width: 100%;
    min-height: 56vh;
    padding: var(--s6) var(--s8);
    border: 0;
    resize: vertical;
    background: transparent;
    color: var(--ink);
    font-family: var(--font-doc);
    font-size: 17.5px;
    line-height: 1.72;
    outline: none;
  }
  .hint { padding: 0 var(--s8) var(--s4); font-size: var(--fs-xs); color: var(--ink-3); }
  .cmp { padding: var(--s5); }
  .side { position: sticky; inset-block-start: 76px; display: flex; flex-direction: column; gap: var(--s3); }
  .side .hint { padding: 0; }
  .private { display: flex; gap: 8px; padding: 10px 12px; border-radius: var(--r-sm); background: var(--st-progress-bg); color: var(--st-progress); font-size: var(--fs-sm); }
  .private :global(svg) { flex: none; margin-block-start: 2px; }
  hr { border: 0; border-block-start: 1px solid var(--rule); margin: 4px 0; }
  @media (max-width: 1099px) {
    .editor { grid-template-columns: minmax(0, 1fr); }
    .side { position: static; }
  }
  @media (max-width: 639px) {
    .doc-input { padding: var(--s4); font-size: 16.5px; min-height: 50vh; }
    .hint { padding: 0 var(--s4) var(--s3); }
    h1 { font-size: var(--fs-xl); }
  }
</style>

<script lang="ts">
  // One question with its answer, as every wellspring page shows it. The
  // teacher's desk passes its actions as `actions`.
  import type { Snippet } from 'svelte';
  import type { Question } from './types';
  import { DEMO_TEACHER } from './seed';
  import { t, fmtRelative } from '$lib/team/i18n';
  import GraduationCap from '@lucide/svelte/icons/graduation-cap';
  import Hourglass from '@lucide/svelte/icons/hourglass';

  let { q, context = '', actions }: { q: Question; context?: string; actions?: Snippet } = $props();
</script>

<article class="qc" class:answered={q.status === 'answered'}>
  <header>
    <span class="who">{t('maayan.q.by', { name: q.authorName, when: fmtRelative(q.createdAt) })}</span>
    {#if context}<span class="ctx">{context}</span>{/if}
    {#if q.sample}<span class="m-chip sample">{t('maayan.sample')}</span>{/if}
    {#if q.status === 'pending'}<span class="state"><Hourglass size={13} />{t('maayan.q.pending')}</span>
    {:else if q.status === 'hidden'}<span class="state">{t('maayan.q.hidden')}</span>
    {:else if q.status === 'published'}<span class="state">{t('maayan.q.waiting')}</span>{/if}
  </header>
  <p class="text" dir="auto">{q.text}</p>
  {#if q.answer}
    <div class="ans">
      <p class="by"><GraduationCap size={15} />{t('maayan.q.teacher')}{#if q.answer.byName !== DEMO_TEACHER.name} · {q.answer.byName}{/if}</p>
      <p class="atext doc" dir="auto">{q.answer.text}</p>
    </div>
  {/if}
  {#if actions}<div class="actions">{@render actions()}</div>{/if}
</article>

<style>
  .qc { padding: var(--s5); border: 1px solid var(--rule); border-radius: var(--r-lg); background: var(--surface-raised); }
  .qc.answered { border-color: var(--rule-strong); }
  header { display: flex; flex-wrap: wrap; align-items: center; gap: 6px var(--s3); font-size: var(--fs-sm); color: var(--ink-3); }
  .ctx { color: var(--accent-text); }
  .state { display: inline-flex; align-items: center; gap: 4px; color: var(--st-progress); }
  .text { font-size: var(--fs-lg); font-weight: 500; line-height: 1.55; margin-block-start: var(--s2); white-space: pre-line; }
  .ans { margin-block-start: var(--s4); padding-inline-start: var(--s4); border-inline-start: 3px solid var(--accent); }
  .by { display: flex; align-items: center; gap: 6px; font-size: var(--fs-sm); font-weight: 600; color: var(--accent-text); }
  .atext { font-size: 1.12rem; line-height: 1.75; margin-block-start: var(--s2); white-space: pre-line; color: var(--ink); }
  .actions { margin-block-start: var(--s4); }
</style>

<script lang="ts">
  // The teacher's desk: first questions to read (publish or not), published
  // questions to answer, and the answers given, to correct.
  import { t, lt, fmtNum } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import { ui } from '$lib/team/ui.svelte';
  import { maayan } from '$lib/maayan/store.svelte';
  import QuestionCard from '$lib/maayan/QuestionCard.svelte';
  import type { Question } from '$lib/maayan/types';
  import Check from '@lucide/svelte/icons/check';
  import EyeOff from '@lucide/svelte/icons/eye-off';
  import Send from '@lucide/svelte/icons/send';

  type Tab = 'pending' | 'waiting' | 'answered';
  let tab = $state<Tab>('pending');
  const by = (s: Question['status']) => maayan.questions.filter(q => q.status === s).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const lists = $derived({ pending: by('pending'), waiting: by('published'), answered: by('answered').reverse() });
  const drafts = $state<Record<string, string>>({});
  const titleOf = (id: string) => t('maayan.t.in', { title: lt(maayan.wellspring(id)?.title) });

  async function send(q: Question) {
    if (await maayan.answer(q.id, drafts[q.id] ?? '')) {
      delete drafts[q.id];
      ui.toast('success', t('maayan.t.sent'));
    }
  }
  async function approve(q: Question) {
    if (await maayan.approve(q.id)) ui.toast('success', t('maayan.t.approved'));
  }
  async function hide(q: Question) {
    if (await maayan.hide(q.id)) ui.toast('info', t('maayan.t.hidden'));
  }
</script>

<svelte:head><title>{t('maayan.t.title')}</title></svelte:head>

<div class="m-wrap" style="max-width: 50rem; padding-block: 40px">
  {#if !maayan.me?.teacher}
    <p class="m-empty">{t('maayan.t.notTeacher')}</p>
    <p style="margin-block-start: 16px"><a class="btn" href={href('/maayan')}>{t('maayan.back')}</a></p>
  {:else}
    <h1 class="m-h1" style="font-size: 2rem">{t('maayan.t.title')}</h1>
    <p class="m-lead" style="margin-block-start: 4px">{t('maayan.t.lead')}</p>

    <div class="m-tabs" role="tablist" aria-label={t('maayan.t.title')} style="margin-block-start: 24px">
      <button type="button" role="tab" aria-selected={tab === 'pending'} onclick={() => (tab = 'pending')}>{t('maayan.t.pending', { n: fmtNum(lists.pending.length) })}</button>
      <button type="button" role="tab" aria-selected={tab === 'waiting'} onclick={() => (tab = 'waiting')}>{t('maayan.t.waiting', { n: fmtNum(lists.waiting.length) })}</button>
      <button type="button" role="tab" aria-selected={tab === 'answered'} onclick={() => (tab = 'answered')}>{t('maayan.t.answered', { n: fmtNum(lists.answered.length) })}</button>
    </div>

    <div class="m-list" role="tabpanel">
      {#each lists[tab] as q (q.id)}
        <QuestionCard {q} context={titleOf(q.wellspringId)}>
          {#snippet actions()}
            {#if q.status === 'pending'}
              <div class="row">
                <button type="button" class="btn btn-primary" onclick={() => approve(q)}><Check size={15} />{t('maayan.t.approve')}</button>
                <button type="button" class="btn" onclick={() => hide(q)}><EyeOff size={15} />{t('maayan.t.hide')}</button>
              </div>
            {/if}
            {#if q.status !== 'answered' || drafts[q.id] !== undefined}
              <form class="answer" onsubmit={e => { e.preventDefault(); void send(q); }}>
                <textarea class="input doc" rows="5" dir="auto" aria-label={t('maayan.t.answerPh')} placeholder={t('maayan.t.answerPh')}
                  value={drafts[q.id] ?? q.answer?.text ?? ''} oninput={e => (drafts[q.id] = e.currentTarget.value)}></textarea>
                <div class="row"><button type="submit" class="btn btn-primary" disabled={!(drafts[q.id] ?? '').trim()}><Send size={15} class="flip-rtl" />{t('maayan.t.send')}</button></div>
              </form>
            {:else}
              <button type="button" class="btn btn-sm" onclick={() => (drafts[q.id] = q.answer?.text ?? '')}>{t('maayan.t.edit')}</button>
            {/if}
          {/snippet}
        </QuestionCard>
      {:else}
        <p class="m-empty">{t('maayan.t.empty')}</p>
      {/each}
    </div>
  {/if}
</div>

<style>
  .row { display: flex; flex-wrap: wrap; gap: 8px; }
  .answer { display: flex; flex-direction: column; gap: 8px; margin-block-start: 12px; }
  .answer textarea { font-size: 1.05rem; line-height: 1.7; }
</style>

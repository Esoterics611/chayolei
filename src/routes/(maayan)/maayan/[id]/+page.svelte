<script lang="ts">
  // One wellspring: its discourse, the reader who came from the booklet, the
  // questions and the teacher's answers, the ask box, and the way on.
  import { page } from '$app/state';
  import { tick } from 'svelte';
  import { t, lt, fmtNum } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import { ui } from '$lib/team/ui.svelte';
  import { maayan } from '$lib/maayan/store.svelte';
  import { counts, search } from '$lib/maayan/engine';
  import type { Question } from '$lib/maayan/types';
  import Rings from '$lib/maayan/Rings.svelte';
  import QuestionCard from '$lib/maayan/QuestionCard.svelte';
  import ScanLine from '@lucide/svelte/icons/scan-line';
  import Feather from '@lucide/svelte/icons/feather';
  import GraduationCap from '@lucide/svelte/icons/graduation-cap';
  import MailCheck from '@lucide/svelte/icons/mail-check';
  import Users from '@lucide/svelte/icons/users';
  import MessageCircleQuestionMark from '@lucide/svelte/icons/message-circle-question-mark';
  import Bell from '@lucide/svelte/icons/bell';
  import BellRing from '@lucide/svelte/icons/bell-ring';
  import FileText from '@lucide/svelte/icons/file-text';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Send from '@lucide/svelte/icons/send';
  import Search from '@lucide/svelte/icons/search';
  import Link from '@lucide/svelte/icons/link';
  import Reply from '@lucide/svelte/icons/reply';
  import Undo2 from '@lucide/svelte/icons/undo-2';
  import X from '@lucide/svelte/icons/x';
  import HeartHandshake from '@lucide/svelte/icons/heart-handshake';

  const HASH = import.meta.env.VITE_HASH_ROUTER === '1';

  const id = $derived(page.params.id ?? '');
  const w = $derived(maayan.wellspring(id));
  const c = $derived(counts(maayan.questions, id));
  const all = $derived(maayan.visible(id));
  const mine = $derived(maayan.me ? all.filter(q => q.authorId === maayan.me!.uid) : []);
  const others = $derived(maayan.sorted.filter(x => x.id !== id));
  const following = $derived(!!maayan.me?.follows.includes(id));
  const byId = (qid?: string) => (qid ? maayan.questions.find(q => q.id === qid) : undefined);

  type Tab = 'answered' | 'waiting' | 'mine';
  let tab = $state<Tab>('answered');
  let words = $state('');
  const inTab = $derived(tab === 'answered' ? all.filter(q => q.status === 'answered')
    : tab === 'waiting' ? all.filter(q => q.status === 'published')
    : mine);
  const shown = $derived(search(inTab, words));

  let text = $state('');
  let ref = $state('');
  let followUp = $state<Question | null>(null);
  let sending = $state(false);
  const joinHref = $derived(href(`/maayan/${id}/join`));

  // A shared link (…/maayan/<id>?q=<question>) opens on that question.
  const linked = $derived(new URLSearchParams(HASH ? (page.url.hash.split('?')[1] ?? '') : page.url.search).get('q') ?? '');
  $effect(() => {
    const q = byId(linked);
    if (!q) return;
    tab = q.status === 'answered' ? 'answered' : q.status === 'published' ? 'waiting' : 'mine';
    void tick().then(() => document.getElementById(`q-${q.id}`)?.scrollIntoView({ block: 'start' }));
  });

  async function ask(e: SubmitEvent) {
    e.preventDefault();
    sending = true;
    const q = await maayan.ask(id, text, { ref, parentId: followUp?.id });
    sending = false;
    if (!q) return;
    text = '';
    ref = '';
    followUp = null;
    ui.toast('success', t(q.status === 'pending' ? 'maayan.ask.sentPending' : 'maayan.ask.sent'), 6000);
    tab = q.status === 'pending' ? 'mine' : 'waiting';
  }

  async function startFollowUp(q: Question) {
    followUp = q;
    await tick();
    document.getElementById('ask-text')?.focus();
    document.getElementById('ask')?.scrollIntoView({ block: 'start' });
  }

  async function copyLink(q: Question) {
    const url = new URL(href(`/maayan/${id}?q=${q.id}`), location.href).toString();
    try {
      await navigator.clipboard.writeText(url);
      ui.toast('info', t('maayan.q.copied'));
    } catch {
      ui.toast('info', url, 8000);
    }
  }

  async function withdraw(q: Question) {
    if (!confirm(t('maayan.q.confirmWithdraw'))) return;
    if (await maayan.withdraw(q.id)) ui.toast('info', t('maayan.q.withdrawn'));
  }
</script>

<svelte:head>
  <title>{w ? lt(w.title) : t('maayan.err.noWellspring')} · {t('maayan.name')}</title>
</svelte:head>

{#if !w}
  <div class="m-wrap" style="padding-block: 48px">
    <p class="m-empty">{t('maayan.err.noWellspring')}</p>
    <p style="margin-block-start: 16px"><a class="btn" href={href('/maayan')}>{t('maayan.back')}</a></p>
  </div>
{:else}
  <section class="m-hero">
    <Rings />
    <div class="m-wrap">
      <span class="m-eyebrow">{t('maayan.hero.eyebrow')} · <span class="m-chip {w.status}">{t(`maayan.status.${w.status}`)}</span></span>
      <h1 class="m-h1">{lt(w.title)}</h1>
      <p class="m-sub">{lt(w.subtitle)}</p>
      <p class="m-slogan">{lt(w.slogan)}</p>
      <p class="m-lead">{lt(w.about)}</p>

      <div class="m-cta">
        {#if !maayan.me}
          <a class="btn btn-primary btn-xl" href={joinHref}>{t('maayan.join')}<ArrowRight size={18} class="flip-rtl" /></a>
          <span class="m-note">{t('maayan.joinNote')}</span>
        {:else}
          <button type="button" class="btn" aria-pressed={following} onclick={() => maayan.setFollow(id, !following)}>
            {#if following}<BellRing size={16} />{t('maayan.following')}{:else}<Bell size={16} />{t('maayan.follow')}{/if}
          </button>
        {/if}
        {#if w.link}<a class="btn btn-ghost" href={w.link.url}><FileText size={16} />{lt(w.link.label)}</a>{/if}
        {#if w.dedicate}<a class="btn btn-ghost" href={w.dedicate}><HeartHandshake size={16} />{t('maayan.dedicate')}</a>{/if}
      </div>

      <p class="m-stats">
        <span><Users size={15} />{t('maayan.studying', { n: fmtNum(maayan.studying(id)) })}</span>
        {#if c.answered}<span><MessageCircleQuestionMark size={15} />{t('maayan.answeredCount', { n: fmtNum(c.answered) })}</span>{/if}
      </p>

      {#if !maayan.me && w.status === 'open'}
        <div class="m-booklet">
          <span class="ic"><ScanLine size={22} /></span>
          <div>
            <h2>{t('maayan.hero.fromBooklet')}</h2>
            <p>{t('maayan.hero.fromBookletBody')}</p>
          </div>
        </div>
      {/if}
    </div>
  </section>

  <div class="m-wrap">
    {#if !maayan.me}
      <div class="m-promises">
        <div class="m-promise"><span class="ic"><Feather size={18} /></span><h3>{t('maayan.promise.ask.t')}</h3><p>{t('maayan.promise.ask.d')}</p></div>
        <div class="m-promise"><span class="ic"><GraduationCap size={18} /></span><h3>{t('maayan.promise.answer.t')}</h3><p>{t('maayan.promise.answer.d')}</p></div>
        <div class="m-promise"><span class="ic"><MailCheck size={18} /></span><h3>{t('maayan.promise.mail.t')}</h3><p>{t('maayan.promise.mail.d')}</p></div>
      </div>
    {/if}

    <section class="m-section m-narrow" style="margin-inline: auto; max-width: 46rem" aria-labelledby="qa">
      <h2 class="m-h2" id="qa">{t('maayan.qa.title')}</h2>

      {#if w.status !== 'open'}
        <p class="m-gate">{t('maayan.ask.closed')}</p>
      {:else if maayan.me}
        <form class="m-ask" id="ask" onsubmit={ask}>
          {#if followUp}
            <p class="follow-note">
              <Reply size={15} class="flip-rtl" /><span>{t('maayan.ask.followUp', { text: followUp.text.length > 80 ? `${followUp.text.slice(0, 78)}…` : followUp.text })}</span>
              <button type="button" class="btn btn-ghost btn-sm" onclick={() => (followUp = null)}><X size={14} />{t('maayan.ask.cancelFollowUp')}</button>
            </p>
          {/if}
          <label class="field">
            <span class="label">{t('maayan.ask.title')}</span>
            <textarea id="ask-text" class="input" bind:value={text} required minlength="8" maxlength="2000" dir="auto" placeholder={t('maayan.ask.placeholder')}></textarea>
          </label>
          <label class="field" style="margin-block-start: 12px">
            <span class="label">{t('maayan.ask.ref')}</span>
            <input class="input" bind:value={ref} maxlength="80" dir="auto" placeholder={t('maayan.ask.refPh')} />
          </label>
          <div class="row">
            <span class="hint">{#if !maayan.me.teacher && maayan.me.approved === 0}{t('maayan.ask.firstNote')}{/if}</span>
            <button type="submit" class="btn btn-primary" disabled={sending || text.trim().length < 8}><Send size={15} class="flip-rtl" />{t('maayan.ask.send')}</button>
          </div>
        </form>
      {:else}
        <div class="m-gate">
          <strong>{t('maayan.ask.signIn')}</strong>
          <p>{t('maayan.ask.signInBody')}</p>
          <a class="btn btn-primary btn-xl" href={joinHref}>{t('maayan.join')}</a>
        </div>
      {/if}

      <label class="m-search">
        <Search size={16} />
        <input type="search" class="input" bind:value={words} aria-label={t('maayan.qa.search')} placeholder={t('maayan.qa.searchPh')} dir="auto" />
      </label>
      <div class="m-tabs" role="tablist" aria-label={t('maayan.qa.title')}>
        <button type="button" role="tab" aria-selected={tab === 'answered'} onclick={() => (tab = 'answered')}>{t('maayan.qa.tab.answered')}<span class="n">{fmtNum(c.answered)}</span></button>
        <button type="button" role="tab" aria-selected={tab === 'waiting'} onclick={() => (tab = 'waiting')}>{t('maayan.qa.tab.waiting')}<span class="n">{fmtNum(c.waiting)}</span></button>
        {#if maayan.me}<button type="button" role="tab" aria-selected={tab === 'mine'} onclick={() => (tab = 'mine')}>{t('maayan.qa.tab.mine')}<span class="n">{fmtNum(mine.length)}</span></button>{/if}
      </div>
      <div class="m-list" role="tabpanel">
        {#each shown as q (q.id)}
          <QuestionCard {q} parent={byId(q.parentId)} highlight={q.id === linked} fresh={maayan.unseen.some(x => x.id === q.id)}>
            {#snippet actions()}
              <div class="q-actions">
                {#if maayan.me && q.status === 'answered' && w.status === 'open'}
                  <button type="button" class="btn btn-sm" onclick={() => startFollowUp(q)}><Reply size={14} class="flip-rtl" />{t('maayan.q.followUp')}</button>
                {/if}
                {#if q.status === 'answered' || q.status === 'published'}
                  <button type="button" class="btn btn-sm btn-ghost" onclick={() => copyLink(q)}><Link size={14} />{t('maayan.q.copy')}</button>
                {/if}
                {#if maayan.me && q.authorId === maayan.me.uid && q.status !== 'answered' && !q.sample}
                  <button type="button" class="btn btn-sm btn-ghost" onclick={() => withdraw(q)}><Undo2 size={14} />{t('maayan.q.withdraw')}</button>
                {/if}
              </div>
            {/snippet}
          </QuestionCard>
        {:else}
          <p class="m-empty">{words.trim() ? t('maayan.qa.noMatch') : t(`maayan.qa.empty.${tab}`)}</p>
        {/each}
      </div>
    </section>

    <section class="m-section" aria-labelledby="ladder">
      <div class="m-ladder">
        <h2 class="m-h2" id="ladder">{t('maayan.ladder.title')}</h2>
        <p>{t('maayan.ladder.body')}</p>
        <ol class="m-steps">
          <li class:here={!maayan.me}><b>{t('maayan.ladder.reader')}</b><span>{t('maayan.ladder.reader.d')}</span></li>
          <li class:here={!!maayan.me}><b>{t('maayan.ladder.member')}</b><span>{t('maayan.ladder.member.d')}</span></li>
          <li><b>{t('maayan.ladder.contributor')}</b><span>{t('maayan.ladder.contributor.d')}</span></li>
          <li><b>{t('maayan.ladder.holder')}</b><span>{t('maayan.ladder.holder.d')}</span></li>
        </ol>
        <a class="btn" href={href('/')}>{t('maayan.ladder.cta')}<ArrowRight size={15} class="flip-rtl" /></a>
      </div>
    </section>

    {#if others.length}
      <section class="m-section" aria-labelledby="more">
        <h2 class="m-h2" id="more">{t('maayan.next.title')}</h2>
        <div class="m-cards">
          {#each others as o (o.id)}
            <a class="m-card" href={href(`/maayan/${o.id}`)}>
              <span><span class="m-chip {o.status}">{t(`maayan.status.${o.status}`)}</span></span>
              <h3>{lt(o.title)}</h3>
              <p class="slogan">{lt(o.slogan)}</p>
              <p class="foot"><span>{t('maayan.studying', { n: fmtNum(maayan.studying(o.id)) })}</span></p>
            </a>
          {/each}
        </div>
      </section>
    {/if}
  </div>
{/if}

<style>
  .follow-note { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 12px; margin-block-end: 12px; border-radius: var(--r-sm); background: var(--accent-weak); color: var(--accent-text); font-size: var(--fs-sm); }
  .follow-note span { flex: 1; min-width: 12rem; }
  .q-actions { display: flex; flex-wrap: wrap; gap: 6px; }
  .q-actions:empty { display: none; }
</style>

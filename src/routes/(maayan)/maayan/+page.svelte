<script lang="ts">
  // All the wellsprings: the open ones to enter, the coming ones to follow.
  import { t, lt, fmtNum } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import { maayan } from '$lib/maayan/store.svelte';
  import { counts } from '$lib/maayan/engine';
  import Rings from '$lib/maayan/Rings.svelte';
  import Users from '@lucide/svelte/icons/users';
  import MessageCircleQuestionMark from '@lucide/svelte/icons/message-circle-question-mark';
  import Download from '@lucide/svelte/icons/download';
</script>

<svelte:head><title>{t('maayan.index.title')} · {t('maayan.brand')}</title></svelte:head>

<section class="m-hero">
  <Rings />
  <div class="m-wrap">
    <h1 class="m-h1">{t('maayan.index.title')}</h1>
    <p class="m-lead">{t('maayan.index.lead')}</p>
    <p class="m-sub" style="margin-block-start: 8px">{t('maayan.index.sub')}</p>
  </div>
</section>

<div class="m-wrap">
  <div class="m-cards">
    {#each maayan.sorted as w (w.id)}
      {@const c = counts(maayan.questions, w.id)}
      <article class="m-card m-card-link">
        <span><span class="m-chip {w.status}">{t(`maayan.status.${w.status}`)}</span></span>
        <h3><a class="stretch" href={href(`/maayan/${w.id}`)}>{lt(w.title)}</a></h3>
        <p class="sub">{lt(w.subtitle)}</p>
        <p class="slogan">{lt(w.slogan)}</p>
        <p class="foot">
          {#if maayan.studying(w.id)}<span><Users size={14} style="display:inline;vertical-align:-2px" /> {t('maayan.studying', { n: fmtNum(maayan.studying(w.id)) })}</span>{/if}
          {#if c.answered}<span><MessageCircleQuestionMark size={14} style="display:inline;vertical-align:-2px" /> {t('maayan.answeredCount', { n: fmtNum(c.answered) })}</span>{/if}
          {#if w.pdf}<a class="m-dl" href={w.pdf} download><Download size={14} />{w.pdfLabel ? lt(w.pdfLabel) : 'PDF'}</a>{/if}
        </p>
      </article>
    {/each}
  </div>
</div>

<script lang="ts">
  // Joining from the printed booklet: an email, the link, a name. Nothing else
  // is asked; a wallet comes later, from the member's page, if ever.
  import { page } from '$app/state';
  import { t, lt } from '$lib/team/i18n';
  import { href, go } from '$lib/team/nav';
  import { ui } from '$lib/team/ui.svelte';
  import { maayan, MAILS } from '$lib/maayan/store.svelte';
  import Rings from '$lib/maayan/Rings.svelte';
  import QuestionCard from '$lib/maayan/QuestionCard.svelte';
  import Mail from '@lucide/svelte/icons/mail';
  import MailCheck from '@lucide/svelte/icons/mail-check';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import Wallet from '@lucide/svelte/icons/wallet';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';

  const id = $derived(page.params.id ?? '');
  const w = $derived(maayan.wellspring(id));
  const proof = $derived(maayan.visible(id).find(q => q.status === 'answered'));

  const step = $derived(maayan.me ? 'done' : maayan.verifiedEmail ? 'profile' : maayan.linkSentTo ? 'check' : 'email');

  let email = $state('');
  let sending = $state(false);
  let name = $state('');
  let follows = $state<string[]>([]);
  let notify = $state(true);
  let quoteOk = $state(false);
  let saving = $state(false);

  // Follow this wellspring, and any coming one, unless the reader unticks them;
  // the name to show starts from the account's (Google), for the reader to change.
  $effect(() => {
    if (step === 'profile' && !name && maayan.accountName) name = maayan.accountName;
  });
  $effect(() => {
    if (step === 'profile' && follows.length === 0) {
      follows = maayan.sorted.filter(x => x.id === id || x.status === 'upcoming').map(x => x.id);
    }
  });

  // Already a member: straight back to the wellspring.
  $effect(() => {
    if (step === 'done') void go(`/maayan/${id}`);
  });

  async function send(e: SubmitEvent) {
    e.preventDefault();
    sending = true;
    await maayan.sendLink(email, `/maayan/${id}/join`);
    sending = false;
  }

  async function finish(e: SubmitEvent) {
    e.preventDefault();
    saving = true;
    const ok = await maayan.createProfile({ name, follows, notify, quoteOk, joinedFrom: `booklet:${id}` });
    saving = false;
    if (ok) {
      ui.toast('success', t('maayan.join.welcome'), 5000);
      await go(`/maayan/${id}`);
    }
  }

  function toggle(fid: string, on: boolean) {
    follows = on ? [...new Set([...follows, fid])] : follows.filter(x => x !== fid);
  }
</script>

<svelte:head><title>{t('maayan.join')} · {w ? lt(w.title) : t('maayan.name')}</title></svelte:head>

<section class="m-hero join">
  <Rings />
  <div class="m-wrap grid">
    <div class="intro">
      {#if w?.cover}
        <a class="m-cover small" href={w.pdf ?? href(`/maayan/${id}`)} aria-label={t('maayan.cover', { title: lt(w.title) })}>
          <img src={w.cover} alt={t('maayan.cover', { title: lt(w.title) })} width="420" height="595" />
        </a>
        {#if w.printed}<p class="holding">{t('maayan.join.holding')}</p>{/if}
      {/if}
      {#if w}<a class="m-eyebrow" href={href(`/maayan/${id}`)}>{t('maayan.hero.eyebrow')} · {lt(w.title)}</a>{/if}
      <h1 class="m-h1">{w ? t('maayan.join.title', { title: lt(w.title) }) : t('maayan.join')}</h1>
      <p class="m-lead">{t('maayan.join.lead')}</p>
      <ul class="facts">
        <li><ShieldCheck size={17} />{t('maayan.join.privacy')}</li>
        <li><Wallet size={17} />{t('maayan.join.walletNote')}</li>
      </ul>
    </div>

    <div class="m-form-card">
      {#if step === 'email'}
        <div class="form">
          <button type="button" class="btn btn-xl btn-block google" onclick={() => maayan.signInWithGoogle()}>
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            {t('maayan.join.google')}
          </button>
          {#if !maayan.live}<p class="hint">{t('maayan.join.googleNote')}</p>{/if}
          <p class="or"><span>{t('maayan.join.or')}</span></p>
        </div>
        <form class="form" onsubmit={send}>
          <label class="field">
            <span class="label">{t('maayan.join.email')}</span>
            <input class="input" type="email" inputmode="email" autocomplete="email" dir="ltr" required bind:value={email} placeholder="name@example.com" />
          </label>
          <button type="submit" class="btn btn-primary btn-xl btn-block" disabled={sending}>
            <Mail size={18} />{sending ? t('maayan.join.sending') : t('maayan.join.send')}
          </button>
          <p class="hint">{t('maayan.join.returning')}</p>
          <p class="hint"><a href={href('/maayan/privacy')}>{t('maayan.join.privacyLink')}</a></p>
        </form>
      {:else if step === 'check'}
        <div class="form">
          <span class="big-ic"><MailCheck size={30} /></span>
          <h2 class="m-h2" style="margin: 0">{t('maayan.join.checkTitle')}</h2>
          <p>{t('maayan.join.checkBody', { email: maayan.linkSentTo })}</p>
          <p class="hint">{t('maayan.join.checkSpam')}</p>
          {#if !maayan.live}
            <button type="button" class="btn btn-primary btn-xl btn-block" onclick={() => maayan.demoOpenLink()}>{t('maayan.join.demoOpen')}</button>
            <p class="hint">{t('maayan.join.demoNote')}</p>
          {/if}
          <button type="button" class="btn btn-ghost" onclick={() => maayan.cancelLink()}>{t('maayan.join.other')}</button>
        </div>
      {:else if step === 'profile'}
        <form class="form" onsubmit={finish}>
          <div>
            <h2 class="m-h2" style="margin: 0">{t('maayan.join.profileTitle')}</h2>
            <p class="hint">{t('maayan.join.confirmed', { email: maayan.verifiedEmail })}
              <button type="button" class="linklike" onclick={() => maayan.switchAccount()}>{t('maayan.join.notYou')}</button></p>
          </div>
          <label class="field">
            <span class="label">{t('maayan.join.name')}</span>
            <input class="input" required minlength="2" maxlength="60" autocomplete="nickname" bind:value={name} placeholder={t('maayan.join.namePh')} />
          </label>
          <fieldset class="field">
            <legend class="label">{t('maayan.join.follows')}</legend>
            <div class="m-follow-list">
              {#each maayan.sorted as x (x.id)}
                <label class="m-check">
                  <input type="checkbox" checked={follows.includes(x.id)} onchange={e => toggle(x.id, e.currentTarget.checked)} />
                  <span>{lt(x.title)}<small>{t(`maayan.status.${x.status}`)} · {lt(x.slogan)}</small></span>
                </label>
              {/each}
            </div>
          </fieldset>
          <label class="m-check"><input type="checkbox" bind:checked={notify} /><span>{t(MAILS ? 'maayan.join.notify' : 'maayan.join.notifySoon')}</span></label>
          <label class="m-check"><input type="checkbox" bind:checked={quoteOk} /><span>{t('maayan.join.quote')}</span></label>
          <button type="submit" class="btn btn-primary btn-xl btn-block" disabled={saving}>{t('maayan.join.done')}<ArrowRight size={18} class="flip-rtl" /></button>
        </form>
      {/if}
    </div>
  </div>
</section>

{#if proof && step !== 'profile'}
  <section class="m-wrap" aria-labelledby="proof" style="max-width: 46rem">
    <h2 class="m-h2" id="proof">{t('maayan.join.proof')}</h2>
    <QuestionCard q={proof} />
  </section>
{/if}

<style>
  .join .grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: var(--s8); align-items: start; }
  @media (max-width: 820px) { .join .grid { grid-template-columns: minmax(0, 1fr); gap: var(--s6); } }
  .m-cover.small { width: 96px; margin-block-end: 6px; }
  .holding { font-size: var(--fs-xs); color: var(--ink-3); margin-block-end: var(--s4); }
  .linklike { color: var(--accent-text); text-decoration: underline; text-underline-offset: 2px; margin-inline-start: 6px; }
  .facts { display: flex; flex-direction: column; gap: var(--s3); margin-block-start: var(--s6); color: var(--ink-2); font-size: var(--fs-md); line-height: 1.55; }
  .facts li { display: grid; grid-template-columns: auto 1fr; gap: 10px; }
  .facts :global(svg) { color: var(--accent-text); margin-block-start: 3px; }
  .big-ic { width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; background: var(--accent-weak); color: var(--accent-text); }
  fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
  .google { background: var(--surface-raised); border: 1px solid var(--rule-strong); color: var(--ink); gap: 10px; font-weight: 600; }
  .google:hover { background: var(--surface-2); }
  .or { display: flex; align-items: center; gap: 12px; color: var(--ink-3); font-size: var(--fs-sm); margin-block: 4px 12px; }
  .or::before, .or::after { content: ''; flex: 1; border-block-start: 1px solid var(--rule); }
  legend { padding: 0; margin-block-end: 6px; }
</style>

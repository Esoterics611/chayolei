<script lang="ts">
  // Joining from the printed booklet: an email, the link, a name. Nothing else
  // is asked; a wallet comes later, from the member's page, if ever.
  import { page } from '$app/state';
  import { t, lt } from '$lib/team/i18n';
  import { href, go } from '$lib/team/nav';
  import { ui } from '$lib/team/ui.svelte';
  import { maayan } from '$lib/maayan/store.svelte';
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

  // Follow this wellspring, and any coming one, unless the reader unticks them.
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
            <p class="hint">{t('maayan.join.confirmed', { email: maayan.verifiedEmail })}</p>
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
          <label class="m-check"><input type="checkbox" bind:checked={notify} /><span>{t('maayan.join.notify')}</span></label>
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
  .facts { display: flex; flex-direction: column; gap: var(--s3); margin-block-start: var(--s6); color: var(--ink-2); font-size: var(--fs-md); line-height: 1.55; }
  .facts li { display: grid; grid-template-columns: auto 1fr; gap: 10px; }
  .facts :global(svg) { color: var(--accent-text); margin-block-start: 3px; }
  .big-ic { width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; background: var(--accent-weak); color: var(--accent-text); }
  fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
  legend { padding: 0; margin-block-end: 6px; }
</style>

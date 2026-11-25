<script lang="ts">
  // Signing in, for returning members: Google, or a link by email, as they joined.
  // A member goes back where they were (?next=); someone signed in without a
  // profile yet finishes joining.
  import { page } from '$app/state';
  import { t } from '$lib/team/i18n';
  import { href, go } from '$lib/team/nav';
  import { maayan } from '$lib/maayan/store.svelte';
  import Rings from '$lib/maayan/Rings.svelte';
  import Mail from '@lucide/svelte/icons/mail';
  import MailCheck from '@lucide/svelte/icons/mail-check';

  const HASH = import.meta.env.VITE_HASH_ROUTER === '1';
  const params = $derived(new URLSearchParams(HASH ? (page.url.hash.split('?')[1] ?? '') : page.url.search));
  const next = $derived(params.get('next')?.startsWith('/maayan') && !params.get('next')!.startsWith('/maayan/login') ? params.get('next')! : '/maayan');
  const firstOpen = $derived(maayan.sorted.find(w => w.status === 'open')?.id ?? 'padah-beshalom');
  const here = $derived(next.split('/')[2] && maayan.wellspring(next.split('/')[2]!)?.status === 'open' ? next.split('/')[2]! : firstOpen);

  let email = $state('');
  let sending = $state(false);

  $effect(() => {
    if (maayan.me) void go(next);
    else if (maayan.verifiedEmail) void go(`/maayan/${here}/join`);
  });

  async function send(e: SubmitEvent) {
    e.preventDefault();
    sending = true;
    await maayan.sendLink(email, `/maayan/login?next=${encodeURIComponent(next)}`);
    sending = false;
  }
</script>

<svelte:head><title>{t('maayan.nav.signIn')} · {t('maayan.name')}</title></svelte:head>

<section class="m-hero">
  <Rings />
  <div class="m-wrap" style="max-width: 30rem">
    <h1 class="m-h1" style="font-size: 2.2rem">{t('maayan.signin.title')}</h1>
    <p class="m-lead" style="margin-block-start: 4px">{t('maayan.signin.lead')}</p>

    <div class="m-form-card" style="margin-block-start: 24px">
      {#if maayan.linkSentTo}
        <div class="form">
          <span class="big-ic"><MailCheck size={30} /></span>
          <h2 class="m-h2" style="margin: 0">{t('maayan.join.checkTitle')}</h2>
          <p>{t('maayan.join.checkBody', { email: maayan.linkSentTo })}</p>
          <p class="hint">{t('maayan.join.checkSpam')}</p>
          {#if !maayan.live}
            <button type="button" class="btn btn-primary btn-xl btn-block" onclick={() => maayan.demoOpenLink()}>{t('maayan.join.demoOpen')}</button>
          {/if}
          <button type="button" class="btn btn-ghost" onclick={() => maayan.cancelLink()}>{t('maayan.join.other')}</button>
        </div>
      {:else}
        <div class="form">
          <button type="button" class="btn btn-xl btn-block google" onclick={() => maayan.signInWithGoogle()}>
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            {t('maayan.join.google')}
          </button>
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
        </form>
      {/if}
      <p class="hint" style="margin-block-start: 16px">{t('maayan.signin.new')} <a href={href(`/maayan/${here}/join`)}>{t('maayan.signin.join')}</a></p>
    </div>
  </div>
</section>

<style>
  .google { background: var(--surface-raised); border: 1px solid var(--rule-strong); color: var(--ink); gap: 10px; font-weight: 600; }
  .google:hover { background: var(--surface-2); }
  .or { display: flex; align-items: center; gap: 12px; color: var(--ink-3); font-size: var(--fs-sm); margin-block: 4px 12px; }
  .or::before, .or::after { content: ''; flex: 1; border-block-start: 1px solid var(--rule); }
  .big-ic { width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; background: var(--accent-weak); color: var(--accent-text); }
  .hint a { color: var(--accent-text); text-decoration: underline; text-underline-offset: 2px; }
</style>

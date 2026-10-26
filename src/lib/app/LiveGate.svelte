<script lang="ts">
  // The live app before a team is open: loading, signing in, or no team yet.
  import { store } from '$lib/team/store.svelte';
  import { ui } from '$lib/team/ui.svelte';
  import { t } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import BrandMark from './BrandMark.svelte';
  import Wallet from '@lucide/svelte/icons/wallet';
  import Sparkles from '@lucide/svelte/icons/sparkles';

  let busy = $state(false);

  async function signIn() {
    busy = true;
    await store.signIn();
    busy = false;
  }
</script>

<div class="gate">
  <section class="card panel" aria-live="polite">
    <BrandMark size={40} />
    {#if store.status === 'loading'}
      <h1>{t('live.loading')}</h1>
    {:else if store.status === 'signed_out'}
      <h1>{t('live.signInTitle')}</h1>
      <p class="muted">{t('live.signInBody')}</p>
      <button type="button" class="btn btn-primary" onclick={signIn} disabled={busy}>
        <Wallet size={16} />{t(busy ? 'live.signingIn' : 'live.signIn')}
      </button>
      <p class="note">{t('live.signInNote')}</p>
    {:else}
      <h1>{t('live.noTeamTitle')}</h1>
      <p class="muted">{t('live.noTeamBody')}</p>
      <a class="btn btn-primary" href={href('/start')}><Sparkles size={16} />{t('team.start')}</a>
    {/if}
    <div class="seg" role="group" aria-label={t('account.language')}>
      <button type="button" aria-pressed={ui.locale === 'en'} onclick={() => ui.setLocale('en')} lang="en">English</button>
      <button type="button" aria-pressed={ui.locale === 'he'} onclick={() => ui.setLocale('he')} lang="he">עברית</button>
    </div>
  </section>
</div>

<style>
  .gate { min-height: 100dvh; display: grid; place-items: center; padding: var(--s6) var(--s4); background: var(--surface); }
  .card { width: min(440px, 100%); display: flex; flex-direction: column; align-items: center; gap: var(--s4); padding: var(--s8) var(--s6); text-align: center; }
  h1 { font-size: var(--fs-xl); font-weight: 600; letter-spacing: -0.01em; }
  .note { font-size: var(--fs-xs); color: var(--ink-3); }
  .seg { display: inline-flex; padding: 2px; border-radius: var(--r-sm); background: var(--surface-2); }
  .seg button { min-height: 26px; padding-inline: 10px; border-radius: 5px; font-size: var(--fs-sm); color: var(--ink-2); }
  .seg button[aria-pressed='true'] { background: var(--surface-raised); color: var(--ink); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12); }
</style>

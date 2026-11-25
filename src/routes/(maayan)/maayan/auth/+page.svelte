<script lang="ts">
  // Where the emailed link lands (live app): it completes sign-in, which
  // confirms the address, and goes on to the page the reader came from.
  import { page } from '$app/state';
  import { t } from '$lib/team/i18n';
  import { go, href } from '$lib/team/nav';
  import { maayan } from '$lib/maayan/store.svelte';

  let phase = $state<'opening' | 'needEmail' | 'bad'>('opening');
  let email = $state('');
  const next = $derived(page.url.searchParams.get('next')?.startsWith('/maayan') ? page.url.searchParams.get('next')! : '/maayan');

  async function complete(typed?: string) {
    phase = 'opening';
    const r = await maayan.completeLink(location.href, typed);
    if (r === 'ok') await go(next);
    else if (r === 'none') await go('/maayan');
    else phase = r;
  }

  $effect(() => { void complete(); });
</script>

<svelte:head><title>{t('maayan.join.opening')}</title></svelte:head>

<div class="m-wrap" style="max-width: 30rem; padding-block: 64px">
  <div class="m-form-card">
    {#if phase === 'opening'}
      <p>{t('maayan.join.opening')}</p>
    {:else if phase === 'needEmail'}
      <form class="form" onsubmit={e => { e.preventDefault(); void complete(email.trim()); }}>
        <p>{t('maayan.join.otherDevice')}</p>
        <input class="input" type="email" dir="ltr" required autocomplete="email" bind:value={email} aria-label={t('maayan.join.email')} />
        <button type="submit" class="btn btn-primary btn-block">{t('maayan.join.confirm')}</button>
      </form>
    {:else}
      <p>{t('maayan.join.badLink')}</p>
      <p style="margin-block-start: 16px"><a class="btn btn-primary" href={href(next)}>{t('maayan.join.send')}</a></p>
    {/if}
  </div>
</div>

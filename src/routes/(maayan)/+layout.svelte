<script lang="ts">
  // The wellsprings' shell: a slim top bar, the demo marker, the page, a footer.
  // Hebrew unless the reader chose otherwise: they come from a Hebrew booklet.
  import '$lib/ui/tokens.css';
  import '$lib/maayan/maayan.css';
  import { page } from '$app/state';
  import { ui } from '$lib/team/ui.svelte';
  import { t } from '$lib/team/i18n';
  import { href, currentPath } from '$lib/team/nav';
  import { maayan, TEAMS_DEMO } from '$lib/maayan/store.svelte';
  import Toasts from '$lib/ui/Toasts.svelte';
  import Droplets from '@lucide/svelte/icons/droplets';
  import GraduationCap from '@lucide/svelte/icons/graduation-cap';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import Languages from '@lucide/svelte/icons/languages';
  import MemberAvatar from '$lib/maayan/MemberAvatar.svelte';

  let { children } = $props();

  ui.init('he');
  maayan.init();

  const path = $derived(currentPath(page.url));
  const current = (p: string) => (path === p ? 'page' : undefined);
  // "Join" leads to the wellspring the reader is on, or the first one open.
  const here = $derived(path.split('/')[2] ?? '');
  const joinTo = $derived(maayan.wellspring(here)?.status === 'open' ? here : (maayan.sorted.find(w => w.status === 'open')?.id ?? 'padah-beshalom'));
</script>

<div class="ui maayan" dir={ui.dir} lang={ui.locale}>
  <header class="m-top">
    <div class="m-wrap">
      <a class="m-brand" href={href('/maayan')}>
        <Droplets size={20} />
        <span class="full">{t('maayan.brand')}</span><span class="short">{t('maayan.name')}</span>
      </a>
      <nav class="m-nav" aria-label={t('maayan.name')}>
        {#if TEAMS_DEMO}
          <a class="hide-sm" href={TEAMS_DEMO} target="_blank" rel="noopener"><LayoutDashboard size={16} />{t('maayan.nav.teamsDemo')}</a>
        {:else}
          <a class="hide-sm" href={href('/')}><LayoutDashboard size={16} />{t('maayan.nav.teams')}</a>
        {/if}
        {#if maayan.me?.teacher}
          <a href={href('/maayan/teacher')} aria-current={current('/maayan/teacher')}><GraduationCap size={16} />{t('maayan.nav.teacher')}</a>
        {/if}
        {#if maayan.me}
          <a href={href('/maayan/me')} aria-current={current('/maayan/me')}><MemberAvatar id={maayan.me.uid} name={maayan.me.name} teacher={!!maayan.me.teacher} size="xs" />{t('maayan.nav.me')}{#if maayan.unseen.length}<span class="m-badge" aria-label={t('maayan.me.newAnswers', { n: maayan.unseen.length })}>{maayan.unseen.length}</span>{/if}</a>
        {:else if maayan.status === 'ready'}
          <a class="m-join" href={href(`/maayan/${joinTo}/join`)}>{t('maayan.nav.join')}</a>
        {/if}
        <button type="button" onclick={() => ui.setLocale(ui.locale === 'he' ? 'en' : 'he')} lang={ui.locale === 'he' ? 'en' : 'he'}>
          <Languages size={16} />{t('maayan.lang')}
        </button>
      </nav>
    </div>
  </header>
  {#if !maayan.live}<p class="m-demo">{t('maayan.demo')}</p>{/if}

  <main id="main" tabindex="-1">
    {#if maayan.status === 'ready'}
      {@render children()}
    {:else}
      <p class="m-wrap muted" style="padding-block: 48px">{t('maayan.loading')}</p>
    {/if}
  </main>

  <footer class="m-foot">
    <div class="m-wrap m-foot-row">
      <a href="https://esoterics611.github.io/he/">{t('maayan.foot')}</a>
      <nav class="m-foot-links" aria-label={t('maayan.foot')}>
        <a href="https://esoterics611.github.io/he/library.html">{t('maayan.foot.library')}</a>
        <a href="https://esoterics611.github.io/he/dedicate.html">{t('maayan.foot.dedicate')}</a>
        <a href={href('/maayan/privacy')}>{t('maayan.foot.privacy')}</a>
        <a href="mailto:esoterics611@gmail.com">{t('maayan.foot.contact')}</a>
      </nav>
    </div>
  </footer>
  <Toasts />
</div>

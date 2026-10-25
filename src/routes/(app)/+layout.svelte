<script lang="ts">
  // The new UI's shell (UX_TECH_DESIGN.md §7): a rail on wide screens (icons
  // only at medium widths), a bottom bar on phones, a top bar with search,
  // the demo marker and the account menu, and the app-wide overlays.
  import '$lib/ui/tokens.css';
  import { onNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import { ui } from '$lib/team/ui.svelte';
  import { store } from '$lib/team/store.svelte';
  import { needsYou } from '$lib/team/engine';
  import { t, fmtNum } from '$lib/team/i18n';
  import { href, inSection } from '$lib/team/nav';
  import { isMac } from '$lib/app/format';
  import TeamSwitcher from '$lib/app/TeamSwitcher.svelte';
  import AccountMenu from '$lib/app/AccountMenu.svelte';
  import CommandPalette from '$lib/app/CommandPalette.svelte';
  import Dialogs from '$lib/app/Dialogs.svelte';
  import BrandMark from '$lib/app/BrandMark.svelte';
  import TokenMark from '$lib/app/TokenMark.svelte';
  import ConfirmSign from '$lib/ui/ConfirmSign.svelte';
  import Toasts from '$lib/ui/Toasts.svelte';
  import House from '@lucide/svelte/icons/house';
  import ListTree from '@lucide/svelte/icons/list-tree';
  import PenLine from '@lucide/svelte/icons/pen-line';
  import Scale from '@lucide/svelte/icons/scale';
  import Landmark from '@lucide/svelte/icons/landmark';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import Search from '@lucide/svelte/icons/search';

  let { children } = $props();

  ui.init();
  store.init();

  const NAV = [
    { path: '/', key: 'nav.home', icon: House },
    { path: '/plan', key: 'nav.plan', icon: ListTree },
    { path: '/work', key: 'nav.work', icon: PenLine },
    { path: '/decide', key: 'nav.decide', icon: Scale },
    { path: '/treasury', key: 'nav.treasury', icon: Landmark },
  ];

  const needs = $derived(store.team ? needsYou(store.team, store.me, store.now).length : 0);
  const openDecisions = $derived(store.team ? store.team.changes.filter(c => c.kind !== 'work' && c.status === 'open').length : 0);
  const badge = (path: string) => (path === '/' ? needs : path === '/decide' ? openDecisions : 0);
  const mod = isMac() ? '⌘' : 'Ctrl';

  onNavigate((navigation) => {
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });

  function onkeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      ui.paletteOpen = !ui.paletteOpen;
    }
  }

  function skip() {
    document.getElementById('main')?.focus();
  }
</script>

<svelte:window {onkeydown} />

<div class="ui shell" dir={ui.dir} lang={ui.locale}>
  <button type="button" class="skip" onclick={skip}>{t('nav.skip')}</button>

  <aside class="rail" aria-label={t('nav.primary')}>
    <div class="rail-team full"><TeamSwitcher /></div>
    <div class="rail-team compact"><TeamSwitcher compact /></div>
    <nav class="rail-nav">
      {#each NAV as item (item.path)}
        {@const active = inSection(page.url, item.path)}
        <a href={href(item.path)} aria-current={active ? 'page' : undefined} title={t(item.key)}>
          <item.icon size={18} strokeWidth={active ? 2.25 : 1.85} />
          <span class="lbl">{t(item.key)}</span>
          {#if badge(item.path)}<span class="badge" aria-label="({fmtNum(badge(item.path))})">{fmtNum(badge(item.path))}</span>{/if}
        </a>
      {/each}
      <hr />
      <a href={href('/ledger')} aria-current={inSection(page.url, '/ledger') ? 'page' : undefined} title={t('nav.ledger')}>
        <BookOpen size={18} strokeWidth={inSection(page.url, '/ledger') ? 2.25 : 1.85} />
        <span class="lbl">{t('nav.ledger')}</span>
      </a>
    </nav>
    <div class="rail-foot">
      <p class="tmim" title={t('shell.tmimOnlyHint')}><TokenMark size={15} /><span class="lbl">{t('shell.tmimOnly')}</span></p>
      <p class="brand"><BrandMark size={22} /><span class="lbl">{t('app.name')}</span></p>
    </div>
  </aside>

  <div class="column">
    <header class="topbar">
      <div class="top-team"><TeamSwitcher compact /></div>
      <button type="button" class="search" onclick={() => (ui.paletteOpen = true)} aria-label={t('search.button')}>
        <Search size={16} />
        <span class="ph">{t('search.button')}</span>
        <span class="kbd">{mod} K</span>
      </button>
      <span class="spacer"></span>
      <span class="demo" title={t('demo.badge')}><span class="dot" aria-hidden="true"></span><span class="long">{t('demo.badge')}</span><span class="short">{t('demo.short')}</span></span>
      <div class="acct-full"><AccountMenu /></div>
      <div class="acct-compact"><AccountMenu compact /></div>
    </header>
    <main id="main" tabindex="-1">
      {#if store.team}{@render children()}{/if}
    </main>
  </div>

  <nav class="bottombar" aria-label={t('nav.primary')}>
    {#each NAV as item (item.path)}
      {@const active = inSection(page.url, item.path)}
      <a href={href(item.path)} aria-current={active ? 'page' : undefined}>
        <span class="ic">
          <item.icon size={20} strokeWidth={active ? 2.25 : 1.85} />
          {#if badge(item.path)}<span class="badge">{fmtNum(badge(item.path))}</span>{/if}
        </span>
        <span>{t(item.key)}</span>
      </a>
    {/each}
  </nav>

  <CommandPalette />
  <Dialogs />
  <ConfirmSign />
  <Toasts />
</div>

<style>
  :global(html), :global(body) { margin: 0; background: var(--surface); }
  .shell {
    display: grid;
    grid-template-columns: var(--rail) minmax(0, 1fr);
    min-height: 100dvh;
  }
  .skip {
    position: fixed;
    inset-block-start: 8px;
    inset-inline-start: 8px;
    z-index: 100;
    padding: 8px 12px;
    border-radius: var(--r-sm);
    background: var(--accent);
    color: var(--accent-ink);
    transform: translateY(-200%);
  }
  .skip:focus-visible { transform: none; }

  /* Rail */
  .rail {
    position: sticky;
    inset-block-start: 0;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    gap: var(--s4);
    padding: var(--s3) var(--s3) var(--s4);
    background: var(--surface-2);
    border-inline-end: 1px solid var(--rule);
    view-transition-name: rail;
  }
  .rail-team.compact { display: none; }
  .rail-nav { display: flex; flex-direction: column; gap: 2px; }
  .rail-nav a {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    height: 38px;
    padding-inline: 10px;
    border-radius: var(--r-sm);
    color: var(--ink-2);
    font-weight: 500;
  }
  .rail-nav a:hover { background: var(--surface-3); color: var(--ink); }
  .rail-nav a[aria-current='page'] { background: var(--surface-raised); color: var(--ink); box-shadow: 0 0 0 1px var(--rule), 0 1px 2px rgba(0, 0, 0, 0.04); }
  .rail-nav a[aria-current='page'] :global(svg) { color: var(--accent-text); }
  .rail-nav .badge {
    margin-inline-start: auto;
    min-width: 20px;
    height: 20px;
    padding-inline: 6px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: var(--accent);
    color: var(--accent-ink);
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .rail-nav hr { width: 100%; border: 0; border-block-start: 1px solid var(--rule); margin: 8px 0; }
  .rail-foot { margin-block-start: auto; display: flex; flex-direction: column; gap: 10px; padding-inline: 10px; }
  .tmim { display: flex; align-items: center; gap: 8px; font-size: var(--fs-xs); color: var(--ink-3); }
  .brand { display: flex; align-items: center; gap: 8px; font-weight: 600; letter-spacing: 0.01em; color: var(--ink-2); }

  /* Column and top bar */
  .column { min-width: 0; display: flex; flex-direction: column; }
  .topbar {
    position: sticky;
    inset-block-start: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: var(--s3);
    height: 56px;
    padding-inline: var(--s6);
    background: var(--surface);
    border-block-end: 1px solid var(--rule);
    view-transition-name: topbar;
  }
  .top-team { display: none; }
  .search {
    display: flex;
    align-items: center;
    gap: 10px;
    width: min(380px, 100%);
    height: 36px;
    padding-inline: 12px 8px;
    border: 1px solid var(--rule);
    border-radius: var(--r-sm);
    background: var(--surface-raised);
    color: var(--ink-3);
    text-align: start;
  }
  .search:hover { border-color: var(--rule-strong); }
  .search .ph { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .spacer { flex: 1; }
  .demo {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 28px;
    padding-inline: 10px;
    border: 1px dashed var(--rule-strong);
    border-radius: 999px;
    font-size: var(--fs-xs);
    color: var(--ink-2);
    white-space: nowrap;
  }
  .demo .dot { width: 7px; height: 7px; border-radius: 999px; background: var(--warning); box-shadow: 0 0 0 3px color-mix(in srgb, var(--warning) 22%, transparent); }
  .demo .short { display: none; }
  .acct-compact { display: none; }
  main { flex: 1; width: 100%; max-width: calc(var(--content) + 2 * var(--s8)); margin-inline: auto; padding: var(--s8) var(--s8) var(--s12); outline: none; }

  /* Bottom bar (phones) */
  .bottombar { display: none; }

  @media (max-width: 1279px) {
    .demo .long { display: none; }
    .demo .short { display: inline; }
  }
  @media (max-width: 1099px) {
    .shell { grid-template-columns: var(--rail-compact) minmax(0, 1fr); }
    .rail { padding-inline: 8px; align-items: center; }
    .rail-team.full { display: none; }
    .rail-team.compact { display: block; }
    .rail-nav a { width: 44px; height: 44px; justify-content: center; padding: 0; }
    .rail .lbl { display: none; }
    .rail-nav .badge { position: absolute; inset-block-start: 3px; inset-inline-end: 1px; min-width: 16px; height: 16px; padding-inline: 4px; font-size: 10px; margin: 0; }
    .rail-foot { align-items: center; padding: 0; }
    main { padding: var(--s6) var(--s6) var(--s12); }
  }
  @media (max-width: 639px) {
    .shell { grid-template-columns: minmax(0, 1fr); }
    .rail { display: none; }
    .topbar { padding-inline: var(--s4); gap: var(--s2); height: 52px; }
    .top-team { display: block; }
    .search { width: 36px; padding: 0; justify-content: center; }
    .search .ph, .search .kbd { display: none; }
    .acct-full { display: none; }
    .acct-compact { display: block; }
    main { padding: var(--s5) var(--s4) calc(88px + env(safe-area-inset-bottom)); }
    .bottombar {
      position: fixed;
      inset-inline: 0;
      inset-block-end: 0;
      z-index: 30;
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
      background: var(--surface-raised);
      border-block-start: 1px solid var(--rule);
      view-transition-name: bottombar;
    }
    .bottombar a { display: flex; flex-direction: column; align-items: center; gap: 2px; padding-block: 4px; font-size: 11px; color: var(--ink-3); border-radius: var(--r-sm); }
    .bottombar a[aria-current='page'] { color: var(--accent-text); font-weight: 600; }
    .bottombar .ic { position: relative; }
    .bottombar .badge { position: absolute; inset-block-start: -4px; inset-inline-end: -10px; min-width: 16px; height: 16px; padding-inline: 4px; border-radius: 999px; background: var(--accent); color: var(--accent-ink); font-size: 10px; font-weight: 600; display: grid; place-items: center; }
  }
</style>

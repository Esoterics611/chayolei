<script lang="ts">
  // Notifications (UX_REDESIGN.md phase 8): in the app, quietly. What waits on
  // you, votes about to close that you haven't cast, and what others did that
  // concerns you since you last looked. System notifications only for votes
  // about to close, and only after you ask for them.
  import { untrack } from 'svelte';
  import { store } from '$lib/team/store.svelte';
  import * as E from '$lib/team/engine';
  import { closingSoon, newsFor } from '$lib/team/notify';
  import { fmtNum, fmtRelative, lt, t } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import Popover from '$lib/ui/Popover.svelte';
  import { describe } from './describe';
  import Bell from '@lucide/svelte/icons/bell';
  import Vote from '@lucide/svelte/icons/vote';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';

  const SEEN_KEY = 'chayolei-seen-v1';
  const REMINDED_KEY = 'chayolei-reminded-v1';
  const DAY = 86_400_000;

  let open = $state(false);
  let seen = $state<Record<string, string>>(read(SEEN_KEY));
  let reminded = $state<Record<string, boolean>>(read(REMINDED_KEY));
  let permission = $state(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  // The live app pushes to this device even when Chayolei is closed, if the member turns it on.
  let push = $state<'unsupported' | 'unavailable' | 'blocked' | 'off' | 'on' | 'busy'>('unsupported');
  $effect(() => { if (store.live) void store.pushState().then(s => { push = s; }); });
  async function togglePush() {
    const want = push !== 'on';
    push = 'busy';
    push = (await store.setPush(want)) ?? (want ? 'off' : 'on');
  }

  const key = $derived(`${store.team.id}:${store.me}`);
  // First visit: the last three days count as new.
  const since = $derived(seen[key] ?? new Date(new Date(store.now).getTime() - 3 * DAY).toISOString());
  const news = $derived(newsFor(store.team, store.me, since));
  const recent = $derived(newsFor(store.team, store.me, new Date(new Date(store.now).getTime() - 14 * DAY).toISOString()).slice(0, 12));
  const needs = $derived(E.needsYou(store.team, store.me, store.now).length);
  const closing = $derived(closingSoon(store.team, store.me, store.now));
  // While the panel is open, keep showing what was new when it opened.
  let shownSince = $state('');

  // Opening keeps a note of what was new; closing marks it all as read.
  $effect(() => {
    if (open) {
      shownSince = untrack(() => since);
    } else if (untrack(() => shownSince)) {
      untrack(markRead);
      shownSince = '';
    }
  });

  function markRead() {
    seen = { ...seen, [key]: new Date().toISOString() };
    write(SEEN_KEY, seen);
  }

  async function askToRemind() {
    if (typeof Notification === 'undefined') return;
    permission = await Notification.requestPermission();
  }

  // Remind once per vote, a day before it closes, while the app is open
  // (devices with push get it from the server instead).
  $effect(() => {
    if (permission !== 'granted' || push === 'on') return;
    for (const c of closing) {
      const id = `${store.team.id}:${c.id}:${store.me}`;
      if (untrack(() => reminded[id])) continue;
      try {
        new Notification(t('notify.reminderTitle'), { body: `${lt(c.title)} · ${fmtRelative(c.closesAt!, store.now)}`, tag: id });
      } catch { /* some browsers only notify from a service worker */ }
      reminded = { ...untrack(() => reminded), [id]: true };
      write(REMINDED_KEY, reminded);
    }
  });

  function read<T>(k: string): T {
    try { return JSON.parse(localStorage.getItem(k) ?? '{}'); } catch { return {} as T; }
  }
  function write(k: string, v: unknown) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ }
  }
</script>

<Popover bind:open align="end" width="360px">
  {#snippet trigger({ open: isOpen, toggle, id })}
    <button type="button" class="bell" aria-expanded={isOpen} aria-controls={id} onclick={toggle}
      aria-label={news.length ? `${t('notify.title')}, ${t('notify.new', { n: fmtNum(news.length) })}` : t('notify.title')}>
      <Bell size={17} />
      {#if news.length}<span class="badge" aria-hidden="true">{fmtNum(news.length)}</span>{/if}
    </button>
  {/snippet}
  {#snippet children({ close })}
    <header>
      <p class="title">{t('notify.title')}</p>
      {#if news.length}<button type="button" class="link" onclick={markRead}>{t('notify.markRead')}</button>{/if}
    </header>
    {#if needs}
      <a class="row needs" href={href('/')} onclick={close}><span>{t('notify.needs', { n: fmtNum(needs) })}</span><ArrowRight size={14} class="flip-rtl" /></a>
    {/if}
    {#each closing as c (c.id)}
      <a class="row closing" href={href(`/decide/p/${c.id}`)} onclick={close}>
        <Vote size={15} />
        <span>{t('notify.closing', { when: fmtRelative(c.closesAt!, store.now), title: lt(c.title) })}</span>
      </a>
    {/each}
    {#if recent.length}
      <ul class="news">
        {#each recent as e (e.id)}
          {@const info = describe(store.team, e)}
          {@const Icon = info.icon}
          <li class:fresh={e.at > (shownSince || since)}>
            <Icon size={14} />
            {#if info.href}<a href={info.href} onclick={close}>{info.text}</a>{:else}<span>{info.text}</span>{/if}
            <time datetime={e.at}>{fmtRelative(e.at, store.now)}</time>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="empty">{t('notify.empty')}</p>
    {/if}
    {#if store.live && push !== 'unsupported' && push !== 'unavailable'}
      {#if push === 'blocked'}
        <p class="hint">{t('notify.pushBlocked')}</p>
      {:else}
        <button type="button" class="remind" aria-pressed={push === 'on'} disabled={push === 'busy'} onclick={togglePush}>{push === 'on' ? t('notify.pushOn') : t('notify.push')}</button>
        <p class="hint">{t('notify.pushHint')}</p>
      {/if}
    {:else if permission === 'default'}
      <button type="button" class="remind" onclick={askToRemind}>{t('notify.remind')}</button>
    {:else if permission === 'granted'}
      <p class="hint">{t('notify.reminding')}</p>
    {/if}
  {/snippet}
</Popover>

<style>
  .bell { position: relative; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 999px; color: var(--ink-2); }
  .bell:hover, .bell[aria-expanded='true'] { background: var(--surface-2); color: var(--ink); }
  .badge {
    position: absolute; inset-block-start: 2px; inset-inline-end: 1px;
    min-width: 17px; height: 17px; padding-inline: 4px; display: grid; place-items: center;
    border-radius: 999px; background: var(--accent); color: var(--accent-ink);
    font-size: 10.5px; font-weight: 600; font-variant-numeric: tabular-nums;
  }
  header { display: flex; align-items: center; justify-content: space-between; padding: 4px 6px 8px; }
  .title { font-weight: 600; }
  .link { font-size: var(--fs-sm); color: var(--accent-text); min-height: 24px; }
  .row { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: var(--r-sm); font-size: var(--fs-sm); }
  .row:hover { background: var(--surface-2); }
  .needs { justify-content: space-between; background: var(--accent-weak); color: var(--accent-text); font-weight: 500; }
  .closing { color: var(--ink); }
  .closing :global(svg) { flex: none; color: var(--st-changes); }
  .news { display: flex; flex-direction: column; gap: 2px; margin-block-start: 6px; max-height: 360px; overflow-y: auto; }
  .news li { display: grid; grid-template-columns: 16px 1fr auto; gap: 8px; align-items: start; padding: 7px 8px; border-radius: var(--r-sm); font-size: var(--fs-sm); line-height: 1.4; color: var(--ink-2); }
  .news li :global(svg) { margin-block-start: 2px; color: var(--ink-3); }
  .news li.fresh { background: var(--surface-2); color: var(--ink); }
  .news a { min-height: 24px; }
  .news a:hover { text-decoration: underline; }
  time { font-size: var(--fs-xs); color: var(--ink-3); white-space: nowrap; }
  .empty { padding: 12px 8px; font-size: var(--fs-sm); color: var(--ink-3); }
  .remind { width: 100%; margin-block-start: 8px; min-height: 32px; border-radius: var(--r-sm); border: 1px dashed var(--rule-strong); font-size: var(--fs-sm); color: var(--ink-2); }
  .remind:hover { background: var(--surface-2); color: var(--ink); }
  .hint { margin-block-start: 8px; padding: 0 6px; font-size: var(--fs-xs); color: var(--ink-3); }
</style>

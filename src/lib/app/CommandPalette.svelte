<script lang="ts">
  // ⌘K / Ctrl+K: go anywhere, find any objective, deliverable, proposal or
  // person, and run any action, with the keyboard (UX_TECH_DESIGN.md §7).
  import { store } from '$lib/team/store.svelte';
  import { ui } from '$lib/team/ui.svelte';
  import { lt, t } from '$lib/team/i18n';
  import { go } from '$lib/team/nav';
  import { can } from '$lib/team/rules';
  import { changeTitle, rolesOf } from './format';
  import type { IconComponent } from './describe';
  import House from '@lucide/svelte/icons/house';
  import ListTree from '@lucide/svelte/icons/list-tree';
  import PenLine from '@lucide/svelte/icons/pen-line';
  import Scale from '@lucide/svelte/icons/scale';
  import Landmark from '@lucide/svelte/icons/landmark';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import Wallet from '@lucide/svelte/icons/wallet';
  import ScrollText from '@lucide/svelte/icons/scroll-text';
  import Users from '@lucide/svelte/icons/users';
  import Gavel from '@lucide/svelte/icons/gavel';
  import Plus from '@lucide/svelte/icons/plus';
  import Coins from '@lucide/svelte/icons/hand-coins';
  import ArrowDownToLine from '@lucide/svelte/icons/arrow-down-to-line';
  import Languages from '@lucide/svelte/icons/languages';
  import SunMoon from '@lucide/svelte/icons/sun-moon';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import UserRound from '@lucide/svelte/icons/user-round';
  import UserPlus from '@lucide/svelte/icons/user-plus';
  import Target from '@lucide/svelte/icons/target';
  import FileText from '@lucide/svelte/icons/file-text';
  import Search from '@lucide/svelte/icons/search';
  import CornerDownLeft from '@lucide/svelte/icons/corner-down-left';
  import Sparkles from '@lucide/svelte/icons/sparkles';

  interface Item {
    id: string;
    group: string;
    label: string;
    hint?: string;
    icon: IconComponent;
    run: () => void;
  }

  let el: HTMLDialogElement | undefined = $state();
  let input: HTMLInputElement | undefined = $state();
  let query = $state('');
  let active = $state(0);

  $effect(() => {
    if (!el) return;
    if (ui.paletteOpen && !el.open) {
      query = '';
      active = 0;
      el.showModal();
      queueMicrotask(() => input?.focus());
    } else if (!ui.paletteOpen && el.open) el.close();
  });

  const nav = (path: string) => () => { ui.paletteOpen = false; go(path); };

  const items = $derived.by((): Item[] => {
    const team = store.team;
    if (!team) return [];
    const me = store.me;
    const out: Item[] = [];
    const goTo = t('palette.go');
    const acts = t('palette.actions');
    out.push(
      { id: 'g-home', group: goTo, label: t('nav.home'), icon: House, run: nav('/') },
      { id: 'g-plan', group: goTo, label: t('nav.plan'), icon: ListTree, run: nav('/plan') },
      { id: 'g-work', group: goTo, label: t('nav.work'), icon: PenLine, run: nav('/work') },
      { id: 'g-decide', group: goTo, label: t('nav.decide'), icon: Scale, run: nav('/decide') },
      { id: 'g-log', group: goTo, label: t('decide.tab.log'), hint: t('nav.decide'), icon: Gavel, run: nav('/decide/log') },
      { id: 'g-charter', group: goTo, label: t('decide.tab.charter'), hint: t('nav.decide'), icon: ScrollText, run: nav('/decide/charter') },
      { id: 'g-members', group: goTo, label: t('decide.tab.members'), hint: t('nav.decide'), icon: Users, run: nav('/decide/members') },
      { id: 'g-treasury', group: goTo, label: t('nav.treasury'), icon: Landmark, run: nav('/treasury') },
      { id: 'g-ledger', group: goTo, label: t('nav.ledger'), icon: BookOpen, run: nav('/ledger') },
      { id: 'g-wallet', group: goTo, label: t('account.wallet'), icon: Wallet, run: nav('/wallet') },
    );
    if (can(team, me, 'manage_plan')) {
      out.push(
        { id: 'a-obj', group: acts, label: t('plan.newObjective'), icon: Plus, run: () => ui.openDialog({ kind: 'newObjective' }) },
        { id: 'a-del', group: acts, label: t('plan.newDeliverable'), icon: Plus, run: () => ui.openDialog({ kind: 'newDeliverable' }) },
      );
    }
    if (can(team, me, 'propose')) {
      out.push(
        { id: 'a-rule', group: acts, label: t('decide.proposeRule'), icon: Scale, run: () => ui.openDialog({ kind: 'proposeRule' }) },
        { id: 'a-money', group: acts, label: t('decide.requestMoney'), icon: Coins, run: () => ui.openDialog({ kind: 'requestMoney' }) },
      );
    }
    out.push(
      { id: 'a-contrib', group: acts, label: t('treasury.contribute'), icon: ArrowDownToLine, run: () => ui.openDialog({ kind: 'contribute' }) },
      { id: 'a-lang', group: acts, label: t('palette.switchLanguage'), icon: Languages, run: () => { ui.setLocale(ui.locale === 'en' ? 'he' : 'en'); ui.paletteOpen = false; } },
      { id: 'a-theme', group: acts, label: t('palette.toggleTheme'), hint: t(`account.theme.${ui.theme}`), icon: SunMoon, run: () => { ui.setTheme(ui.theme === 'system' ? 'dark' : ui.theme === 'dark' ? 'light' : 'system'); } },
      { id: 'a-start', group: acts, label: t('team.start'), icon: Sparkles, run: nav('/start') },
    );
    if (can(team, me, 'admit')) {
      out.push({ id: 'a-invite', group: acts, label: t('invite.title'), icon: UserPlus, run: () => ui.openDialog({ kind: 'invite' }) });
    }
    if (!store.live) {
      out.push({ id: 'a-reset', group: acts, label: t('account.reset'), icon: RotateCcw, run: () => { ui.paletteOpen = false; store.reset(); go('/'); } });
      for (const m of team.members) {
        if (m.id === me) continue;
        out.push({ id: `p-act-${m.id}`, group: acts, label: t('palette.actAs', { name: lt(m.name) }), hint: rolesOf(team, m.id), icon: UserRound, run: () => { store.actAs(m.id); ui.paletteOpen = false; } });
      }
    }
    for (const o of team.objectives) {
      out.push({ id: `o-${o.id}`, group: t('palette.objectives'), label: lt(o.title), icon: Target, run: nav(`/plan/${o.id}`) });
    }
    for (const d of team.deliverables) {
      out.push({ id: `d-${d.id}`, group: t('palette.deliverables'), label: lt(d.title), hint: t(`stage.${d.stage}`), icon: FileText, run: nav(`/d/${d.id}`) });
    }
    for (const c of team.changes) {
      if (c.kind === 'work') continue;
      out.push({ id: `c-${c.id}`, group: t('palette.changes'), label: changeTitle(team, c), hint: t(`change.status.${c.status}`), icon: c.kind === 'rule' ? Scale : Coins, run: nav(`/decide/p/${c.id}`) });
    }
    for (const m of team.members) {
      out.push({ id: `m-${m.id}`, group: t('palette.people'), label: lt(m.name), hint: rolesOf(team, m.id), icon: UserRound, run: nav('/decide/members') });
    }
    return out;
  });

  const norm = (s: string) => s.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f\u0591-\u05c7\u2066-\u2069]/g, '');

  const results = $derived.by(() => {
    const q = norm(query.trim());
    if (!q) return items.filter(i => i.group === t('palette.go') || i.group === t('palette.actions')).slice(0, 18);
    const words = q.split(/\s+/);
    const hits = items.filter(i => {
      const hay = norm(`${i.label} ${i.hint ?? ''} ${i.group}`);
      return words.every(w => hay.includes(w));
    });
    const perGroup = new Map<string, number>();
    return hits.filter(i => {
      const n = (perGroup.get(i.group) ?? 0) + 1;
      perGroup.set(i.group, n);
      return n <= 6;
    });
  });

  const grouped = $derived.by(() => {
    const groups: { name: string; items: { item: Item; index: number }[] }[] = [];
    results.forEach((item, index) => {
      let g = groups.find(x => x.name === item.group);
      if (!g) { g = { name: item.group, items: [] }; groups.push(g); }
      g.items.push({ item, index });
    });
    return groups;
  });

  $effect(() => {
    void query;
    active = 0;
  });

  function run(item: Item | undefined) {
    if (!item) return;
    item.run();
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(results.length - 1, active + 1); scroll(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); scroll(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(results[active]); }
  }

  function scroll() {
    queueMicrotask(() => el?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' }));
  }
</script>

<dialog
  bind:this={el}
  class="palette"
  aria-label={t('palette.label')}
  onclose={() => (ui.paletteOpen = false)}
  onclick={(e) => { if (e.target === el) ui.paletteOpen = false; }}
>
  {#if ui.paletteOpen}
    <div class="box">
      <div class="search">
        <Search size={17} />
        <input
          bind:this={input}
          bind:value={query}
          {onkeydown}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={results[active] ? `pi-${results[active].id}` : undefined}
          aria-label={t('palette.label')}
          placeholder={t('palette.placeholder')}
          autocomplete="off"
          spellcheck="false"
        />
        <span class="kbd">Esc</span>
      </div>
      <div class="list" id="palette-list" role="listbox" aria-label={t('palette.label')}>
        {#each grouped as g (g.name)}
          <p class="group" role="presentation">{g.name}</p>
          {#each g.items as { item, index } (item.id)}
            <button
              type="button"
              id="pi-{item.id}"
              role="option"
              aria-selected={index === active}
              data-index={index}
              class="opt"
              onmousemove={() => (active = index)}
              onclick={() => run(item)}
              tabindex="-1"
            >
              <item.icon size={15} />
              <span class="lbl">{item.label}</span>
              {#if item.hint}<span class="hint">{item.hint}</span>{/if}
              {#if index === active}<CornerDownLeft size={13} class="enter" />{/if}
            </button>
          {/each}
        {:else}
          <p class="empty">{t('palette.empty')}</p>
        {/each}
      </div>
    </div>
  {/if}
</dialog>

<style>
  .palette {
    margin: 12vh auto auto;
    padding: 0;
    width: min(calc(100vw - 24px), 620px);
    border: 1px solid var(--rule);
    border-radius: var(--r-lg);
    background: var(--surface-raised);
    color: var(--ink);
    box-shadow: var(--shadow-pop);
  }
  .palette::backdrop { background: rgba(14, 18, 16, 0.35); }
  .palette[open] { animation: drop var(--fast) var(--ease); }
  @keyframes drop { from { opacity: 0; transform: translateY(-6px); } }
  .search { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-block-end: 1px solid var(--rule); color: var(--ink-3); }
  .search input { flex: 1; min-width: 0; border: 0; background: transparent; font-size: var(--fs-lg); color: var(--ink); outline: none; }
  .search input::placeholder { color: var(--ink-3); }
  .list { max-height: min(56vh, 460px); overflow-y: auto; padding: 6px; }
  .group { padding: 10px 10px 4px; font-size: var(--fs-xs); font-weight: 600; color: var(--ink-3); }
  .opt {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 36px;
    padding: 6px 10px;
    border-radius: var(--r-sm);
    text-align: start;
    color: var(--ink-2);
  }
  .opt[aria-selected='true'] { background: var(--accent-weak); color: var(--ink); }
  .lbl { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink); }
  .hint { font-size: var(--fs-xs); color: var(--ink-3); white-space: nowrap; }
  .opt :global(.enter) { color: var(--accent-text); }
  :global([dir='rtl']) .opt :global(.enter) { transform: scaleX(-1); }
  .empty { padding: 24px; text-align: center; color: var(--ink-3); }
  @media (max-width: 639px) {
    .palette { margin-block-start: 8px; }
  }
</style>

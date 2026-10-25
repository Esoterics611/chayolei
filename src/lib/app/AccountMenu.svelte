<script lang="ts">
  // The demo's account menu: act as any member to walk the whole flow
  // (owner → reviewer → approver), plus language, theme and reset.
  import { store } from '$lib/team/store.svelte';
  import { ui, type Theme } from '$lib/team/ui.svelte';
  import { lt, t } from '$lib/team/i18n';
  import { href, go } from '$lib/team/nav';
  import Popover from '$lib/ui/Popover.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import { rolesOf } from './format';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Check from '@lucide/svelte/icons/check';
  import Sun from '@lucide/svelte/icons/sun';
  import Moon from '@lucide/svelte/icons/moon';
  import Monitor from '@lucide/svelte/icons/monitor';
  import Wallet from '@lucide/svelte/icons/wallet';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

  let { compact = false }: { compact?: boolean } = $props();
  let open = $state(false);
  const me = $derived(store.meMember);

  const THEMES: { id: Theme; icon: typeof Sun }[] = [
    { id: 'system', icon: Monitor },
    { id: 'light', icon: Sun },
    { id: 'dark', icon: Moon },
  ];

  function actAs(id: string) {
    store.actAs(id);
    open = false;
    ui.toast('info', t('palette.actAs', { name: lt(store.meMember?.name) }));
  }

  function reset() {
    open = false;
    store.reset();
    go('/');
  }
</script>

{#if me}
  <Popover bind:open align="end" width="300px">
    {#snippet trigger({ open: isOpen, toggle, id })}
      <button type="button" class="trigger" aria-expanded={isOpen} aria-controls={id} onclick={toggle} aria-label="{t('account.acting')}: {lt(me.name)}, {rolesOf(store.team, me.id)}">
        <Avatar id={me.id} initials={me.initials} name={lt(me.name)} ai={me.ai} size="sm" />
        {#if !compact}
          <span class="txt">
            <span class="acting">{t('account.acting')}</span>
            <span class="name">{lt(me.name).split(' ')[0]} · {rolesOf(store.team, me.id)}</span>
          </span>
          <ChevronDown size={14} />
        {/if}
      </button>
    {/snippet}
    {#snippet children({ close })}
      <section>
        <p class="label">{t('account.acting')}</p>
        <p class="hint">{t('account.actingHint')}</p>
        <div class="people">
          {#each store.team.members as m (m.id)}
            <button type="button" class="person" aria-pressed={m.id === me.id} onclick={() => actAs(m.id)}>
              <Avatar id={m.id} initials={m.initials} name={lt(m.name)} ai={m.ai} size="sm" />
              <span class="txt"><span class="pname">{lt(m.name)}</span><span class="role">{rolesOf(store.team, m.id)}</span></span>
              {#if m.id === me.id}<Check size={15} />{/if}
            </button>
          {/each}
        </div>
      </section>
      <hr />
      <section class="row">
        <p class="label">{t('account.language')}</p>
        <div class="seg" role="group" aria-label={t('account.language')}>
          <button type="button" aria-pressed={ui.locale === 'en'} onclick={() => ui.setLocale('en')} lang="en">English</button>
          <button type="button" aria-pressed={ui.locale === 'he'} onclick={() => ui.setLocale('he')} lang="he">עברית</button>
        </div>
      </section>
      <section class="row">
        <p class="label">{t('account.theme')}</p>
        <div class="seg" role="group" aria-label={t('account.theme')}>
          {#each THEMES as th (th.id)}
            <button type="button" aria-pressed={ui.theme === th.id} onclick={() => ui.setTheme(th.id)} title={t(`account.theme.${th.id}`)}>
              <th.icon size={14} /><span class="visually-hidden">{t(`account.theme.${th.id}`)}</span>
            </button>
          {/each}
        </div>
      </section>
      <hr />
      <a class="link" href={href('/wallet')} onclick={close}><Wallet size={15} />{t('account.wallet')}</a>
      <button type="button" class="link" onclick={reset}><RotateCcw size={15} />{t('account.reset')}</button>
    {/snippet}
  </Popover>
{/if}

<style>
  .trigger { display: flex; align-items: center; gap: 8px; padding: 4px 8px 4px 4px; border-radius: 999px; color: var(--ink-2); }
  :global([dir='rtl']) .trigger { padding: 4px 4px 4px 8px; }
  .trigger:hover, .trigger[aria-expanded='true'] { background: var(--surface-2); }
  .txt { display: flex; flex-direction: column; line-height: 1.2; text-align: start; min-width: 0; }
  .acting { font-size: 10.5px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.05em; }
  .name { font-size: var(--fs-sm); font-weight: 500; color: var(--ink); white-space: nowrap; }
  section { padding: 4px 6px; }
  .label { font-size: var(--fs-xs); font-weight: 600; color: var(--ink-3); }
  .hint { font-size: var(--fs-xs); color: var(--ink-3); margin-block: 2px 6px; }
  .people { display: flex; flex-direction: column; gap: 1px; }
  .person { display: flex; align-items: center; gap: 10px; padding: 6px; border-radius: var(--r-sm); text-align: start; }
  .person:hover { background: var(--surface-2); }
  .person[aria-pressed='true'] { background: var(--accent-weak); }
  .person :global(svg) { margin-inline-start: auto; color: var(--accent-text); flex: none; }
  .pname { font-size: var(--fs-sm); font-weight: 500; }
  .role { font-size: var(--fs-xs); color: var(--ink-3); }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .seg { display: inline-flex; padding: 2px; border-radius: var(--r-sm); background: var(--surface-2); }
  .seg button { display: inline-flex; align-items: center; gap: 4px; min-height: 26px; padding-inline: 9px; border-radius: 5px; font-size: var(--fs-sm); color: var(--ink-2); }
  .seg button[aria-pressed='true'] { background: var(--surface-raised); color: var(--ink); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12); }
  hr { border: 0; border-block-start: 1px solid var(--rule); margin: 6px 0; }
  .link { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px; border-radius: var(--r-sm); font-size: var(--fs-sm); color: var(--ink-2); text-align: start; }
  .link:hover { background: var(--surface-2); color: var(--ink); }
</style>

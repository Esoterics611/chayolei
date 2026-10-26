<script lang="ts">
  // People belong to several teams: the active team at the top of the rail.
  import { store } from '$lib/team/store.svelte';
  import { lt, t, fmtNum } from '$lib/team/i18n';
  import { href, go } from '$lib/team/nav';
  import Popover from '$lib/ui/Popover.svelte';
  import TeamMark from './TeamMark.svelte';
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
  import Check from '@lucide/svelte/icons/check';
  import Plus from '@lucide/svelte/icons/plus';

  let { compact = false }: { compact?: boolean } = $props();
  let open = $state(false);

  function pick(id: string) {
    store.switchTeam(id);
    open = false;
    go('/');
  }
</script>

{#if store.team}
  <Popover bind:open width="272px">
    {#snippet trigger({ open: isOpen, toggle, id })}
      <button type="button" class="trigger" class:compact aria-expanded={isOpen} aria-controls={id} onclick={toggle} title={t('team.switch')} aria-label={compact ? `${t('team.switch')}: ${lt(store.team.name)}` : undefined}>
        <TeamMark id={store.team.id} name={lt(store.team.name)} size={compact ? 32 : 30} />
        {#if !compact}
          <span class="txt">
            <span class="name">{lt(store.team.name)}</span>
            <span class="meta">{t('team.members', { n: fmtNum(store.team.members.length) })}</span>
          </span>
          <ChevronsUpDown size={15} class="chev" />
        {/if}
      </button>
    {/snippet}
    {#snippet children({ close })}
      <p class="label">{t('team.switch')}</p>
      {#each store.teams as tm (tm.id)}
        <button type="button" class="item" aria-current={tm.id === store.team.id ? 'true' : undefined} onclick={() => pick(tm.id)}>
          <TeamMark id={tm.id} name={lt(tm.name)} size={26} />
          <span class="txt">
            <span class="name">{lt(tm.name)}</span>
            <span class="meta">{t('team.members', { n: fmtNum(tm.members.length) })}</span>
          </span>
          {#if tm.id === store.team.id}<Check size={15} />{/if}
        </button>
      {/each}
      <hr />
      <a class="item" href={href('/start')} onclick={close}><span class="plus"><Plus size={15} /></span>{t('team.start')}</a>
    {/snippet}
  </Popover>
{/if}

<style>
  .trigger {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 6px;
    border-radius: var(--r-md);
    text-align: start;
  }
  .trigger:hover, .trigger[aria-expanded='true'] { background: var(--surface-3); }
  .trigger.compact { justify-content: center; padding: 4px; }
  .txt { display: flex; flex-direction: column; min-width: 0; flex: 1; line-height: 1.25; }
  .name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .meta { font-size: var(--fs-xs); color: var(--ink-3); }
  .trigger :global(.chev) { color: var(--ink-3); flex: none; }
  .label { padding: 6px 8px 4px; font-size: var(--fs-xs); font-weight: 600; color: var(--ink-3); }
  .item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 7px 8px;
    border-radius: var(--r-sm);
    text-align: start;
  }
  .item:hover { background: var(--surface-2); }
  .item :global(svg:last-child) { color: var(--accent-text); }
  .plus { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; border: 1px dashed var(--rule-strong); color: var(--ink-2); }
  hr { border: 0; border-block-start: 1px solid var(--rule); margin: 6px 0; }
</style>

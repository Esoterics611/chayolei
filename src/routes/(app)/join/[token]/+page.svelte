<script lang="ts">
  // Joining by invite (UX_REDESIGN.md §7.1): see the team's purpose and its
  // charter in plain words, sign in, and join with the charter's joiner role.
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { store } from '$lib/team/store.svelte';
  import { PERMISSIONS, RULE_ORDER } from '$lib/team/templates';
  import { lt, t, fmtNum } from '$lib/team/i18n';
  import { go, href } from '$lib/team/nav';
  import type { InviteInfo } from '$lib/team/live';
  import type { RuleKey } from '$lib/team/types';
  import BrandMark from '$lib/app/BrandMark.svelte';
  import { fmtRule } from '$lib/app/format';
  import Wallet from '@lucide/svelte/icons/wallet';
  import UserPlus from '@lucide/svelte/icons/user-plus';

  const token = $derived(page.params.token ?? '');
  let info = $state<InviteInfo | undefined>();
  let loading = $state(store.live);
  let name = $state('');
  let busy = $state(false);

  const member = $derived(info ? store.teams.some(x => x.id === info!.teamId) : false);
  const joinerRoles = $derived(info ? info.roles.filter(r => info!.joinerRoleIds.includes(r.id)) : []);

  onMount(async () => {
    if (!store.live) return;
    info = await store.inviteInfo(token);
    loading = false;
  });

  async function signIn() {
    busy = true;
    await store.signIn();
    busy = false;
  }

  async function join(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    const team = await store.acceptInvite(token, name.trim());
    busy = false;
    if (team) await go('/');
  }

  function open() {
    if (!info) return;
    store.switchTeam(info.teamId);
    void go('/');
  }
</script>

<svelte:head><title>{info ? t('join.title', { team: lt(info.name) }) : t('join.heading')}</title></svelte:head>

<div class="join">
  <header><BrandMark size={34} /><h1>{info ? t('join.title', { team: lt(info.name) }) : t('join.heading')}</h1></header>

  {#if !store.live}
    <p class="panel pad muted">{t('join.demo')} <a href={href('/')}>{t('nav.home')}</a></p>
  {:else if loading}
    <p class="muted" aria-live="polite">{t('join.loading')}</p>
  {:else if !info}
    <p class="panel pad muted">{t('err.invite_invalid')}</p>
  {:else}
    <section class="panel pad">
      <p class="eyebrow-label">{t('start.purpose')}</p>
      <p class="purpose" dir="auto">{lt(info.purpose)}</p>
      <p class="muted">{t('team.members', { n: fmtNum(info.memberCount) })}</p>
    </section>

    <section class="panel pad charter">
      <div>
        <p class="eyebrow-label">{t('join.youJoinAs')}</p>
        <ul class="roles">
          {#each joinerRoles as r (r.id)}
            <li><span class="rn">{lt(r.name)}</span><span class="rp">{PERMISSIONS.filter(p => r.permissions.includes(p)).map(p => t(`perm.${p}`)).join(' · ')}</span></li>
          {/each}
        </ul>
      </div>
      <div>
        <p class="eyebrow-label">{t('start.rules')}</p>
        <ul class="rules">
          {#each RULE_ORDER as k (k)}<li><span>{t(`rule.${k}`)}</span><span class="rv">{fmtRule(k as RuleKey, info.rules[k] ?? 0)}</span></li>{/each}
        </ul>
      </div>
    </section>

    {#if member}
      <p class="panel pad">{t('join.already')} <button type="button" class="btn btn-primary" onclick={open}>{t('join.open')}</button></p>
    {:else if !info.usable}
      <p class="panel pad muted">{t('err.invite_invalid')}</p>
    {:else if store.status === 'signed_out'}
      <div class="act">
        <button type="button" class="btn btn-primary" onclick={signIn} disabled={busy}><Wallet size={16} />{t(busy ? 'live.signingIn' : 'join.signIn')}</button>
        <p class="note">{t('live.signInNote')}</p>
      </div>
    {:else if store.status === 'loading'}
      <p class="muted" aria-live="polite">{t('live.loading')}</p>
    {:else}
      <form class="form panel pad" onsubmit={join}>
        <label class="field">
          <span class="label">{t('start.you')}</span>
          <input class="input" bind:value={name} required maxlength="80" placeholder={t('start.youPlaceholder')} />
        </label>
        <div class="form-actions"><button type="submit" class="btn btn-primary" disabled={busy || !name.trim()}><UserPlus size={15} />{t('join.join')}</button></div>
      </form>
    {/if}
  {/if}
</div>

<style>
  .join { max-width: 680px; margin-inline: auto; display: flex; flex-direction: column; gap: var(--s5); }
  header { display: flex; align-items: center; gap: 14px; }
  h1 { font-size: var(--fs-2xl); font-weight: 600; letter-spacing: -0.015em; }
  .pad { padding: var(--s5); }
  .purpose { font-size: var(--fs-lg); margin-block: 4px 8px; }
  .charter { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: var(--s5); }
  .roles, .rules { display: flex; flex-direction: column; gap: 8px; margin-block-start: 6px; }
  .roles li { display: flex; flex-direction: column; }
  .rn { font-weight: 600; }
  .rp { font-size: var(--fs-sm); color: var(--ink-2); }
  .rules li { display: flex; justify-content: space-between; gap: 12px; font-size: var(--fs-sm); }
  .rv { font-variant-numeric: tabular-nums; font-family: var(--font-mono); }
  .act { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
  .note { font-size: var(--fs-xs); color: var(--ink-3); }
</style>

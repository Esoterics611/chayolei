<script lang="ts">
  import { untrack } from 'svelte';
  // New roles for a member, shown as a diff before it opens for votes. No
  // roles at all removes them from the team (docs/TEAM_CONTRACTS.md §2).
  import { store } from '$lib/team/store.svelte';
  import { ui } from '$lib/team/ui.svelte';
  import { activeMembers, leavesNoVoter, member, ruleValue } from '$lib/team/rules';
  import { lt, t, fmtNum } from '$lib/team/i18n';
  import { go, href } from '$lib/team/nav';
  import { nameOf, roleNames } from '../format';

  let { done, memberId }: { done: () => void; memberId?: string } = $props();
  const team = $derived(store.team);
  const people = $derived(activeMembers(team).filter(m => !m.ai));

  let who = $state(untrack(() => memberId) ?? '');
  let picked = $state<string[]>(untrack(() => member(store.team, memberId)?.roleIds.slice() ?? []));
  let title = $state('');
  let why = $state('');

  const target = $derived(member(team, who));
  const from = $derived(target ? team.charter.roles.filter(r => target.roleIds.includes(r.id)).map(r => r.id) : []);
  const to = $derived(team.charter.roles.filter(r => picked.includes(r.id)).map(r => r.id));
  const unchanged = $derived(from.length === to.length && from.every(r => to.includes(r)));
  const open = $derived(team.changes.find(c => c.kind === 'role' && c.memberId === who && c.status === 'open'));
  const noVoter = $derived(!!target && leavesNoVoter(team, target.id, to));
  const valid = $derived(!!target && !unchanged && !open && !noVoter);
  const hours = $derived(ruleValue(team, 'vote_hours'));
  const autoTitle = $derived(!target || unchanged ? '' : to.length
    ? t('decide.roleChange', { name: nameOf(team, who), from: roleNames(team, from), to: roleNames(team, to) })
    : t('decide.removeMember', { name: nameOf(team, who) }));

  function pick(id: string) {
    who = id;
    picked = member(team, id)?.roleIds.slice() ?? [];
  }

  function toggle(roleId: string, on: boolean) {
    picked = on ? [...picked, roleId] : picked.filter(r => r !== roleId);
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!valid || !target) return;
    const finalTitle = title.trim() || autoTitle;
    const name = nameOf(team, who);
    ui.askToSign({
      title: t('decide.proposeRoles'),
      lines: [
        autoTitle,
        t('decide.opensVote', { hours: t('unit.hours', { n: fmtNum(hours) }) }),
        to.length ? t('decide.ifPasses.roles', { name, roles: roleNames(team, to) }) : t('decide.ifPasses.remove', { name }),
      ],
      onConfirm: async () => {
        const c = await store.do({ type: 'proposeRoles', memberId: who, to, title: finalTitle, why }, t('decide.proposed'));
        if (!c?.id) return false;
        done();
        go(`/decide/p/${c.id}`);
      },
    });
  }
</script>

<form class="form" onsubmit={submit}>
  <label class="field">
    <span class="label">{t('decide.rolesFor')}</span>
    <select class="input" value={who} onchange={e => pick(e.currentTarget.value)} required>
      <option value="" disabled>{t('decide.pickMember')}</option>
      {#each people as m (m.id)}<option value={m.id}>{lt(m.name)}{m.id === store.me ? ` (${t('common.you')})` : ''}</option>{/each}
    </select>
  </label>
  {#if target}
    <fieldset class="field roles">
      <legend class="label">{t('decide.charter.roles')}</legend>
      {#each team.charter.roles as r (r.id)}
        <label class="role">
          <input type="checkbox" checked={picked.includes(r.id)} onchange={e => toggle(r.id, e.currentTarget.checked)} />
          <span>
            <span class="rn">{lt(r.name)}</span>
            <span class="hint">{r.permissions.map(p => t(`perm.${p}`)).join(', ')}</span>
          </span>
        </label>
      {/each}
      <span class="hint">{t('decide.noRolesHint')}</span>
    </fieldset>
    <div class="rule-diff names" aria-live="polite">
      <span class="minus">− {roleNames(team, from)}</span>
      <span class="plus">+ {to.length ? roleNames(team, to) : t('decide.leavesTeam')}</span>
    </div>
    {#if open}
      <p class="warn" role="alert">{t('err.roles_open')} <a href={href(`/decide/p/${open.id}`)} onclick={done}>{t('common.open')}</a></p>
    {:else if noVoter}
      <p class="warn" role="alert">{t('err.last_voter')}</p>
    {/if}
  {/if}
  <label class="field">
    <span class="label">{t('decide.proposalTitle')} <span class="muted">· {t('common.optional')}</span></span>
    <input class="input" bind:value={title} placeholder={autoTitle} />
  </label>
  <label class="field">
    <span class="label">{t('decide.why')}</span>
    <textarea class="input" rows="3" bind:value={why} required placeholder={t('decide.whyRolesPlaceholder')}></textarea>
  </label>
  <p class="note">{t('change.decider.vote', { majority: ruleValue(team, 'majority_pct'), quorum: ruleValue(team, 'quorum_pct'), when: t('decide.inHours', { n: fmtNum(hours) }) })}</p>
  <div class="form-actions">
    <button type="button" class="btn" onclick={done}>{t('common.cancel')}</button>
    <button type="submit" class="btn btn-primary" disabled={!valid}>{t('decide.openVote')}</button>
  </div>
</form>

<style>
  .roles { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
  .role { display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; border: 1px solid var(--rule); border-radius: var(--r-sm); cursor: pointer; }
  .role input { margin-block-start: 3px; width: 16px; height: 16px; flex: none; }
  .role > span { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .rn { font-weight: 500; }
  .names { font-family: var(--font-ui); }
  .warn { font-size: var(--fs-sm); color: var(--st-changes); }
  .warn a { text-decoration: underline; }
</style>

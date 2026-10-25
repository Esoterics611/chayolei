<script lang="ts">
  // A member as avatar + name (and, optionally, their charter roles).
  import type { Team } from '$lib/team/types';
  import { member } from '$lib/team/rules';
  import { lt, t } from '$lib/team/i18n';
  import Avatar from '$lib/ui/Avatar.svelte';
  import { rolesOf } from './format';

  interface Props {
    team: Team;
    id: string | undefined;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    role?: boolean;
    first?: boolean;
    me?: string;
  }
  let { team, id, size = 'xs', role = false, first = false, me }: Props = $props();
  const m = $derived(member(team, id));
  const name = $derived(m ? lt(m.name) : t('people.unassigned'));
</script>

{#if m}
  <span class="person">
    <Avatar id={m.id} initials={m.initials} name={name} ai={m.ai} {size} />
    <span class="txt">
      <span class="name">{first ? name.split(' ')[0] : name}{#if me && me === m.id} <span class="you">({t('common.you')})</span>{/if}</span>
      {#if role}<span class="role">{rolesOf(team, m.id)}</span>{/if}
    </span>
  </span>
{:else}
  <span class="person none">{name}</span>
{/if}

<style>
  .person { display: inline-flex; align-items: center; gap: 7px; min-width: 0; }
  .txt { display: inline-flex; flex-direction: column; min-width: 0; line-height: 1.25; }
  .name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .you { color: var(--ink-3); font-weight: 400; }
  .role { font-size: var(--fs-xs); color: var(--ink-3); white-space: nowrap; }
  .none { color: var(--ink-3); font-style: italic; }
</style>

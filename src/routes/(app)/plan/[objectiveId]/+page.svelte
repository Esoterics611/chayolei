<script lang="ts">
  import { page } from '$app/state';
  import { store } from '$lib/team/store.svelte';
  import { lt, t } from '$lib/team/i18n';
  import PlanView from '$lib/app/PlanView.svelte';
  import NotFound from '$lib/app/NotFound.svelte';

  const objective = $derived(store.team.objectives.find(o => o.id === page.params.objectiveId));
</script>

<svelte:head><title>{objective ? lt(objective.title) : t('plan.title')} · {lt(store.team.name)}</title></svelte:head>

{#if objective}
  {#key objective.id}<PlanView objectiveId={objective.id} />{/key}
{:else}
  <NotFound back="/plan" />
{/if}

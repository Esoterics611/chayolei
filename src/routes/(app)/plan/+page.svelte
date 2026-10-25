<script lang="ts">
  import { store } from '$lib/team/store.svelte';
  import { lt, t } from '$lib/team/i18n';
  import PlanView from '$lib/app/PlanView.svelte';
</script>

<svelte:head><title>{t('plan.title')} · {lt(store.team.name)}</title></svelte:head>

<PlanView />

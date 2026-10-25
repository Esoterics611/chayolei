<script lang="ts">
  // An object that isn't in the active team (another team's link, or reset data).
  import { t } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import CircleX from '@lucide/svelte/icons/circle-x';

  let { back = '/' }: { back?: string } = $props();
</script>

<EmptyState icon={CircleX} title={t('err.not_found')}>
  <a class="btn" href={href(back)}>{t('common.back')}</a>
</EmptyState>

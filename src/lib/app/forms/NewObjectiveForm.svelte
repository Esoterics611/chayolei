<script lang="ts">
  import { store } from '$lib/team/store.svelte';
  import * as E from '$lib/team/engine';
  import { t } from '$lib/team/i18n';
  import { go } from '$lib/team/nav';
  import { dateToIso } from './dates';

  let { done }: { done: () => void } = $props();
  let title = $state('');
  let description = $state('');
  let due = $state('');

  function submit(e: SubmitEvent) {
    e.preventDefault();
    const o = store.run((tm, me, now) => E.addObjective(tm, me, { title, description, due: dateToIso(due) }, now), t('plan.created'));
    if (o) { done(); go(`/plan/${o.id}`); }
  }
</script>

<form class="form" onsubmit={submit}>
  <label class="field">
    <span class="label">{t('plan.field.title')}</span>
    <input class="input" bind:value={title} required placeholder={t('plan.objectivePlaceholder')} />
  </label>
  <label class="field">
    <span class="label">{t('plan.field.description')} <span class="muted">· {t('common.optional')}</span></span>
    <textarea class="input" rows="3" bind:value={description}></textarea>
  </label>
  <label class="field">
    <span class="label">{t('plan.field.due')} <span class="muted">· {t('common.optional')}</span></span>
    <input class="input" type="date" bind:value={due} />
  </label>
  <p class="note">{t('plan.budgetHint')}</p>
  <div class="form-actions">
    <button type="button" class="btn" onclick={done}>{t('common.cancel')}</button>
    <button type="submit" class="btn btn-primary">{t('plan.newObjective')}</button>
  </div>
</form>

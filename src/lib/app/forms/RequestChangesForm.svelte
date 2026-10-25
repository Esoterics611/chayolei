<script lang="ts">
  import { store } from '$lib/team/store.svelte';
  import * as E from '$lib/team/engine';
  import { t } from '$lib/team/i18n';

  let { done, changeId }: { done: () => void; changeId: string } = $props();
  let note = $state('');

  function submit(e: SubmitEvent) {
    e.preventDefault();
    const ok = store.run((tm, me, now) => { E.requestChanges(tm, me, changeId, note, now); return true; }, t('review.changesSent'));
    if (ok) done();
  }
</script>

<form class="form" onsubmit={submit}>
  <label class="field">
    <span class="label">{t('review.requestChangesNote')}</span>
    <textarea class="input" rows="4" bind:value={note} required></textarea>
    <span class="hint">{t('review.changesHint')}</span>
  </label>
  <div class="form-actions">
    <button type="button" class="btn" onclick={done}>{t('common.cancel')}</button>
    <button type="submit" class="btn btn-primary">{t('review.requestChanges')}</button>
  </div>
</form>

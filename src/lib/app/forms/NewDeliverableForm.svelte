<script lang="ts">
  import { untrack } from 'svelte';
  import { store } from '$lib/team/store.svelte';
  import { activeMembers, can, ruleCurrent } from '$lib/team/rules';
  import { lt, t, fmtNum } from '$lib/team/i18n';
  import { dateToIso } from './dates';

  let { done, objectiveId }: { done: () => void; objectiveId?: string } = $props();
  const team = $derived(store.team);
  const rule = $derived(ruleCurrent(team, 'deliverable_reward'));

  // The form starts from the request; later prop changes don't reset what was typed.
  let objective = $state(untrack(() => objectiveId) ?? store.team.objectives[0]?.id ?? '');
  let title = $state('');
  let scope = $state('');
  let reward = $state(ruleCurrent(store.team, 'deliverable_reward').value);
  let reviewerId = $state('');
  let approverId = $state('');
  let due = $state('');

  const owner = $derived(team.objectives.find(o => o.id === objective)?.ownerId ?? '');
  const reviewers = $derived(activeMembers(team).filter(m => can(team, m.id, 'review_work')));
  const approvers = $derived(activeMembers(team).filter(m => can(team, m.id, 'accept_work')));

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const d = await store.do({
      type: 'addDeliverable', objectiveId: objective, title, scope, reward: Number(reward),
      reviewerId: reviewerId || undefined, approverId: approverId || owner || undefined, due: dateToIso(due),
    }, t('plan.created'));
    if (d) done();
  }
</script>

<form class="form" onsubmit={submit}>
  <label class="field">
    <span class="label">{t('plan.objective')}</span>
    <select class="input" bind:value={objective} required>
      {#each team.objectives as o (o.id)}<option value={o.id}>{lt(o.title)}</option>{/each}
    </select>
  </label>
  <label class="field">
    <span class="label">{t('plan.field.title')}</span>
    <input class="input" bind:value={title} required placeholder={t('plan.deliverablePlaceholder')} />
  </label>
  <label class="field">
    <span class="label">{t('plan.field.scope')}</span>
    <textarea class="input" rows="2" bind:value={scope}></textarea>
  </label>
  <div class="grid2">
    <label class="field">
      <span class="label">{t('plan.field.reward')}</span>
      <input class="input num" type="number" min="0" step="1" bind:value={reward} required />
      <span class="hint">{t('plan.rewardHint', { rule: t('rule.deliverable_reward'), v: rule.version, value: fmtNum(rule.value) })}</span>
    </label>
    <label class="field">
      <span class="label">{t('plan.field.due')} <span class="muted">· {t('common.optional')}</span></span>
      <input class="input" type="date" bind:value={due} />
    </label>
    <label class="field">
      <span class="label">{t('plan.field.reviewer')}</span>
      <select class="input" bind:value={reviewerId}>
        <option value="">{t('plan.approverReviews')}</option>
        {#each reviewers as m (m.id)}<option value={m.id}>{lt(m.name)}</option>{/each}
      </select>
    </label>
    <label class="field">
      <span class="label">{t('plan.field.approver')}</span>
      <select class="input" bind:value={approverId}>
        <option value="">{t('plan.ownerApproves')}</option>
        {#each approvers as m (m.id)}<option value={m.id}>{lt(m.name)}</option>{/each}
      </select>
    </label>
  </div>
  <div class="form-actions">
    <button type="button" class="btn" onclick={done}>{t('common.cancel')}</button>
    <button type="submit" class="btn btn-primary" disabled={!objective}>{t('plan.newDeliverable')}</button>
  </div>
</form>

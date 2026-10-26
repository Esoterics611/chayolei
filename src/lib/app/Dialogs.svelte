<script lang="ts">
  // The app's shared forms, opened from any screen or the command palette.
  import { ui } from '$lib/team/ui.svelte';
  import { t } from '$lib/team/i18n';
  import Dialog from '$lib/ui/Dialog.svelte';
  import NewObjectiveForm from './forms/NewObjectiveForm.svelte';
  import NewDeliverableForm from './forms/NewDeliverableForm.svelte';
  import ProposeRuleForm from './forms/ProposeRuleForm.svelte';
  import RequestMoneyForm from './forms/RequestMoneyForm.svelte';
  import ContributeForm from './forms/ContributeForm.svelte';
  import RequestChangesForm from './forms/RequestChangesForm.svelte';
  import InviteForm from './forms/InviteForm.svelte';

  let open = $state(false);
  $effect(() => { open = !!ui.dialog; });
  const close = () => (open = false);

  const TITLES = {
    newObjective: 'plan.newObjective',
    newDeliverable: 'plan.newDeliverable',
    proposeRule: 'decide.proposeRule',
    requestMoney: 'decide.requestMoney',
    contribute: 'treasury.contribute',
    requestChanges: 'review.requestChanges',
    invite: 'invite.title',
  } as const;
  const DESCRIPTIONS: Partial<Record<keyof typeof TITLES, string>> = {
    newObjective: 'plan.objectiveDesc',
    proposeRule: 'decide.proposeDesc',
    requestMoney: 'decide.requestDesc',
  };
</script>

{#if ui.dialog}
  {@const req = ui.dialog}
  <Dialog bind:open title={t(TITLES[req.kind])} description={DESCRIPTIONS[req.kind] ? t(DESCRIPTIONS[req.kind]!) : undefined} onclose={() => (ui.dialog = null)}>
    {#if req.kind === 'newObjective'}
      <NewObjectiveForm done={close} />
    {:else if req.kind === 'newDeliverable'}
      <NewDeliverableForm done={close} objectiveId={req.objectiveId} />
    {:else if req.kind === 'proposeRule'}
      <ProposeRuleForm done={close} ruleKey={req.ruleKey} />
    {:else if req.kind === 'requestMoney'}
      <RequestMoneyForm done={close} type={req.type} objectiveId={req.objectiveId} to={req.to} />
    {:else if req.kind === 'contribute'}
      <ContributeForm done={close} />
    {:else if req.kind === 'requestChanges'}
      <RequestChangesForm done={close} changeId={req.changeId} />
    {:else if req.kind === 'invite'}
      <InviteForm done={close} />
    {/if}
  </Dialog>
{/if}

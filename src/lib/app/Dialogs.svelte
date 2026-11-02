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
  // Loaded when first opened: the first screen doesn't need them.
  const planSuggestForm = () => import('./forms/PlanSuggestForm.svelte');
  const proposeRolesForm = () => import('./forms/ProposeRolesForm.svelte');
  const reviewHelperForm = () => import('./forms/ReviewHelperForm.svelte');
  const summaryForm = () => import('./forms/SummaryForm.svelte');
  const sourcesForm = () => import('./forms/SourcesForm.svelte');
  const importClassicForm = () => import('./forms/ImportClassicForm.svelte');

  let open = $state(false);
  $effect(() => { open = !!ui.dialog; });
  const close = () => (open = false);

  const TITLES = {
    newObjective: 'plan.newObjective',
    newDeliverable: 'plan.newDeliverable',
    suggestPlan: 'planner.title',
    aiReview: 'helper.review.title',
    aiSummary: 'helper.summary.title',
    aiSources: 'helper.sources.title',
    proposeRule: 'decide.proposeRule',
    proposeRoles: 'decide.proposeRoles',
    requestMoney: 'decide.requestMoney',
    contribute: 'treasury.contribute',
    requestChanges: 'review.requestChanges',
    invite: 'invite.title',
    importClassic: 'classic.title',
  } as const;
  const DESCRIPTIONS: Partial<Record<keyof typeof TITLES, string>> = {
    newObjective: 'plan.objectiveDesc',
    suggestPlan: 'planner.desc',
    aiReview: 'helper.review.desc',
    aiSummary: 'helper.summary.desc',
    aiSources: 'helper.sources.desc',
    importClassic: 'classic.desc',
    proposeRule: 'decide.proposeDesc',
    proposeRoles: 'decide.proposeRolesDesc',
    requestMoney: 'decide.requestDesc',
  };
</script>

{#if ui.dialog}
  {@const req = ui.dialog}
  <Dialog bind:open title={t(TITLES[req.kind])} description={DESCRIPTIONS[req.kind] ? t(DESCRIPTIONS[req.kind]!) : undefined} width={req.kind === 'suggestPlan' || req.kind === 'aiReview' ? 'lg' : 'md'} onclose={() => (ui.dialog = null)}>
    {#if req.kind === 'newObjective'}
      <NewObjectiveForm done={close} />
    {:else if req.kind === 'newDeliverable'}
      <NewDeliverableForm done={close} objectiveId={req.objectiveId} />
    {:else if req.kind === 'suggestPlan'}
      {#await planSuggestForm() then { default: PlanSuggestForm }}<PlanSuggestForm done={close} objectiveId={req.objectiveId} />{/await}
    {:else if req.kind === 'aiReview'}
      {#await reviewHelperForm() then { default: ReviewHelperForm }}<ReviewHelperForm done={close} changeId={req.changeId} />{/await}
    {:else if req.kind === 'aiSummary'}
      {#await summaryForm() then { default: SummaryForm }}<SummaryForm done={close} threadRef={req.ref} />{/await}
    {:else if req.kind === 'aiSources'}
      {#await sourcesForm() then { default: SourcesForm }}<SourcesForm done={close} deliverableId={req.deliverableId} />{/await}
    {:else if req.kind === 'proposeRule'}
      <ProposeRuleForm done={close} ruleKey={req.ruleKey} />
    {:else if req.kind === 'proposeRoles'}
      {#await proposeRolesForm() then { default: ProposeRolesForm }}<ProposeRolesForm done={close} memberId={req.memberId} />{/await}
    {:else if req.kind === 'requestMoney'}
      <RequestMoneyForm done={close} type={req.type} objectiveId={req.objectiveId} to={req.to} />
    {:else if req.kind === 'contribute'}
      <ContributeForm done={close} />
    {:else if req.kind === 'requestChanges'}
      <RequestChangesForm done={close} changeId={req.changeId} />
    {:else if req.kind === 'invite'}
      <InviteForm done={close} />
    {:else if req.kind === 'importClassic'}
      {#await importClassicForm() then { default: ImportClassicForm }}<ImportClassicForm done={close} />{/await}
    {/if}
  </Dialog>
{/if}

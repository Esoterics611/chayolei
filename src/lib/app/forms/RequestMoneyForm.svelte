<script lang="ts">
  import { untrack } from 'svelte';
  // A money change: pay a member from the team account, or set an objective's
  // budget. The charter decides who decides: a role within the spend limit,
  // otherwise the members by vote. Always TMIM.
  import { store } from '$lib/team/store.svelte';
  import { ui } from '$lib/team/ui.svelte';
  import { ruleValue } from '$lib/team/rules';
  import { lt, t, fmtTmim, fmtNum } from '$lib/team/i18n';
  import { go } from '$lib/team/nav';
  import Amount from '$lib/ui/Amount.svelte';
  import Gavel from '@lucide/svelte/icons/gavel';

  interface Props { done: () => void; type?: 'transfer' | 'budget'; objectiveId?: string; to?: string }
  let { done, type: initialType, objectiveId, to: initialTo }: Props = $props();
  const team = $derived(store.team);

  // The form starts from the request; later prop changes don't reset what was typed.
  const init = untrack(() => ({ type: initialType, objectiveId, to: initialTo }));
  const firstObjective = init.objectiveId ?? store.team.objectives[0]?.id ?? '';
  let type = $state<'transfer' | 'budget'>(init.type ?? (init.objectiveId ? 'budget' : 'transfer'));
  let to = $state(init.to ?? store.me);
  let amount = $state<number | ''>('');
  let objective = $state(firstObjective);
  let budget = $state<number | ''>(store.team.objectives.find(o => o.id === firstObjective)?.budget ?? '');
  let title = $state('');
  let why = $state('');

  const limit = $derived(ruleValue(team, 'spend_limit'));
  const current = $derived(team.objectives.find(o => o.id === objective)?.budget ?? 0);
  const stake = $derived(type === 'transfer' ? Number(amount || 0) : Math.abs(Number(budget || 0) - current));
  const byVote = $derived(stake > limit);
  const valid = $derived(type === 'transfer' ? Number(amount) > 0 && !!to : budget !== '' && Number(budget) >= 0 && Number(budget) !== current);
  const autoTitle = $derived(
    type === 'transfer'
      ? t('decide.moneyTransfer', { amount: fmtTmim(Number(amount || 0)), name: lt(team.members.find(m => m.id === to)?.name) })
      : t('decide.moneyBudget', { objective: lt(team.objectives.find(o => o.id === objective)?.title), from: fmtTmim(current), to: fmtTmim(Number(budget || 0)) }),
  );

  function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!valid) return;
    const action = type === 'transfer'
      ? { type: 'transfer' as const, to, amount: Number(amount) }
      : { type: 'budget' as const, objectiveId: objective, to: Number(budget) };
    const finalTitle = title.trim() || autoTitle;
    ui.askToSign({
      title: t('decide.requestMoney'),
      lines: [
        autoTitle,
        byVote ? t('treasury.decidedByVote', { limit: fmtTmim(limit) }) : t('treasury.decidedByRole', { limit: fmtTmim(limit) }),
        type === 'transfer' ? t('decide.accountNow', { amount: fmtTmim(team.treasury.teamAccount) }) : t('decide.ifPasses.budget', { objective: lt(team.objectives.find(o => o.id === objective)?.title), to: fmtTmim(Number(budget)) }),
      ],
      onConfirm: async () => {
        const c = await store.do({ type: 'requestMoney', action, title: finalTitle, why }, t('treasury.requested'));
        if (!c?.id) return false;
        done();
        go(`/decide/p/${c.id}`);
      },
    });
  }
</script>

<form class="form" onsubmit={submit}>
  <div class="field">
    <span class="label">{t('treasury.requestType')}</span>
    <div class="choice" role="radiogroup" aria-label={t('treasury.requestType')}>
      <label class:on={type === 'transfer'}><input type="radio" bind:group={type} value="transfer" />{t('treasury.requestTransfer')}</label>
      <label class:on={type === 'budget'}><input type="radio" bind:group={type} value="budget" />{t('treasury.requestBudget')}</label>
    </div>
  </div>
  {#if type === 'transfer'}
    <div class="grid2">
      <label class="field">
        <span class="label">{t('treasury.to')}</span>
        <select class="input" bind:value={to}>
          {#each team.members as m (m.id)}<option value={m.id}>{lt(m.name)}</option>{/each}
        </select>
      </label>
      <label class="field">
        <span class="label">{t('treasury.amount')}</span>
        <input class="input num" type="number" min="1" step="1" bind:value={amount} required />
      </label>
    </div>
    <p class="hint">{t('treasury.accountHas', { amount: fmtTmim(team.treasury.teamAccount) })}</p>
  {:else}
    <label class="field">
      <span class="label">{t('plan.objective')}</span>
      <select class="input" bind:value={objective} onchange={() => (budget = current)}>
        {#each team.objectives as o (o.id)}<option value={o.id}>{lt(o.title)}</option>{/each}
      </select>
    </label>
    <label class="field">
      <span class="label">{t('treasury.newBudget')}</span>
      <input class="input num" type="number" min="0" step="1" bind:value={budget} required />
      <span class="hint">{t('decide.current', { value: fmtTmim(current) })}</span>
    </label>
  {/if}
  <label class="field">
    <span class="label">{t('decide.proposalTitle')} <span class="muted">· {t('common.optional')}</span></span>
    <input class="input" bind:value={title} placeholder={autoTitle} />
  </label>
  <label class="field">
    <span class="label">{t('decide.why')}</span>
    <textarea class="input" rows="2" bind:value={why} required></textarea>
  </label>
  <div class="decider" class:vote={byVote} aria-live="polite">
    <Gavel size={15} />
    <div>
      <p><Amount value={stake} size="sm" /> · {byVote ? t('treasury.decidedByVote', { limit: fmtTmim(limit) }) : t('treasury.decidedByRole', { limit: fmtTmim(limit) })}</p>
      {#if byVote}<p class="hint">{t('change.decider.vote', { majority: ruleValue(team, 'majority_pct'), quorum: ruleValue(team, 'quorum_pct'), when: t('decide.inHours', { n: fmtNum(ruleValue(team, 'vote_hours')) }) })}</p>{/if}
    </div>
  </div>
  <div class="form-actions">
    <button type="button" class="btn" onclick={done}>{t('common.cancel')}</button>
    <button type="submit" class="btn btn-primary" disabled={!valid}>{t('decide.submitRequest')}</button>
  </div>
</form>

<style>
  .choice { display: grid; gap: 6px; }
  .choice label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border: 1px solid var(--rule-strong);
    border-radius: var(--r-sm);
    cursor: pointer;
  }
  .choice label.on { border-color: var(--accent); background: var(--accent-weak); }
  .choice input { accent-color: var(--accent); }
  .decider { display: flex; gap: 10px; padding: 10px 12px; border-radius: var(--r-sm); background: var(--surface-2); font-size: var(--fs-sm); }
  .decider.vote { background: var(--st-review-bg); }
  .decider :global(svg) { flex: none; margin-block-start: 2px; color: var(--ink-3); }
</style>

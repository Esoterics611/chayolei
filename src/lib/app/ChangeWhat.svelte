<script lang="ts">
  // What a rule or money change changes, as a diff: the rule's old and new
  // value and version, or the TMIM that moves and the balance it leaves.
  import type { MoneyChange, RuleChange, Team } from '$lib/team/types';
  import { ruleCurrent } from '$lib/team/rules';
  import { lt, t, fmtTmim } from '$lib/team/i18n';
  import { fmtRule, nameOf } from './format';
  import Person from './Person.svelte';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Landmark from '@lucide/svelte/icons/landmark';
  import Target from '@lucide/svelte/icons/target';

  let { team, c, compact = false }: { team: Team; c: RuleChange | MoneyChange; compact?: boolean } = $props();

  const ruleVersion = $derived.by(() => {
    if (c.kind !== 'rule') return undefined;
    const r = team.charter.rules.find(x => x.key === c.ruleKey)!;
    const setByThis = r.history.find(h => h.setBy.kind === 'proposal' && h.setBy.changeId === c.id);
    return setByThis ? { from: setByThis.version - 1, to: setByThis.version } : { from: ruleCurrent(team, c.ruleKey).version, to: ruleCurrent(team, c.ruleKey).version + 1 };
  });
  const budgetFrom = $derived.by(() => {
    if (c.kind !== 'money' || c.action.type !== 'budget') return 0;
    const e = team.ledger.find(x => x.kind === 'budget_set' && x.refs.changeId === c.id);
    return e?.data?.from !== undefined ? Number(e.data.from) : (team.objectives.find(o => o.id === (c.action as { objectiveId: string }).objectiveId)?.budget ?? 0);
  });
</script>

{#if c.kind === 'rule'}
  <div class="what">
    <p class="subject">{t(`rule.${c.ruleKey}`)}{#if !compact}<span class="desc"> — {t(`rule.${c.ruleKey}.desc`)}</span>{/if}</p>
    <div class="rule-diff">
      <span class="minus">− {fmtRule(c.ruleKey, c.from)}</span>
      <span class="plus">+ {fmtRule(c.ruleKey, c.to)}</span>
      {#if ruleVersion}<span class="ver">v{ruleVersion.from} → v{ruleVersion.to}</span>{/if}
    </div>
  </div>
{:else if c.action.type === 'transfer'}
  <div class="what">
    <div class="flow">
      <span class="node"><Landmark size={15} />{t('treasury.account')}</span>
      <span class="amt">{fmtTmim(c.action.amount)}<ArrowRight size={14} class="flip-rtl" /></span>
      <span class="node"><Person {team} id={c.action.to} />{#if compact}<span class="visually-hidden">{nameOf(team, c.action.to)}</span>{/if}</span>
    </div>
  </div>
{:else}
  <div class="what">
    <p class="subject"><Target size={14} />{lt(team.objectives.find(o => o.id === (c.action as { objectiveId: string }).objectiveId)?.title)}</p>
    <div class="rule-diff">
      <span class="minus">− {fmtTmim(budgetFrom)}</span>
      <span class="plus">+ {fmtTmim(c.action.to)}</span>
    </div>
  </div>
{/if}

<style>
  .what { display: flex; flex-direction: column; gap: 8px; }
  .subject { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-weight: 500; }
  .desc { font-weight: 400; color: var(--ink-3); font-size: var(--fs-sm); }
  .flow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 12px; border-radius: var(--r-sm); border: 1px solid var(--rule); }
  .node { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: var(--surface-2); font-size: var(--fs-sm); }
  .amt { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: var(--fs-sm); color: var(--accent-text); font-weight: 500; }
</style>

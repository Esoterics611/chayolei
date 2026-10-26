<script lang="ts">
  import { untrack } from 'svelte';
  // An amendment to one rule of the charter, shown as a diff before it opens for votes.
  import type { RuleKey } from '$lib/team/types';
  import { store } from '$lib/team/store.svelte';
  import { ui } from '$lib/team/ui.svelte';
  import * as E from '$lib/team/engine';
  import { RULE_RANGE, ruleCurrent, ruleValue } from '$lib/team/rules';
  import { RULE_ORDER, RULE_UNITS } from '$lib/team/templates';
  import { t, fmtNum } from '$lib/team/i18n';
  import { go } from '$lib/team/nav';
  import { fmtRule } from '../format';

  let { done, ruleKey }: { done: () => void; ruleKey?: RuleKey } = $props();
  const team = $derived(store.team);

  let key = $state<RuleKey>(untrack(() => ruleKey) ?? 'review_reward');
  let to = $state<number | ''>('');
  let title = $state('');
  let why = $state('');

  const current = $derived(ruleCurrent(team, key));
  const hours = $derived(ruleValue(team, 'vote_hours'));
  const range = $derived(RULE_RANGE[key]);
  const valid = $derived(
    to !== '' && Number.isInteger(Number(to)) && Number(to) >= (range?.[0] ?? 0) && Number(to) <= (range?.[1] ?? Infinity)
      && Number(to) !== current.value,
  );
  const autoTitle = $derived(valid ? t('decide.ruleChange', { rule: t(`rule.${key}`), from: fmtRule(key, current.value), to: fmtRule(key, Number(to)) }) : '');
  const unitLabel = $derived(RULE_UNITS[key] === 'tmim' ? 'TMIM' : RULE_UNITS[key] === 'pct' ? '%' : t('decide.hoursUnit'));

  function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!valid) return;
    const value = Number(to);
    const finalTitle = title.trim() || autoTitle;
    ui.askToSign({
      title: t('decide.proposeRule'),
      lines: [
        t('decide.ruleChange', { rule: t(`rule.${key}`), from: fmtRule(key, current.value), to: fmtRule(key, value) }),
        t('decide.opensVote', { hours: t('unit.hours', { n: fmtNum(hours) }) }),
        t('decide.ifPasses.rule'),
      ],
      onConfirm: () => {
        const c = store.run((tm, me, now) => E.proposeRule(tm, me, { ruleKey: key, to: value, title: finalTitle, why }, now), t('decide.proposed'));
        if (!c) return false;
        done();
        go(`/decide/p/${c.id}`);
      },
    });
  }
</script>

<form class="form" onsubmit={submit}>
  <label class="field">
    <span class="label">{t('decide.rule')}</span>
    <select class="input" bind:value={key}>
      {#each RULE_ORDER as k (k)}<option value={k}>{t(`rule.${k}`)} · {fmtRule(k, ruleValue(team, k))}</option>{/each}
    </select>
    <span class="hint">{t(`rule.${key}.desc`)}</span>
  </label>
  <label class="field">
    <span class="label">{t('decide.newValue')} ({unitLabel})</span>
    <input class="input num" type="number" min={range?.[0] ?? 0} max={range?.[1]} step="1" bind:value={to} required />
    {#if range}<span class="hint">{t('decide.ruleRange', { min: fmtNum(range[0]), max: fmtNum(range[1]) })}</span>{/if}
  </label>
  <div class="rule-diff" aria-live="polite">
    <span class="minus">− {fmtRule(key, current.value)}</span>
    <span class="plus">+ {to === '' ? '…' : fmtRule(key, Number(to))}</span>
    <span class="ver">v{current.version} → v{current.version + 1}</span>
  </div>
  <label class="field">
    <span class="label">{t('decide.proposalTitle')} <span class="muted">· {t('common.optional')}</span></span>
    <input class="input" bind:value={title} placeholder={autoTitle} />
  </label>
  <label class="field">
    <span class="label">{t('decide.why')}</span>
    <textarea class="input" rows="3" bind:value={why} required placeholder={t('decide.whyPlaceholder')}></textarea>
  </label>
  <p class="note">{t('change.decider.vote', { majority: ruleValue(team, 'majority_pct'), quorum: ruleValue(team, 'quorum_pct'), when: t('decide.inHours', { n: fmtNum(hours) }) })}</p>
  <div class="form-actions">
    <button type="button" class="btn" onclick={done}>{t('common.cancel')}</button>
    <button type="submit" class="btn btn-primary" disabled={!valid}>{t('decide.openVote')}</button>
  </div>
</form>

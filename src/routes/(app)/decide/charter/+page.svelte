<script lang="ts">
  // The charter, versioned like code: every rule with its value, version and
  // the proposal that set it; the roles and what each may do.
  import type { RuleKey } from '$lib/team/types';
  import { store } from '$lib/team/store.svelte';
  import { ui } from '$lib/team/ui.svelte';
  import { can } from '$lib/team/rules';
  import { PERMISSIONS, RULE_ORDER } from '$lib/team/templates';
  import { lt, t, fmtDate, fmtNum } from '$lib/team/i18n';
  import { href } from '$lib/team/nav';
  import Avatar from '$lib/ui/Avatar.svelte';
  import DecideHeader from '$lib/app/DecideHeader.svelte';
  import { changeById, fmtRule } from '$lib/app/format';
  import ScrollText from '@lucide/svelte/icons/scroll-text';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Check from '@lucide/svelte/icons/check';
  import Scale from '@lucide/svelte/icons/scale';
  import UserCog from '@lucide/svelte/icons/user-cog';

  const team = $derived(store.team);
  const amendments = $derived(team.charter.rules.reduce((n, r) => n + r.history.length - 1, 0));
  const canPropose = $derived(can(team, store.me, 'propose'));
  let open = $state<RuleKey | null>(null);
  const rules = $derived(RULE_ORDER.map(k => team.charter.rules.find(r => r.key === k)!).filter(Boolean));
  const openRuleChange = (k: RuleKey) => team.changes.find(c => c.kind === 'rule' && c.ruleKey === k && c.status === 'open');
</script>

<svelte:head><title>{t('decide.tab.charter')} · {lt(team.name)}</title></svelte:head>

<DecideHeader />

<div class="charter-head">
  <span class="seal"><ScrollText size={22} /></span>
  <div>
    <h2>{t('decide.tab.charter')} · {lt(team.name)}</h2>
    <p class="muted">{t(amendments === 0 ? 'decide.charterVersionNone' : amendments === 1 ? 'decide.charterVersionOne' : 'decide.charterVersion', { n: fmtNum(amendments), date: fmtDate(team.createdAt, { withYear: true }) })}</p>
  </div>
</div>

<section aria-labelledby="rules-h">
  <h3 id="rules-h" class="sec">{t('decide.charter.rules')}</h3>
  <ul class="rules">
    {#each rules as r (r.key)}
      {@const cur = r.history[r.history.length - 1]}
      {@const pending = openRuleChange(r.key)}
      <li class="rule">
        <div class="r-main">
          <p class="r-name">{t(`rule.${r.key}`)}</p>
          <p class="r-desc">{t(`rule.${r.key}.desc`)}</p>
          {#if pending}<a class="pending" href={href(`/decide/p/${pending.id}`)}><Scale size={13} />{lt(pending.kind === 'rule' ? pending.title : '')}</a>{/if}
        </div>
        <div class="r-val">
          <span class="value">{fmtRule(r.key, cur.value)}</span>
          <button type="button" class="ver" aria-expanded={open === r.key} onclick={() => (open = open === r.key ? null : r.key)}>
            v{cur.version}<ChevronDown size={13} />
          </button>
        </div>
        <div class="r-act">
          {#if canPropose && !pending}<button type="button" class="btn btn-sm btn-ghost" onclick={() => ui.openDialog({ kind: 'proposeRule', ruleKey: r.key })}>{t('decide.charter.propose')}</button>{/if}
        </div>
        {#if open === r.key}
          <ol class="hist">
            {#each [...r.history].reverse() as h (h.version)}
              {@const ch = h.setBy.kind === 'proposal' ? changeById(team, h.setBy.changeId) : undefined}
              <li>
                <span class="hv">v{h.version}</span>
                <span class="hval">{fmtRule(r.key, h.value)}</span>
                <span class="hby">
                  {#if ch}<a href={href(`/decide/p/${ch.id}`)}>{t('decide.charter.byProposal', { title: lt(ch.kind === 'rule' ? ch.title : '') })}</a>{:else}{t('decide.charter.founding')}{/if}
                </span>
                <span class="hdate">{fmtDate(h.at, { withYear: true })}</span>
              </li>
            {/each}
          </ol>
        {/if}
      </li>
    {/each}
  </ul>
</section>

<section aria-labelledby="roles-h">
  <div class="sec-row">
    <h3 id="roles-h" class="sec">{t('decide.charter.roles')}</h3>
    {#if canPropose}<button type="button" class="btn btn-sm btn-ghost" onclick={() => ui.openDialog({ kind: 'proposeRoles' })}><UserCog size={14} />{t('decide.proposeRoles')}</button>{/if}
  </div>
  <p class="muted roles-note">{t('decide.charter.rolesByVote')}</p>
  <div class="roles">
    {#each team.charter.roles as role (role.id)}
      {@const holders = team.members.filter(m => m.roleIds.includes(role.id))}
      <article class="role panel">
        <header>
          <h4>{lt(role.name)}</h4>
          <span class="holders">
            {#each holders as m (m.id)}<Avatar id={m.id} initials={m.initials} name={lt(m.name)} ai={m.ai} size="xs" />{/each}
          </span>
        </header>
        <p class="can">{t('decide.charter.can')}</p>
        <ul class="perms">
          {#each PERMISSIONS as p (p)}
            <li class:yes={role.permissions.includes(p)}>{#if role.permissions.includes(p)}<Check size={13} />{:else}<span class="no"></span>{/if}{t(`perm.${p}`)}</li>
          {/each}
        </ul>
      </article>
    {/each}
  </div>
</section>

<style>
  .charter-head { display: flex; align-items: center; gap: 14px; margin-block-end: var(--s6); padding: var(--s5); border-radius: var(--r-lg); background: linear-gradient(135deg, var(--accent-weak), var(--surface-raised) 70%); border: 1px solid var(--rule); }
  .seal { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 12px; background: var(--accent); color: var(--accent-ink); flex: none; }
  .charter-head h2 { font-size: var(--fs-xl); font-weight: 600; font-family: var(--font-doc); }
  .sec { font-size: var(--fs-lg); font-weight: 600; margin: var(--s6) 0 var(--s3); }
  .rules { display: flex; flex-direction: column; border: 1px solid var(--rule); border-radius: var(--r-md); background: var(--surface-raised); }
  .rule { display: grid; grid-template-columns: minmax(0, 1fr) auto 150px; gap: 8px 16px; align-items: center; padding: 14px 16px; }
  .rule + .rule { border-block-start: 1px solid var(--rule); }
  .r-name { font-weight: 500; }
  .r-desc { font-size: var(--fs-sm); color: var(--ink-3); max-width: 64ch; }
  .pending { display: inline-flex; align-items: center; gap: 5px; margin-block-start: 6px; padding: 2px 8px; border-radius: 999px; background: var(--st-review-bg); color: var(--st-review); font-size: var(--fs-xs); font-weight: 500; }
  .r-val { display: flex; align-items: center; gap: 10px; }
  .value { font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .ver { display: inline-flex; align-items: center; gap: 3px; padding: 2px 6px; border-radius: 999px; border: 1px solid var(--rule-strong); font-family: var(--font-mono); font-size: var(--fs-xs); color: var(--ink-2); }
  .ver[aria-expanded='true'] :global(svg) { transform: rotate(180deg); }
  .r-act { display: flex; justify-content: flex-end; }
  .hist { grid-column: 1 / -1; display: flex; flex-direction: column; gap: 2px; margin-block-start: 4px; padding: 8px 12px; border-radius: var(--r-sm); background: var(--surface); }
  .hist li { display: grid; grid-template-columns: 40px 110px minmax(0, 1fr) auto; gap: 12px; align-items: center; font-size: var(--fs-sm); padding-block: 3px; }
  .hv { font-family: var(--font-mono); color: var(--ink-3); }
  .hval { font-variant-numeric: tabular-nums; font-weight: 500; }
  .hby { color: var(--ink-2); }
  .hby a { color: var(--accent-text); }
  .hdate { color: var(--ink-3); font-size: var(--fs-xs); }
  .sec-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin: var(--s6) 0 var(--s3); }
  .sec-row .sec { margin: 0; }
  .roles-note { font-size: var(--fs-sm); margin-block: -6px var(--s3); }
  .roles { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--s4); }
  .role { padding: var(--s4); }
  .role header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-block-end: 10px; }
  .role h4 { font-weight: 600; font-size: var(--fs-lg); }
  .holders { display: flex; gap: 2px; }
  .can { font-size: var(--fs-xs); color: var(--ink-3); margin-block-end: 6px; }
  .perms { display: flex; flex-direction: column; gap: 4px; }
  .perms li { display: flex; align-items: center; gap: 8px; font-size: var(--fs-sm); color: var(--ink-3); }
  .perms li.yes { color: var(--ink); }
  .perms li.yes :global(svg) { color: var(--st-accepted); }
  .no { width: 13px; height: 1.5px; background: var(--rule-strong); }
  @media (max-width: 760px) {
    .rule { grid-template-columns: minmax(0, 1fr) auto; }
    .r-act { grid-column: 1 / -1; justify-content: flex-start; }
    .hist li { grid-template-columns: 34px auto minmax(0, 1fr); }
    .hdate { display: none; }
  }
</style>

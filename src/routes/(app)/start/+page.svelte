<script lang="ts">
  // First run (UX_REDESIGN.md §7.1): a chartered, working team in minutes.
  // Name and purpose → a charter template shown in plain words → invite.
  import type { TemplateId } from '$lib/team/types';
  import { store } from '$lib/team/store.svelte';
  import { ui } from '$lib/team/ui.svelte';
  import { PERMISSIONS, TEMPLATES, RULE_ORDER } from '$lib/team/templates';
  import { fakeHash } from '$lib/team/ledger';
  import { lt, t } from '$lib/team/i18n';
  import { go } from '$lib/team/nav';
  import BrandMark from '$lib/app/BrandMark.svelte';
  import { fmtRule } from '$lib/app/format';
  import Check from '@lucide/svelte/icons/check';
  import Copy from '@lucide/svelte/icons/copy';
  import KeyRound from '@lucide/svelte/icons/key-round';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import FingerprintPattern from '@lucide/svelte/icons/fingerprint-pattern';

  let step = $state(1);
  let name = $state('');
  let purpose = $state('');
  let you = $state('');
  let template = $state<TemplateId>('editorial');

  const IDS: TemplateId[] = ['editorial', 'studio', 'collective', 'blank'];
  const tpl = $derived(TEMPLATES[template]);
  const slug = $derived(name.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'team');
  const link = $derived(`https://chayolei.app/join/${slug}-${fakeHash(name + you, 3).slice(2)}`);

  const initials = (s: string) => s.trim().split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';

  function next(e: SubmitEvent) {
    e.preventDefault();
    step = Math.min(3, step + 1);
  }

  async function copy() {
    try { await navigator.clipboard.writeText(link); ui.toast('info', t('start.copied')); } catch { /* clipboard blocked */ }
  }

  function create() {
    const role = lt(tpl.roles.find(r => r.id === tpl.founderRoleIds[0])?.name);
    ui.askToSign({
      title: t('start.signCreate', { name: name.trim() }),
      lines: [t('start.signLine1'), t('start.signLine2', { role }), t('start.signLine3')],
      confirmLabel: t('start.create'),
      onConfirm: () => {
        const team = store.createTeam({
          name: name.trim(), purpose: purpose.trim(), templateId: template,
          founder: { name: you.trim(), initials: initials(you), wallet: fakeHash(`${you}|${Date.now()}`, 20) },
        });
        if (!team) return false;
        ui.toast('success', t('start.created'));
        go('/plan');
      },
    });
  }
</script>

<svelte:head><title>{t('start.title')}</title></svelte:head>

<div class="start">
  <header>
    <BrandMark size={34} />
    <div>
      <h1>{t('start.title')}</h1>
      <p class="muted">{t('start.step', { n: step })}</p>
    </div>
  </header>

  <ol class="steps" aria-label={t('start.title')}>
    {#each [t('start.step1'), t('start.step2'), t('start.step3')] as label, i (i)}
      <li class:done={step > i + 1} class:now={step === i + 1} aria-current={step === i + 1 ? 'step' : undefined}>
        <span class="n">{#if step > i + 1}<Check size={13} />{:else}{i + 1}{/if}</span>{label}
      </li>
    {/each}
  </ol>

  {#if step === 1}
    <form class="form panel pad" onsubmit={next}>
      <label class="field">
        <span class="label">{t('start.name')}</span>
        <input class="input" bind:value={name} required placeholder={t('start.namePlaceholder')} />
      </label>
      <label class="field">
        <span class="label">{t('start.purpose')}</span>
        <textarea class="input" rows="3" bind:value={purpose} required placeholder={t('start.purposePlaceholder')}></textarea>
      </label>
      <label class="field">
        <span class="label">{t('start.you')}</span>
        <input class="input" bind:value={you} required placeholder={t('start.youPlaceholder')} />
      </label>
      <div class="form-actions"><button type="submit" class="btn btn-primary">{t('start.next')}<ArrowRight size={15} class="flip-rtl" /></button></div>
    </form>
  {:else if step === 2}
    <form class="form" onsubmit={next}>
      <div>
        <h2 class="q">{t('start.how')}</h2>
        <p class="muted">{t('start.howHint')}</p>
      </div>
      <div class="tpls" role="radiogroup" aria-label={t('start.how')}>
        {#each IDS as id (id)}
          <label class="tpl" class:on={template === id}>
            <input type="radio" bind:group={template} value={id} />
            <span class="tn">{t(`start.tpl.${id}`)}</span>
            <span class="td">{t(`start.tpl.${id}.desc`)}</span>
          </label>
        {/each}
      </div>
      <div class="preview panel">
        <div>
          <p class="eyebrow-label">{t('start.roles')}</p>
          <ul class="roles">
            {#each tpl.roles as r (r.id)}
              <li>
                <span class="rn">{lt(r.name)}</span>
                <span class="rp">{PERMISSIONS.filter(p => r.permissions.includes(p)).map(p => t(`perm.${p}`)).join(' · ')}</span>
              </li>
            {/each}
          </ul>
        </div>
        <div>
          <p class="eyebrow-label">{t('start.rules')}</p>
          <ul class="rules">
            {#each RULE_ORDER as k (k)}<li><span>{t(`rule.${k}`)}</span><span class="rv">{fmtRule(k, tpl.rules[k])}</span></li>{/each}
          </ul>
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn" onclick={() => (step = 1)}><ArrowLeft size={15} class="flip-rtl" />{t('start.back')}</button>
        <button type="submit" class="btn btn-primary">{t('start.next')}<ArrowRight size={15} class="flip-rtl" /></button>
      </div>
    </form>
  {:else}
    <div class="form">
      <div class="panel pad invite">
        <h2 class="q">{t('start.invite')}</h2>
        <p class="muted">{t('start.inviteHint')}</p>
        <div class="link"><code>{link}</code><button type="button" class="btn btn-sm" onclick={copy}><Copy size={14} />{t('start.copy')}</button></div>
      </div>
      <p class="passkey"><KeyRound size={16} />{t('start.passkey')}</p>
      <div class="form-actions">
        <button type="button" class="btn" onclick={() => (step = 2)}><ArrowLeft size={15} class="flip-rtl" />{t('start.back')}</button>
        <button type="button" class="btn btn-primary" onclick={create}><FingerprintPattern size={15} />{t('start.create')}</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .start { max-width: 760px; margin-inline: auto; display: flex; flex-direction: column; gap: var(--s6); }
  header { display: flex; align-items: center; gap: 14px; }
  h1 { font-size: var(--fs-2xl); font-weight: 600; letter-spacing: -0.015em; }
  .steps { display: flex; gap: 8px; flex-wrap: wrap; }
  .steps li { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px 6px 6px; border-radius: 999px; background: var(--surface-2); color: var(--ink-3); font-size: var(--fs-sm); font-weight: 500; }
  :global([dir='rtl']) .steps li { padding: 6px 6px 6px 12px; }
  .steps .n { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 999px; background: var(--surface-raised); font-size: var(--fs-xs); }
  .steps li.now { background: var(--accent-weak); color: var(--accent-text); }
  .steps li.now .n { background: var(--accent); color: var(--accent-ink); }
  .steps li.done .n { background: var(--st-accepted); color: #fff; }
  .pad { padding: var(--s6); }
  .q { font-size: var(--fs-lg); font-weight: 600; margin-block-end: 2px; }
  .tpls { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--s3); }
  .tpl { display: flex; flex-direction: column; gap: 4px; padding: 14px 16px; border: 1px solid var(--rule-strong); border-radius: var(--r-md); background: var(--surface-raised); cursor: pointer; position: relative; }
  .tpl input { position: absolute; inset-block-start: 14px; inset-inline-end: 14px; accent-color: var(--accent); }
  .tpl.on { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); background: var(--accent-weak); }
  .tn { font-weight: 600; }
  .td { font-size: var(--fs-sm); color: var(--ink-2); padding-inline-end: 22px; }
  .preview { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s6); padding: var(--s5); }
  .roles, .rules { display: flex; flex-direction: column; gap: 8px; margin-block-start: 8px; }
  .roles li { display: flex; flex-direction: column; }
  .rn { font-weight: 600; }
  .rp { font-size: var(--fs-xs); color: var(--ink-3); }
  .rules li { display: flex; justify-content: space-between; gap: 12px; font-size: var(--fs-sm); border-block-end: 1px dashed var(--rule); padding-block-end: 6px; }
  .rv { font-variant-numeric: tabular-nums; font-weight: 500; white-space: nowrap; }
  .invite { display: flex; flex-direction: column; gap: 10px; }
  .link { display: flex; align-items: center; gap: 10px; padding: 8px 8px 8px 12px; border-radius: var(--r-sm); background: var(--surface-2); }
  .link code { flex: 1; min-width: 0; font-family: var(--font-mono); font-size: var(--fs-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: ltr; text-align: start; }
  .passkey { display: flex; align-items: center; gap: 10px; color: var(--ink-2); font-size: var(--fs-sm); }
  .passkey :global(svg) { color: var(--accent-text); flex: none; }
  @media (max-width: 639px) {
    .tpls, .preview { grid-template-columns: minmax(0, 1fr); }
    .pad { padding: var(--s4); }
  }
</style>

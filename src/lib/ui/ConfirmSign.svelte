<script lang="ts">
  // Every consequential action is shown with its consequences, then confirmed:
  // "Signing…" while it runs (simulated in the demo), then recorded.
  import { ui } from '$lib/team/ui.svelte';
  import { t } from '$lib/team/i18n';
  import Dialog from './Dialog.svelte';
  import FingerprintPattern from '@lucide/svelte/icons/fingerprint-pattern';
  import Lock from '@lucide/svelte/icons/lock';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import CircleCheck from '@lucide/svelte/icons/circle-check';

  let phase = $state<'confirm' | 'signing' | 'done'>('confirm');
  let open = $state(false);

  $effect(() => {
    if (ui.sign) { phase = 'confirm'; open = true; }
  });

  function onclose() {
    if (phase !== 'signing') ui.signClosed();
  }

  async function confirm() {
    const req = ui.sign;
    if (!req || phase !== 'confirm') return;
    phase = 'signing';
    if (ui.demo) await new Promise(r => setTimeout(r, 700));
    let ok = false;
    try {
      ok = (await req.onConfirm()) !== false;
    } catch (e) {
      console.error('[sign]', e);
    }
    if (!ok) { open = false; ui.signClosed(); return; }
    phase = 'done';
    setTimeout(() => { open = false; ui.signClosed(); }, 650);
  }
</script>

{#if ui.sign}
  <Dialog bind:open title={ui.sign.title} {onclose} width="sm">
    <ul class="lines">
      {#each ui.sign.lines as line, i (i)}
        <li><ArrowRight size={14} class="flip-rtl" />{line}</li>
      {/each}
    </ul>
    {#if ui.sign.warnings?.length}
      <ul class="warnings">
        {#each ui.sign.warnings as w, i (i)}<li><TriangleAlert size={14} />{w}</li>{/each}
      </ul>
    {/if}
    <p class="final"><Lock size={13} />{t('change.final')}</p>
    {#snippet footer()}
      <p class="demo">{t(ui.demo ? 'sign.demo' : 'sign.live')}</p>
      <button type="button" class="btn" onclick={() => (open = false)} disabled={phase !== 'confirm'}>{t('common.cancel')}</button>
      <button type="button" class="btn btn-primary sign" onclick={confirm} disabled={phase !== 'confirm'} aria-live="polite">
        {#if phase === 'confirm'}
          <FingerprintPattern size={16} />{ui.sign?.confirmLabel ?? t(ui.demo ? 'sign.confirm' : 'sign.confirmLive')}
        {:else if phase === 'signing'}
          <span class="spinner" aria-hidden="true"></span>{t('sign.signing')}
        {:else}
          <CircleCheck size={16} />{t('sign.recorded')}
        {/if}
      </button>
    {/snippet}
  </Dialog>
{/if}

<style>
  .lines { display: flex; flex-direction: column; gap: 8px; }
  .lines li { display: flex; gap: 8px; align-items: flex-start; color: var(--ink); line-height: 1.45; }
  .lines :global(svg) { flex: none; margin-block-start: 3px; color: var(--accent-text); }
  .warnings { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: var(--r-sm); background: var(--st-changes-bg); color: var(--st-changes); font-size: var(--fs-sm); }
  .warnings li { display: flex; gap: 8px; align-items: flex-start; }
  .warnings :global(svg) { flex: none; margin-block-start: 2px; }
  .final { display: flex; align-items: center; gap: 6px; font-size: var(--fs-sm); color: var(--ink-3); }
  .demo { flex: 1 1 100%; font-size: var(--fs-xs); color: var(--ink-3); }
  .sign { min-width: 200px; }
  .spinner {
    width: 14px; height: 14px; border-radius: 999px;
    border: 2px solid color-mix(in srgb, var(--accent-ink) 35%, transparent);
    border-top-color: var(--accent-ink);
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>

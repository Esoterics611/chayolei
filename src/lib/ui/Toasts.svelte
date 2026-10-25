<script lang="ts">
  // Short confirmations and plain-language refusals, announced politely.
  import { ui } from '$lib/team/ui.svelte';
  import { t } from '$lib/team/i18n';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import Info from '@lucide/svelte/icons/info';
  import X from '@lucide/svelte/icons/x';

  const ICONS = { success: CircleCheck, error: TriangleAlert, info: Info };
</script>

<div class="toasts" aria-live="polite" aria-relevant="additions">
  {#each ui.toasts as toast (toast.id)}
    {@const Icon = ICONS[toast.kind]}
    <div class="toast" data-kind={toast.kind} role={toast.kind === 'error' ? 'alert' : 'status'}>
      <Icon size={16} />
      <span class="text">{toast.text}</span>
      <button type="button" class="dismiss" onclick={() => ui.dismiss(toast.id)} aria-label={t('common.close')}><X size={14} /></button>
    </div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    inset-block-end: var(--s5);
    inset-inline-end: var(--s5);
    z-index: 60;
    display: flex;
    flex-direction: column;
    gap: var(--s2);
    width: min(380px, calc(100vw - 32px));
    pointer-events: none;
  }
  .toast {
    pointer-events: auto;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 11px 12px;
    border-radius: var(--r-md);
    background: var(--ink);
    color: var(--surface);
    box-shadow: var(--shadow-pop);
    font-size: var(--fs-sm);
    line-height: 1.45;
    animation: in var(--fast) var(--ease);
  }
  .toast :global(svg) { flex: none; margin-block-start: 1px; }
  [data-kind='success'] :global(svg:first-child) { color: color-mix(in srgb, var(--accent) 55%, var(--surface)); }
  [data-kind='error'] { background: var(--danger); color: #fff; }
  .text { flex: 1; }
  .dismiss { opacity: 0.7; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 4px; }
  .dismiss:hover { opacity: 1; }
  @keyframes in { from { opacity: 0; transform: translateY(6px); } }
  @media (max-width: 639px) {
    .toasts { inset-inline: var(--s4); inset-block-end: calc(72px + env(safe-area-inset-bottom)); width: auto; }
  }
</style>

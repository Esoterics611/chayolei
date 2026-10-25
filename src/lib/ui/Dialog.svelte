<script lang="ts">
  // A modal on the native <dialog>: focus is trapped, Esc closes, the page is inert.
  import type { Snippet } from 'svelte';
  import X from '@lucide/svelte/icons/x';
  import { t } from '$lib/team/i18n';

  interface Props {
    open: boolean;
    title: string;
    description?: string;
    children: Snippet;
    footer?: Snippet;
    onclose?: () => void;
    width?: 'sm' | 'md' | 'lg';
  }
  let { open = $bindable(), title, description, children, footer, onclose, width = 'md' }: Props = $props();

  let el: HTMLDialogElement | undefined = $state();
  const uid = `dlg-${Math.random().toString(36).slice(2, 8)}`;

  $effect(() => {
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  });

  function closed() {
    if (open) open = false;
    onclose?.();
  }
</script>

<dialog
  bind:this={el}
  class="dlg {width}"
  aria-labelledby="{uid}-t"
  aria-describedby={description ? `${uid}-d` : undefined}
  onclose={closed}
  onclick={(e) => { if (e.target === el) open = false; }}
>
  {#if open}
    <div class="inner">
      <header>
        <h2 id="{uid}-t">{title}</h2>
        {#if description}<p id="{uid}-d" class="desc">{description}</p>{/if}
      </header>
      <div class="body">{@render children()}</div>
      {#if footer}<footer>{@render footer()}</footer>{/if}
      <!-- Last in order so the dialog's first focus lands on its content, not on close. -->
      <button type="button" class="btn btn-ghost btn-sm close" onclick={() => (open = false)} aria-label={t('common.close')}>
        <X size={16} />
      </button>
    </div>
  {/if}
</dialog>

<style>
  .dlg {
    padding: 0;
    border: 1px solid var(--rule);
    border-radius: var(--r-lg);
    background: var(--surface-raised);
    color: var(--ink);
    box-shadow: var(--shadow-pop);
    width: min(calc(100vw - 32px), 520px);
    max-height: min(calc(100dvh - 48px), 760px);
  }
  .sm { width: min(calc(100vw - 32px), 420px); }
  .lg { width: min(calc(100vw - 32px), 680px); }
  .dlg::backdrop { background: rgba(14, 18, 16, 0.42); }
  .dlg[open] { animation: rise var(--fast) var(--ease); }
  @keyframes rise { from { opacity: 0; transform: translateY(6px) scale(0.99); } }
  .inner { position: relative; display: flex; flex-direction: column; max-height: inherit; }
  header { padding: var(--s5) calc(var(--s5) + 32px) var(--s3) var(--s5); }
  :global([dir='rtl']) header { padding: var(--s5) var(--s5) var(--s3) calc(var(--s5) + 32px); }
  h2 { font-size: var(--fs-lg); font-weight: 600; line-height: 1.35; }
  .desc { margin-block-start: 4px; font-size: var(--fs-sm); color: var(--ink-2); }
  .close { position: absolute; inset-block-start: 14px; inset-inline-end: 14px; width: 30px; padding: 0; }
  .body { padding: var(--s2) var(--s5) var(--s5); overflow-y: auto; display: flex; flex-direction: column; gap: var(--s4); }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--s2);
    flex-wrap: wrap;
    padding: var(--s3) var(--s5) var(--s4);
    border-block-start: 1px solid var(--rule);
    background: var(--surface);
    border-end-start-radius: var(--r-lg);
    border-end-end-radius: var(--r-lg);
  }
  @media (max-width: 639px) {
    .dlg { margin-block: auto 0; width: 100vw; max-width: 100vw; border-radius: var(--r-lg) var(--r-lg) 0 0; }
    footer { border-radius: 0; }
  }
</style>

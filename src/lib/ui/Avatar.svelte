<script lang="ts">
  // A member's initials on a calm tint derived from their id; AI members get a badge.
  import Bot from '@lucide/svelte/icons/bot';

  interface Props {
    id: string;
    initials: string;
    name: string;
    ai?: boolean;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    title?: string;
  }
  let { id, initials, name, ai = false, size = 'sm', title }: Props = $props();

  const HUES = [168, 205, 245, 285, 18, 38, 95, 330];
  const hue = $derived.by(() => {
    let h = 0;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return HUES[h % HUES.length];
  });
</script>

<span class="avatar {size}" style:--h={hue} title={title ?? name} role="img" aria-label={name}>
  <span aria-hidden="true">{initials}</span>
  {#if ai}<span class="ai" aria-hidden="true"><Bot size={9} strokeWidth={2.5} /></span>{/if}
</span>

<style>
  .avatar {
    --bg: hsl(var(--h) 32% 88%);
    --fg: hsl(var(--h) 45% 26%);
    position: relative;
    display: inline-grid;
    place-items: center;
    flex: none;
    border-radius: 999px;
    background: var(--bg);
    color: var(--fg);
    font-weight: 600;
    letter-spacing: 0.02em;
    font-family: var(--font-ui);
  }
  :global(:root[data-theme='dark']) .avatar {
    --bg: hsl(var(--h) 22% 25%);
    --fg: hsl(var(--h) 45% 82%);
  }
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme='light'])) .avatar {
      --bg: hsl(var(--h) 22% 25%);
      --fg: hsl(var(--h) 45% 82%);
    }
  }
  .xs { width: 20px; height: 20px; font-size: 9px; }
  .sm { width: 26px; height: 26px; font-size: 10.5px; }
  .md { width: 34px; height: 34px; font-size: 12.5px; }
  .lg { width: 48px; height: 48px; font-size: 16px; }
  .ai {
    position: absolute;
    inset-block-end: -3px;
    inset-inline-end: -3px;
    display: grid;
    place-items: center;
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: var(--ink);
    color: var(--surface);
    border: 1.5px solid var(--surface-raised);
  }
</style>

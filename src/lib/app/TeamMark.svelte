<script lang="ts">
  // A team's square mark: its initial on a tint derived from its id.
  let { id, name, size = 30 }: { id: string; name: string; size?: number } = $props();
  const HUES = [168, 205, 28, 285, 340, 95];
  const hue = $derived.by(() => {
    let h = 0;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return HUES[h % HUES.length];
  });
  const initial = $derived(name.trim().charAt(0).toUpperCase());
</script>

<!-- The initial is drawn by CSS: decoration; the team's name is said around it. -->
<span class="tm" style:--h={hue} style:width="{size}px" style:height="{size}px" style:font-size="{Math.round(size * 0.46)}px" aria-hidden="true" data-initial={initial}></span>

<style>
  .tm {
    display: inline-grid;
    place-items: center;
    flex: none;
    border-radius: 8px;
    background: hsl(var(--h) 38% 30%);
    color: hsl(var(--h) 60% 94%);
    font-weight: 600;
    box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.18);
  }
  .tm::before { content: attr(data-initial); }
</style>

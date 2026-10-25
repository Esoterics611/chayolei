<script lang="ts">
  // A document version set for reading: serif, 66 characters a line, numbered paragraphs.
  let { paragraphs }: { paragraphs: string[] } = $props();
</script>

<div class="doc">
  {#each paragraphs as p, i (i)}
    <div class="para"><span class="g" aria-hidden="true">¶{i + 1}</span><p dir="auto">{p}</p></div>
  {/each}
</div>

<style>
  .doc { display: flex; flex-direction: column; gap: 14px; font-family: var(--font-doc); font-size: 17.5px; line-height: 1.72; }
  .para { display: grid; grid-template-columns: 34px minmax(0, 66ch); gap: 6px; }
  .g { font-family: var(--font-mono); font-size: 11px; line-height: 30px; color: var(--ink-3); }
  p { text-wrap: pretty; }
  @media (max-width: 639px) { .doc { font-size: 16.5px; } .para { grid-template-columns: 26px minmax(0, 1fr); } }
</style>

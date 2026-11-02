<script lang="ts">
  // Plain text with its web links clickable (a thread message, a comment).
  // Only http(s) links; everything else stays text.
  let { text }: { text: string } = $props();
  const URL_RE = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/g;
  const parts = $derived(text.split(URL_RE).map((s, i) => ({ s, link: i % 2 === 1 })));
</script>

{#each parts as p, i (i)}{#if p.link}<a href={p.s} target="_blank" rel="noopener noreferrer nofollow">{p.s}</a>{:else}{p.s}{/if}{/each}

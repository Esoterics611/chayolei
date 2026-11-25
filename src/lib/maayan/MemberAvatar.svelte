<script lang="ts">
  // A member's initials on a tint from their id: their mark in the wellsprings.
  // Never a photo: a reader's face does not appear in a public discussion
  // unless they choose it. The teacher's mark is the cap.
  import Avatar from '$lib/ui/Avatar.svelte';
  import GraduationCap from '@lucide/svelte/icons/graduation-cap';

  let { id, name, teacher = false, size = 'sm' }: { id: string; name: string; teacher?: boolean; size?: 'xs' | 'sm' | 'md' | 'lg' } = $props();
  const initials = $derived(name.trim().split(/\s+/).map(w => w.replace(/[^\p{L}\p{N}]/gu, '')[0] ?? '').join('').slice(0, 2) || '?');
</script>

{#if teacher}
  <span class="cap {size}" role="img" aria-label={name} title={name}><GraduationCap size={size === 'lg' ? 22 : size === 'md' ? 17 : 14} /></span>
{:else}
  <Avatar {id} {initials} {name} {size} />
{/if}

<style>
  .cap { display: inline-grid; place-items: center; flex: none; border-radius: 999px; background: var(--accent); color: var(--accent-ink); }
  .cap.xs { width: 20px; height: 20px; }
  .cap.sm { width: 24px; height: 24px; }
  .cap.md { width: 32px; height: 32px; }
  .cap.lg { width: 44px; height: 44px; }
</style>

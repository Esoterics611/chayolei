<script lang="ts">
  import { RANK_META, type Rank } from '$lib/types';

  interface Props {
    rank: Rank;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showLabel?: boolean;
    glow?: boolean; // kept for API compatibility, ignored in academic theme
  }

  let { rank, size = 'md', showLabel = false }: Props = $props();
  let meta = $derived(RANK_META[rank]);

  /**
   * Academic insignia — Sefer & Crown motif system:
   * Enlisted (turai, rav_turai): open book / sefer
   * NCO (samal, samal_rishon, rav_samal): stacked books / Torah scroll
   * Officer (segen+): crown and Torah scroll
   *
   * All use 32×32 viewBox. stroke="currentColor", fill="none" for stroke-only elements.
   * Tier color applied via CSS class on wrapper (.tier-enlisted / .tier-nco / .tier-officer).
   */
  type InsigniaMap = Record<Rank, string>;
  const insignia: InsigniaMap = {

    // ── Enlisted: Sefer motifs ───────────────────────────────────

    // טוראי — open book from above, two pages meeting at spine
    turai: `
      <path d="M5 9 L14 7 L14 25 L5 23 Z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>
      <path d="M18 7 L27 9 L27 23 L18 25 Z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>
      <line x1="16" y1="7" x2="16" y2="25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="7" y1="13" x2="12" y2="12.5" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>
      <line x1="7" y1="16" x2="12" y2="15.5" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>
      <line x1="7" y1="19" x2="12" y2="18.5" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>
      <line x1="20" y1="12.5" x2="25" y2="13" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>
      <line x1="20" y1="15.5" x2="25" y2="16" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>
      <line x1="20" y1="18.5" x2="25" y2="19" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>
    `,

    // רב טוראי — same open book + ribbon bookmark at spine
    rav_turai: `
      <path d="M5 9 L14 7 L14 25 L5 23 Z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>
      <path d="M18 7 L27 9 L27 23 L18 25 Z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>
      <line x1="16" y1="7" x2="16" y2="25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="7" y1="13" x2="12" y2="12.5" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>
      <line x1="7" y1="16" x2="12" y2="15.5" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>
      <line x1="20" y1="12.5" x2="25" y2="13" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>
      <line x1="20" y1="15.5" x2="25" y2="16" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>
      <path d="M13.5 25 L16 30 L18.5 25" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
    `,

    // ── NCO: Stacked sefarim / Torah scroll motifs ───────────────

    // סמל — two stacked books (bottom closed, top open)
    samal: `
      <rect x="5" y="18" width="22" height="8" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <line x1="16" y1="18" x2="16" y2="26" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
      <path d="M5 4 L14 3 L14 16 L5 15 Z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>
      <path d="M18 3 L27 4 L27 15 L18 16 Z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>
      <line x1="16" y1="3" x2="16" y2="16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="7" y1="7.5" x2="12" y2="7" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>
      <line x1="7" y1="10.5" x2="12" y2="10" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>
      <line x1="20" y1="7" x2="25" y2="7.5" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>
      <line x1="20" y1="10" x2="25" y2="10.5" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>
    `,

    // סמ"ר — Torah scroll partially unrolled (one column of text)
    samal_rishon: `
      <circle cx="5" cy="16" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <line x1="5" y1="5" x2="5" y2="27" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="27" cy="16" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <line x1="27" y1="5" x2="27" y2="27" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <rect x="8" y="10" width="16" height="12" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/>
      <path d="M8 10 Q16 7.5 24 10" stroke="currentColor" stroke-width="0.8" fill="none"/>
      <path d="M8 22 Q16 24.5 24 22" stroke="currentColor" stroke-width="0.8" fill="none"/>
      <line x1="12" y1="13" x2="20" y2="13" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>
      <line x1="12" y1="16" x2="20" y2="16" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>
      <line x1="12" y1="19" x2="18" y2="19" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>
    `,

    // רס"מ — Torah scroll fully open (two columns) + olive branches
    rav_samal: `
      <circle cx="4" cy="16" r="2.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <line x1="4" y1="6" x2="4" y2="26" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="28" cy="16" r="2.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <line x1="28" y1="6" x2="28" y2="26" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <rect x="6" y="10" width="20" height="12" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/>
      <path d="M6 10 Q16 7.5 26 10" stroke="currentColor" stroke-width="0.8" fill="none"/>
      <path d="M6 22 Q16 24.5 26 22" stroke="currentColor" stroke-width="0.8" fill="none"/>
      <line x1="9" y1="13" x2="14" y2="13" stroke="currentColor" stroke-width="0.7" opacity="0.7"/>
      <line x1="9" y1="16" x2="14" y2="16" stroke="currentColor" stroke-width="0.7" opacity="0.7"/>
      <line x1="9" y1="19" x2="13" y2="19" stroke="currentColor" stroke-width="0.7" opacity="0.7"/>
      <line x1="18" y1="13" x2="23" y2="13" stroke="currentColor" stroke-width="0.7" opacity="0.7"/>
      <line x1="18" y1="16" x2="23" y2="16" stroke="currentColor" stroke-width="0.7" opacity="0.7"/>
      <line x1="18" y1="19" x2="22" y2="19" stroke="currentColor" stroke-width="0.7" opacity="0.7"/>
      <path d="M2 10 C0 8 0 5 2 4" stroke="currentColor" stroke-width="0.9" fill="none" stroke-linecap="round"/>
      <ellipse cx="0.5" cy="7.5" rx="2" ry="1" transform="rotate(30 0.5 7.5)" stroke="currentColor" stroke-width="0.7" fill="none"/>
      <path d="M30 10 C32 8 32 5 30 4" stroke="currentColor" stroke-width="0.9" fill="none" stroke-linecap="round"/>
      <ellipse cx="31.5" cy="7.5" rx="2" ry="1" transform="rotate(-30 31.5 7.5)" stroke="currentColor" stroke-width="0.7" fill="none"/>
    `,

    // ── Officer: Crown and Torah scroll motifs ───────────────────

    // סגן — 3-point crown (fill) above closed scroll
    segen: `
      <rect x="9" y="21" width="14" height="7" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <line x1="16" y1="21" x2="16" y2="28" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
      <path d="M9 19 L9 12 L12.5 15 L16 9 L19.5 15 L23 12 L23 19 Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2" stroke-linejoin="round"/>
      <circle cx="9" cy="12" r="1" fill="currentColor"/>
      <circle cx="23" cy="12" r="1" fill="currentColor"/>
    `,

    // סרן — crown + one star + open scroll with one column
    seren: `
      <circle cx="6" cy="24" r="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
      <line x1="6" y1="18" x2="6" y2="30" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="26" cy="24" r="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
      <line x1="26" y1="18" x2="26" y2="30" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <rect x="8" y="20" width="16" height="8" rx="0.8" stroke="currentColor" stroke-width="1" fill="none"/>
      <line x1="11" y1="23" x2="21" y2="23" stroke="currentColor" stroke-width="0.7" opacity="0.6"/>
      <line x1="11" y1="26" x2="19" y2="26" stroke="currentColor" stroke-width="0.7" opacity="0.6"/>
      <path d="M8 18 L8 11 L11.5 14 L16 7 L20.5 14 L24 11 L24 18 Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2" stroke-linejoin="round"/>
      <polygon points="16,2 16.9,4.5 19.5,4.5 17.4,6.1 18.2,8.5 16,7 13.8,8.5 14.6,6.1 12.5,4.5 15.1,4.5" fill="currentColor"/>
    `,

    // רב סרן — crown + two stars + open scroll + olive branches
    rav_seren: `
      <circle cx="6" cy="24" r="1.8" stroke="currentColor" stroke-width="1.2" fill="none"/>
      <line x1="6" y1="19" x2="6" y2="30" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="26" cy="24" r="1.8" stroke="currentColor" stroke-width="1.2" fill="none"/>
      <line x1="26" y1="19" x2="26" y2="30" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <rect x="8" y="20" width="16" height="8" rx="0.8" stroke="currentColor" stroke-width="1" fill="none"/>
      <line x1="10.5" y1="23" x2="21.5" y2="23" stroke="currentColor" stroke-width="0.7" opacity="0.6"/>
      <line x1="10.5" y1="26" x2="19.5" y2="26" stroke="currentColor" stroke-width="0.7" opacity="0.6"/>
      <path d="M8 18 L8 12 L11 15 L16 8 L21 15 L24 12 L24 18 Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2" stroke-linejoin="round"/>
      <circle cx="9" cy="12" r="1" fill="currentColor"/>
      <circle cx="23" cy="12" r="1" fill="currentColor"/>
      <polygon points="11,3 11.7,5.2 14,5.2 12.2,6.5 12.9,8.7 11,7.4 9.1,8.7 9.8,6.5 8,5.2 10.3,5.2" fill="currentColor"/>
      <polygon points="21,3 21.7,5.2 24,5.2 22.2,6.5 22.9,8.7 21,7.4 19.1,8.7 19.8,6.5 18,5.2 20.3,5.2" fill="currentColor"/>
    `,

    // סגן אלוף — ornate 5-point crown + three stars + wide scroll + olive branches
    sgan_aluf: `
      <circle cx="5" cy="24" r="1.8" stroke="currentColor" stroke-width="1.2" fill="none"/>
      <line x1="5" y1="18" x2="5" y2="30" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="27" cy="24" r="1.8" stroke="currentColor" stroke-width="1.2" fill="none"/>
      <line x1="27" y1="18" x2="27" y2="30" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <rect x="7" y="20" width="18" height="8" rx="0.8" stroke="currentColor" stroke-width="1" fill="none"/>
      <line x1="9.5" y1="23" x2="22.5" y2="23" stroke="currentColor" stroke-width="0.7" opacity="0.6"/>
      <line x1="9.5" y1="26" x2="20.5" y2="26" stroke="currentColor" stroke-width="0.7" opacity="0.6"/>
      <path d="M4 20 C2 18.5 2 16 3 14" stroke="currentColor" stroke-width="0.8" fill="none" stroke-linecap="round"/>
      <ellipse cx="2" cy="16.5" rx="1.8" ry="0.9" transform="rotate(25 2 16.5)" stroke="currentColor" stroke-width="0.7" fill="none"/>
      <path d="M28 20 C30 18.5 30 16 29 14" stroke="currentColor" stroke-width="0.8" fill="none" stroke-linecap="round"/>
      <ellipse cx="30" cy="16.5" rx="1.8" ry="0.9" transform="rotate(-25 30 16.5)" stroke="currentColor" stroke-width="0.7" fill="none"/>
      <path d="M7 18 L7 11 L10 14 L13.5 10 L16 6 L18.5 10 L22 14 L25 11 L25 18 Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2" stroke-linejoin="round"/>
      <circle cx="7" cy="11" r="1.2" fill="currentColor"/>
      <circle cx="25" cy="11" r="1.2" fill="currentColor"/>
      <circle cx="16" cy="6.5" r="1.2" fill="currentColor"/>
      <polygon points="9,2 9.6,3.9 11.6,3.9 10.1,5 10.7,6.9 9,5.8 7.3,6.9 7.9,5 6.4,3.9 8.4,3.9" fill="currentColor"/>
      <polygon points="16,1 16.6,2.9 18.6,2.9 17.1,4 17.7,5.9 16,4.8 14.3,5.9 14.9,4 13.4,2.9 15.4,2.9" fill="currentColor"/>
      <polygon points="23,2 23.6,3.9 25.6,3.9 24.1,5 24.7,6.9 23,5.8 21.3,6.9 21.9,5 20.4,3.9 22.4,3.9" fill="currentColor"/>
    `,

    // אלוף — ornate crown + menorah + wide scroll + full olive wreath
    aluf: `
      <circle cx="5" cy="24" r="1.8" stroke="currentColor" stroke-width="1.2" fill="none"/>
      <line x1="5" y1="18" x2="5" y2="30" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="27" cy="24" r="1.8" stroke="currentColor" stroke-width="1.2" fill="none"/>
      <line x1="27" y1="18" x2="27" y2="30" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <rect x="7" y="20" width="18" height="8" rx="0.8" stroke="currentColor" stroke-width="1" fill="none"/>
      <line x1="9.5" y1="23" x2="22.5" y2="23" stroke="currentColor" stroke-width="0.7" opacity="0.6"/>
      <line x1="9.5" y1="26" x2="20.5" y2="26" stroke="currentColor" stroke-width="0.7" opacity="0.6"/>
      <path d="M3 21 C0 19 0 15 2 13 C2 15 3 17 3.5 19" stroke="currentColor" stroke-width="0.8" fill="none" stroke-linecap="round"/>
      <ellipse cx="1" cy="16" rx="2" ry="1" transform="rotate(20 1 16)" stroke="currentColor" stroke-width="0.7" fill="none"/>
      <ellipse cx="2" cy="13.5" rx="2" ry="1" transform="rotate(40 2 13.5)" stroke="currentColor" stroke-width="0.7" fill="none"/>
      <path d="M29 21 C32 19 32 15 30 13 C30 15 29 17 28.5 19" stroke="currentColor" stroke-width="0.8" fill="none" stroke-linecap="round"/>
      <ellipse cx="31" cy="16" rx="2" ry="1" transform="rotate(-20 31 16)" stroke="currentColor" stroke-width="0.7" fill="none"/>
      <ellipse cx="30" cy="13.5" rx="2" ry="1" transform="rotate(-40 30 13.5)" stroke="currentColor" stroke-width="0.7" fill="none"/>
      <path d="M7 18 L7 13 L9.5 15.5 L12.5 12 L16 8.5 L19.5 12 L22.5 15.5 L25 13 L25 18 Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.25" stroke-linejoin="round"/>
      <circle cx="7" cy="13" r="1.2" fill="currentColor"/>
      <circle cx="25" cy="13" r="1.2" fill="currentColor"/>
      <circle cx="16" cy="9" r="1.2" fill="currentColor"/>
      <line x1="16" y1="5" x2="16" y2="8.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
      <line x1="13" y1="6" x2="13" y2="8.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
      <line x1="19" y1="6" x2="19" y2="8.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
      <line x1="11" y1="7" x2="11" y2="8.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
      <line x1="21" y1="7" x2="21" y2="8.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
      <line x1="10" y1="8.5" x2="22" y2="8.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
      <circle cx="13" cy="5.5" r="0.8" fill="currentColor"/>
      <circle cx="19" cy="5.5" r="0.8" fill="currentColor"/>
      <circle cx="11" cy="6.5" r="0.7" fill="currentColor"/>
      <circle cx="21" cy="6.5" r="0.7" fill="currentColor"/>
      <circle cx="16" cy="4.5" r="0.9" fill="currentColor"/>
    `,
  };

  // Map rank to tier for CSS color class
  const tierClass: Record<Rank, string> = {
    turai:       'tier-enlisted',
    rav_turai:   'tier-enlisted',
    samal:       'tier-nco',
    samal_rishon:'tier-nco',
    rav_samal:   'tier-nco',
    segen:       'tier-officer',
    seren:       'tier-officer',
    rav_seren:   'tier-officer',
    sgan_aluf:   'tier-officer',
    aluf:        'tier-officer',
  };

  const sizeMap = {
    sm: { box: 'w-6 h-6', svg: 16 },
    md: { box: 'w-8 h-8', svg: 22 },
    lg: { box: 'w-11 h-11', svg: 32 },
    xl: { box: 'w-16 h-16', svg: 48 },
  };
  let s = $derived(sizeMap[size]);
  let tier = $derived(tierClass[rank]);
</script>

<div class="flex items-center gap-1.5" title="{meta.shem} — {meta.transliteration}">
  <div
    class="relative flex items-center justify-center {s.box} {tier}"
    style="border-radius: var(--radius-sm);"
  >
    <svg viewBox="0 0 32 32" width={s.svg} height={s.svg} xmlns="http://www.w3.org/2000/svg">
      {@html insignia[rank]}
    </svg>
  </div>
  {#if showLabel}
    <div class="flex flex-col">
      <span class="text-[10px] font-bold {tier}">{meta.shem}</span>
    </div>
  {/if}
</div>

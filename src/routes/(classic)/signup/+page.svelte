<script lang="ts">
  import { app } from '$stores/app.svelte';
  import { goto } from '$app/navigation';
  import RankInsignia from '$components/RankInsignia.svelte';
  import type { LearningTrack } from '$lib/types';

  // ── state ─────────────────────────────────────────────────────
  let step          = $state<'connect' | 'profile'>('connect');
  let walletAddress = $state('');
  let connecting    = $state(false);
  let track         = $state<LearningTrack>('תמים');
  let submitting    = $state(false);

  // ── codename generator ────────────────────────────────────────
  // Deterministic Hebrew warrior codename from wallet address bytes
  const TITLES  = ['לוחם', 'גיבור', 'נשר', 'ברק', 'אריה', 'זאב', 'שחף', 'פלדה', 'אש', 'סלע', 'חרב', 'מגן'];
  const NAMES   = ['בן-דוד', 'בן-יואב', 'בן-גדעון', 'בן-שמשון', 'בן-כלב', 'בן-יהושע', 'בן-עקיבא', 'בן-פינחס', 'בן-עמרי', 'בן-אביעד', 'בן-נחשון', 'בן-אלעזר'];

  function walletCodename(addr: string): string {
    const hex = addr.replace('0x', '').toLowerCase();
    const b0  = parseInt(hex.slice(0, 2),  16) || 0;
    const b1  = parseInt(hex.slice(2, 4),  16) || 0;
    const suffix = hex.slice(-4).toUpperCase();
    return `${TITLES[b0 % TITLES.length]} ${NAMES[b1 % NAMES.length]} · ${suffix}`;
  }

  let codename = $derived(walletAddress ? walletCodename(walletAddress) : '');

  const tracks: { value: LearningTrack; label: string; desc: string; icon: string }[] = [
    { value: 'נגלה',   label: 'נגלה',   desc: 'גמרא, הלכה, פוסקים',       icon: '◈' },
    { value: 'חסידות', label: 'חסידות', desc: 'תניא, מאמרים, שיחות',      icon: '◆' },
    { value: 'תמים',   label: 'תמים',   desc: 'נגלה וחסידות — מסלול שלם', icon: '⬡' },
  ];

  async function handleConnect() {
    connecting = true;
    const addr = await app.connectWallet();
    if (addr) { walletAddress = addr; step = 'profile'; }
    connecting = false;
  }

  async function handleSignUp() {
    submitting = true;
    // Use first available makom (or empty — API handles default)
    const makomId = app.mekomot[0]?.id ?? '';
    await app.signUp(codename, walletAddress, makomId, track);
    goto('/');
  }

  // Particles
  let particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 5,
    duration: Math.random() * 10 + 8,
  }));
</script>

<div class="fixed inset-0 overflow-hidden flex items-center justify-center" style="background-color: var(--color-bg-primary);" dir="rtl">
  <!-- Animated background -->
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    {#each particles as p}
      <div class="absolute rounded-full animate-float"
        style="
          left:{p.x}%;
          top:{p.y}%;
          width:{p.size}px;
          height:{p.size}px;
          animation-delay:{p.delay}s;
          animation-duration:{p.duration}s;
          background-color: rgba(245, 200, 66, 0.2);
        "
      ></div>
    {/each}
    <div class="absolute inset-0 opacity-[0.03]"
      style="background-image: linear-gradient(rgba(245,200,66,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(245,200,66,0.3) 1px, transparent 1px); background-size: 60px 60px"></div>
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl" style="
      background-color: rgba(245, 200, 66, 0.05);
    "></div>
  </div>

  <div class="relative z-10 w-full max-w-md px-4">
    {#if step === 'connect'}
      <!-- ═══ STEP 1: Connect Wallet ═══ -->
      <div class="text-center space-y-8">
        <div class="flex justify-center">
          <div class="relative">
            <RankInsignia rank="seren" size="xl" glow={true} />
            <div class="absolute -inset-4 rounded-full blur-xl animate-pulse" style="
              background-color: rgba(245, 200, 66, 0.1);
            "></div>
          </div>
        </div>

        <div class="space-y-3">
          <h1 class="text-3xl font-bold tracking-tight" style="color: var(--color-text-primary);">חיילי בית דוד</h1>
          <p class="text-sm leading-relaxed max-w-xs mx-auto" style="color: var(--color-text-secondary);">
            רשת מחקר ופרסום מבוזרת לתלמידי הישיבה.<br/>
            חבר ארנק כדי להצטרף למשימה.
          </p>
        </div>

        <div class="grid grid-cols-3 gap-3 text-center">
          {#each [
            { icon: '◈', label: 'מבצעי מחקר', desc: 'כתיבה ופרסום' },
            { icon: '⬡', label: 'TMIM טוקנים', desc: 'תגמול אמיתי' },
            { icon: '◑', label: 'ביקורת עמיתים', desc: 'למידה הדדית' },
          ] as f}
            <div class="rounded-xl border p-3 space-y-1" style="
              border-color: var(--color-border-primary);
              background-color: var(--color-bg-tertiary);
            ">
              <span class="text-lg block" style="color: var(--color-accent-secondary);">{f.icon}</span>
              <span class="text-[10px] font-medium block" style="color: var(--color-text-primary);">{f.label}</span>
              <span class="text-[9px] block" style="color: var(--color-text-secondary);">{f.desc}</span>
            </div>
          {/each}
        </div>

        <button onclick={handleConnect} disabled={connecting}
          class="w-full py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-50"
          style="
            background: linear-gradient(to left, rgba(245, 200, 66, 0.2), rgba(245, 200, 66, 0.1), rgba(245, 200, 66, 0.2));
            border: 1px solid rgba(245, 200, 66, 0.4);
            color: var(--color-accent-secondary);
          "
          onmouseenter={(e) => {
            if (!connecting) {
              e.currentTarget.style.background = 'linear-gradient(to left, rgba(245, 200, 66, 0.3), rgba(245, 200, 66, 0.2), rgba(245, 200, 66, 0.3))';
              e.currentTarget.style.boxShadow = '0 0 30px rgba(245, 200, 66, 0.15)';
            }
          }}
          onmouseleave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(to left, rgba(245, 200, 66, 0.2), rgba(245, 200, 66, 0.1), rgba(245, 200, 66, 0.2))';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <span class="flex items-center justify-center gap-3">
            {#if connecting}
              <span class="animate-spin">◎</span> מתחבר...
            {:else}
              <span class="text-xl">⬡</span> חבר ארנק
            {/if}
          </span>
        </button>

        <p class="text-[10px]" style="color: var(--color-text-secondary);">MetaMask · WalletConnect · Coinbase Wallet</p>

        <button
          onclick={() => { step = 'profile'; walletAddress = '0xdev' + Math.random().toString(16).slice(2,12); }}
          class="text-[10px] transition-colors"
          style="color: var(--color-text-tertiary);"
          onmouseenter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
          onmouseleave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-tertiary)';
          }}
        >דלג (מצב פיתוח) →</button>
      </div>

    {:else}
      <!-- ═══ STEP 2: Choose Your Path ═══ -->
      <div class="rounded-2xl border p-8 space-y-6" style="
        border-color: var(--color-border-primary);
        background-color: var(--color-bg-secondary);
        box-shadow: var(--shadow-lg);
      ">

        <!-- Codename reveal -->
        <div class="text-center space-y-3">
          <div class="relative inline-block">
            <RankInsignia rank="turai" size="xl" glow={true} />
            <div class="absolute -inset-3 rounded-full blur-lg animate-pulse" style="
              background-color: rgba(245, 200, 66, 0.1);
            "></div>
          </div>
          <div>
            <p class="text-[10px] uppercase tracking-widest mb-1" style="color: var(--color-text-secondary);">שם הקרב שלך</p>
            <h2 class="text-xl font-bold font-mono tracking-wide" style="color: var(--color-accent-secondary);" dir="rtl">{codename}</h2>
            <p class="text-[10px] font-mono mt-1" style="color: var(--color-text-tertiary);">{walletAddress.slice(0,10)}...{walletAddress.slice(-6)}</p>
          </div>
        </div>

        <!-- Divider -->
        <div class="flex items-center gap-3">
          <div class="flex-1 h-px" style="background-color: var(--color-border-primary);"></div>
          <span class="text-[10px] uppercase tracking-widest" style="color: var(--color-text-secondary);">בחר מסלול</span>
          <div class="flex-1 h-px" style="background-color: var(--color-border-primary);"></div>
        </div>

        <!-- Track -->
        <div class="grid grid-cols-3 gap-2">
          {#each tracks as t}
            <button type="button" onclick={() => track = t.value}
              class="p-4 rounded-xl border text-center transition-all group"
              style="
                border-color: {track === t.value ? 'rgba(245, 200, 66, 0.6)' : 'var(--color-border-primary)'};
                background-color: {track === t.value ? 'rgba(245, 200, 66, 0.1)' : 'var(--color-bg-tertiary)'};
                box-shadow: {track === t.value ? '0 0 20px rgba(245, 200, 66, 0.08)' : 'none'};
              }"
              onmouseenter={(e) => {
                if (track !== t.value) {
                  e.currentTarget.style.borderColor = 'rgba(245, 200, 66, 0.3)';
                }
              }}
              onmouseleave={(e) => {
                if (track !== t.value) {
                  e.currentTarget.style.borderColor = 'var(--color-border-primary)';
                }
              }}>
              <span class="text-2xl block mb-2 group-hover:scale-110 transition-transform">{t.icon}</span>
              <span class="text-sm font-bold block" style="color: var(--color-text-primary);">{t.label}</span>
              <span class="text-[9px] mt-1 block leading-relaxed" style="color: var(--color-text-secondary);">{t.desc}</span>
            </button>
          {/each}
        </div>

        <!-- Enlistment bonus -->
        <div class="rounded-xl p-4 flex items-center justify-between" style="
          background: linear-gradient(to left, rgba(245, 200, 66, 0.1), transparent);
          border: 1px solid rgba(245, 200, 66, 0.2);
        ">
          <div>
            <p class="text-xs" style="color: var(--color-text-secondary);">בונוס גיוס</p>
            <p class="text-lg font-bold font-mono" style="color: var(--color-accent-secondary);">50 TMIM</p>
          </div>
          <div class="text-right">
            <p class="text-xs" style="color: var(--color-text-secondary);">דרגה ראשונית</p>
            <p class="text-sm font-bold" style="color: var(--color-text-primary);">טוראי</p>
          </div>
          <span class="text-3xl opacity-30">◈</span>
        </div>

        <!-- Submit -->
        <button onclick={handleSignUp} disabled={submitting}
          class="w-full py-4 rounded-xl font-bold text-base transition-all disabled:opacity-50 disabled:cursor-wait"
          style="
            background: linear-gradient(to left, rgba(245, 200, 66, 0.2), rgba(245, 200, 66, 0.1), rgba(245, 200, 66, 0.2));
            border: 1px solid rgba(245, 200, 66, 0.4);
            color: var(--color-accent-secondary);
          "
          onmouseenter={(e) => {
            if (!submitting) {
              e.currentTarget.style.background = 'linear-gradient(to left, rgba(245, 200, 66, 0.3), rgba(245, 200, 66, 0.2), rgba(245, 200, 66, 0.3))';
              e.currentTarget.style.boxShadow = '0 0 40px rgba(245, 200, 66, 0.2)';
            }
          }}
          onmouseleave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(to left, rgba(245, 200, 66, 0.2), rgba(245, 200, 66, 0.1), rgba(245, 200, 66, 0.2))';
            e.currentTarget.style.boxShadow = 'none';
          }}>
          {#if submitting}
            <span class="flex items-center justify-center gap-2"><span class="animate-spin">◎</span> מתגייס...</span>
          {:else}
            הצטרף לחיילי בית דוד ←
          {/if}
        </button>

        <button onclick={() => step = 'connect'}
          class="w-full text-center text-[10px] transition-colors"
          style="color: var(--color-text-secondary);"
          onmouseenter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onmouseleave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}>
          ← חזור לחיבור ארנק
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  @keyframes float {
    0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
    50% { transform: translateY(-40px) scale(1.5); opacity: 0.6; }
  }
  .animate-float { animation: float var(--tw-duration, 10s) ease-in-out infinite; }
</style>

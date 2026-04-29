<script lang="ts">
  import { app } from '$stores/app.svelte';
  import { RANK_META } from '$lib/types';
  import { formatTmim, formatDate, statusColor, trackColor, mivtzaCategoryLabel, formatMivtzaType } from '$lib/utils/format';
  import ProgressBar from '$components/ProgressBar.svelte';
  import StatusBadge from '$components/StatusBadge.svelte';
  import TalmidAvatar from '$components/TalmidAvatar.svelte';
  import RankInsignia from '$components/RankInsignia.svelte';
  import RankBadge from '$components/RankBadge.svelte';
  import TokenDisplay from '$components/TokenDisplay.svelte';
  import LocationBadge from '$components/LocationBadge.svelte';
  import ProposalCard from '$lib/components/ProposalCard.svelte';

  let user = $derived(app.currentUser);
  let rankMeta = $derived(user ? RANK_META[user.rank] : null);
  let activeTafkidim = $derived(app.myTafkidim.filter(t => t.status !== 'approved' && t.status !== 'rejected'));
  let recentActivities = $derived(app.activities.slice(0, 5));
  let makom = $derived(app.currentMakom);

  // Progress to next rank
  let rankProgress = $derived((() => {
    if (!user || !rankMeta) return { current: 0, required: 100, nextLabel: '' };
    const idx = Object.keys(RANK_META).indexOf(user.rank);
    const allRanks = Object.values(RANK_META);
    const next = allRanks[idx + 1];
    if (!next) return { current: user.totalTokensEarned, required: user.totalTokensEarned, nextLabel: 'אלוף' };
    return {
      current: user.totalTokensEarned,
      required: next.tokensRequired,
      nextLabel: next.shem,
    };
  })());

  const tafkidStatusIcon: Record<string, string> = {
    todo: '○', in_progress: '◐', submitted: '◑', approved: '●', rejected: '✕'
  };

  const activityIcons: Record<string, string> = {
    mivtza_created:       '◈',
    masima_opened:        '⎇',
    masima_completed:     '●',
    tafkid_completed:     '●',
    tafkid_submitted:     '▸',
    talmid_promoted:      '★',
    talmid_enrolled:      '⬡',
    tmim_distributed:     '◆',
    farbrengen_announced: '◆',
    maamar_shared:        '◈',
    peer_review_submitted:'◑',
    paper_published:      '✦',
  };

  const sederStatusColor: Record<string, string> = {
    completed: 'text-emerald-400',
    active:    'color: var(--color-accent-secondary);',
    upcoming:  'color: var(--color-text-secondary);',
  };

  let welcomeHovered = $state(false);
  let mivtzaHovers = $state(new Map<string, boolean>());
  let tafkidHovers = $state(new Map<string, string>());
</script>

<div class="space-y-6">
  <!-- שורה עליונה: ברוך הבא + סטטיסטיקות -->
  <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
    <!-- כרטיס ברוך הבא -->
    <div class="lg:col-span-2 rounded-xl border p-5" style="
      border-color: var(--color-border-primary);
      background-color: var(--color-bg-secondary);
    ">
      {#if user && rankMeta}
        <div class="flex items-start gap-4">
          <RankInsignia rank={user.rank} size="xl" glow={true} />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <h2 class="text-lg font-semibold" style="color: var(--color-text-primary);">{user.shem}</h2>
              <RankBadge rank={user.rank} size="sm" />
              {#if makom}<LocationBadge shem={makom.shem} status={makom.status} />{/if}
            </div>
            <div class="flex items-center gap-3 mb-3 flex-wrap">
              <span class="text-xs" style="color: var(--color-text-secondary);">מסלול: <span class="tag text-[10px]">{user.track}</span></span>
              <TokenDisplay amount={user.tokenBalance} size="sm" />
            </div>
            <!-- התקדמות לדרגה -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-[10px] uppercase tracking-wider" style="color: var(--color-text-secondary);">לדרגה: {rankProgress.nextLabel}</span>
                <span class="text-xs font-mono" style="color: var(--color-text-secondary);">{formatTmim(rankProgress.current)} / {formatTmim(rankProgress.required)}</span>
              </div>
              <ProgressBar value={rankProgress.current} max={rankProgress.required} color="gold" size="md" />
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- מבצעים פעילים -->
    <div class="rounded-xl border p-5 flex flex-col justify-between" style="
      border-color: var(--color-border-primary);
      background-color: var(--color-bg-secondary);
    ">
      <span class="text-[10px] uppercase tracking-wider" style="color: var(--color-text-secondary);">מבצעים פעילים</span>
      <div class="flex items-end justify-between mt-2">
        <span class="text-3xl font-bold font-mono" style="color: var(--color-accent-secondary);">{app.stats.activeMivtzaot}</span>
        <span class="text-xs" style="color: var(--color-text-secondary);">{app.mivtzaot.length} בסה"כ</span>
      </div>
    </div>

    <!-- ממתינים לבדיקה -->
    <div class="rounded-xl border p-5 flex flex-col justify-between" style="
      border-color: var(--color-border-primary);
      background-color: var(--color-bg-secondary);
    ">
      <span class="text-[10px] uppercase tracking-wider" style="color: var(--color-text-secondary);">ממתינים לבדיקה</span>
      <div class="flex items-end justify-between mt-2">
        <span class="text-3xl font-bold font-mono text-purple-400">{app.stats.pendingReviews}</span>
        <span class="text-xs" style="color: var(--color-text-secondary);">{app.stats.openMasimot} משימות פתוחות</span>
      </div>
    </div>
  </div>

  <!-- רשת גלובלית -->
  <div class="rounded-xl border p-5" style="
    border-color: rgba(6, 182, 212, 0.3);
    background-color: var(--color-bg-secondary);
  ">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-medium" style="color: var(--color-text-primary);">רשת (Network)</h3>
      <a href="/anash" class="text-xs hover:underline" style="color: var(--color-accent-primary);">כל האנ״ש ←</a>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div class="text-center">
        <span class="text-2xl font-bold font-mono block" style="color: var(--color-accent-primary);">{app.networkStats.totalLocations}</span>
        <span class="text-[10px]" style="color: var(--color-text-secondary);">מקומות</span>
      </div>
      <div class="text-center">
        <span class="text-2xl font-bold font-mono block" style="color: var(--color-text-primary);">{app.networkStats.totalChayalim}</span>
        <span class="text-[10px]" style="color: var(--color-text-secondary);">חיילים</span>
      </div>
      <div class="text-center">
        <span class="text-2xl font-bold font-mono block" style="color: var(--color-accent-secondary);">{app.networkStats.totalMivtzaot}</span>
        <span class="text-[10px]" style="color: var(--color-text-secondary);">מבצעים</span>
      </div>
      <div class="text-center">
        <span class="text-2xl font-bold font-mono block text-purple-400">{app.networkStats.totalPeerReviews}</span>
        <span class="text-[10px]" style="color: var(--color-text-secondary);">ביקורות</span>
      </div>
      <div class="text-center">
        <span class="text-xl font-bold font-mono block" style="color: var(--color-accent-secondary);">{formatTmim(app.networkStats.tmimCirculating)}</span>
        <span class="text-[10px]" style="color: var(--color-text-secondary);">TMIM במחזור</span>
      </div>
    </div>
    <!-- מקומות -->
    <div class="flex flex-wrap gap-2 mt-4 pt-3" style="border-top: 1px solid rgba(var(--color-border-primary), 0.5);">
      {#each app.mekomot as m}
        <span class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs" style="
          background-color: var(--color-bg-tertiary);
          border-color: var(--color-border-primary);
          color: var(--color-text-primary);
        ">
          <span class="w-1.5 h-1.5 rounded-full flex-shrink-0
            {m.status==='active'?'bg-emerald-400':m.status==='forming'?'bg-amber-400':'bg-zinc-500'}"></span>
          <span>{m.shem}</span>
          <span style="color: var(--color-text-secondary);">{m.memberCount}</span>
        </span>
      {/each}
    </div>
  </div>

  <!-- מבצעים פעילים -->
  <div class="rounded-xl border" style="
    border-color: var(--color-border-primary);
    background-color: var(--color-bg-secondary);
  ">
    <div class="flex items-center justify-between px-5 py-3 border-b" style="border-color: var(--color-border-primary);">
      <h3 class="text-sm font-medium" style="color: var(--color-text-primary);">מבצעים פעילים</h3>
      <a href="/mivtzaot" class="text-xs hover:underline transition-colors" style="color: var(--color-accent-secondary);">כל המבצעים ←</a>
    </div>
    <div class="divide-y" style="--tw-divide-color: var(--color-border-primary);">
      {#each app.mivtzaot.filter(m => m.status !== 'archived' && m.status !== 'draft') as mivtza}
        {@const masimot = app.getMivtzaMasimot(mivtza.id)}
        {@const creator = app.getTalmid(mivtza.creatorId)}
        {@const progress = app.getMivtzaProgress(mivtza.id)}
        <a
          href="/mivtzaot/{mivtza.id}"
          class="block px-5 py-4 transition-colors"
          onmouseenter={() => mivtzaHovers.set(mivtza.id, true)}
          onmouseleave={() => mivtzaHovers.delete(mivtza.id)}
          style="background-color: {mivtzaHovers.get(mivtza.id) ? 'rgba(6, 182, 212, 0.05)' : 'transparent'};"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <span class="text-sm font-medium" style="color: {mivtzaHovers.get(mivtza.id) ? 'var(--color-accent-secondary)' : 'var(--color-text-primary)'};">{mivtza.shem}</span>
                <StatusBadge status={mivtza.status} />
                <span class="tag text-[10px]" style="
                  background-color: var(--color-bg-tertiary);
                  color: var(--color-text-secondary);
                ">{formatMivtzaType(mivtza.type)}</span>
                {#if mivtza.isGlobal}<span class="tag text-[10px]" style="
                  background-color: rgba(6, 182, 212, 0.1);
                  color: var(--color-accent-primary);
                ">🌐</span>{/if}
              </div>
              <div class="flex items-center gap-4 mt-1">
                <span class="text-xs" style="color: var(--color-text-secondary);">{masimot.length} משימות</span>
                <span class="text-xs font-mono" style="color: var(--color-accent-secondary);">{formatTmim(mivtza.tokenAllocation)}</span>
                {#if creator}<span class="text-xs" style="color: var(--color-text-secondary);">ע"י {creator.shem}</span>{/if}
              </div>
            </div>
            <div class="flex-shrink-0 w-28 flex flex-col items-end gap-1">
              <span class="text-xs font-mono" style="color: var(--color-text-secondary);">{progress}%</span>
              <ProgressBar value={progress} max={100} showLabel={false} color="gold" />
            </div>
          </div>
        </a>
      {/each}
    </div>
  </div>

  <!-- ממשל — הצעות ממתינות להצבעה -->
  {#if app.myUnvotedProposals.length > 0}
    <div
      style="
        background-color: var(--color-bg-secondary);
        border: 1px solid var(--color-accent-primary);
        border-radius: var(--radius-xl);
        overflow: hidden;
      "
    >
      <div
        class="flex items-center justify-between px-5 py-3"
        style="border-bottom: 1px solid var(--color-border-primary);"
      >
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold" style="color: var(--color-text-primary);">ממשל — הצבעות ממתינות</h3>
          <span
            class="text-xs font-semibold px-1.5 py-0.5"
            style="background-color: rgba(180,83,9,0.12); color: #b45309; border-radius: var(--radius-sm);"
          >{app.myUnvotedProposals.length}</span>
        </div>
        <a href="/governance" style="color: var(--color-text-link); text-decoration: none; font-size: 0.75rem;">לכל ההצעות ←</a>
      </div>
      <div class="p-4 space-y-3">
        {#each app.myUnvotedProposals.slice(0, 2) as proposal}
          <ProposalCard {proposal} compact={true} />
        {/each}
      </div>
    </div>
  {/if}

  <!-- חיילים מחוברים -->
  <div class="rounded-xl border" style="
    border-color: var(--color-border-primary);
    background-color: var(--color-bg-secondary);
  ">
    <div class="flex items-center justify-between px-5 py-3 border-b" style="border-color: var(--color-border-primary);">
      <h3 class="text-sm font-medium" style="color: var(--color-text-primary);">בבית המדרש עכשיו</h3>
      <a href="/anash" class="text-xs hover:underline transition-colors" style="color: var(--color-accent-secondary);">כל האנ״ש ←</a>
    </div>
    <div class="px-5 py-4 flex flex-wrap gap-3">
      {#each app.talmidim.filter(t => t.isOnline) as talmid}
        {@const meta = RANK_META[talmid.rank]}
        <a href="/anash/{talmid.id}" class="flex items-center gap-2 px-3 py-2 rounded-lg border hover:transition-all group" style="
          background-color: var(--color-bg-tertiary);
          border-color: var(--color-border-primary);
        " onmouseenter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.6)';
        }} onmouseleave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border-primary)';
        }}>
          <TalmidAvatar shem={talmid.shem} rank={talmid.rank} isOnline={true} size="sm" />
          <div>
            <span class="text-xs font-medium transition-colors" style="color: var(--color-text-primary);" onmouseenter={(e) => {
              e.currentTarget.style.color = 'var(--color-accent-secondary)';
            }} onmouseleave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}>{talmid.shem}</span>
            <span class="text-[10px] block" style="color: var(--color-text-secondary);">{meta.shem}</span>
          </div>
        </a>
      {/each}
    </div>
  </div>

  <!-- שורה תחתונה: לוח זמנים + תפקידים + פעילות -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- לוח זמנים יומי -->
    <div class="rounded-xl border" style="
      border-color: var(--color-border-primary);
      background-color: var(--color-bg-secondary);
    ">
      <div class="px-5 py-3 border-b" style="border-color: var(--color-border-primary);">
        <h3 class="text-sm font-medium" style="color: var(--color-text-primary);">סדר היום</h3>
      </div>
      <div class="divide-y" style="--tw-divide-color: var(--color-border-primary);">
        {#each app.sederSchedule as item}
          <div class="px-5 py-3 flex items-center gap-3">
            <div class="flex-shrink-0">
              {#if item.status === 'active'}
                <span class="inline-block w-2 h-2 rounded-full" style="background-color: var(--color-accent-secondary);"></span>
              {:else if item.status === 'completed'}
                <span class="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
              {:else}
                <span class="inline-block w-2 h-2 rounded-full bg-zinc-600"></span>
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium" style="{
                item.status === 'completed' ? 'color: #10b981;' :
                item.status === 'active' ? 'color: var(--color-accent-secondary);' :
                'color: var(--color-text-secondary);'
              }">{item.label}</p>
              <p class="text-[10px] font-mono" style="color: var(--color-text-secondary);">{item.startTime} – {item.endTime}</p>
            </div>
            {#if item.status === 'active'}
              <span class="tag text-[10px]" style="
                background-color: rgba(245, 200, 66, 0.15);
                color: var(--color-accent-secondary);
              ">עכשיו</span>
            {:else if item.status === 'completed'}
              <span class="text-[10px] text-emerald-400">✓</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- התפקידים שלי -->
    <div class="rounded-xl border" style="
      border-color: var(--color-border-primary);
      background-color: var(--color-bg-secondary);
    ">
      <div class="flex items-center justify-between px-5 py-3 border-b" style="border-color: var(--color-border-primary);">
        <h3 class="text-sm font-medium" style="color: var(--color-text-primary);">התפקידים שלי</h3>
        <a href="/tafkidim" class="text-xs hover:underline transition-colors" style="color: var(--color-accent-secondary);">הכל ←</a>
      </div>
      <div class="divide-y" style="--tw-divide-color: var(--color-border-primary);">
        {#each activeTafkidim.slice(0, 5) as tafkid}
          {@const masima = app.getMasima(tafkid.masimaId)}
          <a
            href="/masimot/{tafkid.masimaId}"
            class="flex items-center gap-3 px-5 py-3.5 group transition-colors"
            onmouseenter={() => tafkidHovers.set(tafkid.id, 'true')}
            onmouseleave={() => tafkidHovers.delete(tafkid.id)}
            style="background-color: {tafkidHovers.get(tafkid.id) ? 'rgba(6, 182, 212, 0.05)' : 'transparent'};"
          >
            <span class="flex-shrink-0 w-4 text-center" style="color: var(--color-text-secondary);">
              {tafkidStatusIcon[tafkid.status]??'○'}
            </span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm truncate" style="color: {tafkidHovers.get(tafkid.id) ? 'var(--color-accent-secondary)' : 'var(--color-text-primary)'};">{tafkid.shem}</span>
                <StatusBadge status={tafkid.status} />
              </div>
              <p class="text-xs mt-0.5 truncate" style="color: var(--color-text-secondary);">{masima?.shem??''}</p>
            </div>
            <span class="text-xs font-mono flex-shrink-0" style="color: var(--color-accent-secondary);">{formatTmim(tafkid.tokenReward)}</span>
          </a>
        {:else}
          <div class="px-5 py-8 text-center text-xs" style="color: var(--color-text-secondary);">
            אין תפקידים פעילים. עיין במבצעים למצוא עבודה.
          </div>
        {/each}
      </div>
    </div>

    <!-- פעילות אחרונה -->
    <div class="rounded-xl border" style="
      border-color: var(--color-border-primary);
      background-color: var(--color-bg-secondary);
    ">
      <div class="px-5 py-3 border-b" style="border-color: var(--color-border-primary);">
        <h3 class="text-sm font-medium" style="color: var(--color-text-primary);">פעילות אחרונה</h3>
      </div>
      <div class="divide-y" style="--tw-divide-color: var(--color-border-primary);">
        {#each recentActivities as activity}
          <div class="px-5 py-3 flex gap-3">
            <span class="text-sm mt-0.5 flex-shrink-0" style="color: var(--color-text-secondary);">{activityIcons[activity.type]??'·'}</span>
            <div class="min-w-0">
              <p class="text-xs" style="color: var(--color-text-primary);">
                <span class="font-medium" style="color: var(--color-accent-secondary);">{activity.actorShem}</span>
                {' '}{activity.description}
              </p>
              <span class="text-[10px]" style="color: var(--color-text-secondary);">{formatDate(activity.timestamp)}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

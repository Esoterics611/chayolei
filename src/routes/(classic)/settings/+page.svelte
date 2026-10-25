<script lang="ts">
  import { app } from '$stores/app.svelte';
  import { RANK_META } from '$lib/types';
  import { formatTmim } from '$lib/utils/format';
  import TalmidAvatar from '$components/TalmidAvatar.svelte';
  import RankBadge from '$components/RankBadge.svelte';
  import RankInsignia from '$components/RankInsignia.svelte';
  import LocationBadge from '$components/LocationBadge.svelte';
  import TokenDisplay from '$components/TokenDisplay.svelte';
  import VotingPower from '$lib/components/VotingPower.svelte';
</script>

<div class="page-container space-y-8 max-w-2xl">
  <div>
    <h1 class="text-2xl font-bold" style="color: var(--color-text-primary); font-family: var(--font-hebrew);">הגדרות</h1>
    <p class="text-xs mt-0.5" style="color: var(--color-text-secondary);">החלף חייל פעיל לבדיקת תפקידים שונים</p>
  </div>

  <!-- חייל פעיל כעת -->
  {#if app.currentUser}
    {@const user = app.currentUser}
    {@const meta = RANK_META[user.rank]}
    {@const makom = app.getMakom(user.makomId)}
    <div
      class="p-5"
      style="
        border: 1px solid rgba(125,108,63,0.4);
        border-radius: var(--radius-xl);
        background-color: var(--color-bg-secondary);
      "
    >
      <p class="text-[10px] uppercase tracking-wider mb-3" style="color: var(--color-text-tertiary);">חייל פעיל</p>
      <div class="flex items-center gap-4 flex-wrap">
        <RankInsignia rank={user.rank} size="xl" glow={true} />
        <TalmidAvatar shem={user.shem} rank={user.rank} isOnline={user.isOnline} size="lg" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span class="text-lg font-bold" style="color: var(--color-text-primary); font-family: var(--font-hebrew);">{user.shem}</span>
            <RankBadge rank={user.rank} size="md" />
            {#if makom}
              <LocationBadge shem={makom.shem} status={makom.status} />
            {/if}
          </div>
          <p class="text-sm mb-2" style="color: var(--color-text-secondary);">מסלול: {user.track}</p>
          <div class="flex gap-4 text-xs flex-wrap" style="color: var(--color-text-tertiary);">
            <TokenDisplay amount={user.tokenBalance} size="sm" />
            <span>{user.tafkidimCompleted} תפקידים</span>
            <span>{user.papersPublished} מאמרים</span>
            <span>כח הצבעה: {user.votingPower}</span>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- ממשל — כוח הצבעה ואצילת סמכות -->
  <div class="space-y-3">
    <h3 class="text-sm font-semibold uppercase tracking-widest" style="color: var(--color-text-secondary);">ממשל וכוח הצבעה</h3>
    <VotingPower size="lg" />
    <div
      class="p-4 space-y-2"
      style="
        background-color: var(--color-bg-secondary);
        border: 1px solid var(--color-border-primary);
        border-radius: var(--radius-lg);
      "
    >
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold" style="color: var(--color-text-primary);">אצילת כוח הצבעה</span>
        <span
          class="text-xs px-2 py-0.5"
          style="background-color: var(--color-bg-tertiary); color: var(--color-text-tertiary); border-radius: var(--radius-sm);"
        >בקרוב</span>
      </div>
      <p class="text-xs" style="color: var(--color-text-tertiary);">
        אצילת סמכות תאפשר לך להעביר את כוח ההצבעה שלך לחייל אחר לתקופה מוגדרת.
        פיצ'ר זה ייפתח עם השקת החוזה החכם.
      </p>
    </div>
  </div>

  <!-- החלף חייל -->
  <div>
    <h3 class="text-sm font-semibold uppercase tracking-wider mb-3" style="color: var(--color-text-secondary);">החלף משתמש</h3>
    <div
      style="
        border: 1px solid var(--color-border-primary);
        border-radius: var(--radius-xl);
        background-color: var(--color-bg-secondary);
        overflow: hidden;
      "
    >
      {#each app.talmidim as t}
        {@const meta = RANK_META[t.rank]}
        {@const makom = app.getMakom(t.makomId)}
        {@const isActive = t.id === app.currentUser?.id}
        <button
          onclick={() => app.switchUser(t.id)}
          class="w-full flex items-center gap-4 px-6 py-4 text-right transition-colors duration-150"
          style="
            border-bottom: 1px solid var(--color-border-secondary);
            background-color: {isActive ? 'rgba(125,108,63,0.05)' : 'transparent'};
            border: none;
            width: 100%;
            cursor: pointer;
          "
          onmouseenter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-tertiary)'; }}
          onmouseleave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
          <TalmidAvatar shem={t.shem} rank={t.rank} isOnline={t.isOnline} size="md" />
          <div class="flex-1 min-w-0 text-right">
            <div class="flex items-center gap-2 flex-wrap mb-0.5">
              <span class="text-sm font-medium" style="color: var(--color-text-primary);">{t.shem}</span>
              <RankBadge rank={t.rank} size="sm" />
              {#if makom}
                <LocationBadge shem={makom.shem} status={makom.status} />
              {/if}
              {#if t.isOnline}
                <span class="w-1.5 h-1.5 rounded-full inline-block" style="background-color: var(--color-status-success);"></span>
              {/if}
            </div>
            <div class="flex gap-3 text-xs flex-wrap" style="color: var(--color-text-tertiary);">
              <span>מסלול: {t.track}</span>
              <TokenDisplay amount={t.tokenBalance} size="sm" />
              <span>כח הצבעה: {t.votingPower}</span>
            </div>
          </div>
          {#if isActive}
            <span class="text-sm flex-shrink-0 font-semibold" style="color: var(--color-accent-secondary);">● פעיל</span>
          {:else}
            <span class="text-xs flex-shrink-0" style="color: var(--color-text-tertiary);">עבור →</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</div>

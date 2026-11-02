<script lang="ts">
  // Bring a classic campaign into the team (docs/TEAM_BACKEND.md §6d): its
  // unfinished assignments become deliverables with their tasks; people keep
  // what they held where they are on the team. Budgets stay the team's to
  // decide: after bringing one in, request a budget as usual.
  import { onMount } from 'svelte';
  import { store } from '$lib/team/store.svelte';
  import { ui } from '$lib/team/ui.svelte';
  import { t, fmtNum, fmtTmim } from '$lib/team/i18n';
  import { go, href } from '$lib/team/nav';
  import type { CampaignChoice } from '$lib/team/live';
  import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
  import Coins from '@lucide/svelte/icons/hand-coins';

  let { done }: { done: () => void } = $props();

  let campaigns = $state<CampaignChoice[] | null>(null);
  let busy = $state('');
  let brought = $state<{ objectiveId: string; budgetLeft: number } | null>(null);

  onMount(async () => { campaigns = (await store.classicCampaigns()) ?? []; });

  async function bring(c: CampaignChoice) {
    busy = c.id;
    const r = await store.importClassic(c.id);
    busy = '';
    if (!r) return;
    ui.toast('success', t('classic.done', { title: c.title }));
    brought = r;
    go(`/plan/${r.objectiveId}`);
  }

  function requestBudget() {
    if (!brought) return;
    ui.openDialog({ kind: 'requestMoney', type: 'budget', objectiveId: brought.objectiveId });
  }
</script>

{#if brought}
  <div class="form">
    <p>{t('classic.broughtHint')}</p>
    {#if brought.budgetLeft > 0}<p class="note">{t('classic.budgetLeft', { amount: fmtTmim(brought.budgetLeft) })}</p>{/if}
    <div class="form-actions">
      <button type="button" class="btn" onclick={done}>{t('common.close')}</button>
      <button type="button" class="btn btn-primary" onclick={requestBudget}><Coins size={15} />{t('plan.requestBudget')}</button>
    </div>
  </div>
{:else if campaigns === null}
  <p class="loading" role="status">{t('classic.loading')}</p>
{:else if !campaigns.length}
  <p class="muted">{t('classic.none')}</p>
  <div class="form-actions"><button type="button" class="btn" onclick={done}>{t('common.close')}</button></div>
{:else}
  <ul class="list">
    {#each campaigns as c (c.id)}
      <li>
        <div class="txt">
          <p class="title" dir="auto">{c.title}</p>
          <p class="meta">{t('classic.meta', { n: fmtNum(c.assignments), left: fmtTmim(c.budgetLeft) })}</p>
        </div>
        {#if c.objectiveId}
          <a class="btn btn-sm btn-ghost" href={href(`/plan/${c.objectiveId}`)} onclick={done}>{t('classic.already')}</a>
        {:else}
          <button type="button" class="btn btn-sm" disabled={!!busy} onclick={() => bring(c)}><ArchiveRestore size={14} />{busy === c.id ? t('classic.bringing') : t('classic.bring')}</button>
        {/if}
      </li>
    {/each}
  </ul>
  <p class="note">{t('classic.how')}</p>
{/if}

<style>
  .loading { min-height: 80px; display: grid; place-items: center; color: var(--ink-2); }
  .list { display: flex; flex-direction: column; border: 1px solid var(--rule); border-radius: var(--r-md); }
  .list li { display: flex; align-items: center; gap: 12px; padding: 10px 12px; }
  .list li + li { border-block-start: 1px solid var(--rule); }
  .txt { flex: 1; min-width: 0; }
  .title { font-weight: 500; }
  .meta { font-size: var(--fs-sm); color: var(--ink-3); }
  .note { margin-block-start: var(--s3); }
</style>

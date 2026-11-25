<script lang="ts">
  // The member's page: name, what they follow, the email they get, their
  // questions everywhere, and the wallet they may link one day.
  import { t, lt } from '$lib/team/i18n';
  import { href, go } from '$lib/team/nav';
  import { ui } from '$lib/team/ui.svelte';
  import { maayan, MAILS } from '$lib/maayan/store.svelte';
  import QuestionCard from '$lib/maayan/QuestionCard.svelte';
  import Wallet from '@lucide/svelte/icons/wallet';
  import LogOut from '@lucide/svelte/icons/log-out';
  import GraduationCap from '@lucide/svelte/icons/graduation-cap';

  const me = $derived(maayan.me);
  let name = $state(maayan.me?.name ?? '');
  let notify = $state(maayan.me?.notify ?? true);
  let quoteOk = $state(maayan.me?.quoteOk ?? false);
  const mine = $derived(me ? maayan.questions.filter(q => q.authorId === me.uid).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []);
  const titleOf = (id: string) => lt(maayan.wellspring(id)?.title);
  const byId = (qid?: string) => (qid ? maayan.questions.find(q => q.id === qid) : undefined);
  // Answers new while this page is open keep their mark for the visit; they then count as seen.
  let fresh = $state<string[]>([]);
  $effect(() => {
    const ids = maayan.unseen.map(q => q.id);
    if (!ids.length) return;
    fresh = [...new Set([...fresh, ...ids])];
    maayan.markSeen();
  });

  $effect(() => {
    if (!maayan.me && !maayan.verifiedEmail) void go('/maayan');
  });

  async function save(e: SubmitEvent) {
    e.preventDefault();
    if (await maayan.saveProfile({ name, notify, quoteOk })) ui.toast('success', t('maayan.me.saved'));
  }

  // Switching leaves this page first, so the reader's new answers stay new for the wellspring page.
  async function asTeacher(on: boolean) {
    await go(on ? '/maayan/teacher' : '/maayan/padah-beshalom');
    maayan.demoTeacher(on);
  }
</script>

<svelte:head><title>{t('maayan.me.title')}</title></svelte:head>

{#if me}
  <div class="m-wrap" style="max-width: 46rem; padding-block: 40px">
    <h1 class="m-h1" style="font-size: 2rem">{t('maayan.me.title')}</h1>
    <p class="muted">{t('maayan.me.email', { email: me.email })}</p>

    <form class="m-form-card form" style="margin-block-start: 24px; box-shadow: none" onsubmit={save}>
      <label class="field">
        <span class="label">{t('maayan.join.name')}</span>
        <input class="input" required minlength="2" maxlength="60" bind:value={name} />
      </label>
      <fieldset class="field" style="border: 0; padding: 0; margin: 0">
        <legend class="label" style="margin-block-end: 6px">{t('maayan.join.follows')}</legend>
        <div class="m-follow-list">
          {#each maayan.sorted as x (x.id)}
            <label class="m-check">
              <input type="checkbox" checked={me.follows.includes(x.id)} onchange={e => maayan.setFollow(x.id, e.currentTarget.checked)} />
              <span><a href={href(`/maayan/${x.id}`)}>{lt(x.title)}</a><small>{t(`maayan.status.${x.status}`)}</small></span>
            </label>
          {/each}
        </div>
      </fieldset>
      <label class="m-check"><input type="checkbox" bind:checked={notify} /><span>{t(MAILS ? 'maayan.join.notify' : 'maayan.join.notifySoon')}</span></label>
      <label class="m-check"><input type="checkbox" bind:checked={quoteOk} /><span>{t('maayan.join.quote')}</span></label>
      <div class="form-actions"><button type="submit" class="btn btn-primary">{t('maayan.me.save')}</button></div>
    </form>

    <section class="m-section">
      <h2 class="m-h2">{t('maayan.me.wallet')}</h2>
      <div class="m-ladder">
        <p>{me.wallet ? me.wallet : t('maayan.me.noWallet')}</p>
        {#if !me.wallet}
          {#if maayan.live}
            <p class="hint" style="margin-block-start: 8px">{t('maayan.me.linkSoon')}</p>
          {:else}
            <p style="margin-block-start: 12px"><a class="btn" href={href('/wallet')}><Wallet size={16} />{t('maayan.me.linkWallet')}</a></p>
          {/if}
        {/if}
      </div>
    </section>

    <section class="m-section">
      <h2 class="m-h2">{t('maayan.qa.tab.mine')}</h2>
      <div class="m-list">
        {#each mine as q (q.id)}
          <QuestionCard {q} context={titleOf(q.wellspringId)} parent={byId(q.parentId)} fresh={fresh.includes(q.id)} />
        {:else}
          <p class="m-empty">{t('maayan.qa.empty.mine')}</p>
        {/each}
      </div>
    </section>

    <div class="m-section" style="display: flex; flex-wrap: wrap; gap: 8px">
      <button type="button" class="btn" onclick={() => maayan.signOut()}><LogOut size={16} class="flip-rtl" />{t('maayan.me.signOut')}</button>
      {#if !maayan.live}
        {#if me.teacher}
          <button type="button" class="btn" onclick={() => asTeacher(false)}>{t('maayan.me.demoReader')}</button>
        {:else}
          <button type="button" class="btn" onclick={() => asTeacher(true)}><GraduationCap size={16} />{t('maayan.me.demoTeacher')}</button>
        {/if}
        <button type="button" class="btn btn-ghost" onclick={() => { maayan.demoReset(); void go('/maayan'); }}>{t('maayan.me.reset')}</button>
      {/if}
    </div>
  </div>
{/if}

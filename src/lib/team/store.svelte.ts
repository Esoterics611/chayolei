// The seam between screens and the domain: holds the teams, the active
// team and who is acting; runs every action as a Command and reports
// refusals in plain language. Two backends (docs/TEAM_BACKEND.md):
//   - the demo (default): sample teams in this browser, any member can act;
//   - the live app (VITE_TEAM_BACKEND=firestore): the signed-in member's
//     teams from Firestore; actions go to the server, which runs the same
//     engine and checks the charter.

import type { Team } from './types';
import { DomainError } from './types';
import { seedTeams } from './seed';
import * as E from './engine';
import { applyCommand, SETTLED_COMMANDS } from './commands';
import type { Command, CommandResult } from './commands';
import { activeMember, member } from './rules';
import { lt, t } from './i18n';
import { ui } from './ui.svelte';
import type { ChainInfo, InviteInfo, LiveClient, Refusal, Signed } from './live';
import type { PlanSuggestion } from './planner';
import type { ReviewSuggestion, Sources, Summary, ThreadRef } from './helpers';

/** The live app, on Firestore; otherwise the demo. */
export const LIVE = import.meta.env.VITE_TEAM_BACKEND === 'firestore';

const STATE_KEY = 'chayolei-demo-v1';
const ACTIVE_KEY = 'chayolei-live-team';

interface Saved {
  teams: Team[];
  activeTeamId: string;
  acting: Record<string, string>;
}

class TeamStore {
  readonly live = LIVE;
  teams = $state<Team[]>([]);
  activeTeamId = $state('');
  acting = $state<Record<string, string>>({});
  /** Ticks every minute so relative times stay fresh. */
  now = $state(new Date().toISOString());
  /** Live app: the signed-in member's uid ('' when signed out). */
  uid = $state('');
  /** Live app: 'loading' until the session and the active team are known. */
  status = $state<'loading' | 'signed_out' | 'ready'>(LIVE ? 'loading' : 'ready');
  /** Live app: where teams are recorded on-chain, if anywhere. */
  chain = $state<ChainInfo>({ enabled: false });
  private started = false;
  private client: LiveClient | null = null;
  private clientReady: Promise<LiveClient> | null = null;

  /** The active team. Screens can rely on it: in the live app the (app)
   *  layout renders them only once it has loaded (`status === 'ready'`). */
  team = $derived((this.teams.find(x => x.id === this.activeTeamId) ?? (LIVE ? undefined : this.teams[0])) as Team);
  me = $derived(LIVE ? this.uid : this.team ? this.actingIn(this.team) : '');
  meMember = $derived(this.team ? member(this.team, this.me) : undefined);

  init(): void {
    if (this.started) return;
    this.started = true;
    if (LIVE) {
      ui.demo = false;
      this.clientReady = this.startLive();
    } else {
      const saved = this.load();
      if (saved) {
        this.teams = saved.teams;
        this.activeTeamId = saved.activeTeamId;
        this.acting = saved.acting;
      } else {
        // Save at once so ids (and so links) stay stable across reloads.
        this.reseed();
        this.save();
      }
    }
    if (typeof window !== 'undefined') {
      setInterval(() => { this.now = new Date().toISOString(); }, 60_000);
    }
  }

  // ── Live app ───────────────────────────────────────────────────

  private async startLive(): Promise<LiveClient> {
    const { LiveClient } = await import('./live');
    let firstTeams = true;
    const client = new LiveClient({
      session: uid => {
        this.uid = uid ?? '';
        this.teams = [];
        firstTeams = true;
        this.status = uid ? 'loading' : 'signed_out';
      },
      teams: teams => {
        // Keep a copy newer than the listeners' (the reply to one's own action).
        this.teams = teams.map(n => {
          const mine = this.teams.find(x => x.id === n.id);
          return mine && mine.ledger.length > n.ledger.length ? mine : n;
        });
        // The active team is gone from my teams (I left, or was removed): open another.
        const gone = !firstTeams && this.activeTeamId && !teams.some(x => x.id === this.activeTeamId);
        if (firstTeams || gone) {
          firstTeams = false;
          const saved = readLocal(ACTIVE_KEY);
          const pick = teams.find(x => x.id === saved)?.id ?? teams[0]?.id ?? '';
          this.activeTeamId = pick;
          client.setActive(pick);
        }
        this.status = !this.activeTeamId || this.team ? 'ready' : 'loading';
      },
    });
    this.client = client;
    void client.chain().then(info => { this.chain = info; });
    await client.start();
    return client;
  }

  private async liveClient(): Promise<LiveClient> {
    if (this.client) return this.client;
    if (!this.clientReady) throw new Error('store not initialised');
    return this.clientReady;
  }

  async signIn(): Promise<boolean> {
    const r = await (await this.liveClient()).signIn();
    if (!r.ok) this.explain(r.error);
    return r.ok;
  }

  async signOut(): Promise<void> {
    await (await this.liveClient()).signOut();
  }

  /** Put a team from a server reply in place of the one we hold. */
  private replace(team: Team): void {
    this.teams = this.teams.some(x => x.id === team.id)
      ? this.teams.map(x => (x.id === team.id ? team : x))
      : [...this.teams, team];
  }

  private explain(r: Refusal): void {
    ui.toast('error', t(r.key, fmtVars(r.vars ?? {})));
  }

  // ── Demo ───────────────────────────────────────────────────────

  private reseed(): void {
    const seed = seedTeams(new Date().toISOString());
    this.teams = seed.teams;
    this.activeTeamId = seed.teams[0].id;
    this.acting = seed.acting;
  }

  reset(): void {
    if (LIVE) return;
    this.reseed();
    this.save();
    ui.toast('info', t('account.resetDone'));
  }

  actAs(memberId: string): void {
    if (LIVE || !this.team) return;
    this.acting = { ...this.acting, [this.team.id]: memberId };
    this.save();
  }

  /** Demo: who is acting in a team (someone still on it). */
  private actingIn(team: Team): string {
    const chosen = this.acting[team.id];
    return activeMember(team, chosen)?.id ?? team.members.find(m => !m.leftAt)?.id ?? '';
  }

  // ── Both ───────────────────────────────────────────────────────

  switchTeam(id: string): void {
    this.activeTeamId = id;
    if (LIVE) {
      writeLocal(ACTIVE_KEY, id);
      this.client?.setActive(id);
      if (!this.team?.ledger.length) this.status = 'loading';
    } else {
      this.save();
    }
  }

  /**
   * Take an action on the active team as the acting member. Resolves to
   * what it created, or undefined after showing why it was refused.
   */
  async do(cmd: Command, success?: string): Promise<CommandResult | undefined> {
    const team = this.team;
    if (!team) return undefined;
    if (!LIVE) {
      try {
        const result = applyCommand(team, this.me, cmd, new Date().toISOString());
        this.now = new Date().toISOString();
        this.save();
        if (success) ui.toast('success', success);
        return result;
      } catch (e) {
        if (e instanceof DomainError) { this.explain(e); return undefined; }
        throw e;
      }
    }
    const client = await this.liveClient();
    let command = cmd;
    let signed: Signed | undefined;
    if (team.chain && SETTLED_COMMANDS.has(cmd.type)) {
      // A settled action on an on-chain team: the member signs the exact call.
      const prep = await client.prepare(team.id, cmd);
      if (!prep.ok) { this.explain(prep.error); return undefined; }
      if (prep.value.onChain) {
        const sig = await client.signTyped(prep.value, { ...prep.value.request });
        if (!sig.ok) { this.explain(sig.error); return undefined; }
        command = prep.value.command;
        signed = { request: prep.value.request, signature: sig.value };
      }
    } else if (team.chain && cmd.type === 'contribute') {
      // TMIM moves from the member's wallet to the team's contract; the
      // server checks the transfer before recording it.
      const info = await client.chain();
      if (!info.tmim) { this.explain({ key: 'err.chain.unavailable' }); return undefined; }
      const tx = await client.sendTmim(team.chain.chainId, info.tmim, team.chain.address, cmd.amount);
      if (!tx.ok) { this.explain(tx.error); return undefined; }
      command = { ...cmd, txHash: tx.value };
    }
    const r = await client.send(team.id, command, signed);
    if (!r.ok) { this.explain(r.error); return undefined; }
    if (cmd.type === 'leave') {
      // No longer mine: the access rules stop my listeners; open another team.
      this.teams = this.teams.filter(x => x.id !== team.id);
      this.switchTeam(this.teams[0]?.id ?? '');
      this.status = 'ready';
      if (success) ui.toast('success', success);
      return r.value.result;
    }
    this.replace(r.value.team);
    this.now = new Date().toISOString();
    if (success) ui.toast('success', success);
    return r.value.result;
  }

  /** The AI planner's suggested breakdown of an objective, to edit before
   *  adding it with `addPlan`. The demo calls no AI: it shows a sample, labelled so. */
  async suggestPlan(objectiveId: string): Promise<PlanSuggestion | undefined> {
    const team = this.team;
    if (!team) return undefined;
    if (!LIVE) {
      const { samplePlan } = await import('./planner');
      try {
        return samplePlan(team, objectiveId, ui.locale);
      } catch (e) {
        if (e instanceof DomainError) { this.explain(e); return undefined; }
        throw e;
      }
    }
    const r = await (await this.liveClient()).suggestPlan(team.id, objectiveId, ui.locale);
    if (!r.ok) { this.explain(r.error); return undefined; }
    return r.value;
  }

  /** An AI helper's suggestion, to keep or leave: first-pass notes on a review
   *  round, a thread's summary, or sources for a deliverable. The demo calls no
   *  AI: it shows samples, labelled so. */
  askHelper(helper: 'review', input: { changeId: string }): Promise<ReviewSuggestion | undefined>;
  askHelper(helper: 'summary', input: { ref: ThreadRef }): Promise<Summary | undefined>;
  askHelper(helper: 'sources', input: { deliverableId: string }): Promise<Sources | undefined>;
  async askHelper(helper: 'review' | 'summary' | 'sources', input: Record<string, unknown>): Promise<unknown> {
    const team = this.team;
    if (!team) return undefined;
    if (!LIVE) {
      const H = await import('./helpers');
      try {
        if (helper === 'review') {
          H.requireReviewHelper(team, this.me, input.changeId as string);
          return H.sampleReview(team, input.changeId as string, ui.locale);
        }
        if (helper === 'summary') {
          return H.sampleSummary(team, input.ref as ThreadRef, ui.locale, id => lt(member(team, id)?.name).split(' ')[0]);
        }
        H.requireSourcesHelper(team, this.me, input.deliverableId as string);
        return H.sampleSources(team, input.deliverableId as string, ui.locale);
      } catch (e) {
        if (e instanceof DomainError) { this.explain(e); return undefined; }
        throw e;
      }
    }
    const r = await (await this.liveClient()).helper(team.id, { helper, ...input, locale: ui.locale });
    if (!r.ok) { this.explain(r.error); return undefined; }
    return r.value;
  }

  async createTeam(input: Parameters<typeof E.createTeam>[0]): Promise<Team | undefined> {
    if (LIVE) {
      const client = await this.liveClient();
      const data = {
        name: String(input.name), purpose: String(input.purpose), templateId: input.templateId,
        you: { name: String(input.founder.name) },
      };
      const signed = await this.signPrepared(await client.prepareTeam(data));
      if (signed === null) return undefined;
      const r = await client.createTeam(data, signed);
      if (!r.ok) { this.explain(r.error); return undefined; }
      this.replace(r.value);
      this.switchTeam(r.value.id);
      this.status = 'ready';
      return r.value;
    }
    try {
      const team = E.createTeam(input, new Date().toISOString());
      this.teams = [...this.teams, team];
      this.activeTeamId = team.id;
      this.acting = { ...this.acting, [team.id]: team.members[0].id };
      this.save();
      return team;
    } catch (e) {
      if (e instanceof DomainError) { this.explain(e); return undefined; }
      throw e;
    }
  }

  /** A join link for the active team: real in the live app, illustrative in the demo. */
  async inviteLink(): Promise<string | undefined> {
    const team = this.team;
    if (!team) return undefined;
    if (!LIVE) return `https://chayolei.app/join/${team.id}-demo`;
    const client = await this.liveClient();
    let body: Record<string, unknown> = {};
    if (team.chain) {
      // The inviter signs the invite; the team's contract checks it when people join.
      const prep = await client.prepareInvite(team.id);
      if (!prep.ok) { this.explain(prep.error); return undefined; }
      if (prep.value.onChain) {
        const sig = await client.signTyped(prep.value, prep.value.invite);
        if (!sig.ok) { this.explain(sig.error); return undefined; }
        body = { token: prep.value.token, invite: prep.value.invite, signature: sig.value };
      }
    }
    const r = await client.invite(team.id, body);
    if (!r.ok) { this.explain(r.error); return undefined; }
    return r.value.url;
  }

  async inviteInfo(token: string): Promise<InviteInfo | undefined> {
    const r = await (await this.liveClient()).inviteInfo(token);
    if (!r.ok) { this.explain(r.error); return undefined; }
    return r.value;
  }

  async acceptInvite(token: string, name: string): Promise<Team | undefined> {
    const client = await this.liveClient();
    const signed = await this.signPrepared(await client.prepareJoin(token));
    if (signed === null) return undefined;
    const r = await client.acceptInvite(token, { name }, signed);
    if (!r.ok) { this.explain(r.error); return undefined; }
    this.replace(r.value);
    this.switchTeam(r.value.id);
    this.status = 'ready';
    return r.value;
  }

  /** Sign a prepared forward request, if there is one. Null: refused or cancelled (already explained). */
  private async signPrepared(
    prep: Awaited<ReturnType<LiveClient['prepareTeam']>>,
  ): Promise<Signed | undefined | null> {
    if (!prep.ok) { this.explain(prep.error); return null; }
    if (!prep.value.onChain) return undefined;
    const sig = await (await this.liveClient()).signTyped(prep.value, { ...prep.value.request });
    if (!sig.ok) { this.explain(sig.error); return null; }
    return { request: prep.value.request, signature: sig.value };
  }

  private load(): Saved | undefined {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return undefined;
      const saved = JSON.parse(raw) as Saved;
      if (!Array.isArray(saved.teams) || !saved.teams.length) return undefined;
      return saved;
    } catch {
      return undefined;
    }
  }

  private save(): void {
    if (LIVE) return;
    try {
      const snapshot: Saved = { teams: $state.snapshot(this.teams) as Team[], activeTeamId: this.activeTeamId, acting: { ...this.acting } };
      localStorage.setItem(STATE_KEY, JSON.stringify(snapshot));
    } catch {
      // Storage unavailable: the demo still works for this visit.
    }
  }
}

const fmtVars = (vars: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, typeof v === 'number' ? v.toLocaleString() : v]));

function readLocal(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeLocal(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

export const store = new TeamStore();

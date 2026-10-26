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
import { applyCommand } from './commands';
import type { Command, CommandResult } from './commands';
import { member } from './rules';
import { t } from './i18n';
import { ui } from './ui.svelte';
import type { InviteInfo, LiveClient, Refusal } from './live';

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
  private started = false;
  private client: LiveClient | null = null;
  private clientReady: Promise<LiveClient> | null = null;

  /** The active team. Screens can rely on it: in the live app the (app)
   *  layout renders them only once it has loaded (`status === 'ready'`). */
  team = $derived((this.teams.find(x => x.id === this.activeTeamId) ?? (LIVE ? undefined : this.teams[0])) as Team);
  me = $derived(LIVE ? this.uid : this.team ? (this.acting[this.team.id] ?? this.team.members[0]?.id) : '');
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
        if (firstTeams) {
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
    const r = await (await this.liveClient()).send(team.id, cmd);
    if (!r.ok) { this.explain(r.error); return undefined; }
    this.replace(r.value.team);
    this.now = new Date().toISOString();
    if (success) ui.toast('success', success);
    return r.value.result;
  }

  async createTeam(input: Parameters<typeof E.createTeam>[0]): Promise<Team | undefined> {
    if (LIVE) {
      const r = await (await this.liveClient()).createTeam({
        name: String(input.name), purpose: String(input.purpose), templateId: input.templateId,
        you: { name: String(input.founder.name) },
      });
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
    const r = await (await this.liveClient()).invite(team.id);
    if (!r.ok) { this.explain(r.error); return undefined; }
    return r.value.url;
  }

  async inviteInfo(token: string): Promise<InviteInfo | undefined> {
    const r = await (await this.liveClient()).inviteInfo(token);
    if (!r.ok) { this.explain(r.error); return undefined; }
    return r.value;
  }

  async acceptInvite(token: string, name: string): Promise<Team | undefined> {
    const r = await (await this.liveClient()).acceptInvite(token, { name });
    if (!r.ok) { this.explain(r.error); return undefined; }
    this.replace(r.value);
    this.switchTeam(r.value.id);
    this.status = 'ready';
    return r.value;
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

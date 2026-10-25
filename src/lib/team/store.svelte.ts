// The seam between screens and the domain: holds the teams, the active
// team and who is acting; runs engine actions, reports refusals in plain
// language and saves the demo state. A Firestore/contract-backed store can
// replace this later without touching screens (docs/UX_TECH_DESIGN.md §11).

import type { Team } from './types';
import { DomainError } from './types';
import { seedTeams } from './seed';
import * as E from './engine';
import { member } from './rules';
import { t } from './i18n';
import { ui } from './ui.svelte';

const STATE_KEY = 'chayolei-demo-v1';

interface Saved {
  teams: Team[];
  activeTeamId: string;
  acting: Record<string, string>;
}

class TeamStore {
  teams = $state<Team[]>([]);
  activeTeamId = $state('');
  acting = $state<Record<string, string>>({});
  /** Ticks every minute so relative times stay fresh. */
  now = $state(new Date().toISOString());
  private started = false;

  team = $derived(this.teams.find(x => x.id === this.activeTeamId) ?? this.teams[0]);
  me = $derived(this.team ? (this.acting[this.team.id] ?? this.team.members[0]?.id) : '');
  meMember = $derived(this.team ? member(this.team, this.me) : undefined);

  init(): void {
    if (this.started) return;
    this.started = true;
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
    if (typeof window !== 'undefined') {
      setInterval(() => { this.now = new Date().toISOString(); }, 60_000);
    }
  }

  private reseed(): void {
    const seed = seedTeams(new Date().toISOString());
    this.teams = seed.teams;
    this.activeTeamId = seed.teams[0].id;
    this.acting = seed.acting;
  }

  reset(): void {
    this.reseed();
    this.save();
    ui.toast('info', t('account.resetDone'));
  }

  switchTeam(id: string): void {
    this.activeTeamId = id;
    this.save();
  }

  actAs(memberId: string): void {
    this.acting = { ...this.acting, [this.team.id]: memberId };
    this.save();
  }

  /**
   * Run an engine action on the active team as the acting member. Returns the
   * result, or undefined after showing the reason it was refused.
   */
  run<T>(fn: (team: Team, me: string, now: string) => T, success?: string): T | undefined {
    try {
      const result = fn(this.team, this.me, new Date().toISOString());
      this.now = new Date().toISOString();
      this.save();
      if (success) ui.toast('success', success);
      return result;
    } catch (e) {
      if (e instanceof DomainError) {
        ui.toast('error', t(e.key, Object.fromEntries(Object.entries(e.vars).map(([k, v]) => [k, typeof v === 'number' ? v.toLocaleString() : v]))));
        return undefined;
      }
      throw e;
    }
  }

  createTeam(input: Parameters<typeof E.createTeam>[0]): Team | undefined {
    try {
      const team = E.createTeam(input, new Date().toISOString());
      this.teams = [...this.teams, team];
      this.activeTeamId = team.id;
      this.acting = { ...this.acting, [team.id]: team.members[0].id };
      this.save();
      return team;
    } catch (e) {
      if (e instanceof DomainError) { ui.toast('error', t(e.key, e.vars)); return undefined; }
      throw e;
    }
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
    try {
      const snapshot: Saved = { teams: $state.snapshot(this.teams) as Team[], activeTeamId: this.activeTeamId, acting: { ...this.acting } };
      localStorage.setItem(STATE_KEY, JSON.stringify(snapshot));
    } catch {
      // Storage unavailable: the demo still works for this visit.
    }
  }
}

export const store = new TeamStore();

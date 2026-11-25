// The wellsprings' seam between pages and data, on two backends like the team
// store (src/lib/team/store.svelte.ts):
//   - the demo (default): the wellsprings and sample questions in this browser;
//     signing in by email is simulated, and anyone can step in as the teacher;
//   - the live app (VITE_TEAM_BACKEND=firestore): Firebase email-link sign-in,
//     Firestore listeners, and actions checked by the server.

import { DomainError } from '$lib/team/types';
import { ui } from '$lib/team/ui.svelte';
import { t } from '$lib/team/i18n';
import * as M from './engine';
import { DEMO_TEACHER, SAMPLE_STUDYING, WELLSPRINGS, sampleQuestions } from './seed';
import type { MaayanMember, Question, Wellspring } from './types';
import type { MaayanLive, MaayanMode } from './live';

/** How the wellsprings run: 'demo' in this browser; 'server' through the API
 *  (Cloud Run, with answer emails); 'direct' (the free version) writing to
 *  Firestore itself under firestore.rules. VITE_MAAYAN_BACKEND chooses; by
 *  default the live team app means 'server'. */
export const MODE: 'demo' | MaayanMode = (import.meta.env.VITE_MAAYAN_BACKEND as MaayanMode | undefined)
  ?? (import.meta.env.VITE_TEAM_BACKEND === 'firestore' ? 'server' : 'demo');
export const LIVE = MODE !== 'demo';

/** Where the team app is: in the free version it isn't live, so its links go
 *  to the published demo, in a tab of its own; elsewhere, this app's own. */
export const TEAMS_DEMO = MODE === 'direct' ? 'https://esoterics611.github.io/chayolei/' : '';

const DEMO_KEY = 'chayolei-maayan-demo-v1';
/** Answers this browser has shown the member, so new ones can be marked. */
const SEEN_KEY = 'chayolei-maayan-seen';

interface DemoSaved {
  questions: Question[];
  me: MaayanMember | null;
  linkSentTo: string;
  verifiedEmail: string;
  /** The reader's own profile while the demo shows the teacher's view. */
  reader: MaayanMember | null;
}

const uid = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

class MaayanStore {
  readonly live = LIVE;
  readonly mode = MODE;
  wellsprings = $state<Wellspring[]>([...WELLSPRINGS]);
  questions = $state<Question[]>([]);
  /** The signed-in member's profile (null: signed out, or signed in without a profile yet). */
  me = $state<MaayanMember | null>(null);
  /** Where the last sign-in link went. */
  linkSentTo = $state('');
  /** Signed in with a confirmed email, before the profile is made. */
  verifiedEmail = $state('');
  /** The name the sign-in account carries (Google), offered as the name to show. */
  accountName = $state('');
  status = $state<'loading' | 'ready'>(LIVE ? 'loading' : 'ready');
  private reader: MaayanMember | null = null;
  private started = false;
  private client: MaayanLive | null = null;

  /** Ids of the member's answered questions already seen in this browser. */
  seen = $state<string[]>([]);

  sorted = $derived([...this.wellsprings].sort((a, b) => a.order - b.order));
  /** The member's answered questions not yet seen. */
  unseen = $derived(this.me ? this.questions.filter(q => q.authorId === this.me!.uid && q.status === 'answered' && !this.seen.includes(q.id)) : []);
  signedIn = $derived(!!this.me || !!this.verifiedEmail);

  wellspring(id: string): Wellspring | undefined {
    return this.wellsprings.find(w => w.id === id);
  }

  studying(id: string): number {
    const w = this.wellspring(id) as (Wellspring & { followers?: number }) | undefined;
    return LIVE ? (w?.followers ?? 0) : (SAMPLE_STUDYING[id] ?? 0) + (this.me?.follows.includes(id) && !this.me.teacher ? 1 : 0);
  }

  init(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    try { this.seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]'); } catch { /* none seen */ }
    if (LIVE) {
      void import('./live').then(({ MaayanLive }) => {
        this.client = new MaayanLive({
          session: s => {
            this.me = s?.member ?? null;
            this.verifiedEmail = s && !s.member ? s.email : '';
            this.accountName = s?.name ?? '';
            this.status = 'ready';
          },
          wellsprings: ws => { if (ws.length) this.wellsprings = ws; },
          questions: qs => { this.questions = qs; },
        }, MODE as MaayanMode, () => ({ me: this.me, questions: this.questions, wellsprings: this.wellsprings }));
        void this.client.start();
      });
      return;
    }
    let saved: DemoSaved | null = null;
    try { saved = JSON.parse(localStorage.getItem(DEMO_KEY) ?? 'null'); } catch { /* fresh */ }
    this.questions = saved?.questions ?? sampleQuestions();
    this.me = saved?.me ?? null;
    this.linkSentTo = saved?.linkSentTo ?? '';
    this.verifiedEmail = saved?.verifiedEmail ?? '';
    this.reader = saved?.reader ?? null;
    this.save();
  }

  private save(): void {
    if (LIVE) return;
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify({
        questions: this.questions, me: this.me, linkSentTo: this.linkSentTo,
        verifiedEmail: this.verifiedEmail, reader: this.reader,
      } satisfies DemoSaved));
    } catch { /* storage unavailable: the demo lasts for this visit */ }
  }

  /** Run an action; a refusal becomes a toast in the reader's language. */
  private async run<T>(fn: () => T | Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch (e) {
      const key = e instanceof DomainError || (e as { key?: string })?.key ? (e as DomainError).key : 'maayan.err.server';
      ui.toast('error', t(key, (e as DomainError).vars ?? {}));
      return null;
    }
  }

  // ── Signing in by email ──────────────────────────────────────

  async sendLink(email: string, returnTo: string): Promise<boolean> {
    const ok = await this.run(async () => {
      const e = M.checkEmail(email);
      if (LIVE) {
        try { await this.client!.sendLink(e, returnTo); } catch { throw new DomainError('maayan.err.sendLink'); }
      }
      this.linkSentTo = e;
      this.save();
      return true;
    });
    return !!ok;
  }

  /** The demo's stand-in for opening the emailed link. */
  demoOpenLink(): void {
    if (LIVE || !this.linkSentTo) return;
    this.verifiedEmail = this.linkSentTo;
    this.linkSentTo = '';
    this.save();
  }

  completeLink(href: string, typed?: string) {
    return this.client ? this.client.completeLink(href, typed) : Promise.resolve('none' as const);
  }

  /** Sign in with Google: in the demo, a stand-in account. */
  async signInWithGoogle(): Promise<void> {
    if (!LIVE) {
      this.verifiedEmail = 'reader@gmail.com';
      this.accountName = 'חנה לוי';
      this.linkSentTo = '';
      this.save();
      return;
    }
    const r = await this.client!.signInWithGoogle();
    if (r === 'failed') ui.toast('error', t('maayan.err.google'), 7000);
  }

  cancelLink(): void {
    this.linkSentTo = '';
    this.save();
  }

  async createProfile(p: { name: string; follows: string[]; notify: boolean; quoteOk: boolean; joinedFrom: string }): Promise<boolean> {
    const done = await this.run(async () => {
      const name = M.checkName(p.name);
      if (LIVE) {
        this.me = await this.client!.saveProfile({ ...p, name });
        this.verifiedEmail = '';
        this.client!.watch(this.me);
        return true;
      }
      this.me = {
        uid: uid(), name, email: this.verifiedEmail, follows: p.follows, notify: p.notify, quoteOk: p.quoteOk,
        joinedFrom: p.joinedFrom, joinedAt: new Date().toISOString(), approved: 0,
      };
      this.verifiedEmail = '';
      this.save();
      return true;
    });
    return !!done;
  }

  async saveProfile(p: Partial<Pick<MaayanMember, 'name' | 'follows' | 'notify' | 'quoteOk'>>): Promise<boolean> {
    const me = this.me;
    if (!me) return false;
    const done = await this.run(async () => {
      const next = { ...me, ...p, ...(p.name !== undefined ? { name: M.checkName(p.name) } : {}) };
      if (LIVE) {
        this.me = await this.client!.saveProfile({
          name: next.name, follows: next.follows, notify: next.notify, quoteOk: next.quoteOk,
        });
      } else {
        this.me = next;
        this.save();
      }
      return true;
    });
    return !!done;
  }

  async setFollow(id: string, on: boolean): Promise<void> {
    if (!this.me) return;
    await this.saveProfile({ follows: M.follow(this.me, id, on).follows });
  }

  async signOut(): Promise<void> {
    if (LIVE) await this.client?.signOut();
    this.me = null;
    this.verifiedEmail = '';
    this.linkSentTo = '';
    this.reader = null;
    this.save();
    ui.toast('info', t('maayan.me.signedOut'));
  }

  // ── Questions ────────────────────────────────────────────────

  visible(id: string): Question[] {
    return M.visible(this.questions, id, this.me ?? undefined);
  }

  async ask(wellspringId: string, text: string, opts: { ref?: string; parentId?: string } = {}): Promise<Question | null> {
    return this.run(async () => {
      if (LIVE) return this.client!.ask(wellspringId, text, opts);
      const now = new Date().toISOString();
      const parent = opts.parentId ? this.questions.find(q => q.id === opts.parentId) : undefined;
      const askedToday = this.me ? M.askedSince(this.questions, this.me.uid, now) : 0;
      const q = M.ask(this.wellspring(wellspringId), this.me ?? undefined, text, uid(), now, { ref: opts.ref, parent, askedToday });
      this.questions = [q, ...this.questions];
      this.save();
      return q;
    });
  }

  /** The asker takes back a question not yet answered; it is deleted. */
  async withdraw(id: string): Promise<boolean> {
    const done = await this.run(async () => {
      if (LIVE) {
        await this.client!.withdraw(id);
        this.questions = this.questions.filter(q => q.id !== id);
        return true;
      }
      const q = this.questions.find(x => x.id === id);
      if (!q) throw new DomainError('maayan.err.state');
      M.checkWithdraw(q, this.me ?? undefined);
      this.questions = this.questions.filter(x => x.id !== id);
      this.save();
      return true;
    });
    return !!done;
  }

  /** The member has seen their answers: the marks of new ones go. */
  markSeen(): void {
    if (!this.unseen.length) return;
    this.seen = [...this.seen, ...this.unseen.map(q => q.id)];
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(this.seen)); } catch { /* marks last this visit */ }
  }

  private async teacherAct(id: string, action: 'approve' | 'hide' | 'answer', text = ''): Promise<boolean> {
    const done = await this.run(async () => {
      if (LIVE) {
        await this.client!.act(id, action, text);
        return true;
      }
      const before = this.questions.find(q => q.id === id);
      if (!before) throw new DomainError('maayan.err.state');
      const me = this.me ?? undefined;
      const after = action === 'approve' ? M.approve(before, me)
        : action === 'hide' ? M.hide(before, me)
        : M.answer(before, me, text, new Date().toISOString());
      this.questions = this.questions.map(q => (q.id === id ? after : q));
      // The asker's own count: in the demo, the reader set aside while viewing as the teacher.
      if (M.countsAsApproval(before, after) && this.reader?.uid === after.authorId) {
        this.reader = { ...this.reader, approved: this.reader.approved + 1 };
      }
      this.save();
      return true;
    });
    return !!done;
  }

  approve = (id: string) => this.teacherAct(id, 'approve');
  hide = (id: string) => this.teacherAct(id, 'hide');
  answer = (id: string, text: string) => this.teacherAct(id, 'answer', text);

  // ── Demo only ────────────────────────────────────────────────

  /** Step in as the teacher (or back to the reader one was). */
  demoTeacher(on: boolean): void {
    if (LIVE) return;
    if (on && !this.me?.teacher) {
      this.reader = this.me;
      this.me = DEMO_TEACHER;
    } else if (!on && this.me?.teacher) {
      this.me = this.reader;
      this.reader = null;
    }
    this.save();
  }

  demoReset(): void {
    if (LIVE) return;
    try { localStorage.removeItem(DEMO_KEY); localStorage.removeItem(SEEN_KEY); } catch { /* nothing saved */ }
    this.seen = [];
    this.questions = sampleQuestions();
    this.me = null;
    this.reader = null;
    this.linkSentTo = '';
    this.verifiedEmail = '';
    this.save();
  }
}

export const maayan = new MaayanStore();

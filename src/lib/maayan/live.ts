// The wellsprings' connection to the live backend: email-link sign-in
// (Firebase Auth; opening the link confirms the address), Firestore listeners
// for the wellsprings and the questions a member may read (firestore.rules),
// and the actions, in one of two modes (docs/MAAYAN.md §6, §6a):
//   - server: posted to /api/maayan, where the server runs the engine and
//     sends the answer emails (src/lib/server/maayan.ts; needs Cloud Run);
//   - direct: the free version. The browser runs the engine and writes to
//     Firestore itself; firestore.rules holds every write to the same rules.
// Loaded only in the live app.

import type { Unsubscribe } from 'firebase/firestore';
import { DomainError } from '$lib/team/types';
import * as M from './engine';
import type { MaayanMember, Question, Wellspring } from './types';

export type MaayanMode = 'server' | 'direct';

/** What the store knows right now, for actions the browser decides itself. */
export interface MaayanState {
  me: MaayanMember | null;
  questions: Question[];
  wellsprings: Wellspring[];
}

export interface ProfileInput {
  name: string;
  follows: string[];
  notify: boolean;
  quoteOk: boolean;
  joinedFrom?: string;
}

const EMAIL_KEY = 'chayolei-maayan-email';

export interface MaayanLiveEvents {
  /** Signed out (null), or signed in with a confirmed email and the profile if one was made. */
  session(s: { uid: string; email: string; member: MaayanMember | null } | null): void;
  wellsprings(ws: Wellspring[]): void;
  questions(qs: Question[]): void;
}

export class ApiError extends Error {
  constructor(public key: string, public vars: Record<string, string | number> = {}) {
    super(key);
  }
}

export class MaayanLive {
  private subs: Unsubscribe[] = [];
  private uid = '';
  private sets = new Map<string, Question[]>();

  constructor(private events: MaayanLiveEvents, private mode: MaayanMode, private state: () => MaayanState) {}

  async start(): Promise<void> {
    const { auth, db } = await import('$lib/firebase');
    const { onAuthStateChanged } = await import('firebase/auth');
    const { collection, onSnapshot } = await import('firebase/firestore');
    auth.languageCode = 'he';
    onSnapshot(collection(db, 'wellsprings'), s =>
      this.events.wellsprings(s.docs.map(d => ({ ...(d.data() as Wellspring), id: d.id }))));
    onAuthStateChanged(auth, async user => {
      this.uid = user?.uid ?? '';
      if (!user?.email || !user.emailVerified) {
        this.watch(null);
        this.events.session(null);
        return;
      }
      const member = await this.loadMe(user.uid).catch(() => null);
      this.watch(member);
      this.events.session({ uid: user.uid, email: user.email, member });
    });
  }

  /** Listen to what this viewer may read: published and answered questions, their own, and for the teacher the rest. */
  watch(member: MaayanMember | null): void {
    void (async () => {
      const { db } = await import('$lib/firebase');
      const { collection, onSnapshot, query, where } = await import('firebase/firestore');
      this.subs.forEach(u => u());
      this.subs = [];
      this.sets.clear();
      const col = collection(db, 'maayanQuestions');
      const listen = (name: string, q: ReturnType<typeof query>) =>
        this.subs.push(onSnapshot(q, s => {
          this.sets.set(name, s.docs.map(d => ({ ...(d.data() as Question), id: d.id })));
          const all = new Map<string, Question>();
          for (const list of this.sets.values()) for (const x of list) all.set(x.id, x);
          this.events.questions([...all.values()]);
        }, () => { /* a refused listener reads nothing */ }));
      listen('public', query(col, where('status', 'in', ['published', 'answered'])));
      if (member) listen('mine', query(col, where('authorId', '==', member.uid)));
      if (member?.teacher) listen('desk', query(col, where('status', 'in', ['pending', 'hidden'])));
    })();
  }

  /** Send the sign-in link; it brings the reader back to /maayan/auth. */
  async sendLink(email: string, returnTo: string): Promise<void> {
    const { auth } = await import('$lib/firebase');
    const { sendSignInLinkToEmail } = await import('firebase/auth');
    const url = new URL('/maayan/auth', location.origin);
    url.searchParams.set('next', returnTo);
    await sendSignInLinkToEmail(auth, email, { url: url.toString(), handleCodeInApp: true });
    try { localStorage.setItem(EMAIL_KEY, email); } catch { /* the reader types it again if needed */ }
  }

  /** Complete sign-in from the link: 'ok', 'needEmail' (opened on another device) or 'bad'. */
  async completeLink(href: string, typed?: string): Promise<'ok' | 'needEmail' | 'bad' | 'none'> {
    const { auth } = await import('$lib/firebase');
    const { isSignInWithEmailLink, signInWithEmailLink } = await import('firebase/auth');
    if (!isSignInWithEmailLink(auth, href)) return 'none';
    let email = typed;
    try { email ??= localStorage.getItem(EMAIL_KEY) ?? undefined; } catch { /* none saved */ }
    if (!email) return 'needEmail';
    try {
      await signInWithEmailLink(auth, email, href);
      try { localStorage.removeItem(EMAIL_KEY); } catch { /* nothing to clear */ }
      return 'ok';
    } catch {
      return 'bad';
    }
  }

  // ── Actions, in either mode ───────────────────────────────────

  private async fs() {
    const { db, auth } = await import('$lib/firebase');
    const F = await import('firebase/firestore');
    return { db, auth, F };
  }

  async loadMe(uid: string): Promise<MaayanMember | null> {
    if (this.mode === 'server') return this.get<MaayanMember | null>('/api/maayan/me');
    const { db, F } = await this.fs();
    const d = await F.getDoc(F.doc(db, 'maayanMembers', uid));
    return d.exists() ? ({ ...(d.data() as MaayanMember), uid }) : null;
  }

  /** Make the profile, or change its name and choices. */
  async saveProfile(p: ProfileInput): Promise<MaayanMember> {
    if (this.mode === 'server') return this.post<MaayanMember>('/api/maayan/me', p);
    const { db, auth, F } = await this.fs();
    const user = auth.currentUser;
    if (!user?.email || !user.emailVerified) throw new DomainError('maayan.err.signIn');
    const known = new Set(this.state().wellsprings.map(w => w.id));
    const choices = {
      name: M.checkName(p.name),
      follows: [...new Set(p.follows.filter(id => known.has(id)))].slice(0, 50),
      notify: !!p.notify,
      quoteOk: !!p.quoteOk,
    };
    const ref = F.doc(db, 'maayanMembers', user.uid);
    const before = this.state().me;
    if (before) {
      await F.updateDoc(ref, choices);
      return { ...before, ...choices };
    }
    const m: MaayanMember = {
      uid: user.uid, email: user.email.toLowerCase(), ...choices,
      joinedFrom: (p.joinedFrom ?? '').slice(0, 80), joinedAt: new Date().toISOString(), approved: 0,
    };
    await F.setDoc(ref, m);
    return m;
  }

  async ask(wellspringId: string, text: string, opts: { ref?: string; parentId?: string }): Promise<Question> {
    if (this.mode === 'server') return this.post<Question>('/api/maayan/questions', { wellspringId, text, ...opts });
    const { db, F } = await this.fs();
    const { me, questions, wellsprings } = this.state();
    const ref = F.doc(F.collection(db, 'maayanQuestions'));
    const now = new Date().toISOString();
    const q = M.ask(wellsprings.find(w => w.id === wellspringId), me ?? undefined, text, ref.id, now, {
      ref: opts.ref,
      parent: opts.parentId ? questions.find(x => x.id === opts.parentId) : undefined,
      askedToday: me ? M.askedSince(questions, me.uid, now) : 0,
    });
    await F.setDoc(ref, q);
    return q;
  }

  async withdraw(id: string): Promise<void> {
    if (this.mode === 'server') {
      await this.post(`/api/maayan/questions/${encodeURIComponent(id)}`, { action: 'withdraw' });
      return;
    }
    const { db, F } = await this.fs();
    const q = this.state().questions.find(x => x.id === id);
    if (!q) throw new DomainError('maayan.err.state');
    M.checkWithdraw(q, this.state().me ?? undefined);
    await F.deleteDoc(F.doc(db, 'maayanQuestions', id));
  }

  /** The teacher's actions. Letting a first question through counts on the asker's profile. */
  async act(id: string, action: 'approve' | 'hide' | 'answer', text = ''): Promise<void> {
    if (this.mode === 'server') {
      await this.post(`/api/maayan/questions/${encodeURIComponent(id)}`, { action, text });
      return;
    }
    const { db, F } = await this.fs();
    const me = this.state().me ?? undefined;
    const before = this.state().questions.find(x => x.id === id);
    if (!before) throw new DomainError('maayan.err.state');
    const after = action === 'approve' ? M.approve(before, me)
      : action === 'hide' ? M.hide(before, me)
      : M.answer(before, me, text, new Date().toISOString());
    const batch = F.writeBatch(db);
    batch.update(F.doc(db, 'maayanQuestions', id), after.answer ? { status: after.status, answer: after.answer } : { status: after.status });
    if (M.countsAsApproval(before, after)) {
      batch.update(F.doc(db, 'maayanMembers', after.authorId), { approved: F.increment(1) });
    }
    await batch.commit();
  }

  async signOut(): Promise<void> {
    const { auth } = await import('$lib/firebase');
    await auth.signOut();
  }

  get<T>(path: string): Promise<T> {
    return this.call<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.call<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }

  private async call<T>(path: string, init: RequestInit): Promise<T> {
    const { auth } = await import('$lib/firebase');
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    }).catch(() => null);
    if (!res) throw new ApiError('live.offline');
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(body?.error?.key ?? 'maayan.err.server', body?.error?.vars ?? {});
    return body as T;
  }
}

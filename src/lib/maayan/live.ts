// The wellsprings' connection to the live backend (VITE_TEAM_BACKEND=firestore):
// email-link sign-in (Firebase Auth; opening the link confirms the address),
// Firestore listeners for the wellsprings and the questions a member may read
// (firestore.rules), and actions posted to /api/maayan, where the server runs
// the same engine (src/lib/server/maayan.ts). Loaded only in the live app.

import type { Unsubscribe } from 'firebase/firestore';
import type { MaayanMember, Question, Wellspring } from './types';

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

  constructor(private events: MaayanLiveEvents) {}

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
      const member = await this.get<MaayanMember | null>('/api/maayan/me').catch(() => null);
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

// ═══════════════════════════════════════════════════════════════
// חיילי בית דוד — מאגר מצב גלובלי (Svelte 5 runes + Firebase)
// ═══════════════════════════════════════════════════════════════
//
// Architecture: Firebase-first.
//  • All mutations → API routes (server-side validation + atomic writes)
//  • All reads → Firestore onSnapshot listeners (real-time)
//  • Mock data used ONLY as loading placeholder while listeners connect
//  • In-memory fallback used ONLY when VITE_FIREBASE_API_KEY absent (CI/build)
// ═══════════════════════════════════════════════════════════════

import {
  MOCK_TALMIDIM,
  MOCK_GROUPS,
  MOCK_MEKOMOT,
  MOCK_MIVTZAOT,
  MOCK_MASIMOT,
  MOCK_TAFKIDIM,
  MOCK_PEER_REVIEWS,
  MOCK_DISCUSSIONS,
  MOCK_TREASURY,
  MOCK_ACTIVITIES,
  MOCK_MAAMARIM,
  MOCK_FARBRENGENS,
  MOCK_SEDER,
  CURRENT_USER_ID,
} from './mock-data';
import type {
  Talmid,
  ShiurGroup,
  Makom,
  Mivtza,
  Masima,
  Tafkid,
  PeerReview,
  Discussion,
  Treasury,
  Activity,
  ActivityType,
  Maamar,
  Farbrengen,
  SederScheduleItem,
  DashboardStats,
  Rank,
  MasimaStatus,
  TafkidStatus,
  LearningTrack,
  Proposal,
  PaymentStream,
  TreasuryStats,
} from '$lib/types';
import { RANKS, RANK_META, RANK_VOTING_POWER } from '$lib/types';
import { toast } from './toast.svelte';
import type { Eip1193Provider } from 'ethers';

// Detect if Firebase is configured
const USE_FIREBASE = typeof import.meta !== 'undefined' &&
  !!import.meta.env?.VITE_FIREBASE_API_KEY;

const now = () => new Date().toISOString();

type Unsubscribe = () => void;

class AppStore {
  // ── core data ─────────────────────────────────────────────────
  talmidim      = $state<Talmid[]>([]);
  groups        = $state<ShiurGroup[]>(MOCK_GROUPS);
  mekomot       = $state<Makom[]>(MOCK_MEKOMOT);
  mivtzaot      = $state<Mivtza[]>([]);
  masimot       = $state<Masima[]>([]);
  tafkidim      = $state<Tafkid[]>([]);
  peerReviews   = $state<PeerReview[]>([]);
  discussions   = $state<Discussion[]>([]);
  treasury      = $state<Treasury>(MOCK_TREASURY);
  activities    = $state<Activity[]>([]);
  maamarim      = $state<Maamar[]>(MOCK_MAAMARIM);
  farbrengens   = $state<Farbrengen[]>(MOCK_FARBRENGENS);
  sederSchedule = $state<SederScheduleItem[]>(MOCK_SEDER);

  // ── governance ────────────────────────────────────────────────
  proposals      = $state<Proposal[]>([]);
  // The signed-in talmid's recorded votes, by proposal id (Firebase mode)
  private myVotes: Record<string, Proposal['myVote']> = {};
  paymentStreams  = $state<PaymentStream[]>([]);
  treasuryStats  = $state<TreasuryStats | null>(null);

  // ── UI state ──────────────────────────────────────────────────
  sidebarCollapsed = $state(false);
  currentUserId    = $state<string | null>(null);
  isAuthenticated  = $state(false);
  loading          = $state(true);
  error            = $state<string | null>(null);

  private _unsubs: Unsubscribe[] = [];

  // ── counters (in-memory mode only) ────────────────────────────
  private counters: Record<string, number> = {
    mivtza: 100, masima: 100, tafkid: 100, review: 100,
    discussion: 100, activity: 100, talmid: 100,
  };

  // JWT claims tier — set from Firebase Auth token on login, reliable even before Firestore syncs
  currentTier = $state<'enlisted' | 'nco' | 'officer'>('enlisted');

  // ── derived ───────────────────────────────────────────────────
  currentUser = $derived(this.talmidim.find(t => t.id === this.currentUserId));
  currentMakom = $derived(
    this.currentUser ? this.mekomot.find(m => m.id === this.currentUser!.makomId) : undefined
  );
  // Use JWT claim tier first (always up-to-date), fall back to Firestore doc
  isOfficer = $derived(
    this.currentTier === 'officer' ||
    (this.currentUser ? RANK_META[this.currentUser.rank]?.tier === 'officer' : false)
  );

  stats = $derived<DashboardStats>({
    activeMivtzaot:       this.mivtzaot.filter(m => m.status === 'active' || m.status === 'in_progress').length,
    openMasimot:          this.masimot.filter(m => m.status === 'open' || m.status === 'in_progress').length,
    pendingTafkidim:      this.tafkidim.filter(t => t.assigneeId === this.currentUserId && (t.status === 'todo' || t.status === 'in_progress')).length,
    pendingReviews:       this.masimot.filter(m => m.status === 'in_review').length,
    totalTmimDistributed: this.treasury.totalTmimDistributed,
    onlineTalmidim:       this.talmidim.filter(t => t.isOnline).length,
  });

  myTafkidim = $derived(this.tafkidim.filter(t => t.assigneeId === this.currentUserId));

  // Governance derived
  activeProposals = $derived(this.proposals.filter(p => p.state === 'active'));
  myUnvotedProposals = $derived(
    this.proposals.filter(p => p.state === 'active' && (p.myVote === null || p.myVote === undefined))
  );
  myVotingPower = $derived(
    this.currentUser
      ? this.currentUser.tokenBalance * (RANK_VOTING_POWER[this.currentUser.rank] ?? 1)
      : 0
  );

  networkStats = $derived({
    totalLocations:   this.mekomot.filter(m => m.status === 'active').length,
    totalChayalim:    this.talmidim.length,
    totalMivtzaot:    this.mivtzaot.filter(m => m.status !== 'draft').length,
    tmimCirculating:  this.treasury.tmimCirculating,
    totalPeerReviews: this.peerReviews.length,
  });

  // ══════════════════════════════════════════════════════════════
  // Firebase Listeners
  // ══════════════════════════════════════════════════════════════

  async startListeners(): Promise<void> {
    if (!USE_FIREBASE) {
      // No Firebase config (CI / offline dev without credentials):
      // load mock data permanently so the UI stays fully functional
      this.talmidim    = MOCK_TALMIDIM;
      this.mivtzaot    = MOCK_MIVTZAOT;
      this.masimot     = MOCK_MASIMOT;
      this.tafkidim    = MOCK_TAFKIDIM;
      this.peerReviews = MOCK_PEER_REVIEWS;
      this.discussions = MOCK_DISCUSSIONS;
      this.treasury    = MOCK_TREASURY;
      this.activities  = MOCK_ACTIVITIES;
      this.mekomot     = MOCK_MEKOMOT;
      this.currentUserId = CURRENT_USER_ID;
      this.loading = false;
      return;
    }

    // Firebase mode: show mock data as loading placeholder (replaced by first snapshot)
    this.talmidim    = MOCK_TALMIDIM;
    this.mivtzaot    = MOCK_MIVTZAOT;
    this.masimot     = MOCK_MASIMOT;
    this.tafkidim    = MOCK_TAFKIDIM;
    this.mekomot     = MOCK_MEKOMOT;
    this.treasury    = MOCK_TREASURY;

    try {
      const { db } = await import('$lib/firebase');
      const {
        collection, collectionGroup, onSnapshot, query, orderBy, limit, where,
      } = await import('firebase/firestore');

      const snap = <T>(col: string, setter: (items: T[]) => void) =>
        onSnapshot(collection(db, col), s => {
          setter(s.docs.map(d => ({ id: d.id, ...d.data() }) as T));
        }, err => {
          console.error(`Firestore error [${col}]:`, err);
          this.error = `שגיאת חיבור: ${err.message}`;
        });

      this._unsubs.push(
        snap<Talmid>('talmidim',   v => { this.talmidim   = v; }),
        snap<Makom>('mekomot',     v => { this.mekomot    = v; }),
        snap<Mivtza>('mivtzaot',   v => { this.mivtzaot   = v; }),
        snap<Masima>('masimot',    v => { this.masimot    = v; }),
        snap<Tafkid>('tafkidim',   v => { this.tafkidim   = v; }),
        snap<PeerReview>('peerReviews', v => { this.peerReviews = v; }),
        snap<Discussion>('discussions', v => { this.discussions  = v; }),
        onSnapshot(collection(db, 'proposals'), s => {
          this.proposals = s.docs.map(d => {
            const data = d.data();
            return { id: d.id, ...data, type: data['type'] ?? 'signal', myVote: this.myVotes[d.id] ?? null } as Proposal;
          });
        }, err => {
          console.error('Firestore error [proposals]:', err);
          this.error = `שגיאת חיבור: ${err.message}`;
        }),
        snap<PaymentStream>('paymentStreams', v => { this.paymentStreams = v; }),

        onSnapshot(
          query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(50)),
          s => { this.activities = s.docs.map(d => ({ id: d.id, ...d.data() }) as Activity); }
        ),

        onSnapshot(
          collection(db, 'treasury'),
          s => {
            const doc = s.docs.find(d => d.id === 'global');
            if (doc) {
              this.treasury      = doc.data() as Treasury;
              this.treasuryStats = doc.data() as TreasuryStats;
            }
          }
        ),
      );

      // Votes are keyed by wallet address; auth uids are `wallet_<address>`.
      const myWallet = this.currentUserId?.startsWith('wallet_') ? this.currentUserId.slice('wallet_'.length) : null;
      if (myWallet) {
        this._unsubs.push(onSnapshot(
          query(collectionGroup(db, 'votes'), where('walletAddress', '==', myWallet)),
          s => {
            this.myVotes = Object.fromEntries(
              s.docs.map(d => [d.ref.parent.parent!.id, d.get('vote') as Proposal['myVote']]),
            );
            this.proposals = this.proposals.map(p => ({ ...p, myVote: this.myVotes[p.id] ?? null }));
          },
          err => console.error('Firestore error [votes]:', err),
        ));
      }

      this.loading = false;
    } catch (e) {
      console.error('startListeners error:', e);
      this.error = 'שגיאה בהפעלת Firestore';
      // Fall back to mock data
      this.talmidim    = MOCK_TALMIDIM;
      this.mivtzaot    = MOCK_MIVTZAOT;
      this.masimot     = MOCK_MASIMOT;
      this.tafkidim    = MOCK_TAFKIDIM;
      this.loading = false;
    }
  }

  stopListeners(): void {
    this._unsubs.forEach(u => u());
    this._unsubs = [];
    // Clear live data but keep UI blank — user is signed out
    this.talmidim    = [];
    this.mivtzaot    = [];
    this.masimot     = [];
    this.tafkidim    = [];
    this.peerReviews = [];
    this.discussions = [];
    this.activities     = [];
    this.proposals      = [];
    this.myVotes        = {};
    this.paymentStreams  = [];
    this.treasuryStats  = null;
    this.currentUserId = null;
    this.loading = false; // don't show spinner on sign-out
  }

  // ══════════════════════════════════════════════════════════════
  // Auth Helper — wraps fetch with Firebase ID token
  // ══════════════════════════════════════════════════════════════

  private async authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    let token: string | null = null;
    if (USE_FIREBASE) {
      const { auth } = await import('$lib/firebase');
      token = (await auth.currentUser?.getIdToken()) ?? null;
    }
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
  }

  // ══════════════════════════════════════════════════════════════
  // Internal helpers (in-memory mode)
  // ══════════════════════════════════════════════════════════════

  private nextId(prefix: string): string {
    this.counters[prefix] = (this.counters[prefix] || 0) + 1;
    return `${prefix}-${String(this.counters[prefix]).padStart(3, '0')}`;
  }

  private logActivity(
    type: ActivityType,
    actorId: string,
    targetId: string,
    targetTitle: string,
    description: string,
  ): void {
    const actor = this.getTalmid(actorId);
    const a: Activity = {
      id: this.nextId('activity'),
      type,
      actorId,
      actorShem: actor?.shem ?? 'מערכת',
      targetId,
      targetTitle,
      description,
      timestamp: now(),
      metadata: {},
    };
    this.activities = [a, ...this.activities];
  }

  private awardTokens(talmidId: string, base: number): number {
    const t = this.getTalmid(talmidId);
    if (!t) return 0;
    const multiplier = RANK_META[t.rank].multiplier;
    const amount = Math.round(base * multiplier);
    const idx = this.talmidim.findIndex(x => x.id === talmidId);
    if (idx >= 0) {
      this.talmidim[idx] = {
        ...this.talmidim[idx],
        tokenBalance:      this.talmidim[idx].tokenBalance + amount,
        totalTokensEarned: this.talmidim[idx].totalTokensEarned + amount,
      };
    }
    this.treasury = {
      ...this.treasury,
      totalTmimDistributed: this.treasury.totalTmimDistributed + amount,
      tmimCirculating:      this.treasury.tmimCirculating + amount,
    };
    return amount;
  }

  // ══════════════════════════════════════════════════════════════
  // Query helpers
  // ══════════════════════════════════════════════════════════════

  getTalmid(id: string): Talmid | undefined       { return this.talmidim.find(t => t.id === id); }
  getGroup(id: string): ShiurGroup | undefined    { return this.groups.find(g => g.id === id); }
  getMakom(id: string): Makom | undefined         { return this.mekomot.find(m => m.id === id); }
  getMivtza(id: string): Mivtza | undefined       { return this.mivtzaot.find(m => m.id === id); }
  getMasima(id: string): Masima | undefined       { return this.masimot.find(m => m.id === id); }
  getTafkid(id: string): Tafkid | undefined       { return this.tafkidim.find(t => t.id === id); }

  getMivtzaMasimot(mivtzaId: string): Masima[]      { return this.masimot.filter(m => m.mivtzaId === mivtzaId); }
  getMasimaTafkidim(masimaId: string): Tafkid[]     { return this.tafkidim.filter(t => t.masimaId === masimaId); }
  getMivtzaTafkidim(mivtzaId: string): Tafkid[]     { return this.tafkidim.filter(t => t.mivtzaId === mivtzaId); }
  getMasimaPeerReviews(masimaId: string): PeerReview[] { return this.peerReviews.filter(pr => pr.masimaId === masimaId); }
  getMasimaDiscussions(masimaId: string): Discussion[] { return this.discussions.filter(d => d.masimaId === masimaId); }
  getMakomTalmidim(makomId: string): Talmid[]       { return this.talmidim.filter(t => t.makomId === makomId); }

  getMivtzaEnrolled(mivtzaId: string): Talmid[] {
    const mivtza = this.getMivtza(mivtzaId);
    if (!mivtza) return [];
    return mivtza.enrolledIds.map(id => this.getTalmid(id)).filter(Boolean) as Talmid[];
  }

  getTalmidMivtzaot(talmidId: string): Mivtza[] {
    return this.mivtzaot.filter(m => m.enrolledIds.includes(talmidId));
  }

  getMivtzaProgress(mivtzaId: string): number {
    const masimot = this.getMivtzaMasimot(mivtzaId);
    if (masimot.length === 0) return 0;
    const done = masimot.filter(m => m.status === 'approved' || m.status === 'published').length;
    return Math.round((done / masimot.length) * 100);
  }

  getMasimaProgress(masimaId: string): number {
    const tafkidim = this.getMasimaTafkidim(masimaId);
    if (tafkidim.length === 0) return 0;
    const done = tafkidim.filter(t => t.status === 'approved').length;
    return Math.round((done / tafkidim.length) * 100);
  }

  // ══════════════════════════════════════════════════════════════
  // CRUD — Mivtzaot
  // ══════════════════════════════════════════════════════════════

  async addMivtza(data: Omit<Mivtza, 'id' | 'createdAt' | 'updatedAt' | 'tokensUsed' | 'masimotCount' | 'enrolledIds'>): Promise<Mivtza> {
    if (USE_FIREBASE) {
      const res = await this.authFetch('/api/mivtzaot', { method: 'POST', body: JSON.stringify(data) });
      if (!res.ok) { toast.error(await res.text()); throw new Error('addMivtza failed'); }
      const mivtza = await res.json();
      toast.success(`מבצע "${data.shem}" נוצר בהצלחה`);
      return mivtza;
    }
    // In-memory fallback
    const id = this.nextId('mivtza');
    const mivtza: Mivtza = {
      ...data, id, tokensUsed: 0, masimotCount: 0,
      enrolledIds: data.creatorId ? [data.creatorId] : [],
      createdAt: now(), updatedAt: now(),
    };
    this.mivtzaot = [...this.mivtzaot, mivtza];
    this.logActivity('mivtza_created', data.creatorId, id, data.shem, 'יצר מבצע חדש');
    toast.success(`מבצע "${data.shem}" נוצר בהצלחה`);
    return mivtza;
  }

  async updateMivtza(id: string, data: Partial<Mivtza>): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/mivtzaot/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      if (!res.ok) { toast.error(await res.text()); return; }
      toast.success('המבצע עודכן');
      return;
    }
    const idx = this.mivtzaot.findIndex(m => m.id === id);
    if (idx < 0) { toast.error('מבצע לא נמצא'); return; }
    this.mivtzaot[idx] = { ...this.mivtzaot[idx], ...data, updatedAt: now() };
    toast.success('המבצע עודכן');
  }

  async deleteMivtza(id: string): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/mivtzaot/${id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error(await res.text()); return; }
      toast.success('המבצע נמחק');
      return;
    }
    const mivtza = this.getMivtza(id);
    if (!mivtza) return;
    const masimotIds = this.getMivtzaMasimot(id).map(m => m.id);
    this.tafkidim   = this.tafkidim.filter(t => !masimotIds.includes(t.masimaId));
    this.peerReviews = this.peerReviews.filter(pr => !masimotIds.includes(pr.masimaId));
    this.discussions = this.discussions.filter(d => !masimotIds.includes(d.masimaId));
    this.masimot    = this.masimot.filter(m => m.mivtzaId !== id);
    this.mivtzaot   = this.mivtzaot.filter(m => m.id !== id);
    toast.success(`מבצע "${mivtza.shem}" נמחק`);
  }

  // ══════════════════════════════════════════════════════════════
  // CRUD — Masimot
  // ══════════════════════════════════════════════════════════════

  async addMasima(data: Omit<Masima, 'id' | 'createdAt' | 'updatedAt' | 'tafkidimCount' | 'reviewCount' | 'averageRating'>): Promise<Masima> {
    if (USE_FIREBASE) {
      const res = await this.authFetch('/api/masimot', { method: 'POST', body: JSON.stringify(data) });
      if (!res.ok) { toast.error(await res.text()); throw new Error('addMasima failed'); }
      const masima = await res.json();
      toast.success(`משימה "${data.shem}" נוצרה`);
      return masima;
    }
    const id = this.nextId('masima');
    const masima: Masima = { ...data, id, tafkidimCount: 0, reviewCount: 0, createdAt: now(), updatedAt: now() };
    this.masimot = [...this.masimot, masima];
    const mIdx = this.mivtzaot.findIndex(m => m.id === data.mivtzaId);
    if (mIdx >= 0) this.mivtzaot[mIdx] = { ...this.mivtzaot[mIdx], masimotCount: this.mivtzaot[mIdx].masimotCount + 1, updatedAt: now() };
    this.logActivity('masima_opened', this.currentUserId ?? '', id, data.shem, 'פתח משימה חדשה');
    toast.success(`משימה "${data.shem}" נוצרה`);
    return masima;
  }

  async updateMasima(id: string, data: Partial<Masima>): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/masimot/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      if (!res.ok) { toast.error(await res.text()); return; }
      return;
    }
    const idx = this.masimot.findIndex(m => m.id === id);
    if (idx < 0) { toast.error('משימה לא נמצאה'); return; }
    this.masimot[idx] = { ...this.masimot[idx], ...data, updatedAt: now() };
  }

  async assignMasima(id: string, talmidId: string, role: 'assignee' | 'reviewer' = 'assignee'): Promise<void> {
    const field = role === 'assignee' ? 'assigneeId' : 'reviewerId';
    await this.updateMasima(id, { [field]: talmidId } as Partial<Masima>);
    const name = this.getTalmid(talmidId)?.shem ?? talmidId;
    toast.success(role === 'assignee' ? `שוייך ל${name}` : `מבקר עמיתים: ${name}`);
  }

  async deleteMasima(id: string): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/masimot/${id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error(await res.text()); return; }
      toast.success('המשימה נמחקה');
      return;
    }
    const masima = this.getMasima(id);
    if (!masima) return;
    this.tafkidim   = this.tafkidim.filter(t => t.masimaId !== id);
    this.peerReviews = this.peerReviews.filter(pr => pr.masimaId !== id);
    this.discussions = this.discussions.filter(d => d.masimaId !== id);
    this.masimot    = this.masimot.filter(m => m.id !== id);
    const mIdx = this.mivtzaot.findIndex(m => m.id === masima.mivtzaId);
    if (mIdx >= 0) this.mivtzaot[mIdx] = { ...this.mivtzaot[mIdx], masimotCount: Math.max(0, this.mivtzaot[mIdx].masimotCount - 1), updatedAt: now() };
    toast.success(`משימה "${masima.shem}" נמחקה`);
  }

  // ── state machine — Masimot ───────────────────────────────────

  async startMasima(id: string): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/masimot/${id}/start`, { method: 'POST' });
      if (!res.ok) { toast.error(await res.text()); return; }
      return;
    }
    const m = this.getMasima(id);
    if (!m || m.status !== 'open') { toast.error('לא ניתן להתחיל משימה זו'); return; }
    await this.updateMasima(id, { status: 'in_progress' as MasimaStatus });
    toast.success(`התחלת עבודה על "${m.shem}"`);
  }

  async submitMasima(id: string, contentUrl?: string): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/masimot/${id}/submit`, { method: 'POST', body: JSON.stringify({ contentUrl }) });
      if (!res.ok) { toast.error(await res.text()); return; }
      toast.success('המשימה הוגשה לביקורת');
      return;
    }
    const m = this.getMasima(id);
    if (!m || (m.status !== 'in_progress' && m.status !== 'revision_requested')) { toast.error('לא ניתן להגיש משימה זו'); return; }
    const idx = this.masimot.findIndex(x => x.id === id);
    this.masimot[idx] = { ...this.masimot[idx], status: 'submitted' as MasimaStatus, contentUrl: contentUrl ?? this.masimot[idx].contentUrl, updatedAt: now() };
    this.logActivity('masima_completed', this.currentUserId ?? '', id, m.shem, 'הגיש משימה');
    toast.success(`משימה "${m.shem}" הוגשה לביקורת`);
  }

  async startReviewMasima(id: string): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/masimot/${id}/review/start`, { method: 'POST' });
      if (!res.ok) { toast.error(await res.text()); return; }
      return;
    }
    const m = this.getMasima(id);
    if (!m || m.status !== 'submitted') { toast.error('לא ניתן להתחיל ביקורת'); return; }
    const idx = this.masimot.findIndex(x => x.id === id);
    this.masimot[idx] = { ...this.masimot[idx], status: 'in_review' as MasimaStatus, updatedAt: now() };
    toast.info(`ביקורת התחילה: "${m.shem}"`);
  }

  async approveMasima(id: string): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/masimot/${id}/review/approve`, { method: 'POST' });
      if (!res.ok) { toast.error(await res.text()); return; }
      const data = await res.json();
      toast.success(
        'המשימה אושרה ✓ TMIM נשלחו',
        data.txUrl ? { label: 'צפה בעסקה על Base Sepolia ↗', href: data.txUrl } : undefined,
        5000,
      );
      return;
    }
    const m = this.getMasima(id);
    if (!m || m.status !== 'in_review') { toast.error('לא ניתן לאשר משימה זו'); return; }
    const idx = this.masimot.findIndex(x => x.id === id);
    this.masimot[idx] = { ...this.masimot[idx], status: 'approved' as MasimaStatus, updatedAt: now() };
    if (m.assigneeId) {
      const awarded = this.awardTokens(m.assigneeId, m.tokenAllocation);
      this.logActivity('tmim_distributed', this.currentUserId ?? '', id, m.shem, `חולקו ${awarded} TMIM`);
    }
    this.logActivity('masima_completed', this.currentUserId ?? '', id, m.shem, 'אישר משימה');
    toast.success(`משימה "${m.shem}" אושרה`);
  }

  async requestRevisionMasima(id: string, notes?: string): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/masimot/${id}/review/revision`, { method: 'POST', body: JSON.stringify({ notes }) });
      if (!res.ok) { toast.error(await res.text()); return; }
      toast.info('בוקש תיקון');
      return;
    }
    const m = this.getMasima(id);
    if (!m || m.status !== 'in_review') { toast.error('לא ניתן לבקש תיקון'); return; }
    const idx = this.masimot.findIndex(x => x.id === id);
    this.masimot[idx] = { ...this.masimot[idx], status: 'revision_requested' as MasimaStatus, submissionNotes: notes ?? this.masimot[idx].submissionNotes, updatedAt: now() };
    toast.info(`בוקש תיקון: "${m.shem}"`);
  }

  async publishMasima(id: string): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/masimot/${id}/publish`, { method: 'POST' });
      if (!res.ok) { toast.error(await res.text()); return; }
      toast.success('פורסם!');
      return;
    }
    const m = this.getMasima(id);
    if (!m || m.status !== 'approved') { toast.error('לא ניתן לפרסם משימה זו'); return; }
    const idx = this.masimot.findIndex(x => x.id === id);
    this.masimot[idx] = { ...this.masimot[idx], status: 'published' as MasimaStatus, updatedAt: now() };
    if (m.assigneeId) {
      const tIdx = this.talmidim.findIndex(t => t.id === m.assigneeId);
      if (tIdx >= 0) this.talmidim[tIdx] = { ...this.talmidim[tIdx], papersPublished: this.talmidim[tIdx].papersPublished + 1 };
    }
    this.logActivity('paper_published', this.currentUserId ?? '', id, m.shem, 'פרסם משימה');
    toast.success(`"${m.shem}" פורסם!`);
  }

  // ══════════════════════════════════════════════════════════════
  // CRUD — Tafkidim
  // ══════════════════════════════════════════════════════════════

  async addTafkid(data: Omit<Tafkid, 'id' | 'createdAt'>): Promise<Tafkid> {
    if (USE_FIREBASE) {
      const res = await this.authFetch('/api/tafkidim', { method: 'POST', body: JSON.stringify(data) });
      if (!res.ok) { toast.error(await res.text()); throw new Error('addTafkid failed'); }
      const tafkid = await res.json();
      toast.success(`תפקיד "${data.shem}" נוצר`);
      return tafkid;
    }
    const id = this.nextId('tafkid');
    const tafkid: Tafkid = { ...data, id, createdAt: now() };
    this.tafkidim = [...this.tafkidim, tafkid];
    const mIdx = this.masimot.findIndex(m => m.id === data.masimaId);
    if (mIdx >= 0) this.masimot[mIdx] = { ...this.masimot[mIdx], tafkidimCount: this.masimot[mIdx].tafkidimCount + 1, updatedAt: now() };
    toast.success(`תפקיד "${data.shem}" נוצר`);
    return tafkid;
  }

  async updateTafkid(id: string, data: Partial<Tafkid>): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/tafkidim/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      if (!res.ok) { toast.error(await res.text()); return; }
      return;
    }
    const idx = this.tafkidim.findIndex(t => t.id === id);
    if (idx < 0) { toast.error('תפקיד לא נמצא'); return; }
    this.tafkidim[idx] = { ...this.tafkidim[idx], ...data };
  }

  async deleteTafkid(id: string): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/tafkidim/${id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error(await res.text()); return; }
      toast.success('התפקיד נמחק');
      return;
    }
    const t = this.getTafkid(id);
    if (!t) return;
    this.tafkidim = this.tafkidim.filter(x => x.id !== id);
    const mIdx = this.masimot.findIndex(m => m.id === t.masimaId);
    if (mIdx >= 0) this.masimot[mIdx] = { ...this.masimot[mIdx], tafkidimCount: Math.max(0, this.masimot[mIdx].tafkidimCount - 1), updatedAt: now() };
    toast.success(`תפקיד "${t.shem}" נמחק`);
  }

  // ── state machine — Tafkidim ──────────────────────────────────

  async startTafkid(id: string): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/tafkidim/${id}/start`, { method: 'POST' });
      if (!res.ok) { toast.error(await res.text()); return; }
      return;
    }
    const t = this.getTafkid(id);
    if (!t || t.status !== 'todo') { toast.error('לא ניתן להתחיל תפקיד זה'); return; }
    const idx = this.tafkidim.findIndex(x => x.id === id);
    this.tafkidim[idx] = { ...t, status: 'in_progress' as TafkidStatus };
    toast.success(`התחלת "${t.shem}"`);
  }

  async submitTafkid(id: string, notes?: string): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/tafkidim/${id}/submit`, { method: 'POST', body: JSON.stringify({ notes }) });
      if (!res.ok) { toast.error(await res.text()); return; }
      toast.success('הוגש');
      return;
    }
    const t = this.getTafkid(id);
    if (!t || t.status !== 'in_progress') { toast.error('לא ניתן להגיש תפקיד זה'); return; }
    const idx = this.tafkidim.findIndex(x => x.id === id);
    this.tafkidim[idx] = { ...t, status: 'submitted' as TafkidStatus, submissionNotes: notes ?? t.submissionNotes };
    this.logActivity('tafkid_submitted', this.currentUserId ?? '', id, t.shem, 'הגיש תפקיד');
    toast.success(`"${t.shem}" הוגש`);
  }

  async approveTafkid(id: string): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/tafkidim/${id}/approve`, { method: 'POST' });
      if (!res.ok) { toast.error(await res.text()); return; }
      const data = await res.json();
      toast.success(
        'התפקיד אושר ✓ TMIM נשלחו',
        data.txUrl ? { label: 'צפה בעסקה על Base Sepolia ↗', href: data.txUrl } : undefined,
        5000,
      );
      return;
    }
    const t = this.getTafkid(id);
    if (!t || t.status !== 'submitted') { toast.error('לא ניתן לאשר תפקיד זה'); return; }
    const idx = this.tafkidim.findIndex(x => x.id === id);
    this.tafkidim[idx] = { ...t, status: 'approved' as TafkidStatus };
    if (t.assigneeId) {
      const awarded = this.awardTokens(t.assigneeId, t.tokenReward);
      this.logActivity('tmim_distributed', this.currentUserId ?? '', id, t.shem, `חולקו ${awarded} TMIM`);
      const tIdx = this.talmidim.findIndex(x => x.id === t.assigneeId);
      if (tIdx >= 0) this.talmidim[tIdx] = { ...this.talmidim[tIdx], tafkidimCompleted: this.talmidim[tIdx].tafkidimCompleted + 1 };
    }
    this.logActivity('tafkid_completed', this.currentUserId ?? '', id, t.shem, 'אישר תפקיד');
    toast.success(`תפקיד "${t.shem}" אושר`);
  }

  async rejectTafkid(id: string): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/tafkidim/${id}/reject`, { method: 'POST' });
      if (!res.ok) { toast.error(await res.text()); return; }
      toast.info('הוחזר לביצוע');
      return;
    }
    const t = this.getTafkid(id);
    if (!t || t.status !== 'submitted') { toast.error('לא ניתן לדחות תפקיד זה'); return; }
    const idx = this.tafkidim.findIndex(x => x.id === id);
    this.tafkidim[idx] = { ...t, status: 'todo' as TafkidStatus };
    toast.info(`"${t.shem}" הוחזר לביצוע`);
  }

  // ══════════════════════════════════════════════════════════════
  // Talmidim
  // ══════════════════════════════════════════════════════════════

  async addTalmid(data: Omit<Talmid, 'id'>): Promise<Talmid> {
    if (USE_FIREBASE) {
      const res = await this.authFetch('/api/talmidim', { method: 'POST', body: JSON.stringify(data) });
      if (!res.ok) { toast.error(await res.text()); throw new Error('addTalmid failed'); }
      return res.json();
    }
    const id = this.nextId('talmid');
    const talmid: Talmid = { ...data, id };
    this.talmidim = [...this.talmidim, talmid];
    this.logActivity('talmid_enrolled', this.currentUserId ?? '', id, data.shem, 'חייל חדש הצטרף');
    toast.success(`${data.shem} הצטרף למערכת`);
    return talmid;
  }

  async updateTalmid(id: string, data: Partial<Talmid>): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/talmidim/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      if (!res.ok) { toast.error(await res.text()); return; }
      toast.success('הפרופיל עודכן');
      return;
    }
    const idx = this.talmidim.findIndex(t => t.id === id);
    if (idx < 0) { toast.error('חייל לא נמצא'); return; }
    this.talmidim[idx] = { ...this.talmidim[idx], ...data };
    toast.success('הפרופיל עודכן');
  }

  async promoteTalmid(id: string): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/talmidim/${id}/promote`, { method: 'POST' });
      if (!res.ok) { toast.error(await res.text()); return; }
      toast.success('קודם בהצלחה!');
      return;
    }
    const t = this.getTalmid(id);
    if (!t) { toast.error('חייל לא נמצא'); return; }
    const rankIdx = RANKS.indexOf(t.rank);
    if (rankIdx >= RANKS.length - 1) { toast.error('כבר בדרגה הגבוהה ביותר'); return; }
    const newRank = RANKS[rankIdx + 1] as Rank;
    const idx = this.talmidim.findIndex(x => x.id === id);
    this.talmidim[idx] = { ...this.talmidim[idx], rank: newRank };
    this.logActivity('talmid_promoted', this.currentUserId ?? '', id, t.shem, `קודם ל${RANK_META[newRank].shem}`);
    toast.success(`${t.shem} קודם ל${RANK_META[newRank].shem}!`);
  }

  // ══════════════════════════════════════════════════════════════
  // Enroll / Unenroll
  // ══════════════════════════════════════════════════════════════

  async enrollInMivtza(talmidId: string, mivtzaId: string): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/mivtzaot/${mivtzaId}/enroll`, { method: 'POST', body: JSON.stringify({ talmidId }) });
      if (!res.ok) { toast.error(await res.text()); return; }
      toast.success('נרשמת למבצע');
      return;
    }
    const idx = this.mivtzaot.findIndex(m => m.id === mivtzaId);
    if (idx < 0) { toast.error('מבצע לא נמצא'); return; }
    const mivtza = this.mivtzaot[idx];
    if (mivtza.enrolledIds.includes(talmidId)) { toast.info('כבר רשום למבצע זה'); return; }
    this.mivtzaot[idx] = { ...mivtza, enrolledIds: [...mivtza.enrolledIds, talmidId], updatedAt: now() };
    const talmid = this.getTalmid(talmidId);
    this.logActivity('talmid_enrolled', talmidId, mivtzaId, mivtza.shem, 'הצטרף למבצע');
    toast.success(`${talmid?.shem ?? 'חייל'} הצטרף ל"${mivtza.shem}"`);
  }

  async unenrollFromMivtza(talmidId: string, mivtzaId: string): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/mivtzaot/${mivtzaId}/unenroll`, { method: 'POST', body: JSON.stringify({ talmidId }) });
      if (!res.ok) { toast.error(await res.text()); return; }
      toast.success('יצאת מהמבצע');
      return;
    }
    const idx = this.mivtzaot.findIndex(m => m.id === mivtzaId);
    if (idx < 0) return;
    const mivtza = this.mivtzaot[idx];
    this.mivtzaot[idx] = { ...mivtza, enrolledIds: mivtza.enrolledIds.filter(id => id !== talmidId), updatedAt: now() };
    toast.success('יצאת מהמבצע');
  }

  // ══════════════════════════════════════════════════════════════
  // Mivtza Applications (publication contribution requests)
  // ══════════════════════════════════════════════════════════════

  async addMivtzaApplication(mivtzaId: string, statement: string): Promise<{ id: string; status: string }> {
    const res = await this.authFetch(`/api/mivtzaot/${mivtzaId}/applications`, {
      method: 'POST',
      body: JSON.stringify({ statement }),
    });
    if (!res.ok) { const msg = await res.text(); toast.error(msg); throw new Error(msg); }
    toast.success('הבקשה נשלחה — ממתין לאישור המשפיע');
    return res.json();
  }

  // ══════════════════════════════════════════════════════════════
  // Peer Reviews
  // ══════════════════════════════════════════════════════════════

  async addPeerReview(data: Omit<PeerReview, 'id' | 'createdAt'>): Promise<PeerReview> {
    if (USE_FIREBASE) {
      const res = await this.authFetch('/api/reviews', { method: 'POST', body: JSON.stringify(data) });
      if (!res.ok) { toast.error(await res.text()); throw new Error('addPeerReview failed'); }
      toast.success('ביקורת הוגשה בהצלחה');
      return res.json();
    }
    const id = this.nextId('review');
    const review: PeerReview = { ...data, id, createdAt: now() };
    this.peerReviews = [...this.peerReviews, review];
    const mIdx = this.masimot.findIndex(m => m.id === data.masimaId);
    if (mIdx >= 0) {
      const allReviews = this.getMasimaPeerReviews(data.masimaId);
      this.masimot[mIdx] = {
        ...this.masimot[mIdx],
        reviewCount: allReviews.length,
        averageRating: allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length,
        updatedAt: now(),
      };
    }
    if (data.tokensEarned > 0) this.awardTokens(data.reviewerId, data.tokensEarned);
    const rIdx = this.talmidim.findIndex(t => t.id === data.reviewerId);
    if (rIdx >= 0) this.talmidim[rIdx] = { ...this.talmidim[rIdx], peerReviewsGiven: this.talmidim[rIdx].peerReviewsGiven + 1 };
    const aIdx = this.talmidim.findIndex(t => t.id === data.authorId);
    if (aIdx >= 0) this.talmidim[aIdx] = { ...this.talmidim[aIdx], peerReviewsReceived: this.talmidim[aIdx].peerReviewsReceived + 1 };
    this.logActivity('peer_review_submitted', data.reviewerId, data.masimaId, this.getMasima(data.masimaId)?.shem ?? '', 'הגיש ביקורת עמיתים');
    toast.success('ביקורת הוגשה בהצלחה');
    return review;
  }

  async acknowledgePeerReview(id: string): Promise<void> {
    if (USE_FIREBASE) {
      const res = await this.authFetch(`/api/reviews/${id}/acknowledge`, { method: 'POST' });
      if (!res.ok) { toast.error(await res.text()); return; }
      return;
    }
    const idx = this.peerReviews.findIndex(r => r.id === id);
    if (idx < 0) return;
    this.peerReviews[idx] = { ...this.peerReviews[idx], status: 'acknowledged' };
    toast.success('הביקורת נלקחה בחשבון');
  }

  // ══════════════════════════════════════════════════════════════
  // Discussions
  // ══════════════════════════════════════════════════════════════

  async addDiscussion(data: Omit<Discussion, 'id' | 'createdAt'>): Promise<Discussion> {
    if (USE_FIREBASE) {
      const res = await this.authFetch('/api/discussions', { method: 'POST', body: JSON.stringify(data) });
      if (!res.ok) { toast.error(await res.text()); throw new Error('addDiscussion failed'); }
      toast.success('תגובה נוספה');
      return res.json();
    }
    const id = this.nextId('discussion');
    const disc: Discussion = { ...data, id, createdAt: now() };
    this.discussions = [...this.discussions, disc];
    if (data.tokensEarned > 0) this.awardTokens(data.authorId, data.tokensEarned);
    toast.success('תגובה נוספה');
    return disc;
  }

  // ══════════════════════════════════════════════════════════════
  // UI actions
  // ══════════════════════════════════════════════════════════════

  toggleSidebar(): void { this.sidebarCollapsed = !this.sidebarCollapsed; }

  switchUser(id: string): void { this.currentUserId = id; }

  // ══════════════════════════════════════════════════════════════
  // Auth — wallet connection (SIWE)
  // ══════════════════════════════════════════════════════════════

  async connectWallet(): Promise<string | null> {
    if (USE_FIREBASE && typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const { BrowserProvider } = await import('ethers');
        const { signInWithCustomToken } = await import('firebase/auth');
        const { auth } = await import('$lib/firebase');

        const provider = new BrowserProvider((window as any).ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        const walletAddress: string = accounts[0];

        // 1. Get nonce from server
        const nonceRes = await fetch('/api/auth/nonce', {
          method: 'POST',
          body: JSON.stringify({ walletAddress }),
          headers: { 'Content-Type': 'application/json' },
        });
        if (!nonceRes.ok) { toast.error('שגיאה בקבלת nonce'); return null; }
        const { nonce } = await nonceRes.json();

        // 2. Sign nonce with wallet
        const signer = await provider.getSigner();
        const signature = await signer.signMessage(nonce);

        // 3. Verify + get custom token
        const verifyRes = await fetch('/api/auth/verify', {
          method: 'POST',
          body: JSON.stringify({ walletAddress, signature }),
          headers: { 'Content-Type': 'application/json' },
        });
        if (!verifyRes.ok) { toast.error('אימות נכשל'); return null; }
        const { customToken } = await verifyRes.json();

        // 4. Sign in with Firebase custom token
        await signInWithCustomToken(auth, customToken);

        return walletAddress;
      } catch (e: any) {
        toast.error(e?.message ?? 'שגיאת חיבור ארנק');
        return null;
      }
    }

    // Mock wallet for dev (no Firebase or no MetaMask)
    const mockAddress = '0x' + Array.from(
      { length: 40 },
      () => Math.floor(Math.random() * 16).toString(16),
    ).join('');
    return mockAddress;
  }

  async signUp(shem: string, walletAddress: string, makomId: string, track: LearningTrack): Promise<void> {
    if (USE_FIREBASE) {
      const { auth } = await import('$lib/firebase');
      const talmidData = {
        shem, walletAddress: walletAddress.toLowerCase(), makomId, track,
        rank: 'turai', tier: 'enlisted',
        tokenBalance: 50, totalTokensEarned: 50,
        peerReviewsGiven: 0, peerReviewsReceived: 0, papersPublished: 0,
        votingPower: 1, tafkidimCompleted: 0,
        chavrusaId: null, shiurGroupId: null, zalId: null, avatarUrl: null,
        nirashemAt: now(), isOnline: true,
      };
      const res = await this.authFetch('/api/talmidim', { method: 'POST', body: JSON.stringify(talmidData) });
      if (!res.ok) { toast.error('שגיאה ביצירת פרופיל'); return; }
      const talmid = await res.json();
      this.currentUserId = talmid.id ?? auth.currentUser?.uid;
      this.isAuthenticated = true;
      toast.success(`ברוך הבא, ${shem}! קיבלת 50 TMIM כבונוס הצטרפות`);
      return;
    }

    // In-memory fallback
    const talmid = await this.addTalmid({
      shem, rank: 'turai', track, makomId,
      walletAddress, tokenBalance: 50, totalTokensEarned: 50,
      peerReviewsGiven: 0, peerReviewsReceived: 0, papersPublished: 0,
      votingPower: 1, tafkidimCompleted: 0,
      chavrusaId: null, shiurGroupId: null, zalId: null, avatarUrl: null,
      nirashemAt: now(), isOnline: true,
    });
    this.currentUserId = talmid.id;
    this.isAuthenticated = true;
    const localMivtza = this.mivtzaot.find(m => m.locationId === makomId && m.status === 'active');
    if (localMivtza) await this.enrollInMivtza(talmid.id, localMivtza.id);
    toast.success(`ברוך הבא, ${shem}! קיבלת 50 TMIM כבונוס הצטרפות`);
  }

  // ══════════════════════════════════════════════════════════════
  // Governance
  // ══════════════════════════════════════════════════════════════

  async castVote(proposalId: string, vote: 'for' | 'against' | 'abstain'): Promise<void> {
    if (!this.currentUser) { toast.error('יש להתחבר כדי להצביע'); return; }
    if (USE_FIREBASE) {
      // Votes are cast on-chain from the talmid's wallet; Firestore only
      // records what the chain confirmed.
      const proposal = this.proposals.find(p => p.id === proposalId);
      if (!proposal) { toast.error('הצעה לא נמצאה'); return; }
      const onChainId = proposal.onChainProposalId;
      if (!onChainId) { toast.error('ההצעה עדיין לא נרשמה ברשת'); return; }

      const ethereum = typeof window !== 'undefined'
        ? (window as unknown as { ethereum?: Eip1193Provider }).ethereum
        : undefined;
      if (!ethereum) { toast.error('כדי להצביע נדרש ארנק בדפדפן (MetaMask או דומה)'); return; }

      // Step 1: fetch a fresh EIP-712 rank attestation bound to this proposal.
      const attRes = await this.authFetch('/api/governance/attestation', {
        method: 'POST',
        body: JSON.stringify({ proposalId: onChainId }),
      });
      if (!attRes.ok) { toast.error(await attRes.text()); return; }
      const attestation = await attRes.json();

      // Step 2: cast the vote on-chain.
      // support: 0=For, 1=Against, 2=Abstain (mirrors ChayoleiGovernance.castVote)
      const supportMap: Record<string, number> = { for: 0, against: 1, abstain: 2 };
      let txHash: string;
      try {
        const { BrowserProvider, Contract } = await import('ethers');
        const signer = await new BrowserProvider(ethereum).getSigner();
        const GOVERNANCE_ABI = [
          'function castVote(uint256 proposalId, uint8 support, tuple(address voter, uint8 rankIndex, uint256 proposalId, uint256 nonce, uint256 expiry, bytes signature) att) external',
        ];
        const gov = new Contract(
          import.meta.env.VITE_GOVERNANCE_ADDRESS as string,
          GOVERNANCE_ABI,
          signer,
        );
        const att = [
          attestation.voter,
          attestation.rankIndex,
          BigInt(attestation.proposalId),
          BigInt(attestation.nonce),
          attestation.expiry,
          attestation.signature,
        ];
        const tx = await gov.castVote(BigInt(onChainId), supportMap[vote], att);
        toast.info('ממתין לאישור הרשת…');
        const receipt = await tx.wait();
        txHash = receipt?.hash ?? tx.hash;
      } catch (e: unknown) {
        const err = e as { code?: string; shortMessage?: string; message?: string };
        if (err.code === 'ACTION_REJECTED') {
          toast.error('ההצבעה בוטלה על ידי המשתמש');
        } else {
          // Nothing reached the chain, so nothing is recorded.
          console.error('[castVote] on-chain vote failed:', e);
          toast.error(`ההצבעה נכשלה ברשת: ${err.shortMessage ?? err.message ?? e}`);
        }
        return;
      }

      // The vote is on-chain from here on; show it as cast whatever the
      // endpoint says, since the chain listener records it regardless.
      this.myVotes = { ...this.myVotes, [proposalId]: vote };
      this.proposals = this.proposals.map(p => p.id === proposalId ? { ...p, myVote: vote } : p);

      // Step 3: have the server record it now, so tallies update at once.
      const res = await this.authFetch(`/api/governance/proposals/${proposalId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ txHash }),
      });
      if (!res.ok) {
        console.warn('[castVote] vote endpoint:', res.status, await res.text());
        toast.info(`הצבעתך נשלחה לרשת · tx: ${txHash.slice(0, 10)}… · הספירה תתעדכן בקרוב`);
        return;
      }
      toast.success(`הצבעתך נרשמה · tx: ${txHash.slice(0, 10)}…`);
      return;
    }
    // In-memory: optimistic update
    const idx = this.proposals.findIndex(p => p.id === proposalId);
    if (idx < 0) { toast.error('הצעה לא נמצאה'); return; }
    const p = this.proposals[idx];
    const power = this.myVotingPower;
    const updated = { ...p, myVote: vote } as Proposal;
    if (vote === 'for')     updated.votesFor     = p.votesFor     + power;
    if (vote === 'against') updated.votesAgainst = p.votesAgainst + power;
    if (vote === 'abstain') updated.votesAbstain = p.votesAbstain + power;
    this.proposals[idx] = updated;
    const labels: Record<string, string> = { for: 'בעד', against: 'נגד', abstain: 'נמנע' };
    toast.success(`הצבעת ${labels[vote]} עם ${power} כוח הצבעה`);
  }

  async createProposal(data: Omit<Proposal, 'id' | 'proposer' | 'votesFor' | 'votesAgainst' | 'votesAbstain' | 'state' | 'executed' | 'quorumReached' | 'snapshotBlock' | 'myVote'>): Promise<void> {
    if (!this.currentUser) { toast.error('יש להתחבר'); return; }
    if (USE_FIREBASE) {
      const res = await this.authFetch('/api/governance/proposals', {
        method: 'POST',
        body: JSON.stringify({ ...data, proposer: this.currentUser.walletAddress }),
      });
      if (!res.ok) { toast.error(await res.text()); return; }
      toast.success('ההצעה הוגשה לאישור');
      return;
    }
    // In-memory
    const id = this.nextId('proposal');
    const proposal: Proposal = {
      ...data,
      id,
      proposer: this.currentUser.walletAddress ?? '0x0000',
      votesFor: 0, votesAgainst: 0, votesAbstain: 0,
      state: 'active',
      executed: false,
      quorumReached: false,
      snapshotBlock: 0,
      myVote: null,
    };
    this.proposals = [proposal, ...this.proposals];
    toast.success('הצעה הוגשה בהצלחה');
  }

  async signOut(): Promise<void> {
    if (USE_FIREBASE) {
      const { auth } = await import('$lib/firebase');
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
    }
    this.isAuthenticated = false;
    this.currentUserId = null;
    this.stopListeners();
  }
}

export const app = new AppStore();

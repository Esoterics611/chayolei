// The live app's connection to the server (docs/TEAM_BACKEND.md §4): wallet
// sign-in, Firestore listeners that assemble the member's teams, and actions
// sent to the API. Loaded only when VITE_TEAM_BACKEND=firestore, so the demo
// never pulls in Firebase.

import type { Unsubscribe } from 'firebase/firestore';
import type { Command, CommandResult } from './commands';
import { TMIM } from './chain';
import type { ForwardRequest } from './chain';
import { fromDocs } from './persist';
import type { StoredVersion, TeamCore } from './persist';
import type { LedgerEntry, Locale, Message, Team, TemplateId } from './types';
import type { PlanSuggestion } from './planner';

export interface Refusal {
  key: string;
  vars?: Record<string, string | number>;
}

export type Reply<T> = { ok: true; value: T } | { ok: false; error: Refusal };

export interface LiveEvents {
  /** Signed in (uid) or out (null). */
  session(uid: string | null): void;
  /** The member's teams; the active one complete, the others core only. */
  teams(teams: Team[]): void;
}

interface Deep {
  teamId: string;
  ledger: LedgerEntry[];
  messages: Message[];
  versions: Map<string, StoredVersion>;
  subs: Unsubscribe[];
}

export class LiveClient {
  private uid: string | null = null;
  private cores = new Map<string, TeamCore>();
  private deep: Deep | null = null;
  private active = '';
  private teamsSub: Unsubscribe | null = null;

  constructor(private events: LiveEvents) {}

  async start(): Promise<void> {
    const { auth } = await import('$lib/firebase');
    const { onAuthStateChanged } = await import('firebase/auth');
    onAuthStateChanged(auth, user => {
      this.stopAll();
      this.uid = user?.uid ?? null;
      this.events.session(this.uid);
      if (this.uid) void this.watchTeams(this.uid);
    });
  }

  /** Follow one team completely: its ledger, messages and the versions the member may read. */
  setActive(teamId: string): void {
    if (teamId === this.active) return;
    this.active = teamId;
    void this.watchDeep();
  }

  // ── Sign-in ────────────────────────────────────────────────────

  /** Sign in with a browser wallet: sign a one-time message, get a session. */
  async signIn(): Promise<Reply<string>> {
    const ethereum = (window as unknown as { ethereum?: import('ethers').Eip1193Provider }).ethereum;
    if (!ethereum) return { ok: false, error: { key: 'live.noWallet' } };
    try {
      const { BrowserProvider } = await import('ethers');
      const { signInWithCustomToken } = await import('firebase/auth');
      const { auth } = await import('$lib/firebase');
      const provider = new BrowserProvider(ethereum);
      const [walletAddress] = (await provider.send('eth_requestAccounts', [])) as string[];
      const nonceRes = await fetch('/api/auth/nonce', post({ walletAddress }));
      if (!nonceRes.ok) return { ok: false, error: { key: 'live.signInFailed' } };
      const { nonce } = await nonceRes.json();
      const signature = await (await provider.getSigner()).signMessage(nonce);
      const verifyRes = await fetch('/api/auth/verify', post({ walletAddress, signature }));
      if (!verifyRes.ok) return { ok: false, error: { key: 'live.signInFailed' } };
      const { customToken } = await verifyRes.json();
      const cred = await signInWithCustomToken(auth, customToken);
      return { ok: true, value: cred.user.uid };
    } catch (e) {
      const code = (e as { code?: string }).code;
      return { ok: false, error: { key: code === 'ACTION_REJECTED' ? 'live.signInCancelled' : 'live.signInFailed' } };
    }
  }

  async signOut(): Promise<void> {
    const { auth } = await import('$lib/firebase');
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
  }

  // ── The chain ──────────────────────────────────────────────────

  private chainInfo: Promise<ChainInfo> | null = null;

  /** Where live teams are recorded (or { enabled: false }). */
  chain(): Promise<ChainInfo> {
    if (!this.chainInfo) {
      this.chainInfo = fetch('/api/chain').then(r => r.json()).catch(() => ({ enabled: false }));
    }
    return this.chainInfo;
  }

  private async signer(chainId: number) {
    const ethereum = (window as unknown as { ethereum?: import('ethers').Eip1193Provider }).ethereum;
    if (!ethereum) throw Object.assign(new Error('no wallet'), { key: 'live.noWallet' });
    await ensureChain(ethereum, chainId);
    const { BrowserProvider } = await import('ethers');
    return new BrowserProvider(ethereum).getSigner();
  }

  /** Have the member's wallet sign typed data (EIP-712). */
  async signTyped(prepared: Prepared, value: Record<string, unknown>): Promise<Reply<string>> {
    try {
      const signer = await this.signer(Number(prepared.domain.chainId));
      return { ok: true, value: await signer.signTypedData(prepared.domain, prepared.types, value) };
    } catch (e) {
      return { ok: false, error: walletError(e) };
    }
  }

  /** Send TMIM from the member's wallet (a contribution to the team account). */
  async sendTmim(chainId: number, tmim: string, to: string, amount: number): Promise<Reply<string>> {
    try {
      const signer = await this.signer(chainId);
      const tx = await signer.sendTransaction({ to: tmim, data: TMIM.encodeFunctionData('transfer', [to, BigInt(amount)]) });
      const receipt = await tx.wait(1);
      return { ok: true, value: receipt?.hash ?? tx.hash };
    } catch (e) {
      return { ok: false, error: walletError(e) };
    }
  }

  // ── Actions ────────────────────────────────────────────────────

  /** For an on-chain team's settled action: the request to sign. */
  prepare(teamId: string, command: Command): Promise<Reply<Prepare<{ command: Command; request: ForwardRequest }>>> {
    return this.call(`/api/teams/${encodeURIComponent(teamId)}/prepare`, { command });
  }

  send(teamId: string, command: Command, signed?: Signed): Promise<Reply<{ result: CommandResult; team: Team }>> {
    return this.call(`/api/teams/${encodeURIComponent(teamId)}/commands`, { command, signed });
  }

  /** The AI planner's suggested breakdown of an objective; nothing is written. */
  async suggestPlan(teamId: string, objectiveId: string, locale: Locale): Promise<Reply<PlanSuggestion>> {
    const r = await this.call<{ suggestion: PlanSuggestion }>(`/api/teams/${encodeURIComponent(teamId)}/plan`, { objectiveId, locale });
    return r.ok ? { ok: true, value: r.value.suggestion } : r;
  }

  prepareTeam(input: TeamInput): Promise<Reply<Prepare<{ request: ForwardRequest }>>> {
    return this.call('/api/teams/prepare', input);
  }

  async createTeam(input: TeamInput, signed?: Signed): Promise<Reply<Team>> {
    const r = await this.call<{ team: Team }>('/api/teams', { ...input, signed });
    return r.ok ? { ok: true, value: r.value.team } : r;
  }

  prepareInvite(teamId: string): Promise<Reply<Prepare<{ token: string; invite: Record<string, unknown> }>>> {
    return this.call(`/api/teams/${encodeURIComponent(teamId)}/invites/prepare`, {});
  }

  invite(teamId: string, body: Record<string, unknown> = {}): Promise<Reply<{ url: string; expiresAt: string }>> {
    return this.call(`/api/teams/${encodeURIComponent(teamId)}/invites`, body);
  }

  prepareJoin(token: string): Promise<Reply<Prepare<{ request: ForwardRequest }>>> {
    return this.call(`/api/invites/${encodeURIComponent(token)}/prepare`, {});
  }

  async inviteInfo(token: string): Promise<Reply<InviteInfo>> {
    try {
      const res = await fetch(`/api/invites/${encodeURIComponent(token)}`);
      return reply<InviteInfo>(res);
    } catch {
      return { ok: false, error: { key: 'live.offline' } };
    }
  }

  async acceptInvite(token: string, you: { name: string }, signed?: Signed): Promise<Reply<Team>> {
    const r = await this.call<{ team: Team }>(`/api/invites/${encodeURIComponent(token)}/accept`, { ...you, signed });
    return r.ok ? { ok: true, value: r.value.team } : r;
  }

  private async call<T>(url: string, body: unknown): Promise<Reply<T>> {
    try {
      const { auth } = await import('$lib/firebase');
      const token = await auth.currentUser?.getIdToken();
      if (!token) return { ok: false, error: { key: 'live.signedOut' } };
      const res = await fetch(url, post(body, token));
      return reply<T>(res);
    } catch {
      return { ok: false, error: { key: 'live.offline' } };
    }
  }

  // ── Listeners ──────────────────────────────────────────────────

  private async watchTeams(uid: string): Promise<void> {
    const { db } = await import('$lib/firebase');
    const { collection, onSnapshot, query, where } = await import('firebase/firestore');
    this.teamsSub = onSnapshot(
      query(collection(db, 'teams'), where('memberUids', 'array-contains', uid)),
      snap => {
        this.cores = new Map(snap.docs.map(d => [d.id, d.data() as TeamCore]));
        this.emit();
      },
      () => this.emit(),
    );
  }

  private async watchDeep(): Promise<void> {
    this.deep?.subs.forEach(u => u());
    this.deep = null;
    const teamId = this.active;
    if (!teamId || !this.uid) return;
    const uid = this.uid;
    const { db } = await import('$lib/firebase');
    const { collection, onSnapshot, query, where } = await import('firebase/firestore');
    const deep: Deep = { teamId, ledger: [], messages: [], versions: new Map(), subs: [] };
    this.deep = deep;
    const base = (name: string) => collection(db, 'teams', teamId, name);
    const mine = new Map<string, StoredVersion>();
    const shared = new Map<string, StoredVersion>();
    const mergeVersions = () => { deep.versions = new Map([...shared, ...mine]); };
    deep.subs.push(
      onSnapshot(base('ledger'), s => { deep.ledger = s.docs.map(d => d.data() as LedgerEntry); this.emit(); }),
      onSnapshot(base('messages'), s => { deep.messages = s.docs.map(d => d.data() as Message); this.emit(); }),
      // Saved versions, and my own drafts: what the access rules let me read.
      onSnapshot(query(base('versions'), where('kind', '==', 'version')), s => {
        shared.clear();
        for (const d of s.docs) shared.set(d.id, d.data() as StoredVersion);
        mergeVersions();
        this.emit();
      }),
      onSnapshot(query(base('versions'), where('authorId', '==', uid)), s => {
        mine.clear();
        for (const d of s.docs) mine.set(d.id, d.data() as StoredVersion);
        mergeVersions();
        this.emit();
      }),
    );
  }

  /** The active team as last seen with its ledger complete. */
  private lastGood: Team | null = null;

  private emit(): void {
    const out: Team[] = [];
    for (const [id, core] of this.cores) {
      if (id !== this.active) {
        out.push(fromDocs({ core, ledger: [], messages: [], versions: [] }));
        continue;
      }
      const deep = this.deep?.teamId === id ? this.deep : null;
      if (deep && deep.ledger.length >= core.ledgerCount) {
        this.lastGood = fromDocs({ core, ledger: deep.ledger, messages: deep.messages, versions: [...deep.versions.values()] });
      }
      // Until its ledger has caught up with the core, the active team shows
      // its last consistent state (or nothing yet), never figures that disagree.
      if (this.lastGood?.id === id) out.push(this.lastGood);
    }
    this.events.teams(out);
  }

  private stopAll(): void {
    this.lastGood = null;
    this.teamsSub?.();
    this.teamsSub = null;
    this.deep?.subs.forEach(u => u());
    this.deep = null;
    this.cores = new Map();
    this.active = '';
  }
}

export interface ChainInfo {
  enabled: boolean;
  chainId?: number;
  factory?: string;
  forwarder?: string;
  tmim?: string;
  explorer?: string;
}

export interface Prepared {
  domain: Record<string, unknown> & { chainId: number };
  types: Record<string, { name: string; type: string }[]>;
}

/** A prepare reply: nothing to sign (an off-chain team), or what to sign. */
export type Prepare<T> = { onChain: false } | ({ onChain: true } & Prepared & T);

export interface Signed {
  request: ForwardRequest;
  signature: string;
}

export interface TeamInput {
  name: string;
  purpose: string;
  templateId: TemplateId;
  you: { name: string };
}

const BASE_SEPOLIA = {
  chainId: '0x14a34', chainName: 'Base Sepolia', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://sepolia.base.org'], blockExplorerUrls: ['https://sepolia.basescan.org'],
};

/** Ask the wallet to use the team's chain (adding Base Sepolia if it doesn't know it). */
async function ensureChain(ethereum: import('ethers').Eip1193Provider, chainId: number): Promise<void> {
  const hex = '0x' + chainId.toString(16);
  try {
    const current = await ethereum.request({ method: 'eth_chainId' });
    if (typeof current === 'string' && parseInt(current, 16) === chainId) return;
    await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] });
  } catch (e) {
    if ((e as { code?: number }).code === 4902 && chainId === 84532) {
      await ethereum.request({ method: 'wallet_addEthereumChain', params: [BASE_SEPOLIA] });
      return;
    }
    throw Object.assign(new Error('wrong chain'), { key: 'live.wrongChain' });
  }
}

function walletError(e: unknown): Refusal {
  const err = e as { code?: string | number; key?: string };
  if (err.key) return { key: err.key };
  if (err.code === 'ACTION_REJECTED' || err.code === 4001) return { key: 'live.signCancelled' };
  console.error('[wallet]', e);
  return { key: 'live.walletFailed' };
}

export interface InviteInfo {
  teamId: string;
  name: string;
  purpose: string;
  templateId: TemplateId;
  roles: Team['charter']['roles'];
  joinerRoleIds: string[];
  rules: Record<string, number>;
  memberCount: number;
  usable: boolean;
  onChain: boolean;
}

function post(body: unknown, token?: string): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  };
}

async function reply<T>(res: Response): Promise<Reply<T>> {
  const data = await res.json().catch(() => null);
  if (res.ok) return { ok: true, value: data as T };
  const error = (data as { error?: Refusal } | null)?.error;
  if (error?.key) return { ok: false, error };
  return { ok: false, error: { key: res.status === 401 ? 'live.signedOut' : 'live.serverError' } };
}

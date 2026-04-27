# חיילי בית דוד — Next Phase Specification
## For use as a session prompt: paste this entire document

---

## 0. Current Codebase State (as of this spec)

### Stack
- **SvelteKit 2** + **Svelte 5 runes** (`$state`, `$derived`, `$props`)
- **Tailwind CSS v4** with `@theme` tokens
- **TypeScript strict**
- **No backend yet** — all data in-memory in `AppStore`
- Build: `npm run build` passes clean

### File Map
```
src/
├── app.css                          # Theme tokens (@theme block)
├── lib/
│   ├── components/
│   │   ├── ConfirmDialog.svelte
│   │   ├── DiscussionThread.svelte  # wired — posts to app.addDiscussion()
│   │   ├── EmptyState.svelte
│   │   ├── LocationBadge.svelte
│   │   ├── PeerReviewCard.svelte
│   │   ├── ProgressBar.svelte
│   │   ├── RankBadge.svelte
│   │   ├── RankInsignia.svelte      # SVG insignia per rank
│   │   ├── Sidebar.svelte
│   │   ├── StatusBadge.svelte
│   │   ├── TalmidAvatar.svelte
│   │   ├── Toast.svelte
│   │   ├── TokenDisplay.svelte
│   │   └── TopBar.svelte
│   ├── stores/
│   │   ├── app.svelte.ts            # AppStore singleton — ALL state & mutations
│   │   ├── mock-data.ts             # Seed data (10 talmidim, 5 mivtzaot, etc.)
│   │   └── toast.svelte.ts          # Toast notification store
│   ├── types/index.ts               # All TypeScript types
│   └── utils/format.ts              # Formatters (formatTmim, statusLabel, etc.)
├── routes/
│   ├── +layout.svelte               # Shows sidebar/topbar if app.isAuthenticated
│   ├── +page.svelte                 # Dashboard
│   ├── signup/
│   │   ├── +layout.svelte           # Bare layout (no sidebar)
│   │   └── +page.svelte             # 2-step wallet connect + profile setup
│   ├── mivtzaot/
│   │   ├── +page.svelte             # List + filter
│   │   ├── new/+page.svelte         # Create form (officer only)
│   │   └── [id]/+page.svelte        # Detail — 4 tabs, enroll/unenroll
│   ├── masimot/
│   │   ├── +page.svelte             # List + filter by status
│   │   ├── new/+page.svelte         # Create form
│   │   └── [id]/+page.svelte        # Detail — lifecycle buttons, peer review form, discussion
│   ├── tafkidim/
│   │   ├── +page.svelte             # Kanban board + list view
│   │   └── new/+page.svelte         # Create form
│   ├── anash/
│   │   ├── +page.svelte             # Roster — 3 tiers, location filter
│   │   └── [id]/+page.svelte        # Profile — wallet, rank, promote button
│   ├── review/+page.svelte          # Officer review room — approve/revision/reject
│   ├── farbrengen/+page.svelte      # Activity stream + maamarim + events
│   ├── treasury/+page.svelte        # Stats, donate form, donations list
│   └── settings/+page.svelte        # User switcher (dev only)
```

### AppStore Public API (app.svelte.ts)
**State:** `talmidim`, `groups`, `mekomot`, `mivtzaot`, `masimot`, `tafkidim`, `peerReviews`, `discussions`, `donations`, `treasury`, `activities`, `maamarim`, `farbrengens`, `sederSchedule`, `sidebarCollapsed`, `currentUserId`, `isAuthenticated`

**Derived:** `currentUser`, `currentMakom`, `stats`, `myTafkidim`, `networkStats`

**Queries:** `getTalmid`, `getGroup`, `getMakom`, `getMivtza`, `getMasima`, `getTafkid`, `getMivtzaMasimot`, `getMasimaTafkidim`, `getMivtzaTafkidim`, `getMasimaPeerReviews`, `getMasimaDiscussions`, `getMakomTalmidim`, `getMivtzaEnrolled`, `getTalmidMivtzaot`, `getMivtzaProgress`, `getMasimaProgress`

**Mutations:** `addMivtza`, `updateMivtza`, `deleteMivtza`, `addMasima`, `updateMasima`, `deleteMasima`, `addTafkid`, `updateTafkid`, `deleteTafkid`, `addTalmid`, `updateTalmid`, `promoteTalmid`, `enrollInMivtza`, `unenrollFromMivtza`, `addPeerReview`, `acknowledgePeerReview`, `addDiscussion`, `addDonation`, `redeemTmim`

**State machines:** `startMasima`, `submitMasima`, `startReviewMasima`, `approveMasima`, `requestRevisionMasima`, `publishMasima`, `startTafkid`, `submitTafkid`, `approveTafkid`, `rejectTafkid`

**Auth:** `connectWallet()` (mock), `signUp(shem, walletAddress, makomId, track)`, `signOut()`

### Key Types (types/index.ts)
```typescript
Rank = 'turai'|'rav_turai'|'samal'|'samal_rishon'|'rav_samal'|'segen'|'seren'|'rav_seren'|'sgan_aluf'|'aluf'
RankMeta = { rank, shem, transliteration, tier: 'enlisted'|'nco'|'officer', votingPower, multiplier, tokensRequired, color }
RANK_META: Record<Rank, RankMeta>  // full metadata for all 10 ranks
LearningTrack = 'נגלה' | 'חסידות' | 'תמים'
Makom = { id, shem, transliteration, country, timezone, memberCount, activeMivtzaot, coordinatorId, status, createdAt }
Talmid = { id, shem, rank, track, makomId, walletAddress?, tokenBalance, totalTokensEarned, peerReviewsGiven, peerReviewsReceived, papersPublished, votingPower, tafkidimCompleted, chavrusaId, shiurGroupId, zalId, avatarUrl, nirashemAt, isOnline }
Mivtza = { id, shem, description, type, category, creatorId, locationId, isGlobal, status, tokenAllocation, tokensUsed, enrolledIds[], masimotCount, deadline?, topics[], publicationType?, researchQuestion?, createdAt, updatedAt }
Masima = { id, shem, description, mivtzaId, type, assigneeId?, reviewerId?, status, tafkidimCount, tokenAllocation, deadline?, contentUrl?, submissionNotes?, reviewCount, averageRating?, createdAt, updatedAt }
Tafkid = { id, shem, description, masimaId, mivtzaId, assigneeId?, type, status, priority, tokenReward, deadline?, submissionNotes?, createdAt }
PeerReview = { id, masimaId, reviewerId, authorId, rating: 1|2|3|4|5, comments, suggestions[], status: 'pending'|'submitted'|'acknowledged', tokensEarned, createdAt }
Discussion = { id, masimaId, authorId, parentId?, content, tokensEarned, createdAt }
Donation = { id, donorName, donorWallet?, amount, tmimMinted, makomId?, mivtzaId?, message?, createdAt }
Treasury = { totalDonated, totalTmimMinted, totalTmimDistributed, totalTmimRedeemed, currentBalance, tmimCirculating }
```

### Theme Colors (app.css @theme)
```
yeshiva-bg:       #07060d    (near-black purple)
yeshiva-surface:  #0e0c1a
yeshiva-surface-2:#141228
yeshiva-surface-3:#1c1935
yeshiva-border:   #241f3d
yeshiva-text:     #e8e4f0
yeshiva-text-muted: #7068a0
yeshiva-gold:     #f5c842    (primary accent — Torah gold)
yeshiva-sapphire: #5b8ff5    (secondary — Chassidus blue)
yeshiva-emerald:  #34d399
yeshiva-crimson:  #e05c5c
yeshiva-purple:   #a78bfa
```

### Aliases
```
$lib       → src/lib
$components → src/lib/components
$stores    → src/lib/stores
$types     → src/lib/types
```

---

## PHASE 1 — Firebase Backend

### Goal
Replace in-memory AppStore with Firebase persistence. Auth via crypto wallet signature. Real-time Firestore listeners. All mutations go through Cloud Functions with server-side role validation.

### 1.1 Install Dependencies

```bash
npm install firebase
npm install -D firebase-tools

# For backend Cloud Functions
mkdir backend && cd backend
npm init -y
npm install firebase-admin firebase-functions ethers
npm install -D typescript @types/node ts-node
```

### 1.2 Firebase Project Setup

Create `src/lib/firebase.ts`:
```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
```

Create `.env` (gitignored):
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=chayolei.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=chayolei
VITE_FIREBASE_STORAGE_BUCKET=chayolei.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 1.3 Wallet Authentication Flow

**The full SIWE (Sign-In with Ethereum) flow:**

```
1. User clicks "חבר ארנק"
2. Frontend: request wallet address from MetaMask/WC
3. Frontend: call Cloud Function getNonce(walletAddress)
4. Cloud Function: store nonce in Firestore /nonces/{walletAddress}
5. Frontend: call wallet.signMessage(nonce)
6. Frontend: call Cloud Function verifyWallet(walletAddress, signature)
7. Cloud Function: 
   a. recover signer from signature
   b. verify signer === walletAddress
   c. delete nonce from Firestore
   d. create/get talmid doc
   e. set custom claims: { tier, rank, makomId }
   f. return Firebase custom token
8. Frontend: signInWithCustomToken(customToken)
9. Firebase Auth: user is now signed in
10. Frontend: redirect to /  (or /signup/profile if new user)
```

**Update `app.svelte.ts` `connectWallet()` to use real ethers.js:**
```typescript
import { BrowserProvider } from 'ethers';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '$lib/firebase';

async connectWallet(): Promise<string | null> {
  if (!window.ethereum) {
    toast.error('MetaMask לא מותקן');
    return null;
  }
  const provider = new BrowserProvider(window.ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  const walletAddress = accounts[0];
  
  // Get nonce from server
  const nonceRes = await fetch('/api/auth/nonce', {
    method: 'POST',
    body: JSON.stringify({ walletAddress }),
    headers: { 'Content-Type': 'application/json' },
  });
  const { nonce } = await nonceRes.json();
  
  // Sign nonce
  const signer = await provider.getSigner();
  const signature = await signer.signMessage(nonce);
  
  // Verify and get custom token
  const verifyRes = await fetch('/api/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ walletAddress, signature }),
    headers: { 'Content-Type': 'application/json' },
  });
  const { customToken, isNewUser } = await verifyRes.json();
  
  await signInWithCustomToken(auth, customToken);
  return walletAddress;
}
```

### 1.4 SvelteKit API Routes (auth endpoints)

Create `src/routes/api/auth/nonce/+server.ts`:
```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb } from '$lib/server/firebase-admin';
import { randomBytes } from 'crypto';

export const POST: RequestHandler = async ({ request }) => {
  const { walletAddress } = await request.json();
  const nonce = `חיילי בית דוד — אמת: ${randomBytes(16).toString('hex')}`;
  
  await adminDb.collection('nonces').doc(walletAddress.toLowerCase()).set({
    nonce,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min
  });
  
  return json({ nonce });
};
```

Create `src/routes/api/auth/verify/+server.ts`:
```typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb, adminAuth } from '$lib/server/firebase-admin';
import { verifyMessage } from 'ethers';

export const POST: RequestHandler = async ({ request }) => {
  const { walletAddress, signature } = await request.json();
  const addr = walletAddress.toLowerCase();
  
  // Get nonce
  const nonceDoc = await adminDb.collection('nonces').doc(addr).get();
  if (!nonceDoc.exists) throw error(401, 'Nonce not found');
  const { nonce, expiresAt } = nonceDoc.data()!;
  if (new Date() > new Date(expiresAt)) throw error(401, 'Nonce expired');
  
  // Verify signature
  const recovered = verifyMessage(nonce, signature).toLowerCase();
  if (recovered !== addr) throw error(401, 'Invalid signature');
  
  // Delete nonce
  await adminDb.collection('nonces').doc(addr).delete();
  
  // Check if talmid exists
  const talmidSnap = await adminDb.collection('talmidim')
    .where('walletAddress', '==', addr).limit(1).get();
  
  const isNewUser = talmidSnap.empty;
  const talmidId = isNewUser ? null : talmidSnap.docs[0].id;
  
  // Create custom token
  const uid = `wallet_${addr}`;
  const claims = isNewUser ? {} : {
    tier: talmidSnap.docs[0].data().tier,
    rank: talmidSnap.docs[0].data().rank,
    makomId: talmidSnap.docs[0].data().makomId,
  };
  const customToken = await adminAuth.createCustomToken(uid, claims);
  
  return json({ customToken, isNewUser, talmidId });
};
```

Create `src/lib/server/firebase-admin.ts`:
```typescript
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
```

Add to `.env`:
```
FIREBASE_PROJECT_ID=chayolei
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@chayolei.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### 1.5 Firestore Collections & Schema

```
/mekomot/{makomId}
  shem: string
  transliteration: string
  country: string
  timezone: string
  memberCount: number            // maintained by Cloud Function
  activeMivtzaot: number         // maintained by Cloud Function
  coordinatorId: string
  status: 'active' | 'forming' | 'inactive'
  createdAt: Timestamp

/talmidim/{talmidId}
  walletAddress: string          // lowercase, indexed
  shem: string
  rank: Rank
  tier: 'enlisted' | 'nco' | 'officer'   // denormalized from RANK_META
  track: LearningTrack
  makomId: string
  tokenBalance: number
  totalTokensEarned: number
  peerReviewsGiven: number
  peerReviewsReceived: number
  papersPublished: number
  votingPower: number
  tafkidimCompleted: number
  chavrusaId: string | null
  shiurGroupId: string | null
  zalId: string | null
  avatarUrl: string | null
  nirashemAt: Timestamp
  isOnline: boolean
  lastSeen: Timestamp

/mivtzaot/{mivtzaId}
  shem: string
  description: string
  type: MivtzaType
  category: MivtzaCategory
  creatorId: string
  locationId: string
  isGlobal: boolean
  status: MivtzaStatus
  tokenAllocation: number
  tokensUsed: number
  enrolledIds: string[]          // array, max ~500
  masimotCount: number
  deadline: Timestamp | null
  topics: string[]
  publicationType: string | null
  researchQuestion: string | null
  createdAt: Timestamp
  updatedAt: Timestamp

/masimot/{masimaId}
  shem: string
  description: string
  mivtzaId: string               // indexed
  type: MasimaType
  assigneeId: string | null      // indexed
  reviewerId: string | null
  status: MasimaStatus           // indexed
  tafkidimCount: number
  tokenAllocation: number
  deadline: Timestamp | null
  contentUrl: string | null
  submissionNotes: string | null
  reviewCount: number
  averageRating: number | null
  createdAt: Timestamp
  updatedAt: Timestamp

/tafkidim/{tafkidId}
  shem: string
  description: string
  masimaId: string               // indexed
  mivtzaId: string               // indexed
  assigneeId: string | null      // indexed
  type: TafkidType
  status: TafkidStatus           // indexed
  priority: TafkidPriority
  tokenReward: number
  deadline: Timestamp | null
  submissionNotes: string | null
  createdAt: Timestamp

/peerReviews/{reviewId}
  masimaId: string               // indexed
  reviewerId: string             // indexed
  authorId: string
  rating: number                 // 1-5
  comments: string
  suggestions: string[]
  status: 'pending' | 'submitted' | 'acknowledged'
  tokensEarned: number
  createdAt: Timestamp

/discussions/{discussionId}
  masimaId: string               // indexed
  authorId: string
  parentId: string | null        // indexed (for thread queries)
  content: string
  tokensEarned: number
  createdAt: Timestamp

/donations/{donationId}
  donorName: string
  donorWallet: string | null
  amount: number
  tmimMinted: number
  makomId: string | null
  mivtzaId: string | null
  message: string | null
  createdAt: Timestamp

/treasury/global                 // single document
  totalDonated: number
  totalTmimMinted: number
  totalTmimDistributed: number
  totalTmimRedeemed: number
  currentBalance: number
  tmimCirculating: number

/activities/{activityId}
  type: ActivityType
  actorId: string
  actorShem: string
  targetId: string
  targetTitle: string
  description: string
  timestamp: Timestamp
  metadata: Record<string, unknown>

/nonces/{walletAddress}           // temp, auto-deleted after verify
  nonce: string
  expiresAt: Timestamp
```

**Firestore Indexes needed** (firestore.indexes.json):
```json
{
  "indexes": [
    { "collectionGroup": "masimot", "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "mivtzaId" }, { "fieldPath": "status" }] },
    { "collectionGroup": "masimot", "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "assigneeId" }, { "fieldPath": "status" }] },
    { "collectionGroup": "tafkidim", "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "masimaId" }, { "fieldPath": "status" }] },
    { "collectionGroup": "tafkidim", "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "assigneeId" }, { "fieldPath": "status" }] },
    { "collectionGroup": "activities", "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "timestamp", "order": "DESCENDING" }] },
    { "collectionGroup": "discussions", "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "masimaId" }, { "fieldPath": "parentId" }, { "fieldPath": "createdAt" }] }
  ]
}
```

### 1.6 Migrating AppStore to Firestore

**Strategy:** Replace `$state` arrays with Firestore `onSnapshot` listeners.
Keep all `$derived` computations — just feed them from live Firestore data.

**New `src/lib/stores/app.svelte.ts` pattern:**

```typescript
import { onSnapshot, collection, doc, query, where, orderBy, limit, writeBatch } from 'firebase/firestore';
import { db, auth } from '$lib/firebase';
import type { Unsubscribe } from 'firebase/auth';

class AppStore {
  // ── state (populated by Firestore listeners) ─────────────────
  talmidim    = $state<Talmid[]>([]);
  mivtzaot    = $state<Mivtza[]>([]);
  masimot     = $state<Masima[]>([]);
  tafkidim    = $state<Tafkid[]>([]);
  peerReviews = $state<PeerReview[]>([]);
  discussions = $state<Discussion[]>([]);
  donations   = $state<Donation[]>([]);
  treasury    = $state<Treasury | null>(null);
  activities  = $state<Activity[]>([]);
  mekomot     = $state<Makom[]>([]);
  
  loading     = $state(true);
  error       = $state<string | null>(null);
  isAuthenticated = $state(false);
  currentUserId   = $state<string | null>(null);
  
  private _unsubs: Unsubscribe[] = [];

  // ── start all listeners after auth ──────────────────────────
  startListeners(): void {
    this._unsubs.push(
      onSnapshot(collection(db, 'talmidim'), snap => {
        this.talmidim = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Talmid);
      }),
      onSnapshot(collection(db, 'mivtzaot'), snap => {
        this.mivtzaot = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Mivtza);
      }),
      onSnapshot(
        query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(50)),
        snap => { this.activities = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Activity); }
      ),
      // ... etc for all collections
    );
    this.loading = false;
  }

  stopListeners(): void {
    this._unsubs.forEach(u => u());
    this._unsubs = [];
  }
  
  // ── mutations call API routes (not direct Firestore writes) ─
  async addMivtza(data: ...): Promise<Mivtza> {
    const res = await fetch('/api/mivtzaot', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`,
      },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
    // UI updates automatically via onSnapshot listener
  }
}
```

**Important:** All state-machine transitions (approve, submit, promote, etc.) go through API routes, NOT direct Firestore writes from client. This ensures:
- Role validation on server
- Atomic updates (batch writes)
- Activity log always written
- Token awards always atomic

### 1.7 SvelteKit API Routes (full CRUD)

Create the following `+server.ts` files:

```
src/routes/api/
├── auth/
│   ├── nonce/+server.ts       # POST → { nonce }
│   └── verify/+server.ts      # POST → { customToken, isNewUser }
├── mivtzaot/
│   ├── +server.ts             # GET (list), POST (create)
│   └── [id]/
│       ├── +server.ts         # GET, PATCH (update), DELETE
│       ├── enroll/+server.ts  # POST (enroll self)
│       └── unenroll/+server.ts
├── masimot/
│   ├── +server.ts             # GET, POST
│   └── [id]/
│       ├── +server.ts         # GET, PATCH, DELETE
│       ├── start/+server.ts
│       ├── submit/+server.ts  # POST { contentUrl? }
│       ├── review/start/+server.ts
│       ├── review/approve/+server.ts
│       ├── review/revision/+server.ts  # POST { notes? }
│       └── publish/+server.ts
├── tafkidim/
│   ├── +server.ts             # GET, POST
│   └── [id]/
│       ├── +server.ts         # GET, PATCH, DELETE
│       ├── start/+server.ts
│       ├── submit/+server.ts  # POST { notes? }
│       ├── approve/+server.ts
│       └── reject/+server.ts
├── talmidim/
│   ├── +server.ts             # GET
│   └── [id]/
│       ├── +server.ts         # GET, PATCH
│       └── promote/+server.ts # POST (officer only)
├── reviews/+server.ts         # POST (create peer review)
├── discussions/+server.ts     # POST (add comment/reply)
├── donations/+server.ts       # POST (add donation)
└── treasury/
    └── redeem/+server.ts      # POST { amount }
```

**Pattern for each API route:**
```typescript
// src/routes/api/masimot/[id]/approve/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb, adminAuth } from '$lib/server/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const POST: RequestHandler = async ({ params, request, locals }) => {
  // 1. Verify auth
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) throw error(401, 'Unauthorized');
  
  const decoded = await adminAuth.verifyIdToken(token);
  if (decoded.tier !== 'officer') throw error(403, 'Officer required');
  
  // 2. Get masima
  const masimaRef = adminDb.collection('masimot').doc(params.id);
  const masimaDoc = await masimaRef.get();
  if (!masimaDoc.exists) throw error(404, 'Masima not found');
  const masima = masimaDoc.data()!;
  
  // 3. Validate state machine
  if (masima.status !== 'in_review') {
    throw error(400, `Cannot approve masima in status: ${masima.status}`);
  }
  
  // 4. Atomic batch write
  const batch = adminDb.batch();
  
  // Update masima status
  batch.update(masimaRef, {
    status: 'approved',
    updatedAt: new Date().toISOString(),
  });
  
  // Award tokens to assignee
  if (masima.assigneeId) {
    const talmidRef = adminDb.collection('talmidim').doc(masima.assigneeId);
    const talmidDoc = await talmidRef.get();
    const multiplier = RANK_META[talmidDoc.data()!.rank].multiplier;
    const awarded = Math.round(masima.tokenAllocation * multiplier);
    
    batch.update(talmidRef, {
      tokenBalance: FieldValue.increment(awarded),
      totalTokensEarned: FieldValue.increment(awarded),
    });
    
    // Update treasury
    batch.update(adminDb.collection('treasury').doc('global'), {
      totalTmimDistributed: FieldValue.increment(awarded),
      tmimCirculating: FieldValue.increment(awarded),
    });
  }
  
  // Log activity
  const activityRef = adminDb.collection('activities').doc();
  batch.set(activityRef, {
    type: 'masima_completed',
    actorId: decoded.uid,
    actorShem: decoded.name ?? 'קצין',
    targetId: params.id,
    targetTitle: masima.shem,
    description: 'אישר משימה',
    timestamp: new Date().toISOString(),
    metadata: {},
  });
  
  await batch.commit();
  
  return json({ success: true });
};
```

### 1.8 Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    function isOfficer() {
      return request.auth.token.tier == 'officer';
    }
    function isNcoOrAbove() {
      return request.auth.token.tier in ['nco', 'officer'];
    }
    function isSelf(talmidId) {
      return request.auth.uid == 'wallet_' + resource.data.walletAddress;
    }
    
    // Nonces — writable by anyone (unauthenticated), readable only by owner
    match /nonces/{address} {
      allow create: if true;
      allow read, delete: if true; // server-side only in practice
    }
    
    // Mekomot — read-only for all authenticated
    match /mekomot/{id} {
      allow read: if isAuthenticated();
      allow write: if false; // admin SDK only
    }
    
    // Talmidim — all authenticated can read
    match /talmidim/{talmidId} {
      allow read: if isAuthenticated();
      allow write: if false; // API routes only
    }
    
    // Mivtzaot — read all, write via API
    match /mivtzaot/{mivtzaId} {
      allow read: if isAuthenticated();
      allow write: if false;
    }
    
    // Masimot — read all, write via API
    match /masimot/{masimaId} {
      allow read: if isAuthenticated();
      allow write: if false;
    }
    
    // Tafkidim — read all, write via API
    match /tafkidim/{tafkidId} {
      allow read: if isAuthenticated();
      allow write: if false;
    }
    
    // Peer Reviews — read all, write via API
    match /peerReviews/{reviewId} {
      allow read: if isAuthenticated();
      allow write: if false;
    }
    
    // Discussions — read all, write via API
    match /discussions/{discussionId} {
      allow read: if isAuthenticated();
      allow write: if false;
    }
    
    // Treasury — read all
    match /treasury/{docId} {
      allow read: if isAuthenticated();
      allow write: if false;
    }
    
    // Activities — read all
    match /activities/{activityId} {
      allow read: if isAuthenticated();
      allow write: if false;
    }
    
    // Donations — read all
    match /donations/{donationId} {
      allow read: if isAuthenticated();
      allow write: if false;
    }
  }
}
```

### 1.9 +layout.ts (auth guard)

Create `src/routes/+layout.ts`:
```typescript
import { auth } from '$lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { app } from '$stores/app.svelte';

export const load = async () => {
  return new Promise<void>((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (user) {
        app.isAuthenticated = true;
        app.currentUserId = user.uid;
        app.startListeners();
      } else {
        app.isAuthenticated = false;
        app.stopListeners();
      }
      resolve();
    });
  });
};
```

**+layout.svelte** — add redirect for unauthenticated:
```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { app } from '$stores/app.svelte';
  
  $effect(() => {
    if (!app.isAuthenticated && $page.url.pathname !== '/signup') {
      goto('/signup');
    }
  });
</script>
```

### 1.10 Loading & Error States

Add `LoadingOverlay.svelte` component:
```svelte
<!-- covers full page with subtle pulse while Firestore loads -->
{#if app.loading}
  <div class="fixed inset-0 bg-yeshiva-bg/80 z-50 flex items-center justify-center">
    <div class="text-center space-y-4">
      <div class="w-16 h-16 rounded-2xl bg-yeshiva-gold/10 border border-yeshiva-gold/30 
                  flex items-center justify-center mx-auto animate-pulse">
        <span class="text-yeshiva-gold text-2xl">⬡</span>
      </div>
      <p class="text-yeshiva-text-muted text-sm">טוען נתונים...</p>
    </div>
  </div>
{/if}
```

---

## PHASE 2 — Smart Contracts (Base Sepolia)

### Goal
TMIM is a real ERC-20 token on Base Sepolia. Ranks are on-chain. Token minting/burning happens on-chain. Treasury holds real USDC. All critical authority is on-chain; Firestore holds the rich metadata.

### 2.1 Hardhat Project Setup

```bash
cd contracts/  # already exists from earlier work
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts ethers
npx hardhat init  # TypeScript project
```

`hardhat.config.ts`:
```typescript
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const config: HardhatUserConfig = {
  solidity: '0.8.24',
  networks: {
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
      chainId: 84532,
    },
  },
  etherscan: {
    apiKey: { baseSepolia: process.env.BASESCAN_API_KEY! },
    customChains: [{
      network: 'baseSepolia',
      chainId: 84532,
      urls: { apiURL: 'https://api-sepolia.basescan.org/api', browserURL: 'https://sepolia.basescan.org' },
    }],
  },
};
export default config;
```

### 2.2 Contract: TMIMToken.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract TMIMToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    
    // 1 TMIM = $0.10 USD (stored as basis points, 1000 = $0.10)
    uint256 public redemptionRateBps = 1000;
    
    event TokensMinted(address indexed to, uint256 amount, string reason);
    event TokensBurned(address indexed from, uint256 amount);
    event RedemptionRateUpdated(uint256 newRateBps);
    
    constructor(address admin) ERC20("TMIM Token", "TMIM") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
    }
    
    function mint(address to, uint256 amount, string calldata reason) 
        external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
        emit TokensMinted(to, amount, reason);
    }
    
    function burn(address from, uint256 amount) 
        external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
        emit TokensBurned(from, amount);
    }
    
    // TMIM uses 0 decimals — 1 token = 1 TMIM
    function decimals() public pure override returns (uint8) { return 0; }
    
    function setRedemptionRate(uint256 rateBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        redemptionRateBps = rateBps;
        emit RedemptionRateUpdated(rateBps);
    }
}
```

### 2.3 Contract: ChayoleiRegistry.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract ChayoleiRegistry is AccessControl {
    bytes32 public constant OFFICER_ROLE = keccak256("OFFICER_ROLE");
    bytes32 public constant PROMOTER_ROLE = keccak256("PROMOTER_ROLE");
    
    // Rank enum: 0=turai, 1=rav_turai, ..., 9=aluf
    // Tier: 0-1 = enlisted, 2-4 = nco, 5-9 = officer
    
    struct Chayal {
        bool registered;
        uint8 rank;          // 0-9
        bytes32 makomId;     // keccak256 of makom name
        uint256 registeredAt;
        uint256 promotedAt;
    }
    
    mapping(address => Chayal) public chayalim;
    mapping(address => bool) public isOfficer;
    
    uint256 public totalRegistered;
    
    event Registered(address indexed wallet, uint8 rank, bytes32 makomId);
    event Promoted(address indexed wallet, uint8 oldRank, uint8 newRank, address promotedBy);
    
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PROMOTER_ROLE, admin);
    }
    
    function register(bytes32 makomId) external {
        require(!chayalim[msg.sender].registered, "Already registered");
        chayalim[msg.sender] = Chayal({
            registered: true,
            rank: 0, // turai
            makomId: makomId,
            registeredAt: block.timestamp,
            promotedAt: 0
        });
        totalRegistered++;
        emit Registered(msg.sender, 0, makomId);
    }
    
    function promote(address chayal) external onlyRole(PROMOTER_ROLE) {
        require(chayalim[chayal].registered, "Not registered");
        require(chayalim[chayal].rank < 9, "Already max rank");
        uint8 oldRank = chayalim[chayal].rank;
        chayalim[chayal].rank++;
        chayalim[chayal].promotedAt = block.timestamp;
        
        // Update officer status
        if (chayalim[chayal].rank >= 5) {
            isOfficer[chayal] = true;
        }
        
        emit Promoted(chayal, oldRank, chayalim[chayal].rank, msg.sender);
    }
    
    function getRank(address wallet) external view returns (uint8) {
        return chayalim[wallet].rank;
    }
    
    function getTier(address wallet) external view returns (string memory) {
        uint8 rank = chayalim[wallet].rank;
        if (rank <= 1) return "enlisted";
        if (rank <= 4) return "nco";
        return "officer";
    }
}
```

### 2.4 Contract: MasimaRewards.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TMIMToken.sol";
import "./ChayoleiRegistry.sol";

contract MasimaRewards is AccessControl, ReentrancyGuard {
    bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");
    
    TMIMToken public immutable tmim;
    ChayoleiRegistry public immutable registry;
    
    // Rank multipliers in basis points (100 = 1.0x, 120 = 1.2x, etc.)
    uint16[10] public rankMultipliers = [100, 120, 150, 200, 250, 300, 400, 500, 700, 1000];
    
    event MasimaApproved(
        string indexed masimaId, 
        address indexed assignee, 
        uint256 baseReward,
        uint256 actualReward
    );
    event TafkidApproved(
        string indexed tafkidId,
        address indexed assignee,
        uint256 baseReward,
        uint256 actualReward
    );
    
    constructor(address admin, address tmimAddress, address registryAddress) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(APPROVER_ROLE, admin);
        tmim = TMIMToken(tmimAddress);
        registry = ChayoleiRegistry(registryAddress);
    }
    
    function approveMasima(
        string calldata masimaId,
        address assignee,
        uint256 baseReward
    ) external onlyRole(APPROVER_ROLE) nonReentrant {
        uint8 rank = registry.getRank(assignee);
        uint256 actual = (baseReward * rankMultipliers[rank]) / 100;
        tmim.mint(assignee, actual, string.concat("masima:", masimaId));
        emit MasimaApproved(masimaId, assignee, baseReward, actual);
    }
    
    function approveTafkid(
        string calldata tafkidId,
        address assignee,
        uint256 baseReward
    ) external onlyRole(APPROVER_ROLE) nonReentrant {
        uint8 rank = registry.getRank(assignee);
        uint256 actual = (baseReward * rankMultipliers[rank]) / 100;
        tmim.mint(assignee, actual, string.concat("tafkid:", tafkidId));
        emit TafkidApproved(tafkidId, assignee, baseReward, actual);
    }
}
```

### 2.5 Contract: Treasury.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./TMIMToken.sol";

contract Treasury is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    TMIMToken public immutable tmim;
    IERC20 public immutable usdc;  // USDC on Base Sepolia
    
    // 1 USDC (6 decimals) = 10 TMIM
    // So 1 TMIM = $0.10
    uint256 public constant USDC_DECIMALS = 1e6;
    uint256 public constant TMIM_PER_USDC = 10;
    
    uint256 public totalDonatedUsdc;
    uint256 public totalTmimMinted;
    uint256 public totalTmimRedeemed;
    
    event Donated(address indexed donor, uint256 usdcAmount, uint256 tmimMinted);
    event Redeemed(address indexed redeemer, uint256 tmimBurned, uint256 usdcReturned);
    
    // Base Sepolia USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
    constructor(address admin, address tmimAddress, address usdcAddress) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        tmim = TMIMToken(tmimAddress);
        usdc = IERC20(usdcAddress);
    }
    
    // Donate USDC → receive TMIM
    function donate(uint256 usdcAmount) external nonReentrant {
        require(usdcAmount >= USDC_DECIMALS, "Min donation: 1 USDC");
        usdc.transferFrom(msg.sender, address(this), usdcAmount);
        
        uint256 tmimToMint = (usdcAmount * TMIM_PER_USDC) / USDC_DECIMALS;
        tmim.mint(msg.sender, tmimToMint, "donation");
        
        totalDonatedUsdc += usdcAmount;
        totalTmimMinted += tmimToMint;
        
        emit Donated(msg.sender, usdcAmount, tmimToMint);
    }
    
    // Redeem TMIM → receive USDC
    function redeem(uint256 tmimAmount) external nonReentrant {
        require(tmim.balanceOf(msg.sender) >= tmimAmount, "Insufficient TMIM");
        
        uint256 usdcToReturn = (tmimAmount * USDC_DECIMALS) / TMIM_PER_USDC;
        require(usdc.balanceOf(address(this)) >= usdcToReturn, "Treasury insufficient");
        
        tmim.burn(msg.sender, tmimAmount);
        usdc.transfer(msg.sender, usdcToReturn);
        
        totalTmimRedeemed += tmimAmount;
        
        emit Redeemed(msg.sender, tmimAmount, usdcToReturn);
    }
}
```

### 2.6 Deploy Script

`contracts/scripts/deploy.ts`:
```typescript
import { ethers } from 'hardhat';
import fs from 'fs';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with:', deployer.address);
  
  const USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
  
  // 1. Deploy TMIMToken
  const TMIMToken = await ethers.getContractFactory('TMIMToken');
  const tmim = await TMIMToken.deploy(deployer.address);
  await tmim.waitForDeployment();
  console.log('TMIMToken:', await tmim.getAddress());
  
  // 2. Deploy ChayoleiRegistry
  const Registry = await ethers.getContractFactory('ChayoleiRegistry');
  const registry = await Registry.deploy(deployer.address);
  await registry.waitForDeployment();
  console.log('Registry:', await registry.getAddress());
  
  // 3. Deploy MasimaRewards
  const Rewards = await ethers.getContractFactory('MasimaRewards');
  const rewards = await Rewards.deploy(
    deployer.address, 
    await tmim.getAddress(), 
    await registry.getAddress()
  );
  await rewards.waitForDeployment();
  console.log('MasimaRewards:', await rewards.getAddress());
  
  // 4. Deploy Treasury
  const Treasury = await ethers.getContractFactory('Treasury');
  const treasury = await Treasury.deploy(
    deployer.address,
    await tmim.getAddress(),
    USDC_BASE_SEPOLIA
  );
  await treasury.waitForDeployment();
  console.log('Treasury:', await treasury.getAddress());
  
  // 5. Grant roles
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
  const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('BURNER_ROLE'));
  await tmim.grantRole(MINTER_ROLE, await rewards.getAddress());
  await tmim.grantRole(MINTER_ROLE, await treasury.getAddress());
  await tmim.grantRole(BURNER_ROLE, await treasury.getAddress());
  
  // 6. Save addresses
  const addresses = {
    tmim: await tmim.getAddress(),
    registry: await registry.getAddress(),
    rewards: await rewards.getAddress(),
    treasury: await treasury.getAddress(),
    usdc: USDC_BASE_SEPOLIA,
    network: 'baseSepolia',
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync('deployed-addresses.json', JSON.stringify(addresses, null, 2));
  console.log('Saved to deployed-addresses.json');
}

main().catch(console.error);
```

### 2.7 Hybrid Architecture — Cloud Functions ↔ Contracts

The Cloud Functions (or SvelteKit API routes) bridge Firebase and contracts:

```typescript
// In the approveMasima API route, AFTER Firestore batch:
import { ethers } from 'ethers';
import addresses from '../../../contracts/deployed-addresses.json';
import MasimaRewardsABI from '../../../contracts/artifacts/contracts/MasimaRewards.sol/MasimaRewards.json';

async function callContractApprove(masimaId: string, assigneeWallet: string, baseReward: number) {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
  const signer = new ethers.Wallet(process.env.APPROVER_PRIVATE_KEY!, provider);
  const rewards = new ethers.Contract(addresses.rewards, MasimaRewardsABI.abi, signer);
  
  const tx = await rewards.approveMasima(masimaId, assigneeWallet, baseReward);
  const receipt = await tx.wait();
  return receipt.hash;
}
```

Store the tx hash in Firestore for proof:
```typescript
batch.update(masimaRef, {
  status: 'approved',
  approvalTxHash: txHash,   // on-chain proof
  updatedAt: new Date().toISOString(),
});
```

### 2.8 What's On-Chain vs Off-Chain

| Data | On-Chain | Firestore |
|------|----------|-----------|
| TMIM balances | ✅ ERC-20 | cached (updated by event listener) |
| Rank | ✅ Registry | cached |
| Masima approval (proof) | ✅ event + tx hash | status field |
| Tafkid approval (proof) | ✅ event + tx hash | status field |
| Donations | ✅ Treasury.donate() | metadata |
| Redemptions | ✅ Treasury.redeem() | metadata |
| Peer review rewards | ✅ TMIMToken.mint() | via MasimaRewards |
| Discussion content | ❌ | ✅ only |
| Activity feed | ❌ | ✅ only |
| Profile bio, avatar | ❌ | ✅ only |
| Mivtza full details | ❌ | ✅ only |
| Masima content/notes | ❌ | ✅ only |

---

## PHASE 3 — Real Wallet Integration

### 3.1 Install ethers + WalletConnect

```bash
npm install ethers @web3modal/ethers
```

### 3.2 Multi-Wallet Support

Replace the mock `connectWallet()` with:
```typescript
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const metadata = {
  name: 'חיילי בית דוד',
  description: 'Research & Publication Network',
  url: 'https://chayolei.app',
  icons: ['https://chayolei.app/icon.png'],
};

const baseSepolia = {
  chainId: 84532,
  name: 'Base Sepolia',
  currency: 'ETH',
  explorerUrl: 'https://sepolia.basescan.org',
  rpcUrl: 'https://sepolia.base.org',
};

export const modal = createWeb3Modal({
  ethersConfig: defaultConfig({ metadata }),
  chains: [baseSepolia],
  projectId,
  themeMode: 'dark',
});
```

Usage in signup page:
```typescript
async function handleConnect() {
  await modal.open();
  const provider = modal.getWalletProvider();
  const ethersProvider = new BrowserProvider(provider);
  const signer = await ethersProvider.getSigner();
  walletAddress = await signer.getAddress();
  // proceed to sign nonce...
}
```

### 3.3 Display ENS Names

```typescript
async function resolveENS(address: string): Promise<string | null> {
  try {
    const mainnetProvider = new JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/...');
    return await mainnetProvider.lookupAddress(address);
  } catch { return null; }
}
```

---

## PHASE 4 — IPFS Content Storage

### 4.1 Pinata Setup

```bash
npm install @pinata/sdk
```

```typescript
// src/lib/server/ipfs.ts
import PinataClient from '@pinata/sdk';

const pinata = new PinataClient({
  pinataApiKey: process.env.PINATA_API_KEY,
  pinataSecretApiKey: process.env.PINATA_SECRET_KEY,
});

export async function uploadToIPFS(content: string, name: string): Promise<string> {
  const result = await pinata.pinJSONToIPFS(
    { content, name, timestamp: new Date().toISOString() },
    { pinataMetadata: { name } }
  );
  return `ipfs://${result.IpfsHash}`;
}

export async function uploadFileToIPFS(file: Buffer, filename: string): Promise<string> {
  const result = await pinata.pinFileToIPFS(
    file,
    { pinataMetadata: { name: filename } }
  );
  return `ipfs://${result.IpfsHash}`;
}
```

### 4.2 Masima Submission with IPFS

When submitting a masima, upload content to IPFS first:
```typescript
// In submitMasima API route:
const ipfsUrl = await uploadToIPFS(content, masima.shem);
// Store as contentUrl — displayed as https://ipfs.io/ipfs/{hash}
const httpUrl = ipfsUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
```

---

## PHASE 5 — Notifications

### 5.1 Firebase Cloud Messaging

```bash
npm install firebase  # already installed
```

```typescript
// src/lib/notifications.ts
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

export async function requestNotificationPermission(): Promise<string | null> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;
  const messaging = getMessaging();
  return getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
}
```

Add notification triggers to each API route (e.g., on `approveMasima`, notify the assignee).

### 5.2 Notification Types
```
masima_approved     → notify assignee
masima_revision     → notify assignee  
tafkid_approved     → notify assignee
peer_review_posted  → notify masima author
discussion_reply    → notify parent comment author
talmid_promoted     → notify the promoted talmid
new_discussion      → notify masima assignee
```

### 5.3 In-App Notification Bell (TopBar)

Add `notifications = $state<Notification[]>([])` to AppStore.
Subscribe to `/notifications/{currentUserId}` Firestore collection.
Show red dot badge on TopBar bell icon when unread count > 0.

---

## PHASE 6 — Social Features (Future)

These are not blocking but should be architected now:

### 6.1 Follow System
```
/follows/{followerId}/following/{followingId}  — simple doc
```
Feed: query activities where `actorId in followingIds`

### 6.2 Reputation Score
```
score = (tafkidimCompleted * 10) 
      + (peerReviewsGiven * 25)
      + (papersPublished * 100)
      + (totalTokensEarned * 0.1)
      + (RANK_META[rank].votingPower * 50)
```
Computed Firestore field, updated on each relevant mutation.

### 6.3 Achievement Badges
```
first_publication   — first masima published
review_veteran      — 10+ peer reviews given
top_contributor     — top 10 by tokens in location
long_service        — nirashemAt > 1 year ago
global_scholar      — masima published in global mivtza
```
Store as `badges: string[]` array on Talmid doc.

### 6.4 Location Leaderboard
Query `talmidim` collection, filter by `makomId`, order by `totalTokensEarned desc`, limit 10.
Update `src/routes/anash/+page.svelte` to show leaderboard tab per location.

---

## IMPLEMENTATION ORDER (Recommended)

```
Week 1: Phase 1A-1C (Firebase setup + auth + Firestore schema)
Week 2: Phase 1D-1E (API routes + frontend migration to Firestore)
Week 3: Phase 1F (Security rules + loading states + error handling)
Week 4: Phase 2A-2C (TMIMToken + Registry + MasimaRewards contracts)
Week 5: Phase 2D-2E (Treasury contract + deploy script + Base Sepolia deploy)
Week 6: Phase 2F-2G (Hybrid bridge — API routes call contracts)
Week 7: Phase 3 (Real wallet — Web3Modal + ENS)
Week 8: Phase 4 (IPFS for masima content)
Week 9: Phase 5 (Notifications)
Week 10+: Phase 6 (Social features)
```

---

## SESSION PROMPT INSTRUCTIONS

When starting a new session with this spec, say:

> "Execute NEXT_SESSION_SPEC.md Phase [X]. 
> The codebase is at C:\code\vanguard\chayolei. 
> Don't scan the repo unnecessarily — the full file map and API surface is in this spec. 
> Break work into sub-sessions if needed to avoid token exhaustion mid-task."

The spec doc is at: `C:\code\vanguard\chayolei\NEXT_SESSION_SPEC.md`

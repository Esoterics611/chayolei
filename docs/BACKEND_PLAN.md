# Chayolei Beis Dovid — Backend & Smart Contract Plan

> **Economic model changed 2026-10-25:** crypto in, crypto out; no fiat, no fiat on- or off-ramps, no institutional connection (fiscal sponsor, 501(c)(3), tax receipts, payment processors); donations are handled separately, outside the platform; TMIM is minted only for participation. See `CLAUDE.md`. This plan also predates the Firebase backend, which is now built; see `README.md` for current status. Superseded here: donation records, `addDonation`, and the treasury minting TMIM for donations.

## Current State
- SvelteKit 2 + Svelte 5 frontend with full CRUD, state machines, toast, signup
- All data in-memory (AppStore with `$state` arrays)
- Mock wallet connection (returns random address)
- No persistence, no auth, no backend

---

## Phase 1: Firebase Backend (1-2 sessions)

### 1A. Firebase Project Setup
- Create Firebase project `chayolei-beis-dovid`
- Enable: Auth, Firestore, Cloud Functions, Hosting
- Install `firebase` + `firebase-admin` SDKs
- Create `backend/` directory with Cloud Functions (TypeScript)
- Add `src/lib/firebase.ts` — client-side Firebase init

### 1B. Authentication — Wallet-Based
- **Firebase Custom Auth** with crypto wallet signature:
  1. User connects wallet (MetaMask/WalletConnect)
  2. Frontend requests nonce from Cloud Function `getNonce(walletAddress)`
  3. User signs nonce with wallet → produces signature
  4. Frontend sends `{ walletAddress, signature }` to Cloud Function `verifyWallet`
  5. Cloud Function verifies signature with ethers.js → creates Firebase custom token
  6. Frontend calls `signInWithCustomToken(token)`
- No email/password — wallet IS the identity
- Store `walletAddress` as Firebase UID or in user profile doc

### 1C. Firestore Data Model
```
/mekomot/{makomId}           — Makom
/talmidim/{talmidId}         — Talmid (uid = wallet address or Firebase UID)
/mivtzaot/{mivtzaId}         — Mivtza
  /enrolledIds[]             — array field
/masimot/{masimaId}          — Masima
/tafkidim/{tafkidId}         — Tafkid
/peerReviews/{reviewId}      — PeerReview
/discussions/{discussionId}  — Discussion
/donations/{donationId}      — Donation
/treasury                    — single doc with aggregate counters
/activities/{activityId}     — Activity feed (capped at 500)
```

### 1D. Cloud Functions (TypeScript)
```
auth/
  getNonce(walletAddress) → nonce
  verifyWallet(walletAddress, signature) → customToken

mivtzaot/
  createMivtza(data) → mivtzaId         // officer check via custom claims
  updateMivtza(id, data)
  deleteMivtza(id)                       // cascade
  enrollInMivtza(talmidId, mivtzaId)
  unenrollFromMivtza(talmidId, mivtzaId)

masimot/
  createMasima(data) → masimaId
  updateMasima(id, data)
  submitMasima(id, contentUrl?)
  startReview(id)
  approveMasima(id)                      // triggers token award
  requestRevision(id, notes)
  publishMasima(id)

tafkidim/
  createTafkid(data) → tafkidId
  startTafkid(id)
  submitTafkid(id, notes?)
  approveTafkid(id)                      // triggers token award
  rejectTafkid(id)

social/
  addPeerReview(data) → reviewId
  addDiscussion(data) → discussionId
  promoteTalmid(id)                      // officer-only

treasury/
  addDonation(data)
  redeemTmim(talmidId, amount)
```

Each function:
- Validates caller's role via custom claims (`tier: officer|nco|enlisted`)
- Validates state machine transitions
- Updates Firestore atomically (batch writes)
- Logs activity
- Updates treasury counters

### 1E. Frontend Migration
- Replace `AppStore.$state` arrays with Firestore `onSnapshot` listeners
- Replace `AppStore.add*()` methods with Cloud Function calls
- Keep `$derived` computations — just feed them from Firestore
- Add loading/error states to all pages
- Add offline support with Firestore persistence

### 1F. Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read
    match /talmidim/{talmidId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.tier in ['officer'];
    }
    match /mivtzaot/{mivtzaId} {
      allow read: if request.auth != null;
      allow create: if request.auth.token.tier == 'officer';
    }
    // ... etc
  }
}
```

---

## Phase 2: Smart Contracts — Base Sepolia (2-3 sessions)

### 2A. Contract Architecture

**TMIMToken.sol** — ERC-20 token
- `mint(address to, uint256 amount)` — only treasury
- `burn(address from, uint256 amount)` — redemption
- `transfer/approve/transferFrom` — standard ERC-20
- Total supply tracks all minted TMIM

**ChayoleiRegistry.sol** — On-chain identity
- `register(address wallet, bytes32 nameHash)` — new chayal
- `ranks mapping(address => uint8)` — 0-9 for turai→aluf
- `promote(address chayal)` — only officer (rank >= 5)
- `getRank(address)` → rank
- Events: `Registered`, `Promoted`

**MivtzaManager.sol** — Campaign management
- `createMivtza(bytes32 nameHash, uint256 tokenBudget)` — officer only
- `enroll(uint256 mivtzaId)` — self-enroll
- `mivtzaot mapping(uint256 => Mivtza)` — id, creator, budget, status
- Events: `MivtzaCreated`, `Enrolled`

**MasimaRewards.sol** — Task completion & token distribution
- `approveMasima(uint256 masimaId, address assignee, uint256 reward)` — officer
- `approveTafkid(uint256 tafkidId, address assignee, uint256 reward)` — officer
- Calls `TMIMToken.mint()` to reward
- Events: `MasimaApproved`, `TafkidApproved`, `TokensAwarded`

**PeerReviewVault.sol** — Review incentives
- `submitReview(uint256 masimaId, uint8 rating)` — reviewer
- `acknowledgeReview(uint256 reviewId)` — author
- Auto-mints small TMIM reward to reviewer
- Events: `ReviewSubmitted`, `ReviewAcknowledged`

**Treasury.sol** — DAO treasury
- `donate(uint256 amount)` — accepts ETH/USDC, mints TMIM
- `redeem(uint256 tmimAmount)` — burns TMIM, sends stablecoin
- `allocateToMivtza(uint256 mivtzaId, uint256 amount)` — officer
- Redemption rate: 1 TMIM = $0.10 (configurable by governance)
- Events: `DonationReceived`, `TmimRedeemed`

### 2B. Hardhat Setup
- `contracts/` directory with Hardhat + TypeScript
- Solidity 0.8.20, OpenZeppelin 5.x (ERC-20, AccessControl, ReentrancyGuard)
- Deploy scripts for Base Sepolia testnet
- Ethers.js v6 integration in Cloud Functions

### 2C. Hybrid Architecture
```
User Action → Cloud Function → Firestore (fast, real-time)
                             ↘ Smart Contract (on-chain authority)
```
- **Firestore** = fast reads, real-time UI updates, complex queries
- **Smart Contracts** = token minting/burning, rank authority, treasury funds
- Cloud Functions bridge both: write Firestore + call contract in same function
- On-chain events sync back to Firestore via event listeners

### 2D. What Goes On-Chain vs Off-Chain

| Data | On-Chain | Off-Chain (Firestore) |
|------|----------|----------------------|
| TMIM token balances | ✓ ERC-20 | cached |
| Rank/promotion | ✓ Registry | cached |
| Mivtza creation | ✓ hash + budget | full data |
| Masima approval | ✓ reward event | full workflow |
| Peer reviews | ✓ rating + reward | comments/suggestions |
| Donations | ✓ on-chain tx | metadata |
| Redemptions | ✓ burn + payout | metadata |
| Discussions | — | ✓ Firestore only |
| Activity feed | — | ✓ Firestore only |
| User profiles | — | ✓ Firestore only |
| Task details | — | ✓ Firestore only |

---

## Phase 3: Polish & Launch Prep (1-2 sessions)

### 3A. Real Wallet Integration
- Replace mock `connectWallet()` with ethers.js BrowserProvider
- Support MetaMask, WalletConnect v2, Coinbase Wallet
- Sign-in-with-Ethereum (SIWE) standard
- Display ENS names where available

### 3B. IPFS Integration
- Masima content uploads to IPFS (Pinata/web3.storage)
- Content URL stored on-chain as IPFS hash
- Peer review evidence on IPFS
- Publication PDFs on IPFS

### 3C. Notifications
- Firebase Cloud Messaging (push)
- In-app notification center (bell icon in TopBar)
- Notify on: review requested, masima approved, tokens received, promotion, new discussion reply

### 3D. Mobile Responsiveness
- Test all pages at mobile/tablet breakpoints
- Collapsible sidebar → bottom nav on mobile
- Touch-friendly action buttons

### 3E. Social Features (Future)
- Follow/unfollow chayalim across locations
- Personal activity feed ("what my network did")
- Reputation scores (weighted: reviews given > tasks done > tokens earned)
- Leaderboard per location + global
- Achievement badges (first publication, 10 reviews, etc.)
- Direct messaging between chayalim

---

## Recommended Build Order

1. **Firebase auth + Firestore** (Phase 1A-1C) — gets real persistence
2. **Cloud Functions for CRUD** (Phase 1D) — server-side validation
3. **Frontend migration** (Phase 1E) — real-time data
4. **Smart contracts** (Phase 2A-2B) — token economics
5. **Hybrid bridge** (Phase 2C) — connect Firebase ↔ contracts
6. **Real wallet** (Phase 3A) — production auth
7. **IPFS** (Phase 3B) — content permanence
8. **Notifications + mobile** (Phase 3C-3D) — UX polish
9. **Social features** (Phase 3E) — growth & engagement

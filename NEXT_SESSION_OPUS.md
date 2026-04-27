# Next Session — Claude Opus Briefing
## Two Specs: Academic UI Redesign + DAO Requirements

---

## HOW TO USE THIS DOCUMENT

Paste everything from "OPUS PROMPT START" to "OPUS PROMPT END" as your opening message.
The next session will need to produce two specification documents only — no code, no repo exploration.
Estimated output: 2 long markdown specs (~1500–2500 lines combined).

---

---
# OPUS PROMPT START
---

You are designing two detailed specification documents for the **Chayolei Beis Dovid** platform — a Torah scholarship coordination system for a Chabad yeshiva network.

You have complete context below. Do NOT explore the repository or read any files. Everything you need is in this prompt.

Produce **Spec 1** and **Spec 2** as separate, complete markdown documents.

---

## PROJECT CONTEXT

### What This Is

A web platform for coordinating Torah scholarship across a yeshiva network. Students (talmidim) enroll in academic campaigns (mivtzaot), complete research assignments (masimot) and tasks (tafkidim), earn TMIM tokens as rewards, and build a reputation (madrega/rank). Faculty (officers) create campaigns, review submissions, and govern the institution via DAO voting.

The platform is Hebrew-first (RTL layout), but the spec documents you produce should be in English with Hebrew terms annotated where relevant.

### The Target Audience Problem

The current UI uses a cyberpunk dark theme (near-black background `#07060d`, neon cyan/gold/purple). This works for crypto-native users but is completely wrong for the actual audience: **yeshiva administrations, traditional Jewish philanthropists, university research offices, and academic grant committees**. These stakeholders need to see something that looks like a serious academic institution — not a blockchain gaming app. The redesign must preserve 100% of existing functionality while projecting credibility, scholarship, and tradition.

---

## TECH STACK (do not change in either spec)

| Layer | Technology |
|---|---|
| Framework | SvelteKit 2 + Svelte 5 (runes: `$state`, `$derived`, `$effect`) |
| Styling | Tailwind CSS v4 (uses `@theme` block, not `tailwind.config.js`) |
| State | Class-based `AppStore` singleton (`app`) with `$state` arrays |
| Auth | Firebase Custom Auth (wallet signature → custom token) |
| Database | Firestore (real-time via `onSnapshot`) |
| Blockchain | Base Sepolia (ethers.js v6), 4 deployed contracts |
| Language | TypeScript strict throughout |
| Layout | RTL Hebrew, fixed sidebar + top bar |

---

## CURRENT DOMAIN MODEL

### Ranks (Madregot) — 10 levels

| Key | Hebrew | English | Tier | Voting Power | Reward Multiplier | TMIM to reach |
|---|---|---|---|---|---|---|
| `turai` | טוראי | Private | enlisted | 1 | 1.0× | 0 |
| `rav_turai` | רב טוראי | Corporal | enlisted | 2 | 1.2× | 200 |
| `samal` | סמל | Sergeant | nco | 5 | 1.5× | 800 |
| `samal_rishon` | סמ"ר | Staff Sergeant | nco | 8 | 2.0× | 2,000 |
| `rav_samal` | רס"מ | Master Sergeant | nco | 12 | 2.5× | 5,000 |
| `segen` | סגן | Lieutenant | officer | 18 | 3.0× | 10,000 |
| `seren` | סרן | Captain | officer | 25 | 4.0× | 20,000 |
| `rav_seren` | רב סרן | Major | officer | 35 | 5.0× | 40,000 |
| `sgan_aluf` | סגן אלוף | Lt. Colonel | officer | 45 | 7.0× | 75,000 |
| `aluf` | אלוף | General | officer | 60 | 10.0× | 150,000 |

Tiers: `enlisted` (ranks 1–2) | `nco` (ranks 3–5) | `officer` (ranks 6–10)

### Core Entities & TypeScript Types

```typescript
// Talmid (Student)
interface Talmid {
  id: string;
  shem: string;               // Hebrew name
  rank: Rank;
  track: 'נגלה' | 'חסידות' | 'תמים';  // learning track
  makomId: string;            // location
  walletAddress?: string;
  tokenBalance: number;
  totalTokensEarned: number;
  peerReviewsGiven: number;
  peerReviewsReceived: number;
  papersPublished: number;
  votingPower: number;
  tafkidimCompleted: number;
  chavrusaId: string | null;
  shiurGroupId: string | null;
  nirashemAt: string;         // enrollment date
  isOnline: boolean;
}

// Makom (Location/Campus)
interface Makom {
  id: string; name: string; city: string; country: string;
  talmidimCount: number; activeMivtzaot: number;
}

// Mivtza (Academic Campaign)
type MivtzaType = 'course' | 'research' | 'publication' | 'chaburah';
type MivtzaCategory = 'nigleh' | 'chassidus' | 'halacha' | 'machshava' | 'kabbalah';
interface Mivtza {
  id: string; shem: string; description: string;
  type: MivtzaType; category: MivtzaCategory;
  creatorId: string; locationId: string; isGlobal: boolean;
  status: 'draft' | 'active' | 'in_progress' | 'completed' | 'archived';
  tokenAllocation: number; tokensUsed: number;
  enrolledIds: string[]; masimotCount: number;
  deadline?: string; topics: string[];
  publicationType?: 'digital_sefer' | 'printed_book' | 'research_journal' | 'source_anthology';
  researchQuestion?: string;
}

// Masima (Research Assignment)
type MasimaType = 'lecture_notes' | 'research_paper' | 'chapter_draft' | 'source_analysis' | 'peer_review' | 'presentation';
type MasimaStatus = 'open' | 'in_progress' | 'submitted' | 'in_review' | 'revision_requested' | 'approved' | 'published';
interface Masima {
  id: string; shem: string; description: string;
  mivtzaId: string; type: MasimaType;
  assigneeId?: string; reviewerId?: string;
  status: MasimaStatus;
  tokenAllocation: number; deadline?: string;
  contentUrl?: string; submissionNotes?: string;
  reviewCount: number; averageRating?: number;
}

// Tafkid (Sub-task)
type TafkidType = 'write' | 'review' | 'research' | 'present' | 'edit' | 'source_collection';
interface Tafkid {
  id: string; shem: string; description: string;
  masimaId: string; mivtzaId: string; assigneeId?: string;
  type: TafkidType;
  status: 'todo' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'critical';
  tokenReward: number;
  submissionNotes?: string;
}

// PeerReview
interface PeerReview {
  id: string; masimaId: string;
  reviewerId: string; authorId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comments: string; suggestions: string[];
  status: 'pending' | 'submitted' | 'acknowledged';
  tokensEarned: number;
}

// Treasury (global singleton)
interface Treasury {
  totalDonated: number; totalTmimMinted: number;
  totalTmimDistributed: number; totalTmimRedeemed: number;
  currentBalance: number; tmimCirculating: number;
}

// Donation
interface Donation {
  id: string; donorName: string; donorWallet?: string;
  amount: number; tmimMinted: number;
  makomId?: string; mivtzaId?: string; message?: string;
}
```

---

## CURRENT UI — ALL PAGES

### Layout
- **Fixed sidebar** (left in RTL) — logo, nav links, user identity, rank insignia
- **Top bar** — page title, breadcrumb, search, wallet connect button
- **Main content area** — right of sidebar

### Pages & Routes

| Route | Hebrew Title | What It Does |
|---|---|---|
| `/` | בית המדרש | Dashboard: welcome card, seder schedule, my masimot, activity feed, active mivtzaot, online talmidim |
| `/mivtzaot` | מבצעים | Campaign list: filterable by status/category/type, search, progress bars, enroll button |
| `/mivtzaot/new` | מבצע חדש | Create campaign form (officer only) |
| `/mivtzaot/[id]` | Mivtza detail | Overview, masimot list, enrolled talmidim, progress, token allocation |
| `/masimot` | משימות | Assignment list: filter by status/type, search, claim/submit buttons |
| `/masimot/[id]` | Masima detail | Full detail, tafkidim sub-list, peer reviews, discussion thread, submit/review actions |
| `/tafkidim` | תפקידים | Task list with status filter, priority indicators |
| `/anash` | אנש | Roster: talmidim by rank/tier, shiur group hierarchy view, search |
| `/anash/[id]` | Talmid profile | Stats, token history, masimot, rank progress, chavrusa |
| `/review` | חדר המשפיע | Review queue: pending masimot (approve/request revision/reject), pending tafkidim |
| `/farbrengen` | פארבריינגען | Three tabs: live/upcoming farbrengens, maamarim list, activity stream |
| `/treasury` | אוצר | Treasury stats, donation history, redemption interface |
| `/settings` | הגדרות | Wallet connection, profile edit, user switcher (dev mode) |
| `/signup` | הרשמה | Wallet sign-in flow (nonce → signature → Firebase custom token) |

### Components

| Component | Purpose |
|---|---|
| `Sidebar.svelte` | Fixed nav, flame logo, collapsible |
| `TopBar.svelte` | Page header, wallet connect button |
| `RankInsignia.svelte` | SVG flame insignia per rank tier (triple/double flame → menorah → candle) |
| `RankBadge.svelte` | Inline rank pill, tier-colored |
| `TalmidAvatar.svelte` | Hebrew initial avatar + online dot |
| `StatusBadge.svelte` | Colored status pill |
| `ProgressBar.svelte` | Gold/sapphire/emerald variants |
| `TokenDisplay.svelte` | TMIM balance with icon |
| `Toast.svelte` | Notification toasts (success/error/info + optional link) |
| `PeerReviewCard.svelte` | Star rating + comments card |
| `DiscussionThread.svelte` | Nested discussion display |
| `LocationBadge.svelte` | Makom badge |
| `ConfirmDialog.svelte` | Modal confirmation dialog |
| `LoadingOverlay.svelte` | Full-screen loading |
| `EmptyState.svelte` | Empty state with icon + message |

---

## CURRENT SMART CONTRACTS — BASE SEPOLIA

### Deployed Addresses

| Contract | Address | Purpose |
|---|---|---|
| TMIMToken | `0x1A66CeE19C53956022f01842043d79d594BFb8E5` | ERC-20, 0 decimals |
| ChayoleiRegistry | `0xFA9Da3852829B3Fd94F05cFd7C160127980242fa` | On-chain identity/ranks |
| MasimaRewards | `0xe4db2dD3fb79F92dCf2FFd856B4d18F83333b20C` | Approval → mint TMIM |
| ChayoleiTreasury | `0x3DB8a8A81f75eA2bAbDb481203AE4Db6C4dDA420` | Donations, redemptions |

Network: Base Sepolia (Chain ID 84532). Deployer: `0x41521c37dB02956185437C4e2461261A321073E1`.

### Current Token State (as of session date)
- Total supply: **10,000 TMIM** (test mint only — no user has earned tokens yet)
- Redemption rate: currently 1000 bps = **$1.00/TMIM** (may need correction to $0.10)
- All 10,000 TMIM held by deployer wallet

### Contract ABIs (minimal, what matters for DAO spec)

```solidity
// TMIMToken — ERC-20, 0 decimals
function mint(address to, uint256 amount, string calldata reason) external // MINTER_ROLE only
function burn(address from, uint256 amount) external                        // BURNER_ROLE only
function balanceOf(address) external view returns (uint256)
function totalSupply() external view returns (uint256)
function hasRole(bytes32 role, address account) external view returns (bool)
function grantRole(bytes32 role, address account) external                  // DEFAULT_ADMIN_ROLE only
event TokensMinted(address indexed to, uint256 amount, string reason)
event TokensBurned(address indexed from, uint256 amount)

// ChayoleiRegistry
function register(address wallet, bytes32 nameHash) external
function getRank(address wallet) external view returns (uint8)
function promote(address chayal) external  // officer only
event Registered(address indexed wallet)
event Promoted(address indexed wallet, uint8 newRank)

// MasimaRewards
function approveMasima(bytes32 masimaIdHash, address assignee, uint256 reward) external // APPROVER_ROLE
function approveTafkid(bytes32 tafkidIdHash, address assignee, uint256 reward) external // APPROVER_ROLE
function isMasimaApproved(bytes32) external view returns (bool)
uint256 public totalRewardsDistributed

// ChayoleiTreasury
function receiveETH() external payable
// MINTER_ROLE + BURNER_ROLE granted — donation/redemption logic not yet fully implemented
```

### Role Configuration (current)
- Deployer has `MINTER_ROLE` + `DEFAULT_ADMIN_ROLE` on TMIMToken
- MasimaRewards has `MINTER_ROLE` on TMIMToken
- Treasury has `MINTER_ROLE` + `BURNER_ROLE` on TMIMToken
- Deployer has `APPROVER_ROLE` on MasimaRewards

---

## WHAT DOES NOT EXIST YET

- No DAO governance contract (no proposals, no voting, no on-chain execution)
- No treasury governance (donations/redemptions exist in Solidity but not fully wired)
- No on-chain rank promotion (ChayoleiRegistry has the function but no UI)
- No governance UI (no `/governance` page)
- No tokenomics whitepaper or economic model document
- No academic-themed UI (current theme is cyberpunk dark)

---

## YOUR TASK

Write two complete specification documents.

---

# SPEC 1: ACADEMIC UI REDESIGN

## What to produce

A complete UI/UX specification for redesigning the visual theme of the Chayolei Beis Dovid platform to project academic credibility. Same SvelteKit/Tailwind stack, same pages, same components, same Hebrew RTL layout — **only the visual design changes**.

## Design direction

**Audience:** Yeshiva administrations, traditional Jewish philanthropists, university research offices, academic grant committees, rabbinical scholars.

**Feeling:** A serious academic institution. Think: Oxford/Cambridge academic portals, the Jewish Theological Seminary, Bar-Ilan University research systems, Responsa Project interfaces. Clean, legible, dignified. Torah scroll meets academic journal.

**Not:** Dark mode, neon, glowing effects, cyberpunk, gaming aesthetics. Nothing that looks like DeFi.

## Spec must include

### 1. Design Principles (5–7 named principles with rationale)
e.g. "Legibility over Atmosphere", "Tradition Signals Trust", etc.

### 2. Color System
- Full `@theme` block replacement for `src/app.css`
- Name every semantic token: background, surface, border, text, accent colors
- Specify exact hex values
- Define what replaces: gold/sapphire/emerald/crimson/purple accents
- Specify light vs dark mode decision (recommend one, justify it)
- How tier colors change (enlisted/nco/officer need new treatment)

### 3. Typography
- Font stack (Google Fonts or system fonts only — no paid fonts)
- Hebrew font recommendation for the RTL content
- Type scale: headings h1–h4, body, caption, label, mono
- Specify font weights used
- Letter spacing / line height recommendations for Hebrew text

### 4. Rank Insignia Redesign
Currently: SVG flame motifs (triple flame, double flame, menorah, candle)
Redesign: New visual language for rank that fits academic context
- Describe the new insignia concept for each tier (enlisted/nco/officer)
- Could be: academic regalia-inspired (stripes, chevrons), Torah scroll motifs, olive branch/laurel variants, menorah variations in a formal register
- Specify colors per tier in the new palette
- Write the SVG path logic description (not the actual SVG — describe the shapes/structure)

### 5. Component-by-Component Redesign Guide

For each of the 15 components, specify:
- Background / border / text color changes (using new theme tokens)
- Any structural changes (e.g. add/remove shadows, change border radius)
- Interaction states (hover, focus, active)
- Special notes

Components: Sidebar, TopBar, RankInsignia, RankBadge, TalmidAvatar, StatusBadge, ProgressBar, TokenDisplay, Toast, PeerReviewCard, DiscussionThread, LocationBadge, ConfirmDialog, LoadingOverlay, EmptyState

### 6. Page-by-Page Layout Notes

For each of the 14 pages/routes, note any layout or content presentation changes beyond color:
- Dashboard — how does the welcome/stats section look academic?
- Mivtzaot list — how are campaigns presented (research program cards vs neon panels)?
- Review page — what does a formal academic review queue look like?
- Treasury — how does financial data appear in an institutional context?
- etc.

### 7. Motion & Interaction
- Animation philosophy (minimal vs. none)
- Transition durations
- What replaces the current `.scan-line` / `.glow-*` effects
- Toast animation

### 8. Academic Credibility Signals
- Specific UI elements that signal institutional legitimacy to traditional funders
- e.g. formal header treatment, seal/crest concept for the logo, citation-style attribution for maamarim, publication-style metadata display for masimot

### 9. Full `src/app.css` Replacement
Write the complete new `@theme` block and base styles. This is the primary deliverable — the implementation session will use this directly.

---

# SPEC 2: DAO REQUIREMENTS

## What to produce

Three integrated documents in one spec file:

### 2A. Economic Model & Tokenomics

**TMIM Token fundamentals:**
- Token name: TMIM (תמים — "complete/pure", a title for a Tomchei Temimim student)
- ERC-20, 0 decimals (1 TMIM = 1 whole token)
- Current redemption rate: $0.10 USD / TMIM (note: contract currently set to $1.00 — this needs correction)
- Current supply: 10,000 TMIM (test only), no user has earned tokens yet

**Design the following:**

1. **Issuance model** — How are TMIM created?
   - Task completion rewards (masima approved → mint to assignee)
   - Peer review rewards (review submitted + acknowledged → small mint to reviewer)
   - Donation conversion (donor sends ETH/USDC → TMIM minted at conversion rate)
   - Promotion bonuses (rank up → milestone mint)
   - DAO proposal execution (treasury can mint via governance)

2. **Reward amounts** — Specify baseline TMIM per action type:
   - Per masima type (research_paper vs lecture_notes vs chapter_draft, etc.)
   - Per tafkid type (write vs review vs research vs edit, etc.)
   - Per peer review given
   - Per rank promotion milestone
   - How the rank multiplier applies (already built: 1.0× turai → 10.0× aluf)

3. **Supply controls** — How do you prevent inflation?
   - Max monthly issuance caps
   - Campaign budget limits (mivtza tokenAllocation as hard cap)
   - Treasury reserve ratio requirements
   - Emergency pause mechanism (already exists in TMIMToken via AccessControl)

4. **Redemption & circulation** — How does TMIM have value?
   - Redemption path: TMIM → USDC via ChayoleiTreasury at $0.10/TMIM
   - Redemption eligibility (minimum hold time? minimum rank?)
   - Use cases beyond redemption: governance voting weight, reputation display, rank progression gate

5. **Donation economics** — How do donations flow?
   - Donor sends ETH or USDC to ChayoleiTreasury
   - Treasury mints TMIM to donor at conversion rate (receipt tokens vs. spending tokens — are they the same?)
   - Earmarking: donor can direct funds to a specific makom or mivtza
   - What percentage goes to operational reserve vs. direct reward distribution?

6. **Long-term supply trajectory** — Model a 3-year projection:
   - Assumptions: N active talmidim, M masimot/month, average token allocation
   - Expected annual issuance at current reward levels
   - Break-even point where treasury reserves support all redemptions

### 2B. Smart Contract Specification

Design the new contracts needed. Existing contracts stay unchanged (extend, don't replace).

**New Contract 1: ChayoleiGovernance.sol**

Specify:
- Inheritance: OpenZeppelin Governor pattern or custom?
- Proposal types (categorize what can be proposed):
  - Mivtza funding allocation (treasury → mivtza token budget)
  - Redemption rate change (update TMIMToken.redemptionRateBps)
  - Emergency pause/unpause TMIMToken
  - Treasury withdrawal to external address
  - Grant MINTER_ROLE to new contract
  - Parameter updates (reward amounts, rank requirements)
- Voting mechanics:
  - Who can propose? (minimum TMIM balance or minimum rank)
  - Voting power formula: `tokenBalance × rankVotingPower`
  - Quorum: minimum % of circulating supply
  - Voting period: blocks or time-based
  - Timelock: delay between passed proposal and execution
- Snapshot timing (use TMIMToken for balance snapshots at proposal creation)
- Full interface (all functions, events, structs)
- Constructor parameters
- Access control roles

**New Contract 2: GovernanceTreasury.sol** (upgrade to ChayoleiTreasury)

Specify:
- Payment streams: `createStream(recipient, totalAmount, durationDays)` — vesting for contributors
- Multi-sig requirement for large withdrawals (above threshold X)
- Integration with ChayoleiGovernance (only governance can execute large treasury ops)
- Donation receipt: accept ETH + USDC, mint TMIM at rate, emit event
- Redemption: burn TMIM, send USDC at rate, check reserve ratio
- Full interface

**Extend MasimaRewards.sol:**

New functions to add:
- `approveWithMemo(bytes32 id, address assignee, uint256 reward, string calldata memo)` — richer event data
- `batchApprove(bytes32[] calldata ids, address[] calldata assignees, uint256[] calldata rewards)` — gas efficient
- Event: `RewardDistributed(bytes32 indexed id, address indexed assignee, uint256 reward, string memo, uint256 blockTimestamp)`

**Deployment & upgrade path:**
- Specify constructor arguments for each new contract
- Specify `grantRole` calls needed post-deployment
- Specify order of operations

### 2C. DAO UI Specification

New routes and components needed. All use the academic theme from Spec 1.

**New Route: `/governance`** — Main governance page
- Tab 1: Active Proposals — voting cards with progress bars
- Tab 2: Past Proposals — filterable history (passed/failed/executed)
- Tab 3: Create Proposal — form (officer/high-TMIM-holder only)
- Proposal card must show: title, type, proposer, voting end time, for/against/abstain bars, quorum indicator, your vote status, execute button (if passed + timelock elapsed)

**New Route: `/governance/[id]`** — Proposal detail
- Full description
- Voting breakdown (who voted what — aggregated by rank tier, not individual)
- Calldata preview (human-readable "this proposal will: change redemption rate to $0.05")
- Vote button (cast/change vote during active period)
- Execution button (anyone can call after timelock)

**New Route: `/treasury`** — Enhance existing treasury page
- Current stats dashboard (total donated, TMIM circulating, reserve ratio)
- Donation form (connect wallet → specify amount + optional earmark)
- Redemption form (enter TMIM amount → see USDC received → confirm)
- Payment streams table (my streams, claimable amounts, claim button)
- Governance-controlled parameters display (current rates, last changed)

**New Component: `ProposalCard.svelte`**
- Specify all props
- Specify visual states: active/passed/failed/executed/pending-execution
- For/against/abstain progress bar treatment in academic theme

**New Component: `VotingPower.svelte`**
- Shows user's current voting power = tokenBalance × rankVotingPower
- Breakdown: "X TMIM × Y rank multiplier = Z votes"

**New Component: `TreasuryStats.svelte`**
- Reserve ratio gauge
- Circulating supply bar
- Recent transactions list

**Governance flow UX narrative:**
Walk through the complete user journey for each proposal type from first click to on-chain execution. Identify every loading state, confirmation dialog, and error case.

**Integration with existing pages:**
- Dashboard: add governance summary widget (active proposals count, your voting power)
- Talmid profile `/anash/[id]`: add voting history tab
- Settings: add delegation option (delegate voting power to another talmid)

---

## OUTPUT FORMAT

Produce two documents:
- `SPEC_1_ACADEMIC_UI.md`
- `SPEC_2_DAO_REQUIREMENTS.md`

Each must be complete and implementation-ready. The implementation session will write code directly from these specs without needing to ask clarifying questions. Assume the implementer is a senior SvelteKit/Solidity developer who does not know this domain — every domain term should be defined once, every UI element should be fully described, every contract function should have a complete signature.

---
# OPUS PROMPT END
---

## Notes for after the specs are written

### Redemption rate correction needed
The deployed TMIMToken has `redemptionRateBps = 1000` which equals **$1.00/TMIM**.
The intended rate is **$0.10/TMIM = 100 bps**.
Fix: call `TMIMToken.setRedemptionRate(100)` from the deployer wallet before any public use.
Script: `contracts/scripts/grant-roles.ts` pattern — add `tmim.setRedemptionRate(100)`.

### Contract deployment sequence for DAO
1. Deploy `ChayoleiGovernance.sol` (needs: TMIMToken address, ChayoleiRegistry address)
2. Deploy `GovernanceTreasury.sol` (needs: TMIMToken, USDC, governance address)
3. `TMIMToken.grantRole(MINTER_ROLE, governanceAddress)`
4. `TMIMToken.grantRole(MINTER_ROLE, newTreasuryAddress)`
5. `TMIMToken.grantRole(BURNER_ROLE, newTreasuryAddress)`
6. `ChayoleiRegistry.grantRole(GOVERNANCE_ROLE, governanceAddress)`
7. Transfer any ETH/USDC from old treasury to new treasury

### Files the implementation session WILL need to read
(Keep this list short — only what changes)
- `src/app.css` — full replacement (Spec 1 provides new content)
- `src/lib/components/RankInsignia.svelte` — SVG redesign
- `src/lib/components/Sidebar.svelte` — color/layout update
- `contracts/contracts/` — 2 new files to create
- `src/routes/governance/` — new directory, 2 new files
- `src/routes/treasury/+page.svelte` — enhancement

### Files that do NOT need to be read
Everything in `src/lib/stores/`, `src/lib/types/`, all existing API routes,
all other existing route pages — they keep the same logic, only color tokens change.

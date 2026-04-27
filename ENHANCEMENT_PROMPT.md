# Chayolei Beis Dovid — Enhancement Prompt (for Sonnet)

## Context

You are modifying an existing SvelteKit 2 + Svelte 5 + Tailwind CSS v4 application at `C:\code\vanguard\chayolei`. The app currently functions as a yeshiva learning management system with seforim (tractates), perakim (chapters), and shiurim (lessons). Students study existing texts and get reviewed by mashpiim.

Read `SESSION_NOTES.md` for the full file list and current state. Read `CHAYOLEI_BEIS_DOVID_YESHIVA_UI_PROMPT.md` for the original spec. Read every existing source file before modifying it.

**Do not change the tech stack.** SvelteKit 2, Svelte 5 runes, Tailwind CSS v4, TypeScript strict, class-based AppStore — all stay. The design system (sacred night / ancient light aesthetic, color tokens) stays. RTL Hebrew layout stays.

---

## What Is Changing — The Big Picture

The platform is evolving from a **passive study tracker** ("learn this tractate, submit, get reviewed") into a **research-and-publication network** with peer review, multi-location cohorts, and DAO-based token economics. The brand remains **Chayolei Beis Dovid / Tomchei Tmimim**, but the platform now serves a broader mission: students don't just consume Torah — they **produce original scholarship**, review each other's work, and earn tokens that have real economic value through a DAO treasury funded by supporters.

### Core Shifts

| Before | After |
|--------|-------|
| Study existing seforim | Research groups that **produce** papers, books, and original Torah content |
| Individual shiur submissions | **Peer review** — students comment on, critique, and improve each other's work |
| Single yeshiva hierarchy | **Multi-location network** — local groups connect into global cohorts and streams |
| Yeshiva madrega ranks (Talmid Chadash → Rosh Yeshiva) | **Israeli IDF ranks** (Turai → Aluf) |
| Hasmada points (display only) | **DAO tokens (TMIM)** — earned, held in crypto wallets, redeemable for cash/project funding |
| No financial layer | **Supporter donations** flow into the DAO treasury, fund student tokens and projects |

---

## 1. Rank System — Replace Madregot with IDF Ranks

### Remove the Current System

The current `Madrega` type and `MADREGA_META` in `src/lib/types/index.ts` uses yeshiva titles (תלמיד חדש, בחור, אברך, משפיע, ראש ישיבה). **Replace entirely** with Israeli military ranks.

### New Rank System

```typescript
const RANKS = [
  'turai',           // טוראי — Private (new student)
  'rav_turai',       // רב טוראי — Corporal (active student)
  'samal',           // סמל — Sergeant (committed student)
  'samal_rishon',    // סמ"ר — Staff Sergeant (senior student)
  'rav_samal',       // רס"מ — Sergeant First Class (advanced researcher)
  'segen',           // סגן — Second Lieutenant (junior instructor)
  'seren',           // סרן — Captain (instructor / mashpia)
  'rav_seren',       // רב סרן — Major (senior instructor)
  'sgan_aluf',       // סגן אלוף — Lt. Colonel (department head)
  'aluf',            // אלוף — General (rosh yeshiva / network leader)
] as const;

type Rank = typeof RANKS[number];
```

### Rank Metadata

```typescript
const RANK_META: Record<Rank, {
  shem: string;         // Hebrew display name
  transliteration: string;
  tier: 'enlisted' | 'nco' | 'officer';
  votingPower: number;
  multiplier: number;
  tokensRequired: number;  // TMIM tokens needed to reach this rank
  color: string;
}> = {
  turai:         { shem: 'טוראי',      transliteration: 'Turai',       tier: 'enlisted', votingPower: 1,  multiplier: 1.0, tokensRequired: 0,     color: '#94a3b8' },
  rav_turai:     { shem: 'רב טוראי',   transliteration: 'Rav Turai',   tier: 'enlisted', votingPower: 2,  multiplier: 1.2, tokensRequired: 200,   color: '#94a3b8' },
  samal:         { shem: 'סמל',        transliteration: 'Samal',       tier: 'nco',      votingPower: 5,  multiplier: 1.5, tokensRequired: 800,   color: '#34d399' },
  samal_rishon:  { shem: 'סמ"ר',       transliteration: 'Samal Rishon',tier: 'nco',      votingPower: 8,  multiplier: 2.0, tokensRequired: 2000,  color: '#34d399' },
  rav_samal:     { shem: 'רס"מ',       transliteration: 'Rav Samal',   tier: 'nco',      votingPower: 12, multiplier: 2.5, tokensRequired: 5000,  color: '#5b8ff5' },
  segen:         { shem: 'סגן',        transliteration: 'Segen',       tier: 'officer',  votingPower: 18, multiplier: 3.0, tokensRequired: 10000, color: '#5b8ff5' },
  seren:         { shem: 'סרן',        transliteration: 'Seren',       tier: 'officer',  votingPower: 25, multiplier: 4.0, tokensRequired: 20000, color: '#f5c842' },
  rav_seren:     { shem: 'רב סרן',     transliteration: 'Rav Seren',   tier: 'officer',  votingPower: 35, multiplier: 5.0, tokensRequired: 40000, color: '#f5c842' },
  sgan_aluf:     { shem: 'סגן אלוף',   transliteration: "Sgan Aluf",   tier: 'officer',  votingPower: 45, multiplier: 7.0, tokensRequired: 75000, color: '#f5c842' },
  aluf:          { shem: 'אלוף',       transliteration: 'Aluf',        tier: 'officer',  votingPower: 60, multiplier: 10.0,tokensRequired: 150000,color: '#f5c842' },
};
```

### Tier Colors (updated)

| Tier | Color | Who |
|------|-------|-----|
| Officer (seren+) | Gold `#f5c842` | Instructors, mashpiim, rosh yeshiva |
| NCO (samal → rav_samal) + junior officer (segen) | Sapphire `#5b8ff5` | Advanced students, researchers, junior instructors |
| Enlisted (turai, rav_turai) | Zinc `#94a3b8` | New and active students |

### Insignia Component

Replace `MadregaInsignia.svelte` flame tiers with **IDF-style insignia**:
- **Enlisted**: Horizontal bars (1 bar = turai, 2 bars = rav turai)
- **NCO**: Chevrons pointing up (1 chevron = samal, 2 = samal rishon, 3 = rav samal)
- **Officer**: Falafel (olive leaf) clusters — 1 falafel = segen, 2 = seren, sword + falafel = rav seren, sword + wreath = sgan aluf, sword + wreath + star = aluf

Keep these as inline SVGs, same pattern as the current flame SVGs. Use tier colors.

### Rename Throughout

- `Madrega` → `Rank` everywhere (types, store, components, routes)
- `MadregaBadge` → `RankBadge`
- `MadregaInsignia` → `RankInsignia`
- `madrega` property on `Talmid` → `rank`
- `MADREGA_META` → `RANK_META`
- Update `tierColor()` in format.ts
- Update all mock data talmidim with appropriate ranks
- Update the `/anash` roster grouping (group by tier: officer / nco / enlisted)
- Update `/anash/[id]` profile to show rank progress to next rank

---

## 2. Research Groups & Content Production

This is the biggest conceptual change. The platform shifts from "study a sefer" to "produce scholarship."

### Rename Domain Concepts

| Current | New | Hebrew | Purpose |
|---------|-----|--------|---------|
| Sefer (tractate to study) | **Mivtza** (מבצע — Operation/Campaign) | מבצע | A course, research project, or publication effort created by an instructor |
| Perek (chapter) | **Masima** (משימה — Mission/Assignment) | משימה | A unit of work within the mivtza — could be a research paper, chapter draft, or study assignment |
| Shiur (lesson) | **Tafkid** (תפקיד — Role/Task) | תפקיד | An individual task: write a section, review a peer's work, prepare a source sheet, etc. |

### The Mivtza (Course/Research Campaign) Model

A Mivtza is created by an instructor (officer rank). It can be one of several types:

```typescript
type MivtzaType =
  | 'course'          // Standard course — lectures + assignments
  | 'research'        // Research group — original scholarship production
  | 'publication'     // Book/sefer production — collaborative writing
  | 'chaburah'        // Study circle — deep-dive group learning
  ;

interface Mivtza {
  id: string;
  shem: string;               // Hebrew name
  description: string;
  type: MivtzaType;
  category: 'nigleh' | 'chassidus' | 'halacha' | 'machshava' | 'kabbalah';
  creatorId: string;           // Must be officer rank
  locationId: string;          // Which makom (location) hosts this
  isGlobal: boolean;           // Available to all locations or local only
  status: 'draft' | 'active' | 'in_progress' | 'completed' | 'archived';
  tokenAllocation: number;     // TMIM tokens budgeted for this mivtza
  tokensUsed: number;
  enrolledIds: string[];       // Talmid IDs enrolled
  masimotCount: number;
  deadline?: string;
  topics: string[];
  // For publication type:
  publicationType?: 'digital_sefer' | 'printed_book' | 'research_journal' | 'source_anthology';
  // For research type:
  researchQuestion?: string;   // The guiding research question
  createdAt: string;
  updatedAt: string;
}
```

### The Masima (Assignment/Mission) Model

```typescript
interface Masima {
  id: string;
  shem: string;
  description: string;
  mivtzaId: string;
  type: 'lecture_notes' | 'research_paper' | 'chapter_draft' | 'source_analysis' | 'peer_review' | 'presentation';
  assigneeId?: string;
  reviewerId?: string;         // Assigned peer reviewer
  status: 'open' | 'in_progress' | 'submitted' | 'in_review' | 'revision_requested' | 'approved' | 'published';
  tafkidimCount: number;
  tokenAllocation: number;
  deadline?: string;
  // Content production fields:
  contentUrl?: string;         // Link to the produced document/paper
  submissionNotes?: string;
  // Peer review fields:
  reviewCount: number;         // How many peer reviews received
  averageRating?: number;      // 1-5 from peer reviews
  createdAt: string;
  updatedAt: string;
}
```

### The Tafkid (Task) Model

```typescript
interface Tafkid {
  id: string;
  shem: string;
  description: string;
  masimaId: string;
  mivtzaId: string;
  assigneeId?: string;
  type: 'write' | 'review' | 'research' | 'present' | 'edit' | 'source_collection';
  status: 'todo' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'critical';
  tokenReward: number;        // TMIM tokens earned on completion
  deadline?: string;
  submissionNotes?: string;
  createdAt: string;
}
```

### Peer Review System — NEW

This is a core feature. Students earn tokens not just for producing work, but for **reviewing each other's work**.

```typescript
interface PeerReview {
  id: string;
  masimaId: string;           // The masima being reviewed
  reviewerId: string;         // Who wrote the review
  authorId: string;           // Who wrote the original work
  rating: 1 | 2 | 3 | 4 | 5;
  comments: string;           // The review text
  suggestions: string[];      // Specific improvement suggestions
  status: 'pending' | 'submitted' | 'acknowledged';
  tokensEarned: number;       // Reviewer earns tokens for quality reviews
  createdAt: string;
}
```

**Token rewards for peer interaction:**
- Submitting a peer review: base reward (e.g. 50 TMIM)
- Review rated helpful by the author: bonus (e.g. 25 TMIM)
- Incorporating feedback from a review into your revision: reward for both parties (e.g. 30 TMIM each)
- Commenting on a discussion thread: small reward (e.g. 10 TMIM)

Add a `Discussion` type for threaded comments on any masima:

```typescript
interface Discussion {
  id: string;
  masimaId: string;
  authorId: string;
  parentId?: string;          // For threaded replies
  content: string;
  tokensEarned: number;
  createdAt: string;
}
```

### Updated Status Flow

**Masima (assignment):**
```
open → in_progress → submitted → in_review (peer review) → revision_requested → submitted → approved → published
```

The `in_review` step now involves **peer review** before instructor approval. The instructor sees both the work and the peer reviews when making a final decision.

**Tafkid (task):**
```
todo → in_progress → submitted → approved / rejected
```

### Updated Routes

Rename routes to match new domain:

| Old Route | New Route | Page |
|-----------|-----------|------|
| `/sfarim` | `/mivtzaot` | מבצעים — Campaign board (courses, research groups, publications) |
| `/sfarim/new` | `/mivtzaot/new` | מבצע חדש — Create new campaign |
| `/sfarim/[id]` | `/mivtzaot/[id]` | Campaign detail — tabs: משימות / תפקידים / חיילים / ביקורות (reviews) |
| `/perakim` | `/masimot` | משימות — All assignments |
| `/perakim/[id]` | `/masimot/[id]` | Assignment detail — now includes peer review section and discussion thread |
| `/shiurim` | `/tafkidim` | תפקידים — Task kanban / list |

### Mivtza Detail Page — New Tabs

The mivtza detail page (`/mivtzaot/[id]`) now has 4 tabs:

1. **משימות (Masimot)** — Assignment cards with status, assignee, review count, rating
2. **תפקידים (Tafkidim)** — All tasks across assignments
3. **חיילים (Chayalim)** — Enrolled students with their contribution stats
4. **ביקורות (Bikurot)** — Peer reviews dashboard: recent reviews, top reviewers, review quality metrics

### Masima Detail Page — New Sections

The masima detail page (`/masimot/[id]`) now includes:

1. **Assignment info** — description, materials, deadline, token allocation
2. **Submission area** — upload/link content, submission notes
3. **Peer Reviews section** — list of reviews received, average rating, individual review cards with comments and suggestions
4. **Discussion thread** — comment thread where any enrolled student can discuss
5. **Action buttons** — Submit / Request Review / Revise / Approve (instructor)

### Kanban Columns (Tafkidim page)

```
לביצוע     Todo         (zinc)
בביצוע     In Progress  (sapphire)
הוגש       Submitted    (purple)
אושר       Approved     (emerald)
```

---

## 3. Multi-Location Network

The platform serves **multiple physical locations** (mekomot) that connect into a global network.

### Location Model

```typescript
interface Makom {
  id: string;
  shem: string;              // e.g. "ירושלים", "ברוקלין", "מלבורן"
  transliteration: string;   // e.g. "Jerusalem", "Brooklyn", "Melbourne"
  country: string;
  timezone: string;
  memberCount: number;
  activeMivtzaot: number;
  coordinatorId: string;     // Local leader (officer rank)
  status: 'active' | 'forming' | 'inactive';
  createdAt: string;
}
```

### How Locations Work

- Each talmid belongs to a **primary makom** (add `makomId: string` to the Talmid type)
- Mivtzaot can be **local** (one makom) or **global** (open to all locations)
- Chavrutot (study pairs) can form **locally** (in-person) or **cross-location** (online)
- Global mivtzaot have a **stream** — a shared online lecture/shiur that multiple locations join
- The anash directory (`/anash`) gets a location filter dropdown
- The dashboard shows both local activity and global network stats

### Add to Talmid Type

```typescript
interface Talmid {
  // ... existing fields, but rename madrega → rank
  id: string;
  shem: string;
  rank: Rank;
  track: LearningTrack;
  makomId: string;            // NEW — which location
  walletAddress?: string;     // NEW — crypto wallet
  tokenBalance: number;       // NEW — TMIM balance
  totalTokensEarned: number;  // NEW — lifetime earnings
  peerReviewsGiven: number;   // NEW
  peerReviewsReceived: number;// NEW
  papersPublished: number;    // NEW
  // ... rest of existing fields
}
```

### Mock Data — Locations

Create 4 mock locations:

1. **ירושלים (Jerusalem)** — 12 members, main hub, 3 active mivtzaot
2. **ברוקלין (Brooklyn)** — 8 members, 2 active mivtzaot
3. **מלבורן (Melbourne)** — 5 members, 1 active mivtza
4. **לונדון (London)** — 3 members, forming

Distribute the 8 existing mock talmidim across these locations (mostly Jerusalem and Brooklyn). Add 2-3 more talmidim to fill out the network feel.

### Network Dashboard Addition

Add a "רשת (Network)" section to the main dashboard showing:
- Total locations, total chayalim, total active mivtzaot across the network
- A simple location list with member count and status dot
- Global mivtzaot highlighted with a globe icon

---

## 4. DAO & Token Economics

### Token: TMIM (תמים)

The platform token is **TMIM** (תמים). Students earn TMIM for all productive activity. TMIM is held in a crypto wallet and can be redeemed.

### How Students Earn TMIM

| Activity | Base Reward |
|----------|-------------|
| Complete a tafkid (task) | Set per task (10-200 TMIM) |
| Submit a masima (assignment) | Set per masima (50-500 TMIM) |
| Get masima approved by instructor | Bonus (100-1000 TMIM) |
| Submit a peer review | 50 TMIM |
| Peer review rated helpful | +25 TMIM bonus |
| Comment in discussion thread | 10 TMIM |
| Get paper published | 500-2000 TMIM |
| Daily learning streak (7+ days) | 20 TMIM/day bonus |

All rewards are multiplied by the student's rank multiplier.

### How Supporters Fund the DAO

Add a **supporter/donation concept**:

```typescript
interface Donation {
  id: string;
  donorName: string;
  donorWallet?: string;      // If crypto donation
  amount: number;            // USD equivalent
  tmimMinted: number;        // TMIM tokens minted from this donation
  makomId?: string;          // Designated to specific location, or null for general fund
  mivtzaId?: string;         // Designated to specific mivtza, or null
  message?: string;
  createdAt: string;
}

interface Treasury {
  totalDonated: number;       // Total USD received
  totalTmimMinted: number;
  totalTmimDistributed: number;
  totalTmimRedeemed: number;
  currentBalance: number;     // USD available
  tmimCirculating: number;
}
```

**Flow:**
1. Supporters donate to the Chayolei DAO (fiat or crypto)
2. Donations mint TMIM tokens into the DAO treasury
3. TMIM is distributed to students through mivtza allocations
4. Students earn TMIM by producing work, reviewing peers, participating
5. Students can redeem TMIM for: cash stipends, project funding, book printing costs, travel to farbrengens

### DAO Governance

Students vote on:
- Which mivtzaot to fund next
- How to allocate treasury funds
- Community proposals (chessed projects, events, new locations)
- Voting power = rank voting power * token holdings (weighted)

### UI Additions for DAO

**Wallet section in profile (`/anash/[id]`):**
- TMIM balance (large, gold number)
- Earning history (recent token transactions)
- Rank progress (tokens needed for next rank)
- Redeem button (future — just show the UI, no implementation needed)

**Treasury dashboard — NEW page (`/treasury`):**
- Total donated, TMIM in circulation, distributed, redeemed
- Recent donations list
- Fund allocation by mivtza (pie chart or bar — use simple CSS, no chart library)
- "Support Chayolei" section with wallet address (mock)

**Add to sidebar nav:**
```
◆  אוצר (Treasury)    (/treasury) [shows TMIM balance badge]
```

**Dashboard additions:**
- Show user's TMIM balance in the welcome card
- Show DAO treasury summary (total funded, active mivtzaot funded)

---

## 5. Updated Mock Data

### Mivtzaot (replacing Sfarim) — 5 campaigns

1. **סוגיות בברכות** (Sugyot in Brachos) — type: `course`, category: `nigleh`, local to Jerusalem, 30K TMIM allocated
   - 3 masimot: source analysis assignments on different sugyot
   - Standard course with lectures and homework

2. **מחקר: משנת הרב קוק** (Research: The Teachings of Rav Kook) — type: `research`, category: `machshava`, global, 50K TMIM allocated
   - Research question: "How does Rav Kook's concept of sacred and secular integrate with Chassidic thought?"
   - 4 masimot: literature review, comparative analysis, original thesis, peer review round
   - Top students produce original papers

3. **ספר חסידות חב"ד — מבוא** (Chabad Chassidus Introductory Sefer) — type: `publication`, category: `chassidus`, global, 80K TMIM allocated
   - publicationType: `digital_sefer`
   - 5 masimot: each student writes a chapter on an assigned topic from Tanya/Maamarim
   - Peer review required before publication

4. **חבורת קבלה: עץ חיים** (Kabbalah Chaburah: Eitz Chaim) — type: `chaburah`, category: `kabbalah`, local to Brooklyn, 20K TMIM allocated
   - Weekly deep-dive study circle
   - 2 masimot: summary papers after each section

5. **שולחן ערוך יומי** (Daily Shulchan Aruch) — type: `course`, category: `halacha`, global, 15K TMIM allocated
   - Structured halacha study with assignments
   - 3 masimot: halacha summaries and practical application papers

### Peer Reviews — 8 mock reviews

Create 8 `PeerReview` objects distributed across the masimot, showing the peer review system in action. Include varied ratings (3-5), substantive comments, and some marked as `acknowledged`.

### Discussions — 12 mock comments

Create 12 `Discussion` entries across 3-4 masimot showing threaded academic discourse.

### Donations — 5 mock donations

Show a mix of crypto and fiat donations, some designated to specific locations or mivtzaot.

### Treasury

Set up a mock treasury showing realistic numbers for a small but growing network.

---

## 6. Updated AppStore

### Rename All References

In `src/lib/stores/app.svelte.ts`:

- `sfarim` → `mivtzaot`
- `perakim` → `masimot`
- `shiurim` → `tafkidim`
- `getSefer()` → `getMivtza()`
- `getPerek()` → `getMasima()`
- `getShiur()` → `getTafkid()`
- `getSeferPerakim()` → `getMivtzaMasimot()`
- `getPerekShiurim()` → `getMasimaTafkidim()`
- `getSeferProgress()` → `getMivtzaProgress()`
- Add: `mekomot` state, `peerReviews` state, `discussions` state, `donations` state, `treasury` state
- Add: `getMakomTalmidim(makomId)`, `getMasimaPeerReviews(masimaId)`, `getMasimaDiscussions(masimaId)`
- Add: `currentMakom` derived from `currentUser.makomId`

### New Derived State

```typescript
networkStats = $derived({
  totalLocations: this.mekomot.filter(m => m.status === 'active').length,
  totalChayalim: this.talmidim.length,
  totalMivtzaot: this.mivtzaot.filter(m => m.status !== 'draft').length,
  tmimCirculating: this.treasury.tmimCirculating,
  totalPeerReviews: this.peerReviews.length,
});
```

---

## 7. Format Utilities Updates

In `src/lib/utils/format.ts`:

- `formatHasmada()` → `formatTmim()` — format TMIM token amounts
- `formatZchus()` → remove or repurpose
- Add `formatMivtzaType(type: MivtzaType): string` — returns Hebrew label
- Add `formatMasimaType(type: string): string`
- Update `statusColor()` and `statusLabel()` for new statuses (`revision_requested`, `published`)
- `tierColor()` — update for `'enlisted' | 'nco' | 'officer'` tiers
- Add `rankLabel(rank: Rank): string` — returns Hebrew rank name from RANK_META

---

## 8. Component Updates

### `RankBadge.svelte` (was MadregaBadge)
- Shows rank Hebrew name + tier color pill
- Same pattern, just use `RANK_META` instead of `MADREGA_META`

### `RankInsignia.svelte` (was MadregaInsignia)
- SVG insignia based on IDF rank indicators (bars, chevrons, falafel/olive leaf)
- Tier-colored

### `TalmidAvatar.svelte`
- Add a small location indicator (2-letter country code or city abbreviation) below the avatar when viewing global contexts

### `PeerReviewCard.svelte` — NEW component
- Shows: reviewer avatar, rating (1-5 stars in gold), comment text, suggestions list, date
- Used in masima detail page

### `DiscussionThread.svelte` — NEW component
- Threaded comment list with reply capability (UI only for now)
- Each comment shows: author avatar, rank badge, content, TMIM earned indicator, timestamp
- Reply button and text input at bottom

### `TokenDisplay.svelte` — NEW component
- Displays TMIM balance with the token icon
- Gold color, mono font
- Optional size variants: `sm` (inline), `md` (card), `lg` (profile header)

### `LocationBadge.svelte` — NEW component
- Small pill showing location name (Hebrew), colored dot for status

---

## 9. New Pages

### `/treasury` — אוצר (Treasury) — NEW

- **Header**: Total DAO balance (TMIM and USD equivalent), total supporters
- **Fund allocation**: Simple bar/list showing how much TMIM is allocated to each active mivtza
- **Recent donations**: List of recent donations with donor name, amount, designation, message
- **Support section**: Mock wallet address, explanation of how donations work
- **Redemption stats**: How much TMIM has been redeemed by students

### Updated `/` Dashboard

Add these sections:
- TMIM balance in welcome card (next to rank)
- Network overview: locations count, total chayalim, global mivtzaot
- "Recent peer reviews on your work" section (if any)
- Replace "Active Sfarim" with "Active Mivtzaot" (showing type badges)

### Updated `/mivtzaot` (was /sfarim)

- Add type filter (course / research / publication / chaburah) as pills/tabs
- Add location filter dropdown
- Each card shows: type badge, category, location (if local) or "global" badge, enrollment count, peer review stats
- Research mivtzaot show the research question as subtitle

### Updated `/masimot/[id]` (was /perakim/[id])

This page is now significantly richer:
- **Submission section**: Content link/upload area, submission notes
- **Peer Review section**: Cards showing reviews received, average rating, individual reviews expandable
- **Discussion section**: Threaded comments
- **Review assignment**: Shows who is assigned as peer reviewer
- **Status includes**: `revision_requested` state with feedback from reviews

---

## 10. Sidebar Navigation Update

```
[Logo: flame icon + "חיילי בית דוד"]
[Subtitle: "תומכי תמימים"]

Main Nav:
  ⬡  בית המדרש      (/) — Dashboard
  ◈  מבצעים         (/mivtzaot) — Campaigns
  ⎇  משימות         (/masimot) — Assignments
  ▸  תפקידים        (/tafkidim) [badge: active count]
  ⬡  אנש            (/anash) — Directory
  ✓  חדר המשפיע     (/review) [badge: pending]
  ◆  התוועדות       (/farbrengen) [badge: unread]
  ₪  אוצר           (/treasury) [badge: TMIM balance]

Bottom:
  ⚙  הגדרות         (/settings)

[User card: name, rank, TMIM balance, location]
```

---

## 11. Implementation Order

1. **Types** (`src/lib/types/index.ts`) — New rank system, mivtza/masima/tafkid types, peer review, discussion, location, treasury, donation types. Remove old madrega/sefer/perek/shiur types.
2. **Mock Data** (`src/lib/stores/mock-data.ts`) — All new mock data: locations, updated talmidim with ranks and locations, mivtzaot, masimot, tafkidim, peer reviews, discussions, donations, treasury.
3. **Format Utils** (`src/lib/utils/format.ts`) — Rename and add new formatters.
4. **App Store** (`src/lib/stores/app.svelte.ts`) — Rename all state/derived/helpers, add new collections.
5. **Components** — Update RankBadge, RankInsignia, TalmidAvatar. Add PeerReviewCard, DiscussionThread, TokenDisplay, LocationBadge.
6. **Routes** — Rename sfarim→mivtzaot, perakim→masimot, shiurim→tafkidim. Update all page content.
7. **New routes** — `/treasury` page.
8. **Sidebar + Layout** — Update nav items, add treasury link, update user card.
9. **Dashboard** — Add network stats, TMIM balance, peer review summary.

---

## 12. What NOT to Do

- Do not add Firebase, wallet connection, or any backend integration — mock data only
- Do not add a charting library — use simple CSS bars if needed
- Do not change the tech stack (SvelteKit 2, Svelte 5 runes, Tailwind v4)
- Do not add an icon library — keep using Unicode glyphs and inline SVG
- Do not change the color palette or design aesthetic (sacred night / ancient light)
- Do not implement actual crypto transactions — just show the UI with mock data
- Do not remove the farbrengen or review pages — they still apply
- Keep all text in Hebrew with RTL layout
- Keep the existing design patterns: card-hover, glow effects, scan-line headers, tier-colored borders

---

## Summary of All Files to Touch

### Modify (every existing file needs updates):
- `src/lib/types/index.ts` — Complete rewrite of domain types
- `src/lib/stores/mock-data.ts` — Complete rewrite of mock data
- `src/lib/stores/app.svelte.ts` — Rename everything, add new state
- `src/lib/utils/format.ts` — Rename formatters, add new ones
- `src/lib/components/Sidebar.svelte` — New nav items, treasury link
- `src/lib/components/TopBar.svelte` — Updated breadcrumbs for new routes
- `src/lib/components/MadregaBadge.svelte` → rename to `RankBadge.svelte`
- `src/lib/components/MadregaInsignia.svelte` → rename to `RankInsignia.svelte`
- `src/lib/components/TalmidAvatar.svelte` — Add location indicator
- `src/routes/+layout.svelte` — Updated for new routes
- `src/routes/+page.svelte` — Dashboard additions
- `src/routes/sfarim/` → rename to `src/routes/mivtzaot/` (all 3 pages)
- `src/routes/perakim/` → rename to `src/routes/masimot/` (both pages)
- `src/routes/shiurim/+page.svelte` → move to `src/routes/tafkidim/+page.svelte`
- `src/routes/anash/+page.svelte` — Location filter, rank grouping
- `src/routes/anash/[id]/+page.svelte` — Wallet/token section, rank system
- `src/routes/review/+page.svelte` — Updated for masima/tafkid naming, peer review integration
- `src/routes/farbrengen/+page.svelte` — Minor naming updates
- `src/routes/settings/+page.svelte` — Show location in user switcher

### Create (new files):
- `src/lib/components/PeerReviewCard.svelte`
- `src/lib/components/DiscussionThread.svelte`
- `src/lib/components/TokenDisplay.svelte`
- `src/lib/components/LocationBadge.svelte`
- `src/routes/treasury/+page.svelte`

# Chayolei Beis Dovid — Online Yeshiva Platform UI
## Build Prompt for Claude Opus (New Session)

---

## 🎯 Mission

Build a **SvelteKit web application** for an online yeshiva modeled after **Yeshivas Tomchei Tmimim Lubavitch** — the flagship yeshiva of the Chabad-Lubavitch movement founded in 1897 by the Rebbe Rashab (Rabbi Sholom DovBer Schneersohn). The platform is named **Chayolei Beis Dovid** ("Soldiers of the House of David") — the spiritual title given to the Tmimim students by the Rebbe Rashab himself on Simchas Torah 1901.

The platform must embody the dual mission of Tomchei Tmimim: **rigorous Talmudic study (Nigleh)** fused with **deep Chassidic philosophy (Chassidus)** — the same revolutionary integration the Rebbe Rashab instituted in 1897, breaking from the convention of the time.

---

## 📖 The Soul of This Platform — What Makes Chayolei Beis Dovid Special

This is not just context. These concepts must **permeate the UX language, naming conventions, and mental models** of the platform.

### The Rebbe Rashab & Tomchei Tmimim

- **Rabbi Sholom DovBer Schneersohn** (1860–1920), 5th Lubavitcher Rebbe — known as "the Rambam of Chassidus" for his encyclopedic, systematic codification of Chassidic thought.
- On **15 Elul 5657 (1897)**, at his son's sheva brachos, he convened 50 leading rabbis and wealthy supporters and announced the founding of **Yeshivas Tomchei Tmimim**.
- Two days later he hand-selected the **first 18 talmidim** (students), entrusting them to the mashpia Reb Shmuel Gronem Esterman.
- **Innovation**: The first yeshiva to formally integrate the study of Chassidus (esoteric Torah) alongside traditional Nigleh (revealed Torah — Talmud, Halacha) in a structured, rigorous curriculum, taught with the same discipline as Gemara.
- Mission statement: *"To ensure the wholeness of the revealed and hidden parts of Torah."*
- He authored **Kuntres Eitz HaChaim** — the student handbook defining goals, schedule, conduct, prayer, and appearance for every Tamim.

### Chayolei Beis Dovid — The Name

- On **Simchas Torah 1901**, the Rebbe Rashab gave a foundational discourse to his students based on the Talmudic statement: *"Anyone going to war for Beis Dovid [the House of David] writes a divorce document for his wife."*
- He established that the **Tmimim are soldiers in a spiritual war** — fighting to preserve authentic Torah Judaism against the twin forces of secular Enlightenment (*Haskalah*) and atheist communism, both of which were actively dismantling Jewish life across Russia.
- The Rebbe Rashab himself was described as **"Chief of Staff of the Soldiers of the House of David"** — sending his students out as spiritual commandos to bring Jewish souls back to God.
- Students were called **Tmimim** (תמימים) — "the wholesome ones," "the pure ones," "the complete ones" — those who embody integrity in both revealed and hidden Torah.
- The name itself — **Tomchei Tmimim** — means "Supporters/Sustainers of the Wholesome Ones."

### The Mission in Practice

The Tmimim proved themselves historically: they were the ones who maintained secret Jewish schools (*cheder*) under Soviet communist persecution for 70 years, keeping the flame of Judaism burning when it was illegal and life-threatening to do so. The yeshiva relocated from Lubavitch → Kremenchuk (1918) → Warsaw → Shanghai (WWII) → New York — surviving every wave of persecution.

### Daily Schedule (the original Lubavitch structure — use for UX inspiration)

- **7:00 AM** — Morning Chassidus Seder (~1.5 hours)
- **~9:00** — Break / preparation for Shacharis (morning prayers)
- **12:00 PM** — Nigleh Seder begins (Talmud, Halacha)
- **7:00 PM** — Mincha (afternoon prayer)
- **8:00 PM** — Evening Chassidus Seder (until 9:30 PM)
- Total: ~4 hours Chassidus daily, ~8 hours Nigleh daily

### Key Texts & Concepts

- **Nigleh** — The "revealed" Torah: Gemara (Talmud), Rishonim, Shulchan Aruch (Halacha)
- **Chassidus** — The "hidden" Torah: Tanya (Alter Rebbe), maamarim (Chassidic discourses), Kabbalah
- **Maamar** — A formal Chassidic discourse delivered by the Rebbe
- **Farbrengen** — A Chassidic gathering: part learning, part storytelling, part singing — the heartbeat of Chabad community life
- **Mashpia** — Spiritual mentor/guide (like a mashgiach + Chassidic coach)
- **Rosh Yeshiva** — Dean / head of the yeshiva
- **Seder** — A structured learning session
- **Chavrusa** — Learning partner (paired study)
- **Shiur** — A Torah class/lesson
- **Daf** — A page of Gemara (Talmud tractate page)
- **Sicha** — A talk/address by the Rebbe (less formal than a maamar)
- **Hemshech** — A serial discourse (multi-part maamar)
- **Tamim** (sing.) / **Tmimim** (pl.) — A student of Tomchei Tmimim
- **Mashgiach** — Student conduct supervisor
- **Kvittel** — A written note submitted to a Rebbe requesting blessing/guidance

---

## 🏗️ Technical Foundation — Base This on the Vanguard UI

### Source Repo
**`C:\code\vanguard\vanguard-ui`**

This is a production-quality SvelteKit app. Inherit its entire architecture — adapt the domain, not the code quality.

### Stack (Do Not Change)

| Layer | Technology |
|-------|-----------|
| Framework | **SvelteKit 2 + Svelte 5** |
| Styling | **Tailwind CSS v4** with `@theme` tokens |
| State | **Svelte 5 runes** (`$state`, `$derived`) in a class-based AppStore |
| Types | **TypeScript** strict mode |
| Icons | Unicode glyphs + inline SVG (no icon library) |
| Routing | SvelteKit file-based routing |

### What to Inherit Architecturally

- **App shell**: Fixed sidebar + top bar + main content area (same `+layout.svelte` pattern)
- **Collapsible sidebar** with nav badges and user card at bottom
- **Design token system** via Tailwind `@theme` (just change the color palette)
- **Class-based reactive store** pattern (`app.svelte.ts` with `$state`/`$derived`)
- **Mock data module** (`mock-data.ts`) separate from the store
- **Component library**: Reusable components for status badges, progress bars, avatars, empty states
- **Path aliases**: `$lib`, `$components`, `$stores`, `$types`
- **Card-hover**, **glow**, **pulse**, **scan-line** CSS utilities from `app.css`
- **`card-hover`** pattern for interactive list items

---

## 🎨 Design System — From Cyberpunk to Sacred Fire

The Vanguard UI uses a **cyberpunk dark** aesthetic. This yeshiva platform uses a **sacred night / ancient light** aesthetic — deep darkness lit by the warmth of Torah flame. Think: the study hall at midnight, candlelight on Gemara, the glow of divine wisdom.

### New Color Palette

```css
@theme {
  /* Backgrounds — deep midnight study hall */
  --color-yeshiva-bg:         #07060d;   /* near-black, deep indigo-black */
  --color-yeshiva-surface:    #0e0c1a;   /* surface cards */
  --color-yeshiva-surface-2:  #141228;   /* hover states */
  --color-yeshiva-surface-3:  #1c1935;   /* tertiary surfaces */
  --color-yeshiva-border:     #241f3d;   /* default borders */
  --color-yeshiva-border-bright: #332c55; /* bright borders */

  /* Text */
  --color-yeshiva-text:       #e8e4f0;   /* warm near-white */
  --color-yeshiva-text-muted: #7068a0;   /* muted purple-grey */

  /* Primary accent — Torah fire gold */
  --color-yeshiva-gold:       #f5c842;   /* Ner Tamid eternal flame */
  --color-yeshiva-gold-dim:   #c49a18;   /* dimmed gold */

  /* Secondary — Chassidus sapphire (sky, heavens, Sefirat HaBinah) */
  --color-yeshiva-sapphire:   #5b8ff5;   /* Binah blue */
  --color-yeshiva-sapphire-dim: #3a6bd4;

  /* Tertiary — Nigleh emerald (revealed Torah, growth) */
  --color-yeshiva-emerald:    #34d399;

  /* Accent — Kabbalistic crimson (divine fire, Gevurah) */
  --color-yeshiva-crimson:    #e05c5c;

  /* Royalty — Ateres (crown) purple */
  --color-yeshiva-purple:     #a78bfa;

  /* Monospace font */
  --font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
}
```

### Tier Colors (replaces military rank colors)

| Tier | Color | Meaning |
|------|-------|---------|
| **Rosh Yeshiva / Mashpia** | Gold `#f5c842` | Senior leadership / spiritual guides |
| **Avreich** (married scholar) | Sapphire `#5b8ff5` | Advanced students |
| **Bochur** (unmarried student) | Emerald `#34d399` | Core students |
| **Guest / New Talmid** | Zinc `#94a3b8` | Onboarding |

### Status Colors

| Status | Color | Hebrew Concept |
|--------|-------|---------------|
| Active / Open | Gold | Ner Tamid — the eternal flame |
| In Progress | Sapphire | Learning in motion |
| In Review / Submitted | Purple | Awaiting the Rebbe's eye |
| Completed / Approved | Emerald | Torah fulfilled |
| Blocked | Crimson | Requires chazara (review) |
| Draft | Zinc | Not yet begun |

### Visual Language

- **Scan-line effect** on section headers (inherit from Vanguard's `.scan-line`)
- **Glow effects** renamed: `.glow-gold` (Torah flame), `.glow-sapphire` (Chassidus insight)
- Typography: Use Hebrew-script-inspired weight contrasts — bold titles in gold, body text in warm near-white
- Progress bars use gold/emerald gradient
- No sharp neon — warmth over coldness

---

## 🗺️ Domain Model — The Yeshiva Mental Model

This replaces Vanguard's "GitHub for IB teams" model with a **yeshiva learning management system**.

### Conceptual Mapping

| Vanguard | Chayolei Beis Dovid | Notes |
|----------|-------------------|-------|
| Bounty | **Sefer** (Tractate) | A Gemara tractate being learned as a group |
| Objective | **Perek** (Chapter) | A chapter within the Sefer |
| Task | **Shiur** (Lesson/Session) | An individual learning session or assignment |
| Commander Review | **Mashpia Review** | The mashpia reviews and approves chavrusa work |
| XP | **Hasmada Points** | Points for diligence/perseverance in learning |
| VGRD Token | **Zchus** (Merit) | Spiritual merit earned through learning |
| Rank | **Madrega** (Level) | Spiritual/scholarly level |
| Callsign | **Hebrew Name** (e.g. Menachem Mendel) | Or yeshiva nickname |
| Specialty | **Focus Track** | Nigleh-focused / Chassidus-focused / Balanced |
| Unit | **Shiur Group** | Chavrusa pair → Shiur class → Zal (study hall) |
| Bounty Board | **Learning Board** | Active tractates / courses |
| Review Page | **Mashpia's Room** | Where the mashpia reviews submitted work |
| Settings | **My Profile** | |
| Team | **Directory / Anash** | The community roster |
| Dashboard | **Beis Midrash** (Study Hall) | The main hub |

### Hierarchy

```
Yeshiva
  └── Zal (Study Hall)
        └── Shiur (Class Group, ~10-25 students)
              └── Chavrusa (Pair, 2 students)
```

### Learning Tracks

Every Tamim has a **primary track** (like specialty):
- **Nigleh Track** — Talmud, Rishonim, Shulchan Aruch
- **Chassidus Track** — Tanya, Maamarim, Kabbalistic texts
- **Balanced (Tomim) Track** — Full Tomchei Tmimim schedule

---

## 📋 Pages & Workflows

### 1. Beis Midrash Dashboard (`/`) — replaces Vanguard Dashboard

- **Welcome card**: Talmid's name (Hebrew), Madrega (level), Hasmada Points progress bar to next Madrega
- **Today's Seder schedule**: Morning Chassidus / Nigleh / Evening Chassidus with time indicators and status (upcoming / active / completed)
- **My Active Shiurim**: The talmid's current assignments (like "My Active Tasks")
- **Activity Feed**: Recent events — shiur completed, maamar shared, farbrengen announced, chavrusa paired
- **Active Sfarim**: Overview of all group tractates in progress with completion bars
- **Online B'nei Yeshiva**: Who is currently in the beis midrash (online)

### 2. Sfarim Board (`/sfarim`) — replaces Bounties

- Filterable list of tractates being learned (status: Active, In Progress, Completed, Draft)
- Search by name or topic tag (e.g. "Seder Nashim", "Moed", "Nezikin")
- Each card shows: Sefer name (in Hebrew + transliteration), description, creator (Rosh Yeshiva or Mashpia), Hasmada allocation, Perek count, deadline/zman, topic tags, progress bar

### 3. Sefer Detail (`/sfarim/[id]`) — replaces Bounty Detail

- Full header: Sefer name, Rosh Yeshiva, Hasmada allocation, stats, topic tags
- Progress: dapim (pages) completed vs total
- Three tabs: **Perakim** (Chapters) / **All Shiurim** / **Talmidim enrolled**
- Perakim tab: PR-style cards with status, assigned chavrusa, shiur pills
- Talmidim tab: Grid of enrolled students linking to their profiles

### 4. Perakim (`/perakim`) — replaces Objectives

- All chapters across all sfarim
- Status filter tabs
- PR-style list (○ open, ◐ in progress, ◑ in review, ● completed/learned)
- "Claim Perek" button for unassigned chapters (chavrusa checkout)

### 5. Perek Detail (`/perakim/[id]`) — replaces Objective Detail

- Breadcrumb → parent Sefer
- Description, assigned chavrusa, Shiur group, Hasmada allocation, deadline
- Progress circle with Shiur counts
- Action buttons: Claim / Submit for Chazara (review) / Awaiting Mashpia / Completed
- Shiur pipeline: priority, status, assigned talmid, zchus reward, deadline

### 6. My Shiurim (`/shiurim`) — replaces Tasks

- Toggle: My Shiurim / All Shiurim
- **Kanban board** (My Shiurim): 4 columns — To Learn (לִלְמוֹד) / Studying (לוֹמֵד) / Submitted for Chazara / Completed (נִגְמַר)
- **List view**: Filterable, shows Sefer/Perek breadcrumbs
- Each card: priority dot, shiur title, Sefer reference, Zchus reward, deadline, Start/Submit buttons

### 7. Anash Directory (`/anash`) — replaces Team

- **Roster view**: Grouped by Madrega (Rosh Yeshiva & Mashpiim / Avreichim / Bochurim / Guests)
  - Gold/Sapphire/Emerald/Zinc tier styling
- Each card: avatar (Hebrew initial), Madrega badge, focus track, stats (shiurim, hasmada, zchus)
- **Shiur Group view**: Nested structure (Yeshiva → Zal → Shiur group → Chavrusa pair)
- Shows leader at each level, member badges with online indicators

### 8. Talmid Profile (`/anash/[id]`) — replaces Soldier Profile

- Profile header with Madrega-colored border
- Hasmada progress bar to next Madrega
- Stats: Shiurim completed, Zchus earned, voting power in yeshiva governance, learning multiplier
- Assigned shiurim list
- Enrolled sfarim sidebar

### 9. Mashpia's Room (`/review`) — replaces Commander Review

- Two tabs: **Perakim to Approve** / **Shiur Submissions**
- Perakim tab: Expandable cards showing all shiurim, submission notes, review textarea, Approve/Request Chazara buttons
- Shiur Submissions tab: Individual shiur review with description, submitted notes/proof, Approve/Reject buttons
- Pending count badges

### 10. Farbrengen Feed (`/farbrengen`) — NEW (replaces planned Feed page)

- **Stream tab**: Chronological activity feed
  - Maamar shared, farbrengen announced, shiur completed, chavrusa formed, talmid promoted
  - System announcements highlighted
- **Maamarim tab**: Library of Chassidic discourses shared by mashpiim
  - Each maamar card: title (Hebrew), hemshech # if applicable, audio player (future), summary
- **Farbrengen tab**: Upcoming and past gatherings
  - Date, topic, recording link (future)

### 11. My Profile (`/settings`) — replaces Settings

- Switch active user for testing different perspectives (Rosh Yeshiva / Mashpia / Avreich / Bochur)

---

## 👥 Mock Data

### Talmidim (Students) — 8 people

| Hebrew Name | Madrega | Track | Status |
|------------|---------|-------|--------|
| Menachem Mendel | Rosh Yeshiva | Balanced | Online |
| Yosef Yitzchak | Mashpia | Chassidus | Online |
| Sholom DovBer | Avreich | Balanced | Offline |
| Levi Yitzchak | Avreich | Nigleh | Online |
| Moshe Yaakov | Bochur | Chassidus | Online |
| Dovid Yisroel | Bochur | Nigleh | Offline |
| Avraham Yehuda | Bochur | Balanced | Online |
| Nachman Aryeh | New Talmid | Balanced | Online |

### Sfarim — 4 tractates

1. **Sefer Brachos** (50K Hasmada, In Progress) — The foundational tractate on prayer
2. **Tanya — Likutei Amarim** (30K Hasmada, Active) — Core Chabad Chassidus text
3. **Sefer Shabbos** (25K Hasmada, Active) — Laws and philosophy of Shabbat
4. **Maamarim of the Rebbe Rashab — Hemshech Samech Vav** (40K Hasmada, Draft) — The Rebbe Rashab's magnum opus hemshech

### 6 Perakim across sfarim with 12 Shiurim

### 7 Groups (1 Yeshiva → 1 Zal → 2 Shiur groups → 3 Chavrusa pairs)

### Current default user: Levi Yitzchak (Avreich, Nigleh track)

---

## 🔁 Navigation Structure

### Sidebar (replaces Vanguard sidebar)

```
[Logo: flame icon + "CHAYOLEI BEIS DOVID"]

Main Nav:
  ⬡  Beis Midrash     (Dashboard /)
  ◈  Sfarim        (/sfarim)
  ⎇  Perakim          (/perakim)
  ▸  Shiurim          (/shiurim) [badge: active shiurim count]
  ⬡  Anash            (/anash)
  ✓  Mashpia's Room   (/review) [badge: pending reviews]
  ◆  Farbrengen       (/farbrengen) [badge: unread maamarim]

Bottom:
  ⚙  My Profile       (/settings)

[User card: Hebrew name, Madrega, Hasmada earned]
```

### Sidebar Logo

Replace the Vanguard "V" cyan square with a **flame SVG** (Ner Tamid — eternal light) in gold gradient. The brand name: "CHAYOLEI BEIS DOVID" in tracking-widest, subtitle: "תומכי תמימים" (in Hebrew script below).

---

## 🏛️ Key Design Details

### Scan Line & Glow

Keep the scan-line on section headers. Change glow variants:
- `.glow-gold` — for welcome card, primary panels (Torah flame)
- `.glow-sapphire` — for Chassidus-track content
- `.glow-emerald` — for completion states

### Typography

- Section labels: 10px, uppercase, letter-spacing widest, muted purple-grey
- Card titles: 14px semibold, warm near-white
- Hebrew names/titles: render in `font-serif` or system Hebrew font where possible — or just use the transliteration with the Hebrew in parentheses
- Metric numbers: `font-mono`, gold or sapphire depending on context

### Status Icons (like Vanguard's PR-style icons)

```
○  Open / ToLearn
◐  In Progress / Studying
◑  Submitted for Chazara
●  Completed / Approved
```

### Kanban Column Headers (Shiurim page)

```
לִלְמוֹד     To Learn     (zinc)
לוֹמֵד       Studying     (sapphire)
לַחֲזוֹר    Chazara      (purple)
נִגְמַר      Completed    (emerald)
```

---

## 🏗️ Project Structure

```
chayolei-beis-dovid-ui/         (or keep folder name yeshiva-ui)
├── src/
│   ├── app.html
│   ├── app.css                  # Tailwind @theme with yeshiva tokens
│   ├── lib/
│   │   ├── types/index.ts       # Tamid, Sefer, Perek, Shiur, ShiurGroup, Madrega, etc.
│   │   ├── stores/
│   │   │   ├── app.svelte.ts    # AppStore class with $state/$derived runes
│   │   │   └── mock-data.ts     # Yeshiva mock data
│   │   ├── utils/format.ts      # formatHasmada, formatZchus, statusColor, etc.
│   │   └── components/
│   │       ├── Sidebar.svelte
│   │       ├── TopBar.svelte
│   │       ├── StatusBadge.svelte
│   │       ├── ProgressBar.svelte
│   │       ├── MadregaBadge.svelte    # replaces RankBadge
│   │       ├── MadregaInsignia.svelte # replaces RankInsignia (flame tiers instead of chevrons)
│   │       ├── TalmidAvatar.svelte    # replaces SoldierAvatar
│   │       └── EmptyState.svelte
│   └── routes/
│       ├── +layout.svelte
│       ├── +page.svelte              # Beis Midrash (Dashboard)
│       ├── sfarim/
│       │   ├── +page.svelte
│       │   ├── new/+page.svelte
│       │   └── [id]/+page.svelte
│       ├── perakim/
│       │   ├── +page.svelte
│       │   └── [id]/+page.svelte
│       ├── shiurim/+page.svelte
│       ├── anash/
│       │   ├── +page.svelte
│       │   └── [id]/+page.svelte
│       ├── review/+page.svelte
│       ├── farbrengen/+page.svelte
│       └── settings/+page.svelte
├── static/favicon.svg
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 💡 Implementation Notes for Opus

### Starting Point

The fastest path is to **clone the Vanguard UI architecture exactly** and do a domain substitution:

1. Copy `src/lib/types/index.ts` → adapt types (Tamid, Sefer, Perek, Shiur, Madrega, ShiurGroup)
2. Copy `src/app.css` → replace color tokens
3. Copy `src/lib/stores/app.svelte.ts` → rename everything
4. Copy `src/lib/stores/mock-data.ts` → replace with yeshiva data
5. Copy each component → rename and re-skin
6. Copy each route → rebuild content with yeshiva domain

### What NOT to Do

- Don't use a UI component library — build everything in Tailwind as Vanguard does
- Don't use Svelte 4 stores — use Svelte 5 runes exclusively
- Don't import an icon library — use Unicode glyphs and inline SVG

### Key Svelte 5 Patterns to Replicate (from Vanguard)

```typescript
// AppStore class pattern
class AppStore {
  currentUser = $state<Tamid | null>(null);
  sfarim = $state<Sefer[]>(MOCK_MASECHTOT);
  sidebarCollapsed = $state(false);

  myShiurim = $derived(
    this.shiurim.filter(s => s.assignedTo === this.currentUser?.id)
  );

  toggleSidebar() { this.sidebarCollapsed = !this.sidebarCollapsed; }
}
export const app = new AppStore();
```

### Logo SVG (flame concept)

Replace the "V" cyan square with a flame shape in gold gradient:
```svg
<svg viewBox="0 0 32 32">
  <!-- Gold flame shape for Ner Tamid -->
  <defs>
    <linearGradient id="flame" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#c49a18"/>
      <stop offset="100%" stop-color="#f5c842"/>
    </linearGradient>
  </defs>
  <path d="M16 2 C16 2 8 10 8 18 C8 24 11 28 16 30 C21 28 24 24 24 18 C24 10 16 2 16 2Z" fill="url(#flame)"/>
</svg>
```

### MadregaInsignia Component

Replace military chevrons/bars with **flame-based tier icons**:
- Rosh Yeshiva: Triple flame (gold)
- Mashpia: Double flame (gold)
- Avreich: Menorah lamp (sapphire)
- Bochur: Single flame (emerald)
- New Talmid: Candle (zinc)

---

## 📐 Complete Workflow Audit (Target)

| # | Workflow | Path |
|---|----------|------|
| 1 | Rosh Yeshiva opens new Sefer | `/sfarim` → New → form → redirect to detail |
| 2 | Browse and filter Sfarim | `/sfarim` → status filters + search → click |
| 3 | View Sefer detail with Perakim | `/sfarim/[id]` → Perakim/Shiurim/Talmidim tabs |
| 4 | View all Perakim | `/perakim` → status filters |
| 5 | View Perek detail with Shiur pipeline | `/perakim/[id]` |
| 6 | Claim a Perek (chavrusa checkout) | `/perakim/[id]` → "Claim Perek" |
| 7 | Submit Perek for Chazara | `/perakim/[id]` → "Submit for Chazara" |
| 8 | My Shiurim kanban board | `/shiurim` → Board view (4 columns) |
| 9 | My Shiurim list view | `/shiurim` → List view |
| 10 | View all shiurim across sfarim | `/shiurim` → "All Shiurim" toggle |
| 11 | Start / Submit a shiur | Shiur cards → "Begin" and "Submit" buttons |
| 12 | Mashpia reviews submitted Perakim | `/review` → Perakim tab → Approve/Request Chazara |
| 13 | Mashpia approves individual Shiurim | `/review` → Shiurim tab → Approve/Reject |
| 14 | Browse Anash by Madrega | `/anash` → Roster view (tier groups) |
| 15 | View Shiur group hierarchy | `/anash` → Shiur Group view (org chart) |
| 16 | View Talmid profile | `/anash/[id]` |
| 17 | View Beis Midrash dashboard | `/` → welcome card, today's seder, active shiurim, feed |
| 18 | Switch user for testing | `/settings` → click any talmid |
| 19 | Browse Farbrengen feed | `/farbrengen` → Stream / Maamarim / Upcoming tabs |

---

## 🚀 Build Order for Opus

1. **Foundation**: `app.css` (design tokens) + `app.html` + `tsconfig.json` + `svelte.config.js` + `vite.config.ts` + `package.json`
2. **Types**: `src/lib/types/index.ts` — full type system
3. **Mock Data**: `src/lib/stores/mock-data.ts` — all 8 talmidim, 4 sfarim, 6 perakim, 12 shiurim, 7 groups
4. **App Store**: `src/lib/stores/app.svelte.ts` — class with all $state + $derived
5. **Utilities**: `src/lib/utils/format.ts`
6. **Components**: Sidebar → TopBar → StatusBadge → ProgressBar → MadregaBadge → MadregaInsignia → TalmidAvatar → EmptyState
7. **Layout**: `src/routes/+layout.svelte`
8. **Dashboard**: `src/routes/+page.svelte`
9. **Sfarim**: list + new + detail
10. **Perakim**: list + detail
11. **Shiurim**: page (kanban + list)
12. **Anash**: list + profile
13. **Review**: Mashpia's Room
14. **Farbrengen**: Feed page
15. **Settings**: User switcher

---

## 📌 Summary

This is a faithful spiritual adaptation of the Vanguard DAO command center — every structural pattern, every Svelte 5 idiom, every component architecture — translated into the world of **Yeshivas Tomchei Tmimim**. 

The students are not soldiers fighting in physical wars — they are **Chayolei Beis Dovid**, spiritual warriors fighting the wars of Torah. Their sfarim are their missions, their mashpia is their commander, their farbrengen is their intelligence briefing, and their hasmada (diligence) is their currency.

The Rebbe Rashab sent these soldiers out into a hostile world with nothing but Torah and Chassidus. This platform is their 21st-century command center.

---

*Built on the architecture of `C:\code\vanguard\vanguard-ui`.*  
*Spiritual foundation: Kuntres Eitz HaChaim, Rebbe Rashab, 5657 (1897).*  
*Name: Chayolei Beis Dovid — Simchas Torah 5662 (1901).*

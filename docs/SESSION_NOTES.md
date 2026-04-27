# Chayolei Beis Dovid — Session Notes

## What Was Built

Full SvelteKit 2 + Svelte 5 + Tailwind CSS v4 app at `C:\code\vanguard\chayolei`.
Hebrew UI throughout, RTL layout, Israeli users. Build passes clean.

---

## Stack
| Layer | Tech |
|---|---|
| Framework | SvelteKit 2 + Svelte 5 runes |
| Styling | Tailwind CSS v4 with `@theme` tokens |
| State | Class-based `AppStore` with `$state`/`$derived` |
| Types | TypeScript strict |
| Routing | SvelteKit file-based, all routes created |

---

## Files Created (25 total)

### Foundation
- `src/app.css` — `@theme` tokens: `yeshiva-bg`, `yeshiva-gold`, `yeshiva-sapphire`, `yeshiva-emerald`, `yeshiva-crimson`, `yeshiva-purple`, etc. Utility classes: `.scan-line`, `.glow-gold`, `.glow-sapphire`, `.glow-emerald`, `.card-hover`, `.pulse-online`, `.tag`
- `src/lib/types/index.ts` — Full type system: `Talmid`, `Sefer`, `Perek`, `Shiur`, `ShiurGroup`, `Maamar`, `Farbrengen`, `SederScheduleItem`, `Activity`, `Madrega`, `MADREGA_META`
- `src/lib/stores/mock-data.ts` — 8 talmidim, 4 sfarim, 6 perakim, 12 shiurim, 7 groups, 8 activities, 3 maamarim, 3 farbrengens, 5 seder schedule items
- `src/lib/stores/app.svelte.ts` — `AppStore` singleton (`app`) with all state + derived + helpers
- `src/lib/utils/format.ts` — `formatHasmada`, `formatZchus`, `formatDate`, `formatDeadline`, `statusColor`, `statusLabel`, `priorityColor`, `tierColor`, `trackColor`

### Components (`src/lib/components/`)
- `Sidebar.svelte` — RTL fixed sidebar, flame logo, Hebrew nav, collapsible
- `TopBar.svelte` — Hebrew page titles, breadcrumbs, search trigger
- `MadregaInsignia.svelte` — SVG flame tiers (triple/double flame → menorah → single flame → candle)
- `MadregaBadge.svelte` — Inline madrega pill, tier-colored
- `TalmidAvatar.svelte` — Hebrew initial avatar + online dot
- `StatusBadge.svelte` — Status pill via `statusColor()`
- `ProgressBar.svelte` — Gold/sapphire/emerald variants
- `EmptyState.svelte` — Centered empty state with icon

### Routes (all 11 pages)
| Route | Page |
|---|---|
| `/` | בית המדרש — dashboard: welcome, seder schedule, my shiurim, activity feed, active sfarim, online talmidim |
| `/sfarim` | לוח הספרים — filterable list, search, progress bars |
| `/sfarim/new` | ספר חדש — create form (leadership only) |
| `/sfarim/[id]` | Sefer detail — 3 tabs: פרקים / שיעורים / תלמידים |
| `/perakim` | All perakim — status filter tabs, claim indicator |
| `/perakim/[id]` | Perek detail — shiur pipeline, action buttons (תפוס / הגש / ממתין / הושלם) |
| `/shiurim` | Kanban board (4 cols: לִלְמוֹד/לוֹמֵד/לַחֲזוֹר/נִגְמַר) + list toggle |
| `/anash` | Roster by madrega tier + shiur group hierarchy view |
| `/anash/[id]` | Talmid profile — stats, hasmada progress, shiurim, sfarim |
| `/review` | חדר המשפיע — perakim approval + shiur submissions tabs |
| `/farbrengen` | Stream / מאמרים / farbrengens tabs |
| `/settings` | User switcher for role testing |

---

## Domain Model (key reference)

```
Yeshiva → Zal → Shiur Group → Chavrusa
Sefer (tractate) → Perek (chapter) → Shiur (session)
```

**Madrega tiers** (in `MADREGA_META`):
- `leadership` → ראש ישיבה, משפיע (gold)
- `avreich` → אברך, אברך מצוין (sapphire)
- `bochur` → בחור, בחור מצוין (emerald)
- `guest` → תלמיד חדש (zinc)

**Status flow:**
- Perek: `open → in_progress → in_review → completed`
- Shiur: `to_learn → studying → submitted → approved`

**Current default user:** `tal-004` = לוי יצחק (Avreich, Nigleh track)

---

## What's Not Done / Next Session Priorities

### 1. Functional Actions (all buttons are UI-only)
- "תפוס פרק" — claim a perek (set `assigneeId = currentUser.id`, status → `in_progress`)
- "הגש לחזרה" — submit perek (status → `in_review`)
- "התחל / הגש" shiur buttons — update shiur status in `AppStore`
- Mashpia approve/reject — update perek/shiur status, distribute hasmada
- "ספר חדש" form — actually add to `app.sfarim`

### 2. Missing Pages
- `/sfarim/new` form submission is stubbed (`window.location.href = '/sfarim'`)
- No `404` or `error` pages

### 3. `ProgressBar` component
- Check if `value` prop works as percentage (0–100) OR as raw value with `max` — the mock data calls it both ways. Verify `getPerekProgress()` returns 0–100.

### 4. Type Gaps to Verify
- `app.groups` — used in `/anash` hierarchy view; confirm `ShiurGroup` has `.type` (`'yeshiva'|'zal'|'shiur_group'|'chavrusa'`), `.parentId`, `.memberIds`
- `Maamar` type needs: `id, shem, authorId, category ('maamar'|'sicha'|'hemshech'), hemshechNum?, summary, publishedAt, topics[]`
- `Farbrengen` type needs: `id, topic, description, date, duration, location?, status ('upcoming'|'completed')`
- `Activity` needs: `id, type, actorShem, description, targetTitle, timestamp`
- `SederScheduleItem` needs: `id, label, startTime, endTime, type, status ('upcoming'|'active'|'completed')`

### 5. `app.getTalmidSfarim(id)` 
- Used in `/anash/[id]` — confirm this helper exists in `app.svelte.ts`. It should return all sfarim where the talmid is assigned to at least one perek.

### 6. RTL / Hebrew Polish
- Sidebar collapse button direction (should flip arrow when RTL)
- `line-clamp-2` on Hebrew text may need `overflow-wrap: anywhere`
- Search input in sfarim page: needs `dir="rtl"` attribute or `text-right`

### 7. Firebase Integration (future)
- Replace mock data with Firestore reads
- Auth: Firebase Auth → map `uid` to `Talmid.id`
- `AppStore` methods (claim, submit, approve) → Firestore writes

### 8. Missing Features from Spec
- Command palette (`⌘K`) — TopBar has button, no implementation
- Kvittel (note to mashpia) flow
- Hasmada leaderboard
- IPFS submission proof for shiurim
- Wallet / Zchus token integration

---

## Running the App

```bash
cd C:\code\vanguard\chayolei
npm run dev       # http://localhost:5173
npm run build     # production build (confirmed passing)
```

## Source Reference
Full spec: `C:\code\vanguard\vanguard-ui\CHAYOLEI_BEIS_DOVID_YESHIVA_UI_PROMPT.md`
Parent project (Vanguard DAO): `C:\code\vanguard\vanguard-ui`

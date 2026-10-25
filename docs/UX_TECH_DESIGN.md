# New UI — Technical Design

> Written 2026-10-25 on branch `claude/ux-redesign`. Implements the design in `UX_REDESIGN.md` (read it first). This document is what the code is built against; keep it in sync when the code moves.

## 1. Scope of this branch

**Builds the whole new user experience as working front-end code on a client-side domain model with sample data.** Every screen, workflow and rule in the design works in the browser: taking work, saving versions, review, accept-and-pay, proposals and votes that change the charter, money requests, the ledger, statements, starting a team. Nothing touches Firestore or the chain yet; the sample data and actions live in one store behind a small interface, so a Firestore/contract implementation can replace it later without touching screens (§11).

**The old UI stays reachable** at its current URLs (campaigns, assignments, governance…) in a `(classic)` route group, so nothing is lost while the new UI matures. The new UI owns `/`, `/plan`, `/work`, `/d/…`, `/decide`, `/treasury`, `/ledger` and `/start`. The classic dashboard and classic treasury page are retired (the new Treasury is TMIM-only, as the economic model requires).

**The clickable demo** is a static build of this same code (`scripts/build-demo.sh`), published as an artifact.

## 2. Design → code map

| Design concept (`UX_REDESIGN.md`) | Code |
|---|---|
| Team, charter, roles, rules (versioned) | `Team`, `Charter`, `Role`, `Rule` + `RuleVersion` in `src/lib/team/types.ts` |
| Objective → deliverable → task | `Objective`, `Deliverable`, `Task` |
| Versions, drafts | `Version` on `Deliverable` (`kind: 'draft' | 'version'`) |
| Change card: work / rules / money | `WorkChange`, `RuleChange`, `MoneyChange` (union `Change`), rendered by one `ChangeCard` component |
| Propose → decide → record | Engine actions create a change, decide it under charter rules, and append ledger entries |
| Ledger, tiers, proof | `LedgerEntry` with `tier: 'settled' | 'signed'` and `proof` |
| Treasury in TMIM: team account, budgets, issuance cap, scheduled pay, statements | `Treasury`, `Schedule`; budgets on `Objective`; derived figures in `ledger.ts` |
| Threads | `Message` attached to a ref (deliverable, change) |
| First run, templates | `templates.ts` + `/start` |
| Home, Plan, Work, Decide, Treasury, Ledger | routes in `src/routes/(app)` |

## 3. Architecture

```
src/lib/team/            domain (no UI)
  types.ts               all domain types
  templates.ts           charter templates: editorial, studio, collective
  seed.ts                sample teams (Brachos Translation Group; Harbor Community Radio)
  engine.ts              pure selectors + actions on a Team; throws DomainError(key)
  ledger.ts              entry factory, proof, day grouping, balances, statements
  diff.ts                paragraph + word diff
  i18n.ts                messages (en, he), t(), number/date formatting
  nav.ts                 href(), go(), currentPath(): path or hash routing
  store.svelte.ts        TeamStore: $state teams, active team, acting member; calls engine; persistence
  ui.svelte.ts           locale, theme, toasts, confirm-and-sign dialog state
  *.test.ts              engine and diff tests (vitest)
src/lib/ui/              presentational components (no domain logic)
src/routes/(app)/        new UI (layout = new shell)
src/routes/(classic)/    existing pages, unchanged URLs (layout = classic shell)
```

**Rules of the split:** screens read through store getters and call store actions; the store calls `engine.ts`; `engine.ts` is plain TypeScript (testable without Svelte). All amounts are integers of TMIM.

## 4. Domain model (essentials)

```ts
type Text = string | { en: string; he: string }       // seed content is bilingual; user input is a string

Team       { id, name: Text, purpose: Text, createdAt, templateId,
             members: Member[], charter: Charter, objectives: Objective[], deliverables: Deliverable[],
             tasks: Task[], changes: Change[], messages: Message[], ledger: LedgerEntry[], treasury: Treasury }
Member     { id, name: Text, initials, roleIds: string[], wallet, joinedAt, ai?: boolean }
Role       { id, name: Text, permissions: Permission[] }
Permission = 'take_work' | 'review_work' | 'accept_work' | 'release' | 'manage_plan' | 'propose' | 'vote' | 'spend'
Rule       { key: RuleKey, unit: 'tmim' | 'pct' | 'hours', history: RuleVersion[] }      // current = last
RuleVersion{ value, version, at, setBy: { kind: 'founding' } | { kind: 'proposal', changeId } }
RuleKey    = 'deliverable_reward' | 'review_reward' | 'monthly_issuance_cap'
           | 'spend_limit' | 'quorum_pct' | 'majority_pct' | 'vote_hours'
Objective  { id, title: Text, description: Text, ownerId, budget, due?, createdAt }
Stage      = 'open' | 'assigned' | 'in_progress' | 'in_review' | 'changes_requested' | 'accepted' | 'released'
Deliverable{ id, objectiveId, title: Text, scope: Text, ownerId?, reviewerId?, approverId?, reward, due?,
             stage, versions: Version[], acceptedVersionId?, reviewedBy?, lastActivityAt, releasedAt? }
Version    { id, n, kind: 'draft' | 'version', authorId, note: Text, paragraphs: string[], at }
Task       { id, deliverableId, title: Text, ownerId?, due?, done }
WorkChange { kind: 'work', id, deliverableId, fromVersionId?, toVersionId, proposerId, status, comments, reviewed, at, decidedAt?, decidedBy? }
RuleChange { kind: 'rule', id, title: Text, why: Text, ruleKey, from, to, proposerId, status, votes, at, closesAt, decidedAt? }
MoneyChange{ kind: 'money', id, title: Text, why: Text, action: { type: 'transfer', to, amount } | { type: 'budget', objectiveId, to },
             amount, proposerId, decidedBy: 'role' | 'vote', status, votes, at, closesAt?, decidedAt? }
Message    { id, ref: { type: 'deliverable' | 'change', id }, authorId, body: Text, at, paragraph? }
LedgerEntry{ id, seq, at, kind, actorId, tier, refs: { objectiveId?, deliverableId?, changeId?, ruleKey?, memberId? },
             amounts?: { memberId, amount, objectiveId? }[], data?: Record<string, string | number>,
             proof: { tx?, block?, sig?, batch? } }
Treasury   { teamAccount, schedules: Schedule[] }
Schedule   { id, memberId, objectiveId, amount, every: 'week', nextAt, until }
```

**Derived, never stored:** member balances (sum of ledger amounts to them minus transfers out), objective paid / committed / left, TMIM issued this month, statements, "needs you", stalled flags.

## 5. Workflows and the rules they enforce

Each action checks the acting member's permissions and the charter; failures throw `DomainError(key, vars)`, shown as a plain-language reason. Ledger tier in brackets.

**Work (workforce)**
1. **Take** an open deliverable → owner = me, stage `assigned` (needs `take_work`) [signed].
2. **Save a draft / version**: the owner edits paragraphs; *Save draft* keeps a private draft; *Save version* (with a note) adds `v{n}`, stage `in_progress` [signed].
3. **Request review** of the latest version → a `WorkChange` from the accepted (or previous) version; stage `in_review`; the reviewer sees it in *Needs you* [signed].
4. **Review**: comments anchored to a paragraph [signed]; the reviewer marks the change *Reviewed* (needs `review_work`) [signed] or *Requests changes* → stage `changes_requested` [signed]. The owner saves a new version and requests review again.
5. **Accept & pay** (approver, needs `accept_work`; charter requires *Reviewed* first): the confirm dialog lists the consequences: owner gets `reward`, reviewer gets `review_reward`, from the objective's budget, within `monthly_issuance_cap`. Blocked if the budget's *left* or this month's cap would be exceeded. → stage `accepted`, `acceptedVersionId` set [settled, with amounts].
6. **Release** an accepted deliverable (needs `release`) → stage `released`, content fingerprint and credits (owner, reviewer, approver) [settled].
7. **Tasks**: add (owner or `manage_plan`), check off [signed].
8. **Plan**: new objective (needs `manage_plan`, budget 0) [signed]; new deliverable with reward defaulting to the `deliverable_reward` rule [signed]. Budgets change only through money changes.
9. **Stalled**: stage `assigned`/`in_progress`/`changes_requested` with no activity for 7 days.

**Rules (corporate)**
10. **Propose a rule change** (needs `propose`): rule, new value, why → `RuleChange` closing after `vote_hours` [settled: opened].
11. **Vote** (needs `vote`; one member, one vote; change your vote until close) [settled].
12. **Decide**: when every eligible member has voted, or at `closesAt` (the demo offers *Close voting now* to the proposer): passes if turnout ≥ `quorum_pct` and *for* > `majority_pct` of for+against → new `RuleVersion` [settled: decided + rule changed]; otherwise failed [settled].

**Money (banking, TMIM only)**
13. **Request**: a transfer from the team account to a member, or a new budget for an objective. Decided by a member with `spend` if `amount ≤ spend_limit`, otherwise by vote under step 12's rules [settled: requested].
14. **Approve** (role path) → funds move / budget updates [settled]. A transfer can't exceed the team account.
15. **Scheduled pay**: shown with its next date; *Pay now* when due mints against the objective's budget and cap [settled].

**Team**
16. **Start a team** (`/start`): name, purpose, template → charter (roles, rules), founder gets every role → team created [settled], invite link shown.
17. **Threads**: post on a deliverable or a change [signed].

## 6. The ledger

- **Entry text** is rendered from `kind` + refs + data through `i18n.ts`, so switching language re-renders history.
- **Proof** is generated deterministically for the demo: settled entries get a 32-byte hex `tx` (FNV-based hash of the entry) and a rising `block`; signed entries get a short `sig` and the anchor `batch` (every 8 signed entries form a batch, anchored by a settled `anchor` entry). The UI states that the demo is not on-chain.
- **Views**: full ledger with filters (all, money, decisions, work, rules, people) grouped by day; per-object History; team pulse on Home (latest 6).
- **Statements**: per calendar month: issued (minted payouts), paid by objective, into team account, out of team account, team account at month end.

## 7. Screens and routes

| Route | Screen | Key parts |
|---|---|---|
| `/` | Home | Needs you (review, accept, vote, approve money, stalled own work), Your work, Team pulse, Treasury glance |
| `/plan`, `/plan/[objectiveId]` | Plan | Objective switcher, budget meter, outline (deliverables + tasks) and board (columns by stage), Take, new objective / deliverable |
| `/work` | Work | My deliverables, review requests waiting on me, recent versions across the team |
| `/d/[id]/[[tab]]` | Deliverable | Header (stage, people, reward); tabs: overview, work (document + versions), tasks, reviews, thread, history |
| `/d/[id]/edit` | Editor | Paragraph editor, save draft, save version with note, request review |
| `/d/[id]/review/[changeId]` | Work change card | Diff v(n-1)→v(n), anchored comments, consequences, Reviewed / Request changes / Accept & pay |
| `/decide`, `/decide/log`, `/decide/charter`, `/decide/members` | Decide | Open changes (rules + money), decision log, charter (rules with history, roles), members (roles, record of work) |
| `/decide/p/[changeId]` | Rule / money change card | Diff of rule or amount, why, decider, tally, vote / approve |
| `/treasury` | Treasury | Team account, issuance cap meter, budgets table, scheduled pay, statements, my wallet, Request |
| `/ledger` | Ledger | Filters, day groups, entries with tier marks, expandable proof |
| `/start` | First run | 3 steps: name & purpose → template → invite; creates and switches team |

**Shell:** a rail on wide screens (team switcher, Home, Plan, Work, Decide, Treasury, then Ledger, search, account), icons-only at medium widths, a bottom bar on phones with the five destinations; a top bar with page title and actions; a persistent "Demo: sample data, not on-chain" marker. **Command palette** (⌘K / Ctrl+K, or the search button): go to any destination, search objectives, deliverables, changes and people, and run actions (new objective, new proposal, request money, switch language, theme, acting member, start a team, reset demo).

**Account menu (demo):** *Acting as* switches between members so one person can walk through the whole flow (owner → reviewer → approver). Language (English / עברית), theme (system / light / dark), reset demo data.

## 8. Components (`src/lib/ui/`)

`AppShell`, `TeamSwitcher`, `AccountMenu`, `CommandPalette`, `Dialog` (native `<dialog>`: focus trap, Esc, inert page), `ConfirmSign` (consequences + simulated passkey, "Signing…" then recorded), `Toasts` (`aria-live`), `PageHeader`, `Tabs` (links with `aria-current`), `ChangeCard` (frame: kind, title, proposer, status, body, decider line, consequences, actions), `TextDiff`, `StageChip`, `TierMark`, `Avatar` (initials; AI badge), `People` (owner → reviewer ✓ approver), `Amount` (tabular TMIM), `Meter` (paid / committed / left; cap), `VoteTally`, `LedgerList`, `EmptyState`, `Field`. Icons: `@lucide/svelte`, with directional icons mirrored in RTL.

## 9. Visual system

- **Tokens** (`src/lib/ui/tokens.css`), light and dark, on `:root` with `data-theme` overrides: surfaces `--surface`, `--surface-2`, `--surface-3`; ink `--ink`, `--ink-2`, `--ink-3`; `--rule`, `--rule-strong`; accent `--accent` (deep ledger green) and `--accent-weak`; stage colours (open, assigned, in progress, in review, changes requested, accepted, released, stalled), always paired with a label or icon.
- **Type:** IBM Plex Sans + IBM Plex Sans Hebrew for UI; Source Serif 4 / Frank Ruhl Libre for documents; IBM Plex Mono with tabular figures for amounts and hashes. Scale 12 / 13 / 14 / 16 / 20 / 24 / 30. Reading measure 66ch.
- **Layout:** 4-px spacing grid; content max 1120 px; rail 232 px (64 px collapsed); bottom bar under 640 px. Logical properties only (`margin-inline`, `padding-inline`, `inset-inline`).
- **Motion:** view transitions on navigation (`onNavigate` + `document.startViewTransition`), 160 ms; none under `prefers-reduced-motion`.
- **States:** every list has a designed empty state that says what goes there and how to add the first one.
- **Scoped CSS** per component using the tokens; no inline colour styles. The `(app)` root sets its own font, colour and background so the classic global styles (`app.css`) can't leak in.

## 10. Internationalization and accessibility

- `i18n.ts` holds every UI string in English and Hebrew; `t(key, vars)`; `lt(text)` renders bilingual seed text. Numbers via `Intl.NumberFormat`, dates via `Intl.DateTimeFormat` / `Intl.RelativeTimeFormat`. Locale sets `<html lang dir>`. TMIM is always written in Latin letters.
- Landmarks (`nav`, `main`), a skip link, visible focus rings, 24 px minimum targets, keyboard paths for every action, `aria-live` for toasts and signing state, labels on every control, contrast AA in both themes.

## 11. Swapping in the real backend later

`TeamStore` is the seam. A later `FirestoreTeamRepository` maps: `Team` ← makom (generalized) + per-team charter doc; `Objective` ← mivtza; `Deliverable` ← masima (+ new `versions` subcollection); `Task` ← tafkid; `Change` ← new `changes` collection (rule changes also to `ChayoleiGovernance` proposals); `LedgerEntry` ← new `ledger` collection written by API routes and the chain listener; accept-and-pay → the rewards contract via the approve API. Screens don't change.

## 12. Demo build

`scripts/build-demo.sh` copies the repo to a temp dir, removes the `(classic)` group and server code, switches to `adapter-static` with hash routing (`router.type: 'hash'`, `appDir: 'app'`, relative paths), builds with `VITE_HASH_ROUTER=1` (which `nav.ts` reads to produce `#/…` links), and writes `chayolei-new-ui.html` plus its `app/` assets, ready to publish. The demo persists to `localStorage` (try/catch; works without it) and has *Reset demo*.

## 13. Tests and acceptance

- **Unit (vitest, `npm run test:unit`):** diff; take → assigned; version + review request → in review; accept requires review; accept pays owner and reviewer, updates budget and ledger; budget and cap limits block acceptance; permissions; rule proposal passes and creates a new rule version; fails without quorum; money ≤ limit by role and > limit needs a vote; transfer can't exceed the account; statements add up.
- **Checks:** `npm run check` 0 errors; `npm run build` succeeds; classic pages still render.
- **Visual:** Playwright screenshots of every route in English and Hebrew, light and dark, 1440 px and 390 px; no horizontal scroll; no console errors.

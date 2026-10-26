# New UI — Technical Design

> Written 2026-10-25 on branch `claude/ux-redesign`; updated 2026-10-26 for the live backend. Implements the design in `UX_REDESIGN.md` (read it first). This document is what the code is built against; keep it in sync when the code moves.

## 1. Scope of this branch

**Builds the whole new user experience as working front-end code on a client-side domain model with sample data.** Every screen, workflow and rule in the design works in the browser: taking work, saving versions, review, accept-and-pay, proposals and votes that change the charter, money requests, the ledger, statements, starting a team. The sample data and actions live in one store behind a small interface. Since 2026-10-26 the same screens also run on a live backend (teams in Firestore, written by the server through the same engine, and recorded on each team's contract when a chain is configured; `TEAM_BACKEND.md`), chosen by `VITE_TEAM_BACKEND` (§11).

**The old UI stays reachable** at its current URLs (campaigns, assignments, governance…) in a `(classic)` route group, so nothing is lost while the new UI matures. The new UI owns `/`, `/plan`, `/work`, `/d/…`, `/decide`, `/treasury`, `/ledger`, `/wallet`, `/start` and `/join/…`. The classic dashboard and classic treasury page are retired (the new Treasury is TMIM-only, as the economic model requires).

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
  commands.ts            every member action as data (Command), applied by applyCommand
  persist.ts             a Team as Firestore documents (core + ledger, messages, versions)
  live.ts                the live app's client: wallet sign-in, listeners, API calls
  store.svelte.ts        TeamStore: teams, active team, acting member; store.do(command) on the demo or live backend
  ui.svelte.ts           locale, theme, toasts, confirm-and-sign dialog state
  *.test.ts              engine and diff tests (vitest)
src/lib/ui/              presentational components and tokens.css (no domain logic)
src/lib/app/             components that read the store: shell parts, command palette,
                         shared forms (Dialogs + forms/), ledger sentences (describe.ts),
                         next-step logic (next.ts), shared actions (actions.ts), plan view
src/params/              route matchers: deliverable tabs, ledger filters
src/routes/(app)/        new UI (layout = new shell)
src/routes/(classic)/    existing pages, unchanged URLs (layout and auth boot = classic)
```

**Rules of the split:** screens read through store getters and call store actions; the store calls `engine.ts`; `engine.ts` is plain TypeScript (testable without Svelte). All amounts are integers of TMIM. The store saves the demo state to `localStorage` as soon as it seeds, so ids (and links) survive a reload.

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
| `/ledger/[[filter]]` | Ledger | Filters as paths (`/ledger/money`…), day groups, entries with tier marks, expandable proof, 60 at a time |
| `/wallet` | My wallet | The acting member's TMIM balance, address, paid / put in, history as their gains and losses |
| `/start` | First run | 3 steps: name & purpose → template → invite; creates and switches team |

**Shell:** a rail on wide screens (team switcher, Home, Plan, Work, Decide, Treasury, then Ledger, search, account), icons-only at medium widths, a bottom bar on phones with the five destinations; a top bar with page title and actions; a persistent "Demo: sample data, not on-chain" marker. **Command palette** (⌘K / Ctrl+K, or the search button): go to any destination, search objectives, deliverables, changes and people, and run actions (new objective, new proposal, request money, switch language, theme, acting member, start a team, reset demo).

**Account menu (demo):** *Acting as* switches between members so one person can walk through the whole flow (owner → reviewer → approver). Language (English / עברית), theme (system / light / dark), reset demo data.

## 8. Components (`src/lib/ui/`)

**`src/lib/ui`** (presentational): `Dialog` (native `<dialog>`: focus trap, Esc, inert page; its close button comes last so first focus lands on the content), `ConfirmSign` (consequences + simulated passkey, "Signing…" then recorded), `Toasts` (`aria-live`), `Popover`, `PageHeader`, `Tabs` (links with `aria-current`), `ChangeCard` (frame: kind, title, proposer, status, body, why, tally, decider line, consequences, warnings, actions), `TextDiff` (paragraph + word diff, paragraph numbers, an `annotate` snippet per paragraph for anchored comments), `StageChip`, `StatusChip`, `TierMark`, `Avatar` (initials on a tint from the id; AI badge), `Amount` (tabular TMIM, unit set small), `Meter` (paid / committed / left; cap), `VoteTally` (for / against / abstain / not voted, quorum tick), `EmptyState`.

**`src/lib/app`** (reads the store): `TeamSwitcher`, `AccountMenu` (acting as, language, theme, wallet, reset), `CommandPalette`, `Dialogs` + `forms/` (new objective, new deliverable, propose a rule change, request money, add to team account, request changes), `LedgerList` (the record as a chain: settled entries are square blocks, signed ones round signatures, anchors solid; expandable proof), `NeedsList`, `DeliverableRow`, `DeliverableHeader` (stage, version, people, next step), `VersionList` (commit line with draft, accepted, in review), `Doc`, `People` (owner → reviewer ✓ approver), `Person`, `PlanView` (outline and board), `StageStrip`, `SystemsStrip` (Home: the three systems at a glance), `ChangeWhat` (a rule or money change as a diff or a flow), `DecideHeader`, `BrandMark` (three bars on one base), `TokenMark` (TMIM as a coin carrying that mark), `NotFound`; and `describe.ts` (ledger sentences, icons, filters), `next.ts` (whose move it is), `actions.ts` (take, request review, release), `format.ts`.

Icons: `@lucide/svelte` (`@lucide/svelte/icons/<name>`), with directional icons mirrored in RTL (`.flip-rtl`). Money uses `hand-coins`, not `coins`, which at small sizes reads as the chain link that marks settled entries.

## 9. Visual system

- **Tokens** (`src/lib/ui/tokens.css`), light and dark, on `:root` with `data-theme` overrides: surfaces `--surface`, `--surface-2`, `--surface-3`; ink `--ink`, `--ink-2`, `--ink-3` (`--ink-3`, the faintest text, keeps 4.5:1 on every surface); `--rule`, `--rule-strong`; accent `--accent` (deep ledger green) and `--accent-weak`; stage colours (open, assigned, in progress, in review, changes requested, accepted, released, stalled), always paired with a label or icon.
- **Type:** IBM Plex Sans + IBM Plex Sans Hebrew for UI; Source Serif 4 / Frank Ruhl Libre for documents; IBM Plex Mono with tabular figures for amounts and hashes. Scale 12 / 13 / 14 / 16 / 20 / 24 / 30. Reading measure 66ch.
- **Layout:** 4-px spacing grid; content max 1120 px; rail 232 px (64 px collapsed); bottom bar under 640 px. Logical properties only (`margin-inline`, `padding-inline`, `inset-inline`).
- **Motion:** view transitions on navigation (`onNavigate` + `document.startViewTransition`), 160 ms; none under `prefers-reduced-motion`.
- **States:** every list has a designed empty state that says what goes there and how to add the first one.
- **Scoped CSS** per component using the tokens; no inline colour styles. The `(app)` root sets its own font, colour and background so the classic global styles (`app.css`) can't leak in.

## 10. Internationalization and accessibility

- `i18n.ts` holds every UI string in English and Hebrew; `t(key, vars)`; `lt(text)` renders bilingual seed text. Numbers via `Intl.NumberFormat`, dates via `Intl.DateTimeFormat` / `Intl.RelativeTimeFormat`. Locale sets `<html lang dir>`. TMIM is always written in Latin letters.
- **Bidi:** in Hebrew, `t()` wraps every interpolated value in Unicode isolates (FSI…PDI), together with a `v` written before it or a `%` after it, so names, amounts, versions and arrows keep their order inside right-to-left sentences ("100 TMIM ← 150 TMIM"). Everything people write (documents, comments, messages, version notes) carries `dir="auto"`, so an English document reads left to right inside the Hebrew UI.
- Landmarks (`nav`, `main`), a skip link, visible focus rings, 24 px minimum targets, keyboard paths for every action, `aria-live` for toasts and signing state, labels on every control, contrast AA in both themes.

## 11. The live backend

Done 2026-10-26; `TEAM_BACKEND.md` has the details. `TeamStore` is the seam: screens send a `Command` with `store.do()`; in the demo the store applies it in the browser, in the live app (`VITE_TEAM_BACKEND=firestore`) it posts it to `/api/teams/[id]/commands`, where the server applies it with the same engine inside a Firestore transaction. A team is a core document plus `ledger`, `messages` and `versions` subcollections; a member's id is their sign-in uid. With a chain configured, each team is created on-chain and its settled actions are signed by the member's wallet, relayed by the server and applied only once mined, with the transaction as proof (`TEAM_BACKEND.md` §6); live teams never carry stand-in proofs. The classic collections (makomot, mivtzaot, masimot…) are not migrated; live teams start fresh.

## 12. Demo build

`bash scripts/build-demo.sh [out-dir]` (default `demo-build/`, git-ignored; CI runs it) copies the working tree to a temp dir, removes the `(classic)` group and all server code (`api/`, `hooks.server.ts`, `lib/server`) and the root `+layout.ts`, switches to `adapter-static` with hash routing (`router.type: 'hash'`, `appDir: 'app'`, relative paths, fallback page `chayolei-new-ui.html`), builds with `VITE_HASH_ROUTER=1` (which `nav.ts` reads to produce `#/…` links), rewrites the fallback page's root-relative asset links to `./app/…`, and writes `chayolei-new-ui.html` plus its `app/` assets, ready to publish. The demo persists to `localStorage` (try/catch; works without it) and has *Reset demo*.

## 13. Tests and acceptance

- **Unit (vitest, `npm run test:unit`; also part of `npm test`), 28 tests:** diff; take → assigned; version + review request → in review; accept requires review; accept pays owner and reviewer, updates budget and ledger; budget and cap limits block acceptance; permissions; rule proposal passes and creates a new rule version; fails without quorum; rule values the contract would refuse; money ≤ limit by role and > limit needs a vote; transfer can't exceed the account; a budget never below what was paid; statements add up; live proofs stay pending; both dictionaries have the same keys and placeholders.
- **Against the Firestore emulator (`npm test`):** the team service (start, the work flow through payment, charter and input refusals, private drafts, concurrent writers, invites) and the access rules (`TEAM_BACKEND.md` §7).
- **The chain bridge on a local chain (`scripts/e2e/run-chain.sh`, also in CI):** team created and member admitted on-chain through signed requests and a signed invite, a budget passed by vote, accept and pay minting TMIM, contributions checked against real transfers and counted once, mismatched or missing signatures refused, batches anchored.
- **Browser, repeatable:** `scripts/e2e/run-live.sh` (the live app on the emulators with two simulated wallets: sign in, start a team, invite, join, a budget by vote, take, version, review, accept and pay; with `E2E=1 scripts/e2e/run-chain.sh` the same flow recorded on a local chain) and `scripts/e2e/run-demo.sh` (the static demo: a vote, an acceptance, the rule-range check, Hebrew). Both passing 2026-10-26.
- **Checks:** `npm run check` 0 errors; `npm run build` succeeds; classic pages still render.
- **Visual:** Playwright screenshots of every route in English and Hebrew, light and dark, 1440 px and 390 px; no horizontal scroll; no console errors.
- **Accessibility and size (CI):** `scripts/e2e/run-a11y.sh` runs axe-core (WCAG 2.2 A/AA) on 22 screens × 2 languages × 2 themes × 2 sizes, after each screen's styles load: no violations. `scripts/e2e/run-demo.sh` holds the first screen to 160 kB of JS and 200 kB in all, gzipped (125 and 136 on 2026-10-26); Firebase and ethers load only in the live app.
- **Workflows in the browser** (dev server and the static demo, 2026-10-25, all passing): reviewer comments on a paragraph and marks reviewed; approver accepts and pays through the passkey dialog; the ledger records the payout; members vote a rule change through and the charter shows the new version; a spend within the limit is approved by role; scheduled pay is paid when due; a request above the limit goes to a vote; the command palette finds and opens a deliverable; a contributor takes work, writes v1 and requests review; a new team is started and given its first objective; the language switches to Hebrew.

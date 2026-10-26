# Chayolei — The New User Experience

> Revised 2026-10-25 (second revision the same day). This is the plan for a complete redo of the app's UI, executed phase by phase by future sessions (§11). It follows `MARKETING_BRIEF.md`: **three parallel systems on one decentralized ledger** (banking, corporate organization and workforce management) for any small team anywhere, **crypto only, in the platform's own coin, TMIM** (`CLAUDE.md`). Where this document and the current UI disagree, this document is the target.

---

## 1. What changes, and what doesn't

The workflows mostly exist already: campaigns, assignments, sub-tasks, review, approval, rewards, proposals, votes, a treasury. **What changes is how they are presented.** Today the app reads as a scholarship network with ranks and a token. The new UI presents a team's bank, bylaws and workforce on one ledger.

| Today | New presentation | Parallel system |
|---|---|---|
| מבצע / campaign | **Objective** | Workforce |
| משימה / assignment | **Deliverable** (owner, reviewer, approver, reward, versions) | Workforce |
| תפקיד / sub-task | **Task** | Workforce |
| Submit / approve / publish | **Version → review request → accept → release** (GitHub-style, plain words) | Workforce |
| Governance page | **Decide**: proposals, votes, decision log, charter | Corporate organization |
| Ranks | **Roles** in the team's charter | Corporate organization |
| Treasury page (USDC, redemption) | **Treasury** in TMIM: budgets, payouts, scheduled pay, statements | Banking |
| Activity feed | **Ledger**: the team's complete history; a history panel on every object | All three |
| Farbrengen / discussions | **Threads** attached to whatever is discussed | All three |
| Leaderboard-style stats | Each person's **record of work** | Workforce |

**Crypto only, TMIM only.** Every amount in the UI is TMIM. No dollar values, fiat prices, exchange rates, swap buttons or off-ramp links anywhere. Converting TMIM is outside the platform.

## 2. The one pattern: propose → decide → record

Three kinds of change happen in a team; in the new UI they are **one interaction**, the **change card**:

| Change | Propose | Decide | Record and consequence |
|---|---|---|---|
| **Work** (workforce) | A new version of a deliverable, with a note | Reviewer comments; approver accepts | Version accepted → **TMIM payout** to owner and reviewer |
| **Rules** (corporate) | An amendment to the charter (a diff of the rule) | Members vote under the current rules | **Charter updated** |
| **Money** (banking) | A budget or spend request | The charter role allowed to approve it, or a vote above a limit | **Budget or balance updated** |

Every change card shows: what changes (as a diff of text, rule or amount), who proposed it, who decides and by when, the consequences when accepted (TMIM paid, permission granted, rule changed), status, and its ledger entry. Learn it once, use it everywhere.

## 3. Research that shapes it

★ marks peer-reviewed or primary research; the rest is practitioner writing, read as convention.

### Running a team without the usual institutions
- 1.3 billion adults are unbanked ([Findex 2025](https://www.biia.com/financial-inclusion-at-record-high-but-1-3-billion-still-unbanked-world-bank-global-findex-2025-report)); cross-border transfers average 6.49% ([World Bank RPW Q1 2025](https://remittanceprices.worldbank.org/sites/default/files/rpw_main_report_and_annex_q125_1_0.pdf)). → The team's money lives in its TMIM treasury; payouts cost members nothing visible (sponsored network fees).
- ★ Decentralized teams struggle with hybrid accounting, onboarding and coordination; transparency helps only with clear roles and validation ([Weidener & Boltz 2025](https://www.frontiersin.org/journals/blockchain/articles/10.3389/fbloc.2025.1641294/full)). → Owner / reviewer / approver on every item; statements generated, not assembled.
- Payouts by CSV and screenshot, 1–2 week waits ([Consensys](https://consensys.io/blog/the-future-is-dao), [DAOhaus](https://chainverse.notion.site/Contributor-UX-Discussion-6dfa08730b48487797fcaebc41f88e33)). → Acceptance pays in the same signed action.
- Public budgets showing balance, in, out and every transaction ([Open Collective](https://docs.opencollective.com/help/collectives/budget)). → The treasury copies that legibility, in TMIM.
- Roles as bundles of permissions and compensation; put only consequential authority on-chain ([Hats](https://ethereum.org/developers/tools/hats-protocol/), [Chainstack](https://chainstack.com/learn/compare/dao-tooling-beyond-voting/)). → A few charter roles that matter: decide, approve, spend, publish.
- Governance turnout is low (reported ~17%, [unverified forum figure](https://blockeden.xyz/forum/t/tally-powers-10b-in-dao-assets-snapshot-has-21-000-spaces-and-10m-votes-but-average-turnout-is-17-the-tools-are-ready-but-the-voters-arent/540)). → Roles decide day-to-day; only rules, budgets and big spends go to a vote, each stating exactly what changes.

### Versioning work that isn't code
- Drafts as lightweight private branches; co-authors merge when ready ([Upwelling](https://www.inkandswitch.com/project/upwelling/), [paper](https://martin.kleppmann.com/2023/03/09/upwelling-version-control-for-writers.html)). Lower ceremony: edit directly, group edits with a rationale afterward, let the owner review the diff and revert ([Patchwork](https://www.inkandswitch.com/patchwork/notebook/2024-version-control/), [history and diffs](https://inkandswitch.com/patchwork/notebook/08)). → Two modes: **private draft** for substantial work, **direct edit with a note** for small fixes; the owner reviews either as a diff.
- Suggestions accepted or rejected one by one, with a preview ([Docs guides](https://nira.com/track-changes-google-docs/)); text-anchored comments ([Hypothesis](https://web.hypothes.is/blog/varieties-of-hypothesis-annotations-and-their-uses/)).

### Interaction research (first round, still applies)
- **AI:** writers keep ownership when they control what they delegate (★ [Co-Writing with AI, 2025](https://arxiv.org/abs/2504.12488)); hybrid controls beat bare prompt boxes ([NN/g](https://www.nngroup.com/articles/ai-articulation-barrier/)); plan previews, adjustable autonomy, inline decision cards ([Setproduct](https://www.setproduct.com/blog/ai-agent-ui-design-patterns)); sources as chips plus a list ([AI UX Playground](https://aiuxplayground.com/guides/how-to-design-ai-citations)); Microsoft's 18 guidelines ([HAX](https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/)).
- **Onboarding:** tutorials get skipped and don't help (91% vs 94% task success); teach in context and in empty states ([NN/g](https://www.nngroup.com/articles/onboarding-tutorials/), [empty states](https://www.nngroup.com/articles/empty-state-interface-design/)).
- **Disclosure:** primary information first, detail on demand ([NN/g](https://www.nngroup.com/articles/progressive-disclosure/)).
- **Notifications:** in-app for non-urgent, push only for time-sensitive, ask permission after showing value ([NN/g](https://www.nngroup.com/articles/push-notification/)); calm technology ([calmtech](https://calmtech.com/)).
- **Experts and novices:** visible commands with shortcuts shown beside them; a command palette ([NN/g heuristic 7](https://www.nngroup.com/articles/flexibility-efficiency-heuristic/)).
- **Motivation:** ★ points, levels and leaderboards don't raise intrinsic motivation; streaks can turn work into obligation ([SDT review](https://webspace.science.uu.nl/~veltk101/publications/art/chi2022-sdtws.pdf), [Decision Lab](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification)). No leaderboards or streaks.
- **Crypto:** ★ users assume transactions are free and reversible and lack setup guidance ([CHI 2021](https://dl.acm.org/doi/fullHtml/10.1145/3411764.3445407)); passkey smart wallets and paymasters remove seed phrases and fees ([overview](https://eco.com/support/en/articles/15039720-passkey-wallets-explained), [Base](https://docs.base.org/base-account/improve-ux/sub-accounts)).
- **Reading:** ~55–70 characters per line, more leading on screens ([Smashing](https://www.smashingmagazine.com/2020/07/css-techniques-legibility/)).
- **Mobile:** 3–5 primary destinations in a bottom bar, a rail on larger screens ([UXPin](https://www.uxpin.com/studio/blog/mobile-navigation-examples/)).
- **Bidirectional:** mirror layout and directional icons, never numbers or text; logical CSS; test Hebrew exceptions with readers ([Mozilla](https://firefox-source-docs.mozilla.org/code-quality/coding-style/rtl_guidelines.html), [Material](https://m3.material.io/foundations/layout/understanding-layout/bidirectionality-rtl)).

## 4. Principles

1. **One record.** Every decision, assignment, version, message and payment is part of the team's ledger; the UI always shows where something came from and what it caused.
2. **One pattern.** Work, rules and money change through the same change card.
3. **Responsibility is visible.** Owner, reviewer and approver on every objective, deliverable and task.
4. **Money follows the work.** Budgets sit on objectives; accepting work pays for it; statements are generated.
5. **TMIM only.** Every amount is TMIM; nothing in the product points to fiat or conversion.
6. **Talk where the work is.** Threads hang off objects.
7. **Plain language first, proof on demand.** Sentences, then hashes.
8. **Global by construction.** Any language, LTR and RTL, local number and date formats, no assumption of a bank or a country.
9. **Calm by default, fast for experts.** Quiet screens, command palette, keyboard paths, optimistic updates.
10. **AI proposes, people decide,** on the record. **Teach in place,** not with tours.

## 5. Object model

```
Team ── Charter (roles, rules; versioned)                 ← corporate organization
  │  ── Treasury (TMIM: budgets, payouts, schedules,      ← banking
  │               team account, monthly issuance cap, statements)
  │  ── Ledger (every entry; every object's history)      ← all three
  └── Objective ── TMIM budget, owner, due                ← workforce
        └── Deliverable ── owner, reviewer, approver, TMIM reward, versions, releases
              └── Task ── owner, due
  Threads attach to any object. Change cards (work / rules / money) attach to what they change.
```

| Object | Today (`src/lib/types/index.ts`) | Gap |
|---|---|---|
| Team | `Makom` (a place) | Generalize; needs its own treasury, charter and roles (§10) |
| Objective | `Mivtza` | `tokenAllocation` becomes the TMIM budget |
| Deliverable | `Masima` | Has only `contentUrl`: needs body, versions, drafts, approver |
| Task | `Tafkid` | Fine |
| Change card / version | none | New |
| Thread | `Discussion` (per masima) | Generalize to any object |
| Ledger entry | `Activity` + chain events | New `ledger` collection |
| Charter | custom claims + contract roles + governance params | New, versioned |

**Deliverable stages:** `Open → Assigned → In progress → In review ↺ Changes requested → Accepted → Released`, plus `Stalled` from inactivity (maps from `MasimaStatus`: open, in_progress, submitted/in_review, revision_requested, approved, published).

**How TMIM moves.** TMIM is minted only for participation. A **budget** authorizes how much TMIM an objective may pay out. **Accepting** a deliverable mints its reward (and the reviewer's) against that budget, within the team's **monthly issuance cap** from the charter. The **team account** holds TMIM members or other teams send it, for spends the charter allows. **Statements** list per month: issued, paid by objective, received, spent, balance.

**Ledger tiers.** **Settled** entries (payouts, transfers, votes, role and rule changes, releases) are on-chain transactions. **Signed** entries (comments, versions, assignments, task updates) are signed by their author into the team's log and **anchored** on-chain in periodic batches (a hash), so the whole record is tamper-evident without putting every message on-chain or exposing private content. Each entry shows its tier.

## 6. Information architecture

**Team switcher** (people belong to several teams) → five primary destinations → **history panel** on every object → **command palette** (⌘K / Ctrl+K).

| Destination | Holds | Parallel system |
|---|---|---|
| **Home** | Needs you (reviews, acceptances, votes), your work, your threads, team pulse, treasury glance | All |
| **Plan** | Objectives → deliverables → tasks: outline, board and timeline views; owners, due dates, budgets, stalls | Workforce |
| **Work** | Deliverables' documents and files: drafts, versions, compare, review requests, releases | Workforce |
| **Decide** | Open proposals, decision log, charter (roles and rules, with history), members | Corporate |
| **Treasury** | Team account, budgets, upcoming payouts and scheduled pay, statements, my wallet | Banking |

The **full ledger** is in the team menu and ⌘K; every object's History tab is the ledger filtered to it. **People** (members, roles, records of work) sit under Decide → Members and the team menu.

## 7. The new user experience, screen by screen

Sketches are in English for a global reader; the Hebrew build mirrors them right-to-left with the same structure.

### 7.1 First run: a chartered, working team in minutes

```
┌──────────────────────────────────────────────────────────────┐
│  Start a team                                      step 1/3  │
│  Name     [ Brachos Translation Group             ]          │
│  Purpose  [ Translate and publish ... by Nisan    ]          │
│                                                              │
│  Charter template (roles, decision rules, pay rules)         │
│  ◉ Editorial team   lead accepts work · rules by vote        │
│  ○ Studio           owners accept · spends > 5,000 TMIM by 2 │
│  ○ Collective       everything by majority vote              │
│  ○ Start blank                                               │
│                                         [ Continue → ]       │
└──────────────────────────────────────────────────────────────┘
```
Step 2: sign in with a passkey (creates your wallet; no seed phrase, no fees). Step 3: invite by link or QR. The team, its charter (shown in plain language) and its treasury are created in one sponsored transaction. You land on Plan with a hint: "What is the team trying to achieve? Add an objective; AI can suggest deliverables."

Joining by invite: see the team's purpose and charter in plain words → passkey → Home, with the team's open tasks.

### 7.2 Home

```
┌───────────┬──────────────────────────────────────────────────┐
│ ▣ Brachos │  Needs you                                        │
│   Group ▾ │  ● Review "Ch.3 Kriyas Shema" v4      Levi · 2d   │
│           │  ● Accept "Sources for Ch.1"   → pays 80 TMIM     │
│ ⌂ Home    │  ● Vote: review reward 100→150 TMIM  closes 26h   │
│ ☰ Plan    │                                                   │
│ ✎ Work    │  Your work                                        │
│ ⚖ Decide  │  ◐ Ch.2 draft · due Thu · 3 open comments         │
│ ◎ Treasury│                                                   │
│           │  Team pulse                       Treasury        │
│ ⌘K        │  ✓ Mendel accepted Ch.1 sources   Issued Oct      │
│ (avatar)  │    · paid Levi 80 TMIM · 10:42    12,400 / 20,000 │
│           │  ✎ Shmuel saved v4 of Ch.3 · 9:30 2 payouts due   │
└───────────┴──────────────────────────────────────────────────┘
```

### 7.3 Plan (workforce)

```
┌──────────────────────────────────────────────────────────────┐
│  Translate & publish Brachos ▾       Outline | Board | Timeline│
│  Budget 80,000 TMIM · paid 35,200 · committed 12,000 · Nisan │
├──────────────────────────────────────────────────────────────┤
│  ▾ Volume 1                                    6/10 accepted │
│    Ch.1 Intro         ● Released    Mendel ✓Yosef   1,200    │
│    Ch.2 Roots         ◐ In progress Levi   →Yosef   ⚠ 9d     │
│    Ch.3 Kriyas Shema  ◑ In review   Shmuel →Yosef   1,200    │
│      └ Task: verify sources (Levi, Thu)                      │
│    Ch.4 Bittul        ○ Open        —               1,200 [Take]
└──────────────────────────────────────────────────────────────┘
```
Owner, reviewer (→) and approver (✓) on every row; TMIM reward; stalls flagged. "Take" records an assignment. AI can propose a breakdown of an objective as a change card the lead edits and accepts.

### 7.4 A deliverable: the "repository"

```
┌──────────────────────────────────────────────────────────────┐
│  Ch.3 Kriyas Shema                          ◑ In review · v4 │
│  Owner Shmuel · Reviewer Yosef · Approver Mendel · 1,200 TMIM │
│  Overview | Work | Tasks | Reviews (1) | Thread (6) | History │
├──────────────────────────────────────────────────────────────┤
│  v4 "tightened the intro, added Rashi"   Shmuel · today   ◑  │
│  v3 "Yosef's suggestions accepted"       Shmuel · Mon     ✓  │
│  v2 draft shared                         Shmuel · 3 Oct      │
│  [Compare v3 ↔ v4]   [New draft]   [Request review]         │
└──────────────────────────────────────────────────────────────┘
```
Work = the document with drafts and versions; Reviews = review requests (pull requests); History = this deliverable's ledger. **Release** publishes an accepted version as an edition, with credits generated from the ledger.

### 7.5 Review and accept (the change card for work)

```
┌──────────────────────────────────────────────────────────────┐
│  Review request v3 → v4                    requested by Shmuel│
│  ¶2  − "The obligation begins at..."                         │
│      + "The obligation of Kriyas Shema begins at..."  💬 Yosef│
│  ¶5  + new paragraph citing Rashi, Brachos 2a  [source ↗]    │
│                                                              │
│  If accepted: v4 becomes the deliverable · pays Shmuel        │
│  1,200 TMIM and Yosef 150 TMIM from "Volume 1" · rule         │
│  "Chapter = 1,200" (v2) · recorded on the ledger, final       │
│  [Request changes]  [Comment]       [Accept & pay · passkey]  │
└──────────────────────────────────────────────────────────────┘
```

### 7.6 Decide (corporate organization)

```
┌──────────────────────────────────────────────────────────────┐
│  Decide        Open (2) | Decision log | Charter | Members   │
├──────────────────────────────────────────────────────────────┤
│  Proposal: raise review reward                closes in 26h  │
│  Rule "Review reward"   − 100 TMIM   + 150 TMIM               │
│  Why: reviews take ~2h; 100 doesn't cover it.   — Mendel      │
│  Decided by: members · majority · quorum 40%                  │
│  ▓▓▓▓▓▓▓░░░ 62% for · quorum reached                         │
│  If passed: rule updated at once; applies to later reviews    │
│                                    [Against]  [For · passkey] │
└──────────────────────────────────────────────────────────────┘
```
The **charter** is versioned like code: each rule shows its value, history and the proposal that set it. The **decision log** lists every decision (by vote or by role) with rationale, outcome and links.

### 7.7 Treasury (banking, in TMIM)

```
┌──────────────────────────────────────────────────────────────┐
│  Treasury                                  [Request] [Send]  │
│  Team account 18,350 TMIM                                    │
│  Issued this month 12,400 of 20,000 TMIM (charter cap)       │
├──────────────────────────────────────────────────────────────┤
│  Budgets          budget    paid     committed   left        │
│  Volume 1         80,000    35,200   12,000     32,800  TMIM │
│  Editing pool     10,000     4,100        —      5,900  TMIM │
│  Upcoming                                                    │
│  Thu  scheduled pay → Levi 300 TMIM (weekly, until Adar)     │
│  Statements   Oct ↓   Sep ↓                                  │
└──────────────────────────────────────────────────────────────┘
```
Request starts a money change card, decided by the role the charter names or by vote above a limit. Send moves TMIM from the team account under the same rules. Statements come from the ledger. **My wallet** (from the avatar) shows the member's TMIM balance and history, nothing else: no prices, swaps or off-ramps.

### 7.8 Ledger

```
┌──────────────────────────────────────────────────────────────┐
│  Ledger      All | Money | Decisions | Work | Rules | People │
├──────────────────────────────────────────────────────────────┤
│  Today                                                        │
│  ◆ Mendel accepted Ch.1 sources · paid Levi 80 TMIM  ⛓ 10:42 │
│  ✎ Shmuel saved v4 of Ch.3 "tightened the intro"     ✍ 09:30 │
│  💬 Yosef commented on Ch.3 ¶2                       ✍ 09:12 │
│  Yesterday                                                    │
│  ⚖ Vote passed: review reward 100→150 TMIM (62%)     ⛓ 18:00 │
└──────────────────────────────────────────────────────────────┘
```
⛓ settled on-chain · ✍ signed and anchored. Every entry opens to its proof and its object.

### 7.9 Threads, people and records of work

Any object has a thread; Home collects the ones you're in; no separate chat app. Members show their charter roles and a **record of work** (deliverables accepted, reviews given, releases credited), all from the ledger. No leaderboard.

## 8. AI in the team

AI helpers are members with charter roles: **planner** (breaks objectives into deliverables and tasks), **source finder**, **first-pass reviewer**, **summarizer** (thread digests, monthly statement narratives). Each role says what it may do: suggest only, or draft. Never accept, spend or vote. Output is always a change card or a suggestion with sources; accepted AI contributions are attributed in history and credits. Owners can switch AI off per deliverable.

## 9. Design language

- **Calm, precise, trustworthy.** A ledger, not a casino: whitespace, strong type hierarchy, tabular figures, one accent, semantic colors for states. Teams can choose a theme (a Torah team can keep a sefer look) without changing structure.
- **Type:** a humanist sans with Latin, Hebrew and Arabic coverage for UI (candidates: Noto Sans family; IBM Plex Sans with Plex Sans Hebrew/Arabic); a serif for documents (Noto Serif; Frank Ruhl Libre for Hebrew); mono with tabular figures for TMIM amounts and hashes.
- **Color tokens:** surface, ink, muted, rule, accent; states for open, in progress, in review, accepted, released, stalled, settled, signed. Never color alone.
- **Density:** comfortable for documents and threads; compact for Plan, Treasury and Ledger.
- **Motion:** view transitions between list and detail (SvelteKit `onNavigate`), 150–200 ms, reduced motion respected; no translucent layers over text.
- **Global:** logical CSS properties; locale-aware numbers and dates; all strings externalized; LTR fragments isolated in RTL text.
- **Accessibility:** WCAG 2.2 AA; 24 px targets; visible focus; keyboard paths for every action.

## 10. Technical implications

- **Per-team treasury, charter and roles** (a team factory). Today there is one global treasury and governance contract; "any small team" needs one per team. Largest change; design before Phase 7.
- **Reward minting through the team's cap.** Route participation minting (`MasimaRewardsV2`) through a per-team budget and monthly issuance cap, which also gives `GovernanceTreasury.maxMonthlyMint` (currently unenforced) its purpose (SPEC_2 §4.2).
- **No USDC in the product.** Remove the USDC balance and redemption calculator from the treasury UI; on-chain redemption is an owner decision (brief §13).
- **Ledger collection** written by the server and the chain listener, with tiers (settled / signed), periodic anchoring, per-team privacy.
- **Versioning engine** for documents: consider Automerge (CRDT with history and branches; Patchwork is built on it), recording version hashes on the ledger; releases anchor a content hash on-chain.
- **Change card** as one data type: `{kind: work|rule|money, target, diff, proposer, deciderRule, deadline, consequences, status, ledgerRefs}`.
- **Wallets:** passkey smart accounts on Base, paymaster-sponsored fees, sub accounts / spend permissions for routine actions.
- **Stack stays:** SvelteKit 2, Svelte 5, Tailwind 4, Firestore; add Bits UI / shadcn-svelte primitives, an i18n layer, design tokens in `src/app.css`.

## 11. Execution plan for future sessions

Each phase ships on its own and leaves the app working. Prove acceptance with screenshots (light/dark, Hebrew RTL and English LTR, 390 px phone), `npm run check` clean, and tests where logic changed.

| Phase | Build | Accept when |
|---|---|---|
| **0. Shell and foundations** | Tokens; fonts; light/dark; i18n (Hebrew + English); logical-CSS audit; team switcher; rail + bottom bar (Home, Plan, Work, Decide, Treasury); command palette; TMIM-only amounts everywhere (USDC and redemption UI removed) | Every current page renders in the new shell in both languages and themes with no horizontal scroll; ⌘K reaches every route; no fiat or USDC shown anywhere |
| **1. Plan** | Objectives → deliverables → tasks with owner / reviewer / approver, TMIM budgets, stages, stalls; outline and board views | A lead sees the whole plan with responsibility and budgets on one screen; "Take" records an assignment |
| **2. Ledger (read)** | `ledger` collection; Ledger screen; History tab on every object; team pulse | Every existing action in sample data appears as a sentence with tier and proof |
| **3. Change card + versions** | The change-card component; deliverable versions, drafts, compare, review requests with anchored comments | Owner saves v2, requests review, reviewer comments on a changed paragraph, owner revises; history shows it all |
| **4. Accept and pay** | Accepting a work change card mints owner and reviewer rewards in TMIM in one signature, against the budget; optimistic entry | On testnet both are paid and the entry confirms on-chain |
| **5. Decide** | Proposals as rule and budget change cards; versioned charter; decision log; members and roles | Changing a reward rule goes from proposal to updated charter, with the vote linked |
| **6. Treasury** | Team account, budgets, monthly issuance cap, scheduled pay, money change cards with charter limits, statements, my wallet | A month of activity produces a correct TMIM statement; a spend above the limit requires the vote the charter names |
| **7. First run and per-team setup** | Charter templates; passkey onboarding; per-team treasury, charter and roles (needs the factory, §10); invites | A new user creates a team, invites someone and pays a first deliverable in TMIM without seeing a seed phrase or a fee |
| **8. Threads and Home** | Threads on any object; Home triage; in-app notifications; push only for blocking or expiring items | Every pending review, acceptance and vote appears once on Home and clears when acted on |
| **9. AI roles** | Planner, source finder, reviewer, summarizer as charter roles producing change cards | An AI-proposed breakdown is edited and accepted and shows as AI-assisted |
| **10. Release and polish** | Releases with ledger credits; accessibility audit; performance budget; usability test with five people from two language groups | A released edition lists every contributor; findings fixed or logged |

**Progress** (update as phases complete):
- 2026-10-25, branch `claude/ux-redesign`: the whole new UI is built as front-end code on a client-side domain model with sample data (`UX_TECH_DESIGN.md`), in English and Hebrew, light and dark, desktop and phone, and published as a clickable demo (`scripts/build-demo.sh`). Covered: phase 0 (shell, tokens, i18n, palette, TMIM only), 1 (plan: outline and board), 2 (ledger and History tabs, team pulse), 3 (change card, versions, drafts, compare, anchored comments), 4 (accept and pay in one signature, against budget and cap), 5 (decide: rule and money change cards, versioned charter, decision log, members), 6 (treasury: team account, cap, budgets, scheduled pay, statements, wallet), the first-run flow of 7 (charter templates, invite link), Home and threads of 8, releases with credits of 10. The old pages stay at their URLs in `src/routes/(classic)`.
- Not yet done: the Firestore and contract backend behind `TeamStore` (`UX_TECH_DESIGN.md` §11), real passkeys and per-team contracts (phase 7), notifications (8), AI roles (9), the accessibility audit and usability test (10).

## 12. Routes today → new home

| Today | New home |
|---|---|
| `/` | Home |
| `/mivtzaot…` | Plan (objectives) |
| `/masimot…`, `/tafkidim…` | Plan (deliverables, tasks); Work (documents, versions) |
| `/review` | Home ("needs you") + Work (review requests) |
| `/governance…` | Decide |
| `/treasury` | Treasury (TMIM only) |
| `/anash…` | Decide → Members |
| `/farbrengen` | Threads |
| `/signup` | First run / join |
| `/settings` | Team menu → settings |

## 13. Open questions

> Tracked with what the code assumes meanwhile in `DECISIONS.md`; record answers there.

1. Per-team treasuries: Safe with modules, or a factory of this repo's treasury and governance contracts?
2. On-chain TMIM→USDC redemption: to be decided by the owner in the future; the UI shows TMIM only until then. (Brief §13.)
3. Default privacy of a team's ledger: which entry kinds are public?
4. Where document bodies live (Firestore, an Automerge store, IPFS) and what is anchored at release.
5. Which AI role first: planner or source finder?

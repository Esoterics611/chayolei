# Chayolei — UX Redesign Concept

> Written 2026-10-25 as the plan for a complete redo of the app's UI. Future sessions execute it phase by phase (section 10). It follows the positioning in `MARKETING_BRIEF.md`: **an organizing tool for teams that produce and publish, with a shared ledger at its core**, under the economic model in `CLAUDE.md` (crypto in, crypto out; TMIM minted only for participation). Where this document and the current UI disagree, this document is the target.

---

## 1. The idea in one paragraph

The app is a **production line on a ledger**. A team's work (a sefer, a translation, a source collection) is laid out as its table of contents. Every piece moves through the same stages, from open to published, and every step that matters (claim, submit, review, approve, pay, decide) becomes a ledger entry the whole team can read. The ledger also holds the team's money and its rules, so approving a piece and paying for it are one act, and changing a rule is a recorded vote. The UI is built for the two jobs people actually do here: **producing text** (calm, typographic, Hebrew-first) and **organizing a team** (dense, scannable, everything traceable to the ledger).

## 2. What the research says, and what we take from it

Evidence quality varies. Peer-reviewed or primary-research sources are marked ★; the rest is practitioner writing, to be read as convention rather than settled fact.

### Organizing teams and their money
- ★ DAO contributors report labor-intensive hybrid accounting, steep onboarding and fragmented coordination; transparency helps only with **clear roles, structured onboarding and credible validation** ([Weidener & Boltz 2025](https://www.frontiersin.org/journals/blockchain/articles/10.3389/fbloc.2025.1641294/full)). → Roles and rules are first-class objects (the charter), and every ledger entry says who validated it.
- Payments are the recurring pain: CSVs, screenshots, spreadsheets ([Consensys](https://consensys.io/blog/the-future-is-dao)), 1–2 week waits ([DAOhaus notes](https://chainverse.notion.site/Contributor-UX-Discussion-6dfa08730b48487797fcaebc41f88e33)). → **Approval pays**, in the same signed action.
- Open Collective's public budgets show balance, raised, disbursed and every transaction, with private details hidden ([docs](https://docs.opencollective.com/help/collectives/budget)). → The treasury view copies that legibility, on-chain and without a fiscal host.
- Roles as bundles of permissions, eligibility and compensation ([Hats Protocol](https://ethereum.org/developers/tools/hats-protocol/)), with the advice to model only authority with real consequences on-chain ([Chainstack](https://chainstack.com/learn/compare/dao-tooling-beyond-voting/)). → The charter lists a handful of consequential roles (approve, spend, propose, publish), not every permission.

### Producing and publishing
- Manuscripts fail at handoffs: missed sign-offs, files in disconnected systems ([Amnet](https://amnet.com/from-manuscript-to-publication-why-editorial-workflows-matter-more-than-ever/)); pipeline tools move each title through fixed stages with reminders when it stalls ([Taskade](https://www.taskade.com/generate/publishing/book-publishing-pipeline-dashboard)). → One stage model for every piece; "stalled" is a visible state.
- Text-anchored annotation (highlight → comment, quoting the selection) is the established review pattern; an always-open sidebar competes with the page, especially on mobile ([Hypothesis taxonomy](https://web.hypothes.is/blog/varieties-of-hypothesis-annotations-and-their-uses/), [Critchlow](https://tomcritchlow.com/2019/02/12/annotations/)). → Review threads anchor to selections; the margin opens on demand.
- Suggesting mode works because each suggestion is accepted or rejected individually, with a preview of the result ([Google Docs guides](https://nira.com/track-changes-google-docs/)). → Reviewers and AI suggest; authors accept or reject each one.
- The classic Talmud page puts linked texts on one page around the main text ([Alexenberg](https://www.melalexenberg.com/paper.php?id=8), [Seforim blog on digital editions](https://seforimblog.com/2023/06/from-print-to-pixel-digital-editions-of-the-talmud-bavli/)); Sefaria opens connections in a panel beside the passage ([help](https://help.sefaria.org/hc/en-us/articles/19815191391388-How-to-Access-Connections-on-the-Sefaria-Library-App)). → The writing desk keeps sources beside the text, opened from the passage, not from a menu.

### AI in the team
- ★ Writers keep ownership only when they control which parts of the work they delegate; academics care most about control in planning ([Co-Writing with AI, on Human Terms, 2025](https://arxiv.org/abs/2504.12488)). → AI roles are opt-in per piece and per task; the author decides.
- The articulation barrier: typing prompts is hard; hybrid UIs that pair prompts with controls work better ([NN/g](https://www.nngroup.com/articles/ai-articulation-barrier/), [prompt controls](https://www.nngroup.com/articles/prompt-controls-genai/)). → AI is invoked from the text (select → "find sources", "check against the original"), not from an empty chat box.
- Agent UIs: plan previews and approvals, adjustable autonomy, inline decision cards instead of modals, quiet until something changes, calibrated confidence ([Setproduct](https://www.setproduct.com/blog/ai-agent-ui-design-patterns), [Mabellini](https://www.andreamabellini.com/2026/09/24/designing-for-ai-agents-ux-patterns-that-actually-work/), [Eleken](https://www.eleken.co/blog-posts/agentic-ux-examples)). Microsoft's 18 human-AI guidelines are the research-backed base ([HAX](https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/)).
- Citations work as chips on the claim plus a sources list; anonymous numbered markers don't ([AI UX Playground](https://aiuxplayground.com/guides/how-to-design-ai-citations)). → Every AI claim about a source links to that source in the corpus.

### Motivation
- ★ Points, levels and leaderboards did not significantly raise competence or intrinsic motivation (Mekler et al. 2017, via the [SDT review](https://webspace.science.uu.nl/~veltk101/publications/art/chi2022-sdtws.pdf)); leaderboards motivate some people and demotivate others; badges with clear objectives last better ([Gamification with Purpose](https://arxiv.org/pdf/2512.08551)). Streak mechanics can turn the work into an obligation ([Decision Lab](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification)). → No leaderboards, no streaks. The motivator is a **published work with your name in its credits**, plus a portfolio of what you made.

### Crypto UX
- ★ Wallet users misread fees and assume transactions are free and reversible; setup lacks guidance ([The U in Crypto Stands for Usable, CHI 2021](https://dl.acm.org/doi/fullHtml/10.1145/3411764.3445407)); exchanges overload novices ([CHI 2024](https://dl.acm.org/doi/fullHtml/10.1145/3613904.3642534)). → Contributors never see gas; every signature shows a plain-language preview; irreversibility is stated before signing.
- Passkey smart wallets on Base: one biometric prompt, no app, no seed phrase; gas sponsored by a paymaster ([overview](https://eco.com/support/en/articles/15039720-passkey-wallets-explained)); sub accounts with spend permissions remove per-action popups ([Base docs](https://docs.base.org/base-account/improve-ux/sub-accounts)). Recovery is the open gap. → Onboarding is "join the team → passkey"; recovery is designed in from day one.
- Governance turnout is low across DAOs, reportedly ~17% ([forum, unverified](https://blockeden.xyz/forum/t/tally-powers-10b-in-dao-assets-snapshot-has-21-000-spaces-and-10m-votes-but-average-turnout-is-17-the-tools-are-ready-but-the-voters-arent/540)). → Fewer, clearer votes: each proposal states what changes and when.

### General interaction
- Tutorials get skipped and don't improve task success (91% with vs 94% without); contextual help and empty states teach better ([NN/g](https://www.nngroup.com/articles/onboarding-tutorials/), [mobile tutorials](https://www.nngroup.com/articles/mobile-tutorials/), [empty states](https://www.nngroup.com/articles/empty-state-interface-design/)).
- Progressive disclosure: primary information first, detail on request ([NN/g](https://www.nngroup.com/articles/progressive-disclosure/)). → Ledger entries are sentences; hashes, blocks and signatures are one tap deeper.
- Notifications: don't ask for permission before showing value; in-app for non-urgent, push only for time-sensitive ([NN/g push](https://www.nngroup.com/articles/push-notification/), [smart-home study](https://www.nngroup.com/articles/smart-home-notifications/)); calm technology keeps everything else in the periphery ([calmtech](https://calmtech.com/)).
- Accelerators for experts, visible commands for novices; show shortcuts next to commands so people learn them ([NN/g heuristic 7](https://www.nngroup.com/articles/flexibility-efficiency-heuristic/)). Command palettes scale better than menus as features grow ([DEV](https://dev.to/thekitbase/cmdk-is-the-new-hamburger-menu-why-command-palettes-are-taking-over-saas-81d)); Linear pairs one with J/K navigation and optimistic updates ([breakdown](https://www.925studios.co/blog/linear-design-breakdown-saas-ui-2026)).
- Reading on screen: about 55 characters per line read well; very short or long lines slow reading; screens need more leading than paper (Dyson & Haselgrove 2001, via [Smashing](https://www.smashingmagazine.com/2020/07/css-techniques-legibility/) and [NN/g](https://www.nngroup.com/articles/legibility-readability-comprehension/)).
- Mobile: 3–5 primary destinations in a bottom bar; a navigation rail on larger screens ([UXPin](https://www.uxpin.com/studio/blog/mobile-navigation-examples/)).
- RTL: mirror layout, navigation and directional icons; never mirror numbers, text or non-directional icons; use logical CSS properties ([Mozilla](https://firefox-source-docs.mozilla.org/code-quality/coding-style/rtl_guidelines.html), [Material](https://m3.material.io/foundations/layout/understanding-layout/bidirectionality-rtl)). Material notes Hebrew exceptions (media controls, and some timelines and progress indicators, keep left-to-right); **test these with Hebrew readers** rather than assume.
- 2025 platform languages (Material 3 Expressive, Liquid Glass) add depth, motion and translucency; translucent layers hurt legibility ([Android Central comparison](https://androidcentral.com/apps-software/android-os/android-16-material-3-expressive-vs-ios-26-liquid-glass)). → Motion yes, glass no: text legibility comes first.

## 3. Principles

1. **The work is the interface.** A project *is* its table of contents. Status, owners, money and history hang off the pieces, not off separate dashboards.
2. **Every act leaves a record.** Anything that changes who owns, owes or decides something writes a ledger entry, and the UI shows it.
3. **Plain language first, proof on demand.** Entries read as sentences. Chain details sit one tap deeper.
4. **Approval pays.** Approving shows the payout and executes it in the same signature.
5. **Calm by default.** Writing screens are quiet. Notifications only for what blocks someone or expires.
6. **Hebrew-first, bidirectional by construction.** RTL is the default layout, built with logical properties; LTR content embeds cleanly.
7. **Fast and keyboard-able.** Optimistic updates, a command palette, J/K lists. Nothing an expert does needs a mouse.
8. **AI proposes; people decide.** AI is a named member with a role. Its work arrives as suggestions with sources, never applied silently.
9. **No manufactured motivation.** No leaderboards, streaks or confetti. Credit in a published work and a visible portfolio.
10. **Teach in place.** Empty states and inline hints, not tours.

## 4. Object model

The UI is organized around five objects. The left column is what the user sees; the right column is how it maps to today's data (types in `src/lib/types/index.ts`).

| Object | What it is | Today |
|---|---|---|
| **Team** (חבורה) | A group that organizes together: members, roles, treasury, charter | `Makom` (a place). Generalize: a team need not be a location |
| **Project** (מבצע) | A work being produced, with a table of contents, a budget and a deadline | `Mivtza` (types: course, research, publication, chaburah) |
| **Piece** (משימה) | One unit of the work (chapter, section, source analysis) with an owner, a reviewer and a reward | `Masima`, with sub-tasks as `Tafkid` |
| **Ledger entry** | A recorded act: who, what, which piece, which rule, what moved, proof | Partly `Activity` (feed) plus on-chain events; needs a real `ledger` collection |
| **Charter** | The team's roles and rules: who approves, spends, proposes; reward rates; review requirements; quorum | Spread across custom claims, contract roles and governance parameters |

### Piece stages (one model for everything)

`Open → Claimed → Drafting → In review → Changes requested ↺ → Approved → Published`, plus `Stalled` as a derived flag (no activity for N days in Drafting or In review).

Maps from `MasimaStatus`: open → Open; in_progress → Drafting (Claimed is the moment of assignment); submitted / in_review → In review; revision_requested → Changes requested; approved → Approved; published → Published.

### What counts as a ledger entry

Claim, release, submit, review submitted, changes requested, approve + payout, publish, role granted/revoked, rule changed, proposal opened/decided/executed, treasury in/out, redemption. Each entry: actor, verb, object, amount (if any), rule it was made under, timestamp, and proof (tx hash, or "off-chain" with the signer).

## 5. Information architecture

Five primary destinations: a navigation rail on desktop, a bottom bar on phones. The command palette (⌘K / Ctrl+K) reaches everything.

| # | Destination | Purpose | Replaces today |
|---|---|---|---|
| 1 | **Today** (היום) | What needs me now: reviews waiting on me, my pieces in progress, approvals, votes closing, things I'm blocking | `/` dashboard |
| 2 | **Projects** (מבצעים) | Every project as a book: TOC with stages, production board, budget | `/mivtzaot`, `/masimot`, `/tafkidim`, `/review` |
| 3 | **Desk** (שולחן) | My writing and reviewing workspace | `/masimot/[id]` content, nothing today for drafting |
| 4 | **Ledger** (פנקס) | Entries, treasury, charter, proposals | `/treasury`, `/governance` |
| 5 | **Team** (חבורה) | People, roles, portfolios | `/anash` |

Settings and the wallet live under the avatar. `/farbrengen` (discussion) folds into project threads and Today; announcements become pinned ledger notes.

## 6. Key screens

Sketches are RTL: the right edge is the start.

### 6.1 Today

```
┌──────────────────────────────────────────────────────────────┐
│  היום                                            ⌘K  (avatar) │
├──────────────────────────────────────────────────────────────┤
│  ממתין לך (3)                                                 │
│  ● ביקורת: "ניתוח קריאת שמע" — לוי מחכה 2 ימים        [פתח]  │
│  ● אישור: פרק ג׳ ב"ספר החסידות" — 120 TMIM          [אשר…]   │
│  ● הצבעה: שינוי תעריף ביקורת — נסגרת מחר             [הצבע]  │
│                                                              │
│  העבודה שלי                                                   │
│  ◐ פרק ב׳ — טיוטה · 1,200 מילים · יעד יום ה׳          [המשך] │
│                                                              │
│  בחבורה היום                                                  │
│  ✓ מנחם אישר "מקורות לפרק א׳" · שולמו 80 TMIM · 10:42        │
└──────────────────────────────────────────────────────────────┘
```
A triage list, not a dashboard of tiles: each row is one decision with one primary action. Rows clear when acted on. Empty state: "Nothing waits on you" with a link to open pieces in the user's projects.

### 6.2 Project = the book

```
┌──────────────────────────────────────────────────────────────┐
│  ספר החסידות — מבוא            ▓▓▓▓▓▓░░░░ 6/10 · יעד: ניסן   │
│  תקציב 80,000 · שולם 35,200 · מחויב 12,000      [לוח] [פנקס]  │
├──────────────────────────────────────────────────────────────┤
│  א. הקדמה            ● פורסם      מנחם       ← ביקורת: יוסף │
│  ב. שורש הנשמה       ◐ טיוטה      לוי        ⚠ תקוע 9 ימים  │
│  ג. אהבה ויראה       ◑ בביקורת    שמואל      ← יוסף          │
│  ד. ביטול היש        ○ פתוח       —  1,200 TMIM   [קח]       │
└──────────────────────────────────────────────────────────────┘
```
The TOC is the primary view; a board (columns by stage) is the alternate view for leads. Each row: stage, owner, reviewer, reward, stall warning. "Take" claims an open piece (ledger entry). The header shows budget as committed / paid / remaining, straight from the ledger.

### 6.3 Desk — writing and review

```
┌───────────────────────────────────┬──────────────────────────┐
│  ב. שורש הנשמה        טיוטה · נשמר │  מקורות | הערות | עוזר    │
│                                   │                          │
│  טקסט ההתחלה... (serif, ~55–70    │  תניא פ״ב ←               │
│  תווים בשורה, ריווח נדיב)          │  "וְנֶפֶשׁ הַשֵּׁנִית..."  │
│  ▔▔▔▔▔▔▔▔▔ (selection)            │                          │
│   [הערה] [מקור] [בדוק מול המקור]  │  הערה מיוסף על "שורש":    │
│                                   │  [הצעה: ...] [קבל] [דחה]  │
├───────────────────────────────────┴──────────────────────────┤
│  1,240 מילים · 3 הערות פתוחות          [← שלח לביקורת]        │
└──────────────────────────────────────────────────────────────┘
```
- The text column gets the width; the side panel (sources, comments, AI) opens from a selection or a tab and collapses fully. On phones it's a bottom sheet.
- Select text → a small toolbar: comment, link a source, ask an AI role ("find sources", "check against the original", "suggest a clearer wording"). Results arrive in the panel as suggestion cards: what, why, sources, accept/reject.
- Review mode is the same screen: comments anchor to text; suggestions show inline as insertions and deletions; accept or reject one by one or all at once, with a preview.
- "Send for review" writes the ledger entry and moves the piece to In review.

### 6.4 Approve (the moment that pays)

```
┌────────────────────────────────────────────┐
│  אישור "ג. אהבה ויראה"                      │
│  נכתב ע"י שמואל · נבדק ע"י יוסף (2 הערות נסגרו) │
│                                            │
│  באישור:                                   │
│  • 1,200 TMIM לשמואל מתקציב "ספר החסידות"  │
│  • 150 TMIM ליוסף על הביקורת               │
│  • הרישום לפי כלל: "תעריף פרק = 1,200"      │
│  פעולה זו נרשמת בפנקס ואינה הפיכה.          │
│                                            │
│            [ביטול]   [אשר ושלם · Face ID]   │
└────────────────────────────────────────────┘
```
The preview lists every transfer and the rule it follows, states irreversibility, and signs once with a passkey. The result is the next ledger entry, shown immediately (optimistic) and confirmed when the chain does.

### 6.5 Ledger

```
┌──────────────────────────────────────────────────────────────┐
│  פנקס  [הכל] [תשלומים] [החלטות] [כללים] [קופה]   🔍 סינון    │
├──────────────────────────────────────────────────────────────┤
│  היום                                                        │
│  ✓ מנחם אישר "ג. אהבה ויראה" — שולמו 1,350 TMIM   10:42  ⓘ   │
│  ↗ לוי פדה 500 TMIM ← 50 USDC                      09:15  ⓘ   │
│  אתמול                                                       │
│  ⚖ הצבעה נסגרה: "תעריף ביקורת 150" — התקבל 72%    18:00  ⓘ   │
└──────────────────────────────────────────────────────────────┘
```
Entries are sentences grouped by day; ⓘ expands to proof (tx hash, block, signer, rule version) and links to the piece. Filters by kind, person, project, amount. Tabs within Ledger:
- **Treasury:** balance (USDC/ETH), committed by project, paid out, redeemed; reserve against TMIM in circulation; "Redeem" for members.
- **Charter:** roles (who holds each, how granted) and rules (current value, history, the proposal that set it). "Propose a change" starts from the rule itself.
- **Proposals:** each states what changes, from what to what, when it executes; a stepper (open → voting → passed/failed → queued → executed); one-tap vote with a signed preview.

### 6.6 Team and portfolios

People with their roles and a **portfolio**: pieces written, reviews given, works published (with links to the credits), all drawn from the ledger. No leaderboard.

### 6.7 Publish

Assemble approved pieces into an edition → preview (the pamphlet or book PDF) → publish: record the edition's content hash on-chain and generate its **credits page from the ledger** (every writer, reviewer and approver, per piece). The published edition becomes a ledger entry and a public page.

### 6.8 Joining a team

Invite link → see the team, its project and its charter in plain words → "Join" creates a passkey smart wallet (no seed phrase, gas sponsored) → land on an open piece to claim, with the rules that apply to it. Recovery setup is offered after the first approved piece, when there is something to protect, and is never skippable before the first redemption.

## 7. AI as a team member

- **Roles, not a chatbot.** A team adds AI helpers with named roles from the charter: source finder, first-pass reviewer, consistency checker, translator's assistant. Each role says what it may do: suggest only, or draft into a scratch area. Never approve, never spend.
- **Invoked from the work.** From a selection or a piece's menu, with controls for scope and depth. A free-text box is available but never the only way in.
- **Output is a suggestion card:** the change, the reason, the sources (as chips that open the passage), a confidence note naming what it's unsure of, and accept/reject.
- **On the record.** Accepted AI suggestions are attributed in the piece history and appear in the credits as AI-assisted where the team's rules say so.
- **Author control.** The author can switch AI help off for a piece, or for the planning stage only.

## 8. Design language

- **Character: a sefer, not a dashboard.** Paper and ink, one accent, restrained ornament. Content screens are typographic; organizing screens are compact and tabular.
- **Type.** Hebrew serif for content (candidates: Frank Ruhl Libre, Noto Serif Hebrew; check nikud rendering), a Hebrew sans for UI (candidates: Heebo, Assistant, Noto Sans Hebrew), mono with tabular figures for amounts and hashes. Reading measure ~55–70 characters, generous leading.
- **Color.** Tokens for paper, ink, muted ink, rule, accent, and semantic states (open, drafting, review, approved, published, stalled, error). Light and dark themes from the same tokens. Stage colors always paired with an icon or label, never color alone.
- **Density.** Two modes: comfortable (Desk) and compact (Projects board, Ledger).
- **Motion.** View transitions between list and detail ([SvelteKit `onNavigate`](https://svelte.dev/blog/view-transitions)); 150–200 ms, ease-out; respect `prefers-reduced-motion`. No translucent stacked layers over text.
- **Bidirectionality.** Logical properties only (`margin-inline-start`, `inset-inline-end`); mirror navigation and directional icons; keep numbers, amounts, hashes and charts LTR; isolate LTR fragments (`<bdi>`, `dir="auto"`). Validate progress and timeline direction with Hebrew readers.
- **Accessibility.** WCAG 2.2 AA: focus visible and never obscured, 24 px minimum targets, keyboard paths for every action, screen-reader labels in Hebrew.

## 9. Technical direction

- **Stack stays:** SvelteKit 2 + Svelte 5 runes + Tailwind 4 + Firestore listeners. Add accessible headless primitives ([Bits UI](https://shadcn-svelte.com/docs), shadcn-svelte as a copy-in starting point) for dialogs, menus, popovers, command palette, tabs and toasts.
- **Design tokens** in one CSS file (`src/app.css`), consumed by Tailwind theme variables; remove inline `style=` colors, which most of today's components use.
- **Optimistic UI** for claims, comments, stage changes; reconcile from Firestore. Consider a local-first sync engine later only if latency becomes the bottleneck ([Zero](https://zero.rocicorp.dev)).
- **Data model additions:** `teams` (generalizing `mekomot`), piece body and revisions (today a masima has only a `contentUrl`), anchored `comments` and `suggestions`, a `ledger` collection written by the server alongside chain events, `charter` (roles and rules with history), `editions`.
- **Wallet:** passkey smart account on Base with a paymaster for sponsored gas, and sub accounts / spend permissions for popup-free routine actions ([Base docs](https://docs.base.org/base-account/improve-ux/sub-accounts)). Contract and backend work: approval-that-pays must call the rewards contract in the approver's signed action, or via a server relayer authorized by the charter.

## 10. Execution plan for future sessions

Each phase ships on its own and leaves the app working. Acceptance criteria are what the session proves before calling the phase done (screenshots in light and dark, RTL and phone width; `npm run check` clean; tests where logic changed).

| Phase | Build | Accept when |
|---|---|---|
| **0. Foundations** | Tokens (color, type, spacing, radius, motion) in `app.css`; fonts; light/dark; logical-property audit; Bits UI primitives; new app shell (rail + bottom bar); command palette with navigation and actions | Every existing page renders in the new shell in both themes, RTL correct, no horizontal scroll at 390 px; ⌘K reaches every route |
| **1. Projects as books** | Project page with TOC view and board view; the stage model; stalled flag; claim from TOC; Projects list | A lead can see every piece's stage, owner, reviewer and reward on one screen; claiming writes an activity/ledger entry |
| **2. Ledger (read side)** | `ledger` collection written by API routes and the chain listener; Ledger screen with sentences, filters and expandable proof; Treasury tab | Every approval, payout, vote and treasury movement in the sample data appears as a sentence with working proof links |
| **3. Desk** | Piece body storage and revisions; drafting surface; anchored comments; suggestions with accept/reject; send for review | An author drafts, a reviewer comments on a selection and suggests an edit, the author accepts it, and the history shows both |
| **4. Approve that pays** | Approval preview listing transfers and the rule applied; single signature; optimistic ledger entry | Approving a piece in the testnet setup pays writer and reviewer in one action, and the entry appears before confirmation and confirms after |
| **5. Charter and proposals** | Roles and rules screens with history; "propose a change" from a rule; proposal stepper; one-tap vote with preview | Changing a reward rate goes from proposal to executed rule, and the charter shows the new value with a link to the vote |
| **6. Today** | Triage inbox from reviews, approvals, votes and stalls; in-app notifications; push only for blocking/expiring items | A reviewer's queue, an approver's queue and a voter's deadline each appear once and clear when acted on |
| **7. Publish** | Edition assembly, preview, on-chain content hash, credits generated from the ledger, public edition page | A published edition lists every contributor and reviewer per piece, each linking to its ledger entry |
| **8. Joining and wallet** | Invite links; passkey smart wallet; sponsored gas; recovery setup; first-piece landing | A new member joins from a link and claims a piece without seeing a seed phrase or paying gas |
| **9. AI roles** | AI helpers as charter roles; selection toolbar actions; suggestion cards with sources; attribution in history and credits | An AI-suggested source change is accepted by the author and shows as AI-assisted in the piece history |
| **10. Polish** | Phone layouts for every screen, accessibility audit (WCAG 2.2 AA), performance budget (interactive < 2 s on mid-range phone), usability test with 5 Hebrew-speaking contributors | Audit and test findings fixed or logged |

**Progress** (update as phases complete): none started as of 2026-10-25.

**Order rationale:** foundations and the book view first, because every later screen lives in them; the ledger's read side before the actions that write it, so each new action is visible the moment it ships; payments and charter before publish, because credits come from them; AI last, on top of a working review flow.

## 11. Current routes → new home

| Today | New home |
|---|---|
| `/` | Today |
| `/mivtzaot`, `/mivtzaot/[id]`, `/mivtzaot/new`, `/mivtzaot/[id]/wizard`, `/mivtzaot/[id]/apply` | Projects (list, book, create, join) |
| `/masimot`, `/masimot/[id]`, `/masimot/new`, `/tafkidim`, `/tafkidim/new` | Pieces inside Projects; drafting on Desk |
| `/review` | Today (queue) + Desk (review mode) |
| `/governance`, `/governance/[id]` | Ledger → Proposals |
| `/treasury` | Ledger → Treasury |
| `/anash`, `/anash/[id]` | Team, portfolios |
| `/farbrengen` | Project threads; pinned notes in the Ledger |
| `/signup` | Joining (invite → passkey) |
| `/settings` | Avatar menu |

## 12. Open questions

1. Is a team always one project's crew, or a standing group running many projects? (The model allows both; the default screen differs.)
2. Should approval pay automatically for every piece, or can a team's charter require a second approver above an amount?
3. Where do piece bodies live: Firestore, IPFS, or Firestore with a content hash anchored at publish?
4. Do ranks survive as charter-granted roles (trust), or disappear in favour of portfolios? (See `MARKETING_BRIEF.md` §13.)
5. Which AI provider and which roles first? (Source finding is the safest start.)

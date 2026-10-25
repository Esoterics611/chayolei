# chayolei — conventions for Claude sessions

Chayolei Beis Dovid: a SvelteKit web app (Firebase backend) plus Solidity contracts on Base, for Torah scholarship organised as campaigns (mivtzaot) → assignments (masimot) → sub-tasks (tafkidim), rewarded in the TMIM token and governed on-chain. `README.md` is the overview; `docs/` holds older specs and plans.

## Economic model — decided by the owner, 2026-10-25

This overrides anything in `docs/` or older code that says otherwise.

- **Crypto only, in our own coin.** The platform operates in **TMIM**: budgets, rewards, payouts, balances and statements are all TMIM.
- **No fiat, no ramps.** No card, bank, ACH, Stripe, Zelle, Venmo, cash or check flows; no fiat on-ramps or off-ramps; no USD-denominated records in the app.
- **Conversion happens outside the platform.** A user may swap TMIM for other crypto and off-ramp through an exchange such as Coinbase. That is the user's own business: the app doesn't offer, embed or link swaps or off-ramps, and its copy shouldn't suggest it does.
- **No institutional connection.** No fiscal sponsor, 501(c)(3), tax receipts, donor-advised-fund routing, payment processors or banks.
- **Donations are handled separately**, outside the platform. The app does not take, log or acknowledge them, and the contracts never mint TMIM for money sent in.
- **TMIM is minted only for participation**: accepted deliverables and tasks, reviews and other participation rewards (`docs/SPEC_2_DAO_REQUIREMENTS.md` §2.1, §2.2, §2.4, §2.5).

Still in the code from before this decision: the contracts can redeem TMIM for USDC at a set rate (`ChayoleiTreasury.redeemTmim`, `GovernanceTreasury.redeem`), and today's treasury page shows USDC and a redemption calculator. Redemption will be decided by the owner in the future (`docs/MARKETING_BRIEF.md` §13); until then, don't build UI around USDC or redemption.

Docs written before this decision still describe fiat donations, fiscal sponsors, institutional partnerships, USDC payouts and donation-minted TMIM: `docs/GO_TO_MARKET.md`, `docs/INVESTOR_PITCH.md`, `docs/PUBLIC_INTRODUCTION.md`, `docs/TOMCHEI_TMIMIM_OVERVIEW.md`, `docs/SPEC_1_ACADEMIC_UI.md`, `docs/SPEC_2_DAO_REQUIREMENTS.md`, `docs/BACKEND_PLAN.md`. Each carries a note at the top naming what is superseded. Don't build from those parts, and don't reintroduce them in code or copy.

## Positioning and UX direction — decided by the owner, 2026-10-25

Chayolei is building **three parallel systems on a decentralized ledger**, for any small team anywhere, independent of the banking and corporate-legal systems of any country:

1. **A parallel banking system:** the team's treasury, budgets, payouts and statements, in TMIM.
2. **A parallel corporate organization:** a versioned charter (the team's bylaws), roles, proposals and votes, and a decision log (its minutes).
3. **A parallel workforce management system:** objectives broken into deliverables and tasks, owners and reviewers, GitHub-style versions and reviews of the work, acceptance that pays, and each person's record of work.

All three share one ledger, and every change to work, rules or money follows one pattern: propose → decide → record.

- `docs/MARKETING_BRIEF.md`: positioning, the three systems, audiences, message pillars, claims we don't make, open questions. It supersedes the framing in `README.md`'s older sections, `PUBLIC_INTRODUCTION.md`, `TOMCHEI_TMIMIM_OVERVIEW.md`, `INVESTOR_PITCH.md` and `GO_TO_MARKET.md` where they disagree.
- `docs/UX_REDESIGN.md`: the plan for a complete UI redo: research, principles, object model, screens, and an execution plan in phases (§11). UI work follows it; check which phases are done before starting one, and record progress there.
- `docs/PITCH_ARTIFACT_PROMPT.md`: a self-contained prompt for a separate session to build a pitch artifact.
- `docs/UX_TECH_DESIGN.md`: how the new UI is built. Domain in `src/lib/team` (engine, ledger, seed, i18n, store; `npm run test:unit`), components in `src/lib/ui` (presentational) and `src/lib/app` (read the store), screens in `src/routes/(app)`; the old pages live on in `src/routes/(classic)`. Every string goes in both dictionaries of `src/lib/team/i18n.ts`. `bash scripts/build-demo.sh` builds the clickable demo.

"Independent of the banking and legal system" means a team can organize, decide and pay without needing a bank account, a registered company or an institution. It does not mean the product is a bank, a legal entity or a way around the law; see the brief's "claims we don't make".

## Related repo
`Esoterics611/beis` forked this codebase on 2026-10-17 to build a broader product on the same engine. Fixes to shared engine code (governance, auth, contracts) may need porting there.

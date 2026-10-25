# chayolei — conventions for Claude sessions

Chayolei Beis Dovid: a SvelteKit web app (Firebase backend) plus Solidity contracts on Base, for Torah scholarship organised as campaigns (mivtzaot) → assignments (masimot) → sub-tasks (tafkidim), rewarded in the TMIM token and governed on-chain. `README.md` is the overview; `docs/` holds older specs and plans.

## Economic model — decided by the owner, 2026-10-25

This overrides anything in `docs/` or older code that says otherwise.

- **Crypto in, crypto out.** The treasury holds crypto (ETH/USDC on Base) and pays out crypto (TMIM redeemed for USDC on-chain).
- **No fiat.** No card, bank, ACH, Stripe, Zelle, Venmo, cash or check flows; no fiat on-ramps or off-ramps; no USD-denominated donation records in the app.
- **No institutional connection.** No fiscal sponsor, 501(c)(3), tax receipts, donor-advised-fund routing, payment processors or banks.
- **Donations are handled separately**, outside the platform. The app does not take, log or acknowledge them, and the contracts never mint TMIM for money sent in.
- **TMIM is minted only for participation**: approved masimot and tafkidim, peer reviews and other participation rewards (`docs/SPEC_2_DAO_REQUIREMENTS.md` §2.1, §2.2, §2.4, §2.5).

Docs written before this decision still describe fiat donations, fiscal sponsors, institutional partnerships and donation-minted TMIM: `docs/GO_TO_MARKET.md`, `docs/INVESTOR_PITCH.md`, `docs/PUBLIC_INTRODUCTION.md`, `docs/TOMCHEI_TMIMIM_OVERVIEW.md`, `docs/SPEC_1_ACADEMIC_UI.md`, `docs/SPEC_2_DAO_REQUIREMENTS.md`, `docs/BACKEND_PLAN.md`. Each carries a note at the top naming what is superseded. Don't build from those parts, and don't reintroduce them in code or copy.

## Positioning and UX direction — decided by the owner, 2026-10-25

Chayolei is **an organizing tool for teams that produce and publish, with a shared ledger at its core**: the ledger records every contribution, review, payment and decision, and holds the team's funds (crypto) and rules. The UX is optimized for content production and publishing.

- `docs/MARKETING_BRIEF.md` — positioning, audiences, message pillars, vocabulary, claims we don't make. It supersedes the framing in `README.md`, `PUBLIC_INTRODUCTION.md`, `TOMCHEI_TMIMIM_OVERVIEW.md`, `INVESTOR_PITCH.md` and `GO_TO_MARKET.md` where they disagree.
- `docs/UX_REDESIGN.md` — the plan for a complete UI redo: research, principles, object model, screens, and an execution plan in phases (§10). UI work follows it; check which phases are done before starting one, and record progress in that section.

"Legal and banking" in the owner's words means the ledger itself: holding funds, paying people, recording roles, rules and decisions on-chain. Not bank or legal-entity integrations, which the economic model rules out.

## Related repo
`Esoterics611/beis` forked this codebase on 2026-10-17 to build a broader product on the same engine. Fixes to shared engine code (governance, auth, contracts) may need porting there.

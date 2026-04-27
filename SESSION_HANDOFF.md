# Chayolei DAO — Session Handoff (2026-04-25, strategic update 2026-04-26)


Single source of truth for resuming work after a credit/context break. Pairs with `~/.claude/projects/C--code-vanguard/memory/project_chayolei_c1_fix.md`.

---

## 0. Strategic posture (added 2026-04-26)

Three strategic decisions taken this session that affect everything below:

1. **Vanguard parent project is deprioritized.** Chayolei ships standalone. Engine extraction (`@vanguard/core`) and parent backport happen *later*, after Chayolei has traction. The V1 (Vanguard web3 foundation) session prompt below is **shelved** — do not pick it up.
2. **Addressable market is the entire Torah-learning world**, not Lubavitch alone. Tomchei Tmimim heritage stays in the docs. GTM, copy, audience targeting, and donor strategy now address Modern Orthodox/YU, Religious Zionism, Chabad, other Chassidic streams, Yeshivish/Litvish, Sephardic, and serious-secular learners. Cross-stream pluralism is a structural feature.
3. **Ronnie is the initial mashpia.** Two publications co-produced with Claude (AI-augmented Torah scholarship) are the first real mivtzaot. They need funding. The platform's first cohort is being recruited to assist on these publications. This collapses the prior "find a first makom" gap entirely.

Strategic reference docs (in repo, not memory):
- `chayolei/INTERNAL_STATUS.md` — full strategic brief: status, gaps, value, marketing, competitors, donation infrastructure
- `chayolei/GO_TO_MARKET.md` — 5-stage GTM plan with concrete 30-day plan
- `chayolei/INVESTOR_PITCH.md` — donor / mission-investor pitch document
- `chayolei/PUBLIC_INTRODUCTION.md` — open-source / community-facing intro

Memory note: `~/.claude/projects/C--code-vanguard/memory/project_engine_verticals_strategy.md` describes the engine + verticals reframe.

### Operational priorities derived from the strategic update

The work pipeline shifts to the following execution order. Original technical sessions (C2-C6) remain valid; new sessions (D1-D4) handle the donation/publication infrastructure that the new strategy demands.

| Session | What it does | Priority |
|---|---|---|
| C3 | Finish governance execution hardening (compile + test) | High — was already in flight |
| **D1** | **Donation rail: landing page + manual donation tracker** | **High — funding the publications is blocking** |
| C5 | GovernanceTreasury + MasimaRewardsV2 hardening + tests | High — needed before mainnet |
| **D2** | **Publication-as-mivtza workflow + contributor onboarding polish** | **High — first mivtzaot need this** |
| C4 | Governance test coverage to ≥95% + invariant tests | Medium — pre-audit prep |
| **D3** | **Online donation flow integrated with fiscal sponsor** | **High once fiscal sponsor signed (~Day 60)** |
| C6 | Slither + mythril + audit prep package | Medium — pre-audit prep |
| **D4** | **Cross-stream copy and rabbinic council infrastructure** | **Medium — needed for public launch** |
| (External audit) | Trail of Bits / Spearbit / OpenZeppelin / Code4rena | Required before mainnet |
| (Mainnet deploy) | Re-deploy hardened contracts to Base mainnet | After audit clears |

V1 (Vanguard web3 foundation) is shelved — do not pick it up.

---

## 1. What is deployed and live

### C1 — Rank Attestation Security Fix (DONE, on-chain)
Critical governance-takeover vulnerability closed. `castVote()` previously trusted caller-supplied `rankIndex`; now requires an EIP-712 signed `RankAttestation`.

| Item | Value |
|---|---|
| New `ChayoleiGovernance` (Base Sepolia) | `0xa7E7098012C6DE7395128f8d3afE606C3C9Fc084` |
| Old (vulnerable) governance | `0x41abE63667e332545a20Ae2EfB18A288F08abC8A` — `GOVERNANCE_ROLE` revoked |
| Attestation signer address | `0xf90c4d97F5bD42ad30E5ed60539D2d340F502796` |
| Signer key location | `chayolei/.env` → `ATTESTATION_SIGNER_PRIVATE_KEY` |
| Tests | 35 passing (22 attestation + 13 lifecycle) |

**Files shipped (on `main`, working tree dirty):**
- `contracts/contracts/ChayoleiGovernance.sol` — EIP-712 + ECDSA, `APPROVER_ROLE`, `RankAttestation` struct
- `contracts/hardhat.config.ts` — solc 0.8.28 + `evmVersion: 'cancun'` (OZ 5.6.1 needs `mcopy`)
- `contracts/test/ChayoleiGovernance.test.ts`
- `contracts/scripts/redeploy-governance-c1.ts`
- `contracts/scripts/verify-c1.ts`
- `src/lib/server/attestation.ts` — backend EIP-712 signer (reads rank from on-chain `ChayoleiRegistry`, NOT Firestore)
- `src/routes/api/governance/attestation/+server.ts`
- `src/routes/api/governance/proposals/[id]/vote/+server.ts`
- `src/lib/stores/app.svelte.ts` (castVote method)
- `.env`, `.env.example`

**Rotate the signer:** `APPROVER_ROLE` calls `setAttestationSigner(newSigner)` on the governance contract. Production should move the key to a KMS/HSM.

---

## 2. What shipped — C3 + D1 (2026-04-26, DONE)

### C3 — Execution Hardening (DEPLOYED + VERIFIED on Base Sepolia)

**New governance:** `0x1589ca8E04be8e8F76261EacDE2f1C6687B356e8`
**Pre-C3 (revoked):** `0xa7E7098012C6DE7395128f8d3afE606C3C9Fc084`

Changes:
1. `ProposalType` enum (SIGNAL=0 … MONTHLY_CAP_UPDATE=9) — matches SPEC_2 §2B.
2. `propose()` → `(ProposalType, title, description, target, callData, quorumOverride)` — **breaking ABI change**.
3. Trusted-target whitelist + per-type selector whitelist (bootstrapped on-chain via `bootstrapSelectorWhitelist`).
4. `votingStart` enforcement in `castVote`.
5. Gas-reserved `executeProposal` + `ExecutionAttempted` event.
6. `_extractRevertReason` using byte-copy (no assembly; viaIR-compatible).
7. 51 tests passing; `chayolei/.env` updated; `baseSepolia.json` updated.

**Remaining:** Backend + frontend still use the OLD `propose()` ABI. Run SESSION C3-BACKEND next.

---

### D1 — Donation Rail v0 (DONE, 2026-04-26)

Manual donation collection capability shipped. Files created:

| File | Purpose |
|---|---|
| `src/lib/server/support-donations.ts` | `logDonation()` + `generateAcknowledgment()` |
| `src/routes/api/support/donations/+server.ts` | GET (public ledger) + POST (officer-only) |
| `src/routes/api/support/acknowledgment/[id]/+server.ts` | GET officer-only acknowledgment |
| `src/routes/support/+page.svelte` | Public "Support the Publications" landing page |
| `src/routes/support/ledger/+page.svelte` | Public donor ledger |
| `src/routes/admin/donations/+page.svelte` | Admin logger (email-gated to ronnie.rendel@gmail.com) |
| `.env` / `.env.example` | `DONATION_TRACKING_WALLET=` added |

Type check clean (dataconnect errors are pre-existing, ignore them).

**Next on the D-track:** D3 — online donation flow (blocked: fiscal sponsor not signed yet).

---

### D2 — Publication-as-Mivtza Workflow (DONE, 2026-04-26)

Publication-first platform affordances shipped. Type check clean.

| File | What changed |
|---|---|
| `src/lib/types/index.ts` | 9 new `MasimaType` values; `PublicationMeta`, `PublicationFormat`, `PublicationLicense`, `MivtzaApplication` interfaces; `MASIMA_TYPE_DEFAULTS` record; `Mivtza.publicationMeta` field |
| `src/lib/utils/format.ts` | `formatMasimaType` extended; `formatPublicationFormat`, `formatPublicationLicense` added |
| `src/lib/stores/app.svelte.ts` | `addMivtzaApplication()` public method |
| `src/routes/masimot/new/+page.svelte` | All 15 masima types in two groups (general / publication-specific); auto-fills TMIM default on type change |
| `src/routes/mivtzaot/new/+page.svelte` | Publication metadata section (titleHe/En, subtitle, format, license, audience, length, deadline, budget) appears when type=publication |
| `src/routes/mivtzaot/[id]/+page.svelte` | Publication dashboard tab (progress, contributor stats, CID link, support CTA); "אשף" and "הגש מועמדות" buttons in masimot tab |
| `src/routes/mivtzaot/[id]/apply/+page.svelte` | NEW — 300-word contributor application form, POST to API |
| `src/routes/mivtzaot/[id]/wizard/+page.svelte` | NEW — officer bulk masima creation wizard (table UI, global deadline, auto-fill reward by type) |
| `src/routes/api/mivtzaot/[id]/applications/+server.ts` | NEW — GET (officer list), POST (submit application), PATCH (approve/reject; auto-enrolls on approval) |

**Remaining D-track:** D3 — blocked pending fiscal sponsor. D4 — cross-stream copy/rabbinic council.

### V1 — Vanguard web3 foundation (SHELVED per §0)
Do not pick up.

---

## 3. SPEC_2 reference (the source of truth)

`chayolei/SPEC_2_DAO_REQUIREMENTS.md` is the complete DAO spec (1909 lines). Most relevant sections:

- **§2B lines 415–504** — `ProposalType`, `Proposal` struct, events, state vars
- **§2B lines 519–650** — `propose()`, `castVote()`, `finalizeProposal()`, `execute()`
- **§2B lines 547–557** — Type → target → selector whitelist matrix (the table I encoded into `bootstrapSelectorWhitelist`)
- **§2B line 621** — Supermajority (66% bps) required for `PARAMETER_UPDATE`, `MONTHLY_CAP_UPDATE`, `GRANT_ROLE` — **NOT YET IMPLEMENTED in C3**

### Selector matrix encoded in `bootstrapSelectorWhitelist`
| ProposalType | Target | Selector source |
|---|---|---|
| `REDEMPTION_RATE` | GovernanceTreasury | `setRedemptionRate(uint256)` |
| `MONTHLY_CAP_UPDATE` | GovernanceTreasury | `setMaxMonthlyMint(uint256)` |
| `EMERGENCY_PAUSE` | GovernanceTreasury | `pause()` |
| `EMERGENCY_UNPAUSE` | GovernanceTreasury | `unpause()` |
| `MIVTZA_FUNDING` | GovernanceTreasury | `createStream(address,uint256,uint256)` |
| `TREASURY_TRANSFER` | GovernanceTreasury | `cancelStream(uint256)` |
| `MINT_TOKENS` | TMIMToken | `mint(address,uint256,string)` |
| `GRANT_ROLE` | (any trusted target) | `grantRole(bytes32,address)` |

`SIGNAL` proposals require `target == 0 && callData.length == 0`.

---

## 4. Architectural decisions worth remembering

- **Rank authority lives on-chain** — backend `attestation.ts` reads rank via `ChayoleiRegistry.getRank(voter)`, NOT Firestore. The on-chain registry is canonical.
- **Attestations are bound to `proposalId`** — extends the bare-spec attestation to prevent cross-proposal replay (defense in depth on top of the nonce).
- **Signer rotation is `APPROVER_ROLE`-gated, not admin** — the DAO multisig can revoke a compromised backend key without holding `DEFAULT_ADMIN_ROLE`.
- **`evmVersion: cancun` is required** — OZ 5.6.1's storage helpers use the `mcopy` opcode (Cancun, March 2024). Solc 0.8.24 default `paris` will fail to compile.
- **No mock data in chayolei/** — the SvelteKit AppStore has live Firebase listeners. Don't reintroduce mocks.

---

## 5. Resume prompts (paste into a fresh session)

Pick one. Each prompt is self-contained for a fresh agent — do not assume conversation context.

### Prompt: SESSION C3 (finish the contract hardening)

```
Resume Session C3 (Chayolei governance execution hardening). Read
chayolei/SESSION_HANDOFF.md for full context.

Current state: chayolei/contracts/contracts/ChayoleiGovernance.sol was rewritten
with ProposalType enum, target/selector whitelist, votingStart, gas-reserved
execute. NOT YET COMPILED. The test file
chayolei/contracts/test/ChayoleiGovernance.test.ts has new PT_* enum constants
at the top but the 7 `propose(...)` call sites still use the OLD 5-arg
signature, so the suite will not compile until they are updated.

Tasks:
1. Update every `governance.connect(*).propose(...)` call in
   ChayoleiGovernance.test.ts to use the new 6-arg signature
   `(ProposalType, title, description, target, callData, quorumOverride)`.
   For all existing tests use `PT_SIGNAL` (= 0) with target=ZeroAddress and
   callData='0x', since they are signaling proposals.
2. Add a NEW describe block "C3 — target/selector whitelist" with these tests:
   - propose() with non-SIGNAL type and zero target reverts "Target zero"
   - propose() with non-SIGNAL type targeting an un-allowlisted address reverts "Target not trusted"
   - propose() with non-SIGNAL type and empty callData reverts "Calldata too short"
   - propose() with allowlisted target but disallowed selector reverts "Selector not allowed"
   - propose() with allowlisted target+selector for that type succeeds and emits
     ProposalCreated with the right proposalType
   - SIGNAL proposal with non-empty callData reverts "SIGNAL must be no-op"
   - bootstrapSelectorWhitelist() seeds the SPEC_2 matrix correctly
   - setTrustedTarget / setAllowedSelector are DEFAULT_ADMIN_ROLE-only
3. Add a NEW describe block "C3 — execution gas control":
   - Deploy a GasBurnVictim mock (helper contract that loops until OOG)
   - Verify executeProposal reverts cleanly when callee burns all gas
   - Verify ExecutionAttempted is emitted with success=false on failed call
   - Verify executionGasReserve is admin-tunable and clamped [10_000, 500_000]
   - Verify revert reason from callee is surfaced in the require message
4. `cd chayolei/contracts && npx hardhat compile && npx hardhat test`.
   Fix any compile/test failures. Keep existing 35 tests passing.
5. When green, write a redeploy script chayolei/contracts/scripts/redeploy-governance-c3.ts
   modeled on redeploy-governance-c1.ts. It must:
     - Deploy new ChayoleiGovernance with same admin + tmim + attestationSigner
     - Call bootstrapSelectorWhitelist(treasury, tmim, registry) using addresses
       from deployments/baseSepolia.json
     - Re-wire GovernanceTreasury.GOVERNANCE_ROLE to the new contract, revoke
       from old (preC3) — same pattern as C1
     - Save old addr under previousContracts.ChayoleiGovernance_preC3
     - Print VITE_GOVERNANCE_ADDRESS for .env
6. Run the script against Base Sepolia, update chayolei/.env's
   VITE_GOVERNANCE_ADDRESS, and write a chayolei/contracts/scripts/verify-c3.ts
   that reads back trustedTargets and a few allowedSelectors to confirm
   bootstrap landed correctly.
7. Update memory/project_chayolei_c1_fix.md (rename if needed) to record the
   new C3 contract address and what changed.

Do not start C2 or C4. Stop at "C3 deployed and verified".
```

### Prompt: SESSION C3-BACKEND (update API + UI for new propose ABI)

```
Resume Session C3-BACKEND for Chayolei. Read SESSION_HANDOFF.md for context.

Pre-req: C3 contract is deployed (run SESSION C3 first if not). The new
governance address is in chayolei/.env as VITE_GOVERNANCE_ADDRESS.

The propose() ABI changed — first arg is now uint8 ProposalType. Update:

1. chayolei/src/lib/types/index.ts — add ProposalType union matching the
   on-chain enum (SIGNAL=0..MONTHLY_CAP_UPDATE=9). Map proposal docs in
   Firestore to/from the enum index.
2. chayolei/src/routes/api/governance/proposals/+server.ts (POST) — accept
   `proposalType` in the request body, validate it against the enum, and
   persist it on the Firestore proposal doc. Today this endpoint only writes
   to Firestore; if it also calls the on-chain contract, pass the enum index
   as the new first arg to `propose()`.
3. chayolei/src/routes/governance/new/+page.svelte (or equivalent
   "create proposal" form) — add a ProposalType dropdown with Hebrew labels
   per SPEC_2 lines 1271-1282. Default selection: SIGNAL.
4. chayolei/src/lib/stores/app.svelte.ts — wherever proposals are created or
   read, surface proposalType. Existing proposals lacking the field should
   default to SIGNAL on read.
5. Run `npm run dev` in chayolei/, open the proposal create page, file a
   SIGNAL proposal end-to-end, file a REDEMPTION_RATE proposal that
   targets the GovernanceTreasury address with setRedemptionRate(500),
   confirm both land. Test in browser, do not just claim it works.

Do not start V1 or C4.
```

### Prompt: SESSION C2 (move governance fully on-chain)

```
Resume Session C2 (move chayolei governance proposals fully on-chain). Read
chayolei/SESSION_HANDOFF.md and chayolei/SPEC_2_DAO_REQUIREMENTS.md §2B
for context.

Pre-req: C3 must be done — backend needs the new propose() ABI shape.

Today: chayolei/src/routes/api/governance/proposals/+server.ts POST writes
proposals to Firestore only. castVote does call the contract (post-C1) but
the proposer flow does not.

Goals:
1. POST /api/governance/proposals must call ChayoleiGovernance.propose() and
   wait for ProposalCreated. Use the same wallet that owns PROPOSER_ROLE
   (deployer for now — replace with DAO multisig later). Persist the
   on-chain proposalId to Firestore.
2. Add a Firestore-vs-chain reconciliation event listener:
   chayolei/src/lib/server/governance-listener.ts — subscribes to
   ProposalCreated, VoteCast, ProposalQueued, ProposalExecuted, ProposalCancelled,
   updates the matching Firestore doc. Run via Cloud Function or a SvelteKit
   hook on server start.
3. Frontend castVote: today the user's wallet is asked to send the tx
   directly. Confirm this still works after C3 (votingStart enforcement).
4. Backfill: write a one-off chayolei/contracts/scripts/sync-firestore-from-chain.ts
   that walks proposalCount on-chain and replays each proposal into
   Firestore. Idempotent.
5. Tests: chayolei/src/lib/server/governance-listener.test.ts using a local
   Hardhat node + Firestore emulator. At minimum cover ProposalCreated and
   VoteCast event handling.

Do not start C4. Update SESSION_HANDOFF.md when done.
```

### Prompt: SESSION V1 (Vanguard web3 foundation) — SHELVED 2026-04-26

Vanguard parent project is deprioritized. Do not pick this up. See §0 above.
Engine extraction and parent backport happen later, after Chayolei has traction.

---

### Prompt: SESSION D1 (donation rail v0 — manual flow + landing page)

```
Resume Session D1 (Chayolei donation rail v0). Read SESSION_HANDOFF.md §0 for
strategic context and chayolei/GO_TO_MARKET.md Stage 0 for the donation rail
spec. Goal: stand up the immediate donation-collection capability so Ronnie
can start receiving funding for the two publications-in-development before
the formal fiscal sponsor + online flow is ready.

Build:

1. chayolei/src/routes/support/+page.svelte — public "Support the Publications"
   landing page. Sections:
   - Hero: tagline + 2-sentence ask
   - Two publication cards (placeholder titles + scope; Ronnie will fill in)
     with funding goals (placeholder: $50k each) and progress thermometers
   - "How to give right now" panel: cash, check (mailing address TBD), Zelle
     (placeholder email), Venmo (placeholder), USDC to a designated wallet
     (placeholder address)
   - "Coming soon: tax-deductible online giving" note
   - Contact email: ronnie.rendel@gmail.com
   - Acknowledgment paragraph: not a 501(c)(3) yet; donations not yet
     tax-deductible; fiscal sponsor in negotiation

2. chayolei/src/routes/support/+page.server.ts — server load that reads the
   donation tracker from Firestore (collection: `support_donations`) and
   computes per-publication totals for the thermometers.

3. chayolei/src/lib/server/support-donations.ts — server module with:
   - logDonation({ donor, amount, currency, intent, channel, contactEmail, notes })
     writes to Firestore + mints corresponding TMIM to a tracking treasury wallet
   - generateAcknowledgment({ donationId }) returns rendered acknowledgment letter
     (plain text + HTML), positioned as a "support letter" not a "tax receipt"

4. chayolei/src/routes/admin/donations/+page.svelte — Ronnie-only admin view
   (gate by hard-coded admin email check from session) for:
   - Logging a manual donation (form for the fields above)
   - Viewing the full donation ledger
   - Triggering the acknowledgment letter for any donation
   - Reconciliation view: off-chain donation total vs. on-chain TMIM minted

5. Public reconciliation: chayolei/src/routes/support/ledger/+page.svelte —
   read-only public ledger showing donation events (amount + intent + date,
   donor name only if consented) alongside the on-chain TMIM mint events.
   This is the "transparent treasury" promise made concrete.

Constraints:
- Use existing patterns from chayolei/src/lib/stores/app.svelte.ts (Svelte 5 runes,
  live Firebase listeners). NO mock data.
- Use existing sacred-night theme tokens (indigo-black bg, gold/sapphire/emerald accents).
- The publications scope is a placeholder — leave clearly editable copy that
  Ronnie can fill in with the real titles and details.
- The TMIM tracking wallet address is a placeholder — Ronnie will provision
  a real Safe multisig before this goes live in production.

Stop after: support page renders, admin page can log a test donation, and the
ledger page shows the test entry alongside the on-chain TMIM mint event for it.
Verify in a real browser.

Do not start D2 or D3.
```

### Prompt: SESSION D2 (publication-as-mivtza workflow)

```
Resume Session D2 (Chayolei publication mivtza workflow). Read SESSION_HANDOFF.md
§0 + chayolei/GO_TO_MARKET.md Stage 1 for context. Pre-req: D1 complete.

Goal: make the platform first-class for the "publication as mivtza" workflow
that Ronnie's two in-development publications need. Today the mivtza/masima/
tafkid model is generic — it works but doesn't have publication-specific
affordances.

Build:

1. New masima types specific to publication production. Add to
   chayolei/src/lib/types/index.ts and the masima creation form:
   - `source_collection` (already exists — verify default reward)
   - `translation`
   - `original_analysis` (chiddush)
   - `peer_review` (already exists — verify)
   - `scholarly_footnote`
   - `editing` (already exists — verify)
   - `proofreading`
   - `formatting_typesetting`
   - `indexing`
   - `design_layout`
   Each with default base TMIM rewards per SPEC_2 §2A §3 (calibrate where new).

2. Mivtza-as-publication metadata. Extend the Mivtza Firestore doc + UI to optionally
   include:
   - `publication_title` (Hebrew + English)
   - `publication_subtitle`
   - `target_format` (enum: print, ebook, web_native, source_anthology, hybrid)
   - `target_audience` (free text)
   - `target_length` (optional pages or word count)
   - `target_deadline` (date)
   - `total_budget_tmim` (number)
   - `license` (enum: CC-BY-SA, CC-BY-NC, all_rights_reserved, custom)
   - `manuscript_ipfs_cid` (optional, for the in-progress / final manuscript hash)

3. Publication mivtza dashboard: chayolei/src/routes/mivtzaot/[id]/+page.svelte
   should, when the mivtza has publication metadata, show:
   - Production progress (% of masimot approved vs total)
   - Total TMIM allocated vs. spent
   - Contributor list with their rank, masimot completed, TMIM earned (with
     consent-gated visibility)
   - Current manuscript download (if cid present)
   - "Donate to this publication" button → links to /support with intent prefilled

4. Contributor onboarding polish. The signup flow currently asks for makom and
   basic info. Add:
   - "I want to contribute to a publication" path
   - Show available publication mivtzaot
   - Pick one or more to apply to
   - Submit a brief application (300 words: scholarly background, why this mivtza)
   - Mashpia (Ronnie initially) reviews + approves into the mivtza

5. Admin: bulk-create the masima skeleton for a publication. A new mivtza for
   a 200-page sefer might need 50+ masimot; a wizard that takes a structured
   outline and produces the masimot with appropriate types and rewards saves
   hours of manual creation.

Constraints:
- Backwards compatible — existing non-publication mivtzaot keep working
- Use Svelte 5 runes, Tailwind v4 theme tokens, Hebrew RTL layout
- All Firestore writes go through existing AppStore patterns
- Reward calibration must respect the halachic principle: rewards trigger on
  approved deliverable, NOT on time spent

Stop after: a publication mivtza can be created with full metadata, masimot
created via wizard, contributors can apply via the new onboarding path, and
the publication dashboard renders correctly. Verify in a real browser.

Do not start D3 or D4.
```

### Prompt: SESSION D3 (online donation flow with fiscal sponsor)

```
Resume Session D3 (Chayolei online donation flow). Read SESSION_HANDOFF.md §0
+ chayolei/GO_TO_MARKET.md Stage 0 (Phase 2/3 of the donation rail) for
context.

Pre-req: A fiscal sponsor agreement is signed (out-of-band; check
chayolei/.env or a new chayolei/FISCAL_SPONSOR.md doc for the integration
parameters). If no sponsor is yet signed, STOP — this session can't proceed
without their integration spec. Notify Ronnie and pick up D2 or C5 instead.

Goal: replace the manual donation flow from D1 with a real online donation
rail that takes credit card + ACH + USDC, issues tax receipts via the fiscal
sponsor, and continues to mint corresponding TMIM into the treasury with
acknowledgment to donors.

Build:

1. Stripe integration for card + ACH:
   - chayolei/src/lib/server/stripe.ts — initialize Stripe SDK with secret key
     from .env (STRIPE_SECRET_KEY)
   - chayolei/src/routes/api/donate/stripe/+server.ts — POST endpoint that
     creates a Stripe Checkout Session with the donation amount, intent
     (publication_id or general), donor email, and redirects to Stripe-hosted
     checkout. metadata field carries our internal donation_id and intent.
   - chayolei/src/routes/api/donate/stripe/webhook/+server.ts — Stripe webhook
     handler that, on `checkout.session.completed`, calls the fiscal sponsor's
     API to issue the tax receipt and calls our internal logDonation() to mint
     corresponding TMIM and record the donation.

2. USDC / ETH direct-to-treasury:
   - chayolei/src/routes/donate/crypto/+page.svelte — show the treasury
     address(es) for direct USDC and ETH donations on Base. QR codes,
     copy-to-clipboard.
   - Backend listener (chayolei/src/lib/server/donation-listener.ts) watches the
     treasury contract for incoming Transfer events, identifies as donations,
     and calls logDonation() + mints TMIM acknowledgment to the donor's wallet.

3. Updated /support page from D1:
   - Replace placeholder "How to give right now" panel with a real donate
     button that opens a flow: amount input, optional designation (general /
     specific publication / specific contributor), payment method selector
     (card / ACH / USDC / ETH), and donor info (name, email, optional public
     attribution preference).
   - Add recurring donation tiers: $18, $36, $180, $360, $1,800, $3,600
     monthly (chai-multiples). Stripe handles via subscription mode.

4. Fiscal sponsor integration:
   - chayolei/src/lib/server/fiscal-sponsor.ts — adapter to the sponsor's API
     (the specific API depends on which sponsor is signed; common patterns:
     a webhook + a REST endpoint to record the donation against their EIN).
   - On every successful Stripe charge, send the donation to the sponsor for
     them to issue the tax receipt directly to the donor.

5. Donor portal: chayolei/src/routes/donor/[address]/+page.svelte (gated to the
   donor wallet or via signed magic link from email):
   - Shows their cumulative donations
   - Which mivtzaot their donations funded
   - Which contributors received stipends from those mivtzaot (with consent)
   - Downloadable history for tax records

Constraints:
- All payment data flows through Stripe and the fiscal sponsor — we do NOT
  hold card data, do NOT issue tax receipts ourselves, do NOT custody fiat.
- Crypto donations go to a Safe multisig treasury (3-of-5 recommended;
  signers TBD by Ronnie).
- Reuse the donation tracker from D1 — this is replacing the manual side, not
  rebuilding the ledger.

Stop after: a test $5 card donation flows end-to-end (Stripe checkout →
webhook → fiscal sponsor receipt issued → TMIM minted → ledger updated →
donor portal shows the donation). Use Stripe test mode.

Do not start D4.
```

### Prompt: SESSION D4 (cross-stream copy + rabbinic council infrastructure)

```
Resume Session D4 (Chayolei cross-stream UI/copy and rabbinic council).
Read SESSION_HANDOFF.md §0 + chayolei/INTERNAL_STATUS.md §6 (audience
segmentation) + chayolei/GO_TO_MARKET.md Stage 0 (rabbinic advisory council)
for context.

Goal: prepare the platform's public-facing surfaces for the broader
Torah-world audience (not just Lubavitch), and add infrastructure for
displaying the cross-stream rabbinic advisory council.

Build:

1. Public-facing copy audit:
   - Review every string in chayolei/src/routes/+page.svelte (landing) and
     chayolei/src/routes/about/+page.svelte (about, create if missing).
   - Identify Lubavitch-specific terminology that wouldn't read well to MO,
     RZ, Sephardic, or general-Torah audiences.
   - Update to broader Torah-world framing per chayolei/INTERNAL_STATUS.md §6
     and chayolei/GO_TO_MARKET.md.
   - The Tomchei Tmimim heritage stays visible on the about/origin page —
     just don't make it the only frame on the landing.

2. Rabbinic Advisory Council page:
   - chayolei/src/routes/about/council/+page.svelte
   - Renders the list of advisors with: name, title, affiliation, stream
     (MO / RZ / Chabad / other Chassidic / Sephardic / academic), brief
     endorsement quote, and a photo.
   - Data source: chayolei/src/lib/data/advisory-council.ts (typed array;
     placeholder names for now, real entries added as Ronnie signs them).
   - Each advisor's endorsement is rendered with proper attribution and
     timestamp.

3. Multi-stream landing affordance:
   - The landing page should feel native to a visitor from any Torah stream.
   - Instead of trying to please everyone with generic copy, consider an
     audience selector at the top: "I am a... [scholar / mashpia / donor /
     institution]" → shows tailored hero copy and CTA for that audience.
   - Underlying mission stays the same; framing adapts.

4. Publications gallery:
   - chayolei/src/routes/publications/+page.svelte — public-facing list of
     completed and in-progress publications with cover art, title, status,
     contributor count, license.
   - Each publication links to its mivtza dashboard.
   - When publications are completed, this becomes the platform's primary
     showcase artifact.

5. Press / media kit:
   - chayolei/src/routes/about/press/+page.svelte — downloadable resources for
     journalists and partners: logo, screenshots, founder bio, one-pager
     (export of the relevant section of INVESTOR_PITCH.md as a PDF).

Constraints:
- All Hebrew copy reviewed by a native speaker before going live (out-of-band)
- All Torah-stream framing reviewed by Ronnie before going live (out-of-band)
- No claims of endorsement from advisors who haven't yet signed
- Tomchei Tmimim brand kept respectfully — not erased, not over-claimed

Stop after: landing page renders with cross-stream framing, council page
renders with placeholder advisors, publications gallery renders, and press
page is downloadable. Verify in a real browser.

This is the last session in the GTM-execution batch. Subsequent work picks up
the technical pre-audit sequence (C5, C4, C6) or post-audit mainnet deploy.
```

### Prompt: SESSION C4 (governance test expansion to ≥95% coverage)

```
Resume Session C4 (chayolei governance test coverage). Read
chayolei/SESSION_HANDOFF.md for context.

Pre-req: C3 must be deployed.

Goal: bring chayolei/contracts/contracts/ChayoleiGovernance.sol to ≥95% line
+ branch coverage with attack scenarios and invariant tests.

Tasks:
1. `npx hardhat coverage` to baseline. Identify uncovered branches.
2. Expand chayolei/contracts/test/ChayoleiGovernance.test.ts with:
   - Reentrancy attempts on castVote and executeProposal (deploy a malicious
     callee that re-enters)
   - Cancel-then-finalize race
   - finalizeProposal called twice
   - executeProposal called by non-EXECUTOR_ROLE
   - Quorum exactly at threshold
   - Tied vote (votesFor == votesAgainst)
   - All 6 ProposalState transitions
   - rankVotingPower index 9 (60× — the highest-stakes attack target)
   - All admin setters: setVotingPeriod bounds, setTimelockDelay bounds,
     setDefaultQuorum > 0, setExecutionGasReserve bounds
3. Add chayolei/contracts/test/ChayoleiGovernance.invariants.ts using
   foundry-style invariant testing in Hardhat (or simple property tests):
   - votesFor + votesAgainst + votesAbstain monotonically non-decreasing
     during Active state
   - hasVoted[id][addr] flips from false to true exactly once
   - usedNonces never un-sets
   - executed is monotonic
4. Push coverage to ≥95% on ChayoleiGovernance.sol. Stop when green.

Do not start C5 or static analysis (C6).
```

### SESSION C5 — Treasury + Rewards Hardening (DONE, 2026-04-26)

Two security bugs fixed in `GovernanceTreasury.sol`:
1. **`whenNotPaused` not applied** — `donate()`, `redeem()`, `claimStream()` all lacked the modifier; governance pause was effectively a no-op. Fixed.
2. **Window drift** — `currentWindowStart = block.timestamp` advanced by wall-clock time instead of exactly 30 days, causing the monthly cap to drift under rapid deposits. Fixed to `+= 30 days`.

Tests added (118 total, all passing):
- `contracts/test/GovernanceTreasury.test.ts` — 41 tests: donate, redeem, streams, governance params, pause, views, window-drift regression
- `contracts/test/MasimaRewardsV2.test.ts` — 26 tests: approveMasima/Tafkid/WithMemo, batchApprove, requestRevision, markPublished, pause (asymmetric roles), views

No redeployment needed (bugs were test-only; testnet contracts not yet used in production flows).

---

### Prompt: SESSION C5 (treasury hardening + tests)

```
Resume Session C5 — chayolei GovernanceTreasury and MasimaRewardsV2 hardening.
Read chayolei/SESSION_HANDOFF.md and SPEC_2 §2A for the economic model.

Pre-req: C3 deployed; GovernanceTreasury is unchanged in this session unless
SPEC_2 reveals a security issue.

Tasks:
1. Read chayolei/contracts/contracts/GovernanceTreasury.sol end-to-end.
   Audit: reentrancy, integer overflow/underflow on stream math, role
   privilege scoping, paused-state coverage on every mutating function,
   reserve ratio invariants, monthly-window edge cases.
2. Read chayolei/contracts/contracts/MasimaRewardsV2.sol with same lens.
3. Write GovernanceTreasury.test.ts and MasimaRewardsV2.test.ts. Aim for
   ≥90% line coverage. Cover: donate happy path, donate over monthly cap,
   redeem when reserve ratio would drop below min, stream creation +
   linear vesting + claim + cancel, pause blocks every mutator.
4. Fix any vulnerabilities you find — get them code-reviewed by a fresh
   reasoning pass (re-read the diff explaining what each change does and
   why) before declaring done.
5. Do not redeploy unless a vulnerability is found. If you redeploy, follow
   the C1 / C3 pattern: rotate roles, update .env, save previous addr.

Do not start C6.
```

### Prompt: SESSION C6 (static analysis + audit prep)

```
Resume Session C6 — static analysis and external-audit prep for chayolei
contracts. Read chayolei/SESSION_HANDOFF.md.

Pre-req: C3, C4, C5 done.

Tasks:
1. Run slither on chayolei/contracts/contracts/. Produce a report at
   chayolei/contracts/audit/slither-report.md. Triage every finding into
   {fix, accept-with-rationale, false-positive}.
2. Run mythril on the four DAO contracts (ChayoleiGovernance, GovernanceTreasury,
   TMIMToken, ChayoleiRegistry). Same triage doc at
   chayolei/contracts/audit/mythril-report.md.
3. Generate chayolei/contracts/audit/README.md as the audit-engagement package:
     - Contract overview (one-liner each)
     - Privileged roles and who holds them
     - External dependencies (OZ version, Solidity version, evmVersion)
     - Threat model (top 10 abuse scenarios + mitigations)
     - Test coverage report
     - Known acceptances (slither/mythril findings we deliberately did not fix)
     - Deployment addresses on Base Sepolia
4. Apply fixes from the triage. Do not redeploy as part of C6 — collect
   fixes for a single audit-prep redeployment after the engagement.

This is the last contract-side session before booking an external audit.
```

---

## 6. Quick reference — important files

| Purpose | Path |
|---|---|
| DAO spec (truth) | `chayolei/SPEC_2_DAO_REQUIREMENTS.md` |
| **Strategic brief** | `chayolei/INTERNAL_STATUS.md` |
| **GTM plan** | `chayolei/GO_TO_MARKET.md` |
| **Donor pitch** | `chayolei/INVESTOR_PITCH.md` |
| **Public intro** | `chayolei/PUBLIC_INTRODUCTION.md` |
| **Plain-English vision** | `chayolei/TOMCHEI_TMIMIM_OVERVIEW.md` |
| Memory | `~/.claude/projects/C--code-vanguard/memory/MEMORY.md` |
| C1 fix memory | `~/.claude/projects/C--code-vanguard/memory/project_chayolei_c1_fix.md` |
| Engine + verticals strategy memory | `~/.claude/projects/C--code-vanguard/memory/project_engine_verticals_strategy.md` |
| Active governance contract | `chayolei/contracts/contracts/ChayoleiGovernance.sol` (C3, deployed `0x1589ca8E04be8e8F76261EacDE2f1C6687B356e8`) |
| Active treasury contract | `chayolei/contracts/contracts/GovernanceTreasury.sol` (untouched this session) |
| Test suite | `chayolei/contracts/test/ChayoleiGovernance.test.ts` (partially updated, will not compile) |
| Backend signer | `chayolei/src/lib/server/attestation.ts` |
| Deployment manifest | `chayolei/contracts/deployments/baseSepolia.json` |
| Env (secrets, gitignored) | `chayolei/.env` |

---

## 7. Open hazards / gotchas

- **Backend + frontend still use OLD `propose()` ABI** — `propose(title, desc, target, callData, quorum)`. Needs C3-BACKEND session to add `ProposalType` arg everywhere.
- **`bootstrapSelectorWhitelist` is one-shot.** If you redeploy and forget to call it, every non-SIGNAL `propose()` will revert "Target not trusted". Always run `verify-c3.ts` after redeploy.
- **Old contracts on-chain (roles revoked, harmless):**
  - `0x41abE6...` — pre-C1 governance, GOVERNANCE_ROLE revoked
  - `0xa7E709...` — pre-C3 governance, GOVERNANCE_ROLE revoked
- **`ATTESTATION_SIGNER_PRIVATE_KEY` is in plain `.env`** — fine for testnet, must move to KMS/HSM before mainnet.
- **TMIM redemption rate is misconfigured at $1.00**, target is $0.10. Call `setRedemptionRate(100)` from deployer wallet before any user-facing donation activity.
- **Vanguard parent (V1) is shelved.** Do not pick it up. See §0.
- **No fiscal sponsor signed yet.** D3 is blocked. D1 (manual donation rail) runs independently.
- **No anchor donor pitched yet.** INVESTOR_PITCH.md exists — out-of-band from agent sessions.
- **Publication scopes are placeholders.** Titles, scope, deliverables, deadlines needed before D2 is useful.
- **Supermajority (66%) NOT YET IMPLEMENTED** for `PARAMETER_UPDATE`, `MONTHLY_CAP_UPDATE`, `GRANT_ROLE` per SPEC_2 §2B line 621. Needed before mainnet.

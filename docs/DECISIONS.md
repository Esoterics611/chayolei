# Decisions

> Started 2026-10-26. One list of what the owner has decided and what is still open, merged from `MARKETING_BRIEF.md` §13 and `UX_REDESIGN.md` §13. For each open question it says what the code assumes until the owner decides, so nothing waits and every assumption can be found and reversed. When the owner decides, record it under **Decided** with the date and update the code and docs that the row names.

## Decided

| Date | Decision | Recorded in |
|---|---|---|
| 2026-10-25 | **Crypto only, in TMIM.** No fiat, ramps, institutional connection or donations in the platform; TMIM minted only for participation. | `CLAUDE.md` |
| 2026-10-25 | **Positioning:** three parallel systems (banking, corporate organization, workforce) on one ledger, for any small team; propose → decide → record. | `CLAUDE.md`, `MARKETING_BRIEF.md` |
| 2026-10-25 | **Redemption** (TMIM → USDC) is decided later; until then no UI around USDC or redemption. | `CLAUDE.md` |
| 2026-11-25 | **One sign-in, by email only**, for readers and members: Firebase email link, which confirms the address; no password, no wallet to join. The platform stays crypto-only in TMIM; a member links a wallet later, when they come to hold TMIM. A wallet kept for members until they ask for it is set aside for now. Wallet sign-in stays for the team app. | `MAAYAN.md` §2 |
| 2026-11-25 | **Wellsprings:** each discourse a place where its readers ask and the teacher answers; a member's first question waits for the teacher. | `MAAYAN.md` |

## Open

| # | Question | What the code assumes meanwhile | Where it lives |
|---|---|---|---|
| 1 | **On-chain redemption** of TMIM for USDC: keep, change or remove? | Nothing in the app shows or offers it (the last redeem dialog and API were removed 2026-10-26). The old contracts still have `ChayoleiTreasury.redeemTmim` and `GovernanceTreasury.redeem`. Per-team contracts have no redemption. | `CLAUDE.md`; `TEAM_CONTRACTS.md` §5 |
| 2 | **Name and framing:** keep "Chayolei Beis Dovid" and the IDF ranks, keep them as heritage under a broader name, or rename? | The new UI says "Chayolei" with roles, not ranks; ranks live on in the classic pages and in `ChayoleiGovernance`. | `MARKETING_BRIEF.md` §9, §13 |
| 3 | **Per-team treasuries:** Safe with modules, or a factory of this repo's contracts? | **A factory of our own contracts** (`TeamFactory`, `Team`), mirroring the app's engine. A Safe can still be a member. | `TEAM_CONTRACTS.md` §4.1 |
| 4 | **How a team votes:** one member one vote, or weighted by TMIM and rank? | **One member, one vote** in teams, as the merged UI does (`engine.ts` `tally`, `Team._decide`). The global `ChayoleiGovernance` keeps TMIM × rank weighting for the classic app. | `TEAM_CONTRACTS.md` §4.2 |
| 5 | **Who can start a team:** anyone, or invitation only at first? | **Anyone can start a team; minting needs an allowance.** `TeamFactory.defaultAllowance` is the switch: 0 means the platform approves each team before it can pay out. The deploy script defaults it to 0. | `TEAM_CONTRACTS.md` §4.3 |
| 6 | **Ledger privacy:** which entries are public by default? | Signed entries (versions, comments, tasks, messages) are **private to the team's members**; only batch hashes go on-chain. Settled entries are **public by nature** on Base: addresses, amounts, rule values, content hashes, never content. | `TEAM_CONTRACTS.md` §1; Firestore rules |
| 7 | **Where document bodies live** (Firestore, an Automerge store, IPFS) and what is anchored at release. | Firestore, next to the team; the hash of the accepted version is recorded at acceptance and the hash of the released text at release. | `TEAM_CONTRACTS.md` §1 |
| 8 | **Which AI role first:** planner or source finder? And may a team's texts go to an AI provider? | **The planner**, built 2026-10-26. Any member who may change the plan can ask it, one objective at a time; the dialog says what goes to Anthropic's Claude before anything is sent (the objective, its budget and existing deliverables, the team's name and purpose; never members, wallets, documents or threads). It only suggests; the member adds what they keep, marked AI-assisted. 40 suggestions per team per day. There is no team-level switch yet: a team can't vote AI off, and making AI helpers charter roles waits for this decision. | `TEAM_BACKEND.md` §6a; `UX_REDESIGN.md` §8 |
| 9 | **Platform keys:** who holds the platform multisig (factory admin and allowances, TMIM admin), and what are the starting default allowance and platform-wide cap? | Deploy scripts take the admin address and allowance from the environment; nothing is deployed to Base Sepolia yet. | `contracts/scripts/deploy-teams.ts` |
| 10 | **TMIM's burner role:** the token's admin can burn TMIM from any address, a team's included. Revoke it at the redeploy? | Not changed (it serves redemption, which is open). Until it is revoked, don't claim teams fully control their treasury. | `TEAM_CONTRACTS.md` §5; `MARKETING_BRIEF.md` §10 |
| 11 | **Wallets: how members sign in without a seed phrase, and who pays their fees.** Passkey smart accounts with a paymaster (the plan of record), smart accounts through our relayer, an embedded-wallet provider, or keys derived from passkeys? | Members sign in with a key-based wallet (an extension). The platform's relayer pays every fee except a member's own contribution to the team account. Nothing for passkeys is built: each option needs choices below. Recommendation: smart accounts with a provider's paymaster. | `WALLETS.md` |
| 12 | **`permit` on TMIM** at its redeploy, so a member can add TMIM to the team account without paying a fee? | Not added; TMIM is in the audit package. Contributions cost the member a network fee. | `WALLETS.md` §4 |

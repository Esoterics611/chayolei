# Chayolei

**A parallel bank, corporation and workforce system for small teams, on one decentralized ledger.**

A team can organize, decide and pay its people without needing a bank account, a registered company or an institution, from anywhere:

| | The team gets | Instead of |
|---|---|---|
| **Banking** | A treasury in TMIM: budgets, payouts on acceptance, scheduled pay, monthly statements | A bank account, payroll, an accountant |
| **Corporate organization** | A versioned charter (roles and rules), proposals and votes, a decision log | Registration, bylaws, board minutes |
| **Workforce** | Objectives → deliverables → tasks, with an owner, a reviewer and an approver; GitHub-style versions and reviews of any work; each person's record of work | A task tracker, a shared drive, HR records |

All three share one ledger, and every change to the work, the rules or the money follows one pattern: **propose → decide → record**. Accepting a deliverable pays its owner and reviewer in the same signed action.

Chayolei was born as *Chayolei Beis Dovid*, a network for Torah scholarship and publishing; its first teams are editorial groups producing seforim. The product is for any small team. ([Positioning](docs/MARKETING_BRIEF.md).)

## Crypto only, in TMIM

Inside the platform every amount is **TMIM**: budgets, rewards, payouts, balances, statements. TMIM is minted only for participation (accepted work, reviews). There is no fiat anywhere: no cards, banks, payment apps, on-ramps or off-ramps. A member may swap TMIM and cash out through an exchange of their choice; that happens outside the platform. ([The economic model](CLAUDE.md).)

Chayolei is **not** a bank, an employer, a legal entity or an investment. TMIM promises no value or return. Teams remain responsible for the laws that apply to them. ([Claims we don't make](docs/MARKETING_BRIEF.md).)

## Status (2026-10-26)

- ✅ **The new UI** for teams: Home, Plan, Work, Decide, Treasury, Ledger, in English and Hebrew, light and dark, desktop and phone. It runs as a clickable **demo** on sample data, or as the **live app** on Firestore (`VITE_TEAM_BACKEND=firestore`), where members sign in with a wallet, start teams, invite and join by link, and every action is checked by the server against the team's charter.
- ✅ **Per-team contracts** (`TeamFactory`, `Team`): each team's charter, votes, budgets, team account and payouts on-chain, under the team's monthly cap and a platform allowance. 31 tests.
- ✅ **The chain bridge**: with the team contracts configured, each settled action is signed by the member, relayed by the platform (which pays the fee) and recorded with its transaction. Tested end to end in the browser on a local chain.
- ✅ The original app's pages, at their old URLs, with on-chain governance votes counted once.
- 🔄 Deploying the team contracts to Base Sepolia; redeploying the governance contracts with audit fixes L-1, L-2, M-2.
- ⬜ Passkey sign-in and sponsored fees for every action; notifications; AI helpers; an accessibility audit and usability test (`docs/UX_REDESIGN.md` §11).
- ⬜ External audit; Base mainnet.

Open questions for the owner, and what the code assumes meanwhile, are in [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Repository

```
src/lib/team/          domain: engine, ledger, commands, persistence, chain calls, i18n, store
src/lib/ui, src/lib/app components (presentational / reading the store)
src/routes/(app)/      the new UI: /, /plan, /work, /d/…, /decide, /treasury, /ledger, /wallet, /start, /join/…
src/routes/(classic)/  the original pages (campaigns, assignments, governance…)
src/routes/api/        server routes: teams, invites, chain info, auth, and the original API
src/lib/server/        Firestore admin, team service, chain bridge, governance listener
contracts/             Solidity (Hardhat): TMIM, the original governance and rewards, contracts/team/
scripts/               demo build, deploy, browser tests (scripts/e2e)
docs/                  positioning, decisions, UX plan, technical design, backend, contracts
```

## Running it

```bash
npm install
npm run dev                         # the demo at http://localhost:5173 (sample data in your browser)
bash scripts/build-demo.sh          # a static, shareable build of the demo

npm run check                       # types
npm run test:unit                   # engine, ledger, dictionaries, persistence
npm test                            # everything, against the Firestore emulator (needs Java)
bash scripts/e2e/run-chain.sh       # the chain bridge on a local Hardhat node
bash scripts/e2e/run-live.sh        # the live app in a browser, on the emulators (needs Playwright)

cd contracts && npm install && npx hardhat test   # 209 contract tests
```

The live app locally, the environment it needs and how it is deployed: [`docs/TEAM_BACKEND.md`](docs/TEAM_BACKEND.md) §7, [`.env.example`](.env.example), [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Contracts on Base Sepolia

As last recorded in this repository (`contracts/audit/README.md`, 2026-05-11). They predate the 2026-10-25 changes (no minting for money sent in; audit fixes L-1, L-2, M-2), which need a redeploy to take effect. The team contracts are not deployed yet.

| Contract | Address |
|---|---|
| TMIMToken | `0x1A66CeE19C53956022f01842043d79d594BFb8E5` |
| ChayoleiRegistry | `0xFA9Da3852829B3Fd94F05cFd7C160127980242fa` |
| MasimaRewardsV2 | `0x884f4B3E9c91831a5864b2E4b6B0CE342D7bF429` |
| ChayoleiGovernance (C4) | `0x1589ca8E04be8e8F76261EacDE2f1C6687B356e8` |
| ChayoleiTreasury | `0x3DB8a8A81f75eA2bAbDb481203AE4Db6C4dDA420` |
| GovernanceTreasury | `0xBBedE83f5B488500b6CB42A5519dc9E56c9A9B7E` |

An earlier governance deployment (C1) was at `0xa7E7098012C6DE7395128f8d3afE606C3C9Fc084`.

## Documentation

| Read | For |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | The economic model and conventions (start here) |
| [`docs/MARKETING_BRIEF.md`](docs/MARKETING_BRIEF.md) | Positioning, audiences, claims we don't make |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Owner decisions, open questions, what the code assumes |
| [`docs/UX_REDESIGN.md`](docs/UX_REDESIGN.md) | The new UI: research, principles, screens, phases and progress |
| [`docs/UX_TECH_DESIGN.md`](docs/UX_TECH_DESIGN.md) | How the new UI is built |
| [`docs/TEAM_BACKEND.md`](docs/TEAM_BACKEND.md) | The live backend and the chain bridge |
| [`docs/TEAM_CONTRACTS.md`](docs/TEAM_CONTRACTS.md) | The per-team contracts |
| [`contracts/audit/README.md`](contracts/audit/README.md) | The governance contracts' audit package |

Older documents (`GO_TO_MARKET`, `INVESTOR_PITCH`, `PUBLIC_INTRODUCTION`, `TOMCHEI_TMIMIM_OVERVIEW`, `SPEC_1`, `SPEC_2`, `BACKEND_PLAN`) predate the current model; each says at the top what it no longer governs.

## Heritage

In 1897 the Rebbe Rashab founded Tomchei Tmimim with eighteen students, to raise scholars with rigor and discipline who would carry Torah through whatever came. The name *Chayolei Beis Dovid*, soldiers of the House of David, and the ranks of the original app come from that history. Whether they stay in the product's name is an open question ([`docs/DECISIONS.md`](docs/DECISIONS.md) #2); the commitment to teams that produce serious work together, and pay one another for it on the record, stays.

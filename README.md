# Chayolei Beis Dovid

**חיילי בית דוד** — Soldiers of the House of David.

A digital network for Torah scholarship and leadership. Local yeshivot and kollelim connected into a global research and publishing community, governed as a DAO with real token economics.

> The Rebbe Rashab founded Tomchei Tmimim in 1897 with 18 students. Their mission: train soldiers of Torah who could hold the line against a world trying to erase Jewish life. Eighteen became thousands. They outlasted the Tsar, the Soviets, and seventy years of communist suppression.
>
> The threat today is different — apathy, assimilation, a generation with access to everything except depth. This platform is the same fight with new tools.

---

## The Problem with Existing Platforms

You can watch a shiur on YouTube. You cannot submit a research paper, have your work peer-reviewed, earn standing in a community, rank up based on contribution, or vote on how your community allocates its funds.

Existing platforms are consumption tools. Chayolei is a production and governance system.

---

## How It Works

### The Student Lifecycle

```
ENLIST  →  Sign up, get assigned to a makom (location), receive starting rank
LEARN   →  Pick up masimot (assignments) from active mivtzaot (campaigns)
SUBMIT  →  Write the paper, the source analysis, the chapter draft
REVIEW  →  Peer-review others' work. Get reviewed. Earn TMIM for both.
RANK UP →  Verified contribution promotes you: Turai → Samal → Seren → Aluf
GOVERN  →  Vote on which mivtzaot to fund, where the treasury goes
```

### Core Concepts

| Term | Meaning |
|---|---|
| **Mivtza** (מבצע) | A campaign — a course, research group, collaborative sefer project, or chaburah. Instructors set the objective and break it into work. |
| **Masimah** (משימה) | An assignment within a mivtza — a paper, source analysis, chapter draft, or presentation. Not a worksheet. Scholarship. |
| **Tafkid** (תפקיד) | A sub-task or role. The atomic unit of work. |
| **Anash** | The community — all registered members across all makomot. |
| **Makom** | A local community node: a city, a yeshiva, a kollel. |
| **Farbrengen** | Community discussion space. On-chain governance proposals live here too. |

### Rank System

Talmidim progress through IDF ranks based on accumulated TMIM and verified contribution. Rank is not honorary — it determines voting power, earning multipliers, and leadership eligibility.

| Rank | Hebrew | Multiplier | TMIM threshold |
|---|---|---|---|
| Turai | טוראי | 1.0× | 0 |
| Rav Turai | רב טוראי | 1.2× | 200 |
| Samal | סמל | 1.5× | 800 |
| Samal Rishon | סמ"ר | 2.0× | 2,000 |
| Rav Samal | רס"מ | 2.5× | 5,000 |
| Segen | סגן | 3.0× | 10,000 |
| Seren | סרן | 4.0× | 20,000 |
| Rav Seren | רב סרן | 5.0× | 40,000 |
| Sgan Aluf | סגן אלוף | 7.0× | 75,000 |
| Aluf | אלוף | 10.0× | 150,000 |

---

## Token Economics (TMIM)

The platform token is **TMIM** (תמים — *complete, pure*). Every talmid has a wallet.

**Earning.** TMIM is minted only for participation: completing masimot, peer reviewing, participating in farbrengens, and maintaining learning streaks. All rewards scale with rank multiplier. Money sent in never mints TMIM.

**Funding.** Crypto in, crypto out. The on-chain treasury holds ETH and USDC on Base and pays out in USDC. There is no fiat anywhere in the platform: no card, bank or payment-app flows, no fiat on- or off-ramps, and no fiscal sponsor or other institutional connection. Donations, if any, are handled separately, outside the platform.

**Redeeming.** Talmidim redeem earned TMIM for USDC from the on-chain treasury, at the redemption rate set by governance ($0.10/TMIM target).

**Governance.** Voting power = `TMIM balance × rank multiplier`. Talmidim vote on mivtza funding, treasury allocations, and new makomot. Not a suggestion box — real on-chain authority over real funds.

The more a talmid learns, produces, and contributes — the more they earn, the higher they rank, the more say they have. **Merit is the only currency.**

---

## Architecture

| Layer | Stack |
|---|---|
| **Web app** | SvelteKit 2, Svelte 5 runes, Tailwind CSS v4, TypeScript |
| **Backend** | Firebase (Firestore, Cloud Functions), EIP-712 attestation signer |
| **Smart contracts** | Solidity, Hardhat, OpenZeppelin, deployed on Base Sepolia |
| **Chain** | Base (L2 Ethereum) |

### Smart Contracts (Base Sepolia)

| Contract | Address | Purpose |
|---|---|---|
| TMIMToken | `0x1A66CeE19C53956022f01842043d79d594BFb8E5` | ERC-20 governance and reward token |
| ChayoleiRegistry | `0xFA9Da3852829B3Fd94F05cFd7C160127980242fa` | Talmid registration and rank tracking |
| MasimaRewardsV2 | `0x884f4B3E9c91831a5864b2E4b6B0CE342D7bF429` | On-chain reward distribution for masimot |
| ChayoleiGovernance | `0xa7E7098012C6DE7395128f8d3afE606C3C9Fc084` | DAO governance with EIP-712 rank attestation |
| ChayoleiTreasury | `0x3DB8a8A81f75eA2bAbDb481203AE4Db6C4dDA420` | TMIM treasury and redemption |
| GovernanceTreasury | `0xBBedE83f5B488500b6CB42A5519dc9E56c9A9B7E` | Proposal execution treasury |

### Web App Routes

```
/                     Dashboard — active mivtzaot, rank, TMIM balance
/mivtzaot             Campaign board — browse and enroll
/mivtzaot/[id]        Campaign detail — masimot, progress, tafkidim
/masimot              My assignments across all active mivtzaot
/masimot/new          Create a new masimah (instructor role)
/tafkidim             Task board (kanban)
/anash                Community directory — all talmidim, ranks, locations
/anash/[id]           Talmid profile
/review               Mashpia review room — approve submitted work
/governance           Active proposals, voting
/governance/[id]      Proposal detail and vote
/treasury             TMIM balance, redemption to USDC, treasury stats
/farbrengen           Community discussion
/signup               Onboarding flow
/settings             Profile, wallet connection, makom assignment
```

---

## Current Status

**Live backend. Testnet contracts. No mock data.**

- ✅ SvelteKit app running with live Firebase — all state from real Firestore listeners
- ✅ 8 Solidity contracts deployed and verified on Base Sepolia
- ✅ EIP-712 rank attestation on governance (C1 security fix shipped)
- ✅ 178 passing contract tests; app tests against the Firestore emulator; CI on every pull request
- ✅ On-chain votes recorded exactly once in Firestore; the chain listener resumes from a checkpoint (C2)
- ✅ Wallet sign-in with a browser wallet
- 🔄 Audit fixes L-1, L-2, M-2 and participation-only minting are in the source; contracts need redeploying
- 🔄 UI redesign around teams producing and publishing: [`docs/UX_REDESIGN.md`](docs/UX_REDESIGN.md)
- ⬜ External audit
- ⬜ Base mainnet deployment

---

## Setup

### Prerequisites

- Node.js 20+
- A Firebase project (Firestore + Cloud Functions)
- A funded Base Sepolia wallet for contract interaction

### Web App

```bash
cd chayolei
npm install
cp .env.example .env
# Fill in your Firebase and contract values in .env
npm run dev
```

### Contracts

```bash
cd contracts
npm install
cp .env.example .env
# Fill in DEPLOYER_PRIVATE_KEY, BASE_SEPOLIA_RPC_URL, BASESCAN_API_KEY
npx hardhat test
npx hardhat run scripts/deploy.ts --network baseSepolia
```

### Deploying the web app

Cloud Run behind Firebase Hosting: see [`docs/DEPLOY.md`](docs/DEPLOY.md).

---

## Contributing

This project is early and moving fast. If you want to contribute:

1. Check open issues for `good first issue` tags
2. The biggest gaps right now are the UI redesign ([`docs/UX_REDESIGN.md`](docs/UX_REDESIGN.md)), passkey wallets with sponsored gas, and redeploying the contracts
3. Read `SPEC_2_DAO_REQUIREMENTS.md` for the full governance spec before touching contract code

---

## Why This Matters

The Rebbe Rashab's thesis was simple: teach a young man both the revealed and hidden Torah with rigor and discipline, and he becomes unbreakable. Those 18 students became thousands. They kept Judaism alive when it was a death sentence.

This platform builds the infrastructure for the next generation of that mission — soldiers who produce Torah, hold each other accountable, earn real value for real work, and govern their own community. Local roots, global reach. Ancient texts, modern infrastructure.

**Tomchei Tmimim. Sustainers of the wholesome ones. Same mission, new tools.**

---

*Built on [Base](https://base.org). Contracts verified on [Basescan](https://sepolia.basescan.org).*

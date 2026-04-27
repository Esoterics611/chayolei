# Chayolei Beis Dovid

**A digital network for Torah scholarship and leadership — connecting local yeshivot into a global research and publishing community, governed as a DAO with real token economics.**

> חיילי בית דוד — Soldiers of the House of David.
> Same mission as the Rebbe Rashab in 1897. New tools.

---

## What this is

Tomchei Tmimim was founded by the Rebbe Rashab in 1897 to train *chayolei beis Dovid* — soldiers of the House of David — who would spread Torah and Chassidus into a hostile world. Eighteen students became thousands. They survived the Tsar, the Soviets, the Nazis, and seventy years of communist suppression.

The threat today is different. It is apathy, assimilation, and a generation of Jews with access to everything except depth. The internet gives information but not wisdom. You can watch a shiur on YouTube but you cannot form a chavrusa, submit a research paper, have your work reviewed by peers, earn standing in a community, or contribute to a living body of scholarship.

**Chayolei Beis Dovid is the platform that builds that.** A network of soldiers who produce Torah, hold each other accountable, earn real value for real work, and govern their own community. Local roots, global reach. Ancient texts, modern infrastructure.

---

## How it works

**Local groups, global network.** Each city or community runs its own chavrutot, chaburot, and shiurim. These local groups connect through the platform to join larger online streams, collaborate across locations, and form cross-city study partnerships.

**Courses become research campaigns.** A mashpia or mentor creates a *mivtza* (campaign) — a course, a research group, a collaborative sefer project, or a deep-dive chaburah. The instructor loads source material, sets the research objective, and breaks it into *masimot* (assignments) and *tafkidim* (sub-tasks).

**Talmidim produce, not just consume.** Assignments are research papers, chapter drafts, source analyses, and presentations. Top talmidim contribute to original Torah scholarship — sections of seforim, source anthologies, written maamarim.

**Peer review drives quality.** Talmidim review each other's work. They earn TMIM for substantive reviews. The mashpia sees both the talmid's work and the peer reviews before final approval. This builds a culture of collaborative scholarship.

**IDF ranks, not honorary titles.** Talmidim progress through Israeli military ranks — Turai (Private) through Aluf (General) — based on accumulated TMIM and verified contribution. Rank determines voting power in DAO governance, earning multipliers, and leadership eligibility. A Seren has real authority — they can create mivtzaot, approve work, allocate funds.

```
ENLIST    →  Sign up, get assigned to a makom (location), receive your starting rank.
LEARN     →  Pick up masimot from active mivtzaot. Submit your work.
REVIEW    →  Peer-review others. Get reviewed. Build the scholarship.
RANK UP   →  Verified contribution promotes you: Turai → Samal → Seren → Aluf.
GOVERN    →  Vote on which mivtzaot to fund, where the treasury goes.
```

---

## The DAO and TMIM

Every talmid has a wallet. The platform token is **TMIM** (תמים — *complete, pure*).

**Earning.** Talmidim earn TMIM for completing masimot, peer reviewing, participating in farbrengens, maintaining learning streaks. All rewards scale with rank.

| Rank | Hebrew | Multiplier | TMIM threshold |
|---|---|---|---|
| Turai | טוראי | 1.0× | 0 (start) |
| Rav Turai | רב טוראי | 1.2× | 200 |
| Samal | סמל | 1.5× | 800 |
| Samal Rishon | סמ"ר | 2.0× | 2,000 |
| Rav Samal | רס"מ | 2.5× | 5,000 |
| Segen | סגן | 3.0× | 10,000 |
| Seren | סרן | 4.0× | 20,000 |
| Rav Seren | רב סרן | 5.0× | 40,000 |
| Sgan Aluf | סגן אלוף | 7.0× | 75,000 |
| Aluf | אלוף | 10.0× | 150,000 |

**Funding.** Supporters donate to the Chayolei DAO — fiat or crypto. Donations are converted to TMIM in the treasury at a target rate of $0.10 per TMIM. Supporters can designate funds to a specific makom, a specific mivtza, or the general fund. Donors receive TMIM receipts that grant governance voting power. Everything is on-chain and transparent.

**Spending.** The DAO treasury funds talmidim through mivtza allocations. Talmidim can redeem earned TMIM for cash stipends, project funding (printing a sefer, hosting a farbrengen, travel), or chessed initiatives. Major allocations are voted on.

**Governance.** Talmidim vote on which mivtzaot to fund, treasury allocations, new makomot, and community projects. Voting power is `TMIM balance × rank multiplier`. This is real on-chain governance over real funds — not a suggestion box.

The more a talmid learns, produces, and contributes — the more they earn, the higher they rank, and the more say they have. **Merit is the only currency.**

---

## Where the project is today

**Live on Base Sepolia testnet. The most mature module of the broader Vanguard pattern.**

| Layer | What's built | Production-ready? |
|---|---|---|
| **Smart contracts** (8) | TMIMToken, ChayoleiRegistry, ChayoleiTreasury, GovernanceTreasury, ChayoleiGovernance v2 (EIP-712 rank attestation), MasimaRewards, MasimaRewardsV2, MockERC20 | Testnet, security-fixed (C1), 35 passing tests; not yet externally audited |
| **Web app** (SvelteKit 2 + Svelte 5) | 12 routes including dashboard, mivtzaot, masimot, tafkidim, anash (community), farbrengen, governance, treasury, signup, settings | Live with real Firebase; no mock data |
| **Backend** | Live Firebase (Firestore, Cloud Functions); EIP-712 attestation signer; live AppStore listeners | Working in production-shape |
| **Hebrew/RTL UI** | Full Hebrew terminology, RTL layout, sacred-night theme | Done |
| **Wallet integration** | ethers v6, wallet connection, contract reads/writes | Working |

**Honest summary.** Spec 1 (academic-institutional UI) is complete. Spec 2 (DAO governance) is roughly 70% done — the C1 security fix shipped 2026-04-24, with C2 (move proposals fully on-chain), C3 (execution hardening), C4 (test coverage to 95%+), C5 (treasury hardening), and C6 (audit prep) ahead.

See [`SESSION_HANDOFF.md`](SESSION_HANDOFF.md) for exact in-progress state.

---

## The architecture

```
chayolei/
├── contracts/                Solidity (Hardhat) — 8 contracts on Base Sepolia
│   ├── ChayoleiGovernance.sol     v2 with EIP-712 rank attestation (C1 fix shipped)
│   ├── ChayoleiRegistry.sol       Talmidim, ranks, locations
│   ├── ChayoleiTreasury.sol       Initial treasury
│   ├── GovernanceTreasury.sol     DAO-controlled treasury (streams, redemptions)
│   ├── MasimaRewards.sol /        Reward distribution for masimot/tafkidim
│   │   MasimaRewardsV2.sol
│   ├── TMIMToken.sol              ERC-20, 0 decimals, redeemable
│   └── MockERC20.sol              For testing
│
├── src/
│   ├── routes/                    SvelteKit pages (Hebrew, RTL)
│   │   ├── anash/                 Community / talmidim directory
│   │   ├── farbrengen/            Chassidic gathering feed
│   │   ├── governance/            Proposals, voting
│   │   ├── masimot/               Assignments
│   │   ├── mivtzaot/              Campaigns
│   │   ├── tafkidim/              Sub-tasks
│   │   ├── treasury/              On-chain treasury view
│   │   ├── review/                Mashpia review room
│   │   ├── signup/                Onboarding (location selection)
│   │   └── settings/              User settings, role testing
│   ├── lib/
│   │   ├── server/                Backend: attestation signing, server hooks
│   │   ├── stores/app.svelte.ts   Svelte 5 runes store with live Firebase listeners
│   │   ├── firebase.ts            Firebase init
│   │   └── components/            UI components (sacred-night theme)
│   └── ...
│
├── SPEC_2_DAO_REQUIREMENTS.md      Full DAO spec (1909 lines, source of truth)
├── SPEC_1_ACADEMIC_UI.md           UI spec
├── TOMCHEI_TMIMIM_OVERVIEW.md      Plain-English vision
├── BACKEND_PLAN.md                 Backend roadmap
├── SESSION_HANDOFF.md              Active development state
└── package.json
```

### Visual identity

- **Sacred night dark theme** — deep indigo-black backgrounds (`#0a0e1a`), lit by gold (Torah fire), sapphire (Chassidus), and emerald (Nigleh) accents.
- **Hebrew-first UI**, RTL layout. English available as secondary.
- **No flashy crypto aesthetics.** Quiet, dignified, scholarly.

---

## Built on the Vanguard pattern

Chayolei is built on the same architectural pattern as [Vanguard DAO](../PUBLIC_INTRODUCTION.md) — rank-weighted governance, escrow-driven work coordination, on-chain treasury — but completely re-themed for the Tomchei Tmimim mission. Vanguard's reference instance is a generic crypto-anonymous "investment bank for DAOs." Chayolei is the same engine, with a religious-academic vertical wrapper.

Same engine. Different culture. The fact that the engine ships in two such different verticals is a meaningful proof point that the underlying pattern is real.

---

## Try it locally

```bash
cd chayolei
npm install
npm run dev                       # http://localhost:5173

# Smart contracts
cd contracts
npm install
npx hardhat compile
npx hardhat test                  # 35 passing
```

You will need:
- Node 20+
- A wallet with Base Sepolia ETH (free from a faucet)
- A Firebase project (the codebase points at one — swap in your own via `.env`)

Environment variables go in `chayolei/.env`. See `.env.example` for the full list.

---

## How to contribute

### As a talmid (student)
Once the public testnet is open, sign up with any wallet, choose a makom, and start picking up masimot from active mivtzaot. Early talmidim will form the founding cohorts of each makom. The first Sranim (officers) will come from this group.

### As a mashpia (mentor / reviewer)
If you teach Torah and want to use this platform to coordinate research with your talmidim — reach out. We are looking for the first 3–5 mashpia'im to design the early mivtzaot.

### As a developer
1. Read [`SESSION_HANDOFF.md`](SESSION_HANDOFF.md) — exact current state, what's mid-flight, what's blocked.
2. Read [`SPEC_2_DAO_REQUIREMENTS.md`](SPEC_2_DAO_REQUIREMENTS.md) — the full DAO spec (1909 lines).
3. Pick a session prompt from `SESSION_HANDOFF.md` §5 (C2, C3, C4, C5, or C6) and start contributing.

The most valuable contributions right now:
- Finishing C3 (execution hardening) — contract is rewritten but uncompiled
- C4 (test coverage to ≥95%)
- Frontend RTL polish, accessibility
- Hebrew copywriting and translation review

### As a supporter (donor)
The donation flow will go live with public testnet. Supporters can fund specific makomot, specific mivtzaot (e.g., "publish a sefer on Likkutei Torah"), or the general treasury. All donations are on-chain and transparent. The Chayolei structure removes the opacity that has historically deterred careful donors.

### As a community leader
If you run a yeshiva, kollel, or chabad house and want to use Chayolei as your scholarship-and-stipend infrastructure — reach out. We are looking for design partners during the early launch.

---

## Roadmap (high level)

- **Now (Q2 2026):** Finish DAO governance hardening (C3-C6). External audit. Document mashpia and talmid onboarding flows.
- **Q3 2026:** First makom live (likely Jerusalem or Brooklyn). 10–25 founding talmidim. First mivtza completed end-to-end with real TMIM rewards. First donations.
- **Q4 2026:** Second and third makomot live. First collaborative sefer or research publication produced through the platform. First chessed proposal funded.
- **2027:** Network of 4–8 active makomot. Self-sustaining donor → treasury → talmid → publication economy.

---

## Mission

The Rebbe Rashab sent eighteen talmidim into a hostile world in 1897 with a thesis: if you teach a young man both *nigleh* and *nistar* with rigor and discipline, he becomes unbreakable.

The platform doesn't replace the human work. The chavrusa, the mashpia, the farbrengen, the late-night sugya — these are the work. The platform makes the work visible, accountable, rewarded, and self-sustaining. It gives the global Tomchei Tmimim network the infrastructure to operate at the scale the mission actually requires.

**Same mission, new tools.** *Chayolei Beis Dovid.*

---

*The platform is open source. The mission is older than any of us.*

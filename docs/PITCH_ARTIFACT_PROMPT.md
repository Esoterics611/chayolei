# Prompt: build the Chayolei pitch artifact

> Written 2026-10-25 for a separate Claude session. Copy everything below the line into that session. It is self-contained: facts, sources, product state, sample data and guardrails are all included. Keep it in sync with `MARKETING_BRIEF.md` and `UX_REDESIGN.md` if they change.

---

Build a polished pitch for **Chayolei** as an artifact: a **slide deck of 13–15 slides** (use a slides artifact type if one is available; otherwise a self-contained web page with slide-by-slide navigation, keyboard arrows, and a print-friendly layout). Audience: **leads of small teams** who might run on it, and **crypto-native builders and backers**. English. Use only the facts below; don't invent users, traction, revenue, partners, prices or dates.

## What Chayolei is

Every small team needs the same things to work together: a way to **decide**, a way to make people **responsible**, a way to turn goals into **work**, a way to keep **versions** of that work, a way to **talk**, and a way to **hold and move money**. Today that takes a bank account, a registered company, bylaws, an accountant, payroll, HR, a chat app, a task tracker, a shared drive and GitHub. Most of the world's small teams can't get half of that list, can't afford it, or can't make it work across borders.

**Chayolei builds three parallel systems on a decentralized ledger, so any small team, anywhere, can run itself without depending on the banking or corporate-legal system of any country:**

1. **A parallel banking system.** The team's treasury, budgets, payouts and monthly statements, all in the platform's own coin, **TMIM**.
2. **A parallel corporate organization.** A versioned **charter** (the team's bylaws), **roles**, **proposals and votes**, and a **decision log** (the team's minutes).
3. **A parallel workforce management system.** **Objectives** broken into **deliverables** and **tasks**; an **owner, reviewer and approver** for each; **GitHub-style versioning** of the work (drafts, versions, compare, review requests, accept, release); **acceptance that pays**; and every member's **record of work**.

All three run on **one ledger**. Every change, whether to the work, the rules or the money, follows **one pattern: propose → decide → record**.

| Change | Propose | Decide | Record and consequence |
|---|---|---|---|
| Work | A new version of a deliverable | Reviewer comments; approver accepts | Accepted → owner and reviewer paid in TMIM |
| Rules | An amendment to the charter (a diff of the rule) | Members vote under current rules | Charter updated |
| Money | A budget or spend request | The charter role, or a vote above a limit | Budget or balance updated |

**Taglines** (pick one, or write better in the same spirit): "Your team's bank, bylaws and workforce, on one ledger." · "Organize anywhere. Decide together. Get paid on the record."

## Crypto only, in our own coin (state this clearly; it is central)

- Inside the platform **everything is TMIM**: budgets, rewards, payouts, balances, statements.
- **TMIM is minted only for participation**: accepted work, reviews and other contributions. Money sent in never mints TMIM. A **budget** authorizes how much TMIM an objective may pay; **accepting** a deliverable mints its reward against that budget, within the team's monthly issuance cap set in its charter.
- **No fiat anywhere and no on- or off-ramps.** No bank links, cards, payment apps, dollar prices or exchange rates in the product.
- **Conversion happens outside the platform.** A member may swap TMIM for other crypto and cash out through an exchange such as Coinbase; that is their own business, not a platform feature.
- Donations, if any, happen off-platform and are not recorded or acknowledged by it.

## The parallel stack (good material for a comparison slide)

| What a team needs | The traditional system | Chayolei |
|---|---|---|
| Bank account | A bank, if you qualify; fees and delays across borders | Team treasury in TMIM |
| Books / accounting | An accountant | The ledger, with monthly statements generated from it |
| Payroll | A payroll provider and contracts | Payouts on acceptance and scheduled pay, in TMIM |
| Articles and bylaws | Registration, lawyers | The charter: roles and rules, versioned, enforced on-chain |
| Board and member resolutions | Meetings and minutes | Proposals and votes, and a decision log |
| Officers and authority | Appointments, signatories | Charter roles: who may approve, spend, propose, publish |
| Project management | Jira, Asana | Objectives → deliverables → tasks with owners and budgets |
| HR and work records | HR systems | Owner / reviewer / approver on every item; each person's record of work |
| Version control and documents | GitHub, Drive | Drafts, versions, compare, review requests, releases for any work |
| Internal communication | Slack, email | Threads attached to the work, part of the record |
| Audit | External auditors | Anyone in the team can verify the ledger |

## Why now: facts with sources (cite them, e.g. in small footnotes or a sources slide)

- **1.3 billion adults have no account** at a bank or mobile-money provider, even though account ownership hit a record **79%** in 2024; about half of the unbanked live in eight economies. World Bank Global Findex 2025 — https://www.biia.com/financial-inclusion-at-record-high-but-1-3-billion-still-unbanked-world-bank-global-findex-2025-report
- **Sending money across borders costs 6.49% on average** (global average cost of sending $200, Q1 2025). World Bank Remittance Prices Worldwide, Issue 53 — https://remittanceprices.worldbank.org/sites/default/files/rpw_main_report_and_annex_q125_1_0.pdf
- **About 58–61% of the world's workers, some two billion people, work informally;** 93% of informal employment is in emerging and developing countries, where informality goes with lack of access to finance. ILO — https://www.peoplematters.in/news/economy-policy/nearly-58percent-of-global-workforce-still-trapped-in-informal-employment-ilo-report-49690 and https://www.eco-business.com/id/news/nearly-two-thirds-of-global-workforce-in-the-informal-economy-un-study/
- **Crypto use is growing fastest where banks fall short:** Asia-Pacific on-chain value received **+69%** year over year to **$2.36 trillion**; Latin America **+63%**; Sub-Saharan Africa **+52%**. Chainalysis 2025 Geography of Cryptocurrency — https://www.chainalysis.com/reports/2025-geography-of-cryptocurrency-report/ (coverage: https://bitcoinist.com/crypto-adoption-2025-chainalysis-report/amp/)
- **Wallets now work for normal people:** passkey smart wallets need one biometric prompt, no seed phrase and no app; a paymaster can cover network fees. https://eco.com/support/en/articles/15039720-passkey-wallets-explained · Base sub accounts: https://docs.base.org/base-account/improve-ux/sub-accounts
- **Teams already organizing on-chain still run on spreadsheets:** contributors juggle CSVs and screenshots to get paid (Consensys — https://consensys.io/blog/the-future-is-dao) and wait one to two weeks for payouts (DAOhaus contributor notes — https://chainverse.notion.site/Contributor-UX-Discussion-6dfa08730b48487797fcaebc41f88e33). A peer-reviewed study of decentralized-science teams found labor-intensive hybrid accounting, steep onboarding and fragmented coordination, and that transparency works best with clear roles and onboarding (Weidener & Boltz, Frontiers in Blockchain 2025 — https://www.frontiersin.org/journals/blockchain/articles/10.3389/fbloc.2025.1641294/full).
- **The pieces exist but don't fit together:** Safe (treasuries), Hats (roles), Coordinape (peer pay), Snapshot (voting) are separate tools for crypto operators, with no planning, versioning or workforce view. Open Collective shows transparent group budgets but runs fiat through a fiscal host (https://docs.opencollective.com/help/collectives/budget).
- **Version control is ready to leave code:** research on version control for writers shows private drafts, readable diffs and reviewable history work for prose. Ink & Switch Upwelling — https://www.inkandswitch.com/project/upwelling/ · Patchwork — https://www.inkandswitch.com/patchwork/notebook/2024-version-control/

## Who it's for

- **Small teams anywhere** (3–30 people: editorial and research groups, studios, collectives, community projects) with no bank account or entity, members in several countries, and tools that don't connect.
- **Team leads** tired of chasing status and paying people by hand.
- **Contributors** who want clear scope, review on their work, fast pay in TMIM and a record of what they made.
- **Members** who want decisions made in the open, with results that execute themselves.

## The first story (use it as the narrative example)

Chayolei was born in a **Torah scholarship and publishing community** (study groups and editorial teams producing seforim, i.e. Jewish scholarly books). The first works are books already in production. Tell it as one team's journey: the **objective** is the book; the **deliverables** are its chapters; the **tasks** are sources, translation and review; every chapter is versioned; every decision is on the record; contributors are paid in TMIM when their chapter is accepted; and the published book ships with its ledger beside it, every contributor credited from the record. Make clear the product is for any small team; this is the first one.

## What's built today (be honest; this is testnet)

- Smart contracts on **Base Sepolia testnet**: the TMIM token, a member registry, participation rewards, on-chain governance with signed rank attestations, and treasuries. **178 contract tests** pass; an audit package exists, with fixes in the source awaiting redeploy.
- A web app (SvelteKit + Firebase) with campaigns, assignments, review and approval, on-chain voting, and CI.
- **Not yet:** live teams, per-team treasuries, passkey wallets, the redesigned UI, mainnet, an external audit. Present those as the roadmap.

## Roadmap (for one slide; no dates)

1. New UI around the three systems: Home, Plan, Work, Decide, Treasury, with a ledger behind every screen.
2. Versioned work: drafts, compare, review requests, accept-and-pay in one signature.
3. Charter and decisions: versioned rules, proposals, decision log.
4. Treasury in TMIM: budgets, scheduled pay, monthly statements.
5. Any team, in minutes: charter templates, passkey wallets with no seed phrase and no fees, a treasury and charter per team.
6. AI teammates with defined roles (planner, source finder, reviewer, summarizer) whose suggestions are always attributed and never applied without a person.
7. Contract redeploy, external audit, then mainnet on Base.

## Product screens to show (draw them as clean UI mockups; this sample data is consistent)

Team: **Brachos Translation Group**. Objective: **Translate & publish Brachos**, budget **80,000 TMIM**, paid 35,200, committed 12,000, due Nisan. Members: **Mendel** (lead, approver), **Yosef** (reviewer), **Levi** and **Shmuel** (contributors).

- **Home:** "Needs you": Review "Ch.3 Kriyas Shema" v4 (from Levi, 2 days); Accept "Sources for Ch.1" → pays 80 TMIM; Vote: review reward 100 → 150 TMIM, closes in 26h. Team pulse: "Mendel accepted Ch.1 sources · paid Levi 80 TMIM · 10:42". Treasury glance: issued this month 12,400 of 20,000 TMIM.
- **Plan:** rows with stage, owner, reviewer, approver, reward: Ch.1 Intro: Released, Mendel ✓ Yosef, 1,200; Ch.2 Roots: In progress, Levi → Yosef, stalled 9 days; Ch.3 Kriyas Shema: In review, Shmuel → Yosef, 1,200; Ch.4 Bittul: Open, 1,200, [Take].
- **Review and accept** (the change card): "Review request v3 → v4" with a small text diff; footer: "If accepted: v4 becomes the deliverable · pays Shmuel 1,200 TMIM and Yosef 150 TMIM from Volume 1 · under rule 'Chapter = 1,200' · recorded on the ledger, final" and a button "Accept & pay (passkey)".
- **Decide:** proposal "Raise review reward": rule diff − 100 TMIM + 150 TMIM; why: "reviews take about 2 hours"; decided by members, majority, quorum 40%; 62% for; quorum reached.
- **Treasury:** team account 18,350 TMIM; issued this month 12,400 / 20,000 TMIM (charter cap); budgets table (Volume 1: 80,000 / paid 35,200 / committed 12,000 / left 32,800; Editing pool: 10,000 / 4,100 / — / 5,900); upcoming: scheduled pay to Levi 300 TMIM weekly; monthly statements.
- **Ledger:** "Mendel accepted Ch.1 sources · paid Levi 80 TMIM" (settled on-chain); "Shmuel saved v4 of Ch.3" (signed); "Yosef commented on Ch.3 ¶2" (signed); "Vote passed: review reward 100 → 150 TMIM (62%)" (settled).

All amounts in TMIM. Never show dollars, prices, charts of token value, swap or cash-out buttons.

## Suggested slide flow (adapt freely)

1. **Title:** Chayolei + tagline.
2. **The problem:** small teams fail at the seams: unclear decisions, unclear ownership, lost versions, slow and costly pay; and the institutional stack they'd need is out of reach.
3. **The scale:** 1.3B unbanked · 6.49% cross-border cost · ~2B informal workers · crypto growth where banks fall short.
4. **The idea:** three parallel systems (banking, corporate organization, workforce) on one ledger (a simple diagram).
5. **The parallel stack:** the comparison table.
6. **One pattern:** propose → decide → record, for work, rules and money.
7. **Crypto only, our own coin:** how TMIM flows (minted for participation → budgets → paid on acceptance → members hold it; conversion outside the platform).
8. **Product: plan and responsibility** (Plan screen).
9. **Product: versioned work that pays** (review-and-accept card).
10. **Product: decide and govern** (Decide screen with the charter).
11. **Product: the team's bank and its books** (Treasury + Ledger).
12. **The first story:** a Torah publishing team, end to end.
13. **Why Chayolei wins:** vs bank + company + SaaS stack; vs Notion/GitHub; vs Open Collective; vs the Safe + Hats + Snapshot toolkit.
14. **Built today and what's next:** honest status + roadmap.
15. **Close:** invite teams to be among the first to run on it, and builders to help ship it.

## Design direction

- **Calm, precise, trustworthy: a ledger, not a casino.** Generous whitespace, strong typographic hierarchy, tabular figures for amounts, one restrained accent color, paper-and-ink neutrals. No neon, no coins, no rockets, no price charts, no stock crypto imagery.
- Product mockups should look like a real, modern app (navigation rail with Home, Plan, Work, Decide, Treasury; a team switcher; status chips; change cards).
- Use one recurring visual device for **propose → decide → record**.
- Diagrams over bullet walls; at most ~25 words of body text per slide; speaker notes welcome.
- Accessible contrast; looks right in light and dark.
- Optional: a subtle nod to the Hebrew origin (one Hebrew line: "הבנק, התקנון וכוח העבודה של החבורה — בפנקס אחד"), right-to-left and correctly typeset if used.

## Guardrails (do not break these)

- **Not a bank.** No deposits, deposit insurance, lending, fiat or exchange.
- **Not a legal entity and not a way around the law.** "Independent of the banking and legal system" means a team can organize, decide and pay without needing a bank account, a registered company or an institution to start. Teams remain responsible for the laws that apply to them. Never suggest avoiding taxes, sanctions, employment or securities law.
- **Not an employer.** Contributors are team members; "workforce management" describes organizing work, not employment.
- **TMIM is not an investment and not equity.** No promised value, price, returns or "number go up."
- **No fiat in the product, no on- or off-ramps.** Conversion happens outside the platform.
- **No mainnet, audit-complete, user, revenue or partner claims.** Testnet today.
- Keep the name **Chayolei**. Don't rename the product or depict military imagery; ranks and military framing are not part of the pitch.
- Every statistic carries its source.

# Chayolei — Marketing Brief

> Written 2026-10-25. **This changes the positioning.** It supersedes the framing in `README.md` (a scholarship network governed as a DAO), `PUBLIC_INTRODUCTION.md`, `TOMCHEI_TMIMIM_OVERVIEW.md`, `INVESTOR_PITCH.md` and `GO_TO_MARKET.md` wherever they disagree. The economic model in `CLAUDE.md` (crypto in, crypto out; TMIM minted only for participation) still holds. The UX plan built on this brief is `UX_REDESIGN.md`.

---

## 1. What changed

| Before | Now |
|---|---|
| A network of talmidim who earn tokens, rank up and vote | **An organizing tool for teams that produce and publish**, with a shared ledger at its core |
| The token, the ranks and the DAO were the story | **Organizing is the story.** The ledger is what makes the organizing work: the group's books, its bank and its rules in one place |
| Donors, fiat rails, fiscal sponsors, institutional partners | **Crypto in, crypto out.** No banks, no fiscal host, no institutional dependency. Donations, if any, happen off-platform |
| Learning and rank progression | **Production and publishing.** A project starts as an idea and ends as a published work with every contribution on record |

## 2. Positioning

**One line:** Chayolei is the ledger teams organize on: plan a work, split it up, write it, review it, publish it, and pay everyone who made it, all on one shared record.

**Short pitch (≈60 words):** Producing a sefer, a translation or any serious body of work takes a team, and teams fall apart at the handoffs: who's writing what, who approved it, who got paid, who decided. Chayolei puts the whole production on one ledger. Every assignment, review, approval, payout and decision is recorded as it happens. The ledger holds the team's funds, its roles and its rules, so a group can organize itself without a bank account, a fiscal host or a back office.

**Category:** an organizing and publishing tool with a built-in ledger. Not a DAO tool, not a donation platform, not a token.

**Beachhead:** Torah scholarship and sefer publishing: chaburos, kollels and editorial teams producing seforim, translations and source collections. The first works in production are the books being assembled in `Esoterics611/sefer-forge`. The tool itself is not Torah-specific; the beachhead is where the heritage and the first users are.

**Draft Hebrew lines** (for the owner to choose or rewrite):
- הפנקס של החבורה — מתכננים, כותבים, מוציאים לאור.
- כל מה שהחבורה עושה, רשום במקום אחד.

## 3. The problem

Teams that produce long works fail in the gaps between people, not in the writing:

- **Handoffs break.** Editorial practitioners describe the manuscript journey as a series of handoffs, and the common breakdowns as coordination gaps: missed sign-offs, files stuck in disconnected systems ([Amnet](https://amnet.com/from-manuscript-to-publication-why-editorial-workflows-matter-more-than-ever/)).
- **Paying contributors is manual and slow.** Groups that pay contributors on-chain still juggle CSVs, payment tools, screenshots and spreadsheets ([Consensys](https://consensys.io/blog/the-future-is-dao)). Contributors report waiting one to two weeks to be paid ([DAOhaus contributor notes](https://chainverse.notion.site/Contributor-UX-Discussion-6dfa08730b48487797fcaebc41f88e33)).
- **Transparency alone doesn't organize anyone.** Interviews with decentralized-science DAOs found labor-intensive hybrid accounting, steep onboarding and fragmented coordination, and concluded that on-chain transparency works best with clearly defined roles, structured onboarding and credible validation ([Weidener & Boltz, Frontiers in Blockchain 2025](https://www.frontiersin.org/journals/blockchain/articles/10.3389/fbloc.2025.1641294/full)).
- **Transparent group money exists, but on borrowed rails.** Open Collective shows the demand: every collective's budget and transactions are public ([docs](https://docs.opencollective.com/help/collectives/budget)). But groups typically rely on a fiscal host for legal and accounting coverage, and the money runs through banks.

Today a team doing this work uses a shared doc, a spreadsheet, a group chat and, if they're on-chain, a multisig and a voting site. Nothing connects the work to the money to the decisions.

## 4. The product, in three parts

1. **The production line.** A project is a work in progress, laid out as its table of contents. Each piece moves through the same stages: open, claimed, drafting, in review, approved, published. Everyone sees what's blocking.
2. **The ledger.** Every step that matters is an entry: who claimed, who submitted, who reviewed, who approved, what was paid, what was decided. Entries read as plain sentences; the on-chain proof is one tap away.
3. **The treasury and the charter.** The ledger also holds the team's funds (in crypto) and its rules: roles, who can approve and spend, reward rates, how decisions are made. Approving a piece pays the contributor in the same step. Changing a rule is a proposal the team votes on, and the result is recorded.

The legal and banking functions a group would otherwise need an institution for (holding funds, paying people, recording who decided what under which rules) live on the ledger.

## 5. Who it's for

| Audience | What they do | What they get |
|---|---|---|
| **Project leads** (editor, mashpia, rosh chaburah) | Scope the work, assign it, approve it, publish it | One view of the whole production; approvals that pay on the spot; no spreadsheet to keep |
| **Contributors** (writers, translators, source researchers) | Claim pieces, draft, revise | Clear scope, review anchored to their text, paid when approved, a public record of everything they made |
| **Reviewers** | Read, comment, suggest, sign off | A review queue, suggestions the author accepts or rejects, credit on the ledger for every review |
| **Members** | Vote on rules and spending | Decisions with clear stakes and deadlines, results that execute themselves |
| **Funders** (crypto-native) | Send crypto to a team's treasury, outside the app | A ledger that shows exactly which work their funds paid for |

## 6. Message pillars

1. **Organize the work, not the paperwork.** The project is its table of contents; status, owners and payments come from the work itself.
   *Proof:* stages per piece, review in context, approval that pays.
2. **Everything on the record.** Every contribution, review, payment and decision is a ledger entry, readable by the whole team.
   *Proof:* the credits page of a published work is generated from its ledger.
3. **Your group's bank and rules, built in.** Funds, roles and rules live on the ledger; no bank account, fiscal host or back office.
   *Proof:* treasury, charter and proposals in the app; crypto in, crypto out.
4. **Paid when it's approved.** Contributors are paid in the same step as the approval, not weeks later.
   *Proof:* approval shows the payout before you sign; the payout is the next ledger entry.
5. **AI as a member of the team, on the record.** AI helpers have defined roles; what they suggest is attributed and never applied silently.

## 7. Alternatives and how we differ

| What teams use now | What it lacks |
|---|---|
| Google Docs + spreadsheet + WhatsApp | No connection between the work, the money and the decisions; nothing on record |
| Notion / project trackers | Track tasks, not money or authority; no shared, tamper-proof record |
| Open Collective | Transparent money, but fiat rails through a fiscal host; not a production tool |
| Safe + Hats + Coordinape + Snapshot (an on-chain stack) | Powerful pieces, five tools, no production line; built for crypto operators, not writers |
| Editorial systems (e.g. Editorial Manager) | Built for publishers' staff, not self-organizing teams; no treasury or rules |

## 8. Voice and vocabulary

- **Say what things are.** Project, piece, draft, review, approve, publish, ledger, treasury, rules, vote. Keep the Hebrew domain words (מבצע, משימה, תפקיד) as in-app labels where they're the natural name.
- **Lead with the work, then the ledger, then the chain.** The chain is how the ledger is trustworthy, not the pitch.
- **Plain and exact.** "Approving pays Levi 120 TMIM from the Brachos budget." Not "unlock rewards."
- **No hype.** No price talk, no returns, no "to the moon," no "Web3 revolution."
- **Military framing is not the pitch.** Ranks and "soldiers" stay heritage and in-app flavour at most; see open questions.

## 9. Claims we don't make

- The ledger is not a legal entity, and using it doesn't give a group legal status, tax status or a substitute for legal advice. Say "the group's rules and record," not "your legal entity."
- TMIM is not an investment and has no promised value beyond redemption at the treasury's published rate.
- No fiat, no bank integration, no institutional partner. Don't imply any.
- Don't claim audit completion or mainnet before they happen (contracts are on Base Sepolia; see `contracts/audit/README.md`).

## 10. The first story

The first works produced through Chayolei are the seforim in production in `sefer-forge`: each one a project, each chapter a piece, each contributor and reviewer credited from the ledger, each payout on record. Launch with a published work and its ledger side by side: here is the sefer, and here is everything that went into it.

## 11. Channels

Crypto-native and community channels only, consistent with the model: the team's own networks, Torah-learning communities, and on-chain communities on Base. No institutional partnerships, fiscal sponsors or donor programmes.

## 12. Measures of success

- Projects started; pieces approved per week; editions published.
- **Time from approval to payout** (target: same transaction).
- **Time from submission to review** (shows the production line moving).
- Share of published works whose credits come entirely from the ledger.
- Contributors active in a second project.

## 13. Open questions for the owner

1. **Torah-first or general from day one?** This brief leads with Torah publishing as the beachhead and keeps the tool general.
2. **Name and military framing.** "Chayolei Beis Dovid", IDF ranks and "soldiers" fit the heritage but not an organizing tool for teams. Keep, soften to heritage, or rename the product while keeping the heritage story?
3. **Who can start a team?** Anyone, or invitation only at first?
4. **What a team's treasury holds:** USDC only, or ETH as well?
5. **Ranks:** keep them as a record of trust and permissions, or replace them with a contribution history?

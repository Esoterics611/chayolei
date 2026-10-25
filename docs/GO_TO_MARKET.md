# Chayolei — Go-to-Market Plan (revised)

> **Economic model changed 2026-10-25:** crypto in, crypto out; no fiat, no fiat on- or off-ramps, no institutional connection (fiscal sponsor, 501(c)(3), tax receipts, payment processors); donations are handled separately, outside the platform; TMIM is minted only for participation. See `CLAUDE.md`. Superseded here: operating principle 5, the Stage 0 donation rail (manual cash/check/Zelle/Venmo flow, fiscal sponsor, Stripe/ACH, donor-advised funds, chai-multiple donation tiers), minting TMIM per donation, the fiscal-sponsor and online-donation items in the 30-day plan, the fiscal-sponsor and Stripe budget lines, and the fiscal-sponsor / 501(c)(3) legal path.

> Revised 2026-04-26. Vanguard parent deprioritized. Addressable market: the entire Torah-learning world. Ronnie is the initial mashpia. The first two mivtzaot are publications already in development. Online donations are the immediate operational priority.

---

## Operating principles

1. **The publications are the proof.** Year 1 is about shipping the two publications Ronnie + Claude are producing, with on-platform structure and a real contributor cohort. Everything else (institutional partnerships, multi-stream marketing, expansion) is downstream of that first artifact.
2. **Cross-stream from day one.** The platform is for the entire Torah-learning world — Modern Orthodox/YU, Religious Zionism, Chabad, other Chassidic, Yeshivish, Sephardic, and serious-secular learners. Pluralism is structural, not cosmetic. Single-stream branding caps the long-term ceiling and is unnecessary.
3. **Tomchei Tmimim is the heritage, not the brand boundary.** The origin story stays in the docs and in the about page. The public surface is broader.
4. **Mission-first language; tech-second language.** Talmidim, mashpia'im, donors hear about scholarship, publications, transparency. Investors and tech-curious audiences hear about on-chain governance, AI augmentation, EIP-712. Same product, different vocabulary per audience.
5. **Donations work before audits clear.** Cash/check/Zelle now → fiscal sponsor in 60 days → online flow in 90 days → independent structure later. Don't wait for the perfect rail to start collecting commitments.
6. **AI-augmented Torah scholarship is a real frontier.** Lean into it. Ronnie + Claude is itself a pioneering use case. Don't hide it; don't oversell it. Document it honestly as a working case study.
7. **Ship one thing publicly every 4–6 weeks.** Public artifacts compound. A monthly contributor-progress update, a quarterly impact letter, a published essay — each one builds the surface area.
8. **Conserve TMIM.** No public token sale. No DEX listing. TMIM is a redemption-pegged accounting token — that's the whole point. Don't compromise this for short-term hype.

---

## The 5-stage GTM (revised)

| Stage | Goal | Exit criterion | ~Time |
|---|---|---|---|
| 0. Foundation | Donation rail + fiscal sponsor + advisory council in motion | Fiscal sponsor partnered; online donations accepting; 4+ rabbinic advisors named; both publications scoped | 30–90 days |
| 1. Publication production | Ship publication #1 with full contributor cohort | Publication #1 published, 5–15 contributors paid TMIM, $100k+ raised | 6–9 months |
| 2. Public launch | Establish credibility across Torah world | Publication #1 in circulation, cross-stream press coverage, 3+ inbound institutional inquiries | 1–2 months parallel with end of Stage 1 |
| 3. Second wave | Expand contributor base + ship publication #2 + first institutional partnership | Publication #2 published, 20–50 active contributors, 1 institutional partnership signed | 6–9 months |
| 4. Network and infrastructure | Become the default platform | Multiple concurrent mivtzaot, $1M+ annual donor flow, 3+ institutional partners, recurring publication pipeline | 12+ months |

---

## Stage 0 — Foundation (next 30–90 days)

### Donation rail (highest priority)

**Days 1–14:**
- Stand up a "Support the Publications" page on chayolei.xyz. Bare-bones: one paragraph on each publication, a funding goal, a contact email and a "donate" button that goes to a manual flow.
- Document the manual donation flow: cash, check, Zelle, Venmo, USDC to a designated wallet. For each donation: log donor name, amount, date, intent, contact info. Send a personal acknowledgment letter (positioned as "support letter," not a tax receipt).
- Mint corresponding TMIM into a treasury tracking wallet for each donation received. Maintain a public ledger that reconciles off-chain donations with on-chain TMIM balance.

**Days 15–60:**
- Engage a fiscal sponsor. Three target conversations in parallel:
  - **Open Tent / National Center for Charitable Statistics fiscal sponsorship** — fastest, professional, ~7–10% fee, ready to onboard mission-driven projects.
  - **Mosaic United** — strategically valuable; harder to land but signals legitimacy in the broader Jewish institutional world.
  - **Aleph Society / Tikvah Fund / OU** — slower, relationship-dependent, but each carries narrative weight in different streams.
- Goal: fiscal sponsor agreement signed by Day 60. Donors can then write tax-deductible checks immediately.

**Days 60–90:**
- Wire the online donation flow into chayolei.xyz integrated with the fiscal sponsor's payment infrastructure. Stripe + USDC + ACH. Donor designates: general / specific publication / specific contributor. Receipt issued by the fiscal sponsor; platform mints TMIM acknowledgment.
- Set up donor-advised fund routing instructions for major donors (Schwab Charitable, Fidelity Charitable, Vanguard Charitable, Jewish Federation funds).
- Add recurring donation tiers at chai-multiples ($18, $36, $180, $360, $1,800, $3,600).

### Publications scoping (concurrent, days 1–30)

For each of the two publications:
- **Title and subtitle.** What is this work?
- **Scope and structure.** Length, format (print, ebook, web-native, source anthology, etc.), table of contents.
- **Target audience.** Who is this for? Talmidim? Mashpia'im? General Torah-engaged readers? Academics?
- **Deliverable.** Final form. Print run if applicable, distribution plan, pricing or free-distribution decision, license (consider Creative Commons CC-BY-SA for max reach + attribution).
- **Deadline.** Realistic ship target (recommend: publication #1 in 6 months, publication #2 in 12 months).
- **Funding ask.** Total budget per publication. Recommend transparent breakdown: contributor stipends, editorial, design, print costs, platform overhead.
- **Contributor roles.** What masimot does this publication need? Source-collection, translation, peer review, scholarly footnoting, editing, formatting, indexing, design. Each becomes a structured masima type with reward calibration.

### Rabbinic advisory council (days 30–90)

Four-to-six names, one per Torah stream. Each provides a brief written endorsement or non-objection of the platform structure (the halachic framing is that TMIM rewards verified scholarly output, not the act of learning itself).

Target names by stream:
- **MO/YU:** A respected RIETS rosh yeshiva or YU faculty rabbi with semicha credentials.
- **Religious Zionism (Israel):** A figure from Tzohar, Eretz Chemdah, or Yeshivat Har Etzion.
- **Chabad:** A respected shliach or mashpia, ideally one already supportive of new infrastructure.
- **Other Chassidic:** A Breslov or other Chassidic figure with cross-stream credibility.
- **Sephardic:** A Sephardic talmid chacham or rosh kollel.
- **Optional academic / cross-stream:** A figure like David Bashevkin, Meir Soloveichik, or comparable bridge voices.

Pluralism is the point. Even brief endorsements published together as a council give the platform cross-stream credibility no single endorsement could.

### Other foundation items
- **Pick the name posture.** Recommended: "Chayolei" stays as the platform name; secondary descriptor "Chayolei Torah Scholarship Network" for cross-stream institutional clarity. Tomchei Tmimim heritage stays in the about page.
- **Pick taglines per surface** (primary cross-Torah-world tagline: *"Verified scholarship. Transparent funding. The infrastructure for the next generation of Torah learning."*).
- **Set up social presence:** @Chayolei or @ChayoleiTorah on X, similar on Telegram; consider a project Substack for the long-form essays that Stage 2 will need.
- **Reserve domains:** chayolei.xyz / .org / .com defensively; chayolei.network for the institutional positioning.
- **Backlog: contracts work.** Finish C3-C6 (uncompiled execution-hardening contract → 95% test coverage → static analysis → external audit). Audit can take 8–12 weeks, so start the audit shopping in parallel with Stage 0. Target: audit-ready by end of Stage 1, mainnet by end of Stage 2.

### Exit criterion
**Fiscal sponsor partnered, online donations live, both publications scoped, 4+ rabbinic advisors named with their endorsements published. Ready to recruit contributors and pitch the anchor donor.**

---

## Stage 1 — Publication production (months 3–9)

The platform's first real cohort produces the first publication.

### Recruit the contributor cohort

Target: 5–15 contributors for publication #1. Cross-stream by design.

Recruitment channels:
- **Direct outreach** to known scholars, kollel members, semicha students, post-doctoral Jewish-studies academics — anyone Ronnie has a personal or warm-intro connection to.
- **Yeshiva and kollel networks** — partner with one or two specific institutions (a hesder yeshiva, a YU semicha class, a Pardes cohort) to offer a fellowship-style track where the masimot count toward their scholarly output.
- **AI-curious religious-tech professionals** — frumtech / RZ tech communities, Israeli religious technologists. Many have wanted a meaningful side-project; this is one.
- **The platform itself** — once the signup flow is polished, anyone can apply. Vetting happens via the mashpia (Ronnie) approving initial masimot.

The first 3–5 contributors get founding-cohort treatment: visible attribution in the publication, higher initial rank, and explicit recognition as platform pioneers. This becomes a story they can tell about themselves, which becomes recruitment for the next wave.

### Run the publication mivtzaot

Each publication is a mivtza. Inside it, masimot for each contributor role:
- **Source collection** — gathering primary texts, marei mekomot, scanned manuscripts.
- **Translation** — for sections requiring rendering between Hebrew/Aramaic/English/other.
- **Original analysis** — chiddushim, source-pattern identification, thematic synthesis.
- **Peer review** — substantive review of others' work with comments.
- **Scholarly footnoting / cross-referencing** — academic apparatus.
- **Editing / proofreading** — text polish.
- **Design / formatting / typesetting** — final production.
- **Indexing** — for printed editions.

Each masima has a base reward × rank multiplier, paid in TMIM, redeemable for cash stipends through the treasury.

Ronnie (as initial mashpia) approves all submissions and can promote contributors based on demonstrated quality. As the cohort grows, deputize 1–2 senior contributors with `APPROVER_ROLE` so review doesn't bottleneck on one person.

### Anchor donor pitch (concurrent, months 3–6)

Goal: lock in $100k–$500k from one anchor donor by Month 6.

The pitch is concrete:
- "We are producing two publications. Total budget $X. Here are the publications, here is the contributor team, here is the timeline."
- "You can fund either or both. Specific publication, specific contributor track, or general."
- "You can see exactly where your money goes — every TMIM minted, every masima approved, every stipend redeemed is on a public ledger."
- "When the publication ships, your name is in it as the patron."

Donor channels:
- Warm intros via the rabbinic advisory council members (each one likely has 5–20 philanthropic connections).
- Jewish Funders Network conferences and member directory.
- Mosaic United, Tikvah Fund, Maimonides Fund, Avi Chai, Schusterman, Marcus, Wexner — institutional foundations supporting Jewish learning.
- DAF intermediaries: Jewish Federation philanthropy advisors, Jewish Communal Fund advisors.
- High-net-worth individuals with documented Jewish-learning philanthropy (search: published donor walls of major yeshivot/Hebrew universities, Forward Top 50, eJP top givers).

Recommended sequencing: send a written brief (the [`INVESTOR_PITCH.md`](INVESTOR_PITCH.md) document below, lightly customized) to 10–25 candidates. Take 5–10 meetings. Close 1 anchor.

### Public progress (concurrent, monthly)

A monthly "Production Update" email/post with: contributors recruited this month, masimot approved, TMIM minted, donations received, expected timeline. Small audience initially (donors, advisors, friends). Builds the surface for the eventual public launch.

### Exit criterion
**Publication #1 published. 5–15 contributors paid real TMIM stipends. $100k+ in donations received. Anchor donor on board. At least one institutional partnership conversation in flight.**

---

## Stage 2 — Public launch (months 9–11, around Publication #1 release)

### The launch artifact

The publication itself is the launch announcement. With:
- Foreword from a respected figure (rabbinic advisor, anchor donor, or a senior voice in the Torah world).
- Acknowledgment page listing every contributor by name, with their rank and the masimot they completed (with their consent — pseudonymous attribution allowed for those who prefer).
- "About Chayolei" appendix describing the platform that produced it.
- Donor acknowledgment for the anchor and any other major supporters.
- Technical appendix (small, in the back) showing on-chain provenance: contract addresses, mivtza ID, hash of the manuscript at finalization.

If publication #1 is print: target 1,000–5,000 copy first run, distributed to: sefarim stores, partnering yeshivot, every donor who gave $180+, the rabbinic advisors, key reviewers in the community.

If publication #1 is digital: web-native at a permanent URL on chayolei.xyz, downloadable PDF, citation-ready, with an open license (recommend CC-BY-SA).

### Coordinated launch outreach

Same week as publication release:
- **Cross-stream Jewish press:** pitch coverage to Mishpacha, Ami, Tablet, Mosaic, Jewish Action, Tradition, Hadassah Magazine, the Times of Israel religion vertical, Chabad.org, COL, Yeshiva World News, Arutz Sheva, Makor Rishon.
- **Podcasts:** 18Forty (David Bashevkin), Meaningful People, Jewish Latin Princess, Jewish History Soundbites, MealMint, Chinuch.org podcast, Tikvah's main podcast, Bible Project (for academic-secular angle).
- **Personal outreach** by Ronnie + advisors to known voices in each stream — the rabbis, scholars, and writers whose endorsement matters.
- **Op-ed** in 1–2 outlets (Tablet, Mosaic) on the broader thesis: AI-era Torah scholarship, transparent infrastructure, the next decade of Jewish learning.

### What NOT to do
- **No "TGE."** TMIM is not a tradeable asset.
- **No mainstream crypto press.** Wrong audience optics. The story is "AI-augmented Torah scholarship" not "new crypto project."
- **No false-scale claims.** Don't pre-announce institutional partnerships that aren't signed. Don't claim contributor counts that include trivial sign-ups. The community has a low tolerance for this.
- **No exclusivity claims** about working with one denomination — emphasize the cross-stream nature.

### Exit criterion
**Publication #1 in circulation and cited in at least 3 cross-stream outlets. 3+ inbound inquiries from institutions or potential contributors. Contributor cohort growing organically.**

---

## Stage 3 — Second wave (months 11–18)

### Publication #2 + first institutional partnership

Publication #2 is in production (started during Stage 1, finishes in this stage). With more lessons learned, larger contributor cohort, more donor capacity.

In parallel, lock in the first institutional partnership. Target profile:
- An existing fellowship or learning program with 10–50 participants.
- Currently coordinating via email + Google Docs + ad-hoc stipends.
- A program director willing to try Chayolei as the underlying infrastructure for one cohort.

Best initial candidates:
- **Wexner Service Corps** (or comparable Wexner programs)
- **Tikvah Scholars or Tikvah Rabbinic Fellowship**
- **Pardes Year-Long Program**
- **Mechon Hadar Yeshivat Hadar (kollel)**
- **A specific RIETS semicha cohort or YU Beren Kollel chaburah**
- **An Israeli mechina (e.g., Bnei David) kollel track**

The partnership offers them: free infrastructure for tracking output, donor reporting, transparent stipend administration, and visibility into participant work. In exchange: visible affiliation, case-study cooperation, and modest fees on the back end (or just goodwill in Year 1).

### Expand contributor base

Target: 20–50 active contributors across multiple concurrent mivtzaot.

This is the stage where the platform begins to feel like a network rather than a single-mashpia operation. Key shifts:
- **Deputize 2–3 additional approvers** (high-rank contributors who can review/approve work in their domain).
- **Multi-mivtza contributor flow** — a contributor can pick up work across any open mivtza, not just one.
- **First external (non-Ronnie) mivtza** — a contributor or a partner mashpia proposes and runs their own mivtza on the platform. This is the first sign the platform works without the founder driving every mivtza personally.

### Donor base growth

By end of Stage 3, target: 20–50 donors at varying scales, with $500k–$2M annual flow.

- Recurring donor program operational (chai-multiples).
- Donor portal showing each donor their cumulative impact (which mivtzaot, which contributors, which publications).
- Annual impact letter sent in time for Tisha B'Av or Rosh Hashana giving cycles.

### Exit criterion
**Publication #2 published. 20–50 active contributors. 1 institutional partnership signed and running. $500k+ annual donor flow.**

---

## Stage 4 — Network and infrastructure (months 18+)

The platform becomes the default infrastructure for verified Torah scholarship.

What this stage looks like:
- **5–15 concurrent mivtzaot** across the platform, run by Ronnie + 3–10 deputized mashpia'im across multiple Torah streams.
- **3+ institutional partnerships** with established yeshiva / fellowship / kollel programs.
- **Annual publication pipeline** — 2–6 publications per year shipping through the platform.
- **Recurring donor base** of hundreds of supporters at varying scales, plus institutional grants from foundations.
- **Recognized as the standard** for verified Torah scholarship infrastructure across the Torah world.
- **First fork or vertical extension** — another community (academic seminary, mussar network, or another religious tradition entirely) adopts the codebase. Validates the engine pattern.

Optional expansions:
- **Chayolei Press** as an imprint identity for all platform-produced publications.
- **Annual gathering** — a kinus / yom iyun bringing together contributors, mashpia'im, donors. Online + select in-person regional events.
- **Chayolei Fellowship** — a named fellowship within the platform, supporting full-time scholars on multi-year mivtzaot.
- **Engine extraction** (`@vanguard/core`) — at this scale, the codebase deserves to be extracted as a properly maintained shared engine, with Chayolei as the reference implementation and other communities able to fork.

---

## Cross-cutting: budget (revised, Year 1, broader scope)

| Item | Cost (USD) |
|---|---|
| External smart contract audit | $30–80k |
| Fiscal sponsorship setup + Year 1 fees | $5–10k upfront + 7–10% of donations |
| Online donation infrastructure (Stripe, plumbing, dev) | $5–10k |
| Publication #1 contributor stipends + production | $40–120k |
| Publication #2 contributor stipends + production (started in Year 1) | $30–80k |
| Platform development (C3-C6 contracts, donation flow, contributor onboarding polish) | $30–80k (or self-built by Ronnie + Claude) |
| Rabbinic advisory honoraria (modest) | $5–15k |
| Anchor donor outreach travel + meetings | $5–15k |
| Press/launch (publication launch coverage, design, video) | $10–25k |
| Marketing/content (essays, podcasts, design) | $5–15k |
| Hosting, infra, tools, KMS | $5–10k |
| Reserve / contingency | $20k |
| **Total Year 1 cash budget** | **$190–490k** |

Funding plan: $100k–$300k via the anchor donor, $50k–$150k via secondary donors, the rest via small recurring donors and a self-funded gap.

---

## Cross-cutting: legal

- **Fiscal sponsor agreement** — primary path. Donors get tax receipts via the sponsor; the sponsor takes a fee; Chayolei operates as a project under their umbrella.
- **Or own 501(c)(3)** if scale justifies — file in parallel with Stage 0, expect 6–18 months for IRS approval. Worth doing if the project sustains $1M+/year for multiple years.
- **Crypto custody** — multisig (Safe) for all treasury funds. No single key on a hot wallet. Suggest 3-of-5 multisig with signers including Ronnie, the fiscal sponsor representative, and 1–2 advisors.
- **Attestation signer key** — move from `.env` to KMS (AWS KMS or Google Cloud KMS) before mainnet.
- **Terms of service, privacy policy, donor terms, contributor agreements** — standard, but written. Needed before broader public launch.
- **Counsel:** engage a Jewish-non-profit specialist lawyer (suggest someone who has handled multiple yeshiva or Jewish foundation filings).

---

## Cross-cutting: metrics

**Stage 0:** Fiscal sponsor signed; donations rail accepting; advisory council named; publications scoped; first donations received.

**Stage 1:** Contributors recruited vs. active weekly; masimot approved; TMIM minted vs. budget; donations received; anchor donor closed; publication #1 progress against deadline.

**Stage 2:** Press placements; inbound inquiries; readership of publication #1 (downloads, sales); contributor sign-ups post-launch.

**Stage 3:** Active contributors; concurrent mivtzaot; institutional partnership signed and using platform; recurring donor count and dollars.

**Stage 4:** Annual donor flow; institutional partnerships; publications-per-year cadence; first fork.

Vanity metrics to ignore:
- Twitter followers (wrong audience for the primary work)
- TMIM "price" (it's pegged)
- Total signups (active contributors are what counts)
- General-press headlines that don't drive donor or contributor flow

---

## The 30-day plan (concrete, revised)

### Week 1
- Stand up "Support the Publications" landing page on chayolei.xyz with manual donation flow (cash/check/Zelle/Venmo/USDC).
- Scope publication #1 — title, scope, deliverable, deadline, budget, contributor roles. Write it as a one-pager.
- Same for publication #2.
- Identify and reach out to 3 fiscal sponsor candidates (Open Tent, Mosaic United, one comparable).
- Identify and reach out to 4–6 rabbinic advisor candidates.
- Finish C3 contract work (compile the rewritten governance contract; update test file).
- Fix the redemption rate on TMIM (`setRedemptionRate(100)`).

### Week 2
- First conversations with fiscal sponsor candidates; aim to narrow to 1–2.
- First conversations with rabbinic advisor candidates.
- Begin C4 (governance test coverage).
- Begin drafting the [`INVESTOR_PITCH.md`](INVESTOR_PITCH.md) into a polished PDF for donor outreach.
- Identify 5–10 candidate first contributors (people Ronnie knows or has warm intros to).

### Week 3
- Lock in fiscal sponsor LOI.
- Lock in 2 of the rabbinic advisors.
- Begin online donation flow integration (Stripe + USDC + the sponsor's payment infrastructure).
- Begin C5 (treasury hardening).
- First contributor outreach — invite 3–5 to start on small initial masimot for publication #1.
- Begin shopping for the smart contract audit (3 quotes).

### Week 4
- Fiscal sponsor agreement signed.
- 4 rabbinic advisors confirmed; brief endorsements drafted.
- Online donation flow live in beta.
- 3–5 contributors onboarded, picking up first masimot.
- Anchor donor outreach list built (10–25 names with intro paths identified).
- Begin C6 (audit prep).

End of month 1: Donations live. Contributors at work. Publications scoped and in production. Audit shopping underway. Anchor donor outreach beginning.

---

## What success looks like in 12 months

- Both publications published or in final production stages.
- 20+ active contributors across the Torah-learning world.
- $300–800k in donations received.
- Fiscal sponsor relationship operating smoothly.
- Cross-stream rabbinic advisory council established and visible.
- 1+ institutional partnership in active use or starting.
- Smart contracts audited; mainnet live; donations flowing through both fiat and crypto rails.
- Recognized in cross-stream Torah press as a serious infrastructure project.
- Ronnie has 1–2 deputized mashpia'im sharing approval load.
- Clear answer to "what is Chayolei" that any Torah-world operator can repeat.

What success does NOT look like in 12 months:
- TMIM trading on a DEX
- Hundreds of contributors with thin engagement
- Crypto-press coverage drowning out Torah-press coverage
- Premature institutional commitments
- Publications still in production with no shipped artifact

---

## A note on posture

The hardest thing about launching this is restraint. The temptation will be to:
- Announce a "global Torah network" before publication #1 ships.
- Pump the AI-augmented angle to tech audiences because they're easier to excite.
- Skip the rabbinic advisory work because it's slow and ambiguous.
- Take a second publication to scale before the first one is in print.
- Talk about cross-stream reach before contributors from multiple streams are actively shipping work.

Resist all of these. The community Chayolei is built for has long memory and low tolerance for shtick. The single most important asset is the trust of the first contributors, the first donors, and the first rabbinic advisors. Everything is downstream of that.

The publications are the proof. Ship them.

*חיילי בית דוד — Soldiers of the House of David. Verified scholarship. Transparent funding.*

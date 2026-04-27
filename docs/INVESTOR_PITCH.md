# Chayolei

## Verified scholarship. Transparent funding. Infrastructure for the next generation of Torah learning.

> An on-platform pitch for donors, mission-aligned investors, and institutional partners.
> 2026-04-26.

---

## In one paragraph

Torah scholarship is funded ad-hoc, distributed by reputation networks, and tracked nowhere systematically. Across the entire Torah-learning world — Modern Orthodox, Religious Zionist, Chabad, other Chassidic, Yeshivish, Sephardic, and academic — the same problem exists: serious scholars need real support to produce serious work, donors want to see real impact, and institutions want infrastructure to coordinate research at scale. **Chayolei is the platform that solves all three.** Scholars produce verified deliverables and earn portable on-chain credentials; donors see exactly what their gift produced and who built it; institutions get coordination infrastructure they don't have to build. We are launching with two publications already in production, looking for $300–800k in donations and partnerships to ship them and prove the model. The platform itself is built and operational. We need the first contributors, the first donors, and the first publications shipped — then the flywheel turns on its own.

---

## The problem

### For scholars
- Talented scholars in their 20s and 30s often go years without serious financial support — kollel stipends are limited, fellowship slots are scarce, and post-bochur transitions are painful.
- Original scholarship sits in unread Word documents, scattered Google Drives, or unpublished beis midrash notes — often forever.
- Reputation depends on the institution you're at. Move institutions and your track record doesn't always travel.
- Peer review across institutions is rare; serious scholars work in silos.

### For donors
- "I gave $100k to a yeshiva. I have no idea what specifically my money funded." This is the #1 complaint of sophisticated Jewish donors.
- Annual reports are vague. Newsletters are PR. Impact is anecdotal.
- Donor-advised funds and family foundations want metrics they can defend to their boards. They get prose.
- Recognition rarely scales below the building-naming level. Smaller donors fund operations they never see.

### For institutions
- Coordinating a multi-institutional research project (a sefer, a curriculum, a translation) is a Google-Docs-and-WhatsApp nightmare.
- Tracking which fellow produced what, which mentor reviewed what, which grant funded what — there's no shared infrastructure.
- Donor reporting is manual. Budget tracking is manual. Stipend administration is manual.
- The result: institutions either don't run cross-institutional projects, or they run them at a quality cost.

### The structural problem
The Torah world has the people, the donors, and the projects. **What it lacks is shared infrastructure for verified scholarship and transparent funding.** No platform integrates these layers. Sefaria handles content. Charidy handles fundraising. Yeshivot handle their own internal operations. Nothing connects them.

---

## The solution

Chayolei is an open-source platform where:

1. **Scholars (talmidim)** sign up, get a wallet, and pick up structured research assignments (masimot) within larger campaigns (mivtzaot). They submit work, get peer-reviewed, and earn TMIM tokens redeemable for cash stipends.
2. **Mashpia'im (mentors / scholars-in-charge)** create mivtzaot, set up the masimot, review and approve work, and grant promotions. They run their projects with structure they didn't have to build.
3. **Donors** fund the treasury — fiat (via fiscal sponsor with tax receipts) or crypto (USDC/ETH directly to the on-chain treasury). They designate by general / specific publication / specific contributor. They see every TMIM minted and every stipend redeemed in real time on the public ledger.
4. **Institutions** can adopt Chayolei as the infrastructure layer for their fellowship programs, research initiatives, kollelim, and donor reporting. White-label or cobranded.

Every stipend traces to a verified deliverable. Every donation traces to a specific contributor. Every contributor's history travels with their wallet across institutions and across time. A 28-year-old scholar in Jerusalem and a 65-year-old donor in Boca Raton see the same ledger, in real time.

The technology under the hood: 8 deployed smart contracts on Base (Ethereum L2), security-hardened with EIP-712 rank attestation, integrated with a Hebrew-RTL SvelteKit web app and live Firebase backend. A user never has to think about any of this. They see "submit your work," "approve this submission," "donate to this publication." The blockchain is plumbing.

---

## What's already built

- **8 smart contracts deployed on Base Sepolia testnet.** Token, registry, treasury, governance (v2), reward distribution. Security-hardened with EIP-712 rank attestation, 35 passing tests.
- **Live web platform.** SvelteKit 2, Hebrew RTL, sacred-night theme. 12 routes including dashboard, mivtza creation, masima submission and review, governance, treasury, contributor directory.
- **Live Firebase backend.** No mock data. Real authentication, real database, real API.
- **Working wallet integration.** Contributors connect via standard Web3 wallets; contracts read/write live.
- **Two publications in development.** Co-produced by the founder + Claude (AI-augmented Torah scholarship). These are the first real mivtzaot and the immediate funding ask.
- **A 1,909-line spec document** of the full DAO architecture. Auditable. Forkable. Implementable.

What remains to launch broadly: external smart contract audit, mainnet deployment, online donation rail integration with a fiscal sponsor, and the first contributor cohort working on the publications. All scoped, all in motion. **Operational launch in 60–90 days.**

---

## Market

The Torah-learning world globally:
- **Modern Orthodox / YU world (US):** ~500k+
- **Religious Zionism (Israel + diaspora):** ~700k–1M
- **Chabad worldwide:** ~200k active
- **Other Chassidic streams (combined):** ~500k–1M
- **Yeshivish / Litvish:** ~200k+
- **Sephardic learning networks:** ~300k
- **Serious-secular / academic / Pardes / Hartman audience:** ~200k–500k

**Total Torah-engaged global cohort: 2–3M people. Platform-engageable subset: 300k–1M.**

Annual donor flow into Torah learning globally is estimated in the **hundreds of millions to low billions** of dollars (yeshivot, kollelim, scholarship programs, publication funding, fellowships). Even capturing 1% of donor flow at a 3% platform fee yields **$3–30M ARR potential** at maturity. This is sustainable mission-driven scale at the institutional level.

The platform is not trying to capture donor dollars away from existing institutions — it's adding transparency, verification, and cross-institutional coordination to a flow that already exists. Existing institutions (YU, Yeshivot Hesder, Chabad, Lakewood, Sephardic communities, Hartman, Pardes) become customers and partners, not competition.

---

## Defensibility

1. **Verticalized for the Torah world.** Hebrew terminology, halachic-aware reward structure, rabbinic advisory council, donor patterns specific to Jewish institutional life. Generic DAO platforms can't compete here without rebuilding what we've already shipped.
2. **The cross-stream pluralism is structural.** Built to be acceptable across MO/YU, RZ, Chabad, Chassidic, Yeshivish, Sephardic, and academic worlds simultaneously. Most Jewish institutional projects are single-stream and thus capped. We're not.
3. **Network effects on contributor reputation.** Every scholar's track record builds on the platform. The longer the platform runs, the more valuable the platform-resident reputation becomes — and the harder it is for a new entrant to replicate.
4. **AI-augmented scholarship is a frontier we're already on.** Founder + Claude is producing the first publications. By the time other platforms wake up to AI-collaborative Torah work, Chayolei is the established home for it.
5. **Open source and forkable.** Other communities (Christian seminaries, mussar networks, even academic departments) can fork the platform for their vertical. This isn't dilutive — it makes Chayolei the reference implementation, like WordPress for content management.
6. **Working code + working contracts + working UI.** Most "we're going to build infrastructure" pitches are vapor. We're past that.

The closest mental model: **what GitHub did for software development collaboration, applied to Torah scholarship.** GitHub didn't replace coding — it gave a shared substrate for collaborative work that compounded over time. Chayolei aims to be that substrate for Torah scholarship.

---

## Team

- **Founder (Ronnie Rendel):** initial mashpia and platform builder. Producing the first two publications in collaboration with Claude (AI augmentation as a core operating method). Architect of the platform; primary developer.
- **AI augmentation as operating principle:** Claude is integrated into both the platform's development and the scholarly work itself. This is a deliberate operating principle, not a curiosity — it dramatically extends one founder's reach in a way that previous Jewish-tech projects haven't accessed.
- **Cross-stream rabbinic advisory council (in formation):** target 4–6 names across MO/YU, Religious Zionism, Chabad, other Chassidic, Sephardic, and academic worlds. Each provides a brief written endorsement of the platform structure.
- **Fiscal sponsor (in negotiation):** target signing within 60 days. Provides 501(c)(3) status for tax-deductible donations and institutional credibility.
- **Initial contributor cohort (in formation):** 5–15 scholars across Torah streams, recruited to work on the first two publications.

The platform is structurally designed to spread authority through ranks. As contributors advance and earn rank, they take on review, approval, and mivtza-creation authority. Founder dependence decreases as the cohort grows.

---

## Business model

A mission-driven platform with sustainable economics. Three revenue layers:

### Layer 1: Donation flow (primary)
Donations into the treasury → minted TMIM → mivtza allocations → contributor stipends. Platform retains 3–5% of inflow for operations (transparently disclosed), plus the fiscal sponsor's 7–10% for handling tax-receipt infrastructure.

### Layer 2: Institutional partnerships (medium-term)
Yeshivot, fellowship programs, research initiatives use Chayolei as their infrastructure. Pricing: per-seat licensing, percentage of administered grants, or sponsored partnerships with named participation.

### Layer 3: Publication revenue (medium-term)
Seforim and research published through the platform can be sold or sponsored. Revenue flows back to the originating mivtza pool, with a platform allocation. Bestseller in the Torah-publication world is 5,000–25,000 copies at $20–50 each.

### Financial trajectory
- **Year 1 (publication-led):** $190–490k expense; $300–800k donor flow; both publications shipped; 5–25 active contributors.
- **Year 2:** $500k–$2M annual flow; 50–200 contributors; 3–5 institutional partnerships starting.
- **Year 3:** $2M–$8M annual flow; 200–800 contributors; 10+ institutional partnerships across streams.
- **Year 5 (mature):** $10M+ annual flow; default platform for Torah scholarship coordination; sustainable via fees + publication revenue + institutional partnerships.

Not crypto-VC scale — but real, defensible, durable institutional scale.

---

## What we're asking for

### Anchor donor commitment ($100k–$500k)
Funds the production of one or both publications. Donor receives:
- Named patron acknowledgment in the publication.
- Quarterly impact updates with specific contributor stories and on-chain ledger evidence.
- First-look at all published platform output.
- Voting weight in the platform's governance proportional to contribution (optional).

### Foundational donor pool ($50k–$500k aggregate)
Smaller commitments ($5k–$50k each) from a coalition of supporters. Funds platform development, contributor stipends, audit, and operational infrastructure.

### Recurring supporters ($18–$3,600/month)
Ongoing chai-multiple recurring donations from a broad supporter base. Funds operations and signals community traction.

### Institutional partnerships (in-kind or fee-based)
Established yeshivot, fellowship programs, or foundations that want to use the platform for their own programs. Pilot terms negotiable. We're looking for 1–2 anchor institutional partners by end of Year 1.

### Mission-aligned investment (special structures only)
Chayolei is structurally non-profit / mission-driven. We are not raising venture equity. However, we are open to:
- Recoverable grants (returnable on milestones).
- Program-related investments from family foundations.
- Sponsored development partnerships where an investor funds a specific platform feature with attribution.

If you are an investor exploring impact-driven structures in Jewish or religious-tech space, we should talk.

---

## Why now

1. **The infrastructure exists.** This wasn't possible 5 years ago. Smart contracts on Layer 2 networks have made the fee structure viable. SvelteKit + Firebase has made the user experience match expectations.
2. **AI augmentation is a real frontier in scholarship.** The platform happens to be the natural distribution and funding layer for AI-collaborative Torah work — and that category is going to grow whether anyone organizes it or not.
3. **Donor expectations are shifting.** A new generation of philanthropists wants visibility into what their money does. Vague newsletters no longer suffice. Chayolei is built for this expectation.
4. **The talent is there.** A generation of scholars has serious Torah backgrounds and serious tech literacy. They want meaningful work. The platform provides it with structure and recognition.
5. **No one else is doing this.** Sefaria, Charidy, the existing institutions — none address the integrated coordination + verification + funding problem. First mover is real.

---

## Risk and how we address it

**Halachic / hashkafic objections.** TMIM rewards verified scholarly output (a deliverable), not the act of learning. This distinction is universally accepted across the Torah world. The cross-stream rabbinic advisory council provides structural validation.

**Crypto skepticism in religious audiences.** The blockchain is plumbing — invisible to scholars and donors. They see "submit your work," "donate to this publication." We don't push the technology layer in primary marketing.

**Single-founder risk.** AI augmentation extends reach. The platform's rank-based authority distribution allows founder dependence to decrease as the cohort grows. Cross-stream rabbinic advisors and a fiscal sponsor relationship add structural resilience.

**Token speculation risk.** TMIM has a fixed redemption peg ($0.10/TMIM). No public sale. No DEX listing. Treasury reserves enforce the peg on-chain. There is no speculative narrative to manage.

**Regulatory exposure.** Donations route through a fiscal sponsor 501(c)(3); donors get standard tax receipts. TMIM is structured as an accounting/redemption token, not an investment. Counsel engaged on multi-jurisdictional structure.

**Adoption risk (will the Torah world actually use this?).** The first two publications are the test. They're already in production. The contributor cohort is being recruited. The donors are being approached. We will know in 12 months.

---

## Contact

To explore a donation, partnership, or contribution to the platform — reach out to Ronnie Rendel directly at ronnie.rendel@gmail.com.

The full strategic brief is in [`INTERNAL_STATUS.md`](INTERNAL_STATUS.md). The execution plan is in [`GO_TO_MARKET.md`](GO_TO_MARKET.md). The DAO specification is in [`SPEC_2_DAO_REQUIREMENTS.md`](SPEC_2_DAO_REQUIREMENTS.md). The platform itself is at chayolei.xyz (live testnet) and the codebase is in this repository.

---

*חיילי בית דוד — Soldiers of the House of David.*
*The mission is older than any of us. The platform is meant to outlast the founder.*
*Same mission. New tools.*

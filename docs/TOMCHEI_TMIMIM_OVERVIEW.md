# Tomchei Tmimim — Digital Network for Torah Scholarship and Leadership

> **Economic model changed 2026-10-25:** crypto in, crypto out; no fiat, no fiat on- or off-ramps, no institutional connection (fiscal sponsor, 501(c)(3), tax receipts, payment processors); donations are handled separately, outside the platform; TMIM is minted only for participation. See `CLAUDE.md`. Superseded here: fiat donations converted to TMIM, the supporter donation flow milestone, and a token economy funded by donations.

---

## What This Is

A platform that connects local Torah study groups into a global research and publishing network, governed as a DAO (decentralized autonomous organization) with real token economics.

Students don't just attend classes. They produce original scholarship — papers, seforim, source analyses — and earn crypto tokens for their work. They review each other's output like an academic peer review system. The best students rise through IDF-style ranks based on contribution, and the whole thing is funded by supporters whose donations flow into a transparent on-chain treasury.

The name is **Tomchei Tmimim** — after the yeshiva the Rebbe Rashab founded in 1897. His students were called Chayolei Beis Dovid, soldiers of the House of David. Their mission was to fight the Haskalah (Enlightenment movement) and rising secularism that was tearing apart Jewish life across Russia. They ran underground schools under the Soviets. They kept Judaism alive when it was a death sentence.

Our mission is the same fight in a new era: building soldiers of light who learn Chabad Chassidus, Rav Kook, Gemara, Shulchan Aruch, Kabbalah, and Jewish philosophy — and who become local leaders and global cohorts that bring Torah to their specific communities.

---

## How It Works

**Local groups, global network.** Each city or community runs its own learning groups — chavrutot (study pairs), chaburot (study circles), and shiurim (classes). These local groups connect through the platform to join larger online streams, collaborate on research across locations, and form cross-city study partnerships.

**Courses become research campaigns.** An instructor creates a "mivtza" (campaign) — this could be a standard course with lectures and assignments, a research group investigating a question in Jewish thought, a collaborative book project, or a deep-dive chaburah. The instructor loads source material, sets the research objective, and breaks it into assignments.

**Students produce, not just consume.** Assignments aren't worksheets. They're research papers, chapter drafts, source analyses, and presentations. The top students participate in the research itself — writing sections of seforim, contributing original Torah insights, building source anthologies.

**Peer review drives quality.** Students review each other's work — commenting, rating, suggesting improvements. This isn't busywork; they earn tokens for substantive reviews. The instructor sees both the student's work and the peer reviews before making a final decision. This creates a culture of collaborative scholarship, not isolated homework submission.

**IDF ranks, not honorary titles.** Students progress through Israeli military ranks (Turai through Aluf) based on accumulated tokens and contribution. Rank determines voting power in DAO governance, earning multipliers, and leadership eligibility. A Seren (Captain) has real authority — they can create mivtzaot, approve work, and allocate funds.

---

## The DAO and Token Economics

Every student has a crypto wallet. The platform token is **TMIM** (תמים).

**Earning:** Students earn TMIM for completing tasks, submitting quality work, peer reviewing, participating in discussions, and maintaining learning streaks. All rewards scale with rank.

**Funding:** Crypto in, crypto out. The on-chain treasury holds ETH and USDC and pays out in USDC; there is no fiat in the platform. Donations, if any, are handled separately, outside the platform, and never mint TMIM. TMIM is minted only for participation. Everything is on-chain and transparent.

**Spending:** The DAO treasury funds student work through mivtza allocations. Students can redeem earned TMIM for cash stipends, project funding (printing a sefer, hosting a farbrengen, travel), or chessed initiatives. The community votes on major allocations.

**Governance:** Students vote on which mivtzaot to fund, how to allocate treasury resources, new location proposals, and community projects. Voting power is weighted by rank and token holdings. This isn't a suggestion box — it's on-chain governance with real authority over real funds.

This structure means: the more a student learns, produces, and contributes, the more they earn, the higher they rank, and the more say they have in the direction of the network. Merit is the only currency.

---

## What's Built So Far

Working SvelteKit web application (SvelteKit 2, Svelte 5, Tailwind CSS v4, TypeScript). Hebrew UI, RTL layout. 11 pages implemented with full mock data — dashboard, course boards, assignment management, task kanban, student directory, mashpia review room, farbrengen feed, and user role switching for testing. The design uses a "sacred night" dark aesthetic — deep indigo-black backgrounds lit by gold (Torah fire), sapphire (Chassidus), and emerald (Nigleh) accents.

The codebase is architecturally complete — what remains is the transformation from passive study tracking to the research/publishing/DAO model described above, then Firebase backend integration and actual wallet connectivity.

---

## What Comes Next

**Immediate (platform enhancement):**
- Research group and peer review system
- Multi-location network support
- DAO treasury and token display (UI with mock data)
- IDF rank system replacing yeshiva titles

**Near-term (backend):**
- Firebase integration (auth, Firestore, Cloud Functions)
- Smart contracts on Base (L2 Ethereum) for TMIM token and DAO governance
- Wallet connection (MetaMask / WalletConnect)
- IPFS for document storage and submission proofs

**Medium-term (growth):**
- First 3-4 locations onboarded (Jerusalem, Brooklyn, Melbourne, London)
- Supporter donation flow live
- First collaborative sefer published through the platform
- Chessed project funding through DAO proposals

**Long-term (vision):**
- Network of dozens of locations worldwide
- Published library of original Torah scholarship produced by the network
- Self-sustaining token economy where supporter donations and community growth fund student learning
- Platform for broader Jewish community projects — chessed, kiruv, publishing, events — all governed by the soldiers themselves

---

## Why This Matters

The Rebbe Rashab sent 18 students into a hostile world in 1897 with a simple thesis: if you teach a young man both the revealed and hidden Torah with rigor and discipline, he becomes unbreakable. Those 18 became thousands. They outlasted the Tsar, the Soviets, the Nazis, and 70 years of communist suppression.

The threat today isn't the secret police. It's apathy, assimilation, and a generation of Jews who have access to everything except depth. The internet gives you information but not wisdom. You can watch a shiur on YouTube but you can't form a chavrusa, submit a research paper, have your work reviewed by peers, earn standing in a community, or contribute to a living body of scholarship.

That's what this platform builds. Not another video library. A network of soldiers who produce Torah, hold each other accountable, earn real value for real work, and govern their own community. Local roots, global reach. Ancient texts, modern infrastructure.

The DAO isn't a gimmick — it's the mechanism that makes the whole thing self-sustaining. Supporters fund the treasury. Students earn tokens by producing scholarship. Tokens can be redeemed for real support. The community governs how funds are allocated. No central authority skimming, no opaque bureaucracy. Just soldiers and their mission.

Tomchei Tmimim. Sustainers of the wholesome ones. Same mission, new tools.

# Per-Team Contracts

> Written 2026-10-26. The on-chain side of the new UI: every team gets its own charter, treasury and payouts, as `UX_REDESIGN.md` §10 asks ("per-team treasury, charter and roles, a team factory"). Code: `contracts/contracts/team/`; tests: `contracts/test/Team.test.ts`; deploy: `contracts/scripts/deploy-teams.ts`. The choices marked **assumed** below are pending the owner's confirmation (`DECISIONS.md`).

## 1. What goes on-chain

The app's engine (`src/lib/team/engine.ts`) runs every workflow. The contracts hold the **settled tier** of a team's ledger: whatever moves TMIM or changes who decides what. Everything else is **signed** off-chain and **anchored** in batches.

| Ledger entry (`EntryKind`) | On-chain | Contract call / event |
|---|---|---|
| `team_created` | yes | `TeamFactory.createTeam` → `TeamCreated`, `TeamInitialized` |
| `member_joined` | yes | `Team.join` (invite signed by a member who may admit) → `MemberJoined` |
| `change_opened` (rule / role / money) | yes | `proposeRule`, `proposeRoles`, `proposeTransfer`, `proposeBudget` → `ProposalOpened` |
| `vote_cast` | yes | `vote` → `VoteCast` |
| `change_passed`, `change_failed` | yes | `closeVoting` / last vote / `approve` / `decline` → `ProposalDecided` |
| `rule_changed` | yes | applied on pass → `RuleChanged` (with the new version number) |
| `roles_changed` | yes | applied on pass → `RolesChanged` (to 0: removed from the team) |
| `member_left` | yes | `leave` → `MemberLeft` |
| `money_moved` (from the team account) | yes | applied on pass or approval → `MoneyMoved` |
| `money_moved` (a member puts TMIM in) | yes | a plain TMIM `transfer` to the team's address |
| `budget_set` | yes | applied → `BudgetSet` |
| `accepted_paid` | yes | `acceptAndPay` → `Accepted` + TMIM minted |
| `scheduled_paid` | yes | `payFromBudget` → `Paid` + TMIM minted |
| `released` | yes | `release` → `Released` (content hash) |
| `anchor` | yes | `anchor` → `Anchored` (batch root) |
| `objective_created`, `deliverable_created`, `assigned`, `version_saved`, `review_requested`, `commented`, `reviewed`, `changes_requested`, `task_*`, `objective_lead`, `message` | no: signed | included in the next anchored batch |

App ids map to `bytes32` as `keccak256(utf8(id))`: objectives, deliverables, changes (the proposal `ref`), invites, schedule payments. A version hash is the hash of the accepted version's text; a release's content hash is the hash of the released text.

## 2. Contracts

**`TeamFactory`** (one per platform)
- `createTeam(config)`: clones `Team`, makes the caller its founder. Anyone may start a team (**assumed**, see §4).
- `mintFor(to, amount, reason)`: the only way a team mints TMIM; callable only by teams it created. Enforces, per calendar month (UTC): the team's **platform allowance** (`defaultAllowance` until the platform sets one for the team) and an optional **platform-wide cap**. Holds TMIM's `MINTER_ROLE`.
- Platform settings (`ALLOWANCE_ROLE`): `setAllowance(team)`, `setDefaultAllowance`, `setPlatformMonthlyCap`, `setAnchorer`. An allowance of 0 stops a team's minting: the platform's brake. The platform has no power over a team's account, rules or members.

**`Team`** (one clone per team)
- **Charter.** Up to 16 roles, each a set of permissions (bit order = `Permission` in `types.ts`: take work, review, accept and pay, release, manage the plan, propose, vote, spend, admit). Members hold roles; the founder gets the founder roles, people who join get the joiner roles. Seven rules (`RULE_ORDER`) with a version counter each.
- **Rules change only by vote:** one member, one vote (**assumed**); passes when turnout of eligible voters ≥ `quorum_pct` and *for* > `majority_pct` of *for + against*, decided when every voter has voted or at the deadline (`vote_hours`); the proposer may close early. Same tally as `engine.ts`. Bounds: quorum 0–100, majority 50–99, voting time 1–720 hours (a 100% majority would freeze the charter); the engine enforces the same.
- **Roles change by the same vote:** `proposeRoles(ref, member, roles)` gives a member a new set of roles (role bits in charter order); the empty set removes them from the team. One open role proposal per member. It applies only if the member still holds the roles they held when it was proposed (they may have left, or left and rejoined, meanwhile). Voter and member counts follow.
- **Leaving:** `leave()` by any member. What they were paid stays in their wallet; they can join again with a new invite. Neither leaving nor a role change may leave the team without a member who can vote (`LastVoter`): no decision could ever be taken again. Votes already cast by someone who leaves stay counted, as the app's tally counts them.
- **Money:** a transfer from the team account or a new budget for an objective. Within `spend_limit` (TMIM at stake), a member who may spend and isn't the requester approves or declines; above it, a vote. A transfer fails if the account no longer holds it or its recipient has left the team; a budget can never go below what has been paid from it.
- **Accept and pay:** `acceptAndPay(deliverable, objective, owner, reward, reviewer, versionHash)` by a member who may accept (not the owner) mints the reward to the owner and the charter's review reward to the reviewer, against the objective's budget and within `monthly_issuance_cap`; then the factory checks the platform allowance. Once per deliverable.
- **Scheduled pay:** `payFromBudget(ref, objective, to, amount)` by a member who may spend, once per reference.
- **Team account** = the team contract's TMIM balance. Members put TMIM in with a plain transfer.
- **Release:** the content hash of an accepted deliverable, once.
- **Anchors:** batch *n* of signed entries after batch *n−1*, by a member or the platform's anchoring service.
- **Invites:** EIP-712 `Invite(id, maxUses, expiresAt)` signed by a member who may admit; one link admits up to `maxUses` people until it expires or is revoked. Signatures from smart accounts work (ERC-1271).

**`TeamForwarder`**: OpenZeppelin's ERC-2771 forwarder. A member signs a request; the platform's relayer submits it and pays the network fee; the contract sees the member as the caller. Smart accounts (passkeys, ERC-4337 with a paymaster) can call the contracts directly; both paths work because the contracts read `_msgSender()`.

**`CalendarMonth`**: UTC calendar month of a timestamp (`yyyymm`), so caps on-chain match the app's statements.

## 3. What the chain enforces, and what the app enforces

| Enforced on-chain | Enforced by the app only |
|---|---|
| Who may accept, release, spend, propose, vote, admit (charter roles) | That the acceptor is the deliverable's **named** approver, and the reviewer its named reviewer |
| Budget left (budget − paid), the team's monthly cap, the platform allowance | "Committed" rewards of work in progress (the app's budget meter is stricter) |
| One acceptance per deliverable; one payment per schedule reference | That a review happened before acceptance; that a schedule is due |
| Votes, quorum, majority, deadlines; rule values in range | Drafts, versions, comments, tasks (signed, then anchored) |
| Who holds which roles; leaving; never without a voter | What happens to a leaver's work: their unfinished deliverables reopen, reviews and approvals fall back to the objective's lead, their scheduled pay stops; a lead who left is replaced by `takeLead` (signed) |

The approver attests to the off-chain facts by signing the acceptance; the anchored batches make the off-chain record tamper-evident.

## 4. Decisions taken here

1. **A factory of our own contracts, not Safe modules** (open question `UX_REDESIGN.md` §13.1). One code base that mirrors the engine rule for rule; votes, budgets and caps live in one contract instead of a Safe plus modules plus a voting app. A Safe can still be a member (ERC-1271 signatures, direct calls).
2. **One member, one vote** for team decisions, as the merged UI does. The global `ChayoleiGovernance` (TMIM × rank weighting) is untouched and still serves the classic app. If the owner prefers weighted votes, `_decide` is the one place to change.
3. **Anyone may start a team; minting needs an allowance.** Separates "who can start a team" (brief §13.5) from the safety of the one coin: with `defaultAllowance = 0` the platform approves each team's minting; with a positive default, new teams can pay out at once up to it.
4. **Sponsored fees through an ERC-2771 forwarder now**; passkey smart accounts later without contract changes.
5. **Not upgradeable.** Clones of a fixed implementation; a new version means a new factory, and teams move by choice.

## 5. Platform powers and limits (claims we can make)

- The platform can **stop or limit a team's minting** (allowance) and run the anchoring service. It **cannot** move a team's TMIM, change its rules or members, or vote.
- **Caveat until the TMIM token is redeployed:** `TMIMToken` gives its admin a `BURNER_ROLE` that can burn TMIM from any address, a team's included. It exists for redemption, which is on hold. The redeploy should revoke it (or drop `burn(from)`), and move the token's admin to a multisig (audit L-3). Until then, don't claim teams fully control their treasury (brief §10).
- `MasimaRewardsV2` and `MINT_TOKENS` governance proposals still mint directly, outside any cap. Retire them for team work once teams are live; `GovernanceTreasury.maxMonthlyMint` is superseded for team minting by the factory's caps.

## 6. Deploying

```bash
cd contracts
TEAM_DEFAULT_ALLOWANCE=0 TEAM_ANCHORER=0x… TEAM_FACTORY_ADMIN=0x<multisig> \
  npx hardhat run scripts/deploy-teams.ts --network baseSepolia
```

Needs `deployments/<network>.json` with `TMIMToken`, and the deployer holding TMIM's admin role (to grant `MINTER_ROLE` to the factory). Writes `TeamForwarder`, `TeamImplementation`, `TeamFactory` and the start block back to that file and prints the `.env` lines. Set `TEAM_ANCHORER` to the app's relayer address, and give the app the addresses and the relayer's key (`.env.example`, "Team contracts"). Tried end to end on a local node, with the app recording on it (`scripts/e2e/run-chain.sh`, 2026-10-26); not yet on Base Sepolia.

## 7. Tests

`npx hardhat test test/Team.test.ts`: 38 tests. Starting a team (roles, re-initialization, invalid charters, UTC months); joining (invite uses, expiry, revocation, forged terms, members without admit); accept and pay (owner and reviewer paid, permissions, once only, budget, team cap and month rollover, platform allowance and cap, release, scheduled pay); rule votes (pass, quorum, majority, vote changes, one open per rule, bounds); money (role approval, vote above the limit, team account in and out, insufficient account, budget floor, decline); roles by vote (new roles and counts, removal and rejoining, invalid changes, one open per member, leaving, never without a voter, a change overtaken by leaving, a transfer to someone who left); anchors; sponsored calls through the forwarder (team created and vote cast for the signer, who pays nothing).

## 8. Not yet

- **Changing the roles themselves** (a new role, or what a role may do) by vote: the charter's role definitions are fixed at founding. Who holds which role changes by vote (§2).
- **AI members** stay off-chain: they propose through change cards that people accept (`UX_REDESIGN.md` §8).
- **External audit** before mainnet.

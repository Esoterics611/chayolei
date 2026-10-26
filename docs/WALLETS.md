# Passkeys and sponsored fees

> 2026-10-26. Phase 7 of `UX_REDESIGN.md` is accepted when a new member creates a team, invites someone and pays a first deliverable in TMIM **without seeing a seed phrase or a fee**. This says what holds today, what stands in the way, the options, a recommendation, and what each needs from the owner (`DECISIONS.md` #11, #12). Nothing in §3 to §5 is built yet.

## 1. Where we are

| | Today | Seed phrase or fee? |
|---|---|---|
| Sign in | The wallet signs a one-time message; the server recovers the address from the signature (`ecrecover`) | Depends on the wallet: extension wallets come with a seed phrase |
| Start a team, join, vote, request and approve money, accept and pay, release, scheduled pay | The member signs an EIP-712 request; the platform's relayer submits it through `TeamForwarder` and pays the network fee | No fee |
| Versions, drafts, comments, tasks, plan, threads | No transaction (the signed tier, anchored in batches by the relayer) | No fee |
| Add TMIM to the team account | The member's own TMIM transfer, checked by its receipt | **The member pays the fee** (needs ETH on Base) |

So: fees remain only for contributions; the seed phrase is a matter of which wallet members use.

## 2. What stands in the way of passkeys

- A passkey wallet on Base is a **smart contract account** (Coinbase Smart Wallet and other ERC-4337 accounts). Its signatures are checked by asking the account (ERC-1271). Until its first transaction the account isn't deployed, so its signatures carry the instructions to deploy it (ERC-6492).
- Sign-in uses `ecrecover`, and `TeamForwarder` (OpenZeppelin's `ERC2771Forwarder`) accepts only key signatures: both refuse a smart account.
- Because the platform pays for everything, a member's account may never send a transaction of its own and so never be deployed: the ERC-6492 case is the normal one, not an edge case.

## 3. Options

**A. Passkey smart accounts that call the contracts themselves, with a paymaster paying the fee.** The wallet sends the call (`wallet_sendCalls`, EIP-5792) with a paymaster service (ERC-7677) that sponsors it. This is the plan of record (`UX_REDESIGN.md` §10; `TEAM_CONTRACTS.md` §4.4: no contract changes, since the contracts read `_msgSender()`). It also makes contributions free: the member's account sends the TMIM transfer and the paymaster pays. Later it allows sub accounts and spend permissions for routine actions. It needs:
1. Sign-in that checks ERC-1271 and ERC-6492 signatures (one read call to the chain at sign-in).
2. A paymaster: a provider's (Coinbase Developer Platform and others; an account, an API key, its terms), or our own ERC-7677 endpoint with a verifying paymaster contract funded in ETH (more to build and audit).
3. A server flow for settled actions that checks the member's own transaction by its receipt and the team's events (as contributions are checked now), instead of relaying a signed request; actions on one team still recorded in chain order.
4. A passkey wallet offered in the browser beside extension wallets, loaded only in the live app.

**B. Passkey smart accounts through our relayer.** `TeamForwarder` accepts ERC-1271 signatures (overriding `_validate` with `SignatureChecker`), and the relayer first deploys an undeployed account from its ERC-6492 data. Keeps today's flow (prepare → sign → relay) and fee model, with no outside service. Needs a forwarder change and an audit pass before the team contracts are deployed, sign-in as in A.1, and, for fee-free contributions, `permit` on TMIM (§4).

**C. Embedded wallets from a provider** (email or passkey sign-in; the provider holds key shares). Fastest to ship and works with today's checks, but an outside company holds part of every member's key and knows who they are, which sits badly with a team that needs no institution.

**D. Keys derived from a passkey in the browser** (WebAuthn PRF). Works with today's checks and needs no outside service, but the raw key sits in page memory while the app is open (one injected script could take it for good), and device support varies. Not recommended for money.

**Recommendation: A**, as planned, with a provider's paymaster to start (the smallest build) and our own paymaster as a later option. **B** if the owner wants no outside paymaster at all.

## 4. Fee-free contributions without a smart account

For members who keep an extension wallet: add ERC-2612 `permit` to TMIM at its redeploy (OpenZeppelin's `ERC20Permit`) and a `Team.contribute(amount, deadline, signature)` that takes the permitted TMIM, relayed like any settled action. TMIM is in the audit package (`contracts/audit`), so this belongs with the redeploy that carries fixes L-1, L-2 and M-2.

## 5. What it needs from the owner

1. **The wallet strategy** (`DECISIONS.md` #11): A, B, C or D.
2. **`permit` on TMIM** at the redeploy (`DECISIONS.md` #12).
3. For A: a paymaster account with a provider, or a decision to run our own. For C: a provider account.
4. An audit pass over whichever contract changes follow (B's forwarder, §4's token and `Team.contribute`).

## 6. How it would be tested

- ERC-1271 and ERC-6492: Hardhat tests with a minimal smart account and a factory that deploys it on demand; the browser test's simulated wallet gains a smart-account mode.
- Passkeys: Chromium's virtual authenticator where the wallet lets a page drive the prompt. A hosted wallet's own pop-up can't be driven in CI, so that step is checked by hand on Base Sepolia.

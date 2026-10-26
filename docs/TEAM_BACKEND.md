# Teams Backend

> Written 2026-10-26. How the new UI runs for real: teams in Firestore, written only by the server, which runs the same engine as the demo, and, with a chain configured, recorded on each team's own contract. Read `UX_TECH_DESIGN.md` first (the domain and the screens) and `TEAM_CONTRACTS.md` (the on-chain side). Code: `src/lib/team/{commands,persist,live}.ts`, `src/lib/team/store.svelte.ts`, `src/lib/server/teams.ts`, `src/routes/api/{teams,invites}`.

## 1. Two backends, one engine

| | Demo (default) | Live app |
|---|---|---|
| Switch | `VITE_TEAM_BACKEND` unset | `VITE_TEAM_BACKEND=firestore` |
| Teams | sample teams in the browser (`localStorage`) | the signed-in member's teams in Firestore |
| Who acts | any member ("Acting as") | the signed-in member |
| Actions | applied in the browser | sent to the server, applied there |
| Proofs | stand-ins, marked as demo values | real when the chain confirms; until then shown as pending |

Screens don't know which one runs. They send a **Command** (`commands.ts`: every member action as plain data) to `store.do(command)`; the store applies it locally (demo) or posts it to the server (live). Both paths end in `applyCommand`, which checks the shape of the input and calls the engine, which checks the charter.

## 2. How a team is stored (`persist.ts`)

```
teams/{teamId}                  core: name, purpose, members, charter, objectives,
                                deliverables (without versions), tasks, changes,
                                treasury, live: true, memberUids, ledgerCount, updatedAt
teams/{teamId}/ledger/{seq}     one entry per doc; id = seq zero-padded to 8 digits
teams/{teamId}/messages/{id}    thread messages
teams/{teamId}/versions/{id}    versions and drafts, with deliverableId
teamInvites/{token}             invite links (server only)
```

A member's id **is** their sign-in uid (`wallet_<address>`), so the access rules compare ids with `request.auth.uid` directly.

## 3. The server (`src/lib/server/teams.ts`)

- **One transaction per action:** read the core and its three subcollections, rebuild the `Team`, apply the command as the signed-in member, write back the core and what changed (new ledger entries and messages, changed or removed versions). Ledger docs are written with `create()`, and every action rewrites the core, so concurrent actions serialize on the core document and can never both take the same `seq` (tested with five concurrent writers).
- **Who may do what** is the engine's job (the charter); `applyCommand` checks the data first: types, lengths (`LIMITS`), member ids, dates, known rule keys and vote choices.
- **Refusals** come back as `422 { error: { key, vars } }` (403 for non-members, 404 for unknown teams and dead invites); the browser shows the message key in the member's language.
- **What a member receives:** the team with other members' drafts removed (`viewFor`).

| Endpoint | Does |
|---|---|
| `POST /api/teams` `{ name, purpose, templateId, you: { name } }` | start a team; the caller is the founder |
| `POST /api/teams/[id]/commands` `{ command }` | one action; returns `{ result, team }` |
| `POST /api/teams/[id]/invites` | a join link (needs the *admit* permission); 14 days, 25 uses |
| `GET /api/invites/[token]` | what the link shows before sign-in: name, purpose, roles, rules, member count |
| `POST /api/invites/[token]/accept` `{ name }` | join with the charter's joiner role; opening it again is harmless |

All but the invite preview need `Authorization: Bearer <Firebase ID token>`.

## 4. The browser (`live.ts`, `store.svelte.ts`)

- **Sign-in:** the wallet signs a one-time nonce (`/api/auth/nonce`, `/api/auth/verify`, as the classic app does) and gets a Firebase session; uid `wallet_<address>`.
- **Listeners:** the member's teams (`memberUids array-contains uid`), and for the active team its ledger, messages, saved versions and the member's own drafts. The active team is shown only when its ledger has caught up with the core's `ledgerCount`, so figures never disagree mid-update; until then the last consistent state stays on screen.
- **Replies win ties:** after an action the store puts the server's reply in place at once (so a screen can open what was just created) and ignores listener snapshots older than it.
- **The shell** shows a gate until a team is open: loading, *Sign in with your wallet*, or *Start a team*. `/start` and `/join/[token]` work without a team.

## 5. Access rules (`firestore.rules`)

Members read their team, its ledger and messages; saved versions are readable by members, drafts only by their author; no browser writes anything; invite tokens are server-only. Tested with `@firebase/rules-unit-testing` (`src/lib/server/firestore-rules.test.ts`).

## 6. On-chain teams: the chain bridge

With `TEAM_FACTORY_ADDRESS`, `TEAM_FORWARDER_ADDRESS`, `VITE_TMIM_TOKEN_ADDRESS` and `TEAM_RELAYER_PRIVATE_KEY` set (`.env.example`), every new team is created on-chain and records its settled actions on its own `Team` contract (`TEAM_CONTRACTS.md`). Code: `src/lib/team/chain.ts` (which commands settle, the exact call each makes, the charter as the contract's config) and `src/lib/server/team-chain.ts` (relaying, checks, anchors).

**A settled action** (propose a rule or money change, vote, close a vote, approve or decline, accept and pay, release, scheduled pay):
1. The browser asks `POST /api/teams/[id]/prepare`; the server checks the action with the engine and returns the exact ERC-2771 forward request (`from` = the member's wallet, `to` = the team's contract, the call, a nonce and a 15-minute deadline). A new proposal's id is chosen here, since the contract keys proposals by it.
2. The member's wallet signs it (EIP-712); the browser sends the command and the signature to `/commands`.
3. Under the team's lock (one recorded action at a time, so the chain and the ledger agree on order) the server rechecks the action, checks that the signed request is exactly the expected call signed by that member, simulates it to surface the contract's own reason for a refusal, and the relayer submits it, paying the fee.
4. Only once it is mined does the server apply the action, with the transaction hash and block as the proof of every settled entry it adds.

**Other on-chain moments:** starting a team (`/api/teams/prepare`, `TeamFactory.createTeam` signed by the founder); an invite (the inviter's wallet signs the EIP-712 invite, which `Team.join` checks); joining (`/api/invites/[token]/prepare`, `Team.join` signed by the person joining); a contribution (the member's wallet sends TMIM to the team's contract; the server checks the receipt and counts each transfer once); anchors (after an action fills a batch of 8 signed entries, the relayer, as the factory's anchoring service, records the batch's root, `chain.ts` `batchRoot`).

**Ledger proofs.** A live team never gets the demo's stand-in proofs. A settled entry shows *To settle on-chain* until its transaction is recorded in `proof.tx`/`proof.block`, then *Settled on-chain*, linked to the block explorer; a signed entry shows *Recorded, to anchor* until its batch's anchor is confirmed. Teams started before a chain was configured stay off-chain, and their settled entries keep waiting.

**Trust.** The relayer can't act for a member: the contract sees only what the member signed, and the server checks each request against the action. It can refuse to relay, and it anchors signed entries, which the server records under the signed-in member (not yet signed by them one by one). The platform can stop a team's minting (`TeamFactory` allowance), nothing else.

## 7. Running it

```bash
# Unit tests (engine, diff, dictionaries)
npm run test:unit
# Everything, against the Firestore emulator (team service, access rules, votes)
npm test
# The chain bridge on a local Hardhat node (also in CI)
bash scripts/e2e/run-chain.sh
# Browser tests (Playwright with Chromium available to Node)
bash scripts/e2e/run-live.sh          # emulators + dev server in live mode, two simulated wallets
E2E=1 bash scripts/e2e/run-chain.sh   # the same, recording on a local chain
bash scripts/e2e/run-demo.sh          # the static demo
```

Local live app: start the emulators (`npx firebase emulators:start --only firestore,auth --project demo-chayolei`) and run `vite dev` with the variables `run-live.sh` sets (`VITE_TEAM_BACKEND=firestore`, `VITE_FIREBASE_EMULATORS=1`, the emulator hosts). Against a real project, set the Firebase variables in `.env` and `VITE_TEAM_BACKEND=firestore`.

## 8. Limits and next steps

- **Size:** each action reads the whole team. Comfortable for a small team's first years (thousands of entries); later, keep running balances on the core and read only recent entries. The core document (changes with their comments) stays far below Firestore's 1 MB for small teams; very long comment threads would move to a subcollection.
- **One relayer per server instance:** the relayer counts its own nonces in memory, so run one instance per relayer key (or one relayer service).
- **Reconciliation:** the app records what happens through it. A call made straight to a team's contract (not through the app) lands on-chain but not in the ledger; a listener that reconciles the two is still to come.
- **Not yet:** passkey sign-in and sponsored fees for contributions (members' own transfers pay their fee), notifications, rate limits on starting teams and on invites, and moving the classic app's campaigns and assignments into teams (new teams start fresh).

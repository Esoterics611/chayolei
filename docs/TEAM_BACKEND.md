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

**Leaving.** Someone who leaves (or is removed by a role change to no roles) stays in `members`, with `leftAt` and no roles, so the record still names them; `memberUids` lists only people on the team now, so they lose read access at once. A new invite brings them back as the same member, with the joiner roles.

## 3. The server (`src/lib/server/teams.ts`)

- **One transaction per action:** read the core and its three subcollections, rebuild the `Team`, apply the command as the signed-in member, write back the core and what changed (new ledger entries and messages, changed or removed versions). Ledger docs are written with `create()`, and every action rewrites the core, so concurrent actions serialize on the core document and can never both take the same `seq` (tested with five concurrent writers).
- **Who may do what** is the engine's job (the charter); `applyCommand` checks the data first: types, lengths (`LIMITS`), member ids, dates, known rule keys and vote choices.
- **Refusals** come back as `422 { error: { key, vars } }` (403 for non-members, 404 for unknown teams and dead invites); the browser shows the message key in the member's language.
- **What a member receives:** the team with other members' drafts removed (`viewFor`).
- **Only people on the team act:** `requireMember` refuses someone who has left (403), whatever their old roles.
- **Rate limits** (`rate-limit.ts`) on what costs the platform, per UTC day: teams started per account (3) and for the whole platform (200), invite links per team (20), people admitted per team (50; opening a link again doesn't count). Checked when preparing, so nobody signs only to be refused, and counted when acting; refused with 429 and a message saying when to try again. Set with `TEAM_STARTS_PER_ACCOUNT_DAY`, `TEAM_STARTS_PLATFORM_DAY`, `TEAM_INVITES_PER_TEAM_DAY`, `TEAM_JOINS_PER_TEAM_DAY`.

| Endpoint | Does |
|---|---|
| `POST /api/teams` `{ name, purpose, templateId, you: { name } }` | start a team; the caller is the founder |
| `POST /api/teams/[id]/commands` `{ command }` | one action; returns `{ result, team }` |
| `POST /api/teams/[id]/invites` | a join link (needs the *admit* permission); 14 days, 25 uses |
| `GET /api/invites/[token]` | what the link shows before sign-in: name, purpose, roles, rules, member count |
| `POST /api/invites/[token]/accept` `{ name }` | join with the charter's joiner role; opening it again is harmless |
| `POST /api/teams/[id]/plan` `{ objectiveId, locale }` | the AI planner's suggested breakdown of an objective (§6a); writes nothing |

All but the invite preview need `Authorization: Bearer <Firebase ID token>`.

## 4. The browser (`live.ts`, `store.svelte.ts`)

- **Sign-in:** the wallet signs a one-time nonce (`/api/auth/nonce`, `/api/auth/verify`, as the classic app does) and gets a Firebase session; uid `wallet_<address>`.
- **Listeners:** the member's teams (`memberUids array-contains uid`), and for the active team its ledger, messages, saved versions and the member's own drafts. The active team is shown only when its ledger has caught up with the core's `ledgerCount`, so figures never disagree mid-update; until then the last consistent state stays on screen.
- **Replies win ties:** after an action the store puts the server's reply in place at once (so a screen can open what was just created) and ignores listener snapshots older than it.
- **Leaving** drops the team from the store at once and opens the member's next team (or the gate); the access rules then stop its listeners.
- **The shell** shows a gate until a team is open: loading, *Sign in with your wallet*, or *Start a team*. `/start` and `/join/[token]` work without a team.

## 5. Access rules (`firestore.rules`)

Members read their team, its ledger and messages; saved versions are readable by members, drafts only by their author; no browser writes anything; invite tokens are server-only. Tested with `@firebase/rules-unit-testing` (`src/lib/server/firestore-rules.test.ts`).

## 6. On-chain teams: the chain bridge

With `TEAM_FACTORY_ADDRESS`, `TEAM_FORWARDER_ADDRESS`, `VITE_TMIM_TOKEN_ADDRESS` and `TEAM_RELAYER_PRIVATE_KEY` set (`.env.example`), every new team is created on-chain and records its settled actions on its own `Team` contract (`TEAM_CONTRACTS.md`). Code: `src/lib/team/chain.ts` (which commands settle, the exact call each makes, the charter as the contract's config) and `src/lib/server/team-chain.ts` (relaying, checks, anchors).

**A settled action** (propose a rule, role or money change, vote, close a vote, approve or decline, accept and pay, release, scheduled pay, leave the team):
1. The browser asks `POST /api/teams/[id]/prepare`; the server checks the action with the engine and returns the exact ERC-2771 forward request (`from` = the member's wallet, `to` = the team's contract, the call, a nonce and a 15-minute deadline). A new proposal's id is chosen here, since the contract keys proposals by it.
2. The member's wallet signs it (EIP-712); the browser sends the command and the signature to `/commands`.
3. Under the team's lock (one recorded action at a time, so the chain and the ledger agree on order) the server rechecks the action, checks that the signed request is exactly the expected call signed by that member, simulates it to surface the contract's own reason for a refusal, and the relayer submits it, paying the fee.
4. Only once it is mined does the server apply the action, with the transaction hash and block as the proof of every settled entry it adds.

**Other on-chain moments:** starting a team (`/api/teams/prepare`, `TeamFactory.createTeam` signed by the founder); an invite (the inviter's wallet signs the EIP-712 invite, which `Team.join` checks); joining (`/api/invites/[token]/prepare`, `Team.join` signed by the person joining); a contribution (the member's wallet sends TMIM to the team's contract; the server checks the receipt and counts each transfer once); anchors (after an action fills a batch of 8 signed entries, the relayer, as the factory's anchoring service, records the batch's root, `chain.ts` `batchRoot`).

**Ledger proofs.** A live team never gets the demo's stand-in proofs. A settled entry shows *To settle on-chain* until its transaction is recorded in `proof.tx`/`proof.block`, then *Settled on-chain*, linked to the block explorer; a signed entry shows *Recorded, to anchor* until its batch's anchor is confirmed. Teams started before a chain was configured stay off-chain, and their settled entries keep waiting.

**Trust.** The relayer can't act for a member: the contract sees only what the member signed, and the server checks each request against the action. It can refuse to relay, and it anchors signed entries, which the server records under the signed-in member (not yet signed by them one by one). The platform can stop a team's minting (`TeamFactory` allowance), nothing else.

## 6a. The AI planner (`src/lib/server/planner.ts`)

The planner suggests how to break an objective into deliverables and tasks (`UX_REDESIGN.md` §8, phase 9). It only suggests:

1. A member who may change the plan (*manage_plan*) opens **Suggest deliverables** on an objective. The dialog says what will be sent before anything is.
2. The server checks the member, counts the request against the team's daily allowance (`AI_DAILY`, 40; kept in `teams/{id}/system/ai`, which no browser can read), and asks Claude (`claude-opus-5-5`, or `TEAM_AI_MODEL`) for structured output in the shape of `PLAN_SCHEMA`. A request the model declines is retried server-side on the model Anthropic recommends (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`); if every model declines, the member is told so.
3. The answer is checked and trimmed (`readPlan`: at most 8 deliverables of 6 tasks, titles and scopes cut to length) and returned. **Nothing is written.**
4. The member edits it (drops, renames, re-prices, adds or removes tasks) and adds what they keep with one `addPlan` command, checked by the engine like any other action. Each deliverable and task it adds carries `assist: 'planner'`, and so does its ledger entry: the plan, the deliverable's header, its credits and the ledger all say *AI-assisted*.

**What Claude is shown** (`plannerPrompt`): the team's name and purpose; the objective's title, description, due date and budget left; the team's standard deliverable reward; the objective's existing deliverables (title, scope, reward, stage). Never members, wallets, documents, comments or threads. The team's texts are framed as material to plan, not as instructions.

**Configuration:** `ANTHROPIC_API_KEY` (a secret; without it the planner answers *isn't set up on this server*, 503) and optionally `TEAM_AI_MODEL`. Refusals map to keys the UI explains: `err.ai.unavailable` (503), `err.ai.busy` and `err.ai.limit` (429), `err.ai.failed` (502), `err.ai.declined` (422). The demo calls no AI: it shows a fixed sample breakdown, labelled as one.

## 6b. Reconciliation: actions taken on the contract directly

Members can call their team's contract without the app: a block explorer, their own wallet. The chain is authoritative for the settled tier, so a poller in the server process (`src/lib/server/team-reconciler.ts`, started in `hooks.server.ts` like the classic governance listener) reads every on-chain team's events, and TMIM transfers into teams, from a checkpoint (`system/teamReconciler.lastBlock`; first start: `TEAM_START_BLOCK`), and records each transaction the team's ledger doesn't hold yet (`src/lib/team/reconcile.ts`):

- **Already recorded** (its hash is a ledger proof): skipped, so replaying a range is harmless. The app's own actions are recorded by the app, with what it knows about them: the poller waits `TEAM_RECONCILE_DELAY_SECONDS` (120) after a block, and works under the team's lock.
- **Through the engine** as the member who sent it (through the forwarder too): votes, closes, approvals and declines, leaving, joining (the app then knows only the address), releases, acceptances.
- **As the contract recorded it** where the engine disagrees: the decision the contract took (`settleDecision`, without tallying again), an acceptance the app thought premature (paid as the event says), scheduled pay, a proposal opened on the contract (added under a new id that keeps its contract ref, so later votes through the app reach the same proposal).
- **TMIM sent to the team's address** by anyone: into the team account; a member's counts as their contribution. If the member then records the same transfer in the app, it counts once.
- **Anything it can't match** gets a `chain_noted` entry, so the team sees it.

Entries recorded this way carry `data.via = 'chain'`; the ledger says *Done on the team's contract outside the app*. Tested in `reconcile.test.ts` and on a local chain (`team-chain.test.ts`: a vote and a transfer sent straight to the contract).

## 7. Running it

```bash
# Unit tests (engine, diff, dictionaries)
npm run test:unit
# Everything, against the Firestore emulator (team service, access rules, votes)
npm test
# The chain bridge on a local Hardhat node (also in CI)
bash scripts/e2e/run-chain.sh
# Browser tests (Playwright with Chromium available to Node)
bash scripts/e2e/run-live.sh          # emulators + dev server in live mode, two simulated wallets, a stand-in for Claude
E2E=1 bash scripts/e2e/run-chain.sh   # the same, recording on a local chain
bash scripts/e2e/run-demo.sh          # the static demo
```

Local live app: start the emulators (`npx firebase emulators:start --only firestore,auth --project demo-chayolei`) and run `vite dev` with the variables `run-live.sh` sets (`VITE_TEAM_BACKEND=firestore`, `VITE_FIREBASE_EMULATORS=1`, the emulator hosts). Against a real project, set the Firebase variables in `.env` and `VITE_TEAM_BACKEND=firestore`.

## 8. Limits and next steps

- **Size:** each action reads the whole team. Comfortable for a small team's first years (thousands of entries); later, keep running balances on the core and read only recent entries. The core document (changes with their comments) stays far below Firestore's 1 MB for small teams; very long comment threads would move to a subcollection.
- **One relayer per server instance:** the relayer counts its own nonces in memory, so run one instance per relayer key (or one relayer service).
- **Reconciliation** (§6b) needs a long-running server instance, as the classic governance listener does; on a serverless deploy, call `reconcileTeams()` from a scheduled job instead.
- **Not yet:** passkey sign-in and sponsored fees for contributions (members' own transfers pay their fee), push notifications, and moving the classic app's campaigns and assignments into teams (new teams start fresh).

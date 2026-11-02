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

## 6a. The AI helpers: the planner (`src/lib/server/planner.ts`) and the others

The planner suggests how to break an objective into deliverables and tasks (`UX_REDESIGN.md` §8, phase 9). It only suggests:

1. A member who may change the plan (*manage_plan*) opens **Suggest deliverables** on an objective. The dialog says what will be sent before anything is.
2. The server checks the member, counts the request against the team's daily allowance (`AI_DAILY`, 40; kept in `teams/{id}/system/ai`, which no browser can read), and asks Claude (`claude-opus-5-5`, or `TEAM_AI_MODEL`) for structured output in the shape of `PLAN_SCHEMA`. A request the model declines is retried server-side on the model Anthropic recommends (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`); if every model declines, the member is told so.
3. The answer is checked and trimmed (`readPlan`: at most 8 deliverables of 6 tasks, titles and scopes cut to length) and returned. **Nothing is written.**
4. The member edits it (drops, renames, re-prices, adds or removes tasks) and adds what they keep with one `addPlan` command, checked by the engine like any other action. Each deliverable and task it adds carries `assist: 'planner'`, and so does its ledger entry: the plan, the deliverable's header, its credits and the ledger all say *AI-assisted*.

**What Claude is shown** (`plannerPrompt`): the team's name and purpose; the objective's title, description, due date and budget left; the team's standard deliverable reward; the objective's existing deliverables (title, scope, reward, stage). Never members, wallets, documents, comments or threads. The team's texts are framed as material to plan, not as instructions.

**Configuration:** `ANTHROPIC_API_KEY` (a secret; without it the planner answers *isn't set up on this server*, 503) and optionally `TEAM_AI_MODEL`. Refusals map to keys the UI explains: `err.ai.unavailable` (503), `err.ai.busy` and `err.ai.limit` (429), `err.ai.failed` (502), `err.ai.declined` (422). The demo calls no AI: it shows a fixed sample breakdown, labelled as one.

**The other helpers** (`src/lib/team/helpers.ts`, `src/lib/server/helpers.ts`, `POST /api/teams/[id]/helpers` `{ helper, …, locale }`) work the same way: only when a member asks, the dialog says what will be sent first, nothing is written, the team's daily allowance is shared by all four, and what a member keeps is posted with an ordinary command, marked AI-assisted (`assist` on the comment or message and on its ledger entry). All share one client, request shape and error mapping (`src/lib/server/ai.ts`).

| Helper | Who may ask | What Claude is shown | What the member keeps |
|---|---|---|---|
| **First-pass reviewer** (a review round) | the round's reviewer or approver, while it is open or reviewed | the deliverable's title and scope, its objective's title, the version up for review and the one before it. No names, comments, threads or wallets | notes anchored to paragraphs (`readReview`: at most 8), edited, added as comments (`assist: 'reviewer'`). The review and the decision stay theirs |
| **Summarizer** (a deliverable's or a proposal's thread, 3 messages or more) | any member | the thread's subject and messages, people as labels P1, P2… in order of appearance (`summaryPrompt`); the server turns labels back into first names after the answer. No wallets, documents or other threads | a summary, what was decided, what is open; posted to the thread if they choose (`assist: 'summarizer'`) |
| **Source finder** (a deliverable not yet accepted) | its owner, or a member who may change the plan | the team's purpose, the objective's title, the deliverable's title and scope; Claude searches the web with them (`web_search_20260209`, up to 5 searches) | sources (`askCited`: only results the search returned and the answer cites, at most 6, web links only), posted to the thread (`assist: 'sources'`); thread links are clickable |

Structured output can't be combined with citations, so the source finder reads its sources from the answer's citations instead of a JSON schema; a paused search is sent back to finish. Tested with stand-ins for Claude (`helpers.test.ts`, `src/lib/server/helpers.test.ts`).

## 6b. Reconciliation: actions taken on the contract directly

Members can call their team's contract without the app: a block explorer, their own wallet. The chain is authoritative for the settled tier, so a poller in the server process (`src/lib/server/team-reconciler.ts`, started in `hooks.server.ts` like the classic governance listener) reads every on-chain team's events, and TMIM transfers into teams, from a checkpoint (`system/teamReconciler.lastBlock`; first start: `TEAM_START_BLOCK`), and records each transaction the team's ledger doesn't hold yet (`src/lib/team/reconcile.ts`):

- **Already recorded** (its hash is a ledger proof): skipped, so replaying a range is harmless. The app's own actions are recorded by the app, with what it knows about them: the poller waits `TEAM_RECONCILE_DELAY_SECONDS` (120) after a block, and works under the team's lock.
- **Through the engine** as the member who sent it (through the forwarder too): votes, closes, approvals and declines, leaving, joining (the app then knows only the address), releases, acceptances.
- **As the contract recorded it** where the engine disagrees: the decision the contract took (`settleDecision`, without tallying again), an acceptance the app thought premature (paid as the event says), scheduled pay, a proposal opened on the contract (added under a new id that keeps its contract ref, so later votes through the app reach the same proposal).
- **TMIM sent to the team's address** by anyone: into the team account; a member's counts as their contribution. If the member then records the same transfer in the app, it counts once.
- **Anything it can't match** gets a `chain_noted` entry, so the team sees it.

Entries recorded this way carry `data.via = 'chain'`; the ledger says *Done on the team's contract outside the app*. Tested in `reconcile.test.ts` and on a local chain (`team-chain.test.ts`: a vote and a transfer sent straight to the contract).

## 6c. Push to members' devices (`src/lib/server/push.ts`)

Push is for what blocks someone or is about to expire (`UX_REDESIGN.md` phase 8), so a member can close Chayolei and still hear about it; everything else stays in the bell.

- **What is sent** (`src/lib/team/push.ts`, `pushItems`): a review waiting on you, an acceptance waiting on you, changes requested on your work, a request waiting for your approval, an objective of yours left without a lead; and, a day before it closes, a vote you haven't cast (urgent). Not news, stalls of your own, or scheduled pay. Text in each device's language, the team's name as the title, a link to the screen that clears it.
- **Once each:** every item has a key, kept per member in `teams/{id}/system/push` while it waits; a transaction claims new keys before anything is sent, so two servers never send it twice. A new review round is a new key.
- **When:** after every action through the app (the commands route) and every reconciled transaction, the server looks at what now waits on whom; a sweep every 10 minutes looks at teams whose next vote closes within a day (`closesSoonest` on the core).
- **Devices:** a member turns push on per device from the bell (permission, the service worker `src/service-worker.ts`, a subscription sent to `POST /api/push`), and off again (`DELETE /api/push`); at most 10 devices. Subscriptions are server-only (`pushSubscriptions`); one the push service no longer knows (404/410) is deleted. The service worker caches nothing: it shows notifications and opens their link. The demo has no push server; it keeps the in-app reminder.
- **Configuration:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (a secret), `VAPID_SUBJECT`; without them push is off and the bell doesn't offer it.

Tested: `push.test.ts` (what is sent, keys, languages), `src/lib/server/push.test.ts` on the emulator (subscribing, sending once, forgetting dead devices, the vote sweep) and `scripts/e2e/run-push-sw.sh` (Chromium shows a message delivered to the service worker).

## 6d. Bringing in the classic app's campaigns (`src/lib/server/classic-import.ts`)

Teams started fresh; the classic app's work (campaigns → assignments → tasks, `src/routes/(classic)`) can now come into a team, one campaign at a time:

- **Who and what:** a member who may change the team's plan sees the classic campaigns they started or joined (`GET /api/teams/[id]/classic`) and brings one in (`POST … { mivtzaId }`), from **Bring in a campaign** in Plan (live app only).
- **How it maps** (`src/lib/team/classic.ts`): the campaign becomes an objective (title, description, due date), led by the member who brings it in. Its **unfinished** assignments become deliverables (title, description as the scope with a link to the work so far, the assignment's TMIM reward or the team's standard one, due date), each with its tasks (done when approved there). Whoever held an assignment keeps it, and its reviewer stays, **if they are on the team** and their role allows it; otherwise it opens for the team. **Finished** assignments were paid in the classic system: they are listed in the objective's description and touch neither the budget nor the ledger's payouts.
- **The charter still decides money:** the objective starts without a budget; the dialog says what the campaign had left and offers *Request a budget*, decided as any money change.
- **Once, by the server:** the server reads the classic records and builds the plan; no browser sends it (it places work with people, which no member's own action does). The objective keeps `source: { kind: 'classic', id }`, so the same campaign can't come in twice. Its entries say *from the classic app* in the ledger.

Tested: `classic.test.ts` (mapping, engine), `src/lib/server/classic-import.test.ts` on the emulator, and the live browser test (`run-live.sh`: Mendel brings in a campaign with Levi's assignment).

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
- **Not yet:** passkey sign-in and sponsored fees for contributions (members' own transfers pay their fee): both wait on the wallet decision (`WALLETS.md`, `DECISIONS.md` #11, #12).

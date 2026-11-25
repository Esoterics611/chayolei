# Deploying the web app

The app is a SvelteKit server (`@sveltejs/adapter-node`): 37 API routes plus the governance chain listener, which polls Base Sepolia from inside the server process. It runs on **Cloud Run**; **Firebase Hosting** serves the project's domain and forwards every request to the Cloud Run service (`firebase.json`).

> Written 2026-10-25. The image build, server and deploy script were exercised locally (build, run, probe; `gcloud` stubbed), but not yet against the live `chayolei-f78aa` project.

## What goes where

| Value | Where it comes from | Why |
|---|---|---|
| `VITE_FIREBASE_*`, `VITE_GOVERNANCE_ADDRESS`, `VITE_TEAM_BACKEND` | `.env` → Cloud Build build args | Baked into the browser bundle at build time; public by nature. `VITE_TEAM_BACKEND=firestore` makes the new UI the live app (`TEAM_BACKEND.md`) |
| Contract addresses, `BASE_SEPOLIA_RPC_URL`, `GOVERNANCE_START_BLOCK`, `TEAM_FACTORY_ADDRESS`, `TEAM_FORWARDER_ADDRESS`, `TEAM_CHAIN_RPC_URL`, `TEAM_EXPLORER_URL`, `TEAM_AI_MODEL` | `.env` → Cloud Run env vars | Read by the server at runtime |
| `DEPLOYER_PRIVATE_KEY`, `ATTESTATION_SIGNER_PRIVATE_KEY`, `TEAM_RELAYER_PRIVATE_KEY`, `ANTHROPIC_API_KEY` | **Secret Manager** → Cloud Run secrets | Never in the image, never in `.env` on the deploy machine's command line. The relayer's secret is needed only when `TEAM_FACTORY_ADDRESS` is set; the Claude API key only with `TEAM_AI=1` |
| Firebase Admin credentials | Cloud Run's runtime service account | `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` are for local development only |

## From GitHub (the way it is deployed now, 2026-11-25)

The live project belongs to the project's own Google account (esoterics611@gmail.com), never to a personal one, and no key to it is stored anywhere: GitHub Actions signs in with Workload Identity Federation, allowed only for `Esoterics611/chayolei`.

1. **Firebase console** (signed in as esoterics611@gmail.com): the project on the Blaze plan; a Web app registered; Authentication → Sign-in method → Email/Password enabled with *Email link (passwordless sign-in)*. Phone sign-in stays off.
2. **Cloud Shell** (console.cloud.google.com, the `>_` button), once:
   `git clone -b claude/nifty-darwin-0h2ew6 https://github.com/Esoterics611/chayolei && bash chayolei/scripts/gcp-bootstrap.sh <project-id>`
   It enables the services, makes the registry and Firestore, the `deployer` account and the keyless GitHub sign-in, and prints two values.
3. **`deploy.env`** (committed; public values only): the project ID, the Web app's config, those two values, `PUBLIC_ORIGIN` (`https://<project-id>.web.app`).
4. **Deploy:** a push to `main`, or a commit on any branch whose message contains `[deploy]` (`.github/workflows/deploy.yml`): Cloud Build → Cloud Run (`scripts/deploy.sh`) → Hosting, Firestore rules and indexes → the wellsprings. With no chain configured the service sleeps when idle and needs no chain keys.

The sections below are the older, by-hand way, for the chain's set-up.

## One-time setup

```bash
PROJECT=chayolei-f78aa
REGION=us-central1
gcloud config set project $PROJECT

gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com iamcredentials.googleapis.com

gcloud artifacts repositories create chayolei --repository-format=docker --location=$REGION

# Secrets (paste each key when prompted, then Ctrl-D)
gcloud secrets create deployer-private-key --data-file=-
gcloud secrets create attestation-signer-private-key --data-file=-

# Runtime service account: the default compute account, or a dedicated one
SA=$(gcloud projects describe $PROJECT --format='value(projectNumber)')-compute@developer.gserviceaccount.com
gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:$SA --role=roles/datastore.user
gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:$SA --role=roles/firebaseauth.admin
for s in deployer-private-key attestation-signer-private-key; do
  gcloud secrets add-iam-policy-binding $s --member=serviceAccount:$SA --role=roles/secretmanager.secretAccessor
done
# Wallet sign-in mints Firebase custom tokens. Without a key file, the Admin SDK
# signs them through the IAM API, so the account must be able to sign as itself.
gcloud iam service-accounts add-iam-policy-binding $SA --member=serviceAccount:$SA \
  --role=roles/iam.serviceAccountTokenCreator
```

Add `GOVERNANCE_START_BLOCK` to `.env`: the block `ChayoleiGovernance` was deployed at. On its first start the listener reads every governance event from there (later starts resume from the checkpoint in Firestore at `system/governanceListener`).

## Deploy

```bash
bash scripts/deploy.sh                       # build with Cloud Build, deploy to Cloud Run
firebase deploy --only hosting,firestore     # route the domain to Cloud Run; rules and indexes
```

`scripts/deploy.sh` takes `PROJECT`, `REGION`, `SERVICE` and `REPO` from the environment (defaults: `chayolei-f78aa`, `us-central1`, `chayolei-web`, `chayolei`). If you change `REGION` or `SERVICE`, change the rewrite in `firebase.json` to match.

## Things to know

- **The listener needs an always-on instance.** The script deploys with `--min-instances 1 --no-cpu-throttling`; otherwise Cloud Run stops the CPU between requests and the listener stops polling. That instance runs (and costs) around the clock. Two or more instances are safe: every listener handler is idempotent, so the cost of more is extra RPC calls, not double counting.
- **Firestore indexes:** the vote listener in the browser uses a collection-group query on `votes.walletAddress`; `firebase deploy --only firestore` creates that index.
- **The AI planner.** Create the secret (`gcloud secrets create anthropic-api-key --data-file=-`, grant the runtime account access as above) and set `TEAM_AI=1` in `.env`; the script then passes it to Cloud Run as `ANTHROPIC_API_KEY`. Without it the planner says it isn't set up and the rest of the app is unaffected (`TEAM_BACKEND.md` §6a).
- **Live teams on-chain.** With `TEAM_FACTORY_ADDRESS` in `.env`, create the secret first (`gcloud secrets create team-relayer-private-key --data-file=-`, and grant the runtime account access as above). The relayer pays every team's network fees: keep it funded with Base Sepolia ETH. The script then deploys with `--max-instances 1`, since the relayer counts its nonces in memory. Deploy the team contracts with `contracts/scripts/deploy-teams.ts` and `TEAM_ANCHORER` set to the relayer's address (`TEAM_CONTRACTS.md` §6).
- **Contracts are separate.** This deploys the web app only. The contract changes on this branch (no minting for money sent in; audit fixes L-1, L-2, M-2) need their own redeploy (`contracts/scripts/`), followed by updated addresses in `.env` and a new app deploy.
- **Local development is unchanged:** `npm run dev` with a `.env` that includes `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`.

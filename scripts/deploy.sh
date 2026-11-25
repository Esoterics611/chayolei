#!/usr/bin/env bash
# Build the web app with Cloud Build and deploy it to Cloud Run.
# See docs/DEPLOY.md for the one-time setup this assumes.
#
# Public browser config (VITE_*) and contract addresses are read from .env,
# then from deploy.env (committed: the live project's public values).
# Private keys are NOT read from either: Cloud Run gets them from Secret Manager.
#
# With no chain configured (VITE_GOVERNANCE_ADDRESS and TEAM_FACTORY_ADDRESS
# unset) the chain's secrets are not asked for and the service sleeps when
# idle (min instances 0): the wellsprings and the team app run on Firestore.
set -euo pipefail
cd "$(dirname "$0")/.."

# Value of KEY in .env, else in deploy.env (first match, quotes removed), or empty.
env_val() {
  local v
  v="$(grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true)"
  [ -z "$v" ] && v="$(grep -E "^$1=" deploy.env 2>/dev/null | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true)"
  printf '%s' "$v"
}

PROJECT="${PROJECT:-$(env_val FIREBASE_PROJECT_ID)}"
[ -n "$PROJECT" ] || { echo "Set FIREBASE_PROJECT_ID in deploy.env (or PROJECT=...)"; exit 1; }
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-chayolei-web}"
REPO="${REPO:-chayolei}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/${SERVICE}:$(git rev-parse --short HEAD)"

PUBLIC_VARS=(VITE_FIREBASE_API_KEY VITE_FIREBASE_AUTH_DOMAIN VITE_FIREBASE_PROJECT_ID
             VITE_FIREBASE_STORAGE_BUCKET VITE_FIREBASE_MESSAGING_SENDER_ID
             VITE_FIREBASE_APP_ID VITE_GOVERNANCE_ADDRESS VITE_TEAM_BACKEND)
subs="_IMAGE=${IMAGE}"
for v in "${PUBLIC_VARS[@]}"; do
  subs+=",_${v}=$(env_val "$v")"
done

echo "Building ${IMAGE}"
gcloud builds submit --project "$PROJECT" --region "$REGION" --config cloudbuild.yaml --substitutions "$subs" .

runtime_env="FIREBASE_PROJECT_ID=${PROJECT}"
for v in BASE_SEPOLIA_RPC_URL VITE_GOVERNANCE_ADDRESS VITE_CHAYOLEI_REGISTRY_ADDRESS \
         VITE_MASIMA_REWARDS_ADDRESS VITE_TMIM_TOKEN_ADDRESS GOVERNANCE_START_BLOCK \
         TEAM_FACTORY_ADDRESS TEAM_FORWARDER_ADDRESS TEAM_CHAIN_RPC_URL TEAM_EXPLORER_URL TEAM_AI_MODEL \
         PUBLIC_ORIGIN MAIL_FROM; do
  val="$(env_val "$v")"
  [ -n "$val" ] && runtime_env+=",${v}=${val}"
done

secrets=""
add_secret() { secrets+="${secrets:+,}$1"; }
if [ -n "$(env_val VITE_GOVERNANCE_ADDRESS)" ]; then
  # The governance listener polls the chain from inside the server: keep one
  # instance up with its CPU on, and give it the chain's keys.
  add_secret "DEPLOYER_PRIVATE_KEY=deployer-private-key:latest"
  add_secret "ATTESTATION_SIGNER_PRIVATE_KEY=attestation-signer-private-key:latest"
  scaling=(--min-instances 1 --no-cpu-throttling)
else
  scaling=(--min-instances 0)
fi
if [ -n "$(env_val TEAM_FACTORY_ADDRESS)" ]; then
  # Live teams record on-chain: the relayer's key comes from Secret Manager,
  # and one instance relays, since the relayer counts its nonces in memory.
  add_secret "TEAM_RELAYER_PRIVATE_KEY=team-relayer-private-key:latest"
  scaling+=(--max-instances 1)
fi
if [ "$(env_val TEAM_AI)" = "1" ]; then
  # The AI planner's Claude API key, from Secret Manager (docs/DEPLOY.md).
  add_secret "ANTHROPIC_API_KEY=anthropic-api-key:latest"
fi
if [ "$(env_val MAIL)" = "1" ]; then
  # Answer emails (docs/MAAYAN.md §5): the Resend key and the unsubscribe secret.
  add_secret "RESEND_API_KEY=resend-api-key:latest"
  add_secret "MAAYAN_SECRET=maayan-secret:latest"
fi

echo "Deploying ${SERVICE} to ${REGION}"
gcloud run deploy "$SERVICE" \
  --project "$PROJECT" --region "$REGION" --image "$IMAGE" \
  --allow-unauthenticated \
  "${scaling[@]}" \
  --set-env-vars "$runtime_env" \
  ${secrets:+--set-secrets "$secrets"}

echo "Done. To serve it on the Firebase Hosting domain: firebase deploy --only hosting"

#!/usr/bin/env bash
# Build the web app with Cloud Build and deploy it to Cloud Run.
# See docs/DEPLOY.md for the one-time setup this assumes.
#
# Public browser config (VITE_*) and contract addresses are read from .env.
# Private keys are NOT read from .env: Cloud Run gets them from Secret Manager.
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="${PROJECT:-chayolei-f78aa}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-chayolei-web}"
REPO="${REPO:-chayolei}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/${SERVICE}:$(git rev-parse --short HEAD)"

# Value of KEY in .env (first match, surrounding quotes removed), or empty.
env_val() {
  grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true
}

PUBLIC_VARS=(VITE_FIREBASE_API_KEY VITE_FIREBASE_AUTH_DOMAIN VITE_FIREBASE_PROJECT_ID
             VITE_FIREBASE_STORAGE_BUCKET VITE_FIREBASE_MESSAGING_SENDER_ID
             VITE_FIREBASE_APP_ID VITE_GOVERNANCE_ADDRESS VITE_TEAM_BACKEND)
subs="_IMAGE=${IMAGE}"
for v in "${PUBLIC_VARS[@]}"; do
  subs+=",_${v}=$(env_val "$v")"
done

echo "Building ${IMAGE}"
gcloud builds submit --project "$PROJECT" --config cloudbuild.yaml --substitutions "$subs" .

runtime_env="FIREBASE_PROJECT_ID=${PROJECT}"
for v in BASE_SEPOLIA_RPC_URL VITE_GOVERNANCE_ADDRESS VITE_CHAYOLEI_REGISTRY_ADDRESS \
         VITE_MASIMA_REWARDS_ADDRESS VITE_TMIM_TOKEN_ADDRESS GOVERNANCE_START_BLOCK \
         TEAM_FACTORY_ADDRESS TEAM_FORWARDER_ADDRESS TEAM_CHAIN_RPC_URL TEAM_EXPLORER_URL TEAM_AI_MODEL; do
  val="$(env_val "$v")"
  [ -n "$val" ] && runtime_env+=",${v}=${val}"
done

secrets="DEPLOYER_PRIVATE_KEY=deployer-private-key:latest,ATTESTATION_SIGNER_PRIVATE_KEY=attestation-signer-private-key:latest"
scaling=(--min-instances 1)
if [ -n "$(env_val TEAM_FACTORY_ADDRESS)" ]; then
  # Live teams record on-chain: the relayer's key comes from Secret Manager,
  # and one instance relays, since the relayer counts its nonces in memory.
  secrets+=",TEAM_RELAYER_PRIVATE_KEY=team-relayer-private-key:latest"
  scaling+=(--max-instances 1)
fi
if [ "$(env_val TEAM_AI)" = "1" ]; then
  # The AI planner's Claude API key, from Secret Manager (docs/DEPLOY.md).
  secrets+=",ANTHROPIC_API_KEY=anthropic-api-key:latest"
fi

echo "Deploying ${SERVICE} to ${REGION}"
# --min-instances 1 and --no-cpu-throttling keep the governance listener
# polling between requests; without them it stops when the service idles.
gcloud run deploy "$SERVICE" \
  --project "$PROJECT" --region "$REGION" --image "$IMAGE" \
  --allow-unauthenticated \
  "${scaling[@]}" --no-cpu-throttling \
  --set-env-vars "$runtime_env" \
  --set-secrets "$secrets"

echo "Done. To serve it on the Firebase Hosting domain: firebase deploy --only hosting"

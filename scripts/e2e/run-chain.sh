#!/usr/bin/env bash
# The chain bridge on a local chain: starts a Hardhat node, deploys TMIM and
# the team contracts, and runs the bridge's tests against it and the
# Firestore emulator. HARDHAT_CONFIG picks another Hardhat config (for
# example one that compiles with a local solc). With E2E=1 it also runs the
# browser test (scripts/e2e/live.mjs) with the live app recording on-chain.
set -euo pipefail
cd "$(dirname "$0")/../.."
root=$(pwd)
config=${HARDHAT_CONFIG:-hardhat.config.ts}
logs=$(mktemp -d)

# Hardhat's development accounts: #0 deploys, #1 relays and anchors.
RELAYER_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
RELAYER=0x70997970C51812dc3A010C7d01b50e0d17dc79C8

cd contracts
node_modules/.bin/hardhat --config "$config" node --port 8545 > "$logs/node.log" 2>&1 &
node_pid=$!
trap 'kill $node_pid 2>/dev/null || true' EXIT
for i in $(seq 1 60); do
  curl -s -o /dev/null -X POST -H 'content-type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' http://127.0.0.1:8545 && break
  sleep 1
done
npx hardhat --config "$config" run scripts/deploy.ts --network localhost > "$logs/deploy.log" 2>&1
TEAM_DEFAULT_ALLOWANCE=1000000 TEAM_ANCHORER=$RELAYER \
  npx hardhat --config "$config" run scripts/deploy-teams.ts --network localhost >> "$logs/deploy.log" 2>&1
addr() { node -p "require('./deployments/localhost.json').contracts.$1"; }
export TEAM_FACTORY_ADDRESS=$(addr TeamFactory)
export TEAM_FORWARDER_ADDRESS=$(addr TeamForwarder)
export VITE_TMIM_TOKEN_ADDRESS=$(addr TMIMToken)
cd "$root"

export TEAM_CHAIN_RPC_URL=http://127.0.0.1:8545
export TEAM_RELAYER_PRIVATE_KEY=$RELAYER_KEY
export GCLOUD_PROJECT=demo-chayolei
echo "Local chain: factory $TEAM_FACTORY_ADDRESS, forwarder $TEAM_FORWARDER_ADDRESS, TMIM $VITE_TMIM_TOKEN_ADDRESS"

if [ "${E2E:-}" = "1" ]; then
  npx firebase emulators:exec --only firestore,auth --project "$GCLOUD_PROJECT" '
    npx vitest run src/lib/server/team-chain.test.ts &&
    env FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
        FIREBASE_PROJECT_ID=demo-chayolei VITE_FIREBASE_API_KEY=demo-key \
        VITE_FIREBASE_PROJECT_ID=demo-chayolei VITE_FIREBASE_AUTH_DOMAIN=localhost \
        VITE_FIREBASE_EMULATORS=1 VITE_TEAM_BACKEND=firestore \
        node_modules/.bin/vite dev --port 5173 --strictPort > /dev/null 2>&1 &
    server=$!
    trap "kill $server" EXIT
    for i in $(seq 1 60); do curl -s -o /dev/null http://localhost:5173/ && break; sleep 1; done
    CHAIN=1 node scripts/e2e/live.mjs
  '
else
  npx firebase emulators:exec --only firestore --project "$GCLOUD_PROJECT" "npx vitest run src/lib/server/team-chain.test.ts"
fi

#!/usr/bin/env bash
# Browser test of the live app against the Firebase emulators.
# Needs Java (for the emulators) and Playwright with Chromium available to
# Node (require('playwright')). Screenshots go to $SHOTS if set.
set -euo pipefail
cd "$(dirname "$0")/../.."
export GCLOUD_PROJECT=demo-chayolei
npx firebase emulators:exec --only firestore,auth --project "$GCLOUD_PROJECT" '
  env FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
      FIREBASE_PROJECT_ID=demo-chayolei VITE_FIREBASE_API_KEY=demo-key \
      VITE_FIREBASE_PROJECT_ID=demo-chayolei VITE_FIREBASE_AUTH_DOMAIN=localhost \
      VITE_FIREBASE_EMULATORS=1 VITE_TEAM_BACKEND=firestore \
      node_modules/.bin/vite dev --port 5173 --strictPort > /dev/null 2>&1 &
  server=$!
  trap "kill $server" EXIT
  for i in $(seq 1 60); do curl -s -o /dev/null http://localhost:5173/ && break; sleep 1; done
  node scripts/e2e/live.mjs
'

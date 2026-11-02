#!/usr/bin/env bash
# The push service worker in Chromium (scripts/e2e/push-sw.mjs): builds the
# app, serves its client files and delivers a push message to the worker.
set -euo pipefail
cd "$(dirname "$0")/../.."
npx vite build --logLevel error > /dev/null
python3 -m http.server 4174 --bind 127.0.0.1 --directory build/client > /dev/null 2>&1 &
server=$!
trap 'kill $server' EXIT
for i in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:4174/service-worker.js && break; sleep 1; done
node scripts/e2e/push-sw.mjs

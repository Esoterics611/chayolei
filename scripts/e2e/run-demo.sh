#!/usr/bin/env bash
# Browser smoke test of the static demo. Builds it, serves it locally and
# drives it with Playwright (require('playwright') must resolve).
set -euo pipefail
cd "$(dirname "$0")/../.."
bash scripts/build-demo.sh > /dev/null
python3 -m http.server 4173 --bind 127.0.0.1 --directory demo-build > /dev/null 2>&1 &
server=$!
trap 'kill $server' EXIT
for i in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:4173/chayolei-new-ui.html && break; sleep 1; done
node scripts/e2e/demo.mjs

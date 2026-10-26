#!/usr/bin/env bash
# Accessibility audit of the static demo with axe-core (needs Playwright).
set -euo pipefail
cd "$(dirname "$0")/../.."
bash scripts/build-demo.sh > /dev/null
python3 -m http.server 4173 --bind 127.0.0.1 --directory demo-build > /dev/null 2>&1 &
server=$!
trap 'kill $server' EXIT
for i in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:4173/chayolei-new-ui.html && break; sleep 1; done
node scripts/e2e/a11y.mjs

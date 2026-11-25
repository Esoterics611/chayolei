#!/usr/bin/env bash
# Build the free version (docs/MAAYAN.md §6a): static pages for Firebase Hosting
# on the Spark plan, no server. The wellsprings run live, writing to Firestore
# themselves (VITE_MAAYAN_BACKEND=direct, held by firestore.rules); the team app
# rides along as its demo (sample data in the browser). Deployed with
# firebase.spark.json; the server version (scripts/deploy.sh) is untouched.
#
#   bash scripts/build-spark.sh [out-dir]        (default: spark-build/)
#
# The public Firebase values come from the environment, else from deploy.env.
# VITE_FIREBASE_EMULATORS=1 builds against the local emulators (for tests).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(mkdir -p "${1:-$ROOT/spark-build}" && cd "${1:-$ROOT/spark-build}" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

val() { grep -E "^$1=" "$ROOT/deploy.env" 2>/dev/null | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true; }
for v in VITE_FIREBASE_API_KEY VITE_FIREBASE_AUTH_DOMAIN VITE_FIREBASE_PROJECT_ID VITE_FIREBASE_STORAGE_BUCKET \
         VITE_FIREBASE_MESSAGING_SENDER_ID VITE_FIREBASE_APP_ID; do
  if [ -z "${!v:-}" ]; then export "$v=$(val "$v")"; fi
done
if [ -z "${VITE_FIREBASE_API_KEY:-}" ] && [ "${VITE_FIREBASE_EMULATORS:-}" != "1" ]; then
  echo "deploy.env has no VITE_FIREBASE_API_KEY yet: fill in the Web app's config first."; exit 1
fi

cd "$ROOT"
git ls-files -z --cached --others --exclude-standard -- src static package.json tsconfig.json vite.config.ts \
  | xargs -0 tar -cf - | tar -xf - -C "$WORK"
ln -s "$ROOT/node_modules" "$WORK/node_modules"

cd "$WORK"
# No server: the classic pages and every API route stay behind.
rm -rf "src/routes/(classic)" src/routes/api src/hooks.server.ts src/lib/server

cat > svelte.config.js <<'CFG'
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    // One page for every path (Firebase Hosting rewrites ** to it); rendered in the browser.
    adapter: adapter({ fallback: 'index.html', strict: false }),
    alias: {
      $lib: './src/lib',
      $components: './src/lib/components',
      $stores: './src/lib/stores',
      $types: './src/lib/types'
    }
  }
};
CFG

npx svelte-kit sync
VITE_MAAYAN_BACKEND=direct VITE_TEAM_BACKEND= npx vite build --logLevel warn

rm -rf "$OUT"/*
cp -r build/. "$OUT"/
echo "Free version written to $OUT ($(find "$OUT" -type f | wc -l) files)"

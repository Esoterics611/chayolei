#!/usr/bin/env bash
# Build the new UI as a static, hash-routed clickable demo (docs/UX_TECH_DESIGN.md §12).
#
#   bash scripts/build-demo.sh [out-dir]      (default: demo-build/)
#
# Copies the working tree (committed and uncommitted files) to a temp dir,
# drops the classic pages and all server code, switches to adapter-static with
# the hash router, and writes <out-dir>/chayolei-new-ui.html plus its app/
# assets. The demo runs on the sample teams in src/lib/team/seed.ts and keeps
# its state in localStorage; nothing touches Firebase or a chain.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(mkdir -p "${1:-$ROOT/demo-build}" && cd "${1:-$ROOT/demo-build}" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

cd "$ROOT"
git ls-files -z --cached --others --exclude-standard -- src static package.json tsconfig.json vite.config.ts \
  | xargs -0 tar -cf - | tar -xf - -C "$WORK"
ln -s "$ROOT/node_modules" "$WORK/node_modules"

cd "$WORK"
rm -rf "src/routes/(classic)" src/routes/api src/hooks.server.ts src/lib/server src/service-worker.ts
# The hash router renders on the client only; it takes no ssr option.
rm -f src/routes/+layout.ts

cat > svelte.config.js <<'CFG'
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ fallback: 'chayolei-new-ui.html' }),
    router: { type: 'hash' },
    appDir: 'app',
    paths: { relative: true },
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
VITE_HASH_ROUTER=1 npx vite build --logLevel warn

rm -rf "$OUT/app"
cp -r build/app "$OUT/app"
# The page: English, left to right until the viewer's saved language applies.
# A fallback page links its assets from the site root; make them relative so
# the demo works from any folder.
sed -e 's/<html lang="he" dir="rtl">/<html lang="en" dir="ltr">/' \
    -e 's#<title>[^<]*</title>#<title>Chayolei — Team Ledger Demo</title>#' \
    -e 's#"/app/#"./app/#g' -e 's#href="/favicon.svg"#href="./favicon.svg"#' \
    -e 's#<meta name="description" content="[^"]*"#<meta name="description" content="Clickable demo of the new Chayolei UI: a team’s workforce, organization and treasury on one ledger, in TMIM. Sample data; nothing is on-chain."#' \
    build/chayolei-new-ui.html > "$OUT/chayolei-new-ui.html"
cp build/favicon.svg "$OUT/" 2>/dev/null || true

echo "Demo written to $OUT/chayolei-new-ui.html ($(find "$OUT/app" -type f | wc -l) asset files)"

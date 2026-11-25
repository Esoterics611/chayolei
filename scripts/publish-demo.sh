#!/usr/bin/env bash
# Publish the clickable demo (team app and wellsprings, sample data, nothing
# on-chain) to https://esoterics611.github.io/chayolei/ (docs/MAAYAN.md §7).
#
#   bash scripts/publish-demo.sh [site-checkout]
#
# Builds with scripts/build-demo.sh, then replaces the chayolei/ folder of the
# Esoterics611/esoterics611.github.io checkout (cloned beside this repo if
# absent) and pushes it. Nothing else in that site is touched.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="${1:-$(dirname "$ROOT")/esoterics611.github.io}"
[ -d "$SITE/.git" ] || git clone --depth 1 https://github.com/Esoterics611/esoterics611.github.io "$SITE"
git -C "$SITE" pull -q --ff-only

OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT
bash "$ROOT/scripts/build-demo.sh" "$OUT" >/dev/null
rm -rf "$SITE/chayolei"
mkdir -p "$SITE/chayolei"
cp -r "$OUT/." "$SITE/chayolei/"
# The folder's own address opens the demo; links inside it are hash routes.
cp "$SITE/chayolei/chayolei-new-ui.html" "$SITE/chayolei/index.html"

git -C "$SITE" add -A chayolei
if git -C "$SITE" diff --cached --quiet; then echo "demo: nothing changed"; exit 0; fi
git -C "$SITE" -c user.email=192616319+Esoterics611@users.noreply.github.com -c user.name="Ronnie Rendel" \
  commit -qm "Chayolei demo from chayolei $(git -C "$ROOT" rev-parse --short HEAD)"
git -C "$SITE" push -q origin HEAD
echo "demo: published to https://esoterics611.github.io/chayolei/ (wellspring: #/maayan/padah-beshalom)"

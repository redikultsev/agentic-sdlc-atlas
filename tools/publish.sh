#!/usr/bin/env bash
# Build the deck and the interactive model for the public slides site.
# Usage: tools/publish.sh <path to a clone of the slides site repository>
# Writes <site>/site/agentic-pipeline/ (the deck), .../model/ (the model) and .../cover.png.
# Commit and push in the slides repository to deploy.
set -euo pipefail
cd "$(dirname "$0")/.."
SITE="${1:?path to the slides site repository}"
SLUG=agentic-pipeline
OUT="$(cd "$SITE" && pwd)/site/$SLUG"

npm run -s deck:gen
rm -rf "$OUT" && mkdir -p "$OUT"
./node_modules/.bin/slidev build deck/slides.md --base "/$SLUG/" --out "$OUT" >/dev/null
./node_modules/.bin/likec4 build --base "/$SLUG/model/" -t 'Agentic development pipeline' -o "$OUT/model" . >/dev/null 2>&1
node tools/cover.mjs "$OUT" "$OUT/cover.png" 3   # the whole-pipeline slide
echo "published to $OUT"

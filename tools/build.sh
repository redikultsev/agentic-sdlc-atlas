#!/usr/bin/env bash
# Single build: model check -> view images -> deck from sources -> static sites.
set -euo pipefail
cd "$(dirname "$0")/.."
B=.build; mkdir -p $B deck/public/views
./node_modules/.bin/likec4 validate . >/dev/null
./node_modules/.bin/likec4 export png -o $B/png . >/dev/null 2>&1
find $B/png -name '*.png' -exec cp {} deck/public/views/ \;
./node_modules/.bin/likec4 export json -o $B/model.json . >/dev/null 2>&1
python3 -I tools/gen_deck.py $B/model.json
if [ "${1:-}" = "--sites" ]; then
  ./node_modules/.bin/likec4 build --output-single-file --use-hash-history -t 'Конвейер разработки' -o dist/model . >/dev/null 2>&1
  ./node_modules/.bin/slidev build deck/slides.md --out ../dist/deck --base ./ >/dev/null 2>&1
  echo "sites: dist/model, dist/deck"
fi

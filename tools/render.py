"""Render F1 sweep JSON ({areas, missing, critic}) into the atlas repo."""
import json, re, sys, pathlib

src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
data = json.loads(src.read_text())
AREAS = {
 'S0': 'Intake & signals', 'S1': 'Product discovery', 'S2': 'Requirements & spec', 'S3': 'Architecture & design',
 'S4': 'Planning & decomposition', 'S5': 'Implementation', 'S6': 'Verification & testing', 'S7': 'Code review',
 'S8': 'Integration & merge', 'S9': 'Delivery & deploy', 'S10': 'Operations & incidents', 'S11': 'Maintenance & evolution',
 'S12': 'Reporting to humans', 'S13': 'Process self-improvement', 'X1': 'Orchestration engines', 'X2': 'Isolation & security',
 'X3': 'Human in the loop', 'X4': 'Context & knowledge', 'X5': 'Multi-agent systems', 'X6': 'Economics', 'X7': 'Measurement & evidence',
}
def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
def cell(s): return str(s).replace('|', '\\|').replace('\n', ' ')
def fname(aid): return f"{aid.lower()}-{slug(AREAS.get(aid, aid))}.md"

(out / 'areas').mkdir(parents=True, exist_ok=True)
areas = sorted(data['areas'], key=lambda r: (r['area_id'][0] != 'S', int(re.sub(r'\D', '', r['area_id']) or 0)))
total = 0
for r in areas:
    aid = r['area_id']; title = AREAS.get(aid, aid)
    cs = r['candidates']; total += len(cs)
    L = [f"# {aid}. {title}", "", "Phase F1 broad sweep, 2026-11. Not yet verified in depth: `search-snippet` rows were not opened.", "",
         "## State of the art", "", r['summary'], "", "## Approaches", "",
         "| Approach | What | Evidence | Seen in |", "|---|---|---|---|"]
    for a in r['approaches']:
        L.append(f"| **{cell(a['name'])}** | {cell(a['description'])} | {a['evidence_strength']} | {cell(', '.join(a['candidates']))} |")
    L += ["", "## Candidates", "", "| Name | Kind | Date | Evidence | Claim | Limits | Fit | Read |", "|---|---|---|---|---|---|---|---|"]
    order = {'take': 0, 'watch': 1, 'no': 2}
    for c in sorted(cs, key=lambda c: order.get(c['relevance'], 3)):
        L.append(f"| [{cell(c['name'])}]({c['url']}) | {c['kind']} | {c['date']} | {c['evidence']} | {cell(c['claim'])} | {cell(c['limits'])} | **{c['relevance']}** — {cell(c['why'])} | {c['read_depth']} |")
    L += ["", "## Deep-dive priority for F2", ""] + [f"{i+1}. {x}" for i, x in enumerate(r['deep_dive_priority'])]
    L += ["", "## Open gaps", ""] + [f"- {x}" for x in r['gaps']]
    L += ["", "## Not searched", ""] + [f"- {x}" for x in r['not_searched']] + [""]
    (out / 'areas' / fname(aid)).write_text('\n'.join(L))

# matrix
M = ["# Matrix", "", "One row per approach. Evidence strength as judged by the F1 scout; F2 re-checks it against primary sources.", "",
     "| Area | Approach | Evidence | Seen in |", "|---|---|---|---|"]
for r in areas:
    for a in r['approaches']:
        M.append(f"| [{r['area_id']}](areas/{fname(r['area_id'])}) | {cell(a['name'])} | {a['evidence_strength']} | {cell(', '.join(a['candidates']))} |")
(out / 'MATRIX.md').write_text('\n'.join(M) + '\n')

c = data.get('critic') or {}
C = ["# F1 completeness critic", "", "## Missing stages or themes", ""] + [f"- **{x['name']}** — {x['why']}" for x in c.get('missing_stages', [])]
C += ["", "## Missing sources", ""] + [f"- {('['+x['name']+']('+x['url']+')') if x.get('url') else x['name']} ({x['area']}) — {x['why']}" for x in c.get('missing_sources', [])]
C += ["", "## Duplicates across areas", ""] + [f"- {x}" for x in c.get('duplicates', [])]
C += ["", "## Top deep dives for F2", ""] + [f"{i+1}. **{x['name']}** ({x['area']}) — {x['why']}" for i, x in enumerate(c.get('top_deep_dives', []))]
(out / 'F1-CRITIC.md').write_text('\n'.join(C) + '\n')

idx = '\n'.join(f"| [{r['area_id']}](areas/{fname(r['area_id'])}) | {AREAS.get(r['area_id'])} | {len(r['candidates'])} | {sum(1 for x in r['candidates'] if x['relevance']=='take')} |" for r in areas)
(out / 'README.md').write_text(f"""# Agentic SDLC Atlas

What the world knows about AI agents doing the whole software lifecycle: from the first signal that something should be built to production watch and the process improving itself. Every entry has a primary source, the date of the work itself, and an evidence level.

Status: phase F1 (broad sweep), {total} candidates in {len(areas)} areas. Nothing here is verified in depth yet.

## Evidence levels

- **measured**: a published measurement with a method.
- **code**: source code you can read.
- **self-report**: a company's claims about its own system.
- **opinion**: an argument without data.

`Read` column: `primary-read` means the source was opened; `search-snippet` means only a search result was seen.

## Areas

| Id | Area | Candidates | Marked take |
|---|---|---|---|
{idx}

Approaches across all areas: [MATRIX.md](MATRIX.md). Gaps in the map itself: [F1-CRITIC.md](F1-CRITIC.md).
""")
print(total, len(areas))

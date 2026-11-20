"""Build deck/slides.md from the single sources: LikeC4 model (JSON export),
docs/states.md, docs/decisions.md and hand-written deck/parts/*.md.
Run via `npm run deck:gen`; never edit deck/slides.md by hand."""
import json, re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
model = json.loads(pathlib.Path(sys.argv[1]).read_text())
if isinstance(model, list):  # named projects export as a list
    model = model[0]
E, R = model['elements'], model['relations']
KIND = {'agent': 'agent', 'script': 'script', 'gate': 'Operator decides', 'store': 'store',
        'platform': 'cross-cutting', 'human': 'human', 'external': 'external', 'phase': 'stage'}
STATUS = {'built': 'built', 'planned': 'planned', 'idea': 'idea'}
STAGES = ['intake', 'spec', 'plan', 'implement', 'verify', 'aiReview', 'merge', 'deploy', 'learn']
STATES = {  # which task states (docs/states.md) live in each stage
    'intake': 'New → Triaged → Accepted / ForHuman / Cancelled',
    'spec': 'Clarifying → SpecReview',
    'plan': 'Researching (L) → Planning → PlanReview',
    'implement': 'Implementing',
    'verify': 'Verifying (fix rounds ≤ 3 per work item, else Blocked)',
    'aiReview': 'Verifying → MergeReview (R1/R2) or Merged (R0)',
    'merge': 'MergeReview → Merged',
    'deploy': 'Merged → Live → Done / RolledBack',
    'learn': 'new work items in New',
}

def txt(v):
    if isinstance(v, dict): return (v.get('txt') or v.get('md') or '').strip()
    return (v or '').strip()
def title(fqn): return E[fqn]['title'] if fqn in E else fqn
def cell(s): return s.replace('|', '\\|').replace('\n', ' ')
def part(name):
    # {{tech:fqn}} in a part is replaced by that element's technology from the model (one source per fact)
    t = (root / 'deck' / 'parts' / f'{name}.md').read_text().strip()
    return re.sub(r'\{\{tech:([\w.]+)\}\}', lambda m: E[m.group(1)].get('technology', ''), t)

KIND_TAG = {'agent': 'Agent', 'script': 'Script', 'gate': 'Gate', 'human': 'Operator', 'store': 'Store', 'platform': 'Cross-cutting'}

def body(el):
    # metadata in/does/out = what a part takes, does and gives; else the description
    md = el.get('metadata') or {}
    if all(k in md for k in ('in', 'does', 'out')):
        return '<dl class="eg3">' + ''.join(f'<dt>{l}</dt><dd>{md[k]}</dd>' for l, k in (('In', 'in'), ('Does', 'does'), ('Out', 'out'))) + '</dl>'
    return f'<p class="pd">{txt(el.get("description"))}</p>'

def stage_slide(key):
    fqn = f'engine.{key}'; st = E[fqn]
    kids = [k for k in E if k.startswith(fqn + '.') and k.count('.') == fqn.count('.') + 1]
    gates = [E[k]['title'] for k in kids if E[k]['kind'] == 'gate']
    cards = '\n'.join(
        f'  <div class="pc"><div class="pc-top"><span class="pk k-{E[k]["kind"]}">{KIND_TAG.get(E[k]["kind"], E[k]["kind"])}</span>'
        f'<span class="ps">{STATUS.get((E[k].get("tags") or ["-"])[0], "")}</span></div>'
        f'<p class="pn">{E[k]["title"]}</p>{body(E[k])}</div>' for k in kids)
    decides = ', '.join(gates) if gates else 'nothing, this stage runs without a human'
    return f"""---
layout: default
---

# {st['title']}

<div class="lead">{txt(st.get('description'))}</div>

<div class="stg">
<div class="dg"><likec4-view view-id="{key}Deck" color-scheme="light" browser="true" class="view-stage"></likec4-view><span class="hint">⤢ Click to explore</span></div>
<div class="pcs n{len(kids)}">
{cards}
</div>
</div>

<p class="sf"><b>Work item states:</b> {STATES[key]} &nbsp;·&nbsp; <b>The Operator decides:</b> {decides}</p>
"""

states_md = (root / 'docs' / 'states.md').read_text()
blocks = re.findall(r'### (.*?)\n\n```mermaid\n(.*?)```', states_md, re.S)
dec = (root / 'docs' / 'decisions.md').read_text()
dec_rows = [l for l in dec.splitlines() if re.match(r'\| \d+ \|', l)]
dec_tbl = '| # | Question | Decision |\n|---|---|---|\n' + '\n'.join(
    '| ' + ' | '.join(c.strip() for c in l.strip('|').split('|')[:3]) + ' |' for l in dec_rows)

out = [part('00-title'), part('02-how-to-read'),
       "---\n\n# Whole pipeline\n\n<div class=\"dg\"><likec4-view view-id=\"index\" color-scheme=\"light\" browser=\"true\" class=\"view-wide\"></likec4-view><span class=\"hint\">⤢ Click the diagram to explore: zoom, pan, open any stage</span></div>\n\n" + part('03-overview-note'),
       part('04-artifacts'), part('05-size-risk')]
out += [stage_slide(k) for k in STAGES]
out += ["---\n\n# Life of one work item\n\n<div class=\"dg\"><likec4-view view-id=\"task\" color-scheme=\"light\" browser=\"true\" class=\"view-wide\"></likec4-view><span class=\"hint\">⤢ Click the diagram to explore: zoom, pan, open any stage</span></div>\n\n" + part('06-task-note'),
        *["---\n\n# Work item states\n\n**" + t + "**\n\n```mermaid {scale: 0.42}\n" + m + "```\n\n" + part('07-states-note') for t, m in blocks],
        "---\n\n# Cross-cutting parts\n\n<div class=\"dg\"><likec4-view view-id=\"platform\" color-scheme=\"light\" browser=\"true\" class=\"view-wide\"></likec4-view><span class=\"hint\">⤢ Click the diagram to explore: zoom, pan, open any stage</span></div>\n",
        "---\nlayout: default\n---\n\n# Decisions\n\n<div class=\"small\">\n\n" + dec_tbl + "\n\n</div>\n",
        part('08-open')]
(root / 'deck' / 'slides.md').write_text('\n\n'.join(out) + '\n')
print('slides:', sum(1 for _ in re.finditer(r'^---$', '\n'.join(out), re.M)))

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
STATES = {  # which work item states (docs/states.md) live in each stage
    'intake': 'Triaging → TriageReview → on to Spec or Implement / ForHuman / Cancelled',
    'spec': 'Specifying → SpecReview',
    'plan': 'Planning (L: research first) → PlanReview',
    'implement': 'Implementing',
    'verify': 'Verifying (fix rounds ≤ 3 per work item, else Blocked)',
    'aiReview': 'Verifying → MergeReview (R1/R2) or Live (R0)',
    'merge': 'MergeReview → Live',
    'deploy': 'Live → Done / RolledBack',
    'learn': 'new work items in Triaging',
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
st_rows = [[c.strip() for c in l.strip().strip('|').split('|')] for l in states_md.splitlines()
           if re.match(r'\| [A-Z]\w+ \| (\d|exit) \|', l)]
# The states slide: a UML state machine in swimlanes by who holds the work item (Operator on top, agents, closed),
# drawn by hand; colours from likec4.config.json. Every documented transition must be drawn (asserted below).
PAL = {'op': '#be123c', 'ag': '#4f46e5', 'hu': '#c2410c', 'end': '#475569'}
W, H = 126, 56
OP, AG, END = 120, 300, 450                   # lane centres
LANES = [('Operator', 64, 176), ('Agents', 244, 356), ('Closed', 394, 506)]
POS = {'TriageReview': (220, OP), 'SpecReview': (420, OP), 'PlanReview': (620, OP), 'Blocked': (880, OP), 'MergeReview': (1040, OP),
       'Triaging': (120, AG), 'Specifying': (320, AG), 'Planning': (520, AG), 'Implementing': (720, AG), 'Verifying': (880, AG), 'Live': (1110, AG),
       'ForHuman': (130, END), 'Cancelled': (310, END), 'RolledBack': (960, END), 'Done': (1100, END)}
TAG = {'1': '1 · Intake', '2': '2 · Spec', '3': '3 · Plan', '4': '4 · Implement', '5': '5–6 · Checks', '7': '7 · Merge', '8': '8 · Deploy'}
NOTE = {'Blocked': 'from 5–7', 'Cancelled': "won't do", 'ForHuman': 'a human does it', 'RolledBack': '→ new work item'}
M, E_, S_ = 'middle', 'end', 'start'
# (source, target, path, [(x, y, anchor, text, halo)]); a halo label sits on its line
EDGES = [
    ('[*]', 'Triaging', 'M38,300 H60', [(30, 328, M, 'signal', 0)]),
    ('Triaging', 'TriageReview', 'M150,272 L190,150', []),
    ('TriageReview', 'Specifying', 'M250,148 L290,270', [(270, 214, M, 'M, L', 1)]),
    ('TriageReview', 'Implementing', 'M220,92 V30 H705 V270', [(462, 22, M, 'accepted, S', 0)]),
    ('TriageReview', 'ForHuman', '', []), ('TriageReview', 'Cancelled', '', []),
    ('Specifying', 'SpecReview', 'M350,272 L390,150', []),
    ('SpecReview', 'Specifying', 'M425,148 C425,240 405,300 380,300', [(432, 262, S_, 'clarify', 0)]),
    ('SpecReview', 'Planning', 'M450,148 L490,270', [(470, 210, M, 'approved', 1)]),
    ('Planning', 'PlanReview', 'M550,272 L590,150', []),
    ('PlanReview', 'Planning', 'M625,148 C625,240 605,300 580,300', [(632, 262, S_, 'redo', 0)]),
    ('PlanReview', 'Implementing', 'M650,148 L690,270', [(670, 210, M, 'approved', 1)]),
    ('Implementing', 'Verifying', 'M783,300 H815', []),
    ('Verifying', 'Implementing', 'M850,328 C850,378 750,378 750,330', [(800, 389, M, 'fix · queue red', 0)]),
    ('Verifying', 'Blocked', 'M880,272 V150', [(872, 184, E_, 'blocked', 0)]),
    ('Verifying', 'MergeReview', 'M915,272 L1000,150', [(957, 211, M, 'R1, R2', 1)]),
    ('Verifying', 'Live', 'M943,300 H1045', [(994, 292, M, 'R0: merged', 0)]),
    ('MergeReview', 'Implementing', 'M1040,92 V52 H735 V270', [(888, 45, M, 'changes · queue red', 0)]),
    ('MergeReview', 'Live', 'M1075,148 L1105,270', [(1090, 211, M, 'merged', 1)]),
    ('Blocked', 'Implementing', 'M840,148 L765,270', [(802, 209, M, 'sorted out', 1)]),
    ('Live', 'Done', 'M1100,328 V420', [(1108, 368, S_, 'window', 0), (1108, 385, S_, 'over', 0)]),
    ('Live', 'RolledBack', 'M1065,328 L990,420', [(1027, 374, M, 'regression', 1)]),
    ('Done', '[*]', 'M1163,450 H1174', []),
    ('RolledBack', '[*]', '', []),
]
JUNCTION = (220, 400)  # TriageReview's two closing exits share one line down, then split (UML junction)
JUNCTION_PATHS = ['M220,148 V395', 'M216,403 L160,421', 'M224,403 L280,421']

def states_slide():
    rows = {r[0]: r for r in st_rows}
    doc = set(re.findall(r'^\s*(\[\*\]|\w+) --> (\[\*\]|\w+)', states_md, re.M))
    drawn = {(s_, t) for s_, t, *_ in EDGES}
    assert doc == drawn, (doc - drawn, drawn - doc)
    svg = ['<svg class="sm" viewBox="0 0 1200 512" xmlns="http://www.w3.org/2000/svg">',
           '<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
           '<path d="M0,0 L10,5 L0,10 z" fill="#64748b"/></marker></defs>']
    for name, y0, y1 in LANES:
        svg.append(f'<rect x="0" y="{y0}" width="1200" height="{y1 - y0}" rx="10" class="ln"/><text x="12" y="{y0 + 20}" class="lt">{name}</text>')
    paths = [d for _, _, d, _ in EDGES if d] + JUNCTION_PATHS
    svg += [f'<path d="{d}" class="tr"' + ('' if d == JUNCTION_PATHS[0] else ' marker-end="url(#ah)"') + '/>' for d in paths]
    svg.append(f'<circle cx="{JUNCTION[0]}" cy="{JUNCTION[1]}" r="5" fill="#64748b"/>')
    for name, (x, y) in POS.items():
        r = rows[name]
        kind = 'end' if name in ('Done', 'Cancelled', 'RolledBack') else 'hu' if name == 'ForHuman' else 'op' if r[4].startswith('**yes') else 'ag'
        svg.append(f'<rect x="{x - W / 2}" y="{y - H / 2}" width="{W}" height="{H}" rx="10" fill="{PAL[kind]}"/>'
                   f'<text x="{x}" y="{y - 3}" class="sn">{name}</text><text x="{x}" y="{y + 17}" class="sg">{NOTE.get(name) or TAG[r[1]]}</text>')
    svg.append('<circle cx="30" cy="300" r="7" fill="#1e293b"/>')
    svg.append('<circle cx="1186" cy="450" r="10" fill="#fff" stroke="#1e293b" stroke-width="2"/><circle cx="1186" cy="450" r="6" fill="#1e293b"/>')
    for _, _, _, labels in EDGES:
        for lx, ly, anc, t, halo in labels:
            if halo:  # a label on its line: a white plate under it, so the line does not run through the words
                w = len(t) * 8 + 12
                svg.append(f'<rect x="{lx - w / 2}" y="{ly - 10}" width="{w}" height="20" rx="4" fill="#fff"/>')
            svg.append(f'<text x="{lx}" y="{ly + (5 if halo else 0)}" text-anchor="{anc}" class="tl">{t}</text>')
    svg.append('</svg>')
    legend = ('<p class="sl"><span class="dot" style="background:#be123c"></span>waits for the Operator, at most 3 work items at once'
              '<span class="dot" style="background:#4f46e5"></span>an agent works'
              '<span class="dot" style="background:#c2410c"></span>a human, outside the pipeline'
              '<span class="dot" style="background:#475569"></span>closed</p>')
    return ('---\nlayout: default\n---\n\n# Work item states\n\n<div class="smw">' + ''.join(svg) + '</div>\n\n' + legend + '\n\n' + part('07-states-note'))

dec = (root / 'docs' / 'decisions.md').read_text()
dec_rows = [l for l in dec.splitlines() if re.match(r'\| \d+ \|', l)]
dec_tbl = '| # | Question | Decision |\n|---|---|---|\n' + '\n'.join(
    '| ' + ' | '.join(c.strip() for c in l.strip('|').split('|')[:3]) + ' |' for l in dec_rows)

out = [part('00-title'), part('02-how-to-read'),
       "---\n\n# Whole pipeline\n\n<div class=\"dg\"><likec4-view view-id=\"index\" color-scheme=\"light\" browser=\"true\" class=\"view-wide\"></likec4-view><span class=\"hint\">⤢ Click the diagram to explore: zoom, pan, open any stage</span></div>\n\n" + part('03-overview-note'),
       part('04-artifacts'), part('05-size-risk')]
out += [stage_slide(k) for k in STAGES]
out += [states_slide(),
        "---\n\n# Cross-cutting parts\n\n<div class=\"dg\"><likec4-view view-id=\"platform\" color-scheme=\"light\" browser=\"true\" class=\"view-wide\"></likec4-view><span class=\"hint\">⤢ Click the diagram to explore: zoom, pan, open any stage</span></div>\n",
        "---\nlayout: default\n---\n\n# Decisions\n\n<div class=\"small\">\n\n" + dec_tbl + "\n\n</div>\n",
        part('08-open')]
(root / 'deck' / 'slides.md').write_text('\n\n'.join(out) + '\n')
print('slides:', sum(1 for _ in re.finditer(r'^---$', '\n'.join(out), re.M)))

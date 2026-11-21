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
    'intake': 'New → Triaged → on to Spec or Implement / ForHuman / Cancelled',
    'spec': 'Specifying → SpecReview',
    'plan': 'Planning (L: research first) → PlanReview',
    'implement': 'Implementing',
    'verify': 'Verifying (fix rounds ≤ 3 per work item, else Blocked)',
    'aiReview': 'Verifying → MergeReview (R1/R2) or Live (R0)',
    'merge': 'MergeReview → Live',
    'deploy': 'Live → Done / RolledBack',
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
st_rows = [[c.strip() for c in l.strip().strip('|').split('|')] for l in states_md.splitlines()
           if re.match(r'\| [A-Z]\w+ \| (\d|exit) \|', l)]
# The states slide: a UML state machine drawn by hand, colours from likec4.config.json (gate red, agent indigo,
# human amber, end gray). Initial state top left, final bottom right, every transition an arrow with an event label.
PAL = {'op': '#be123c', 'ag': '#4f46e5', 'hu': '#c2410c', 'end': '#475569'}
W, H = 120, 56
A, B, C = 70, 300, 440                        # row centres: preparation, execution, exits
X = [None, 120, 310, 500, 690, 880, 1070]     # column centres
POS = {'New': (1, A), 'Triaged': (2, A), 'Specifying': (3, A), 'SpecReview': (4, A), 'Planning': (5, A), 'PlanReview': (6, A),
       'Implementing': (2, B), 'Verifying': (3, B), 'MergeReview': (4, B), 'Live': (5, B), 'Done': (6, B),
       'ForHuman': (1, C), 'Cancelled': (2, C), 'Blocked': (3, C), 'RolledBack': (5, C)}
TAG = {'1': '1 · Intake', '2': '2 · Spec', '3': '3 · Plan', '4': '4 · Implement', '5': '5–6 · Checks', '7': '7 · Merge', '8': '8 · Deploy'}
EXIT_TAG = {'Blocked': 'from 5–7', 'Cancelled': 'exit', 'ForHuman': 'exit', 'RolledBack': '8 · Deploy'}
L, R = 'start', 'end'
# (source, target, path, [(x, y, anchor, text)]); paths in slide pixels
EDGES = [
    ('[*]', 'New', 'M31,70 H58', []),
    ('New', 'Triaged', 'M180,70 H248', [(215, 60, 'middle', 'checked')]),
    ('Triaged', 'Specifying', 'M370,70 H438', [(405, 44, 'middle', 'accepted'), (405, 61, 'middle', 'M or L')]),
    ('Triaged', 'Implementing', 'M270,98 V270', [(262, 220, R, 'accepted'), (262, 237, R, 'S')]),
    ('Triaged', 'ForHuman', 'M256,98 L124,294', []),
    ('Triaged', 'Cancelled', '', []),
    ('Specifying', 'SpecReview', 'M560,70 H628', [(595, 60, 'middle', 'ready')]),
    ('SpecReview', 'Specifying', 'M650,98 C650,140 540,140 540,100', [(595, 146, 'middle', 'clarify')]),
    ('SpecReview', 'Planning', 'M750,70 H818', [(785, 60, 'middle', 'approved')]),
    ('Planning', 'PlanReview', 'M940,70 H1008', [(975, 60, 'middle', 'ready')]),
    ('PlanReview', 'Planning', 'M1030,98 C1030,140 920,140 920,100', [(975, 146, 'middle', 'redo')]),
    ('PlanReview', 'Implementing', 'M1070,98 V170 H305 V270', [(1078, 136, L, 'approved')]),
    ('Implementing', 'Verifying', 'M370,300 H438', [(405, 290, 'middle', 'ready')]),
    ('Verifying', 'Implementing', 'M470,272 C470,222 360,222 360,270', [(415, 231, 'middle', 'fix · queue red')]),
    ('Verifying', 'MergeReview', 'M560,300 H628', [(595, 274, 'middle', 'passed'), (595, 291, 'middle', 'R1, R2')]),
    ('Verifying', 'Live', 'M530,328 C530,388 850,388 850,330', [(690, 392, 'middle', 'passed, R0: merged')]),
    ('Verifying', 'Blocked', 'M500,328 V410', [(492, 360, R, 'out of rounds'), (492, 377, R, 'or block')]),
    ('MergeReview', 'Implementing', 'M650,272 C650,170 335,170 335,270', [(492, 190, 'middle', 'changes · queue red')]),
    ('MergeReview', 'Live', 'M750,300 H818', [(785, 290, 'middle', 'merged')]),
    ('Live', 'Done', 'M940,300 H1008', [(975, 274, 'middle', 'window'), (975, 291, 'middle', 'over')]),
    ('Live', 'RolledBack', 'M900,328 V410', [(908, 374, L, 'regression')]),
    ('Done', '[*]', 'M1130,300 H1149', []),
    ('Blocked', 'Implementing', 'M460,412 L333,331', [(386, 392, R, 'sorted out')]),
    ('Blocked', 'Cancelled', 'M440,440 H372', [(405, 430, 'middle', 'cancel')]),
    ('RolledBack', '[*]', '', []),
]
JUNCTION = (120, 300)  # Triaged's two exits share one line down, then split (UML junction)
JUNCTION_EDGES = [('M120,306 V410', [(112, 362, R, 'for a human')]), ('M125,305 L248,430', [(196, 352, L, "won't do")])]

def states_slide():
    rows = {r[0]: r for r in st_rows}
    # every drawn transition must exist in docs/states.md, and every documented one must be drawn
    doc = set(re.findall(r'^\s*(\[\*\]|\w+) --> (\[\*\]|\w+)', states_md, re.M))
    drawn = {(s_, t) for s_, t, *_ in EDGES}
    assert doc == drawn, (doc - drawn, drawn - doc)
    svg = ['<svg class="sm" viewBox="0 0 1200 500" xmlns="http://www.w3.org/2000/svg">',
           '<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
           '<path d="M0,0 L10,5 L0,10 z" fill="#64748b"/></marker></defs>']
    for _, _, d, labels in EDGES:
        if d:
            svg.append(f'<path d="{d}" class="tr" marker-end="url(#ah)"/>')
    for d, _ in JUNCTION_EDGES:
        svg.append(f'<path d="{d}" class="tr" marker-end="url(#ah)"/>')
    for name, (c, y) in POS.items():
        r = rows[name]
        kind = 'end' if name in ('Done', 'Cancelled', 'RolledBack') else 'hu' if name == 'ForHuman' else 'op' if r[4].startswith('**yes') else 'ag'
        x = X[c] - W / 2
        tag = EXIT_TAG.get(name) or TAG[r[1]]
        svg.append(f'<rect x="{x}" y="{y - H / 2}" width="{W}" height="{H}" rx="10" fill="{PAL[kind]}"/>'
                   f'<text x="{X[c]}" y="{y - 3}" class="sn">{name}</text><text x="{X[c]}" y="{y + 17}" class="sg">{tag}</text>')
    svg.append(f'<circle cx="24" cy="70" r="7" fill="#1e293b"/>')                                  # initial state
    svg.append(f'<circle cx="1160" cy="300" r="10" fill="none" stroke="#1e293b" stroke-width="2"/><circle cx="1160" cy="300" r="6" fill="#1e293b"/>')
    svg.append(f'<circle cx="{JUNCTION[0]}" cy="{JUNCTION[1]}" r="5" fill="#64748b"/>')
    for _, _, _, labels in EDGES:
        for lx, ly, anc, t in labels:
            svg.append(f'<text x="{lx}" y="{ly}" text-anchor="{anc}" class="tl">{t}</text>')
    for _, labels in JUNCTION_EDGES:
        for lx, ly, anc, t in labels:
            svg.append(f'<text x="{lx}" y="{ly}" text-anchor="{anc}" class="tl">{t}</text>')
    svg.append('<text x="880" y="492" class="tl" text-anchor="middle">the cause becomes a new work item in New</text>')
    svg.append('</svg>')
    legend = ('<p class="sl"><span class="dot" style="background:#be123c"></span>waits for the Operator, at most 3 work items at once'
              '<span class="dot" style="background:#4f46e5"></span>an agent works'
              '<span class="dot" style="background:#c2410c"></span>a human, outside the pipeline'
              '<span class="dot" style="background:#475569"></span>finished · 9. Learn only adds work items in New</p>')
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

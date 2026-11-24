"""Build deck/slides.md from the single sources: LikeC4 model (JSON export),
docs/states.md and hand-written deck/parts/*.md.
Run via `npm run deck:gen`; never edit deck/slides.md by hand."""
import json, re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
model = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
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
    'aiReview': 'Verifying → MergeReview (R1/R2) or merged to Releasing (R0)',
    'merge': 'MergeReview → Verifying (queue, environment) → TestReview where declared → Releasing',
    'deploy': 'Releasing → Live → Done / RolledBack',
    'learn': 'new work items in Triaging',
}

def txt(v):
    if isinstance(v, dict): return (v.get('txt') or v.get('md') or '').strip()
    return (v or '').strip()
def title(fqn): return E[fqn]['title'] if fqn in E else fqn
def cell(s): return s.replace('|', '\\|').replace('\n', ' ')
def part(name):
    # {{tech:fqn}} in a part is replaced by that element's technology from the model (one source per fact)
    t = (root / 'deck' / 'parts' / f'{name}.md').read_text(encoding='utf-8').strip()
    return re.sub(r'\{\{tech:([\w.]+)\}\}', lambda m: E[m.group(1)].get('technology', ''), t)

KIND_TAG = {'agent': 'Agent', 'script': 'Script', 'gate': 'Gate', 'human': 'Operator', 'store': 'Store', 'platform': 'Engine'}

def body(el):
    # metadata in/does/out = what a part takes, does and gives; else the description
    md = el.get('metadata') or {}
    if all(k in md for k in ('in', 'does', 'out')):
        return '<dl class="eg3">' + ''.join(f'<dt>{l}</dt><dd>{md[k]}</dd>' for l, k in (('In', 'in'), ('Does', 'does'), ('Out', 'out'))) + '</dl>'
    return f'<p class="pd">{txt(el.get("description"))}</p>'

def stage_slide(key):
    fqn = f'engine.{key}'; st = E[fqn]
    kids = [k for k in E if k.startswith(fqn + '.') and k.count('.') == fqn.count('.') + 1]
    return parts_slide(st['title'], txt(st.get('description')), f'{key}Deck', kids,
                       f"<b>Work item states:</b> {STATES[key]} &nbsp;·&nbsp; <b>The Operator decides:</b> {decides_of(kids)}")

def decides_of(kids):
    gates = [E[k]['title'] for k in kids if E[k]['kind'] == 'gate']
    return ', '.join(gates) if gates else 'nothing, this stage runs without a human'

def parts_slide(title_, lead, view, kids, foot):
    cards = '\n'.join(
        f'  <div class="pc"><div class="pc-top"><span class="pk k-{E[k]["kind"]}">{KIND_TAG.get(E[k]["kind"], E[k]["kind"])}</span>'
        f'<span class="ps">{STATUS.get((E[k].get("tags") or ["-"])[0], "")}</span></div>'
        f'<p class="pn">{E[k]["title"]}</p>{body(E[k])}</div>' for k in kids)
    return f"""---
layout: default
---

# {title_}

<div class="lead">{lead}</div>

<div class="stg">
<div class="dg"><likec4-view view-id="{view}" color-scheme="light" browser="true" class="view-stage"></likec4-view><span class="hint">⤢ Click to explore</span></div>
<div class="pcs n{len(kids)}">
{cards}
</div>
</div>

<p class="sf">{foot}</p>
"""

states_md = (root / 'docs' / 'states.md').read_text(encoding='utf-8')
st_rows = [[c.strip() for c in l.strip().strip('|').split('|')] for l in states_md.splitlines()
           if re.match(r'\| [A-Z]\w+ \| (\d|exit) \|', l)]
# The states slide: a UML state machine in swimlanes by who holds the work item (Operator on top, agents, closed),
# drawn by hand; colours from likec4.config.json. Every documented transition must be drawn (asserted below).
PAL = {'op': '#be123c', 'ag': '#4f46e5', 'hu': '#c2410c', 'end': '#475569'}
W, H = 126, 56
OP, AG, END = 120, 300, 450                   # lane centres
LANES = [('Operator', 64, 176), ('Agents', 244, 356), ('Closed', 394, 506)]
POS = {'TriageReview': (205, OP), 'SpecReview': (375, OP), 'PlanReview': (545, OP), 'Blocked': (780, OP), 'MergeReview': (920, OP), 'TestReview': (1080, OP),
       'Triaging': (120, AG), 'Specifying': (290, AG), 'Planning': (460, AG), 'Implementing': (630, AG), 'Verifying': (1000, AG), 'Releasing': (1170, AG), 'Live': (1330, AG),
       'ForHuman': (115, END), 'Cancelled': (295, END), 'RolledBack': (1190, END), 'Done': (1330, END)}
VW = 1432                                     # width of the drawing
TAG = {'1': '1 · Intake', '2': '2 · Spec', '3': '3 · Plan', '4': '4 · Implement', '5': '5–6 · Checks', '7': '7 · Merge', '8': '8 · Deploy'}
NOTE = {'Blocked': 'from 5–7', 'Cancelled': "won't do", 'ForHuman': 'a human does it', 'RolledBack': '→ new work item', 'TestReview': 'only if declared'}
M, E_, S_ = 'middle', 'end', 'start'
# (source, target, path, [(x, y, anchor, text, halo)]); a halo label sits on its line
EDGES = [
    ('[*]', 'Triaging', 'M38,300 H55', [(30, 328, M, 'signal', 0)]),
    ('Triaging', 'TriageReview', 'M145,272 L180,150', []),
    ('TriageReview', 'Specifying', 'M230,148 L265,270', [(247, 209, M, 'M, L', 1)]),
    ('TriageReview', 'Implementing', 'M205,92 V30 H640 V270', [(420, 22, M, 'accepted, S', 0)]),
    ('TriageReview', 'ForHuman', '', []), ('TriageReview', 'Cancelled', '', []),
    ('Specifying', 'SpecReview', 'M315,272 L350,150', []),
    ('SpecReview', 'Specifying', 'M378,148 C378,240 372,300 355,300', [(386, 250, S_, 'clarify', 0)]),
    ('SpecReview', 'Planning', 'M400,148 L435,270', [(417, 205, M, 'approved', 1)]),
    ('Planning', 'PlanReview', 'M485,272 L520,150', []),
    ('PlanReview', 'Planning', 'M548,148 C548,240 542,300 525,300', [(556, 250, S_, 'redo', 0)]),
    ('PlanReview', 'Implementing', 'M570,148 L605,270', [(587, 205, M, 'approved', 1)]),
    ('Implementing', 'Verifying', 'M693,300 H935', []),
    ('Verifying', 'Implementing', 'M970,328 C970,380 660,380 660,330', [(815, 387, M, 'fix · queue red', 0)]),
    ('Verifying', 'Blocked', 'M950,272 L815,150', [(909, 235, M, 'blocked', 1)]),
    ('Verifying', 'MergeReview', 'M985,272 L945,150', [(952, 200, E_, 'R1, R2', 0)]),
    ('MergeReview', 'Verifying', 'M965,148 L1015,270', [(984, 178, S_, 'merge', 0)]),
    ('Verifying', 'TestReview', 'M1040,272 L1065,150', [(1058, 232, S_, 'env ok', 0)]),
    ('TestReview', 'Releasing', 'M1105,148 L1150,270', [(1127, 200, M, 'approved', 1)]),
    ('Verifying', 'Releasing', 'M1063,300 H1105', [(1084, 264, M, 'merged', 0)]),
    ('MergeReview', 'Implementing', 'M920,92 V52 H665 V270', [(792, 45, M, 'changes · queue red', 0)]),
    ('TestReview', 'Implementing', 'M1080,92 V52 H665 V270', []),
    ('Blocked', 'Implementing', 'M755,148 L688,270', [(721, 209, M, 'sorted out', 1)]),
    ('Releasing', 'Live', 'M1233,300 H1265', [(1249, 264, M, 'released', 0)]),
    ('Live', 'Done', 'M1345,328 V420', [(1353, 368, S_, 'checks', 0), (1353, 385, S_, 'over', 0)]),
    ('Live', 'RolledBack', 'M1300,328 L1225,420', [(1262, 374, M, 'culprit', 1)]),
    ('Live', 'Releasing', 'M1320,272 C1320,222 1185,222 1185,270', [(1252, 226, M, 'rolled back', 0)]),
    ('Done', '[*]', 'M1393,450 H1404', []),
    ('RolledBack', '[*]', '', []),
]
JUNCTION = (205, 400)  # TriageReview's two closing exits share one line down, then split (UML junction)
JUNCTION_PATHS = ['M205,148 V395', 'M201,403 L150,421', 'M209,403 L260,421']

def states_slide():
    rows = {r[0]: r for r in st_rows}
    doc = set(re.findall(r'^\s*(\[\*\]|\w+) --> (\[\*\]|\w+)', states_md, re.M))
    drawn = {(s_, t) for s_, t, *_ in EDGES}
    assert doc == drawn, (doc - drawn, drawn - doc)
    svg = [f'<svg class="sm" viewBox="0 0 {VW} 512" xmlns="http://www.w3.org/2000/svg">',
           '<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
           '<path d="M0,0 L10,5 L0,10 z" fill="#64748b"/></marker></defs>']
    for name, y0, y1 in LANES:
        svg.append(f'<rect x="0" y="{y0}" width="{VW}" height="{y1 - y0}" rx="10" class="ln"/><text x="12" y="{y0 + 20}" class="lt">{name}</text>')
    paths = [d for _, _, d, _ in EDGES if d] + JUNCTION_PATHS
    svg += [f'<path d="{d}" class="tr"' + ('' if d == JUNCTION_PATHS[0] else ' marker-end="url(#ah)"') + '/>' for d in paths]
    svg.append(f'<circle cx="{JUNCTION[0]}" cy="{JUNCTION[1]}" r="5" fill="#64748b"/>')
    for name, (x, y) in POS.items():
        r = rows[name]
        kind = 'end' if name in ('Done', 'Cancelled', 'RolledBack') else 'hu' if name == 'ForHuman' else 'op' if r[4].startswith('**yes') else 'ag'
        svg.append(f'<rect x="{x - W / 2}" y="{y - H / 2}" width="{W}" height="{H}" rx="10" fill="{PAL[kind]}"/>'
                   f'<text x="{x}" y="{y - 3}" class="sn">{name}</text><text x="{x}" y="{y + 17}" class="sg">{NOTE.get(name) or TAG[r[1]]}</text>')
    svg.append('<circle cx="30" cy="300" r="7" fill="#1e293b"/>')
    svg.append(f'<circle cx="{VW - 16}" cy="450" r="10" fill="#fff" stroke="#1e293b" stroke-width="2"/><circle cx="{VW - 16}" cy="450" r="6" fill="#1e293b"/>')
    for _, _, _, labels in EDGES:
        for lx, ly, anc, t, halo in labels:
            if halo:  # a label on its line: a white plate under it, so the line does not run through the words
                w = len(t) * 8 + 12
                svg.append(f'<rect x="{lx - w / 2}" y="{ly - 10}" width="{w}" height="20" rx="4" fill="#fff"/>')
            svg.append(f'<text x="{lx}" y="{ly + (5 if halo else 0)}" text-anchor="{anc}" class="tl">{t}</text>')
    svg.append('</svg>')
    legend = ('<p class="sl"><span class="dot" style="background:#be123c"></span>waits for a person; at most 3 wait for the Operator at once'
              '<span class="dot" style="background:#4f46e5"></span>an agent works'
              '<span class="dot" style="background:#c2410c"></span>a human, outside the pipeline'
              '<span class="dot" style="background:#475569"></span>closed</p>')
    return ('---\nlayout: default\n---\n\n# Work item states\n\n<div class="smw">' + ''.join(svg) + '</div>\n\n' + legend + '\n\n' + part('07-states-note'))


out = [part('00-title'), part('02-how-to-read'),
       "---\n\n# Whole pipeline\n\n<div class=\"dg\"><likec4-view view-id=\"index\" color-scheme=\"light\" browser=\"true\" class=\"view-wide\"></likec4-view><span class=\"hint\">⤢ Click the diagram to explore: zoom, pan, open any stage</span></div>\n\n" + part('03-overview-note'),
       part('04-artifacts'), part('05-size-risk')]
out += [stage_slide(k) for k in STAGES]
out += [states_slide(),
        parts_slide('The engine', 'An abstract view of the engine every stage runs on: any engine with these six parts fits',
                    'platformDeck', ['engine.orchestrator', 'engine.connector', 'engine.setup', 'engine.sandbox', 'engine.cards', 'engine.traces'],
                    '<b>Limits:</b> 3 fix rounds · time and cost per session · ≤ 3 items wait for the Operator · <b>Pause:</b> the Operator stops new sessions')]
(root / 'deck' / 'slides.md').write_text('\n\n'.join(out) + '\n', encoding='utf-8')
print('slides:', sum(1 for _ in re.finditer(r'^---$', '\n'.join(out), re.M)))

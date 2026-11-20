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
END = {'Done', 'Cancelled', 'RolledBack', 'ForHuman'}  # grey: the pipeline is finished with it
def chip(name, who, waits, cls=''):
    kind = 'end' if name in END else ('op' if waits.startswith('**yes') else 'ag')
    who = '' if who in ('—', '-') else f'<i>{who}</i>'
    return f'<div class="sc sc-{kind} {cls}"><b>{name}</b>{who}</div>'
EXITS = {'Blocked': 'Operator decides → back to Implementing, or Cancelled',
         'RolledBack': 'the cause becomes a new work item in New',
         'ForHuman': 'Triage outcome: a human does it, the pipeline tracks it',
         'Cancelled': '"won\'t do" at Triage, or from Blocked'}
def states_slide():
    cols = []
    for i, key in enumerate(STAGES, 1):
        rows = [r for r in st_rows if r[1] == str(i)]
        body = '<span class="sa">↓</span>'.join(chip(r[0], r[3], r[4]) for r in rows)
        if key == 'aiReview':
            v = next(r for r in st_rows if r[0] == 'Verifying')
            body = chip(v[0], 'Validator, inside Verifying', v[4], 'sc-shared')
        if key == 'learn':
            body = '<p class="sn">Creates work items in <b>New</b></p>'
        cols.append(f'<div class="scol"><h4>{title("engine." + key)}</h4>{body}</div>')
    exits = ''.join(f'<div class="sx">{chip(r[0], r[3], r[4])}<p>{EXITS[r[0]]}</p></div>' for r in st_rows if r[1] == 'exit')
    return ('---\nlayout: default\n---\n\n# Work item states\n\n'
            '<div class="lead">Where a work item is now and who it waits for. Left to right along the stages; a red state waits for the Operator</div>\n\n'
            f'<div class="sg">{"".join(cols)}</div>\n\n<h4 class="sxh">Exits</h4>\n<div class="sxs">{exits}</div>\n\n'
            '<p class="sl"><span class="dot op"></span>waits for the Operator, at most 3 work items at once '
            '<span class="dot ag"></span>agents work <span class="dot end"></span>out of the pipeline</p>\n\n' + part('07-states-note'))
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

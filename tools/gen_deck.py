"""Build deck/slides.md from the single sources: LikeC4 model (JSON export),
docs/states.md, docs/decisions.md and hand-written deck/parts/*.md.
Run via `npm run deck:gen`; never edit deck/slides.md by hand."""
import json, re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
model = json.loads(pathlib.Path(sys.argv[1]).read_text())
E, R = model['elements'], model['relations']
KIND = {'agent': 'агент', 'script': 'скрипт', 'gate': 'решает Оператор', 'store': 'хранилище',
        'platform': 'сквозная часть', 'human': 'человек', 'external': 'внешнее', 'phase': 'стадия'}
STATUS = {'built': 'есть', 'planned': 'решено строить', 'idea': 'идея'}
STAGES = ['intake', 'spec', 'plan', 'implement', 'verify', 'aiReview', 'merge', 'deploy', 'learn']
STATES = {  # which task states (docs/states.md) live in each stage
    'intake': 'New → Triaged → Accepted / Cancelled',
    'spec': 'Clarifying → SpecReview',
    'plan': 'Researching (L) → Planning → PlanReview',
    'implement': 'Implementing',
    'verify': 'Verifying (круг ≤ 3, иначе Blocked)',
    'aiReview': 'Verifying → MergeReview (R1/R2) или Merged (R0)',
    'merge': 'MergeReview → Merged',
    'deploy': 'Merged → DeployReview (R2) → Live → Done / RolledBack',
    'learn': 'новые задачи в New',
}

def txt(v):
    if isinstance(v, dict): return (v.get('txt') or v.get('md') or '').strip()
    return (v or '').strip()
def title(fqn): return E[fqn]['title'] if fqn in E else fqn
def cell(s): return s.replace('|', '\\|').replace('\n', ' ')
def part(name): return (root / 'deck' / 'parts' / f'{name}.md').read_text().strip()

def stage_slide(key):
    fqn = f'engine.{key}'; st = E[fqn]
    kids = [k for k in E if k.startswith(fqn + '.') and k.count('.') == fqn.count('.') + 1]
    inside = lambda x: x == fqn or x.startswith(fqn + '.')
    ins, outs = [], []
    for r in R.values():
        s, t = r['source']['model'], r['target']['model']
        if inside(t) and not inside(s): ins.append(f"{title(s)} → {title(t)}: {r.get('title','')}")
        if inside(s) and not inside(t): outs.append(f"{title(s)} → {title(t)}: {r.get('title','')}")
    rows = '\n'.join(f"| **{cell(E[k]['title'])}** | {KIND.get(E[k]['kind'], E[k]['kind'])} | {STATUS.get((E[k].get('tags') or ['-'])[0], '—')} | {cell(txt(E[k].get('description')))} |" for k in kids)
    gates = [E[k]['title'] for k in kids if E[k]['kind'] == 'gate']
    return f"""---
layout: default
---

# {st['title']}

<div class="lead">{txt(st.get('description'))}</div>

<div class="grid2">
<div>

<img src="/views/{key}.png" class="view" />

**Состояния задачи:** {STATES[key]}

**Решает Оператор:** {', '.join(gates) if gates else 'ничего — стадия идёт без человека'}

</div>
<div>

| Часть | Кто | Статус | Что делает |
|---|---|---|---|
{rows}

<details><summary>Вход и выход стадии</summary>

**Приходит:**{''.join(chr(10)+'- '+cell(x) for x in ins) or ' —'}

**Уходит:**{''.join(chr(10)+'- '+cell(x) for x in outs) or ' —'}

</details>
</div>
</div>
"""

states_md = (root / 'docs' / 'states.md').read_text()
blocks = re.findall(r'### (.*?)\n\n```mermaid\n(.*?)```', states_md, re.S)
dec = (root / 'docs' / 'decisions.md').read_text()
dec_rows = [l for l in dec.splitlines() if re.match(r'\| \d+ \|', l)]
dec_tbl = '| # | Вопрос | Решение |\n|---|---|---|\n' + '\n'.join(
    '| ' + ' | '.join(c.strip() for c in l.strip('|').split('|')[:3]) + ' |' for l in dec_rows)

out = [part('00-title'), part('01-why'), part('02-how-to-read'),
       "---\n\n# Весь конвейер\n\n<img src=\"/views/index.png\" class=\"view-wide\" />\n\n" + part('03-overview-note'),
       part('04-artifacts'), part('05-size-risk')]
out += [stage_slide(k) for k in STAGES]
out += ["---\n\n# Путь одной задачи\n\n<img src=\"/views/task.png\" class=\"view-wide\" />\n\n" + part('06-task-note'),
        *["---\n\n# Состояния задачи\n\n**" + t + "**\n\n```mermaid {scale: 0.42}\n" + m + "```\n\n" + part('07-states-note') for t, m in blocks],
        "---\n\n# Сквозные части\n\n<img src=\"/views/platform.png\" class=\"view-wide\" />\n",
        "---\nlayout: default\n---\n\n# Принятые решения\n\n<div class=\"small\">\n\n" + dec_tbl + "\n\n</div>\n",
        part('08-open')]
(root / 'deck' / 'slides.md').write_text('\n\n'.join(out) + '\n')
print('slides:', sum(1 for _ in re.finditer(r'^---$', '\n'.join(out), re.M)))

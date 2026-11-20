"""Merge F1 + F1b into atlas.json: add new areas, fold S6b into S6, split X1/X5 by assignment."""
import json, sys
f1 = json.load(open(sys.argv[1])); f1b = json.load(open(sys.argv[2]))
areas = {r['area_id']: r for r in f1['areas']}
for r in f1b['areas']:
    if r['area_id'] == 'S6b':
        s6 = areas['S6']
        s6['summary'] += '\n\n**Non-functional gates (added in F1b).** ' + r['summary']
        for k in ('approaches', 'candidates', 'gaps', 'not_searched'):
            s6[k] += r[k]
        s6['deep_dive_priority'] += [x for x in r['deep_dive_priority'][:2]]
    else:
        areas[r['area_id']] = r
# split X1/X5
assign = {(i['name'], i['is_approach']): i['to'] for i in f1b['split']['items']}
pool_c = {}; pool_a = {}
for k in ('X1', 'X5'):
    for c in areas[k]['candidates']: pool_c.setdefault(c['name'], c)
    for a in areas[k]['approaches']: pool_a.setdefault(a['name'], a)
unassigned = []
for k in ('X1', 'X5'):
    keep_c, keep_a = [], []
    for n, c in pool_c.items():
        to = assign.get((n, False))
        if to is None: unassigned.append(n); to = None
        if to in (k, 'both') or (to is None and c in areas[k]['candidates']): keep_c.append(c)
    for n, a in pool_a.items():
        to = assign.get((n, True))
        if to in (k, 'both') or (to is None and a in areas[k]['approaches']): keep_a.append(a)
    areas[k]['candidates'], areas[k]['approaches'] = keep_c, keep_a
json.dump({'areas': list(areas.values()), 'critic': f1.get('critic')}, open(sys.argv[3], 'w'))
print('areas', len(areas), 'X1', len(areas['X1']['candidates']), 'X5', len(areas['X5']['candidates']), 'unassigned', len(set(unassigned)))

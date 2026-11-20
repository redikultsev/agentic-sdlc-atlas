"""Hand-placed layouts for deck stage views whose auto layout reads poorly.

Reads a LikeC4 JSON export, places the nodes of each view in LAYOUTS on a grid,
draws smooth side-anchored curves and writes .likec4/<view>.likec4.snap (manual layout).
Usage: python3 tools/layout_deck.py <export.json>   (tools/build.sh runs it before the deck build)
"""
import json, pathlib, sys

root = pathlib.Path(__file__).resolve().parent.parent
model = json.loads(pathlib.Path(sys.argv[1]).read_text())
if isinstance(model, list):
    model = model[0]

COL, ROW = 400, 200          # grid pitch
PAD_X, PAD_TOP, PAD_BOTTOM = 40, 60, 40   # container padding around its children

# view id -> {element id: (column, row)}; containers are sized around their children
LAYOUTS = {
    'planDeck': {
        'engine.spec': (0, 0), 'operator': (0, 2),
        'engine.plan.researcher': (1, 0), 'engine.plan.planner': (1, 1), 'engine.plan.planGate': (1, 2),
        'docs': (2, 0), 'engine.implement': (2, 2),
    },
}


def lay(view):
    grid = LAYOUTS[view['id']]
    nodes = {n['id']: n for n in view['nodes']}
    for nid, (c, r) in grid.items():
        n = nodes[nid]
        dx, dy = c * COL - n['x'], r * ROW - n['y']
        n['x'] += dx; n['y'] += dy
        if n.get('labelBBox'):
            n['labelBBox']['x'] += dx; n['labelBBox']['y'] += dy
    for n in view['nodes']:  # containers
        kids = [nodes[k] for k in n.get('children') or []]
        if not kids:
            continue
        x0 = min(k['x'] for k in kids) - PAD_X; y0 = min(k['y'] for k in kids) - PAD_TOP
        x1 = max(k['x'] + k['width'] for k in kids) + PAD_X; y1 = max(k['y'] + k['height'] for k in kids) + PAD_BOTTOM
        if n.get('labelBBox'):
            n['labelBBox']['x'] += x0 - n['x']; n['labelBBox']['y'] += y0 - n['y']
        n.update(x=x0, y=y0, width=x1 - x0, height=y1 - y0)

    box = lambda n: (n['x'], n['y'], n['width'], n['height'])
    # anchors: same column -> bottom to top; otherwise right side to left side
    ends = []
    for e in view['edges']:
        sx, sy, sw, sh = box(nodes[e['source']]); tx, ty, tw, th = box(nodes[e['target']])
        if abs((sx + sw / 2) - (tx + tw / 2)) < 50:
            a, b, vertical = [sx + sw / 2, sy + sh], [tx + tw / 2, ty], True
        elif tx > sx:
            a, b, vertical = [sx + sw, sy + sh / 2], [tx, ty + th / 2], False
        else:
            a, b, vertical = [sx, sy + sh / 2], [tx + tw, ty + th / 2], False
        ends.append((e, a, b, vertical))
    # spread edges that share an anchor point
    for i in (1, 2):
        groups = {}
        for item in ends:
            groups.setdefault(tuple(item[i]), []).append(item)
        for items in groups.values():
            if len(items) > 1:
                for k, item in enumerate(sorted(items, key=lambda it: it[2 if i == 1 else 1][1])):
                    off = (k - (len(items) - 1) / 2) * 36
                    item[i][0 if item[3] else 1] += off
    for e, a, b, vertical in ends:
        if vertical:
            k = (b[1] - a[1]) * 0.5; c1, c2 = [a[0], a[1] + k], [b[0], b[1] - k]
        else:
            k = (b[0] - a[0]) * 0.5; c1, c2 = [a[0] + k, a[1]], [b[0] - k, b[1]]
        e['points'] = [[round(p[0]), round(p[1])] for p in (a, c1, c2, b)]
        e.pop('controlPoints', None)
        lw = (e.get('labelBBox') or {}).get('width', 60); lh = (e.get('labelBBox') or {}).get('height', 24)
        mx, my = (a[0] + 3 * c1[0] + 3 * c2[0] + b[0]) / 8, (a[1] + 3 * c1[1] + 3 * c2[1] + b[1]) / 8
        e['labelBBox'] = {'x': round(mx - lw - 12 if vertical else mx - lw / 2), 'y': round(my - lh / 2 - (0 if vertical else 18)), 'width': lw, 'height': lh}
        e['isLabelCustomized'] = True

    xs = [v for n in view['nodes'] for v in (n['x'], n['x'] + n['width'])]
    ys = [v for n in view['nodes'] for v in (n['y'], n['y'] + n['height'])]
    view['bounds'] = {'x': min(xs) - 40, 'y': min(ys) - 40, 'width': max(xs) - min(xs) + 80, 'height': max(ys) - min(ys) + 80}
    view['_layout'] = 'manual'
    out = root / '.likec4' / f"{view['id']}.likec4.snap"
    out.write_text(json.dumps(view, indent=2) + '\n')
    print('laid out', view['id'], view['bounds'])


for vid in LAYOUTS:
    lay(model['views'][vid])

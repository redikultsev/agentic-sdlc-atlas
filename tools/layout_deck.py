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
        'docs': (2, 0), 'tracker': (2, 1), 'engine.implement': (2, 2),
    },
    'verifyDeck': {
        'engine.implement': (0, 0.75),
        'engine.verify.checks': (1, 0), 'engine.verify.reviewer': (1, 1.5), 'engine.aiReview': (1, 3),
        'ci': (2, 0), 'docs': (2, 1), 'engine.sandbox': (2, 2), 'changes': (2, 3),
    },
    'aiReviewDeck': {
        'engine.verify': (0, 0), 'docs': (0, 1),
        'engine.aiReview.validator': (1, 0.5),
        'engine.implement': (2, -0.5), 'changes': (2, 0.5), 'engine.merge': (2, 1.5), 'engine.sandbox': (1, 2),
    },
    'implementDeck': {
        'engine.orchestrator': (1, 0), 'engine.sandbox': (2, 0),
        'engine.intake': (0, 1), 'engine.plan': (0, 2), 'engine.aiReview': (0, 3), 'engine.merge': (0, 4),
        'engine.implement.implementer': (1, 2.5),
        'engine.verify': (2, 1), 'docs': (2, 2), 'changes': (2, 3),
    },
    'mergeDeck': {
        'engine.aiReview': (0, 0), 'operator': (0, 1.5), 'engine.implement': (0, 3),
        'engine.merge.r0check': (1, 0), 'engine.merge.mergeGate': (1, 1.5), 'engine.merge.land': (1, 3),
        'engine.deploy': (1, 4.3),
        'docs': (2, 0), 'changes': (2, 3),
    },
}

# edges that skip a block in the same column: drawn as an arc around its right side
BYPASS = {
    'mergeDeck': {('engine.merge.r0check', 'engine.merge.land')},
}


def lay(view):
    grid = LAYOUTS[view['id']]
    nodes = {n['id']: n for n in view['nodes']}
    for nid, pos in grid.items():  # (column, row) or (column, row, height in px) for a tall block
        n = nodes[nid]
        c, r = pos[0], pos[1]
        dx, dy = c * COL - n['x'], r * ROW - n['y']
        n['x'] += dx; n['y'] += dy
        if n.get('labelBBox'):
            n['labelBBox']['x'] += dx; n['labelBBox']['y'] += dy
        if len(pos) > 2:
            grow = pos[2] - n['height']; n['height'] = pos[2]
            if n.get('labelBBox'):
                n['labelBBox']['y'] += grow / 2
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
    ends, loops, arcs = [], [], []
    for e in view['edges']:
        sx, sy, sw, sh = box(nodes[e['source']]); tx, ty, tw, th = box(nodes[e['target']])
        if e['source'] == e['target']:
            loops.append(e); continue
        if (e['source'], e['target']) in BYPASS.get(view['id'], set()):
            arcs.append(e); continue
        if abs((sx + sw / 2) - (tx + tw / 2)) < 50:
            down = ty > sy
            cx = (max(sx, tx) + min(sx + sw, tx + tw)) / 2  # one shared x, so the edge is straight
            a, b, vertical = [cx, sy + sh if down else sy], [cx, ty if down else ty + th], True
        elif tx > sx:
            a, b, vertical = [sx + sw, sy + sh / 2], [tx, ty + th / 2], False
        else:
            a, b, vertical = [sx, sy + sh / 2], [tx + tw, ty + th / 2], False
        ends.append((e, a, b, vertical))
    # spread edge ends that share an anchor point (incoming and outgoing alike), ordered by where the other end is
    groups = {}
    for e, a, b, vertical in ends:
        sn, tn = nodes[e['source']], nodes[e['target']]
        side = lambda n: n['width'] if vertical else n['height']
        groups.setdefault(tuple(a), []).append((a, b, vertical, side(sn)))
        groups.setdefault(tuple(b), []).append((b, a, vertical, side(tn)))
    for items in groups.values():
        if len(items) > 1:
            axis = lambda it: 0 if it[2] else 1
            items.sort(key=lambda it: it[1][axis(it)])
            step = min(60, items[0][3] * 0.8 / (len(items) - 1))  # spread over most of the block side
            for k, it in enumerate(items):
                it[0][axis(it)] += (k - (len(items) - 1) / 2) * step
    for e, a, b, vertical in ends:
        if vertical:
            k = (b[1] - a[1]) * 0.5; c1, c2 = [a[0], a[1] + k], [b[0], b[1] - k]
        else:
            k = (b[0] - a[0]) * 0.5; c1, c2 = [a[0] + k, a[1]], [b[0] - k, b[1]]
        place_edge(e, a, c1, c2, b, vertical)
    for e in arcs:  # from the lower right of the source to the upper right of the target
        sx, sy, sw, sh = box(nodes[e['source']]); tx, ty, tw, th = box(nodes[e['target']])
        a, b = [sx + sw, sy + sh * 0.8], [tx + tw, ty + th * 0.2]
        place_edge(e, a, [a[0] + 110, a[1]], [b[0] + 110, b[1]], b, False, right=True)
        for n in view['nodes']:  # keep the arc inside the container of both ends
            kids = n.get('children') or []
            if e['source'] in kids and e['target'] in kids:
                n['width'] = max(n['width'], a[0] + 82 + PAD_X - n['x'])
    for e in loops:  # a loop over the top-left corner of its block
        x, y, w, h = box(nodes[e['source']])
        a, b = [x, y + h * 0.3], [x + w * 0.3, y]
        place_edge(e, a, [a[0] - 70, a[1]], [b[0], b[1] - 70], b, False)

    xs = [v for n in view['nodes'] for v in (n['x'], n['x'] + n['width'])]
    ys = [v for n in view['nodes'] for v in (n['y'], n['y'] + n['height'])]
    view['bounds'] = {'x': min(xs) - 40, 'y': min(ys) - 40, 'width': max(xs) - min(xs) + 80, 'height': max(ys) - min(ys) + 80}
    view['_layout'] = 'manual'
    out = root / '.likec4' / f"{view['id']}.likec4.snap"
    out.write_text(json.dumps(view, indent=2) + '\n')
    print('laid out', view['id'], view['bounds'])


def place_edge(e, a, c1, c2, b, vertical, right=False):
    e['points'] = [[round(p[0]), round(p[1])] for p in (a, c1, c2, b)]
    e.pop('controlPoints', None)
    lw = (e.get('labelBBox') or {}).get('width', 60); lh = (e.get('labelBBox') or {}).get('height', 24)
    mx, my = (a[0] + 3 * c1[0] + 3 * c2[0] + b[0]) / 8, (a[1] + 3 * c1[1] + 3 * c2[1] + b[1]) / 8
    if right:  # label to the right of an arc
        lx, ly = mx + 12, my - lh / 2
    elif vertical:  # label to the left of a vertical edge
        lx, ly = mx - lw - 12, my - lh / 2
    else:  # label above a horizontal edge
        lx, ly = mx - lw / 2, my - lh / 2 - 18
    e['labelBBox'] = {'x': round(lx), 'y': round(ly), 'width': lw, 'height': lh}
    e['isLabelCustomized'] = True


for vid in LAYOUTS:
    lay(model['views'][vid])

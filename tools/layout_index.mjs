// Lays out the overview view ("index") on a clean grid and writes its manual layout snapshot.
// Operator on top, the nine stages in one row, stores below their stages, straight non-crossing edges.
// Run after `likec4` has written .likec4/index.likec4.snap (any manual nudge in the editor creates it).
import fs from 'node:fs'
const F = '.likec4/index.likec4.snap'
const d = (new Function('return (' + fs.readFileSync(F, 'utf8') + ')'))()

const STAGES = ['intake', 'spec', 'plan', 'implement', 'verify', 'aiReview', 'merge', 'deploy', 'learn'].map(s => 'engine.' + s)
const W = 320, H = 180, PITCH = 440, X0 = 100
const ROW_Y = 620, STORE_Y = 1090, OP_Y = 120
const col = i => X0 + i * PITCH
const node = id => d.nodes.find(n => n.id === id)
const place = (id, x, y) => { const n = node(id); if (!n) throw new Error('no node ' + id); n.x = x; n.y = y; if (!n.width) n.width = W }

STAGES.forEach((id, i) => place(id, col(i), ROW_Y))
const centerOf = i => col(i) + W / 2
place('operator', centerOf(4) - W / 2, OP_Y)
// stores directly under their writers; docs between Spec and Plan
const stores = { tracker: centerOf(0), docs: (centerOf(1) + centerOf(2)) / 2, changes: centerOf(3), ci: centerOf(4), releases: centerOf(7), prod: centerOf(8) }
for (const [id, cx] of Object.entries(stores)) place(id, cx - node(id).width / 2, STORE_Y)

const eng = node('engine')
eng.x = col(0) - 40; eng.y = ROW_Y - 60; eng.width = col(8) + W + 40 - eng.x; eng.height = H + 100

const box = id => { const n = node(id); return { x: n.x, y: n.y, w: n.width, h: n.height, cx: n.x + n.width / 2, cy: n.y + n.height / 2 } }
const line = (a, b) => { const p = t => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t)]; return [p(0), p(1 / 3), p(2 / 3), p(1)] }
const at = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

for (const e of d.edges) {
  const s = box(e.source), t = box(e.target)
  let a, b, lt = 0.5, dy = -16
  if (e.source === 'operator') { a = [s.cx, s.y + s.h]; b = [t.cx, t.y]; lt = 0.72 }
  else if (STAGES.includes(e.source) && STAGES.includes(e.target)) { a = [s.x + s.w, s.cy]; b = [t.x, t.cy]; dy = -22 }
  else { a = [s.cx, s.y + s.h]; b = [t.cx, t.y]; dy = 0 }
  e.points = line(a, b)
  e.controlPoints = [{ x: Math.round((a[0] + b[0]) / 2), y: Math.round((a[1] + b[1]) / 2) }]
  const lw = e.labelBBox?.width ?? 60, lh = e.labelBBox?.height ?? 24
  const [mx, my] = at(a, b, lt)
  const off = dy === 0 ? 14 : 0
  e.labelBBox = { x: Math.round(mx - lw / 2 + off + (dy === 0 ? lw / 2 + 4 : 0)), y: Math.round(my - lh / 2 + dy), width: lw, height: lh }
  e.isLabelCustomized = true
}

const xs = d.nodes.flatMap(n => [n.x, n.x + n.width]), ys = d.nodes.flatMap(n => [n.y, n.y + n.height])
d.bounds = { x: Math.min(...xs) - 40, y: Math.min(...ys) - 40, width: Math.max(...xs) - Math.min(...xs) + 80, height: Math.max(...ys) - Math.min(...ys) + 80 }
fs.writeFileSync(F, JSON.stringify(d, null, 2) + '\n')
console.log('laid out', d.nodes.length, 'nodes,', d.edges.length, 'edges; bounds', JSON.stringify(d.bounds))

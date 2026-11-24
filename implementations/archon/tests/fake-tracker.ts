/**
 * An in-memory tracker behind the connector's adapter seam: items with labels and
 * comments, and switches a test flips to make the tracker go down, refuse a write, or
 * lose a write's answer after it landed. Every adapter call is recorded.
 */
import { type Adapter, type ItemComment, TrackerError } from '../.shared/connector.ts';

type Item = { open: boolean; title: string; body: string; labels: string[]; comments: ItemComment[]; creator: string };

export function fakeTracker() {
  const items = new Map<string, Item>();
  const calls: string[] = [];
  let next = 100;
  let nextComment = 1;
  const t = {
    items,
    calls,
    /** Every call fails as an outage. */
    down: false,
    /** Writes refused, by operation (`label.add`, `comment`, `create`, `close`) or by label name. */
    refuse: new Set<string>(),
    /** The next write of this operation lands but its answer is lost (the host gave none). */
    loseAnswer: new Set<string>(),
    item(key: string, labels: string[] = [], body = 'body') {
      items.set(key, { open: true, title: `item ${key}`, body, labels: [...labels], comments: [], creator: 'alice' });
    },
    labels(key: string) {
      return [...(items.get(key)?.labels ?? [])];
    },
    adapter: null as unknown as Adapter,
  };
  const get = (op: string, key: string): Item => {
    calls.push(`${op} ${key}`);
    if (t.down) throw new TrackerError('outage', op, 'tracker unreachable');
    const item = items.get(key);
    if (!item) throw new TrackerError('refused', op, `no item ${key}`);
    return item;
  };
  const write = (op: string, name = '') => {
    if (t.refuse.has(op) || (name !== '' && t.refuse.has(name))) throw new TrackerError('refused', op, `${name || op} is required`);
  };
  const lost = (op: string) => {
    if (t.loseAnswer.delete(op)) throw new TrackerError('outage', op, 'no answer');
  };
  t.adapter = {
    name: 'fake',
    lacks: new Set(),
    url: key => `https://tracker.example/${key}`,
    async view(key) {
      const i = get('view', key);
      return { key, open: i.open, title: i.title, body: i.body, labels: [...i.labels], creator: { id: i.creator, login: i.creator, bot: false }, url: `https://tracker.example/${key}` };
    },
    async comments(key) {
      return get('comments', key).comments.map(c => ({ ...c }));
    },
    async addComment(key, _marker, body) {
      const i = get('comment', key);
      write('comment');
      const id = `c${nextComment++}`;
      i.comments.push({ id, body, author: 'pipeline', url: `https://tracker.example/${key}#${id}` });
      lost('comment');
      return id;
    },
    async editComment(key, id, _marker, body) {
      const i = get('comment.edit', key);
      write('comment');
      const c = i.comments.find(x => x.id === id);
      if (c) (c as { body: string }).body = body;
    },
    async addLabel(key, label) {
      const i = get('label.add', key);
      write('label.add', label);
      if (!i.labels.includes(label)) i.labels.push(label);
    },
    async removeLabel(key, label) {
      const i = get('label.remove', key);
      write('label.remove', label);
      i.labels = i.labels.filter(l => l !== label);
    },
    async create(_marker, title, body) {
      calls.push('create');
      if (t.down) throw new TrackerError('outage', 'create', 'tracker unreachable');
      write('create');
      const key = `#${next++}`;
      items.set(key, { open: true, title, body, labels: [], comments: [], creator: 'pipeline' });
      lost('create');
      return key;
    },
    async close(key) {
      const i = get('close', key);
      write('close');
      i.open = false;
    },
    async list(label) {
      calls.push(`list ${label ?? ''}`);
      if (t.down) throw new TrackerError('outage', 'list', 'tracker unreachable');
      return [...items.entries()].filter(([, i]) => i.open && (label === null || i.labels.includes(label))).map(([key, i]) => ({ key, title: i.title, labels: [...i.labels] }));
    },
    async slice() {},
    async blockedBy() {},
    async blockers() {
      return [];
    },
    async labelSetBy() {
      return null;
    },
    async ensureLabel() {},
    async close_() {},
  };
  return t;
}

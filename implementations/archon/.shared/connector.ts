/**
 * The one way engine code reaches the project's tracker (decisions 46, 47). Callers name
 * an item by its key (`#12`, `PROJ-123`) and never see which tracker holds it.
 *
 * Two adapters sit behind it:
 * - the code host's issues through Archon's forge (and `gh` for what the forge lacks),
 *   when the project has no map; the pack's first projects run this way;
 * - a project map, `.pipeline/tracker.yaml` on the base branch: for each operation the
 *   MCP tool and its arguments, and where each field of the answer is (`map.ts`).
 *
 * What the connector adds to either, the write rules of decision 47:
 * 1. Every write has a key (a comment's marker, a create's marker, a label's name). It is
 *    saved in the engine's ledger `ledger/<item>` before the write and the id of what was
 *    made after it, so a retry edits what it made instead of writing it twice.
 * 2. Every write is read back by the item's key, never through search.
 * 3. A comment or label write while the tracker is down is queued in the ledger, the
 *    latest per write key, and written by `flush` on the item's next write or by
 *    unify-revisit; a create or close in an outage throws, and the node's retry waits.
 *    Reads in an outage throw `TrackerError('outage')`.
 * 4. A write the tracker refuses (a required field, a validator, no right) is recorded and
 *    thrown as `TrackerError('refused')`: a difference for the Operator, never a fix round.
 *
 * Scripts open the connector lazily and close it in `script()`, so an MCP server started
 * for a run ends with it.
 */

import { input, refuse, state } from 'archon:script';
import { forge, ForgeError } from './forge.ts';
import { type ItemKey, issueKey, issueNumber, keySlug } from './item.ts';
import { mapAdapter, parseMap } from './map.ts';
import { fromBase } from './policy.ts';
import { repoOf, type Repo } from './repo.ts';

export interface Creator {
  readonly id: string;
  readonly login: string | null;
  readonly bot: boolean;
}

export interface ItemView {
  readonly key: ItemKey;
  readonly open: boolean;
  readonly title: string;
  readonly body: string;
  readonly labels: readonly string[];
  /** Who created the item. On Jira the creator, never the reporter (decision 47). */
  readonly creator: Creator | null;
  readonly url: string;
}

export interface ItemComment {
  readonly id: string;
  readonly body: string;
  /** The author's login, as trust lists name people; null when the tracker does not say. */
  readonly author: string | null;
  readonly url: string;
}

export interface Listed {
  readonly key: ItemKey;
  readonly title: string;
  readonly labels: readonly string[];
}

export type CloseReason = 'completed' | 'not_planned';

/** What a tracker may lack; the engine holds slices and links anyway (decision 45). */
export type OptionalOp = 'create' | 'close' | 'list' | 'slice' | 'blocked-by' | 'blockers' | 'label-set-by' | 'label-ensure' | 'comment-edit';

export class TrackerError extends Error {
  constructor(
    /** outage: down, slow or unreachable, a retry may pass; refused: the tracker said no to this write. */
    readonly kind: 'outage' | 'refused',
    readonly op: string,
    message: string
  ) {
    super(`${op}: ${message}`);
  }
}

/** What a tracker implements; the connector adds the ledger, the read-back and the queue. */
export interface Adapter {
  readonly name: string;
  readonly lacks: ReadonlySet<OptionalOp>;
  url(key: ItemKey): string;
  view(key: ItemKey): Promise<ItemView>;
  comments(key: ItemKey): Promise<ItemComment[]>;
  /** Adds a comment; returns its id. `marker` is the write key; an adapter may show it, the map does not. */
  addComment(key: ItemKey, marker: string, body: string): Promise<string>;
  editComment(key: ItemKey, id: string, marker: string, body: string): Promise<void>;
  addLabel(key: ItemKey, label: string): Promise<void>;
  removeLabel(key: ItemKey, label: string): Promise<void>;
  create(marker: string, title: string, body: string): Promise<ItemKey>;
  close(key: ItemKey, reason: CloseReason): Promise<void>;
  /** Open items, oldest first; with `label`, only those carrying it. */
  list(label: string | null): Promise<Listed[]>;
  slice(parent: ItemKey, child: ItemKey): Promise<void>;
  blockedBy(item: ItemKey, blocker: ItemKey): Promise<void>;
  /** The items `item` is blocked by. */
  blockers(item: ItemKey): Promise<ItemKey[]>;
  labelSetBy(key: ItemKey, label: string): Promise<string | null>;
  ensureLabel(name: string, color: string, description: string): Promise<void>;
  close_(): Promise<void>;
}

// --- the ledger --------------------------------------------------------------------------

type Pending = { kind: 'comment'; marker: string; body: string } | { kind: 'label'; label: string; add: boolean };

export interface Ledger {
  /** Write key → the id of what it made; null while the write is under way. */
  writes: Record<string, { at: string; id: string | null }>;
  /** Writes waiting for the tracker to come back, the latest per write key. */
  pending: Record<string, Pending>;
  /** Writes the tracker refused, for the Operator (decision 45). */
  refused: Record<string, { at: string; message: string }>;
}

/** `ledger/<item>`, or `ledger/project` for writes that belong to no item (a register). */
export function ledgerName(scope: ItemKey | 'project'): string {
  return `ledger/${scope === 'project' ? 'project' : keySlug(scope)}`;
}

export function readLedger(scope: ItemKey | 'project'): Ledger {
  const value = state.get(ledgerName(scope)).value as Partial<Ledger> | null;
  return { writes: {}, pending: {}, refused: {}, ...(value ?? {}) };
}

function updateLedger(scope: ItemKey | 'project', change: (ledger: Ledger) => void): void {
  const name = ledgerName(scope);
  for (let attempt = 0; attempt < 3; attempt++) {
    const found = state.get(name);
    const ledger: Ledger = { writes: {}, pending: {}, refused: {}, ...((found.value as Partial<Ledger> | null) ?? {}) };
    change(ledger);
    if (state.put(name, ledger, { ifRevision: found.revision }).ok) return;
  }
  throw new Error(`${name} kept moving under three writes`);
}

// --- the connector -----------------------------------------------------------------------

const now = () => new Date().toISOString();
const same = (a: string, b: string) => a.replace(/\r\n/g, '\n').trim() === b.replace(/\r\n/g, '\n').trim();

export class Tracker {
  constructor(readonly adapter: Adapter) {}

  get name(): string {
    return this.adapter.name;
  }

  has(op: OptionalOp): boolean {
    return !this.adapter.lacks.has(op);
  }

  url(key: ItemKey): string {
    return this.adapter.url(key);
  }

  view(key: ItemKey): Promise<ItemView> {
    return this.adapter.view(key);
  }

  comments(key: ItemKey): Promise<ItemComment[]> {
    return this.adapter.comments(key);
  }

  list(label: string | null = null): Promise<Listed[]> {
    this.need('list');
    return this.adapter.list(label);
  }

  /**
   * Write the comment `marker` names, once: a retry or a second run edits the one it made
   * (where the tracker can edit) or leaves it. Read back. Returns its id, or null when the
   * tracker is down and the write was queued.
   */
  async comment(key: ItemKey, marker: string, body: string): Promise<string | null> {
    const write = `comment:${marker}`;
    try {
      await this.flush(key);
      const id = await this.commentNow(key, write, marker, body);
      this.clearPending(key, write);
      return id;
    } catch (error) {
      return this.queueOrThrow(key, write, error, { kind: 'comment', marker, body });
    }
  }

  /** Add and remove labels, each only when needed; read back. Queued in an outage. */
  async label(key: ItemKey, change: { add?: readonly string[]; remove?: readonly string[] }): Promise<void> {
    const add = change.add ?? [];
    const remove = (change.remove ?? []).filter(l => !add.includes(l));
    try {
      await this.flush(key);
      await this.labelNow(key, add, remove);
      for (const label of [...add, ...remove]) this.clearPending(key, `label:${label}`);
    } catch (error) {
      if (!(error instanceof TrackerError && error.kind === 'outage')) {
        if (error instanceof TrackerError) this.recordRefusal(key, `label:${[...add, ...remove].join(',')}`, error);
        throw error;
      }
      updateLedger(key, ledger => {
        for (const label of add) ledger.pending[`label:${label}`] = { kind: 'label', label, add: true };
        for (const label of remove) ledger.pending[`label:${label}`] = { kind: 'label', label, add: false };
      });
    }
  }

  /**
   * Create an item, once per `marker` in `scope` (the item it belongs to, or `project`).
   * Read back by the key the tracker gave. Throws in an outage: nothing is queued.
   */
  async create(scope: ItemKey | 'project', marker: string, title: string, body: string): Promise<ItemKey> {
    this.need('create');
    const write = `create:${marker}`;
    const done = readLedger(scope).writes[write];
    if (done?.id) return done.id;
    if (done && done.id === null) {
      // A run stopped between the write and saving its id: look for it once, directly.
      const found = (await this.adapter.list(null)).find(item => same(item.title, title));
      if (found) {
        updateLedger(scope, l => (l.writes[write] = { at: now(), id: found.key }));
        return found.key;
      }
    }
    updateLedger(scope, l => (l.writes[write] = { at: now(), id: null }));
    let key: ItemKey;
    try {
      key = await this.adapter.create(marker, title, body);
    } catch (error) {
      if (error instanceof TrackerError && error.kind === 'refused') this.recordRefusal(scope, write, error);
      throw error;
    }
    updateLedger(scope, l => (l.writes[write] = { at: now(), id: key }));
    const back = await this.adapter.view(key);
    if (!same(back.title, title)) throw new TrackerError('outage', 'create', `${key} reads back as "${back.title}"`);
    return key;
  }

  /** Close the item unless it is closed; read back. Throws in an outage. */
  async close(key: ItemKey, reason: CloseReason): Promise<void> {
    this.need('close');
    if (!(await this.adapter.view(key)).open) return;
    try {
      await this.adapter.close(key, reason);
    } catch (error) {
      if (error instanceof TrackerError && error.kind === 'refused') this.recordRefusal(key, `close:${reason}`, error);
      throw error;
    }
    if ((await this.adapter.view(key)).open) throw new TrackerError('refused', 'close', `${key} is still open after closing`);
  }

  /** Show `child` as a slice of `parent`. False where the tracker has no such link. */
  async slice(parent: ItemKey, child: ItemKey): Promise<boolean> {
    if (!this.has('slice')) return false;
    await this.adapter.slice(parent, child);
    return true;
  }

  /** Show that `item` is blocked by `blocker`. False where the tracker has no such link. */
  async blockedBy(item: ItemKey, blocker: ItemKey): Promise<boolean> {
    if (!this.has('blocked-by')) return false;
    await this.adapter.blockedBy(item, blocker);
    return true;
  }

  /** What blocks `item` in the tracker, with whether each is open; null where the tracker does not say. */
  async blockers(item: ItemKey): Promise<{ readonly key: ItemKey; readonly open: boolean }[] | null> {
    if (!this.has('blockers')) return null;
    const keys = await this.adapter.blockers(item);
    return Promise.all(keys.map(async key => ({ key, open: (await this.adapter.view(key)).open })));
  }

  /** Who last set `label` on the item, or null when the tracker does not say. */
  labelSetBy(key: ItemKey, label: string): Promise<string | null> {
    return this.has('label-set-by') ? this.adapter.labelSetBy(key, label) : Promise.resolve(null);
  }

  /** Make sure a label exists where the tracker needs labels made first. */
  async ensureLabel(name: string, color: string, description: string): Promise<void> {
    if (this.has('label-ensure')) await this.adapter.ensureLabel(name, color, description);
  }

  /** Write what waits for the item; the latest per write key. Returns how many were written. */
  async flush(key: ItemKey): Promise<number> {
    const pending = Object.entries(readLedger(key).pending);
    if (pending.length === 0) return 0;
    const labels = pending.flatMap(([, p]) => (p.kind === 'label' ? [p] : []));
    if (labels.length > 0) {
      await this.labelNow(
        key,
        labels.filter(l => l.add).map(l => l.label),
        labels.filter(l => !l.add).map(l => l.label)
      );
    }
    for (const [write, p] of pending) if (p.kind === 'comment') await this.commentNow(key, write, p.marker, p.body);
    updateLedger(key, ledger => {
      for (const [write] of pending) delete ledger.pending[write];
    });
    return pending.length;
  }

  /** The writes that wait for the tracker and the ones it refused. */
  waiting(key: ItemKey): { readonly pending: number; readonly refused: Ledger['refused'] } {
    const ledger = readLedger(key);
    return { pending: Object.keys(ledger.pending).length, refused: ledger.refused };
  }

  /** The Operator answered a refused write: forget it (a retry writes it again). */
  forgetRefusals(key: ItemKey): void {
    updateLedger(key, ledger => (ledger.refused = {}));
  }

  close_(): Promise<void> {
    return this.adapter.close_();
  }

  // ---

  private need(op: OptionalOp): void {
    if (this.adapter.lacks.has(op)) throw new TrackerError('refused', op, `the project's tracker map has no '${op}'`);
  }

  private async commentNow(key: ItemKey, write: string, marker: string, body: string): Promise<string> {
    let id = readLedger(key).writes[write]?.id ?? null;
    const before = await this.adapter.comments(key);
    if (id === null) {
      // No id saved: a write that stopped before saving it may still have landed.
      id = before.find(c => same(stripMarker(c.body), body))?.id ?? null;
    }
    const existing = id === null ? undefined : before.find(c => c.id === id);
    if (existing === undefined) {
      updateLedger(key, l => (l.writes[write] = { at: now(), id: null }));
      id = await this.adapter.addComment(key, marker, body);
      updateLedger(key, l => (l.writes[write] = { at: now(), id }));
    } else if (!same(stripMarker(existing.body), body)) {
      if (!this.has('comment-edit')) return existing.id;
      await this.adapter.editComment(key, existing.id, marker, body);
    } else {
      return existing.id;
    }
    const back = (await this.adapter.comments(key)).find(c => c.id === id);
    if (back === undefined || !same(stripMarker(back.body), body)) {
      throw new TrackerError('outage', 'comment', `${key}: comment ${id} does not read back`);
    }
    return back.id;
  }

  private async labelNow(key: ItemKey, add: readonly string[], remove: readonly string[]): Promise<void> {
    if (add.length === 0 && remove.length === 0) return;
    const have = new Set((await this.adapter.view(key)).labels);
    for (const label of add) if (!have.has(label)) await this.adapter.addLabel(key, label);
    for (const label of remove) if (have.has(label)) await this.adapter.removeLabel(key, label);
    const after = new Set((await this.adapter.view(key)).labels);
    const wrong = [...add.filter(l => !after.has(l)), ...remove.filter(l => after.has(l))];
    if (wrong.length > 0) throw new TrackerError('refused', 'label', `${key}: ${wrong.join(', ')} did not read back`);
  }

  private queueOrThrow(key: ItemKey, write: string, error: unknown, pending: Pending): null {
    if (error instanceof TrackerError && error.kind === 'outage') {
      updateLedger(key, ledger => (ledger.pending[write] = pending));
      return null;
    }
    if (error instanceof TrackerError) this.recordRefusal(key, write, error);
    throw error;
  }

  private clearPending(key: ItemKey, write: string): void {
    if (readLedger(key).pending[write] !== undefined) updateLedger(key, ledger => delete ledger.pending[write]);
  }

  private recordRefusal(scope: ItemKey | 'project', write: string, error: TrackerError): void {
    updateLedger(scope, ledger => (ledger.refused[write] = { at: now(), message: error.message }));
  }
}

/** A comment body without the marker line the code-host adapter puts first. */
function stripMarker(body: string): string {
  return body.replace(/^<!-- [^\n]* -->\r?\n?/, '');
}

// --- the code host's issues ------------------------------------------------------------

function forgeCall<T>(op: string, call: () => T): T {
  try {
    return call();
  } catch (error) {
    if (error instanceof ForgeError) {
      const outage = ['unavailable', 'rate_limited', 'timeout', 'process_failed'].includes(error.kind);
      throw new TrackerError(outage ? 'outage' : 'refused', op, error.message);
    }
    // No answer from the host: the write may or may not have happened; the ledger finds out.
    throw new TrackerError('outage', op, error instanceof Error ? error.message : String(error));
  }
}

function gh(args: readonly string[], body?: unknown): unknown {
  const result = Bun.spawnSync(['gh', 'api', ...args, ...(body === undefined ? [] : ['--input', '-'])], {
    stdin: body === undefined ? undefined : new TextEncoder().encode(JSON.stringify(body)),
    stdout: 'pipe',
    stderr: 'pipe',
    env: process.env,
  });
  if (result.exitCode !== 0) {
    const first = result.stderr.toString().trim().split('\n')[0] ?? '';
    const outage = /timeout|timed out|502|503|504|could not resolve|connection/i.test(first);
    throw new TrackerError(outage ? 'outage' : 'refused', `gh api ${args.find(a => !a.startsWith('-')) ?? ''}`, first);
  }
  const text = result.stdout.toString().trim();
  return text === '' ? null : (JSON.parse(text.replace(/\]\s*\[/g, ',')) as unknown);
}

/** The code host's issues: Archon's forge, and `gh api` for what the forge lacks. */
export function codeHostAdapter(repo: Repo): Adapter {
  const ref = (key: ItemKey) => {
    const number = issueNumber(key);
    if (number === null) throw new TrackerError('refused', 'key', `${key} is not an issue of ${repo.path}`);
    return { repo, number };
  };
  const subject = (key: ItemKey) => ({ kind: 'issue' as const, ref: ref(key) });
  const restId = (key: ItemKey) => (gh([`repos/${repo.path}/issues/${ref(key).number}`]) as { id: number }).id;
  const linked = (call: () => void) => {
    try {
      call();
    } catch (error) {
      if (!/already|exists|422/i.test((error as Error).message)) throw error;
    }
  };
  return {
    name: 'code-host',
    lacks: new Set(),
    url: key => `https://${repo.host}/${repo.path}/issues/${ref(key).number}`,
    async view(key) {
      const v = forgeCall('view', () => forge('workitem.view', { ref: ref(key) }));
      const author = v.author ?? null;
      return {
        key,
        open: v.state === 'open',
        title: v.title,
        body: v.body,
        labels: [...(v.labels ?? [])],
        creator: author === null ? null : { id: author.id, login: author.login, bot: author.type === 'bot' },
        url: v.url,
      };
    },
    async comments(key) {
      const { comments } = forgeCall('comments', () => forge('workitem.comments', { subject: subject(key) }));
      return comments.map(c => ({ id: c.id, body: c.body, author: c.author?.login ?? null, url: c.url }));
    },
    async addComment(key, marker, body) {
      return forgeCall('comment', () => forge('workitem.comment.upsert', { subject: subject(key), marker, body })).comment.id;
    },
    async editComment(key, _id, marker, body) {
      forgeCall('comment', () => forge('workitem.comment.upsert', { subject: subject(key), marker, body }));
    },
    async addLabel(key, label) {
      forgeCall('label.add', () => forge('workitem.label.add', { subject: subject(key), name: label }));
    },
    async removeLabel(key, label) {
      forgeCall('label.remove', () => forge('workitem.label.remove', { subject: subject(key), name: label }));
    },
    async create(marker, title, body) {
      const created = forgeCall('create', () => forge('workitem.create', { repo, title, body, marker }));
      return issueKey(created.workitem.ref.number);
    },
    async close(key, reason) {
      forgeCall('close', () => forge('workitem.close', { ref: ref(key), reason }));
    },
    async list(label) {
      const filter = label === null ? '' : `&labels=${encodeURIComponent(label)}`;
      const all: { number: number; title: string; labels: { name: string }[]; pull_request?: unknown }[] = [];
      for (let page = 1; page <= 50; page++) {
        const batch = gh([`repos/${repo.path}/issues?state=open&sort=created&direction=asc&per_page=100&page=${page}${filter}`]) as typeof all;
        all.push(...batch);
        if (batch.length < 100) break;
      }
      return all.filter(i => i.pull_request === undefined).map(i => ({ key: issueKey(i.number), title: i.title, labels: i.labels.map(l => l.name) }));
    },
    async slice(parent, child) {
      linked(() => gh(['-X', 'POST', `repos/${repo.path}/issues/${ref(parent).number}/sub_issues`], { sub_issue_id: restId(child) }));
    },
    async blockedBy(item, blocker) {
      linked(() => gh(['-X', 'POST', `repos/${repo.path}/issues/${ref(item).number}/dependencies/blocked_by`], { issue_id: restId(blocker) }));
    },
    async blockers(item) {
      const found = gh([`repos/${repo.path}/issues/${ref(item).number}/dependencies/blocked_by`]) as { number: number }[] | null;
      return (found ?? []).map(i => issueKey(i.number));
    },
    async labelSetBy(key, label) {
      const events = gh(['--paginate', `repos/${repo.path}/issues/${ref(key).number}/events?per_page=100`]) as { event: string; label?: { name: string }; actor?: { login: string } | null }[] | null;
      const added = (events ?? []).filter(e => e.event === 'labeled' && e.label?.name === label);
      return added.length === 0 ? null : (added[added.length - 1].actor?.login ?? null);
    },
    async ensureLabel(name, color, description) {
      forgeCall('label.ensure', () => forge('repo.label.ensure', { repo, name, color, description }));
    },
    async close_() {},
  };
}

// --- one connector per script run ------------------------------------------------------

export const MAP_PATH = '.pipeline/tracker.yaml';

let current: Tracker | null = null;

/**
 * The project's tracker: its map on the base branch, or the code host's issues without one.
 * `repo` is for scripts that find the repository themselves (unify-ping reads it from origin).
 */
export function tracker(given?: Repo): Tracker {
  if (current !== null) return current;
  const repo = given ?? repoOf(input('repo_host'), input('repo_path'));
  const text = fromBase(input('base') || 'main', MAP_PATH);
  current = new Tracker(text === null ? codeHostAdapter(repo) : mapAdapter(parseMap(text)));
  return current;
}

/** Tests and the setup probe give the connector an adapter directly. */
export function useTracker(adapter: Adapter | null): Tracker | null {
  current = adapter === null ? null : new Tracker(adapter);
  return current;
}

/**
 * Run a script's `main`: a thrown error becomes the node's refusal, prefixed with the
 * script's name, and an MCP session the connector opened is always closed.
 */
export async function script(name: string, main: () => Promise<void> | void): Promise<void> {
  try {
    await main();
  } catch (error) {
    refuse(`${name}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (current !== null) await current.close_();
  }
}

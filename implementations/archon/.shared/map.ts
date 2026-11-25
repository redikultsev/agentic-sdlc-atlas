/**
 * A project map (decision 46): `.pipeline/tracker.yaml` on the base branch says, for each
 * operation the pipeline needs, which tool of the project's MCP server does it and with
 * what arguments, and where each field of the answer is. A new tracker is a new map, not
 * new engine code. The setup workflow composes it and the Operator approves it; a change
 * to it is R2. Shape:
 *
 *   server: { command: uvx, args: [mcp-atlassian], env: { JIRA_PERSONAL_TOKEN: "${JIRA_TOKEN}" } }
 *   # or server: { type: http, url: "http://tracker-mcp:8000/mcp", headers: { ... } }
 *   url: "https://jira.example.com/browse/{key}"
 *   key: "^PROJ-[0-9]+$"                       # the keys this tracker owns
 *   refused: ["is required", "not valid"]      # tool-error text that means a refusal, not an outage
 *   operations:
 *     view:     { tool: jira_get_issue, args: { issue_key: "{key}" },
 *                 read: { title: fields.summary, body: fields.description, labels: fields.labels,
 *                         open: { path: fields.status.statusCategory.key, not: [done] },
 *                         creator: { id: fields.creator.accountId, login: fields.creator.name } } }
 *     comments: { tool: ..., args: { ... }, read: { list: comments, id: id, body: body, author: author.name } }
 *     comment:  { tool: ..., args: { ..., body: "{body}" }, read: { id: id } }
 *     label.add / label.remove: { tool: ..., args: { ..., label: "{label}" } }
 *       or, where the tracker's tool only replaces the whole list, `{labels}`: the item's
 *       labels after the change, read first (a JSON list inside a string argument), e.g.
 *       { tool: jira_update_issue, args: { issue_key: "{key}", fields: "{\"labels\": {labels}}" } }
 *     and optionally comment.edit ({id}), create ({title}, {body}; read: { key }),
 *     close / close.completed / close.not_planned, list / list.label ({label};
 *     read: { list, key, title, labels }), slice ({parent}, {child}),
 *     blocked-by ({key}, {blocker}), blockers ({key}; read: { list, key }),
 *     label.set-by ({key}, {label}; read: { login }).
 *
 * In `args`, a string that is exactly `{name}` takes the value as it is (a list stays a
 * list); elsewhere `{name}` is replaced by its text. In `read`, a path is dotted field
 * names, a number for a list index. `${NAME}` in the server's env or headers is read from
 * the run's environment (Archon's `env:`), so no token sits in the map.
 */

import type { Adapter, CloseReason, ItemComment, Listed, OptionalOp } from './connector.ts';
import { TrackerError } from './connector.ts';
import type { ItemKey } from './item.ts';
import { connect, type McpServer, type McpSession } from './mcp.ts';

interface Operation {
  readonly tool: string;
  readonly args?: Readonly<Record<string, unknown>>;
  readonly read?: Readonly<Record<string, unknown>>;
}

export interface TrackerMap {
  readonly server: McpServer;
  readonly url: string;
  readonly key?: string;
  readonly refused?: readonly string[];
  /** Seconds one tool call may take (default 120): a broker that starts a gateway per session is slow. */
  readonly timeoutSeconds?: number;
  readonly operations: Readonly<Record<string, Operation>>;
}

/** The three operations of decision 46 (read a request and its creator, comment, set a label), as map entries. */
export const REQUIRED = ['view', 'comments', 'comment', 'label.add', 'label.remove'] as const;

const OPTIONAL: Readonly<Record<OptionalOp, readonly string[]>> = {
  create: ['create'],
  close: ['close', 'close.completed'],
  list: ['list'],
  slice: ['slice'],
  'blocked-by': ['blocked-by'],
  blockers: ['blockers'],
  'label-set-by': ['label.set-by'],
  // Tracker labels are free text where a map is used; nothing to make first.
  'label-ensure': [],
  'comment-edit': ['comment.edit'],
};

const DEFAULT_REFUSED = ['required', 'not valid', 'invalid', 'not allowed', 'permission', 'forbidden', 'cannot be', 'validator'];

export function parseMap(text: string): TrackerMap {
  let raw: unknown;
  try {
    raw = Bun.YAML.parse(text);
  } catch (error) {
    throw new Error(`.pipeline/tracker.yaml does not parse: ${(error as Error).message}`);
  }
  const map = raw as TrackerMap;
  if (typeof map !== 'object' || map === null) throw new Error('.pipeline/tracker.yaml is empty');
  if (typeof map.server !== 'object' || map.server === null) throw new Error('.pipeline/tracker.yaml names no server');
  if (typeof map.url !== 'string' || !map.url.includes('{key}')) throw new Error('.pipeline/tracker.yaml: url must contain {key}');
  if (typeof map.operations !== 'object' || map.operations === null) throw new Error('.pipeline/tracker.yaml has no operations');
  return map;
}

/** What the install check reports: required entries missing, optional ones the tracker lacks. */
export function checkMap(map: TrackerMap): { readonly missing: readonly string[]; readonly lacks: readonly OptionalOp[] } {
  const missing = REQUIRED.filter(op => map.operations[op] === undefined);
  const lacks = (Object.keys(OPTIONAL) as OptionalOp[]).filter(op => OPTIONAL[op].length === 0 || !OPTIONAL[op].some(entry => map.operations[entry] !== undefined));
  return { missing, lacks: lacks.filter(op => op !== 'label-ensure') };
}

/** Fill `{name}` placeholders in a map's arguments. */
export function fill(value: unknown, vars: Readonly<Record<string, unknown>>): unknown {
  if (typeof value === 'string') {
    const whole = /^\{([a-z_]+)\}$/.exec(value);
    if (whole && whole[1] in vars) return vars[whole[1]];
    // Inside a longer string a list or an object is written as JSON, so a JSON-string argument can carry it.
    return value.replace(/\{([a-z_]+)\}/g, (all, name: string) => {
      if (!(name in vars)) return all;
      const v = vars[name];
      return typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
    });
  }
  if (Array.isArray(value)) return value.map(v => fill(v, vars));
  if (typeof value === 'object' && value !== null) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v, vars)]));
  return value;
}

/** The value at a dotted path, or undefined. */
export function at(data: unknown, path: string): unknown {
  let here: unknown = data;
  for (const part of path.split('.')) {
    if (here === null || here === undefined) return undefined;
    here = Array.isArray(here) && /^[0-9]+$/.test(part) ? here[Number(part)] : (here as Record<string, unknown>)[part];
  }
  return here;
}

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function strings(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(v => (typeof v === 'string' ? v : text(at(v, 'name') ?? v)));
  return [];
}

export function mapAdapter(map: TrackerMap, open: (server: McpServer) => Promise<McpSession | { ok: false; kind: string; message: string }> = s => connect(s, { timeoutMs: (map.timeoutSeconds ?? 120) * 1000 })): Adapter {
  const { missing, lacks } = checkMap(map);
  if (missing.length > 0) throw new Error(`.pipeline/tracker.yaml lacks the required ${missing.join(', ')}`);
  const refusedText = (map.refused ?? DEFAULT_REFUSED).map(s => s.toLowerCase());
  let session: McpSession | null = null;

  const call = async (name: string, vars: Record<string, unknown>): Promise<{ data: unknown; op: Operation }> => {
    const op = map.operations[name];
    if (op === undefined) throw new TrackerError('refused', name, `the project's tracker map has no '${name}'`);
    if (session === null) {
      const opened = await open(map.server);
      if ('ok' in opened) throw new TrackerError('outage', name, `${opened.kind}: ${opened.message}`);
      session = opened;
    }
    const result = await session.call(op.tool, fill(op.args ?? {}, vars) as Record<string, unknown>);
    if (!result.ok) {
      // A tool that is not there is a broken map: a person fixes it, a retry would not.
      if (result.kind === 'protocol') throw new TrackerError('refused', name, result.message);
      const refused = result.kind === 'tool' && refusedText.some(t => result.message.toLowerCase().includes(t));
      throw new TrackerError(refused ? 'refused' : 'outage', name, result.message);
    }
    return { data: result.data ?? result.text, op };
  };
  const read = (op: Operation, field: string): unknown => op.read?.[field];
  const pick = (data: unknown, op: Operation, field: string): unknown => {
    const where = read(op, field);
    return typeof where === 'string' ? at(data, where) : undefined;
  };
  const listOf = (data: unknown, op: Operation): unknown[] => {
    const where = read(op, 'list');
    const found = typeof where === 'string' ? at(data, where) : data;
    return Array.isArray(found) ? found : [];
  };
  /**
   * For a tracker whose only label tool replaces the whole list (Jira's update_issue through
   * mcp-atlassian): when a label operation's arguments name `{labels}`, the item's labels are
   * read first and `{labels}` is the list after the change, so the item's other labels stay.
   * A person changing labels in the same moment can lose that change; the read-back after the
   * write shows it as a difference.
   */
  const whole = async (name: string, key: string, change: (labels: string[]) => string[]): Promise<Record<string, unknown>> => {
    if (!JSON.stringify(map.operations[name]?.args ?? {}).includes('{labels}')) return {};
    const { data, op } = await call('view', { key });
    return { labels: change(strings(pick(data, op, 'labels'))) };
  };

  return {
    name: 'map',
    lacks: new Set(lacks),
    url: key => map.url.replace('{key}', key),
    async view(key) {
      const { data, op } = await call('view', { key });
      const openRule = read(op, 'open');
      let isOpen = true;
      if (typeof openRule === 'string') isOpen = Boolean(at(data, openRule));
      else if (typeof openRule === 'object' && openRule !== null) {
        const rule = openRule as { path: string; not?: string[]; in?: string[] };
        const value = text(at(data, rule.path)).toLowerCase();
        isOpen = rule.in ? rule.in.map(s => s.toLowerCase()).includes(value) : !(rule.not ?? []).map(s => s.toLowerCase()).includes(value);
      }
      const creatorRule = read(op, 'creator') as { id?: string; login?: string; bot?: string } | undefined;
      const creatorId = creatorRule?.id ? text(at(data, creatorRule.id)) : '';
      return {
        key,
        open: isOpen,
        title: text(pick(data, op, 'title')),
        body: text(pick(data, op, 'body')),
        labels: strings(pick(data, op, 'labels')),
        creator: creatorId === '' ? null : { id: creatorId, login: creatorRule?.login ? text(at(data, creatorRule.login)) || null : null, bot: creatorRule?.bot ? Boolean(at(data, creatorRule.bot)) : false },
        url: map.url.replace('{key}', key),
      };
    },
    async comments(key): Promise<ItemComment[]> {
      const { data, op } = await call('comments', { key });
      return listOf(data, op).map(c => ({
        id: text(pick(c, op, 'id')),
        body: text(pick(c, op, 'body')),
        author: text(pick(c, op, 'author')) || null,
        url: map.url.replace('{key}', key),
      }));
    },
    async addComment(key, _marker, body) {
      const { data, op } = await call('comment', { key, body });
      const id = text(pick(data, op, 'id'));
      if (id === '') throw new TrackerError('outage', 'comment', `${key}: the tool returned no comment id`);
      return id;
    },
    async editComment(key, id, _marker, body) {
      await call('comment.edit', { key, id, body });
    },
    async addLabel(key, label) {
      await call('label.add', { key, label, ...(await whole('label.add', key, labels => [...labels.filter(l => l !== label), label])) });
    },
    async removeLabel(key, label) {
      await call('label.remove', { key, label, ...(await whole('label.remove', key, labels => labels.filter(l => l !== label))) });
    },
    async create(_marker, title, body) {
      const { data, op } = await call('create', { title, body });
      const key = text(pick(data, op, 'key'));
      if (key === '') throw new TrackerError('outage', 'create', 'the tool returned no key');
      return key;
    },
    async close(key, reason: CloseReason) {
      const name = map.operations[`close.${reason}`] !== undefined ? `close.${reason}` : 'close';
      await call(name, { key, reason });
    },
    async list(label): Promise<Listed[]> {
      const name = label !== null && map.operations['list.label'] !== undefined ? 'list.label' : 'list';
      const { data, op } = await call(name, { label: label ?? '' });
      const items = listOf(data, op).map(i => ({ key: text(pick(i, op, 'key')), title: text(pick(i, op, 'title')), labels: strings(pick(i, op, 'labels')) }));
      return label === null ? items : items.filter(i => i.labels.includes(label));
    },
    async slice(parent: ItemKey, child: ItemKey) {
      await call('slice', { parent, child });
    },
    async blockedBy(item: ItemKey, blocker: ItemKey) {
      await call('blocked-by', { key: item, blocker });
    },
    async blockers(item: ItemKey) {
      const { data, op } = await call('blockers', { key: item });
      return listOf(data, op).map(i => text(pick(i, op, 'key'))).filter(k => k !== '');
    },
    async labelSetBy(key, label) {
      const { data, op } = await call('label.set-by', { key, label });
      return text(pick(data, op, 'login')) || null;
    },
    async ensureLabel() {},
    async close_() {
      if (session !== null) await session.close();
      session = null;
    },
  };
}

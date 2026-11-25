/**
 * Where the read server reads, and the fence around it (decision 63).
 *
 * Two seams, each replaceable in tests: `Spawner` runs one Archon CLI command with a fixed
 * argv (no shell), `Fetcher` makes one HTTP GET to Archon's server. Neither is handed a
 * command or a path by a caller: `Reader` builds every argv and every URL from validated
 * parts, and each seam checks the result against its allowlist again before it runs, so a
 * bug in a tool cannot reach a write, another document family, or a flag.
 *
 * - CLI: `archon state get <name> --project <p>`, `archon state list --prefix <prefix>
 *   --values --project <p>` and `archon workflow get <run-id> --json --verbose`. The state
 *   store has no HTTP read in Archon (research note 2026-11-read-only-state-surface), and
 *   `--project` is always passed: without it the CLI resolves the project from the
 *   checkout and may register it.
 * - HTTP: `GET /api/items` (one item: runs, open questions, answers, the install hold) and
 *   `GET /api/runs/attention` (what waits for a person), both scoped by `project`.
 *
 * Names: an item key is parsed by the pack's own `item.ts`, so `#12` reads `work/12` and
 * `PROJ-123` reads `work/proj-123` (state names are lower case); any other shape is refused. Prefixes come from a fixed
 * list. The documents are the ones the pack writes: `work.ts`, `provenance.ts`, `holds.ts`,
 * `releases.ts`, `findings.ts`, `unify-deploy/scripts/lib.ts` (`release-gates/<id>`).
 */

import { parseKey, runKey, stateSlug } from '../.shared/item.ts';

/** A refusal or failure the caller sees as the tool's error text. Never carries a credential. */
export class ReadError extends Error {}

// --- names -------------------------------------------------------------------------------

/** A project as Archon names it: a project key (`owner/repo`, `_folder/ops`, `@cwd/scratch-1a2b`), a codebase name or id. */
const PROJECT = /^[A-Za-z0-9_@][A-Za-z0-9._@/-]{0,199}$/;
/** A full run id; a prefix would resolve against the server's working directory. */
const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{7,99}$/;

export function checkProject(raw: unknown): string {
  if (typeof raw !== 'string' || !PROJECT.test(raw) || raw.includes('..') || raw.includes('//') || raw.endsWith('/')) {
    throw new ReadError(`project must be a project key, codebase name or id (letters, digits, . _ @ / -; not starting with - or /), got ${JSON.stringify(raw)}`);
  }
  return raw;
}

export function checkRunId(raw: unknown): string {
  if (typeof raw !== 'string' || !RUN_ID.test(raw)) throw new ReadError(`runId must be a full run id (8 to 100 letters, digits, _ or -), got ${JSON.stringify(raw)}`);
  return raw;
}

/** An item key in the pack's forms (`12`, `#12`, `PROJ-123`), normalised; anything else is refused. */
export function checkKey(raw: unknown): string {
  const key = typeof raw === 'string' ? parseKey(raw) : null;
  if (key === null) throw new ReadError(`key must be an item key like #12 or PROJ-123, got ${JSON.stringify(raw)}`);
  return key;
}

/** The document families a single read may name; the id part is always an item key's slug. */
export type Family = 'work' | 'provenance';

/** Document names of the pack's state, built here and nowhere else. */
export const names = {
  item: (family: Family, key: string) => `${family}/${stateSlug(checkKey(key))}`,
  line: 'releases-line',
} as const;

/** The prefixes a list may read: the pack's own families, nothing else (no `ledger/`, no `deploy-asks/`). */
export const PREFIXES = ['work/', 'holds/', 'releases/', 'release-gates/', 'findings/'] as const;
export type Prefix = (typeof PREFIXES)[number];

const SLUG = /^(?:[1-9][0-9]*|[a-z][a-z0-9_]*-[1-9][0-9]*)$/;

function allowedName(name: string): boolean {
  if (name === names.line) return true;
  const [family, slug, ...rest] = name.split('/');
  return rest.length === 0 && (family === 'work' || family === 'provenance') && slug !== undefined && SLUG.test(slug);
}

// --- the CLI seam ------------------------------------------------------------------------

export interface CliResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

/** Runs `archon <argv>` with no shell; `maxBytes` bounds what it reads; `signal` kills it. */
export type Spawner = (argv: readonly string[], options: { readonly signal: AbortSignal; readonly maxBytes: number }) => Promise<CliResult>;

/** Throws unless `argv` is one of the read forms, exactly. */
export function checkArgv(argv: readonly string[]): void {
  const a = [...argv];
  const fail = () => {
    throw new ReadError(`refused: \`archon ${a.join(' ')}\` is not a listed read`);
  };
  const projectAt = (i: number) => a.length === i + 2 && a[i] === '--project' && PROJECT.test(a[i + 1] ?? '') && !(a[i + 1] ?? '').includes('..');
  if (a[0] === 'state' && a[1] === 'get') {
    if (typeof a[2] !== 'string' || !allowedName(a[2]) || !projectAt(3)) fail();
    return;
  }
  if (a[0] === 'state' && a[1] === 'list') {
    if (a[2] !== '--prefix' || !(PREFIXES as readonly string[]).includes(a[3] ?? '') || a[4] !== '--values' || !projectAt(5)) fail();
    return;
  }
  if (a[0] === 'workflow' && a[1] === 'get') {
    if (a.length !== 5 || !RUN_ID.test(a[2] ?? '') || a[3] !== '--json' || a[4] !== '--verbose') fail();
    return;
  }
  fail();
}

// --- the HTTP seam -----------------------------------------------------------------------

export interface HttpResult {
  readonly status: number;
  readonly text: string;
}

/** One GET; the seam never takes a method. */
export type Fetcher = (url: string, options: { readonly headers: Readonly<Record<string, string>>; readonly signal: AbortSignal; readonly maxBytes: number }) => Promise<HttpResult>;

/** The GET routes, each with the query parameters it may carry. */
export const ROUTES: Readonly<Record<string, readonly string[]>> = {
  '/api/items': ['project', 'key'],
  '/api/runs/attention': ['project'],
};

/** Throws unless the path is a listed route and the query only its listed parameters. */
export function checkRoute(path: string, query: Readonly<Record<string, string>>): void {
  const allowed = ROUTES[path];
  if (allowed === undefined) throw new ReadError(`refused: GET ${path} is not a listed read`);
  for (const name of Object.keys(query)) if (!allowed.includes(name)) throw new ReadError(`refused: ${path} takes no parameter ${name}`);
}

export interface HttpConfig {
  /** Archon's server, e.g. `http://127.0.0.1:3090`; null when not set. */
  readonly baseUrl: string | null;
  /** Auth headers built from the environment (a trusted identity header or a session cookie). */
  readonly headers: Readonly<Record<string, string>>;
}

// --- the reader --------------------------------------------------------------------------

export interface StateDoc {
  readonly name: string;
  readonly revision: number;
  readonly value: unknown;
  readonly lease: unknown;
}

export interface Limits {
  /** Bytes read from one command's stdout or one HTTP body before it is refused. */
  readonly rawBytes: number;
}

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

function parseJson(text: string, what: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new ReadError(`${what} did not print JSON`);
  }
}

/** The only reads a tool can make. Every one names its project; nothing here writes. */
export class Reader {
  constructor(
    private readonly spawn: Spawner,
    private readonly fetcher: Fetcher,
    private readonly http: HttpConfig,
    private readonly signal: AbortSignal,
    private readonly limits: Limits
  ) {}

  private async cli(argv: readonly string[]): Promise<unknown> {
    checkArgv(argv);
    const what = `archon ${argv.slice(0, 2).join(' ')}`;
    const result = await this.spawn(argv, { signal: this.signal, maxBytes: this.limits.rawBytes });
    const value = result.stdout.trim() === '' ? undefined : parseJson(result.stdout, what);
    if (result.code !== 0) {
      const error = isObject(value) && typeof value.error === 'string' ? `: ${value.error}` : result.stderr.trim() ? `: ${result.stderr.trim().slice(0, 300)}` : '';
      throw new ReadError(`${what} failed (exit ${result.code})${error}`);
    }
    if (!isObject(value)) throw new ReadError(`${what} printed no JSON object`);
    return value;
  }

  /** The scope a state command used must be the named project, never install scope. */
  private checkScope(value: Record<string, unknown>, what: string): void {
    const scope = value.scope;
    if (!isObject(scope) || scope.kind !== 'project') throw new ReadError(`${what}: the CLI did not read project scope`);
  }

  async stateGet(project: string, name: string): Promise<StateDoc> {
    const value = (await this.cli(['state', 'get', name, '--project', checkProject(project)])) as Record<string, unknown>;
    this.checkScope(value, `state get ${name}`);
    if (value.name !== undefined && value.name !== name) throw new ReadError(`state get ${name} returned ${String(value.name)}`);
    return { name, revision: typeof value.revision === 'number' ? value.revision : 0, value: value.value ?? null, lease: value.lease ?? null };
  }

  async stateList(project: string, prefix: Prefix): Promise<StateDoc[]> {
    const value = (await this.cli(['state', 'list', '--prefix', prefix, '--values', '--project', checkProject(project)])) as Record<string, unknown>;
    this.checkScope(value, `state list ${prefix}`);
    if (!Array.isArray(value.documents)) throw new ReadError(`state list ${prefix} listed no documents`);
    return value.documents
      .filter(isObject)
      .filter(d => typeof d.name === 'string' && d.name.startsWith(prefix) && d.deleted !== true)
      .map(d => ({ name: d.name as string, revision: typeof d.revision === 'number' ? d.revision : 0, value: d.value ?? null, lease: d.lease ?? null }));
  }

  async run(runId: string): Promise<Record<string, unknown>> {
    return (await this.cli(['workflow', 'get', checkRunId(runId), '--json', '--verbose'])) as Record<string, unknown>;
  }

  private async get(path: string, query: Record<string, string>): Promise<{ status: number; body: unknown }> {
    checkRoute(path, query);
    if (this.http.baseUrl === null) throw new ReadError('ARCHON_READ_URL is not set: the HTTP reads (items, attention) are off');
    const url = `${this.http.baseUrl}${path}?${new URLSearchParams(query).toString()}`;
    const result = await this.fetcher(url, { headers: this.http.headers, signal: this.signal, maxBytes: this.limits.rawBytes });
    if (result.status === 401 || result.status === 403) throw new ReadError(`GET ${path}: HTTP ${result.status}; check ARCHON_READ_USER or ARCHON_READ_COOKIE`);
    const body = result.text.trim() === '' ? null : parseJson(result.text, `GET ${path}`);
    return { status: result.status, body };
  }

  /** Archon's item read for an item key: its runs, open questions, answers, links, the install hold. Null when nothing named it. */
  async item(project: string, key: string): Promise<Record<string, unknown> | null> {
    const engineKey = runKey(checkKey(key));
    const { status, body } = await this.get('/api/items', { project: checkProject(project), key: engineKey });
    if (status === 404) return null;
    if (status !== 200 || !isObject(body)) throw new ReadError(`GET /api/items: HTTP ${status}${isObject(body) && typeof body.error === 'string' ? `: ${body.error}` : ''}`);
    return body;
  }

  /** The project's attention queue: paused runs and asks that wait for a person. */
  async attention(project: string): Promise<Record<string, unknown>> {
    const { status, body } = await this.get('/api/runs/attention', { project: checkProject(project) });
    if (status !== 200 || !isObject(body)) throw new ReadError(`GET /api/runs/attention: HTTP ${status}${isObject(body) && typeof body.error === 'string' ? `: ${body.error}` : ''}`);
    return body;
  }
}

// --- the real seams ----------------------------------------------------------------------

async function readLimited(stream: ReadableStream<Uint8Array> | null, maxBytes: number, onOver: () => void): Promise<string> {
  if (stream === null) return '';
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      onOver();
      await reader.cancel().catch(() => undefined);
      throw new ReadError(`output over ${maxBytes} bytes; refused`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** Keys a CLI child must not inherit: a run's identity would make `state` resolve that run's project and refuse `--project`. */
const DROPPED_ENV = ['WORKFLOW_ID', 'ARCHON_NODE_EXECUTION'];

/** The real CLI seam: `command` is the argv prefix (`["archon"]`), `cwd` a directory with no project files. */
export function cliSpawner(command: readonly string[], cwd: string, env: Readonly<Record<string, string | undefined>>): Spawner {
  const childEnv: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) if (v !== undefined && !DROPPED_ENV.includes(k) && !k.startsWith('ARCHON_READ_')) childEnv[k] = v;
  return async (argv, { signal, maxBytes }) => {
    checkArgv(argv);
    if (signal.aborted) throw new ReadError('aborted');
    let proc: ReturnType<typeof Bun.spawn>;
    try {
      proc = Bun.spawn([...command, ...argv], { cwd, env: childEnv, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' });
    } catch (error) {
      throw new ReadError(`cannot start ${command[0] ?? 'archon'}: ${error instanceof Error ? error.message : String(error)}`);
    }
    const kill = () => proc.kill();
    signal.addEventListener('abort', kill, { once: true });
    try {
      const [stdout, stderr] = await Promise.all([
        readLimited(proc.stdout as ReadableStream<Uint8Array>, maxBytes, kill),
        readLimited(proc.stderr as ReadableStream<Uint8Array>, 64 * 1024, () => undefined).catch(() => ''),
      ]);
      const code = await proc.exited;
      return { code, stdout, stderr };
    } finally {
      signal.removeEventListener('abort', kill);
    }
  };
}

/** The real HTTP seam: GET only, no redirects followed (a redirect would carry the auth headers elsewhere). */
export const httpFetcher: Fetcher = async (url, { headers, signal, maxBytes }) => {
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', headers: { ...headers, accept: 'application/json' }, signal, redirect: 'manual' });
  } catch (error) {
    if (signal.aborted) throw new ReadError('aborted');
    throw new ReadError(`GET ${new URL(url).pathname}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (res.status >= 300 && res.status < 400) throw new ReadError(`GET ${new URL(url).pathname}: redirect refused (HTTP ${res.status})`);
  const text = await readLimited(res.body, maxBytes, () => undefined);
  return { status: res.status, text };
};

/** HTTP settings from the environment; values never land in a file or a message. */
export function httpConfig(env: Readonly<Record<string, string | undefined>>): HttpConfig {
  const raw = env.ARCHON_READ_URL?.trim() ?? '';
  let baseUrl: string | null = null;
  if (raw !== '') {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error('ARCHON_READ_URL is not a URL');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('ARCHON_READ_URL must be http or https');
    if (parsed.search !== '' || parsed.hash !== '' || parsed.username !== '' || parsed.password !== '') throw new Error('ARCHON_READ_URL must carry no query, fragment or credentials');
    baseUrl = raw.replace(/\/+$/, '');
  }
  const headers: Record<string, string> = {};
  const header = env.ARCHON_READ_USER_HEADER?.trim() || 'X-Archon-User';
  if (!/^[A-Za-z0-9-]+$/.test(header)) throw new Error('ARCHON_READ_USER_HEADER is not a header name');
  if (env.ARCHON_READ_USER) headers[header] = env.ARCHON_READ_USER;
  if (env.ARCHON_READ_COOKIE) headers.cookie = env.ARCHON_READ_COOKIE;
  return { baseUrl, headers };
}

/**
 * The read-only MCP server (decision 63): the protocol handshake and tool list, each tool
 * against fake CLI and HTTP seams, the fence (no tool reaches a write, an unlisted command,
 * another document family or a flag, whatever it is fed), the output cap and the deadline.
 */
import { describe, expect, test } from 'bun:test';
import { callTool, fitOutput, handleLine, PROTOCOL_VERSIONS, type Settings } from '../read-server/protocol.ts';
import { checkArgv, checkRoute, cliSpawner, type CliResult, type Fetcher, httpConfig, ReadError, type Spawner } from '../read-server/sources.ts';
import { TOOLS } from '../read-server/tools.ts';
import { cliOutput, httpOutput, RUN_ID } from './read-server-fixtures.ts';

const BASE = 'http://archon.test';

function fakes(overrides: { spawn?: Spawner; fetcher?: Fetcher; baseUrl?: string | null; timeoutMs?: number; maxBytes?: number } = {}) {
  const argvs: string[][] = [];
  const urls: string[] = [];
  const spawn: Spawner = async argv => {
    checkArgv(argv); // what the real seam checks, so a test fails loudly if a tool built anything else
    argvs.push([...argv]);
    return cliOutput(argv) as CliResult;
  };
  const fetcher: Fetcher = async url => {
    urls.push(url);
    const u = new URL(url);
    const out = httpOutput(u.pathname, u.searchParams);
    return { status: out.status, text: JSON.stringify(out.body) };
  };
  const settings: Settings = {
    spawn: overrides.spawn ?? spawn,
    fetcher: overrides.fetcher ?? fetcher,
    http: { baseUrl: overrides.baseUrl === undefined ? BASE : overrides.baseUrl, headers: {} },
    timeoutMs: overrides.timeoutMs ?? 5_000,
    maxBytes: overrides.maxBytes ?? 60_000,
    rawBytes: 1_000_000,
  };
  return { settings, argvs, urls };
}

async function rpc(settings: Settings, method: string, params?: unknown, id: number | null = 1) {
  const message = id === null ? { jsonrpc: '2.0', method, params } : { jsonrpc: '2.0', id, method, params };
  const out = await handleLine(TOOLS, settings, JSON.stringify(message));
  return out === null ? null : (JSON.parse(out) as { id: unknown; result?: Record<string, unknown>; error?: { code: number; message: string } });
}

async function call(settings: Settings, name: string, args: unknown) {
  const result = await callTool(TOOLS, settings, name, args);
  if (result === null) throw new Error(`no tool ${name}`);
  return result as { content: { type: string; text: string }[]; structuredContent?: Record<string, unknown>; isError: boolean };
}

describe('protocol', () => {
  test('initialize echoes a known version, offers tools, and names the server', async () => {
    const { settings } = fakes();
    const init = await rpc(settings, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
    expect(init?.result?.protocolVersion).toBe('2025-06-18');
    expect(init?.result?.capabilities).toEqual({ tools: { listChanged: false } });
    expect((init?.result?.serverInfo as { name: string }).name).toBe('unify-sdlc-read');
    const other = await rpc(settings, 'initialize', { protocolVersion: '1999-01-01' });
    expect(other?.result?.protocolVersion).toBe(PROTOCOL_VERSIONS[0]);
  });

  test('notifications get no reply; ping answers empty', async () => {
    const { settings } = fakes();
    expect(await rpc(settings, 'notifications/initialized', undefined, null)).toBeNull();
    expect((await rpc(settings, 'ping'))?.result).toEqual({});
  });

  test('tools/list: six tools, all read-only, each requires project and refuses extra arguments', async () => {
    const { settings } = fakes();
    const tools = (await rpc(settings, 'tools/list'))?.result?.tools as { name: string; inputSchema: { required: string[]; additionalProperties: boolean }; annotations: Record<string, unknown> }[];
    expect(tools.map(t => t.name)).toEqual(['overview', 'item', 'holds_and_releases', 'findings', 'run', 'attention']);
    for (const t of tools) {
      expect(t.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false, idempotentHint: true });
      expect(t.inputSchema.required).toContain('project');
      expect(t.inputSchema.additionalProperties).toBe(false);
    }
  });

  test('JSON-RPC errors: parse error, batch, unknown method, unknown tool', async () => {
    const { settings } = fakes();
    expect(JSON.parse((await handleLine(TOOLS, settings, '{not json')) as string).error.code).toBe(-32700);
    expect(JSON.parse((await handleLine(TOOLS, settings, '[{"jsonrpc":"2.0","id":1,"method":"ping"}]')) as string).error.code).toBe(-32600);
    expect((await rpc(settings, 'resources/list'))?.error?.code).toBe(-32601);
    expect((await rpc(settings, 'tools/call', { name: 'state_put', arguments: {} }))?.error?.code).toBe(-32602);
  });
});

describe('tools against fake seams', () => {
  test('overview: items by state, waiting, holds, line, findings; every read names the project', async () => {
    const { settings, argvs, urls } = fakes();
    const r = await call(settings, 'overview', { project: 'acme/shop' });
    expect(r.isError).toBe(false);
    const d = r.structuredContent as Record<string, any>;
    expect(d.items.total).toBe(4);
    expect(d.items.counts).toEqual({ implementing: 1, 'merge-review': 2, releasing: 1 });
    expect(d.items.byState['merge-review']).toEqual(['#13', '#14']);
    expect(d.items.byState.releasing).toEqual(['PROJ-7']);
    expect(d.items.setAside).toEqual(['#14']);
    expect(d.items.urgent).toEqual(['#13']);
    expect(d.waitingForPerson).toEqual({ count: 3, byKind: { awaiting_response: 1, attention: 1, usage_limit: 1 } });
    expect(d.holds.held).toEqual([{ env: 'staging', service: 'api', holder: '#12', since: '2026-11-25T10:00:00Z', queued: 2 }]);
    expect(d.releases.latest.id).toBe('r2');
    expect(d.releaseLine).toEqual({ blocked: null });
    expect(d.findings).toEqual({ size: 3, oldest: '2026-11-24T09:00:00Z' });
    expect(r.content[0]?.text).toContain('4 items');
    for (const argv of argvs) if (argv[0] === 'state') expect(argv.slice(-2)).toEqual(['--project', 'acme/shop']);
    expect(urls).toEqual([`${BASE}/api/runs/attention?project=acme%2Fshop`]);
  });

  test('overview without ARCHON_READ_URL: the attention part says why, the rest still reads', async () => {
    const { settings, urls } = fakes({ baseUrl: null });
    const r = await call(settings, 'overview', { project: 'acme/shop' });
    expect(r.isError).toBe(false);
    expect((r.structuredContent as any).waitingForPerson.error).toContain('ARCHON_READ_URL');
    expect((r.structuredContent as any).items.total).toBe(4);
    expect(urls).toEqual([]);
  });

  test('item: work and provenance documents and the engine item read, by key', async () => {
    const { settings, argvs, urls } = fakes();
    const r = await call(settings, 'item', { project: 'acme/shop', key: '#12' });
    const d = r.structuredContent as Record<string, any>;
    expect(d.work.state).toBe('implementing');
    expect(d.provenance.roles.implementer.models).toEqual(['model-i']);
    expect(d.engine.runs).toHaveLength(1);
    expect(r.content[0]?.text).toContain('1 open question');
    expect(argvs).toContainEqual(['state', 'get', 'work/12', '--project', 'acme/shop']);
    expect(argvs).toContainEqual(['state', 'get', 'provenance/12', '--project', 'acme/shop']);
    expect(urls).toEqual([`${BASE}/api/items?project=acme%2Fshop&key=issue-12`]);
  });

  test('item: a tracker key reads its own documents; an item nothing named reads as null', async () => {
    const { settings, argvs, urls } = fakes();
    const r = await call(settings, 'item', { project: 'acme/shop', key: 'PROJ-7' });
    expect(r.isError).toBe(false);
    expect((r.structuredContent as any).work.state).toBe('releasing');
    expect((r.structuredContent as any).engine).toBeNull();
    expect(argvs).toContainEqual(['state', 'get', 'work/proj-7', '--project', 'acme/shop']);
    expect(urls[0]).toContain('key=item-PROJ-7');
  });

  test('holds_and_releases: holds, the line, releases newest first with their gates, limited', async () => {
    const { settings } = fakes();
    const r = await call(settings, 'holds_and_releases', { project: 'acme/shop', limit: 1 });
    const d = r.structuredContent as Record<string, any>;
    expect(d.holds).toHaveLength(2);
    expect(d.holds[0]).toMatchObject({ env: 'staging', service: 'api', holder: '#12', queue: ['#13', '#14'] });
    expect(d.releases.map((x: any) => x.id)).toEqual(['r2']);
    expect(d.releases[0].gates).toEqual({ staging: { status: 'open', at: '2026-11-25T10:20:00Z', note: '' } });
    expect(d.releaseCount).toBe(2);
  });

  test('findings: oldest first, counted per item and role, limited', async () => {
    const { settings } = fakes();
    const r = await call(settings, 'findings', { project: 'acme/shop', limit: 2 });
    const d = r.structuredContent as Record<string, any>;
    expect(d.size).toBe(3);
    expect(d.findings.map((f: any) => f.id)).toEqual(['aaa', 'bbb']);
    expect(d.byItem).toEqual({ '#12': 2, '#13': 1 });
  });

  test('run: nodes with the resolved model and the cost, an unreported one never zero', async () => {
    const { settings, argvs } = fakes();
    const r = await call(settings, 'run', { project: 'acme/shop', runId: RUN_ID });
    const d = r.structuredContent as Record<string, any>;
    expect(argvs).toEqual([['workflow', 'get', RUN_ID, '--json', '--verbose']]);
    expect(d.status).toBe('completed');
    expect(d.totalCostUsd).toBe(2.75);
    expect(d.nodes[0]).toMatchObject({ node: 'implement', kind: 'agent', model: 'model-i-2', requestedModel: '@implementer', costUsd: 2.75, cost: 'reported' });
    expect(d.nodes[1]).toMatchObject({ node: 'review', model: 'not reported (not_reported)', costUsd: null, cost: 'not reported (unsupported)' });
    expect(d.nodes[2].children).toEqual(['child-run-0001']);
    expect(d.nodesWithoutCost).toEqual(['review']);
  });

  test('run: an answer for another run id is refused', async () => {
    const other = 'ffffffff-0000-4000-8000-000000000000';
    const spawn: Spawner = async () => cliOutput(['workflow', 'get', RUN_ID]) as CliResult;
    const r = await call(fakes({ spawn }).settings, 'run', { project: 'acme/shop', runId: other });
    expect(r.isError).toBe(true);
    expect(r.content[0]?.text).toContain('returned');
  });

  test('attention: the queue as Archon lists it, counted by kind', async () => {
    const { settings } = fakes();
    const r = await call(settings, 'attention', { project: 'acme/shop' });
    expect((r.structuredContent as any).byKind).toEqual({ awaiting_response: 1, attention: 1, usage_limit: 1 });
    expect((r.structuredContent as any).items).toHaveLength(3);
  });

  test('a failed CLI read is the tool error with Archon\'s reason', async () => {
    const spawn: Spawner = async () => ({ code: 1, stdout: JSON.stringify({ ok: false, error: 'store unavailable', code: 1 }), stderr: '' });
    const r = await call(fakes({ spawn }).settings, 'findings', { project: 'acme/shop' });
    expect(r.isError).toBe(true);
    expect(r.content[0]?.text).toContain('store unavailable');
  });

  test('a read that lands in install scope is refused', async () => {
    const spawn: Spawner = async () => ({ code: 0, stdout: JSON.stringify({ scope: { kind: 'install' }, documents: [] }), stderr: '' });
    const r = await call(fakes({ spawn }).settings, 'findings', { project: 'acme/shop' });
    expect(r.isError).toBe(true);
    expect(r.content[0]?.text).toContain('project scope');
  });

  test('an unexpected exception inside a tool is a tool error, not a crash', async () => {
    const spawn: Spawner = async () => {
      throw new TypeError('boom');
    };
    const r = await call(fakes({ spawn }).settings, 'overview', { project: 'acme/shop' });
    expect(r.isError).toBe(true);
    expect(r.content[0]?.text).toContain('internal error: boom');
  });
});

describe('the fence', () => {
  const hostile: [string, Record<string, unknown>][] = [
    ['item', { project: 'acme/shop', key: '../x' }],
    ['item', { project: 'acme/shop', key: '--project' }],
    ['item', { project: 'acme/shop', key: '#0' }],
    ['item', { project: 'acme/shop', key: 'proj-1' }],
    ['item', { project: 'acme/shop', key: 'work/12' }],
    ['item', { project: 'acme/shop', key: '12/../../ledger/12' }],
    ['item', { project: 'acme/shop', key: 12 }],
    ['item', { project: 'acme/shop' }],
    ['overview', { project: '--install' }],
    ['overview', { project: '-p' }],
    ['overview', { project: '../etc' }],
    ['overview', { project: 'acme/../other' }],
    ['overview', { project: 'a b' }],
    ['overview', { project: '/abs/path' }],
    ['overview', { project: 'a//b' }],
    ['overview', { project: '' }],
    ['overview', {}],
    ['overview', { project: 'acme/shop', prefix: 'ledger/' }],
    ['overview', { project: 'acme/shop', command: 'state put work/12' }],
    ['findings', { project: 'acme/shop', limit: 0 }],
    ['findings', { project: 'acme/shop', limit: 1000 }],
    ['findings', { project: 'acme/shop', limit: '5' }],
    ['run', { project: 'acme/shop', runId: '--json' }],
    ['run', { project: 'acme/shop', runId: '../x' }],
    ['run', { project: 'acme/shop', runId: 'abc' }],
    ['run', { project: 'acme/shop', runId: `${RUN_ID} --all` }],
    ['attention', { project: 'acme/shop', path: '/api/attention/answer' }],
  ];
  for (const [tool, args] of hostile) {
    test(`${tool} ${JSON.stringify(args)} is refused before any read`, async () => {
      const { settings, argvs, urls } = fakes();
      const r = await call(settings, tool, args);
      expect(r.isError).toBe(true);
      expect(argvs).toEqual([]);
      expect(urls).toEqual([]);
    });
  }

  test('every read any tool makes is a listed form', async () => {
    const seen: string[][] = [];
    const spawn: Spawner = async argv => {
      seen.push([...argv]);
      return cliOutput(argv) as CliResult;
    };
    const { settings } = fakes({ spawn });
    for (const [tool, args] of [
      ['overview', { project: 'acme/shop' }],
      ['item', { project: 'acme/shop', key: '12' }],
      ['item', { project: '_folder/ops', key: 'ABC_1-99' }],
      ['holds_and_releases', { project: 'acme/shop' }],
      ['findings', { project: '@cwd/scratch-1a2b' }],
      ['run', { project: 'acme/shop', runId: RUN_ID }],
      ['attention', { project: 'acme/shop' }],
    ] as const) {
      await call(settings, tool, args);
    }
    expect(seen.length).toBeGreaterThan(10);
    for (const argv of seen) {
      expect(() => checkArgv(argv)).not.toThrow();
      expect([['state', 'get'], ['state', 'list'], ['workflow', 'get']]).toContainEqual(argv.slice(0, 2));
    }
  });

  test('the CLI allowlist refuses writes, other families, other commands and loose flags', () => {
    const refused: string[][] = [
      ['state', 'put', 'work/12', '--if-revision', '0', '--project', 'acme/shop'],
      ['state', 'patch', 'work/12', '--project', 'acme/shop'],
      ['state', 'delete', 'findings/aaa', '--project', 'acme/shop'],
      ['state', 'claim'],
      ['state', 'get', 'ledger/12', '--project', 'acme/shop'],
      ['state', 'get', 'work/../ledger/12', '--project', 'acme/shop'],
      ['state', 'get', 'work/12', '--install'],
      ['state', 'get', 'work/12'],
      ['state', 'get', 'work/12', '--project', 'acme/shop', '--raw'],
      ['state', 'get', 'work/12', '--project', '--install'],
      ['state', 'list', '--prefix', 'ledger/', '--values', '--project', 'acme/shop'],
      ['state', 'list', '--prefix', 'deploy-asks/', '--values', '--project', 'acme/shop'],
      ['state', 'list', '--prefix', '', '--values', '--project', 'acme/shop'],
      ['state', 'list', '--prefix', 'work/', '--values'],
      ['state', 'log', 'work/12', '--project', 'acme/shop'],
      ['workflow', 'run', 'unify-ping'],
      ['workflow', 'approve', RUN_ID],
      ['workflow', 'cancel', RUN_ID],
      ['workflow', 'get', RUN_ID, '--json'],
      ['workflow', 'get', '--all', '--json', '--verbose'],
      ['hold', 'set'],
      ['hold', 'lift'],
      ['trigger', 'fire', 'x'],
      [],
    ];
    for (const argv of refused) expect(() => checkArgv(argv)).toThrow(ReadError);
  });

  test('the HTTP allowlist refuses write routes, other routes and extra parameters', () => {
    expect(() => checkRoute('/api/attention/answer', {})).toThrow(ReadError);
    expect(() => checkRoute('/api/workflows/runs/x/cancel', {})).toThrow(ReadError);
    expect(() => checkRoute('/api/items/rulings', { project: 'p' })).toThrow(ReadError);
    expect(() => checkRoute('/api/providers/opencode/credentials', {})).toThrow(ReadError);
    expect(() => checkRoute('/api/items', { project: 'p', key: 'k', as: 'x' })).toThrow(ReadError);
    expect(() => checkRoute('/api/items', { project: 'p', key: 'k' })).not.toThrow();
  });

  test('the real CLI seam refuses an unlisted argv without starting a process', async () => {
    const spawn = cliSpawner(['a-binary-that-does-not-exist'], '.', {});
    await expect(spawn(['state', 'put', 'work/12', '--if-revision', '0'], { signal: new AbortController().signal, maxBytes: 1000 })).rejects.toThrow('refused');
  });

  test('auth comes from the environment and never from a file; a URL with credentials is refused', () => {
    expect(httpConfig({ ARCHON_READ_URL: 'http://127.0.0.1:3090/', ARCHON_READ_USER: 'reader' })).toEqual({ baseUrl: 'http://127.0.0.1:3090', headers: { 'X-Archon-User': 'reader' } });
    expect(httpConfig({ ARCHON_READ_URL: 'https://h/archon', ARCHON_READ_COOKIE: 's=1', ARCHON_READ_USER_HEADER: 'X-Proxy-User', ARCHON_READ_USER: 'r' }).headers).toEqual({ 'X-Proxy-User': 'r', cookie: 's=1' });
    expect(httpConfig({}).baseUrl).toBeNull();
    expect(() => httpConfig({ ARCHON_READ_URL: 'http://u:p@h' })).toThrow();
    expect(() => httpConfig({ ARCHON_READ_URL: 'file:///etc' })).toThrow();
    expect(() => httpConfig({ ARCHON_READ_URL: 'http://h', ARCHON_READ_USER_HEADER: 'X: y' })).toThrow();
  });
});

describe('limits', () => {
  test('an output over the cap is cut list by list and says so', async () => {
    const many = Object.fromEntries(
      Array.from({ length: 80 }, (_, i) => [`findings/f${String(i).padStart(3, '0')}`, { id: `f${String(i).padStart(3, '0')}`, item: '#1', role: 'reviewer', where: 'x.ts', what: 'w'.repeat(200), evidence: 'e'.repeat(200), at: `2026-11-25T10:${String(i % 60).padStart(2, '0')}:00Z` }])
    );
    const spawn: Spawner = async () => ({ code: 0, stdout: JSON.stringify({ scope: { kind: 'project', key: 'p' }, documents: Object.entries(many).map(([name, value]) => ({ name, revision: 1, value, lease: null })) }), stderr: '' });
    const r = await call(fakes({ spawn, maxBytes: 6_000 }).settings, 'findings', { project: 'acme/shop', limit: 80 });
    expect(r.isError).toBe(false);
    const d = r.structuredContent as Record<string, any>;
    expect(Buffer.byteLength(JSON.stringify(d))).toBeLessThanOrEqual(6_000);
    expect(d.size).toBe(80);
    expect(d.findings.length).toBeLessThan(80);
    expect(d.truncated).toContainEqual({ path: 'findings', of: 80, kept: d.findings.length });
    expect(r.content[0]?.text).toContain('Output cut');
  });

  test('an output that cannot be cut under the cap is a tool error', () => {
    const wide = Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`k${i}`, i]));
    expect(() => fitOutput(wide, 1_000)).toThrow('stays over');
  });

  test('a read past the deadline is a tool error and its process is told to stop', async () => {
    let aborted = false;
    const spawn: Spawner = (_argv, { signal }) =>
      new Promise((_, reject) => {
        signal.addEventListener('abort', () => {
          aborted = true;
          reject(new ReadError('aborted'));
        });
      });
    const r = await call(fakes({ spawn, timeoutMs: 50 }).settings, 'findings', { project: 'acme/shop' });
    expect(r.isError).toBe(true);
    expect(r.content[0]?.text).toContain('timed out after 50 ms');
    expect(aborted).toBe(true);
  });
});

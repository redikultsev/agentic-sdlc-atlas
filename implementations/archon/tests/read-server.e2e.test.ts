/**
 * End to end: the read server started as a process over stdio, spoken to by the pack's own
 * MCP client (`.shared/mcp.ts`), its real seams pointed at a stand-in `archon` binary
 * (`fake-archon.ts`) and a local HTTP server that records every request.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connect, type McpSession } from '../.shared/mcp.ts';
import { httpOutput, RUN_ID } from './read-server-fixtures.ts';

const dir = mkdtempSync(join(tmpdir(), 'read-server-'));
const log = join(dir, 'archon.log');
const requests: { method: string; path: string; user: string | null }[] = [];
let http: ReturnType<typeof Bun.serve>;
let session: McpSession;

beforeAll(async () => {
  http = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    fetch(req) {
      const url = new URL(req.url);
      requests.push({ method: req.method, path: url.pathname, user: req.headers.get('x-archon-user') });
      const out = httpOutput(url.pathname, url.searchParams);
      return Response.json(out.body, { status: out.status });
    },
  });
  const opened = await connect(
    {
      command: process.execPath,
      args: [join(import.meta.dir, '..', 'read-server', 'server.ts')],
      env: {
        ARCHON_READ_CLI: JSON.stringify([process.execPath, join(import.meta.dir, 'fake-archon.ts')]),
        ARCHON_READ_URL: `http://127.0.0.1:${http.port}`,
        ARCHON_READ_USER: 'reader',
        ARCHON_READ_CWD: dir,
        FAKE_ARCHON_LOG: log,
        WORKFLOW_ID: 'a-run-the-server-must-not-pass-on',
      },
    },
    { timeoutMs: 20_000 }
  );
  if ('ok' in opened) throw new Error(`could not start the read server: ${opened.message}`);
  session = opened;
});

afterAll(async () => {
  await session?.close();
  http?.stop(true);
  rmSync(dir, { recursive: true, force: true });
});

describe('the read server over stdio', () => {
  test('handshake and tool list', async () => {
    expect(session.server.name).toBe('unify-sdlc-read');
    const listed = await session.tools();
    if (!listed.ok) throw new Error(listed.message);
    expect(listed.tools.map(t => t.name)).toEqual(['overview', 'item', 'holds_and_releases', 'findings', 'run', 'attention']);
  });

  test('overview and item read through the real seams; only GETs, with the identity from the environment', async () => {
    const overview = await session.call('overview', { project: 'acme/shop' });
    if (!overview.ok) throw new Error(overview.message);
    expect((overview.data as any).items.total).toBe(4);
    expect((overview.data as any).waitingForPerson.count).toBe(3);
    const item = await session.call('item', { project: 'acme/shop', key: '#12' });
    if (!item.ok) throw new Error(item.message);
    expect((item.data as any).work.state).toBe('implementing');
    expect((item.data as any).engine.questions).toHaveLength(1);
    const run = await session.call('run', { project: 'acme/shop', runId: RUN_ID });
    if (!run.ok) throw new Error(run.message);
    expect((run.data as any).nodes[0].model).toBe('model-i-2');

    expect(requests.length).toBe(2);
    for (const r of requests) {
      expect(r.method).toBe('GET');
      expect(r.user).toBe('reader');
    }
    const calls = readFileSync(log, 'utf8').trim().split('\n').map(l => JSON.parse(l) as { argv: string[]; workflowId: string | null; readEnv: string[] });
    expect(calls.length).toBe(8);
    for (const c of calls) {
      expect(['state get', 'state list', 'workflow get']).toContain(c.argv.slice(0, 2).join(' '));
      expect(c.workflowId).toBeNull();
      expect(c.readEnv).toEqual([]);
    }
  });

  test('a hostile key is a tool error and the server keeps answering', async () => {
    const before = readFileSync(log, 'utf8');
    const bad = await session.call('item', { project: 'acme/shop', key: '../../ledger/12' });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.kind).toBe('tool');
    const flag = await session.call('overview', { project: '--install' });
    expect(flag.ok).toBe(false);
    expect(readFileSync(log, 'utf8')).toBe(before);
    const again = await session.call('attention', { project: 'acme/shop' });
    expect(again.ok).toBe(true);
  });
});

/**
 * End to end: the request server started as a process over stdio, spoken to by the pack's own
 * MCP client (`.shared/mcp.ts`), its real GitHub client pointed at a fake GitHub served on
 * the loopback address.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { connect, type McpSession } from '../.shared/mcp.ts';
import { FakeGitHub } from './fake-github.ts';

const TOKEN = 'github_pat_11BBBBBBB0e2etokene2etoken0000';
const gh = new FakeGitHub(TOKEN);
let http: ReturnType<typeof Bun.serve>;
let session: McpSession;

beforeAll(async () => {
  http = gh.serve();
  const opened = await connect(
    {
      command: process.execPath,
      args: [join(import.meta.dir, '..', 'request-server', 'server.ts')],
      env: {
        REQUEST_GITHUB_TOKEN: TOKEN,
        REQUEST_GITHUB_API: `http://127.0.0.1:${http.port}`,
        REQUEST_PROJECTS: JSON.stringify({ 'acme/shop': { intake_label: 'pipeline' } }),
        REQUEST_DAILY_CAP: '3',
      },
    },
    { timeoutMs: 20_000 }
  );
  if ('ok' in opened) throw new Error(`could not start the request server: ${opened.message}`);
  session = opened;
});

afterAll(async () => {
  await session?.close();
  http?.stop(true);
});

describe('the request server over stdio', () => {
  test('handshake and tool list', async () => {
    expect(session.server.name).toBe('unify-sdlc-request');
    const listed = await session.tools();
    if (!listed.ok) throw new Error(listed.message);
    expect(listed.tools.map(t => t.name)).toEqual(['file_request']);
  });

  test('files once, answers the retry with the same issue, refuses another project, never echoes the token', async () => {
    const ask = { project: 'acme/shop', title: 'Add a dark theme', body: 'The Operator asks for a dark theme in the console.' };
    const filed = await session.call('file_request', ask);
    if (!filed.ok) throw new Error(filed.message);
    expect(filed.data).toMatchObject({ project: 'acme/shop', number: 1, filed: true, labels: ['pipeline'] });
    const again = await session.call('file_request', ask);
    if (!again.ok) throw new Error(again.message);
    expect(again.data).toMatchObject({ number: 1, alreadyFiled: true });
    expect(gh.creates()).toHaveLength(1);
    expect(gh.seen.every(s => s.auth === `Bearer ${TOKEN}`)).toBe(true);

    const other = await session.call('file_request', { ...ask, project: 'acme/other' });
    expect(other.ok).toBe(false);
    if (other.ok) return;
    expect(other.kind).toBe('tool');
    expect(other.message).toContain('not one this server files requests for');

    gh.failCreate = { status: 500, message: `boom ${TOKEN}` };
    const failed = await session.call('file_request', { ...ask, title: 'Something else' });
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.message).toContain('answered 500');
    expect(failed.message).not.toContain(TOKEN);
  });
});

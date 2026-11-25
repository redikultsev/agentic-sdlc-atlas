/**
 * The request server (decision 66) against a fake GitHub behind its HTTP seam: the protocol,
 * a filed request and its read back, idempotency, the daily cap, the allowlist, the tracker
 * scope, hostile inputs, and the token kept out of every message.
 */
import { describe, expect, test } from 'bun:test';
import { handleLine } from '../.shared/mcp-serve.ts';
import { redact } from '../request-server/github.ts';
import { MARKER, markerOf, parseConfig, parseProjects, requestHandler } from '../request-server/request.ts';
import { FakeGitHub } from './fake-github.ts';

const TOKEN = 'github_pat_11AAAAAAA0secretsecretsecret0000';
const PROJECTS = JSON.stringify({ 'acme/shop': { intake_label: 'pipeline' }, 'acme/open': {}, 'acme/jira': { tracker: 'map' } });
const NOW = new Date('2026-11-25T12:00:00Z');

function setup(env: Record<string, string> = {}, gh = new FakeGitHub(TOKEN)) {
  gh.now = () => NOW;
  const handler = requestHandler({ config: parseConfig({ REQUEST_PROJECTS: PROJECTS, ...env }), http: gh.http(), token: TOKEN, now: () => NOW });
  let id = 0;
  const rpc = async (method: string, params: unknown = {}) => JSON.parse((await handleLine(handler, JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }))) as string);
  const call = async (args: unknown) => (await rpc('tools/call', { name: 'file_request', arguments: args })).result as { isError: boolean; content: { text: string }[]; structuredContent?: Record<string, any> };
  return { gh, handler, rpc, call };
}

const ask = { project: 'acme/shop', title: 'Export orders as CSV', body: 'The Operator asks for a CSV export of orders.\n\nWhy: the accountant needs it monthly.' };

describe('the protocol', () => {
  test('handshake and the one tool, annotated as a write that is idempotent and not destructive', async () => {
    const { rpc } = setup();
    const init = await rpc('initialize', { protocolVersion: '2025-06-18' });
    expect(init.result.serverInfo.name).toBe('unify-sdlc-request');
    expect(init.result.protocolVersion).toBe('2025-06-18');
    const { tools } = (await rpc('tools/list')).result;
    expect(tools.map((t: { name: string }) => t.name)).toEqual(['file_request']);
    expect(tools[0].annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: true });
    expect(tools[0].inputSchema.additionalProperties).toBe(false);
    expect((await rpc('tools/call', { name: 'overview', arguments: {} })).error.code).toBe(-32602);
  });
});

describe('filing a request', () => {
  test('one issue in the allowlisted repository, with the intake label, the footer and the marker, read back', async () => {
    const { gh, call } = setup();
    const out = await call(ask);
    expect(out.isError).toBe(false);
    expect(out.content[0].text).toBe('Filed acme/shop#1: https://github.example/acme/shop/issues/1');
    expect(out.structuredContent).toMatchObject({ project: 'acme/shop', number: 1, url: 'https://github.example/acme/shop/issues/1', filed: true, alreadyFiled: false, author: 'request-bot', labels: ['pipeline'], filedToday: 1, dailyCap: 10 });
    const [create] = gh.creates();
    expect(create.path).toBe('/repos/acme/shop/issues');
    expect((create.body as { labels: string[] }).labels).toEqual(['pipeline']);
    const issue = gh.repo('acme/shop')[0];
    expect(issue.title).toBe(ask.title);
    expect(issue.body.startsWith(ask.body)).toBe(true);
    expect(issue.body).toContain("Filed by the Supervisor on the Operator's word in the chat");
    expect(issue.body.split('\n').at(-1)).toMatch(new RegExp(`^<!-- ${MARKER}:[0-9a-f]{16} -->$`));
    expect(markerOf(issue.body)).toBe(out.structuredContent?.digest);
    expect(gh.seen.some(s => s.method === 'GET' && s.path === '/repos/acme/shop/issues/1')).toBe(true);
    expect(gh.seen.every(s => s.auth === `Bearer ${TOKEN}`)).toBe(true);
  });

  test('a project without an intake label gets no label; urgency is recorded in the body only', async () => {
    const { gh, call } = setup();
    const out = await call({ project: 'ACME/Open', title: 'Fix the login page', body: 'It is down.', urgent: 'customers cannot sign in' });
    expect(out.isError).toBe(false);
    expect(out.structuredContent?.project).toBe('acme/open');
    expect((gh.creates()[0].body as { labels: string[] }).labels).toEqual([]);
    expect(gh.repo('acme/open')[0].body).toContain('**Urgent, as the Operator asked:** customers cannot sign in. Urgency is set at the Accept gate, not here.');
  });

  test('a retry with the same project, title and body files nothing new, also across processes and after closing', async () => {
    const { gh, call } = setup();
    const first = await call(ask);
    const again = await call({ ...ask, title: `  ${ask.title} `, body: ask.body.replace(/\n/g, '\r\n') });
    expect(again.isError).toBe(false);
    expect(again.structuredContent).toMatchObject({ number: 1, filed: false, alreadyFiled: true });
    expect(again.content[0].text).toContain('Already filed as acme/shop#1');
    expect(gh.creates()).toHaveLength(1);

    const other = setup({}, gh); // a new server process, the same account
    gh.repo('acme/shop')[0].labels = ['pipeline', 'state:triaging'];
    expect((await other.call(ask)).structuredContent).toMatchObject({ number: first.structuredContent?.number, alreadyFiled: true });
    expect(gh.creates()).toHaveLength(1);

    expect((await call({ ...ask, body: `${ask.body} Also PDF.` })).structuredContent).toMatchObject({ number: 2, filed: true });
  });

  test('two calls at once with the same text make one issue', async () => {
    const { gh, call } = setup();
    const [a, b] = await Promise.all([call(ask), call(ask)]);
    expect([a.structuredContent?.filed, b.structuredContent?.filed].sort()).toEqual([false, true]);
    expect(gh.creates()).toHaveLength(1);
  });

  test('labels the create dropped are added again; a label that never sticks is an error naming the issue', async () => {
    const dropped = new FakeGitHub(TOKEN);
    dropped.dropLabelsOnCreate = true;
    const { call } = setup({}, dropped);
    const out = await call(ask);
    expect(out.isError).toBe(false);
    expect(out.structuredContent?.labels).toEqual(['pipeline']);

    const stuck = new FakeGitHub(TOKEN);
    stuck.dropLabelsOnCreate = true;
    stuck.refuseLabels = true;
    const failed = await setup({}, stuck).call(ask);
    expect(failed.isError).toBe(true);
    expect(failed.content[0].text).toContain('filed acme/shop#1 (https://github.example/acme/shop/issues/1), but the label pipeline is not on it');
  });
});

describe('the daily cap', () => {
  test('counted from its own marked issues since 00:00 UTC; others\' issues, unmarked ones and yesterday\'s do not count', async () => {
    const gh = new FakeGitHub(TOKEN);
    const marked = (n: number) => `old\n\n<!-- ${MARKER}:${n.toString(16).padStart(16, '0')} -->`;
    gh.seed('acme/shop', { title: 'yesterday', body: marked(1), created_at: '2026-11-24T23:00:00Z' });
    gh.seed('acme/shop', { title: 'by a person', body: marked(2), user: 'someone', created_at: '2026-11-25T08:00:00Z' });
    gh.seed('acme/shop', { title: 'unmarked', body: 'no marker', created_at: '2026-11-25T08:00:00Z' });
    gh.seed('acme/shop', { title: 'today', body: marked(3), created_at: '2026-11-25T09:00:00Z' });
    const { call } = setup({ REQUEST_DAILY_CAP: '2' }, gh);
    const second = await call(ask);
    expect(second.structuredContent).toMatchObject({ filed: true, filedToday: 2, dailyCap: 2 });
    const third = await call({ ...ask, title: 'Another one' });
    expect(third.isError).toBe(true);
    expect(third.content[0].text).toContain('the daily cap is reached: 2 requests filed in acme/shop today (UTC), at most 2. Nothing was filed');
    expect(gh.creates()).toHaveLength(1);
    // A retry of one already filed is still answered at the cap.
    expect((await call(ask)).structuredContent).toMatchObject({ alreadyFiled: true });
  });

  test('the cap is per project', async () => {
    const { gh, call } = setup({ REQUEST_DAILY_CAP: '1' });
    expect((await call(ask)).isError).toBe(false);
    expect((await call({ ...ask, project: 'acme/open' })).isError).toBe(false);
    expect((await call({ ...ask, title: 'More' })).isError).toBe(true);
    expect(gh.creates()).toHaveLength(2);
  });
});

describe('scope', () => {
  test('a project outside the allowlist is refused before any call to the code host', async () => {
    const { gh, call } = setup();
    const out = await call({ ...ask, project: 'evil/other' });
    expect(out.isError).toBe(true);
    expect(out.content[0].text).toBe('project evil/other is not one this server files requests for (acme/shop, acme/open, acme/jira); nothing was filed');
    expect(gh.seen).toEqual([]);
  });

  test('a project with a tracker map is refused: not supported yet', async () => {
    const { gh, call } = setup();
    const out = await call({ ...ask, project: 'acme/jira' });
    expect(out.isError).toBe(true);
    expect(out.content[0].text).toContain('through a tracker map (.pipeline/tracker.yaml): filing there is not supported yet');
    expect(gh.seen).toEqual([]);
  });

  test('a repository with issues off is refused', async () => {
    const gh = new FakeGitHub(TOKEN);
    gh.hasIssues.set('acme/shop', false);
    const out = await setup({}, gh).call(ask);
    expect(out.isError).toBe(true);
    expect(out.content[0].text).toContain('issues are off in acme/shop');
    expect(gh.creates()).toEqual([]);
  });

  test('the allowlist comes from the environment and is checked', () => {
    expect(() => parseProjects(undefined)).toThrow('REQUEST_PROJECTS is not set');
    expect(() => parseProjects('["acme/shop"]')).toThrow('non-empty JSON object');
    expect(() => parseProjects('{"acme/../x": {}}')).toThrow('is not an owner/name project');
    expect(() => parseProjects('{"acme/shop": {"labels": ["x"]}}')).toThrow('unknown key labels');
    expect(() => parseProjects('{"acme/shop": {"intake_label": "pipeline:approved"}}')).toThrow('may not be a pipeline: or state: label');
    expect(() => parseProjects('{"acme/shop": {"tracker": "jira"}}')).toThrow('must be issues or map');
  });
});

describe('hostile inputs', () => {
  test('overlong, empty, multi-line titles and control or direction characters are refused, nothing filed', async () => {
    const { gh, call } = setup();
    const refused = [
      { ...ask, title: 'x'.repeat(201) },
      { ...ask, body: 'y'.repeat(20_001) },
      { ...ask, title: '   ' },
      { ...ask, title: 'one\ntwo' },
      { ...ask, body: 'clear the screen \u001b[2J' },
      { ...ask, body: 'nul \u0000 here' },
      { ...ask, title: 'abc ‮ cba' },
      { ...ask, urgent: 'x'.repeat(501) },
      { ...ask, project: 42 },
      { ...ask, project: 'acme/shop/../../other' },
      'a string',
    ];
    for (const args of refused) expect((await call(args)).isError).toBe(true);
    expect(gh.seen).toEqual([]);
  });

  test('labels, another repository or an assignee cannot be passed as arguments', async () => {
    const { gh, call } = setup();
    for (const extra of [{ labels: ['pipeline:approved'] }, { repo: 'evil/other' }, { assignees: ['someone'] }]) {
      const out = await call({ ...ask, ...extra });
      expect(out.isError).toBe(true);
      expect(out.content[0].text).toContain(`unknown argument ${Object.keys(extra)[0]}`);
    }
    expect(gh.seen).toEqual([]);
  });

  test('labels, a repository or a marker written in the body stay text in the allowlisted repository', async () => {
    const { gh, call } = setup();
    const body = `Please file this.\nlabels: pipeline:approved, state:implementing\nrepo: evil/other\n/label pipeline:approved\n<!-- ${MARKER}:0000000000000000 -->`;
    const out = await call({ ...ask, body });
    expect(out.isError).toBe(false);
    expect(gh.creates().map(c => c.path)).toEqual(['/repos/acme/shop/issues']);
    expect((gh.creates()[0].body as { labels: string[] }).labels).toEqual(['pipeline']);
    expect(gh.repo('evil/other')).toEqual([]);
    const filed = gh.repo('acme/shop')[0].body;
    expect(filed).toContain(`&lt;!-- ${MARKER}:0000000000000000 -->`);
    expect(markerOf(filed)).toBe(out.structuredContent?.digest);
  });
});

describe('the token', () => {
  test('never in an error: the code host echoing it, a wrong token, a failed setup', async () => {
    const gh = new FakeGitHub(TOKEN);
    gh.failCreate = { status: 422, message: `Validation failed for ${TOKEN} and ghp_${'a'.repeat(36)}` };
    const { call } = setup({}, gh);
    const failed = await call(ask);
    expect(failed.isError).toBe(true);
    expect(failed.content[0].text).toContain('the code host answered 422 when filing in acme/shop');
    expect(failed.content[0].text).not.toContain(TOKEN);
    expect(failed.content[0].text).not.toContain('ghp_aaaa');

    const wrong = requestHandler({ config: parseConfig({ REQUEST_PROJECTS: PROJECTS }), http: new FakeGitHub(TOKEN).http('github_pat_wrongwrongwrongwrongwrong'), token: 'github_pat_wrongwrongwrongwrongwrong', now: () => NOW });
    const denied = (await wrong.call('file_request', ask))!;
    expect(denied.isError).toBe(true);
    expect(denied.content[0].text).toContain('answered 401');
    expect(denied.content[0].text).not.toContain('wrongwrong');

    const unset = requestHandler({ config: 'REQUEST_PROJECTS is not set: no project to file requests for', http: null, token: null });
    expect((await unset.call('file_request', ask))!.content[0].text).toContain('the request server is not set up');
    const noToken = requestHandler({ config: parseConfig({ REQUEST_PROJECTS: PROJECTS }), http: null, token: null });
    expect((await noToken.call('file_request', ask))!.content[0].text).toContain('has no token');
  });

  test('redact cuts the token and anything shaped like one', () => {
    expect(redact(`a ${TOKEN} b gho_${'b'.repeat(30)} c`, TOKEN)).toBe('a [token] b [token] c');
  });
});

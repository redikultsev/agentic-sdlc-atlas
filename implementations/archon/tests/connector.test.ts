/**
 * The connector's write rules (decision 47) against an in-memory tracker, and the project
 * map (decision 46) against a fake MCP session: once per write key, read back, queued in
 * an outage, a refusal recorded for the Operator, the map's arguments and answers.
 */
import { beforeEach, describe, expect, test } from 'bun:test';
import { fake } from './archon-script.stub.ts';
import { fakeTracker } from './fake-tracker.ts';
import { readLedger, TrackerError, useTracker, type Tracker } from '../.shared/connector.ts';
import { at, checkMap, fill, mapAdapter, parseMap } from '../.shared/map.ts';
import type { McpSession } from '../.shared/mcp.ts';
import { reconcile } from '../.shared/stage.ts';
import { moveState, NONE } from '../.shared/states.ts';

let t = fakeTracker();
let connector: Tracker;

beforeEach(() => {
  fake.reset();
  t = fakeTracker();
  connector = useTracker(t.adapter)!;
});

describe('write once', () => {
  test('a comment is written once per marker; a second write edits it; both read back', async () => {
    t.item('#7');
    const id = await connector.comment('#7', 'ruling:1', 'first');
    expect(await connector.comment('#7', 'ruling:1', 'first')).toBe(id);
    expect(t.items.get('#7')!.comments.length).toBe(1);
    await connector.comment('#7', 'ruling:1', 'second');
    expect(t.items.get('#7')!.comments.map(c => c.body)).toEqual(['second']);
    expect(readLedger('#7').writes['comment:ruling:1'].id).toBe(id!);
  });

  test('a comment whose answer was lost is found again, not written twice', async () => {
    t.item('#7');
    t.loseAnswer.add('comment');
    expect(await connector.comment('#7', 'note', 'hello')).toBeNull();
    expect(Object.keys(readLedger('#7').pending)).toEqual(['comment:note']);
    expect(await connector.flush('#7')).toBe(1);
    expect(t.items.get('#7')!.comments.map(c => c.body)).toEqual(['hello']);
    expect(readLedger('#7').pending).toEqual({});
  });

  test('a create whose answer was lost is found by its title on the retry', async () => {
    t.loseAnswer.add('create');
    await expect(connector.create('project', 'register', 'Pipeline rulings', 'text')).rejects.toThrow(TrackerError);
    const key = await connector.create('project', 'register', 'Pipeline rulings', 'text');
    expect([...t.items.keys()]).toEqual([key]);
    expect(await connector.create('project', 'register', 'Pipeline rulings', 'text')).toBe(key);
    expect(t.calls.filter(c => c === 'create').length).toBe(1);
  });

  test('closing a closed item writes nothing', async () => {
    t.item('#7');
    await connector.close('#7', 'completed');
    await connector.close('#7', 'completed');
    expect(t.calls.filter(c => c.startsWith('close')).length).toBe(1);
  });
});

describe('an outage', () => {
  test('labels and comments queue, the latest per key, and go out on the next write', async () => {
    t.item('#7', ['a']);
    t.down = true;
    await connector.label('#7', { add: ['b'], remove: ['a'] });
    await connector.label('#7', { add: ['a'] });
    await connector.comment('#7', 'note', 'one');
    await connector.comment('#7', 'note', 'two');
    expect(Object.keys(readLedger('#7').pending).sort()).toEqual(['comment:note', 'label:a', 'label:b']);
    t.down = false;
    await connector.label('#7', { add: ['c'] });
    expect(t.labels('#7').sort()).toEqual(['a', 'b', 'c']);
    expect(t.items.get('#7')!.comments.map(c => c.body)).toEqual(['two']);
  });

  test('a create or a close does not queue: it throws for the node to retry', async () => {
    t.item('#7');
    t.down = true;
    await expect(connector.create('project', 'x', 'X', 'x')).rejects.toMatchObject({ kind: 'outage' });
    await expect(connector.close('#7', 'completed')).rejects.toMatchObject({ kind: 'outage' });
  });

  test('a stage starts on the engine state while the tracker is down', async () => {
    t.item('#7');
    await moveState('#7', [NONE], 'triaging');
    t.down = true;
    expect((await reconcile('#7', ['triaging'])).reason).toBeNull();
  });
});

describe('a refused write', () => {
  test('is recorded and becomes the difference request at the next stage', async () => {
    t.item('#7');
    await moveState('#7', [NONE], 'triaging');
    t.refuse.add('comment');
    await expect(connector.comment('#7', 'note', 'x')).rejects.toMatchObject({ kind: 'refused' });
    const found = await reconcile('#7', ['triaging']);
    expect(found.reason).toContain('the tracker refused 1 write');
    expect(found.difference?.message).toContain('comment:note');
  });
});

describe('the project map', () => {
  const MAP = `
server: { command: fake-mcp }
url: "https://jira.example/browse/{key}"
operations:
  view: { tool: get_issue, args: { issue_key: "{key}" },
          read: { title: fields.summary, body: fields.description, labels: fields.labels,
                  open: { path: fields.status.category, not: [done] },
                  creator: { id: fields.creator.accountId, login: fields.creator.name } } }
  comments: { tool: get_comments, args: { issue_key: "{key}" }, read: { list: comments, id: id, body: body, author: author.name } }
  comment: { tool: add_comment, args: { issue_key: "{key}", body: "{body}" }, read: { id: id } }
  label.add: { tool: update_issue, args: { issue_key: "{key}", update: { labels: [{ add: "{label}" }] } } }
  label.remove: { tool: update_issue, args: { issue_key: "{key}", update: { labels: [{ remove: "{label}" }] } } }
  close.completed: { tool: transition, args: { issue_key: "{key}", transition: Done } }
`;

  function session(reply: (tool: string, args: Record<string, unknown>) => unknown): { calls: [string, Record<string, unknown>][]; open: () => Promise<McpSession> } {
    const calls: [string, Record<string, unknown>][] = [];
    const s: McpSession = {
      server: { name: 'fake', version: '1' },
      tools: async () => ({ ok: true, tools: [] }),
      async call(tool, args) {
        calls.push([tool, args as Record<string, unknown>]);
        const r = reply(tool, args as Record<string, unknown>);
        if (r instanceof Error) return { ok: false, kind: 'tool', message: r.message };
        return { ok: true, text: JSON.stringify(r), data: r, raw: r };
      },
      close: async () => {},
    };
    return { calls, open: async () => s };
  }

  test('placeholders: a whole one keeps its value, a part one becomes text', () => {
    expect(fill({ a: '{labels}', b: 'x-{key}', c: [{ add: '{label}' }] }, { labels: ['p', 'q'], key: 'P-1', label: 'l' })).toEqual({ a: ['p', 'q'], b: 'x-P-1', c: [{ add: 'l' }] });
    expect(at({ a: { b: [{ c: 5 }] } }, 'a.b.0.c')).toBe(5);
  });

  test('the install check names what is required and missing, and what the tracker lacks', () => {
    const map = parseMap(MAP);
    expect(checkMap(map).missing).toEqual([]);
    expect(checkMap(map).lacks).toEqual(['create', 'list', 'slice', 'blocked-by', 'blockers', 'label-set-by', 'comment-edit']);
    expect(() => mapAdapter(parseMap(MAP.replace(/  comment: .*\n/, '')))).toThrow('lacks the required comment');
  });

  test('a view reads the fields where the map says, the creator and not the reporter', async () => {
    const fakeMcp = session(() => ({
      fields: { summary: 'Fix it', description: 'Body', labels: ['state:triaging'], status: { category: 'indeterminate' }, creator: { accountId: 'u1', name: 'alice' }, reporter: { name: 'mallory' } },
    }));
    const adapter = mapAdapter(parseMap(MAP), fakeMcp.open);
    const view = await adapter.view('PROJ-1');
    expect(view).toMatchObject({ key: 'PROJ-1', open: true, title: 'Fix it', labels: ['state:triaging'], creator: { id: 'u1', login: 'alice' }, url: 'https://jira.example/browse/PROJ-1' });
    expect(fakeMcp.calls[0]).toEqual(['get_issue', { issue_key: 'PROJ-1' }]);
  });

  test('a label write adds through the update, never by replacing the set', async () => {
    const fakeMcp = session(() => ({}));
    await mapAdapter(parseMap(MAP), fakeMcp.open).addLabel('PROJ-1', 'state:planning');
    expect(fakeMcp.calls[0]).toEqual(['update_issue', { issue_key: 'PROJ-1', update: { labels: [{ add: 'state:planning' }] } }]);
  });

  test('where the label tool only replaces the list, {labels} is the list after the change, read first', async () => {
    const replacing = MAP.replace(/  label\.add: .*\n/, '  label.add: { tool: update_issue, args: { issue_key: "{key}", fields: "{\\"labels\\": {labels}}" } }\n').replace(
      /  label\.remove: .*\n/,
      '  label.remove: { tool: update_issue, args: { issue_key: "{key}", fields: "{\\"labels\\": {labels}}" } }\n'
    );
    const fakeMcp = session((tool: string) => (tool === 'get_issue' ? { fields: { summary: 'x', labels: ['ai-support', 'state:triaging'] } } : {}));
    const adapter = mapAdapter(parseMap(replacing), fakeMcp.open);
    await adapter.addLabel('PROJ-1', 'state:planning');
    await adapter.removeLabel('PROJ-1', 'state:triaging');
    const writes = fakeMcp.calls.filter(([tool]) => tool === 'update_issue');
    expect(writes[0]).toEqual(['update_issue', { issue_key: 'PROJ-1', fields: '{"labels": ["ai-support","state:triaging","state:planning"]}' }]);
    expect(writes[1]).toEqual(['update_issue', { issue_key: 'PROJ-1', fields: '{"labels": ["ai-support"]}' }]);
  });

  test('a tool error is a refusal when its text says so, an outage otherwise', async () => {
    let message = 'Field "Component" is required';
    const adapter = mapAdapter(parseMap(MAP), session(() => new Error(message)).open);
    await expect(adapter.addComment('PROJ-1', 'm', 'x')).rejects.toMatchObject({ kind: 'refused' });
    message = 'Could not connect to Jira';
    await expect(adapter.addComment('PROJ-1', 'm', 'x')).rejects.toMatchObject({ kind: 'outage' });
  });

  test('a server that cannot start is an outage', async () => {
    const adapter = mapAdapter(parseMap(MAP), async () => ({ ok: false, kind: 'transport', message: 'spawn fake-mcp ENOENT' }));
    await expect(adapter.view('PROJ-1')).rejects.toMatchObject({ kind: 'outage' });
  });

  test('the connector runs over a map the same way: once, read back', async () => {
    const comments: { id: string; body: string; author: { name: string } }[] = [];
    const fakeMcp = session((tool, args) => {
      if (tool === 'add_comment') {
        comments.push({ id: `${comments.length + 1}`, body: String(args.body), author: { name: 'bot' } });
        return { id: `${comments.length}` };
      }
      if (tool === 'get_comments') return { comments };
      return {};
    });
    const c = useTracker(mapAdapter(parseMap(MAP), fakeMcp.open))!;
    await c.comment('PROJ-1', 'ruling:1', 'text');
    await c.comment('PROJ-1', 'ruling:1', 'text');
    expect(comments.length).toBe(1);
    expect(readLedger('PROJ-1').writes['comment:ruling:1'].id).toBe('1');
  });
});

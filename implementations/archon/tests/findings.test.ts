/**
 * The findings buffer (decision 60): discoveries recorded in the engine's store once, within
 * the per-item and buffer bounds; an urgent one filed at once; the daily pass's grouping
 * checked, filed as one request per group and removed from the buffer only after the
 * request reads back; the poll's order with people's requests first.
 */
import { beforeEach, describe, expect, test } from 'bun:test';
import { fake } from './archon-script.stub.ts';
import { fakeTracker } from './fake-tracker.ts';
import { readLedger, useTracker } from '../.shared/connector.ts';
import {
  applyGrouping,
  buffered,
  checkGrouping,
  findingId,
  MAX_BUFFER,
  MAX_PER_ITEM,
  peopleFirst,
  readDiscovery,
  recordDiscoveries,
  type Role,
} from '../.shared/findings.ts';
import { MARKS } from '../.shared/states.ts';
import { readWork } from '../.shared/work.ts';

let t = fakeTracker();

beforeEach(() => {
  fake.reset();
  t = fakeTracker();
  useTracker(t.adapter);
});

const found = (role: Role, what: string, urgent: string | null = null) => ({ role, discovery: { where: `src/${what}.ts:3`, what, evidence: `bun test ${what} -> 1 fail`, urgent } });

describe('recording', () => {
  test('a discovery waits in the buffer with its item, role, where, what, evidence and time; the tracker is not touched', async () => {
    const out = await recordDiscoveries('#7', [found('implementer', 'parser crash')], '2026-11-25T10:00:00Z');
    expect(out).toEqual({ buffered: [findingId('#7', 'src/parser crash.ts:3', 'parser crash')], urgent: [], overItem: 0, overBuffer: 0 });
    expect(buffered()).toEqual([
      { id: out.buffered[0], item: '#7', role: 'implementer', where: 'src/parser crash.ts:3', what: 'parser crash', evidence: 'bun test parser crash -> 1 fail', at: '2026-11-25T10:00:00Z' },
    ]);
    expect(t.calls).toEqual([]);
    expect(readWork('#7').doc.discoveries).toBe(1);
  });

  test('a retried round or a later round reporting the same discovery records and counts nothing again', async () => {
    await recordDiscoveries('#7', [found('implementer', 'parser crash')]);
    await recordDiscoveries('#7', [found('reviewer', 'Parser   CRASH')]);
    expect(buffered()).toHaveLength(1);
    expect(readWork('#7').doc.discoveries).toBe(1);
  });

  test('a round that recorded but stopped before counting is counted once on its retry', async () => {
    const id = findingId('#7', 'src/parser crash.ts:3', 'parser crash');
    fake.docs.set(`findings/${id}`, { revision: 1, value: { id, item: '#7' } });
    const out = await recordDiscoveries('#7', [found('implementer', 'parser crash')]);
    expect(out.buffered).toEqual([id]);
    expect(readWork('#7').doc).toMatchObject({ discoveries: 1, findings: [id] });
  });

  test('a finding the daily pass handled is not brought back by the same item', async () => {
    const [id] = (await recordDiscoveries('#7', [found('implementer', 'parser crash')])).buffered;
    fake.docs.set(`findings/${id}`, { revision: 2, value: null });
    await recordDiscoveries('#7', [found('implementer', 'parser crash')]);
    expect(buffered()).toEqual([]);
  });

  test('at most MAX_PER_ITEM per item over its life; empty ones are passed over', async () => {
    const out = await recordDiscoveries('#7', [found('implementer', 'a'), { role: 'implementer', discovery: { what: '  ' } }, found('reviewer', 'b'), found('validator', 'c'), found('planner', 'd')]);
    expect(out.buffered).toHaveLength(MAX_PER_ITEM);
    expect(out.overItem).toBe(1);
    expect((await recordDiscoveries('#7', [found('implementer', 'e')])).overItem).toBe(1);
    expect(buffered().map(f => f.role).sort()).toEqual(['implementer', 'reviewer', 'validator']);
  });

  test('a full buffer records nothing more and says so', async () => {
    for (let i = 0; i < MAX_BUFFER; i++) fake.docs.set(`findings/f${i}`, { revision: 1, value: { id: `f${i}`, at: '2026-11-24T00:00:00Z' } });
    const out = await recordDiscoveries('#7', [found('implementer', 'parser crash')]);
    expect(out).toMatchObject({ buffered: [], overBuffer: 1 });
    expect(buffered()).toHaveLength(MAX_BUFFER);
    expect(readWork('#7').doc.discoveries).toBe(0);
  });

  test('texts are cut, so one finding stays small', () => {
    const d = readDiscovery({ where: 'w', what: 'x'.repeat(5000), evidence: 'y'.repeat(5000), urgent: '' });
    expect(d!.what.length).toBeLessThan(420);
    expect(d!.evidence.length).toBeLessThan(820);
    expect(d!.urgent).toBeNull();
    expect(readDiscovery('not an object')).toBeNull();
  });
});

describe('urgent', () => {
  test('an urgent discovery skips the buffer: one tracker item at once, labelled, the agent text marked as data; a retry makes no second one', async () => {
    t.item('#7');
    const urgent = found('reviewer', 'SQL injection in search', 'vulnerability: user input reaches the query unescaped');
    const out = await recordDiscoveries('#7', [urgent]);
    expect(out.urgent).toHaveLength(1);
    expect(buffered()).toEqual([]);
    const made = t.items.get(out.urgent[0])!;
    expect(made.labels).toEqual([MARKS.urgentFinding]);
    expect(made.body).toContain('<untrusted source="agent discovery">');
    expect(made.body).toContain('Urgent because: vulnerability');
    // The round's node retried after the create, before the count: the ledger finds the item again.
    fake.docs.set('work/7', { revision: 9, value: { discoveries: 0, findings: [] } });
    expect((await recordDiscoveries('#7', [urgent])).urgent).toEqual(out.urgent);
    expect([...t.items.keys()].filter(k => k !== '#7')).toHaveLength(1);
  });
});

describe('the daily pass', () => {
  async function three(): Promise<string[]> {
    await recordDiscoveries('#7', [found('implementer', 'parser crash')], '2026-11-25T09:00:00Z');
    await recordDiscoveries('#9', [found('validator', 'parser crash on empty file')], '2026-11-25T10:00:00Z');
    await recordDiscoveries('#9', [found('reviewer', 'date format')], '2026-11-25T11:00:00Z');
    return buffered().map(f => f.id);
  }

  test('every finding in exactly one group or dropped with a reason and an item', () => {
    const ids = ['a', 'b', 'c'];
    expect(checkGrouping(ids, { groups: [{ title: 'x', cause: 'y', findings: ['a', 'b'] }], dropped: [{ findings: ['c'], reason: 'in-work', item: '#12', why: '' }] })).toEqual([]);
    expect(
      checkGrouping(ids, {
        groups: [
          { title: '', cause: 'y', findings: ['a', 'z'] },
          { title: 't', cause: 'y', findings: ['a'] },
        ],
        dropped: [{ findings: [], reason: 'later', item: 'nobody', why: '' }],
      })
    ).toEqual([
      'group 1 has no title',
      'group 1 names z, which is not in the buffer',
      'drop 1 gives the reason "later", not one of in-work, rejected',
      'drop 1 names "nobody", not an item key',
      'drop 1 has no finding',
      'a is placed 2 times',
      'b is in no group and not dropped',
      'c is in no group and not dropped',
    ]);
  });

  test('one request per group with every case linked and its count; dropped and filed findings leave the buffer', async () => {
    const [crash, empty, date] = await three();
    t.item('#7');
    t.item('#9');
    t.item('#12');
    const out = await applyGrouping([crash, empty, date], {
      groups: [{ title: 'Import: an empty file crashes the parser', cause: 'parse() reads the first line without a length check', findings: [crash, empty] }],
      dropped: [{ findings: [date], reason: 'in-work', item: '#12', why: '#12 fixes the date format' }],
    });
    expect(out.ok).toBe(true);
    expect(out.filed).toHaveLength(1);
    const request = t.items.get(out.filed[0].key)!;
    expect(request.title).toBe('Import: an empty file crashes the parser (seen 2 times)');
    expect(request.labels).toEqual([MARKS.discovery]);
    expect(request.body).toContain('https://tracker.example/#7');
    expect(request.body).toContain('https://tracker.example/#9');
    expect(request.body).toContain('the validator');
    expect(request.body.match(/<untrusted source="agent discovery">/g)).toHaveLength(2);
    expect(out.dropped).toEqual([{ finding: date, reason: 'in-work', item: '#12' }]);
    expect(out.left).toBe(0);
    expect(buffered()).toEqual([]);
  });

  test('a refused grouping writes nothing and keeps the buffer', async () => {
    const ids = await three();
    t.item('#12');
    const out = await applyGrouping(ids, { groups: [{ title: 'x', cause: 'y', findings: [ids[0]] }], dropped: [] });
    expect(out.ok).toBe(false);
    expect(out.problems).toHaveLength(2);
    expect(t.calls.filter(c => c === 'create')).toEqual([]);
    expect(buffered()).toHaveLength(3);
  });

  test('a drop must name an item that covers it: open for in work, labelled for rejected', async () => {
    const ids = await three();
    t.item('#12');
    t.items.get('#12')!.open = false;
    t.item('#13');
    const out = await applyGrouping(ids, {
      groups: [],
      dropped: [
        { findings: [ids[0], ids[1]], reason: 'in-work', item: '#12', why: '' },
        { findings: [ids[2]], reason: 'rejected', item: '#13', why: '' },
      ],
    });
    expect(out.problems).toEqual(['drop 1: #12 is closed, so it is not in work', `drop 2: #13 is not in the register of rejected requests (no ${MARKS.rejected})`]);
    expect(buffered()).toHaveLength(3);
    t.items.get('#13')!.labels.push(MARKS.rejected);
    const again = await applyGrouping([ids[2]], { groups: [], dropped: [{ findings: [ids[2]], reason: 'rejected', item: '#13', why: '' }] });
    expect(again.ok).toBe(true);
    expect(buffered()).toHaveLength(2);
  });

  test('findings stay in the buffer when the request cannot be made; a retry files the same request once', async () => {
    const [crash, empty, date] = await three();
    t.item('#12');
    const grouping = { groups: [{ title: 'Parser crash', cause: 'c', findings: [crash, empty] }], dropped: [{ findings: [date], reason: 'in-work', item: '#12', why: '' }] };
    t.down = true;
    await expect(applyGrouping([crash, empty, date], grouping)).rejects.toThrow();
    t.down = false;
    expect(buffered()).toHaveLength(3);
    t.loseAnswer.add('create');
    await expect(applyGrouping([crash, empty, date], grouping)).rejects.toThrow();
    expect(buffered()).toHaveLength(3);
    const out = await applyGrouping([crash, empty, date], grouping);
    expect(out.ok).toBe(true);
    expect([...t.items.values()].filter(i => i.labels.includes(MARKS.discovery))).toHaveLength(1);
    expect(Object.keys(readLedger('project').writes)).toHaveLength(1);
    expect(buffered()).toEqual([]);
  });
});

describe('the poll', () => {
  test("people's requests and urgent findings first, oldest first; requests from the buffer after them", () => {
    const listed = [
      { key: '#1', labels: [MARKS.discovery] },
      { key: '#2', labels: [] },
      { key: '#3', labels: [MARKS.urgentFinding] },
      { key: '#4', labels: [MARKS.discovery] },
      { key: '#5', labels: ['bug'] },
    ];
    expect(peopleFirst(listed).map(i => i.key)).toEqual(['#2', '#3', '#5', '#1', '#4']);
  });
});

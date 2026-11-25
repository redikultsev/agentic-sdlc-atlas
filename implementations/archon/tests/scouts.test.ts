/**
 * Scouts (decision 55): the settings in project.yaml and the cost cap each budget maps to;
 * which scout a run takes (due, under its limit, one per run, by name, a retried run);
 * its findings kept in the buffer with the scout as source, within the limit of 2 waiting,
 * an urgent one filed at once; its memory, bounded, and the daily pass's outcome in it.
 */
import { beforeEach, describe, expect, test } from 'bun:test';
import { fake } from './archon-script.stub.ts';
import { fakeTracker } from './fake-tracker.ts';
import { readLedger, useTracker } from '../.shared/connector.ts';
import { applyGrouping, buffered, findingId, MAX_BUFFER, recordScoutFindings, requestBody } from '../.shared/findings.ts';
import { begin, choose, isDue, lookContext, MAX_LOOKS, MAX_PROPOSED, type Memory, noteOutcomes, parseScouts, readMemory, remember, type Scout } from '../.shared/scouts.ts';
import { MARKS } from '../.shared/states.ts';

let t = fakeTracker();

beforeEach(() => {
  fake.reset();
  t = fakeTracker();
  useTracker(t.adapter);
});

const scout = (name: string, extra: Record<string, unknown> = {}) => ({ name, every: 'daily', budget: 2, paths: ['src/**'], brief: 'Dead code.', ...extra });
const parsed = (...list: Record<string, unknown>[]) => parseScouts({ scouts: list });
const finding = (what: string, urgent: string | null = null) => ({ where: `src/${what}.ts:1`, what, evidence: `lines 1-3 of src/${what}.ts`, urgent });
const DAY = 86_400_000;

describe('settings', () => {
  test('no scouts key: none; a declared scout with its schedule, budget, cap, paths, brief and measure', () => {
    expect(parseScouts(null)).toEqual([]);
    expect(parseScouts({ environments: [] })).toEqual([]);
    expect(parsed({ name: 'deps', budget: 3, paths: ['package.json'], brief: 'Old dependencies.', measure: ['npm outdated --json'] })).toEqual([
      { name: 'deps', every: 'weekly', budget: 3, tier: 'medium', cap: 2, paths: ['package.json'], brief: 'Old dependencies.', measure: ['npm outdated --json'] },
    ]);
  });

  test('a look runs under the largest cap not above the budget, so it never spends more than declared', () => {
    expect(parsed(scout('a', { budget: 1 }))[0]).toMatchObject({ tier: 'small', cap: 1 });
    expect(parsed(scout('a', { budget: 4.5 }))[0]).toMatchObject({ tier: 'medium', cap: 2 });
    expect(parsed(scout('a', { budget: 50 }))[0]).toMatchObject({ tier: 'large', cap: 5 });
    expect(() => parsed(scout('a', { budget: 0.5 }))).toThrow('below the smallest cap');
    expect(() => parsed(scout('a', { budget: undefined }))).toThrow('declares no budget');
  });

  test('what the engine or the pipeline could not use is refused when the settings are read', () => {
    expect(() => parsed(scout('Deps'))).toThrow("scout name 'Deps' must be lower case");
    expect(() => parsed(scout('a/b'))).toThrow('must be lower case');
    expect(() => parsed(scout('a'), scout('a'))).toThrow('two scouts share a name');
    expect(() => parsed(scout('a', { every: 'hourly' }))).toThrow("every 'hourly'");
    expect(() => parsed(scout('a', { paths: [] }))).toThrow('names no paths');
    expect(() => parsed(scout('a', { brief: ' ' }))).toThrow('has no brief');
    expect(() => parsed(scout('a', { measure: ['a', 'b', 'c', 'd'] }))).toThrow('at most 3');
    expect(() => parseScouts({ scouts: { deps: {} } })).toThrow('must be a list');
  });
});

describe('which scout looks', () => {
  const [a, b, c] = parsed(scout('a'), scout('b'), scout('c', { every: 'weekly' }));
  const now = Date.parse('2026-11-25T12:00:00Z');
  const looked = (at: number): Memory => ({ last: { run: 'old', at: new Date(at).toISOString() }, looks: [], proposed: [] });

  test('the due scout that waited longest, never looked first; one per run; a scout with 2 waiting is passed over', () => {
    const memories = new Map([
      ['a', looked(now - 2 * DAY)],
      ['b', looked(now - 3 * DAY)],
      ['c', looked(now - 2 * DAY)],
    ]);
    const pick = choose([a, b, c], memories, new Map(), now, '', 'run-1');
    expect(pick.scout?.name).toBe('b');
    expect(pick.passed).toEqual([
      { name: 'c', why: `not due: looked ${new Date(now - 2 * DAY).toISOString()}, every weekly` },
      { name: 'a', why: 'due, waits for the next tick: one scout per run' },
    ]);
    expect(choose([a, b], memories, new Map([['b', 2]]), now, '', 'run-1').scout?.name).toBe('a');
    expect(choose([a, b], new Map([['b', looked(now)]]), new Map(), now, '', 'run-1').scout?.name).toBe('a');
    expect(choose([], new Map(), new Map(), now, '', 'run-1')).toMatchObject({ scout: null, reason: 'the project declares no scouts' });
  });

  test('a tick up to half an hour early still finds a daily scout due', () => {
    expect(isDue(a, looked(now - DAY + 20 * 60_000), now)).toBe(true);
    expect(isDue(a, looked(now - DAY + 40 * 60_000), now)).toBe(false);
  });

  test('by name: its schedule is ignored, its limit is not; an unknown name is refused', () => {
    const memories = new Map([['c', looked(now - 60_000)]]);
    expect(choose([a, c], memories, new Map(), now, 'c', 'run-1').scout?.name).toBe('c');
    expect(choose([a, c], memories, new Map([['c', 2]]), now, 'c', 'run-1')).toMatchObject({ scout: null, reason: 'the c scout is at its limit: 2 findings wait for the daily pass' });
    expect(() => choose([a, c], memories, new Map(), now, 'z', 'run-1')).toThrow("no scout named 'z'");
  });

  test('the look is marked begun before the agent runs; a retried pick of the same run takes the same scout', () => {
    begin('b', 'run-1', '2026-11-25T12:00:00Z');
    expect(readMemory('b').last).toEqual({ run: 'run-1', at: '2026-11-25T12:00:00Z' });
    const memories = new Map([['a', readMemory('a')], ['b', readMemory('b')]]);
    expect(choose([a, b], memories, new Map(), now, '', 'run-1').scout?.name).toBe('b');
    begin('b', 'run-1', '2026-11-25T12:05:00Z');
    expect(readMemory('b').last?.at).toBe('2026-11-25T12:00:00Z');
    expect(choose([a, b], memories, new Map(), now, '', 'run-2').scout?.name).toBe('a');
  });
});

describe('recording', () => {
  test('a finding waits in the buffer with the role scout, its name and no item; the tracker is not touched', async () => {
    const out = await recordScoutFindings('deps', [finding('unused export')], new Set(), '2026-11-25T10:00:00Z');
    const id = findingId('scout:deps', 'src/unused export.ts:1', 'unused export');
    expect(out).toEqual({ kept: [{ id, where: 'src/unused export.ts:1', what: 'unused export', key: null }], repeated: 0, overLimit: 0, overBuffer: 0 });
    expect(buffered()).toEqual([{ id, item: null, role: 'scout', scout: 'deps', where: 'src/unused export.ts:1', what: 'unused export', evidence: 'lines 1-3 of src/unused export.ts', at: '2026-11-25T10:00:00Z' }]);
    expect(t.calls).toEqual([]);
  });

  test('the limit of 2 is counted in the buffer: a scout with 2 waiting keeps nothing new; other sources do not count', async () => {
    await recordScoutFindings('other', [finding('x'), finding('y')], new Set());
    const first = await recordScoutFindings('deps', [finding('a'), finding('b'), finding('c')], new Set());
    expect(first.kept).toHaveLength(2);
    expect(first.overLimit).toBe(1);
    const next = await recordScoutFindings('deps', [finding('d')], new Set());
    expect(next).toMatchObject({ kept: [], overLimit: 1 });
    expect(buffered().filter(f => f.scout === 'deps')).toHaveLength(2);
  });

  test('a retry of the same answer keeps the same findings without taking room twice', async () => {
    const answer = [finding('a'), finding('b')];
    const first = await recordScoutFindings('deps', answer, new Set());
    const again = await recordScoutFindings('deps', answer, new Set());
    expect(again.kept.map(k => k.id)).toEqual(first.kept.map(k => k.id));
    expect(again.overLimit).toBe(0);
    expect(buffered()).toHaveLength(2);
  });

  test('what the memory holds is passed over; a finding the daily pass handled does not come back', async () => {
    const [kept] = (await recordScoutFindings('deps', [finding('a')], new Set())).kept;
    expect((await recordScoutFindings('deps', [finding('a')], new Set([kept.id]))).repeated).toBe(1);
    fake.docs.set(`findings/${kept.id}`, { revision: 2, value: null });
    const out = await recordScoutFindings('deps', [finding('a')], new Set());
    expect(out).toMatchObject({ kept: [], repeated: 1 });
    expect(buffered()).toEqual([]);
  });

  test('a full buffer keeps nothing more and says so', async () => {
    for (let i = 0; i < MAX_BUFFER; i++) fake.docs.set(`findings/f${i}`, { revision: 1, value: { id: `f${i}`, at: '2026-11-24T00:00:00Z' } });
    expect(await recordScoutFindings('deps', [finding('a')], new Set())).toMatchObject({ kept: [], overBuffer: 1 });
  });

  test('an urgent finding is a tracker item at once, labelled and marked as data, within the room; a retry makes no second one', async () => {
    const answer = [finding('token compared with ==', 'a timing attack on session tokens'), finding('b'), finding('c')];
    const out = await recordScoutFindings('auth', answer, new Set());
    expect(out.kept.map(k => k.key === null)).toEqual([false, true]);
    expect(out.overLimit).toBe(1);
    const made = t.items.get(out.kept[0].key!)!;
    expect(made.labels).toEqual([MARKS.urgentFinding]);
    expect(made.title).toStartWith('Urgent finding from the auth scout');
    expect(made.body).toContain('<untrusted source="scout finding">');
    expect(Object.keys(readLedger('project').writes)).toEqual([`create:pipeline-scout:auth:${out.kept[0].id}`]);
    await recordScoutFindings('auth', [answer[0]], new Set());
    expect([...t.items.values()].filter(i => i.labels.includes(MARKS.urgentFinding))).toHaveLength(1);
  });
});

describe('memory', () => {
  test('a look and what it kept; a retry of the same run adds nothing; bounded', () => {
    const kept = [{ id: 'f1', where: 'src/a.ts:1', what: 'x'.repeat(500), key: null }];
    remember('deps', 'run-1', '2026-11-25T10:00:00Z', '  package.json\n and the lock file ', kept, 1);
    remember('deps', 'run-1', '2026-11-25T10:01:00Z', 'package.json and the lock file', kept, 1);
    const m = readMemory('deps');
    expect(m.looks).toEqual([{ run: 'run-1', at: '2026-11-25T10:01:00Z', looked: 'package.json and the lock file', kept: 1, passed: 1 }]);
    expect(m.proposed).toHaveLength(1);
    expect(m.proposed[0]).toMatchObject({ id: 'f1', outcome: 'waiting', key: null });
    expect(m.proposed[0].what.length).toBeLessThan(220);
    for (let i = 0; i < 40; i++) remember('deps', `run-${i + 2}`, '2026-11-26T00:00:00Z', 'more', [{ id: `g${i}`, where: 'w', what: 'w', key: i === 39 ? '#50' : null }], 0);
    const bounded = readMemory('deps');
    expect(bounded.looks).toHaveLength(MAX_LOOKS);
    expect(bounded.proposed).toHaveLength(MAX_PROPOSED);
    expect(bounded.proposed.at(-1)).toMatchObject({ id: 'g39', outcome: 'urgent', key: '#50' });
  });

  test("the daily pass's outcome lands in the scout's memory: filed with the request, dropped with the covering item", async () => {
    const out = await recordScoutFindings('deps', [finding('a'), finding('b')], new Set(), '2026-11-25T10:00:00Z');
    remember('deps', 'run-1', '2026-11-25T10:00:00Z', 'src', out.kept, 0);
    const [a, b] = out.kept.map(k => k.id);
    t.item('#12');
    const before = buffered();
    const applied = await applyGrouping([a, b], {
      groups: [{ title: 'Unused export', cause: 'c', findings: [a] }],
      dropped: [{ findings: [b], reason: 'in-work', item: '#12', why: '' }],
    });
    noteOutcomes(before, applied);
    const m = readMemory('deps');
    expect(m.proposed.map(p => [p.outcome, p.key, p.reason])).toEqual([
      ['filed', applied.filed[0].key, null],
      ['dropped', '#12', 'in-work'],
    ]);
    const request = t.items.get(applied.filed[0].key)!;
    expect(request.body).toContain('as the deps scout (decision 55)');
    expect(request.body).toContain('1. the deps scout, 2026-11-25T10:00:00Z');
  });

  test("the agent's context: the area in the project's words, its room, measurements and memory as data, a handled finding shown so", () => {
    const [s] = parsed(scout('deps', { brief: 'Old dependencies.' })) as Scout[];
    const memory: Memory = {
      last: null,
      looks: [{ run: 'r', at: '2026-11-18T09:00:00Z', looked: 'package.json', kept: 1, passed: 0 }],
      proposed: [{ id: 'gone', at: '2026-11-18T09:00:00Z', where: 'package.json:3', what: 'left-pad is old', outcome: 'waiting', key: null, reason: null }],
    };
    const text = lookContext(s, memory, [], [{ command: 'npm outdated', exit: 1, output: 'left-pad 1.0.0 -> 1.3.0' }]);
    expect(text).toContain('Old dependencies.');
    expect(text).toContain('Room for at most 2 new finding(s)');
    expect(text).toContain('<untrusted source="measure output">');
    expect(text).toContain('<untrusted source="scout memory">');
    expect(text).toContain('[handled by the daily pass (outcome not recorded)] package.json:3: left-pad is old');
  });

  test('a scout memory name is one the engine store accepts', () => {
    expect(() => begin('deps.v2_x-1', 'run-1', '2026-11-25T10:00:00Z')).not.toThrow();
  });
});

describe('the daily pass with scouts', () => {
  test('a request mixing a discovery and a scout finding names both sources', () => {
    const body = requestBody(
      'one cause',
      [
        { id: 'a', item: '#7', role: 'implementer', where: 'w', what: 'x', evidence: 'e', at: '2026-11-25T09:00:00Z' },
        { id: 'b', item: null, role: 'scout', scout: 'deps', where: 'w', what: 'x', evidence: 'e', at: '2026-11-25T10:00:00Z' },
      ],
      k => `https://tracker.example/${k}`
    );
    expect(body).toContain('Agents noticed this 2 times, outside their own tasks, while working on #7; and looking for work nobody asked for, as the deps scout (decision 55).');
    expect(body).toContain('1. #7 (https://tracker.example/#7), the implementer');
    expect(body).toContain('2. the deps scout, 2026-11-25T10:00:00Z');
  });
});

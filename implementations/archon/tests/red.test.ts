/**
 * Red before green (decision 58): the Implementer's red records as kept per item, the PR
 * section that lists them, and the one rule code enforces for a bug fix.
 */
import { beforeEach, describe, expect, test } from 'bun:test';
import { fake } from './archon-script.stub.ts';
import { missingRed, NO_REASON, readTests, redSection, sliceKey, trimRed, withSlice, type SliceRecord } from '../.shared/red.ts';
import { readWork, updateWork } from '../.shared/work.ts';

beforeEach(() => fake.reset());

const red = (name: string, output: string | null, why: string | null = null) => ({ name, file: `test/${name}.test.ts`, command: `bun test -t ${name}`, red: output, why_no_red: why });
const entry = (key: string, tests: ReturnType<typeof red>[], skipped: string[] = []): SliceRecord => ({ key, slice: key.startsWith('fix:') ? 'fix' : key, at: '2026-11-25T10:00:00Z', tests: readTests(tests), skipped });

describe('reading the Implementer\'s answer', () => {
  test('a red output is kept and its reason dropped; a test without one keeps its reason or says it gave none', () => {
    const tests = readTests([
      red('parses', '1 fail: expected 3, got undefined', 'ignored'),
      red('keeps-old', null, 'guards behaviour that already worked'),
      red('silent', '   ', ''),
      { name: '', file: '' },
      'not a test',
    ]);
    expect(tests).toEqual([
      { name: 'parses', file: 'test/parses.test.ts', command: 'bun test -t parses', red: '1 fail: expected 3, got undefined', why_no_red: null },
      { name: 'keeps-old', file: 'test/keeps-old.test.ts', command: 'bun test -t keeps-old', red: null, why_no_red: 'guards behaviour that already worked' },
      { name: 'silent', file: 'test/silent.test.ts', command: 'bun test -t silent', red: null, why_no_red: NO_REASON },
    ]);
    expect(readTests(null)).toEqual([]);
  });

  test('a long output is cut to 40 lines', () => {
    const output = Array.from({ length: 60 }, (_, i) => `line ${i}`).join('\n');
    const cut = trimRed(output);
    expect(cut.split('\n')).toHaveLength(41);
    expect(cut).toContain('20 more lines cut');
    expect(trimRed('x'.repeat(3000)).length).toBeLessThan(1100);
  });
});

describe('records per item', () => {
  test('a re-run of a slice replaces its records; a fix round keeps its own beside earlier ones', () => {
    let records: SliceRecord[] = [];
    records = withSlice(records, entry(sliceKey('a', false, 'run-1'), [red('one', 'fail')]));
    records = withSlice(records, entry(sliceKey('fix', true, 'run-2'), [red('two', null, 'refactor only')]));
    records = withSlice(records, entry(sliceKey('a', false, 'run-3'), [red('one-again', 'fail again')]));
    records = withSlice(records, entry(sliceKey('fix', true, 'run-4'), [red('three', 'fail')]));
    expect(records.map(r => r.key)).toEqual(['fix:run-2', 'a', 'fix:run-4']);
    expect(records.find(r => r.key === 'a')?.tests.map(t => t.name)).toEqual(['one-again']);
  });

  test('past 40 tests the oldest records go first', () => {
    let records: SliceRecord[] = [];
    for (let i = 0; i < 5; i++) records = withSlice(records, entry(`s${i}`, Array.from({ length: 10 }, (_, j) => red(`t${i}-${j}`, 'fail'))));
    expect(records.map(r => r.key)).toEqual(['s1', 's2', 's3', 's4']);
  });

  test('the records live in work/<key> beside the state', () => {
    updateWork('#7', doc => {
      doc.kind = 'bug';
      doc.redRecords = withSlice(doc.redRecords, entry('item', [red('repro', 'fail')], ['e2e: no browser']));
    });
    const { doc } = readWork('#7');
    expect(doc.kind).toBe('bug');
    expect(doc.redRecords[0].skipped).toEqual(['e2e: no browser']);
    expect(readWork('#8').doc).toMatchObject({ kind: null, redRecords: [] });
  });
});

describe('the bug rule', () => {
  test('a bug fix needs one new test with a red record; other kinds do not', () => {
    const noRed = [entry('item', [red('keeps', null, 'guards old behaviour')])];
    const withRed = [entry('item', [red('repro', 'expected 0, got -1')])];
    expect(missingRed('feature', [])).toBeNull();
    expect(missingRed(null, noRed)).toBeNull();
    expect(missingRed('bug', [])).toContain('no new test was recorded');
    expect(missingRed('bug', noRed)).toContain('none of the new tests has a red record');
    expect(missingRed('bug', withRed)).toBeNull();
    // A red record from an earlier round still counts.
    expect(missingRed('bug', [...withRed, entry('fix:run-2', [red('more', null, 'refactor')])])).toBeNull();
  });
});

describe('the PR section', () => {
  test('tests with a red record in a collapsed block, the others apart with their reason; same records, same text', () => {
    const records = [entry('item', [red('repro', 'expected 0, got -1'), red('keeps', null, 'guards old behaviour')])];
    const text = redSection(records).join('\n');
    expect(text).toContain('<details><summary>repro (test/repro.test.ts): red before the code</summary>');
    expect(text).toContain('`bun test -t repro`');
    expect(text).toContain('expected 0, got -1');
    expect(text).toContain('Without a red record:\n- keeps (test/keeps.test.ts): guards old behaviour');
    expect(redSection(records).join('\n')).toBe(text);
    expect(redSection([])).toEqual([]);
  });

  test('output with backticks cannot close its block', () => {
    const text = redSection([entry('item', [red('ticks', 'got ```weird``` output')])]).join('\n');
    expect(text).toContain('````\ngot ```weird``` output\n````');
  });
});

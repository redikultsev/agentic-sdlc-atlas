/**
 * The provenance record (decision 59): read from the item's runs and their fan-out children
 * through the host seam, the checks from `work/<key>`, stored only when it changed, and
 * the one line for the Merge gate and the PR.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { fake } from './archon-script.stub.ts';
import { engine, provenanceLine, readProvenance, refreshProvenance, withProvenance, type Provenance } from '../.shared/provenance.ts';
import { readTests } from '../.shared/red.ts';
import { readWork, updateWork, type WorkDoc } from '../.shared/work.ts';

const original = { ...engine };
const DIGEST_A = 'sha256:aaaa1111bbbb2222cccc';
const DIGEST_B = 'sha256:dddd3333eeee4444ffff';

function agent(nodeId: string, model: { source: 'provider'; value: string } | { source: 'unavailable'; reason: string }, cost: { source: 'provider'; value: number } | { source: 'unavailable'; reason: string }, durationMs = 60_000) {
  return {
    nodeId,
    state: 'completed',
    durationMs,
    execution: {
      node: { kind: 'agent', id: nodeId },
      binding: { provider: 'p', model: { requested: `@${nodeId}`, resolved: model } },
      timing: { startedAt: '2026-11-25T10:00:00Z', durationMs },
      spend: { costUsd: cost },
    },
  };
}

const RUNS: Record<string, Record<string, unknown>> = {
  triage: { id: 'triage', started_at: '2026-11-25T09:00:00Z', metadata: { workflow_source: { digest: DIGEST_A } }, nodes: [agent('triage', { source: 'provider', value: 'model-t-1' }, { source: 'provider', value: 0.5 })] },
  round: {
    id: 'round',
    started_at: '2026-11-25T10:00:00Z',
    metadata: { workflow_source: { digest: DIGEST_A } },
    nodes: [
      { nodeId: 'join', state: 'completed', execution: { node: { kind: 'exec' }, binding: {}, timing: {}, spend: { costUsd: { source: 'unavailable', reason: 'not_applicable' } } } },
      { nodeId: 'slices', state: 'completed', fanOutOutcome: { slots: [{ index: 0, outcome: 'completed', child_run_id: 'slice-1' }, { index: 1, outcome: 'not_started' }] } },
      agent('review', { source: 'unavailable', reason: 'not_reported' }, { source: 'unavailable', reason: 'not_reported' }),
    ],
  },
  'slice-1': { id: 'slice-1', started_at: '2026-11-25T10:05:00Z', metadata: { workflow_source: { digest: DIGEST_A } }, nodes: [agent('implement', { source: 'provider', value: 'model-i-2' }, { source: 'provider', value: 2.25 }, 300_000)] },
  merge: { id: 'merge', started_at: '2026-11-25T11:00:00Z', metadata: { workflow_source: { digest: DIGEST_B } }, nodes: [] },
};

let reads: string[] = [];

beforeEach(() => {
  fake.reset();
  reads = [];
  engine.runs = () => [{ id: 'merge', startedAt: '2026-11-25T11:00:00Z' }, { id: 'triage', startedAt: '2026-11-25T09:00:00Z' }, { id: 'round', startedAt: '2026-11-25T10:00:00Z' }];
  engine.run = (id: string) => {
    reads.push(id);
    const run = RUNS[id];
    if (run === undefined) throw new Error('not_found');
    return run;
  };
  engine.blob = (commit: string, path: string) => (path.endsWith('tracker.yaml') ? 'none' : `blob-of-project-at-${commit}`);
});

afterEach(() => Object.assign(engine, original));

function item(change: (doc: WorkDoc) => void = () => {}): WorkDoc {
  return updateWork('#7', doc => {
    doc.base = { commit: 'base0123456789', failing: [] };
    doc.flags = [];
    doc.verdicts = [
      { kind: 'ci', verdict: 'green', fingerprint: 'fp1', head: 'h1', at: '' },
      { kind: 'review', verdict: 'pass', fingerprint: 'fp1', head: 'h1', at: '' },
    ];
    doc.redRecords = [{ key: 'item', slice: 'item', at: '2026-11-25T10:06:00Z', tests: readTests([{ name: 'repro', file: 't.ts', command: 'bun test t.ts', red: 'fail' }, { name: 'keeps', file: 't.ts', command: 'bun test t.ts', red: null, why_no_red: 'guards old behaviour' }]), skipped: [] }];
    doc.rounds = 1;
    change(doc);
  });
}

const AT = { head: 'h1', fingerprint: 'fp1', base: 'origin/main' };

describe('building the record', () => {
  test('every run of the item and the children of its fan-out, with the model the provider ran', () => {
    const record = refreshProvenance('#7', item(), AT);
    expect(reads).toEqual(['triage', 'round', 'merge', 'slice-1']);
    expect(record.pack).toEqual([DIGEST_A, DIGEST_B]);
    expect(record.roles).toEqual({
      triage: { models: ['model-t-1'], sessions: 1, seconds: 60, usd: 0.5, costNotReported: 0 },
      reviewer: { models: ['not reported'], sessions: 1, seconds: 60, usd: 0, costNotReported: 1 },
      implementer: { models: ['model-i-2'], sessions: 1, seconds: 300, usd: 2.25, costNotReported: 0 },
    });
    expect(record.settings).toEqual({ tracker: 'none', project: 'blob-of-project-at-base0123456789' });
    expect(record.rounds).toEqual({ fix: 1, changes: 0 });
    expect(record.runs).toEqual({ read: 4, unread: [] });
  });

  test('checks passed, skipped with the reason, or flagged, at the diff the gate shows', () => {
    const record = refreshProvenance('#7', item(doc => {
      doc.flags = ['guard:deleted-test:t.ts'];
      doc.base = { commit: 'base0123456789', failing: ['flaky-1'] };
      doc.redRecords = [{ ...doc.redRecords[0], skipped: ['e2e: no browser'] }];
    }), AT);
    const by = (check: string) => record.checks.filter(c => c.check === check).map(c => `${c.result}: ${c.why}`);
    expect(by('base check')).toEqual(['passed: ran at base01234567']);
    expect(by('checks red at the base')).toEqual(['skipped: 1 not counted: flaky-1']);
    expect(by('ci')).toEqual(['passed: green at this diff']);
    expect(by('guard')).toEqual(['flagged: guard:deleted-test:t.ts']);
    expect(by('review')).toEqual(['passed: pass at this diff']);
    expect(by('validator')).toEqual(['skipped: no acceptance criteria']);
    expect(by('Implementer step')).toEqual(['skipped: item (2026-11-25): e2e: no browser']);
    expect(by('red record')).toEqual(['skipped: keeps: guards old behaviour']);
  });

  test('a run the host cannot read is listed, never silently left out', () => {
    engine.runs = () => [{ id: 'round', startedAt: '1' }, { id: 'gone', startedAt: '2' }];
    const record = refreshProvenance('#7', item(), AT);
    expect(record.runs.unread).toEqual(['gone: not_found']);
    expect(provenanceLine('#7', record)).toContain('1 run(s) not read');
  });
});

describe('storing it', () => {
  test('written once; the same facts later write nothing; a change rewrites it', () => {
    const first = refreshProvenance('#7', item(), AT);
    expect(fake.docs.get('provenance/7')?.revision).toBe(1);
    refreshProvenance('#7', readWork('#7').doc, AT);
    expect(fake.docs.get('provenance/7')?.revision).toBe(1);
    expect(readProvenance('#7')?.at).toBe(first.at);
    updateWork('#7', doc => {
      doc.changes = 1;
    });
    refreshProvenance('#7', readWork('#7').doc, AT);
    expect(fake.docs.get('provenance/7')?.revision).toBe(2);
    expect(readProvenance('#7')?.rounds).toEqual({ fix: 1, changes: 1 });
  });
});

describe('the one line', () => {
  test('pack version, the model of each role, checks passed and skipped, and the pointer; not what the request already shows', () => {
    const record: Provenance = refreshProvenance('#7', item(), AT);
    const line = provenanceLine('#7', record);
    expect(line).toBe(
      'Provenance: pack aaaa1111bbbb→dddd3333eeee · triage model-t-1, reviewer not reported, implementer model-i-2 · passed base check, ci, guard, review · skipped validator (no acceptance criteria), red record (keeps: guards old behaviour) · the rest: `archon state get provenance/7`'
    );
    expect(line).not.toContain('h1');
    expect(line).not.toContain('fp1');
  });

  test('the PR section is replaced in place, so a rerun leaves the body as it is', () => {
    const body = '<!-- pipeline-pr:7 -->\nPart of #7\n\n## What changed\n- x';
    const once = withProvenance(body, 'Provenance: pack a');
    expect(once).toBe(`${body}\n\n<!-- pipeline-provenance -->\n## Provenance\n\nProvenance: pack a\n<!-- /pipeline-provenance -->`);
    expect(withProvenance(once, 'Provenance: pack a')).toBe(once);
    expect(withProvenance(once, 'Provenance: pack b')).toContain('Provenance: pack b\n<!-- /pipeline-provenance -->');
    expect(withProvenance(once, 'Provenance: pack b')).not.toContain('pack a');
  });
});

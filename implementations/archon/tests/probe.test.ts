/** The probe of a project map on a test item (decision 46). */
import { beforeEach, describe, expect, test } from 'bun:test';
import { fake } from './archon-script.stub.ts';
import { fakeTracker } from './fake-tracker.ts';
import { useTracker } from '../.shared/connector.ts';
import { PROBE_LABEL, probeMap } from '../.shared/probe.ts';

let t = fakeTracker();
beforeEach(() => {
  fake.reset();
  t = fakeTracker();
});

describe('the probe', () => {
  test('a working tracker passes; what changes the project is not probed', async () => {
    t.item('PROJ-1', ['bug']);
    const report = await probeMap(useTracker(t.adapter)!, 'PROJ-1', 'r1');
    expect(report.ok).toBe(true);
    const by = Object.fromEntries(report.lines.map(l => [l.op, l.result]));
    expect(by).toMatchObject({ view: 'passed', comments: 'passed', 'label.add': 'passed', 'label.remove': 'passed', comment: 'passed', list: 'passed', create: 'not-probed', close: 'not-probed' });
    expect(t.labels('PROJ-1')).toEqual(['bug']);
    expect(t.items.get('PROJ-1')!.comments).toHaveLength(1);
  });

  test('a refused label write fails the probe with the tracker\'s words and skips the removal', async () => {
    t.item('PROJ-1');
    t.refuse.add(PROBE_LABEL);
    const report = await probeMap(useTracker(t.adapter)!, 'PROJ-1', 'r1');
    expect(report.ok).toBe(false);
    expect(report.lines.find(l => l.op === 'label.add')).toMatchObject({ result: 'failed' });
    expect(report.lines.find(l => l.op === 'label.add')!.detail).toContain('is required');
    expect(report.lines.find(l => l.op === 'label.remove')!.result).toBe('not-probed');
  });

  test('a tracker that is down: the comment is queued, which the probe counts as a failure', async () => {
    t.item('PROJ-1');
    t.down = true;
    const report = await probeMap(useTracker(t.adapter)!, 'PROJ-1', 'r1');
    expect(report.ok).toBe(false);
    expect(report.lines.find(l => l.op === 'comment')!.detail).toContain('queued');
  });

  test('a lacking operation is reported, not failed', async () => {
    t.item('PROJ-1');
    const adapter = { ...t.adapter, lacks: new Set(['list', 'label-set-by'] as const) };
    const report = await probeMap(useTracker(adapter)!, 'PROJ-1', 'r1');
    expect(report.ok).toBe(true);
    expect(report.lines.find(l => l.op === 'list')!.result).toBe('not-probed');
  });
});

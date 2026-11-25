/**
 * Merge the slice branches that pushed into the item branch `pipeline/<key>` (decision 16).
 * A failed slice is recorded and stays out (its dependents wait); passing branches are
 * kept and merged. A merge conflict aborts the merge and ends the round: `round` counts
 * it and the next round's fix slice resolves it.
 *
 * Each merged slice's new tests with their red records and its skipped steps go into
 * `work/<key>` (decision 58, `.shared/red.ts`): a planned slice by its id, so its re-run
 * replaces them; a fix slice by this run, so earlier rounds keep theirs. `tests` is the
 * item's whole list after this join, for the PR description and the reviewer.
 */

import { emit, input, runId } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { git, gitOrThrow } from '../../.shared/git.ts';
import { isObject } from '../../.shared/inputs.ts';
import { allTests, readTests, sliceKey, withSlice, type SliceRecord } from '../../.shared/red.ts';
import { bound, readItem, updateItem } from './lib/item.ts';
import { baseName, fetchBranch } from './lib/facts.ts';

interface Task { id: string; issue: number | null; branch: string; item_branch: string; base: string; fix: boolean }
interface SliceEnd { status: string; reason: string; branch: string; head: string | null; tests?: unknown; steps_skipped: string[]; discoveries: unknown[]; summary: string }

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const base = baseName(input('base'));
  const plan = bound<{ slices: Task[] }>(input('frontier'));
  const ends = bound<unknown[]>(input('slices')) ?? [];
  if (plan === null) throw new Error('frontier left no result');
  if (plan.slices.length === 0) {
    emit({ go: false, outcome: 'none', pushed: [], failed: [], steps_skipped: [], discoveries: [], summaries: [], head: null, tests: allTests(readItem(key).redRecords) });
    return;
  }
  const itemBranch = plan.slices[0].item_branch;
  const start = fetchBranch(itemBranch) ?? fetchBranch(base);
  if (start === null) throw new Error(`origin has neither ${itemBranch} nor ${base}`);
  gitOrThrow('checkout', '--quiet', '-B', itemBranch, start);

  const pushed: string[] = [];
  const failed: { id: string; reason: string }[] = [];
  const stepsSkipped: string[] = [];
  const discoveries: unknown[] = [];
  const summaries: string[] = [];
  const records: SliceRecord[] = [];
  const at = new Date().toISOString();
  let conflict: string | null = null;
  plan.slices.forEach((task, index) => {
    const end = ends[index];
    if (!isObject(end) || end.archon_failed === true) {
      failed.push({ id: task.id, reason: isObject(end) && typeof end.error === 'string' ? end.error : 'the slice run ended with no result' });
      return;
    }
    const slice = end as unknown as SliceEnd;
    stepsSkipped.push(...slice.steps_skipped.map(s => `${task.id}: ${s}`));
    discoveries.push(...slice.discoveries);
    if (slice.status !== 'pushed' || slice.head === null) {
      failed.push({ id: task.id, reason: slice.reason || 'failed' });
      return;
    }
    if (conflict !== null) return;
    const sha = fetchBranch(slice.branch);
    if (sha !== slice.head) {
      failed.push({ id: task.id, reason: `origin has ${sha ?? 'no'} ${slice.branch}, the slice reported ${slice.head}` });
      return;
    }
    const merged = git('merge', '--no-ff', '--no-edit', '-m', `Merge slice ${task.id} into ${itemBranch}`, sha);
    if (merged.code !== 0) {
      git('merge', '--abort');
      conflict = task.id;
      failed.push({ id: task.id, reason: `merge conflict with ${itemBranch}: ${merged.stdout.split('\n').filter(l => l.startsWith('CONFLICT')).join('; ')}` });
      return;
    }
    pushed.push(task.id);
    summaries.push(`${task.id}: ${slice.summary}`);
    records.push({ key: sliceKey(task.id, task.fix, runId()), slice: task.id, at, tests: readTests(slice.tests), skipped: slice.steps_skipped });
  });

  const doc = updateItem(key, doc => {
    doc.branch = itemBranch;
    for (const entry of records) doc.redRecords = withSlice(doc.redRecords, entry);
    for (const task of plan.slices) {
      if (task.fix) continue;
      const status = pushed.includes(task.id) ? 'merged' as const : 'failed' as const;
      const found = doc.slices.find(s => s.id === task.id);
      if (found) {
        found.status = status;
        found.branch = task.branch;
      } else {
        doc.slices.push({ id: task.id, issue: task.issue, status, branch: task.branch, blockedBy: [] });
      }
    }
  });
  const head = gitOrThrow('rev-parse', 'HEAD');
  const outcome = conflict !== null ? 'conflict' : pushed.length === 0 ? 'failed' : 'joined';
  emit({ go: outcome === 'joined', outcome, pushed, failed, steps_skipped: stepsSkipped, discoveries, summaries, head, tests: allTests(doc.redRecords) });
}

await script('unify-round join', main);

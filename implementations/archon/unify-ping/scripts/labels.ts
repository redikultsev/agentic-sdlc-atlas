/**
 * Ensure every label the pack moves or reads exists in the project's tracker: the state
 * labels and the pipeline marks from `.shared/states.ts`. Ensuring leaves an existing
 * label as the Operator configured it. A tracker that makes labels on first use (no
 * `label-ensure`) has nothing to make: every label is reported as left to the tracker. A
 * failed label is reported, not fatal: the report shows every check.
 *
 * Bound inputs: INPUTS_HOST and INPUTS_PATH from the repo node.
 * Also the install check of the tracker map (decision 46): a map without a required
 * operation fails when the connector opens; an optional one the tracker lacks is listed in
 * `lacks` and skipped by the pipeline.
 *
 * Emits `{ ok, total, tracker, lacks, ensured, existing, failed }`.
 */

import { emit, input } from 'archon:script';
import { type OptionalOp, script, type Tracker, tracker } from '../../.shared/connector.ts';
import { repoOf } from '../../.shared/repo.ts';
import { MARKS, STATES } from '../../.shared/states.ts';

const STATE_COLOR = '1d76db';
const OPERATOR_COLOR = 'd93f0b';
const MARK_COLOR = 'c5def5';

const OPTIONAL: readonly OptionalOp[] = ['create', 'close', 'list', 'slice', 'blocked-by', 'blockers', 'label-set-by', 'comment-edit'];

function lacking(t: Tracker): string[] {
  return OPTIONAL.filter(op => !t.has(op));
}

async function main(): Promise<void> {
  // The run's repo inputs may be empty here; the repo node resolved the repository.
  const t = tracker(repoOf(input('host'), input('path')));
  const wanted: { name: string; color: string; description: string }[] = [
    ...Object.entries(STATES).map(([state, def]) => ({
      name: def.label,
      color: def.operator ? OPERATOR_COLOR : STATE_COLOR,
      description: `Pipeline state ${state}${def.operator ? ' (waits for the Operator)' : ''}`,
    })),
    ...Object.values(MARKS).map(name => ({ name, color: MARK_COLOR, description: 'Pipeline mark' })),
  ];
  if (!t.has('label-ensure')) {
    emit({ ok: true, total: wanted.length, tracker: t.name, lacks: lacking(t), ensured: [], existing: wanted.map(l => l.name), failed: [] });
    return;
  }
  const ensured: string[] = [];
  const failed: { name: string; error: string }[] = [];
  for (const label of wanted) {
    try {
      await t.ensureLabel(label.name, label.color, label.description);
      ensured.push(label.name);
    } catch (error) {
      failed.push({ name: label.name, error: error instanceof Error ? error.message : String(error) });
    }
  }
  emit({ ok: failed.length === 0, total: wanted.length, tracker: t.name, lacks: lacking(t), ensured, existing: [], failed });
}

await script('unify-ping labels', main);

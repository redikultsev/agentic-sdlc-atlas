/**
 * Ensure every label the pack moves or reads exists on the repository: the 15 state
 * labels and the pipeline marks from `.shared/states.ts`, plus the marks this pack's
 * revisit pass sets that `.shared/states.ts` does not list yet. `repo.label.ensure` leaves
 * an existing label as the Operator configured it (`changed: false`). A failed label is
 * reported, not fatal: the report shows every check.
 *
 * Bound inputs: INPUTS_HOST and INPUTS_PATH from the repo node.
 */

import { emit, forge, input, refuse } from 'archon:script';
import { repoOf } from '../../.shared/repo.ts';
import { MARKS, STATES } from '../../.shared/states.ts';

/** Marks set by unify-revisit; not yet in `.shared/states.ts` MARKS (same names as unify-revisit/scripts/marks.ts). */
const REVISIT_MARKS = {
  needsAttention: 'pipeline:needs-attention',
  setAside: 'pipeline:set-aside',
} as const;

const STATE_COLOR = '1d76db';
const OPERATOR_COLOR = 'd93f0b';
const MARK_COLOR = 'c5def5';

function main(): void {
  const repo = repoOf(input('host'), input('path'));
  const wanted: { name: string; color: string; description: string }[] = [
    ...Object.entries(STATES).map(([state, def]) => ({
      name: def.label,
      color: def.operator ? OPERATOR_COLOR : STATE_COLOR,
      description: `Pipeline state ${state}${def.operator ? ' (waits for the Operator)' : ''}`,
    })),
    ...Object.values(MARKS).map(name => ({ name, color: MARK_COLOR, description: 'Pipeline mark' })),
    ...Object.values(REVISIT_MARKS).map(name => ({ name, color: MARK_COLOR, description: 'Pipeline mark set by the revisit pass' })),
  ];
  const created: string[] = [];
  const existing: string[] = [];
  const failed: { name: string; error: string }[] = [];
  for (const label of wanted) {
    try {
      const result = forge('repo.label.ensure', { repo, ...label });
      (result.changed ? created : existing).push(label.name);
    } catch (error) {
      failed.push({ name: label.name, error: error instanceof Error ? error.message : String(error) });
    }
  }
  emit({ ok: failed.length === 0, total: wanted.length, created, existing, failed });
}

try {
  main();
} catch (error) {
  refuse(`unify-ping labels: ${error instanceof Error ? error.message : String(error)}`);
}

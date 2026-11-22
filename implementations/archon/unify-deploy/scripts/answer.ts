/**
 * Apply the Operator's answer to the Watcher's doubt. The effect is read from the chosen
 * option's `value.effect`, never from the text:
 *
 * - roll-back: revert the PR and send it to merge, then RolledBack, report, new issue.
 * - done: Done.
 * - other: the text is recorded as a ruling on the item and nothing moves; the item stays
 *   Live, which unify-revisit raises again as needing attention.
 *
 * The answer's text is recorded as a ruling in every case (decision 32).
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST, INPUTS_REPO_PATH, INPUTS_NUMBER and
 * INPUTS_PIPELINE_MERGE_BINDING; INPUTS_PR from reconcile; INPUTS_DECISION, INPUTS_TEXT and
 * INPUTS_VALUE from the wait.
 */

import { emit, input, refuse, runId } from 'archon:script';
import { nullableJson, record } from '../../.shared/inputs.ts';
import { itemNumber, repoOf } from '../../.shared/repo.ts';
import { recordRuling } from '../../.shared/rulings.ts';
import { finishDone, finishRolledBack, readDeploy, revertAndMerge, type WatchRecord } from './lib.ts';

function main(): void {
  const repo = repoOf(input('repo_host'), input('repo_path'));
  const number = itemNumber(input('number'));
  if (number === undefined) return;
  const pr = Number(input('pr')) || null;
  const decision = input('decision').trim();
  const text = input('text').trim();
  const value = record(nullableJson(input('value')));
  const effect = decision === 'other' ? 'other' : typeof value?.effect === 'string' ? value.effect : '';
  const run = runId();
  const ref = { repo, number };
  recordRuling(ref, { gate: 'watch', decision, text, project: false });

  const watch: WatchRecord = readDeploy(number, run).record?.watch ?? {
    result: 'unsure', coverage: 'health-only', verdict: 'unsure', reason: 'no watch result recorded', evidence: [], revertPr: null, fire: null, at: new Date().toISOString(),
  };
  if (effect === 'roll-back') {
    if (pr === null) throw new Error('the answer asks for a rollback but the run names no PR');
    if (input('unify_merge_binding').trim() === '') throw new Error('unify_merge_binding is empty: a revert cannot be sent to merge');
    const revert = revertAndMerge(ref, pr, `The Operator chose to roll back. ${watch.reason}`);
    const summary = finishRolledBack(ref, pr, { ...watch, revertPr: revert.revertPr }, revert.revertPr, run, text);
    emit({ effect, summary: `${summary}; ${revert.fire}` });
    return;
  }
  if (effect === 'done') {
    emit({ effect, summary: finishDone(ref, pr, watch, run, text) });
    return;
  }
  if (effect === 'other') {
    emit({ effect, summary: `#${String(number)}: the Operator's text is recorded as a ruling; the item stays Live` });
    return;
  }
  throw new Error(`the answer '${decision}' carries no effect this script knows`);
}

try {
  main();
} catch (error) {
  refuse(`unify-deploy answer: ${error instanceof Error ? error.message : String(error)}`);
}

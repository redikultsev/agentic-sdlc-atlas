/**
 * Act on the answer that ended the spec loop, by the chosen option's `value.effect` (read
 * from the run's node outcomes: the gate is the loop's only sink). approve: the ruling (if
 * any text), the move SpecReview → Planning, then unify-plan through its binding, once
 * per run. stop: nothing.
 *
 * Inputs: repo_host, repo_path, number, unify_plan_binding (read by fireNext).
 * Emits `{ effect, fired, summary }`.
 */

import { emit, input, refuse, runId } from 'archon:script';
import { fireNext } from '../../.shared/fire.ts';
import { runInputs } from '../../.shared/repo.ts';
import { recordRuling } from '../../.shared/rulings.ts';
import { chosenEffect, lastAnswer, tryMove } from '../../.shared/stage.ts';

function main(): void {
  const { repo, number } = runInputs();
  if (number === undefined) return;
  const ref = { repo, number };
  const answer = lastAnswer('rounds', 'spec-gate');
  if (answer === null) throw new Error('the SpecReview gate has no recorded answer');
  const effect = chosenEffect(answer, 'clarify');
  if (effect === 'clarify') throw new Error('the loop ended on a clarify answer');
  if (answer.text.trim() !== '') recordRuling(ref, { gate: 'spec-review', decision: answer.decision, text: answer.text, project: false });
  let fired = '';
  if (effect === 'approve') {
    const mismatch = tryMove(ref, ['spec-review'], 'planning');
    if (mismatch !== null) throw new Error(mismatch);
    if (input('unify_plan_binding') === '') throw new Error('unify_plan_binding is empty');
    fired = fireNext('unify-plan', repo, number, `unify-plan:${repo.host}/${repo.path}#${number}:spec:${runId()}`);
  } else if (effect !== 'stop') {
    throw new Error(`unknown effect '${effect}'`);
  }
  emit({ effect, fired, summary: `#${number}: ${answer.decision} (${effect})${fired === '' ? '' : `; ${fired}`}` });
}

try {
  main();
} catch (error) {
  refuse(`unify-spec apply: ${error instanceof Error ? error.message : String(error)}`);
}

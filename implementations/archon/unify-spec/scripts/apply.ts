/**
 * Act on the answer that ended the spec loop, by the chosen option's `value.effect` (read
 * from the run's node outcomes: the gate is the loop's only sink). approve: the ruling (if
 * any text), the move SpecReview → Planning, then unify-plan through its binding, once
 * per run. stop: nothing.
 *
 * Inputs: repo_host, repo_path, number, unify_plan_binding (read by fireNext).
 * Emits `{ effect, fired, summary }`.
 */

import { emit, input, runId } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { fireNext } from '../../.shared/fire.ts';
import { runInputs } from '../../.shared/repo.ts';
import { recordRuling } from '../../.shared/rulings.ts';
import { chosenEffect, lastAnswer, tryMove } from '../../.shared/stage.ts';

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  if (key === undefined) return;
  const answer = lastAnswer('rounds', 'spec-gate');
  if (answer === null) throw new Error('the SpecReview gate has no recorded answer');
  const effect = chosenEffect(answer, 'clarify');
  if (effect === 'clarify') throw new Error('the loop ended on a clarify answer');
  if (answer.text.trim() !== '') await recordRuling(key, { gate: 'spec-review', decision: answer.decision, text: answer.text, project: false });
  let fired = '';
  if (effect === 'approve') {
    const mismatch = await tryMove(key, ['spec-review'], 'planning');
    if (mismatch !== null) throw new Error(mismatch);
    if (input('unify_plan_binding') === '') throw new Error('unify_plan_binding is empty');
    const at = `${repo.host}/${repo.path}${key.startsWith('#') ? '' : ':'}${key}`;
    fired = fireNext('unify-plan', repo, key, `unify-plan:${at}:spec:${runId()}`);
  } else if (effect !== 'stop') {
    throw new Error(`unknown effect '${effect}'`);
  }
  emit({ effect, fired, summary: `${key}: ${answer.decision} (${effect})${fired === '' ? '' : `; ${fired}`}` });
}

await script('unify-spec apply', main);

/**
 * The Operator's answer to a difference between the engine and the tracker (decision 45),
 * taken at the `stop` wait: put the tracker back to the engine's state, or adopt the
 * tracker's. The run ends either way; the spec step starts again from a state both agree on.
 *
 * Inputs: repo_host, repo_path, number; `answer`, the stop wait's output. Emits `{ state }`.
 */

import { emit, input, refuse } from 'archon:script';
import { nullableJson } from '../../.shared/inputs.ts';
import { runInputs } from '../../.shared/repo.ts';
import { applyDifference } from '../../.shared/stage.ts';
import { readState } from '../../.shared/states.ts';

function main(): void {
  const { repo, number } = runInputs();
  if (number === undefined) return;
  const ref = { repo, number };
  const answer = nullableJson(input('answer')) as { value?: { effect?: string } } | null;
  if (!applyDifference(ref, answer?.value?.effect)) throw new Error('the answer is not one of the difference options');
  emit({ state: readState(ref) });
}

try {
  main();
} catch (error) {
  refuse(`unify-spec sync: ${error instanceof Error ? error.message : String(error)}`);
}

/**
 * The Operator's answer to a difference between the engine and the tracker (decision 45),
 * taken at the `stop` wait: put the tracker back to the engine's state, or adopt the
 * tracker's. The run ends either way; the plan step starts again from a state both agree on.
 *
 * Inputs: repo_host, repo_path, number; `answer`, the stop wait's output. Emits `{ state }`.
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { nullableJson } from '../../.shared/inputs.ts';
import { runInputs } from '../../.shared/repo.ts';
import { applyDifference } from '../../.shared/stage.ts';
import { readState } from '../../.shared/states.ts';

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const answer = nullableJson(input('answer')) as { value?: { effect?: string } } | null;
  if (!(await applyDifference(key, answer?.value?.effect))) throw new Error('the answer is not one of the difference options');
  emit({ state: await readState(key) });
}

await script('unify-plan sync', main);

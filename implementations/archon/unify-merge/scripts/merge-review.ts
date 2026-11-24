/** Move the item to MergeReview before the gate: an Operator state, counted by the cap. */

import { emit } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { moveState } from '../../.shared/states.ts';

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  await moveState(key, ['verifying', 'merge-review'], 'merge-review');
  emit({ state: 'merge-review' });
}

await script('unify-merge merge-review', main);

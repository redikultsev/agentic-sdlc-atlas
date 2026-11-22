/**
 * Move the item to Live: from Verifying (merged as R0) or MergeReview (the Operator's
 * merge). An item already Live (a restarted run) stays as it is. Any other label is a
 * mismatch and fails the node rather than overwriting what a person set.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST, INPUTS_REPO_PATH and INPUTS_NUMBER.
 */

import { emit, input, refuse } from 'archon:script';
import { itemNumber, repoOf } from '../../.shared/repo.ts';
import { moveState } from '../../.shared/states.ts';

function main(): void {
  const repo = repoOf(input('repo_host'), input('repo_path'));
  const number = itemNumber(input('number'));
  if (number === undefined) return;
  moveState({ repo, number }, ['verifying', 'merge-review'], 'live');
  emit({ state: 'live' });
}

try {
  main();
} catch (error) {
  refuse(`unify-deploy state: ${error instanceof Error ? error.message : String(error)}`);
}

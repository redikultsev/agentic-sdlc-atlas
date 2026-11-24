/**
 * Move the item to Live: from Releasing, where every merge waits for its release (the
 * project releases on every merge: shape A). An item already Live (a restarted run) stays as it is. Any other label is a
 * mismatch and fails the node rather than overwriting what a person set.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST, INPUTS_REPO_PATH and INPUTS_NUMBER.
 */

import { emit } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { moveState } from '../../.shared/states.ts';

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  await moveState(key, ['releasing'], 'live');
  emit({ state: 'live' });
}

await script('unify-deploy state', main);

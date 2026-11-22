/** Move the item to MergeReview before the gate: an Operator state, counted by the cap. */

import { emit, input } from 'archon:script';
import { moveState } from '../../.shared/states.ts';
import { run } from './lib/item.ts';
import { itemRef } from './lib/facts.ts';

run(() => {
  const ref = itemRef(input('repo_host'), input('repo_path'), input('number'));
  moveState(ref, ['verifying', 'merge-review'], 'merge-review');
  emit({ state: 'merge-review' });
});

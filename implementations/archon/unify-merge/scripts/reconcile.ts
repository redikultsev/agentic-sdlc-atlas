/**
 * Start check of a merge: the label is Verifying (a pass the round fired, or an item
 * started again after an environment's queue), MergeReview (a restart, or a new card) or
 * TestReview (a restart while a person's gate waits), and `work/<key>` records the PR. A
 * mismatch is a request, never an overwrite. A revert PR (`revert-pr:<m>` in the flags)
 * also starts from Live.
 */

import { emit } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { docName } from '../../.shared/work.ts';
import { readItem, reconcile } from './lib/item.ts';

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const doc = readItem(key);
  // A revert the deploy step opened (decision 26) merges while the item is Live.
  const revert = doc.flags.some(f => f.startsWith('revert-pr:'));
  const noPr = doc.pr === null && !revert ? [`${docName(key)} records no PR to merge`] : [];
  const starts = revert ? (['verifying', 'merge-review', 'live'] as const) : (['verifying', 'merge-review', 'test-review'] as const);
  const result = await reconcile(key, 'unify-merge', starts, revert ? 'live' : 'merge-review', noPr);
  emit({ ok: result.ok, state: result.state, problems: result.problems, ...result.card });
}

await script('unify-merge reconcile', main);

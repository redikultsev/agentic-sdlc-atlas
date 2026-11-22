/**
 * Start check of a merge: the label is Verifying (a pass the round fired) or MergeReview
 * (a restart, or a new card), and `work/<n>` records the PR. A mismatch is a request,
 * never an overwrite. A revert PR (`revert-pr:<m>` in the flags) also starts from Live.
 */

import { emit, input } from 'archon:script';
import { readItem, reconcile, run } from './lib/item.ts';
import { itemRef } from './lib/facts.ts';

run(() => {
  const ref = itemRef(input('repo_host'), input('repo_path'), input('number'));
  const doc = readItem(ref.number);
  // A revert the deploy step opened (decision 26) merges while the item is Live.
  const revert = doc.flags.some(f => f.startsWith('revert-pr:'));
  const noPr = doc.pr === null && !revert ? [`work/${ref.number} records no PR to merge`] : [];
  const starts = revert ? (['verifying', 'merge-review', 'live'] as const) : (['verifying', 'merge-review'] as const);
  const result = reconcile(ref, 'unify-merge', starts, revert ? 'live' : 'merge-review', noPr);
  emit({ ok: result.ok, state: result.state, problems: result.problems, ...result.card });
});

/**
 * Start check of a round: the label names a state a round may start from (TriageReview
 * for an accepted S item, PlanReview, Verifying after a fix, MergeReview after "changes",
 * Blocked after "one more round", Implementing after a restart) and `work/<n>` agrees.
 * A mismatch is a request, never an overwrite.
 */

import { emit, input } from 'archon:script';
import { reconcile, run } from './lib/item.ts';
import { itemRef } from './lib/facts.ts';

run(() => {
  const ref = itemRef(input('repo_host'), input('repo_path'), input('number'));
  const result = reconcile(
    ref,
    'unify-round',
    ['triage-review', 'plan-review', 'implementing', 'verifying', 'merge-review', 'blocked'],
    'implementing'
  );
  emit({ ok: result.ok, state: result.state, problems: result.problems, ...result.card });
});

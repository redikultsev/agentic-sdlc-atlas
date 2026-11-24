/**
 * Start check of a round: the label names a state a round may start from (TriageReview
 * for an accepted S item, PlanReview, Verifying after a fix, MergeReview after "changes",
 * Blocked after "one more round", Implementing after a restart) and `work/<key>` agrees.
 * A mismatch is a request, never an overwrite.
 */

import { emit } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { reconcile } from './lib/item.ts';

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const result = await reconcile(
    key,
    'unify-round',
    ['triage-review', 'plan-review', 'implementing', 'verifying', 'merge-review', 'blocked'],
    'implementing'
  );
  emit({ ok: result.ok, state: result.state, problems: result.problems, ...result.card });
}

await script('unify-round reconcile', main);

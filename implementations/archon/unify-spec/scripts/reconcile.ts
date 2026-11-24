/**
 * First node of a spec run: the item is open, has at most one state label, and was
 * accepted (TriageReview) or is in Specifying. Anything else stops the run with
 * a request instead of specifying over it.
 *
 * Inputs: repo_host, repo_path, number. Emits a card: `{ ok, reason, question, options, recommendation, state }`.
 */

import { emit } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { clear, differenceCard, reconcile, stopCard } from '../../.shared/stage.ts';

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const found = await reconcile(key, ['triage-review', 'specifying']);
  if (found.reason !== null) {
    const card = found.difference ? differenceCard(key, 'spec', found.difference) : stopCard(key, 'spec', found.reason);
    emit({ ...card, state: found.state ?? 'unknown' });
    return;
  }
  emit({ ...clear(), state: found.state });
}

await script('unify-spec reconcile', main);

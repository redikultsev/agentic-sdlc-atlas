/**
 * First node of a triage run: the issue is open, has at most one state label, and is new
 * (no state) or in Triaging from a run that ended early. Anything else stops the run with
 * a request instead of triaging over it.
 *
 * Inputs: repo_host, repo_path, number. Emits a card: `{ ok, reason, question, options, recommendation, state }`.
 */

import { emit, refuse } from 'archon:script';
import { runInputs } from '../../.shared/repo.ts';
import { clear, differenceCard, reconcile, stopCard } from '../../.shared/stage.ts';

function main(): void {
  const { repo, number } = runInputs();
  if (number === undefined) return;
  const ref = { repo, number };
  const found = reconcile(ref, ['none', 'triaging']);
  if (found.reason !== null) {
    const card = found.difference ? differenceCard(ref, 'triage', found.difference) : stopCard(ref, 'triage', found.reason);
    emit({ ...card, state: found.state ?? 'unknown' });
    return;
  }
  emit({ ...clear(), state: found.state });
}

try {
  main();
} catch (error) {
  refuse(`unify-triage reconcile: ${error instanceof Error ? error.message : String(error)}`);
}

/**
 * Enter the stage: the Triaging move, or the reason not to. Joins reconcile and trust so
 * one stop request (and one wait) covers both places the run can find the item where it
 * did not expect it.
 *
 *   reconcile found a mismatch          → ask: reconcile's stop request
 *   trust held the request back         → nothing to ask, nothing to do
 *   the label moved since reconcile     → ask: a stop request, the label is not overwritten
 *   otherwise                           → Triaging, go
 *
 * Inputs: repo_host, repo_path, number; bound reconcile and trust (null when skipped).
 * Emits a card with `go` and `ask`.
 */

import { emit, input, refuse } from 'archon:script';
import { nullableJson } from '../../.shared/inputs.ts';
import { runInputs } from '../../.shared/repo.ts';
import { type Card, clear, stopCard, tryMove } from '../../.shared/stage.ts';

function main(): void {
  const { repo, number } = runInputs();
  if (number === undefined) return;
  const ref = { repo, number };
  const reconciled = JSON.parse(input('reconcile')) as Card;
  const trust = nullableJson(input('trust')) as { proceed: boolean } | null;
  if (!reconciled.ok) {
    emit({ ...reconciled, go: false, ask: true });
    return;
  }
  if (trust === null || !trust.proceed) {
    emit({ ...clear(), go: false, ask: false });
    return;
  }
  const mismatch = tryMove(ref, ['none', 'triaging'], 'triaging');
  emit(mismatch === null ? { ...clear(), go: true, ask: false } : { ...stopCard(ref, 'triage', mismatch), go: false, ask: true });
}

try {
  main();
} catch (error) {
  refuse(`unify-triage enter: ${error instanceof Error ? error.message : String(error)}`);
}

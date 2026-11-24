/**
 * Enter the stage: the move to Specifying, or a stop request when reconcile found a
 * mismatch or the label changed since. Inputs: repo_host, repo_path, number; bound
 * reconcile. Emits a card with `go` and `ask`.
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { type Card, clear, stopCard, tryMove } from '../../.shared/stage.ts';

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const reconciled = JSON.parse(input('reconcile')) as Card;
  if (!reconciled.ok) {
    emit({ ...reconciled, go: false, ask: true });
    return;
  }
  const mismatch = await tryMove(key, ['triage-review', 'specifying'], 'specifying');
  emit(mismatch === null ? { ...clear(), go: true, ask: false } : { ...stopCard(key, 'spec', mismatch), go: false, ask: true });
}

await script('unify-spec enter', main);

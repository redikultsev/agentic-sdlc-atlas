/**
 * Apply the answer to a reconcile mismatch: `proceed` takes the label as the truth and
 * the round goes on; `stop` (or an `other` answer, recorded as a ruling) ends the run here.
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { recordRuling } from '../../.shared/rulings.ts';
import { answerOf, bound, reconcileGo } from './lib/item.ts';
import { applyDifference } from '../../.shared/stage.ts';

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const checked = bound<{ ok: boolean }>(input('reconcile'));
  const answer = answerOf(input('answer'));
  if (checked === null) throw new Error('reconcile left no result');
  if (answer !== null) await recordRuling(key, { gate: 'round-reconcile', decision: answer.decision, text: answer.text, project: false });
  if (!checked.ok && answer !== null) await applyDifference(key, answer.effect);
  emit({ go: reconcileGo(checked.ok, answer) });
}

await script('unify-round reconcile-ruling', main);

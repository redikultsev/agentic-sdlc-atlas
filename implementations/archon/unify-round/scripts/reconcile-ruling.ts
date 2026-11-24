/**
 * Apply the answer to a reconcile mismatch: `proceed` takes the label as the truth and
 * the round goes on; `stop` (or an `other` answer, recorded as a ruling) ends the run here.
 */

import { emit, input } from 'archon:script';
import { recordRuling } from '../../.shared/rulings.ts';
import { answerOf, bound, reconcileGo, run } from './lib/item.ts';
import { applyDifference } from '../../.shared/stage.ts';
import { itemRef } from './lib/facts.ts';

run(() => {
  const ref = itemRef(input('repo_host'), input('repo_path'), input('number'));
  const checked = bound<{ ok: boolean }>(input('reconcile'));
  const answer = answerOf(input('answer'));
  if (checked === null) throw new Error('reconcile left no result');
  if (answer !== null) recordRuling(ref, { gate: 'round-reconcile', decision: answer.decision, text: answer.text, project: false });
  if (!checked.ok && answer !== null) applyDifference(ref, answer.effect);
  emit({ go: reconcileGo(checked.ok, answer) });
});

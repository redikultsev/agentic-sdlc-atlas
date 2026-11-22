/** Apply the answer to a reconcile mismatch: `proceed` goes on, anything else ends the run. */

import { emit, input } from 'archon:script';
import { recordRuling } from '../../.shared/rulings.ts';
import { answerOf, bound, reconcileGo, run } from './lib/item.ts';
import { itemRef } from './lib/facts.ts';

run(() => {
  const ref = itemRef(input('repo_host'), input('repo_path'), input('number'));
  const checked = bound<{ ok: boolean }>(input('reconcile'));
  const answer = answerOf(input('answer'));
  if (checked === null) throw new Error('reconcile left no result');
  if (answer !== null) recordRuling(ref, { gate: 'merge-reconcile', decision: answer.decision, text: answer.text, project: false });
  emit({ go: reconcileGo(checked.ok, answer) });
});

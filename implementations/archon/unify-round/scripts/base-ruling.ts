/**
 * Apply the red-base answer: `except` records the listed ids as known for this item and
 * the round goes on; `for-human` hands the item over; `wait` (or `other`, a ruling) ends
 * the run here.
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { recordRuling } from '../../.shared/rulings.ts';
import { answerOf, bound, closeWithReason, moveAlong, updateItem } from './lib/item.ts';

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const checked = bound<{ go: boolean; commit: string }>(input('base_check'));
  const answer = answerOf(input('answer'));
  if (checked === null) throw new Error('base left no result');
  if (checked.go) {
    emit({ go: true });
    return;
  }
  if (answer === null) throw new Error('base asked, and the run continued with no answer');
  await recordRuling(key, { gate: 'round-base', decision: answer.decision, text: answer.text, project: false });
  if (answer.effect === 'except' && Array.isArray(answer.value.ids)) {
    const ids = (answer.value.ids as unknown[]).filter((id): id is string => typeof id === 'string');
    updateItem(key, doc => {
      doc.base = { commit: checked.commit, failing: [...new Set([...(doc.base?.failing ?? []), ...ids])].sort() };
    });
    emit({ go: true });
    return;
  }
  if (answer.effect === 'for-human') {
    await moveAlong(key, ['triage-review', 'plan-review', 'implementing', 'verifying', 'merge-review', 'blocked'], 'for-human');
    await closeWithReason(key, 'pipeline-for-human', 'This item is handed to a human: the base check is red and the Operator chose not to wait.');
  }
  emit({ go: false });
}

await script('unify-round base-ruling', main);

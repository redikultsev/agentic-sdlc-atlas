/**
 * Rounds used so far, read from `work/<n>` at every start so a re-fired run cannot reset
 * the cap (review finding 4). At 3 failed rounds the item moves to Blocked and the
 * Blocked request is handed on; nothing else in this run works on it.
 */

import { emit, input } from 'archon:script';
import { moveAlong, readItem, run } from './lib/item.ts';
import { blockedCard, ROUND_CAP } from './lib/blocked.ts';
import { itemRef } from './lib/facts.ts';

run(() => {
  const ref = itemRef(input('repo_host'), input('repo_path'), input('number'));
  const doc = readItem(ref.number);
  if (doc.rounds < ROUND_CAP) {
    emit({ go: true, at_cap: false, rounds: doc.rounds, ask: false, question: '', options: [], recommendation: null });
    return;
  }
  moveAlong(ref, ['implementing', 'verifying', 'merge-review', 'blocked', 'triage-review', 'plan-review'], 'blocked');
  const blocked = blockedCard(ref, `${doc.rounds} fix rounds are used up`, doc);
  emit({ go: false, at_cap: true, rounds: doc.rounds, ...blocked });
});

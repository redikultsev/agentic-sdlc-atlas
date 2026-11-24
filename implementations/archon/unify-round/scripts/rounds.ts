/**
 * Rounds used so far, read from `work/<key>` at every start so a re-fired run cannot reset
 * the cap (review finding 4). At 3 failed rounds the item moves to Blocked and the
 * Blocked request is handed on; nothing else in this run works on it.
 */

import { emit } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { moveAlong, readItem } from './lib/item.ts';
import { blockedCard, ROUND_CAP } from './lib/blocked.ts';

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const doc = readItem(key);
  if (doc.rounds < ROUND_CAP) {
    emit({ go: true, at_cap: false, rounds: doc.rounds, ask: false, question: '', options: [], recommendation: null });
    return;
  }
  await moveAlong(key, ['implementing', 'verifying', 'merge-review', 'blocked', 'triage-review', 'plan-review'], 'blocked');
  const blocked = blockedCard(key, `${doc.rounds} fix rounds are used up`, doc);
  emit({ go: false, at_cap: true, rounds: doc.rounds, ...blocked });
}

await script('unify-round rounds', main);

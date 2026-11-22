/**
 * Apply the route answer. `mode` is what the rest of the run does: implement, verify a
 * found PR without implementing, or stop. A `continue` ruling is remembered in
 * `work/<n>` so the same hits are not asked about again next round.
 */

import { emit, input } from 'archon:script';
import { recordRuling } from '../../.shared/rulings.ts';
import { answerOf, bound, run, updateItem } from './lib/item.ts';
import { itemRef } from './lib/facts.ts';

run(() => {
  const ref = itemRef(input('repo_host'), input('repo_path'), input('number'));
  const routed = bound<{ ask: boolean; hits: number[] }>(input('route'));
  const answer = answerOf(input('answer'));
  if (routed === null) throw new Error('route left no result');
  if (!routed.ask) {
    emit({ mode: 'implement', pr: null });
    return;
  }
  if (answer === null) throw new Error('route asked, and the run continued with no answer');
  recordRuling(ref, { gate: 'round-route', decision: answer.decision, text: answer.text, project: false });
  if (answer.effect === 'continue') {
    updateItem(ref.number, doc => {
      for (const n of routed.hits) if (!doc.flags.includes(`route-ruled:${n}`)) doc.flags.push(`route-ruled:${n}`);
    });
    emit({ mode: 'implement', pr: null });
  } else if (answer.effect === 'verify' && typeof answer.value.pr === 'number') {
    emit({ mode: 'verify', pr: answer.value.pr });
  } else {
    emit({ mode: 'stop', pr: null });
  }
});

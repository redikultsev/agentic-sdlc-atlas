/**
 * Apply the merge gate (or the R0 rules): `merge` carries the head SHA the card showed and
 * is recorded as the Operator's verdict at the diff fingerprint; `changes` is a ruling and
 * the next round's fix, counted in `changes` and not in rounds (decision 24), at most 3
 * times, then the card offers back to the plan; `other` records the text and leaves the
 * state as it is.
 */

import { emit, input } from 'archon:script';
import { recordRuling } from '../../.shared/rulings.ts';
import { answerOf, bound, findingKey, run, updateItem } from './lib/item.ts';
import { itemRef } from './lib/facts.ts';

run(() => {
  const ref = itemRef(input('repo_host'), input('repo_path'), input('number'));
  const rules = bound<{ path: string; pr: number; head: string; fingerprint: string; stale: string[] }>(input('rules'));
  const answer = answerOf(input('answer'));
  if (rules === null) throw new Error('rules left no result');
  const out = (decision: string, operator: boolean, head = rules.head): void =>
    emit({ decision, pr: rules.pr, head, fingerprint: rules.fingerprint, operator, revert: rules.path === 'revert' });
  if (rules.path === 'r0' || rules.path === 'revert') return out('merge', false);
  if (rules.path === 'stale') return out('stale', false);
  if (answer === null) throw new Error('the gate was asked, and the run continued with no answer');
  recordRuling(ref, { gate: 'merge-gate', decision: answer.decision, text: answer.text, project: false });
  const at = new Date().toISOString();
  if (answer.effect === 'merge') {
    const head = typeof answer.value.head === 'string' ? answer.value.head : '';
    if (head !== rules.head) throw new Error(`the answer names head ${head}, the card showed ${rules.head}`);
    updateItem(ref.number, doc => {
      doc.verdicts = [...doc.verdicts, { kind: 'operator', verdict: 'merge', fingerprint: rules.fingerprint, head, at }];
      doc.landAttempts = 0;
    });
    return out('merge', true, head);
  }
  if (answer.effect === 'changes' || answer.effect === 'back-to-plan') {
    const text = answer.text.trim() === '' ? 'The Operator asked for changes without a comment; re-read the spec and the review threads.' : answer.text;
    updateItem(ref.number, doc => {
      if (answer.effect === 'changes') doc.changes += 1;
      doc.fix = { from: 'merge gate "changes"', findings: [{ key: findingKey('operator', text), source: 'operator', text, repeated: false }] };
    });
    return out(answer.effect, true);
  }
  out('hold', true);
});

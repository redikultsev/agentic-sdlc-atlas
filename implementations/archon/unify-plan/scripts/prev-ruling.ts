/**
 * Start of a plan round. When the previous round's PlanReview answer was a redo (the
 * Operator's `other` text, or the declared `redo` option that sends the check's problems
 * back), it is counted in `work/<n>` once, written on the item as a ruling, and the item
 * moves back to Planning. After three redos the stage writes no more plans: `over`
 * is true and the card becomes a request (the same rule as the spec gate); a further
 * `other` is then only recorded as a ruling.
 *
 * Inputs: repo_host, repo_path, number, pipeline_login; bound prev_decision, prev_text,
 * prev_problems (the previous round's answer and check problems; empty in round one).
 * A label moved by someone else is not overwritten: `mismatch` names it and the card
 * becomes a stop request. Emits `{ go, over, mismatch, redo, correction, rulings }`.
 */

import { emit, input, refuse, runId } from 'archon:script';
import { forge } from '../../.shared/forge.ts';
import { selfLogin } from '../../.shared/github.ts';
import { runInputs } from '../../.shared/repo.ts';
import { recordRuling } from '../../.shared/rulings.ts';
import { digest, untrusted } from '../../.shared/trust.ts';
import { readWork, updateWork } from '../../.shared/work.ts';
import { tryMove } from '../../.shared/stage.ts';

const LIMIT = 3;

function main(): void {
  const { repo, number } = runInputs();
  if (number === undefined) return;
  const ref = { repo, number };
  const decision = input('prev_decision').trim();
  const words = input('prev_text').trim();
  const problems = input('prev_problems').trim();
  let correction = '';
  let mismatch = '';
  let redo = readWork(number).doc.redo;
  if (decision === 'other' || decision === 'redo') {
    correction = [words, decision === 'redo' && problems !== '' && problems !== '[]' ? `Fix the problems the plan check found: ${problems}` : '']
      .filter(s => s !== '')
      .join('\n\n');
    const flag = `redo:${runId()}:${digest(`${decision}:${correction}`)}`;
    const doc = updateWork(number, d => {
      if (d.flags.includes(flag) || d.redo >= LIMIT) return;
      d.flags.push(flag);
      d.redo += 1;
    });
    redo = doc.redo;
    if (correction !== '') recordRuling(ref, { gate: `plan-redo-${digest(flag).slice(0, 8)}`, decision, text: correction, project: false });
    // Back to Planning for the next plan, unless the three redos are used up.
    if (redo < LIMIT) {
      mismatch = tryMove(ref, ['plan-review', 'planning'], 'planning') ?? '';
    }
  }
  const login = (input('pipeline_login') || selfLogin()).toLowerCase();
  const rulings = forge('workitem.comments', { subject: { kind: 'issue', ref } })
    .comments.filter(c => c.author?.login?.toLowerCase() === login && c.body.startsWith('**Ruling**'))
    .map(c => untrusted(`ruling ${c.url} (the Operator's words)`, c.body));
  const over = redo >= LIMIT;
  emit({ go: !over && mismatch === '', over, mismatch, redo, correction, rulings: rulings.join('\n\n') });
}

try {
  main();
} catch (error) {
  refuse(`unify-plan prev-ruling: ${error instanceof Error ? error.message : String(error)}`);
}

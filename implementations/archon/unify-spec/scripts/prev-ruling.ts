/**
 * Start of a spec round. When the previous round's SpecReview answer was a clarify (the
 * Operator's `other` text, or the declared `clarify` option that sends the check's problems
 * back), it is counted in `work/<key>` once, written on the item as a ruling, and the item
 * moves back to Specifying. After three clarifies the stage writes no more drafts: `over`
 * is true and the card becomes a request (SPEC: "3 × clarify: a request"); a further
 * `other` is then only recorded as a ruling.
 *
 * Inputs: repo_host, repo_path, number, pipeline_login; bound prev_decision, prev_text,
 * prev_problems (the previous round's answer and check problems; empty in round one).
 * A label moved by someone else is not overwritten: `mismatch` names it and the card
 * becomes a stop request. Emits `{ go, over, mismatch, clarify, correction, rulings }`.
 */

import { emit, input, runId } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { selfLogin } from '../../.shared/github.ts';
import { runInputs } from '../../.shared/repo.ts';
import { recordRuling } from '../../.shared/rulings.ts';
import { digest, untrusted } from '../../.shared/trust.ts';
import { readWork, updateWork } from '../../.shared/work.ts';
import { tryMove } from '../../.shared/stage.ts';

const LIMIT = 3;

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const decision = input('prev_decision').trim();
  const words = input('prev_text').trim();
  const problems = input('prev_problems').trim();
  let correction = '';
  let mismatch = '';
  let clarify = readWork(key).doc.clarify;
  if (decision === 'other' || decision === 'clarify') {
    correction = [words, decision === 'clarify' && problems !== '' && problems !== '[]' ? `Fix the problems the spec check found: ${problems}` : '']
      .filter(s => s !== '')
      .join('\n\n');
    const flag = `clarify:${runId()}:${digest(`${decision}:${correction}`)}`;
    const doc = updateWork(key, d => {
      if (d.flags.includes(flag) || d.clarify >= LIMIT) return;
      d.flags.push(flag);
      d.clarify += 1;
    });
    clarify = doc.clarify;
    if (correction !== '') await recordRuling(key, { gate: `spec-clarify-${digest(flag).slice(0, 8)}`, decision, text: correction, project: false });
    // Back to Specifying for the next draft, unless the three clarifies are used up.
    if (clarify < LIMIT) {
      mismatch = await tryMove(key, ['spec-review', 'specifying'], 'specifying') ?? '';
    }
  }
  const login = (input('pipeline_login') || selfLogin()).toLowerCase();
  const rulings = (await tracker().comments(key))
    .filter(c => c.author?.toLowerCase() === login && c.body.startsWith('**Ruling**'))
    .map(c => untrusted(`ruling ${c.url} (the Operator's words)`, c.body));
  const over = clarify >= LIMIT;
  emit({ go: !over && mismatch === '', over, mismatch, clarify, correction, rulings: rulings.join('\n\n') });
}

await script('unify-spec prev-ruling', main);

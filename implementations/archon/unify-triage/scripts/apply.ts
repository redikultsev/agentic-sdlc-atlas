/**
 * Act on the Operator's answer to the Accept card, by the chosen option's `value.effect`,
 * never by reading the answer's words. The answer is read from the run's node outcomes:
 * the gate is the only sink of the review loop, so no later node can reference it.
 *
 *   accept     size and risk labels, the ruling (if any text), the move to Specifying (M, L)
 *              or Implementing (S), then the fire of unify-spec or unify-round
 *   for-human  the move to ForHuman and a comment saying why
 *   wont-do    the move to Cancelled, `pipeline:rejected`, a closing comment, closed not planned
 *   stop       nothing (the card was a stop request)
 *
 * Triage files no discoveries (SPEC review #16). Every write checks first and reads back
 * through `.shared/states.ts`; the fire's delivery id is this run, so a retry starts one run.
 *
 * Inputs: repo_host, repo_path, number, unify_spec_binding, unify_round_binding
 * (read by fireNext); bound card (the review loop's output: the last card).
 * Emits `{ effect, fired, summary }`.
 */

import { emit, input, refuse, runId } from 'archon:script';
import { forge } from '../../.shared/forge.ts';
import { fireNext } from '../../.shared/fire.ts';
import { runInputs } from '../../.shared/repo.ts';
import { recordRuling } from '../../.shared/rulings.ts';
import { MARKS } from '../../.shared/states.ts';
import { chosenEffect, lastAnswer, tryMove } from '../../.shared/stage.ts';

function main(): void {
  const { repo, number } = runInputs();
  if (number === undefined) return;
  const ref = { repo, number };
  const subject = { kind: 'issue' as const, ref };
  const card = JSON.parse(input('card')) as { ok: boolean; size: 'S' | 'M' | 'L'; risk: string; verdict_reason: string };
  const answer = lastAnswer('review', 'accept');
  if (answer === null) throw new Error('the Accept gate has no recorded answer');
  const effect = chosenEffect(answer, 'stop');
  if (answer.text.trim() !== '') recordRuling(ref, { gate: 'accept', decision: answer.decision, text: answer.text, project: false });
  const id = runId();
  let fired = '';
  switch (effect) {
    case 'stop':
      break;
    case 'accept': {
      for (const name of [`size:${card.size.toLowerCase()}`, `risk:${card.risk.toLowerCase()}`]) {
        forge('repo.label.ensure', { repo, name, color: 'ededed', description: 'Set by pipeline triage at Accept' });
        forge('workitem.label.add', { subject, name });
      }
      const small = card.size === 'S';
      const mismatch = tryMove(ref, ['triage-review'], small ? 'implementing' : 'specifying');
      if (mismatch !== null) throw new Error(mismatch);
      const next = small ? 'unify-round' : 'unify-spec';
      if (small && input('unify_round_binding') === '') throw new Error('unify_round_binding is empty');
      if (!small && input('unify_spec_binding') === '') throw new Error('unify_spec_binding is empty');
      fired = fireNext(next, repo, number, `${next}:${repo.host}/${repo.path}#${number}:triage:${id}`);
      break;
    }
    case 'for-human': {
      const mismatch = tryMove(ref, ['triage-review'], 'for-human');
      if (mismatch !== null) throw new Error(mismatch);
      forge('workitem.comment.upsert', { subject, marker: `pipeline-for-human:${id}`, body: `This item is for a human; the pipeline only tracks it.\n\n${card.verdict_reason}` });
      break;
    }
    case 'wont-do': {
      const mismatch = tryMove(ref, ['triage-review'], 'cancelled');
      if (mismatch !== null) throw new Error(mismatch);
      forge('workitem.label.add', { subject, name: MARKS.rejected });
      const words = answer.text.trim() === '' ? '' : `\n\n${answer.text.trim()}`;
      forge('workitem.comment.upsert', { subject, marker: `pipeline-wont-do:${id}`, body: `Closed: this will not be done.\n\n${card.verdict_reason}${words}` });
      const closed = forge('workitem.close', { ref, reason: 'not_planned' });
      if (closed.workitem.state !== 'closed') throw new Error(`#${number} reads ${closed.workitem.state} after closing`);
      break;
    }
    default:
      throw new Error(`unknown effect '${effect}'`);
  }
  emit({ effect, fired, summary: `#${number}: ${answer.decision} (${effect})${fired === '' ? '' : `; ${fired}`}` });
}

try {
  main();
} catch (error) {
  refuse(`unify-triage apply: ${error instanceof Error ? error.message : String(error)}`);
}

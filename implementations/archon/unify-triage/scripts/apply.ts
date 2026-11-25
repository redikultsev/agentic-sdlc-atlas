/**
 * Act on the Operator's answer to the Accept card, by the chosen option's `value.effect`,
 * never by reading the answer's words. The answer is read from the run's node outcomes:
 * the gate is the only sink of the review loop, so no later node can reference it.
 *
 *   accept     size and risk labels, the ruling (if any text), the verdict's kind in
 *              `work.kind` (decision 58), `work.urgent` when the option carries
 *              `value.urgent` (decision 53), the move to Specifying (M, L) or
 *              Implementing (S), then the fire of unify-spec or unify-round
 *   for-human  the move to ForHuman and a comment saying why
 *   wont-do    the move to Cancelled, `pipeline:rejected`, a closing comment, closed not planned
 *   stop       nothing (the card was a stop request)
 *
 * Triage files no discoveries (SPEC review #16). Every write checks first and reads back
 * through the connector; the fire's delivery id is this run, so a retry starts one run.
 *
 * Inputs: repo_host, repo_path, number, unify_spec_binding, unify_round_binding
 * (read by fireNext); bound card (the review loop's output: the last card).
 * Emits `{ effect, fired, summary }`.
 */

import { emit, input, runId } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { fireNext } from '../../.shared/fire.ts';
import { runInputs } from '../../.shared/repo.ts';
import { recordRuling } from '../../.shared/rulings.ts';
import { MARKS } from '../../.shared/states.ts';
import { chosenEffect, lastAnswer, tryMove } from '../../.shared/stage.ts';
import { updateWork } from '../../.shared/work.ts';

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  if (key === undefined) return;
  const t = tracker();
  const card = JSON.parse(input('card')) as { ok: boolean; kind?: string; size: 'S' | 'M' | 'L'; risk: string; verdict_reason: string };
  const answer = lastAnswer('review', 'accept');
  if (answer === null) throw new Error('the Accept gate has no recorded answer');
  const effect = chosenEffect(answer, 'stop');
  if (answer.text.trim() !== '') await recordRuling(key, { gate: 'accept', decision: answer.decision, text: answer.text, project: false });
  const id = runId();
  let fired = '';
  switch (effect) {
    case 'stop':
      break;
    case 'accept': {
      const names = [`size:${card.size.toLowerCase()}`, `risk:${card.risk.toLowerCase()}`];
      for (const name of names) await t.ensureLabel(name, 'ededed', 'Set by pipeline triage at Accept');
      await t.label(key, { add: names });
      // The kind goes with the item: the round enforces red before green for a bug (decision 58).
      const kind = typeof card.kind === 'string' && card.kind !== '' ? card.kind : null;
      const urgent = answer.value?.urgent === true;
      const kept = updateWork(key, d => {
        d.kind = kind;
        if (urgent) d.urgent = true;
      });
      if (kept.kind !== kind || (urgent && !kept.urgent)) throw new Error(`${key}: kind or urgent did not read back`);
      const small = card.size === 'S';
      const mismatch = await tryMove(key, ['triage-review'], small ? 'implementing' : 'specifying');
      if (mismatch !== null) throw new Error(mismatch);
      const next = small ? 'unify-round' : 'unify-spec';
      if (small && input('unify_round_binding') === '') throw new Error('unify_round_binding is empty');
      if (!small && input('unify_spec_binding') === '') throw new Error('unify_spec_binding is empty');
      const at = `${repo.host}/${repo.path}${key.startsWith('#') ? '' : ':'}${key}`;
      fired = fireNext(next, repo, key, `${next}:${at}:triage:${id}`);
      break;
    }
    case 'for-human': {
      const mismatch = await tryMove(key, ['triage-review'], 'for-human');
      if (mismatch !== null) throw new Error(mismatch);
      await t.comment(key, `pipeline-for-human:${id}`, `This item is for a human; the pipeline only tracks it.\n\n${card.verdict_reason}`);
      break;
    }
    case 'wont-do': {
      const mismatch = await tryMove(key, ['triage-review'], 'cancelled');
      if (mismatch !== null) throw new Error(mismatch);
      await t.label(key, { add: [MARKS.rejected] });
      const words = answer.text.trim() === '' ? '' : `\n\n${answer.text.trim()}`;
      await t.comment(key, `pipeline-wont-do:${id}`, `Closed: this will not be done.\n\n${card.verdict_reason}${words}`);
      await t.close(key, 'not_planned');
      break;
    }
    default:
      throw new Error(`unknown effect '${effect}'`);
  }
  emit({ effect, fired, summary: `${key}: ${answer.decision} (${effect})${fired === '' ? '' : `; ${fired}`}` });
}

await script('unify-triage apply', main);

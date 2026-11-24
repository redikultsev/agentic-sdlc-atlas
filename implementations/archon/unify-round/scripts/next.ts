/**
 * The one place a round starts the next step (`.shared/fire.ts`): pass with no slices
 * left fires merge; slices left, a fix, a usage limit or a reviewer configured after
 * "review unavailable" fire the round again (an overlap-queued fire waits for this run to
 * end); a Blocked answer is applied here: one more round, back to the plan, for a human,
 * or cancel. Every fire's disposition is recorded in `work/<key>`.
 */

import { emit, input, runId } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { fireNext } from '../../.shared/fire.ts';
import { recordRuling } from '../../.shared/rulings.ts';
import { answerOf, bound, closeWithReason, moveAlong, updateItem } from './lib/item.ts';
import { ROUND_CAP } from './lib/blocked.ts';

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  if (key === undefined) return;
  const ended = bound<{ outcome: string; effect: string }>(input('round'));
  const answer = answerOf(input('answer'));
  const delivery = (what: string): string => `${runId()}:${what}`;
  const round = (): string => {
    if (input('unify_round_binding') === '') throw new Error('unify_round_binding is not set');
    return fireNext('unify-round', repo, key, delivery('round'));
  };
  if (ended === null) throw new Error('round left no result');
  let did = 'nothing';
  switch (ended.outcome) {
    case 'pass':
      if (input('unify_merge_binding') === '') throw new Error('unify_merge_binding is not set');
      did = fireNext('unify-merge', repo, key, delivery('merge'));
      break;
    case 'continue':
    case 'fix':
    case 'retry':
      did = round();
      break;
    case 'review-unavailable':
      if (ended.effect === 'retry') did = round();
      break;
    case 'blocked': {
      if (answer === null) break;
      await recordRuling(key, { gate: 'round-blocked', decision: answer.decision, text: answer.text, project: false });
      if (answer.effect === 'one-more') {
        updateItem(key, doc => {
          doc.rounds = Math.min(doc.rounds, ROUND_CAP - 1);
        });
        did = round();
      } else if (answer.effect === 'back-to-plan') {
        await moveAlong(key, ['blocked'], 'planning');
        updateItem(key, doc => {
          doc.rounds = 0;
        });
        if (input('unify_plan_binding') === '') throw new Error('unify_plan_binding is not set');
        did = fireNext('unify-plan', repo, key, delivery('plan'));
      } else if (answer.effect === 'for-human') {
        await moveAlong(key, ['blocked'], 'for-human');
        await closeWithReason(key, 'pipeline-for-human', `The Operator handed this item to a human after it was Blocked.${answer.text ? `\n\n${answer.text}` : ''}`);
        did = 'for-human';
      } else if (answer.effect === 'cancel') {
        await moveAlong(key, ['blocked'], 'cancelled');
        await closeWithReason(key, 'pipeline-cancelled', `The Operator cancelled this item after it was Blocked.${answer.text ? `\n\n${answer.text}` : ''}`, true);
        did = 'cancelled';
      } else {
        did = 'ruling recorded; the item stays Blocked';
      }
      break;
    }
    default:
      break;
  }
  emit({ did });
}

await script('unify-round next', main);

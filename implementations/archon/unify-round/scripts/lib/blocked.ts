/**
 * The Blocked request (decisions 15, 22, 37): only at 3 failed rounds or a block verdict.
 * Four options, each with the exact effect the `next` script takes, and the trend of the
 * rounds in front of the Operator: did the findings shrink, or was each round new?
 */

import type { ItemKey } from '../../../.shared/item.ts';
import { buildRequest, card, trend, type Card, type ItemDoc } from './item.ts';

export const ROUND_CAP = 3;

export function blockedCard(key: ItemKey, why: string, doc: ItemDoc, extraFacts: readonly string[] = []): Card {
  const shape = trend(doc.history);
  const converging = /shrank/.test(shape);
  const request = buildRequest(
    {
      decide: `${key} is Blocked: ${why}. One more round, back to the plan, for a human, or cancel?`,
      why: 'the limit of 3 fix rounds is hard, and a block verdict always comes to you (decisions 15, 22).',
      notVerified: ['whether another round would converge: the trend below is a count, not a judgement'],
      facts: [
        `rounds used: ${doc.rounds} of ${ROUND_CAP}`,
        shape,
        ...(doc.pr !== null ? [`PR #${doc.pr} on ${doc.branch ?? 'no branch'}`] : []),
        ...(doc.fix !== null ? doc.fix.findings.slice(0, 5).map(f => `open: ${f.source}: ${f.text.slice(0, 200)}`) : []),
        ...extraFacts,
      ],
    },
    [
      { id: 'one-more', label: 'One more round', does: 'Allows exactly one more fix round; its failure comes back here.', effect: 'one-more' },
      { id: 'back-to-plan', label: 'Back to the plan', does: 'Moves the item to Planning and starts a new plan from the findings.', effect: 'back-to-plan' },
      { id: 'for-human', label: 'For a human', does: 'Moves the item to ForHuman; the pipeline only tracks it from here.', effect: 'for-human' },
      { id: 'cancel', label: 'Cancel', does: 'Moves the item to Cancelled and closes the item with the reason.', effect: 'cancel' },
    ],
    converging
      ? { option: 'one-more', why: 'the findings shrank round by round, so one more round is likely to finish.', confidence: 'low' }
      : { option: 'back-to-plan', why: 'the rounds did not converge; a narrower plan costs less than more rounds.', confidence: 'medium' }
  );
  return card(request);
}

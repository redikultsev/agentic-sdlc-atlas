/**
 * The one place merge starts the next step: merged fires deploy; "changes", a conflict,
 * red CI, a moved head or stale verdicts fire a round (no round is spent for "changes");
 * back to the plan moves the item to Planning and fires plan; a head moved with the same
 * diff, or a stuck landing the Operator retries, fires merge again for a new card.
 */

import { emit, input, runId } from 'archon:script';
import { fireNext } from '../../.shared/fire.ts';
import { recordRuling } from '../../.shared/rulings.ts';
import { answerOf, bound, moveAlong, run, updateItem } from './lib/item.ts';
import { itemRef } from './lib/facts.ts';

run(() => {
  const ref = itemRef(input('repo_host'), input('repo_path'), input('number'));
  const ruled = bound<{ decision: string }>(input('ruling'));
  const landed = bound<{ outcome: string }>(input('land'));
  const answer = answerOf(input('answer'));
  const id = (what: string): string => `${runId()}:${what}`;
  const fire = (binding: 'pipeline-round' | 'pipeline-plan' | 'pipeline-deploy' | 'pipeline-merge'): string => {
    const path = binding === 'pipeline-round' ? input('pipeline_round_binding')
      : binding === 'pipeline-plan' ? input('pipeline_plan_binding')
      : binding === 'pipeline-deploy' ? input('pipeline_deploy_binding')
      : input('pipeline_merge_binding');
    if (path === '') throw new Error(`${binding.replaceAll('-', '_')}_binding is not set`);
    return fireNext(binding, ref.repo, ref.number, id(binding));
  };
  const again = (): string => (input('pipeline_merge_binding') === '' ? fire('pipeline-round') : fire('pipeline-merge'));
  if (ruled === null) throw new Error('ruling left no result');
  let did = 'nothing';
  if (ruled.decision === 'changes' || ruled.decision === 'stale') {
    did = fire('pipeline-round');
  } else if (ruled.decision === 'back-to-plan') {
    moveAlong(ref, ['merge-review'], 'planning');
    updateItem(ref.number, doc => {
      doc.rounds = 0;
      doc.changes = 0;
    });
    did = fire('pipeline-plan');
  } else if (ruled.decision === 'merge' && landed !== null) {
    switch (landed.outcome) {
      case 'merged':
        did = fire('pipeline-deploy');
        break;
      case 'conflict':
      case 'red':
      case 'moved':
      case 'stale':
        did = fire('pipeline-round');
        break;
      case 'new-card':
        did = again();
        break;
      case 'stuck':
        if (answer !== null) {
          recordRuling(ref, { gate: 'merge-land', decision: answer.decision, text: answer.text, project: false });
          if (answer.effect === 'retry') {
            updateItem(ref.number, doc => {
              doc.landAttempts = 0;
            });
            did = again();
          } else if (answer.effect === 'round') did = fire('pipeline-round');
        }
        break;
      default:
        break;
    }
  }
  emit({ did });
});

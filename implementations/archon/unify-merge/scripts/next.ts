/**
 * The one place merge starts the next step. Merged into Releasing starts the release run
 * (engine key `release`) only when the project releases on merge or the item is urgent
 * (decision 53); otherwise the scheduled or the Operator's release takes it. A merged
 * revert starts unify-deploy as before, under the same key. "Changes" (at the Merge gate or
 * an environment's gate), a conflict, red CI, a red smoke check, a moved head or stale
 * verdicts fire a round (no round is spent for "changes"); back to the plan moves the item
 * to Planning and fires plan; a head moved with the same diff, a stuck landing the Operator
 * retries, an environment to try again or to take, the next environment, or back to the
 * environment after the merge fire merge again. Every item an environment's hold was
 * handed to is started through the merge binding with the handover's delivery id.
 */

import { emit, input, runId } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { readDeploys } from '../../.shared/environments.ts';
import { handoverDelivery } from '../../.shared/holds.ts';
import { asKey } from '../../.shared/item.ts';
import { runInputs } from '../../.shared/repo.ts';
import { fireNext } from '../../.shared/fire.ts';
import { recordRuling } from '../../.shared/rulings.ts';
import { moveState } from '../../.shared/states.ts';
import { answerOf, bound, moveAlong, readItem, updateItem } from './lib/item.ts';
import { baseName } from './lib/facts.ts';
import { type EnvPass, RECHECK, takeFlag } from './lib/envs.ts';

type Binding = 'unify-round' | 'unify-plan' | 'unify-deploy' | 'unify-merge';

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  if (key === undefined) return;
  const base = baseName(input('base'));
  const ruled = bound<{ decision: string; revert: boolean }>(input('ruling'));
  const passed = bound<EnvPass>(input('env'));
  const envAnswer = answerOf(input('env_answer'));
  const tested = bound<{ go: string; start: string[] }>(input('tested'));
  const landed = bound<{ outcome: string; start?: string[] }>(input('land'));
  const answer = answerOf(input('answer'));
  const treeAnswer = answerOf(input('tree_answer'));
  const id = (what: string): string => `${runId()}:${what}`;
  const bindingSet = (binding: Binding): void => {
    if (input(`${binding.replaceAll('-', '_')}_binding`) === '') throw new Error(`${binding.replaceAll('-', '_')}_binding is not set`);
  };
  const fire = (binding: Binding, extra: Record<string, string> = {}, runItem?: string): string => {
    bindingSet(binding);
    return fireNext(binding, repo, key, id(binding), extra, runItem);
  };
  const again = (): string => (input('unify_merge_binding') === '' ? fire('unify-round') : fire('unify-merge'));
  // Decision 53: on merge, or at once for an urgent item; a scheduled or Operator's release takes the rest.
  const releaseRun = (): string => {
    const trigger = readDeploys(base).release.trigger;
    if (trigger !== 'merge' && !readItem(key).urgent) return `release trigger is ${trigger}: the ${trigger === 'schedule' ? 'scheduled' : "Operator's"} release takes it`;
    return fire('unify-deploy', { reason: 'merge' }, 'release');
  };
  if (ruled === null) throw new Error('ruling left no result');

  // The items an environment's hold went to start first: they hold it already (decision 51).
  const starts = [...new Set([...(passed?.start ?? []), ...(tested?.start ?? []), ...(landed?.start ?? [])])];
  if (starts.length > 0) bindingSet('unify-merge');
  // The same delivery id unify-revisit fires with for this handover, so the engine starts one run.
  const started = starts.map(next => fireNext('unify-merge', repo, asKey(next), handoverDelivery(repo, asKey(next)) ?? id(`holder:${next}`)));

  let did = 'nothing';
  if (ruled.decision === 'changes' || ruled.decision === 'stale') {
    did = fire('unify-round');
  } else if (ruled.decision === 'back-to-plan') {
    await moveAlong(key, ['merge-review'], 'planning');
    updateItem(key, doc => {
      doc.rounds = 0;
      doc.changes = 0;
    });
    did = fire('unify-plan');
  } else if (ruled.decision === 'merge' && passed !== null && passed.go !== 'land' && passed.go !== 'gate') {
    if (passed.go === 'queued') did = `queued on ${passed.env}/${passed.service}`;
    else if (passed.go === 'round') did = fire('unify-round');
    else if (passed.go === 'ask' && envAnswer !== null) {
      await recordRuling(key, { gate: `env-ask:${passed.env}/${passed.service}`, decision: envAnswer.decision, text: envAnswer.text, project: false });
      if (envAnswer.effect === 'take') {
        updateItem(key, doc => {
          doc.flags = [...doc.flags.filter(f => f !== takeFlag(passed.env, passed.service)), takeFlag(passed.env, passed.service)];
        });
        did = fire('unify-merge');
      } else if (envAnswer.effect === 'retry') did = fire('unify-merge');
    }
  } else if (ruled.decision === 'merge' && tested !== null && tested.go !== 'land') {
    if (tested.go === 'round') did = fire('unify-round');
    else if (tested.go === 'again') did = fire('unify-merge');
  } else if (ruled.decision === 'merge' && landed !== null) {
    switch (landed.outcome) {
      case 'merged':
        // A merged revert goes to unify-deploy's revert mode as before.
        did = ruled.revert ? fire('unify-deploy', {}, 'release') : releaseRun();
        break;
      case 'tree':
        if (treeAnswer !== null) {
          await recordRuling(key, { gate: 'merge-tree', decision: treeAnswer.decision, text: treeAnswer.text, project: false });
          if (treeAnswer.effect === 'accept') {
            await moveState(key, ['verifying'], 'releasing');
            did = releaseRun();
          } else if (treeAnswer.effect === 'back-to-env') {
            updateItem(key, doc => {
              doc.flags = [...doc.flags.filter(f => f !== RECHECK), RECHECK];
              doc.approvals = [];
            });
            did = fire('unify-merge');
          }
        }
        break;
      case 'conflict':
      case 'red':
      case 'moved':
      case 'stale':
        did = fire('unify-round');
        break;
      case 'new-card':
        did = again();
        break;
      case 'stuck':
        if (answer !== null) {
          await recordRuling(key, { gate: 'merge-land', decision: answer.decision, text: answer.text, project: false });
          if (answer.effect === 'retry') {
            updateItem(key, doc => {
              doc.landAttempts = 0;
            });
            did = again();
          } else if (answer.effect === 'round') did = fire('unify-round');
        }
        break;
      default:
        break;
    }
  }
  emit({ did: started.length > 0 ? `${did}; started ${started.join(', ')}` : did });
}

await script('unify-merge next', main);

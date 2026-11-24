/**
 * Where the merge goes after the environment pass, and the answer to an environment's
 * person gate (decision 50). `approve` records the approval bound to the candidate's tree
 * and moves TestReview back to Verifying (on a recheck after the merge, straight to
 * Releasing); then land, or a new merge run for the next environment. `changes` is a ruling
 * and the next round's fix, counted neither in rounds nor in `changes`: the item goes to
 * Implementing and leaves every hold it has, so the next items start; on this environment
 * it is marked `returning` and comes back first. `hold` ends the run in TestReview.
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { readHold, release, releaseAll } from '../../.shared/holds.ts';
import { runInputs } from '../../.shared/repo.ts';
import { recordRuling } from '../../.shared/rulings.ts';
import { moveState } from '../../.shared/states.ts';
import { answerOf, bound, findingKey, readItem, updateItem } from './lib/item.ts';
import { type EnvPass, RECHECK, type Ruled } from './lib/envs.ts';

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const ruled = bound<Ruled>(input('ruling'));
  const passed = bound<EnvPass>(input('env'));
  const answer = answerOf(input('answer'));
  const out = (go: 'land' | 'round' | 'again' | 'hold' | 'stop', start: string[] = []): void => emit({ go, start });
  if (ruled === null) throw new Error('ruling left no result');
  if (ruled.decision !== 'merge') return out('stop');
  // R0 and reverts skip the environments (decision 50).
  if (passed === null || passed.go === 'land') return out('land');
  if (passed.go !== 'gate') return out('stop');
  if (answer === null) throw new Error('the environment gate was asked, and the run continued with no answer');
  await recordRuling(key, { gate: `test-gate:${passed.env}/${passed.service}`, decision: answer.decision, text: answer.text, project: false });
  if (answer.effect === 'approve') {
    const recheck = readItem(key).flags.includes(RECHECK);
    updateItem(key, d => {
      d.approvals = [
        ...d.approvals.filter(a => !(a.env === passed.env && a.service === passed.service)),
        { env: passed.env, service: passed.service, commit: passed.commit, tree: passed.tree, by: 'test-gate', at: new Date().toISOString() },
      ];
    });
    if (passed.remaining > 0) {
      await moveState(key, ['test-review'], 'verifying');
      return out('again');
    }
    await moveState(key, ['test-review'], recheck ? 'releasing' : 'verifying');
    return out('land');
  }
  if (answer.effect === 'changes') {
    const text = answer.text.trim() === '' ? `The answerer on ${passed.env} asked for changes without a comment; re-read the spec.` : answer.text;
    updateItem(key, d => {
      d.fix = { from: `${passed.env} gate "changes"`, findings: [{ key: findingKey('operator', text), source: 'operator', text, repeated: false }] };
    });
    await moveState(key, ['test-review'], 'implementing');
    // Only a shared environment is held; an ephemeral one has nothing to pass on. This pair
    // marks the item `returning`; every other hold it has is left for the fix round.
    const here = readHold(passed.env, passed.service).holder === key ? release(passed.env, passed.service, key, true) : null;
    const start = [...new Set([...(here === null ? [] : [here]), ...releaseAll(key)])];
    return out('round', start);
  }
  out('hold');
}

await script('unify-merge test-ruling', main);

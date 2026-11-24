/**
 * Before anything deploys: does the engine's state of the item (shown by its label) and
 * its `work/<key>` document agree that a merge of this item is what this run deploys?
 *
 * - `watch`: the item is Releasing (merged, waiting for its release) or already Live (a
 *   restarted deploy run), and `work/<key>` names its PR.
 * - `revert`: `work/<key>` flags a revert this pipeline opened (`no-watch:<m>`) and that PR
 *   is merged: this run deploys the revert and watches nothing (decision 26).
 * - `stop`: anything else. Nothing deploys; `flag` raises it to the Operator.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST, INPUTS_REPO_PATH and INPUTS_NUMBER.
 */

import { emit } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { forge } from '../../.shared/forge.ts';
import { keySlug } from '../../.shared/item.ts';
import { runInputs } from '../../.shared/repo.ts';
import { readState, StateMismatch } from '../../.shared/states.ts';
import { readWork } from '../../.shared/work.ts';

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  if (key === undefined) return;
  let current: string;
  try {
    current = await readState(key);
  } catch (error) {
    if (!(error instanceof StateMismatch)) throw error;
    emit({ mode: 'stop', state: 'conflict', pr: null, reason: error.message });
    return;
  }
  const work = readWork(key).doc;
  const noWatch = work.flags.filter(flag => flag.startsWith('no-watch:')).map(flag => Number(flag.slice('no-watch:'.length)));
  for (const revert of noWatch.reverse()) {
    const view = forge('pr.view', { selector: { kind: 'number', ref: { repo, number: revert } } });
    if (view !== null && view.pr.state === 'merged') {
      emit({ mode: 'revert', state: current, pr: revert, reason: `PR #${String(revert)} is the revert this pipeline opened; its deploy is not watched` });
      return;
    }
  }
  if (!['releasing', 'live'].includes(current)) {
    emit({ mode: 'stop', state: current, pr: work.pr, reason: `${key} is ${current}; a deploy starts only from Releasing or Live` });
    return;
  }
  if (work.pr === null) {
    emit({ mode: 'stop', state: current, pr: null, reason: `work/${keySlug(key)} names no PR, so there is nothing this run can watch` });
    return;
  }
  const view = forge('pr.view', { selector: { kind: 'number', ref: { repo, number: work.pr } } });
  if (view === null || view.pr.state !== 'merged') {
    emit({ mode: 'stop', state: current, pr: work.pr, reason: `PR #${String(work.pr)} is ${view === null ? 'not found' : view.pr.state}, not merged` });
    return;
  }
  emit({ mode: 'watch', state: current, pr: work.pr, reason: `PR #${String(work.pr)} merged; ${key} is ${current}` });
}

await script('unify-deploy reconcile', main);

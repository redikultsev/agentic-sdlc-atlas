/**
 * Act on the Watcher's verdict for one pass of the watch window.
 *
 * - regression-in-this-pr: revert this PR, record the rollback and fire unify-merge for
 *   the revert (lib.ts `revertAndMerge`); the loop ends. Unless more than 2 rollbacks in
 *   the last 30 days turned out unneeded (decision 26): then it asks first.
 * - unsure: the loop ends and `outcome` asks the Operator.
 * - clean: keep watching until the window ends, then Done.
 * - unclear: keep watching; still unclear when the window ends is a question.
 *
 * The coverage is the script's (`signals`), never the agent's. The result goes into this
 * run's deploy record, where `outcome` reads it.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST, INPUTS_REPO_PATH, INPUTS_NUMBER and
 * INPUTS_PIPELINE_MERGE_BINDING; INPUTS_PR from reconcile; INPUTS_WATCHER, the agent's
 * verdict; INPUTS_ENDED and INPUTS_COVERAGE from signals.
 */

import { emit, input, runId } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { revertAndMerge, unneededRollbacks, updateDeploy, type Coverage, type WatchResult } from './lib.ts';

interface Verdict {
  verdict: 'clean' | 'regression-in-this-pr' | 'unclear' | 'unsure';
  coverage: Coverage;
  reason: string;
  evidence: { signal: string; before: number | null; after: number | null; note: string }[];
}

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  if (key === undefined) return;
  const pr = Number(input('pr'));
  const watcher = JSON.parse(input('watcher')) as Verdict;
  const ended = input('ended').trim() === 'true';
  const coverage: Coverage = input('coverage').trim() === 'full' ? 'full' : 'health-only';
  if (input('unify_merge_binding').trim() === '' && watcher.verdict === 'regression-in-this-pr') {
    throw new Error('unify_merge_binding is empty: a revert cannot be sent to merge');
  }
  const evidence = watcher.evidence.map(e => `${e.signal}: before ${String(e.before)}, after ${String(e.after)}${e.note ? ` (${e.note})` : ''}`);

  let result: WatchResult;
  let reason = watcher.reason;
  let revertPr: number | null = null;
  let fire: string | null = null;
  switch (watcher.verdict) {
    case 'regression-in-this-pr': {
      const unneeded = unneededRollbacks(Date.now());
      if (unneeded > 2) {
        result = 'unsure';
        reason = `${watcher.reason} Not rolled back by itself: ${String(unneeded)} rollbacks in the last 30 days were unneeded, so it asks first (decision 26).`;
        break;
      }
      if (!Number.isInteger(pr) || pr <= 0) throw new Error('a regression was found but the run names no PR to revert');
      const revert = revertAndMerge(repo, key, pr, [watcher.reason, ...evidence.map(e => `- ${e}`)].join('\n'));
      result = 'rolled-back';
      revertPr = revert.revertPr;
      fire = revert.fire;
      break;
    }
    case 'unsure':
      result = 'unsure';
      break;
    case 'unclear':
      result = ended ? 'unsure' : 'continue';
      if (ended) reason = `The window ended and the numbers were still unclear: ${watcher.reason}`;
      break;
    default:
      result = ended ? 'done' : 'continue';
  }

  const at = new Date().toISOString();
  const run = runId();
  updateDeploy(key, run, record => {
    if (record === null) throw new Error(`no deploy record for ${key} in this run`);
    return { ...record, watch: { result, coverage, verdict: watcher.verdict, reason, evidence, revertPr, fire, at } };
  });
  emit({ result, stop: result !== 'continue', coverage, revert_pr: revertPr, fire: fire ?? '', reason });
}

await script('unify-deploy act', main);

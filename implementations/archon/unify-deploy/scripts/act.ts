/**
 * Act on the Watcher's verdict for one pass of the watch window.
 *
 * - regression: the rollback of decision 52 (`rollbackPlan`), at once and by code, with
 *   the culprit the Watcher named (an item of the release, or none):
 *   - the culprit ships behind a toggle the project can set: turn it off and keep
 *     watching; if the regression stays, plan again without toggles (decision 61);
 *   - `revert` (shape A): revert the culprit's PR and send it to merge;
 *   - `previous`: redeploy the previous verified release to the environment and open the
 *     culprit's revert;
 *   - forward only, nothing to go back to, or a step that failed: the Operator decides.
 *   The loop ends; `outcome` moves the items. More than 2 rollbacks in the last 30 days
 *   that turned out unneeded: it asks first (decision 26).
 * - unsure: the loop ends and `outcome` asks the Operator.
 * - clean: keep watching until the window ends, then Done.
 * - unclear: keep watching; still unclear when the window ends is a question.
 *
 * The coverage is the script's (`signals`), never the agent's. The result goes into this
 * run's deploy record of the watched environment, where `outcome` reads it.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST, INPUTS_REPO_PATH and
 * INPUTS_UNIFY_MERGE_BINDING; the pack setting INPUTS_BASE; INPUTS_RELEASE from cut;
 * INPUTS_ENV from promote; INPUTS_WATCHER, the agent's verdict; INPUTS_ENDED and
 * INPUTS_COVERAGE from signals.
 */

import { emit, input, runId } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { readDeploys } from '../../.shared/environments.ts';
import type { ItemKey } from '../../.shared/item.ts';
import { runInputs } from '../../.shared/repo.ts';
import type { RollbackPlan } from '../../.shared/releases.ts';
import { type Coverage, type Method, mustRelease, planRollback, readDeploy, releaseSubject, runRollback, unneededRollbacks, updateDeploy, type WatchRecord, type WatchResult, watchedEnv } from './lib.ts';

interface Verdict {
  verdict: 'clean' | 'regression' | 'unclear' | 'unsure';
  coverage: Coverage;
  reason: string;
  culprit: string | null;
  evidence: { signal: string; before: number | null; after: number | null; note: string }[];
}

async function main(): Promise<void> {
  const { repo } = runInputs();
  const base = input('base').trim() || 'main';
  const id = input('release').trim();
  const deploys = readDeploys(base);
  const env = watchedEnv(deploys, input('env').trim());
  const release = mustRelease(id);
  const watcher = JSON.parse(input('watcher')) as Verdict;
  const ended = input('ended').trim() === 'true';
  const coverage: Coverage = input('coverage').trim() === 'full' ? 'full' : 'health-only';
  const run = runId();
  const subject = releaseSubject(id, env.name);
  const culprit: ItemKey | null = watcher.culprit !== null && release.items.includes(watcher.culprit) ? watcher.culprit : null;
  const evidence = watcher.evidence.map(e => `${e.signal}: before ${String(e.before)}, after ${String(e.after)}${e.note ? ` (${e.note})` : ''}`);

  const deployed = readDeploy(subject, run).record;
  if (deployed === null) throw new Error(`no deploy record of release ${id} on ${env.name} in this run`);
  const toggled = [...(deployed.watch?.toggled ?? [])];
  let result: WatchResult;
  let reason = watcher.reason;
  let plan: RollbackPlan | null = null;
  let method: Method | null = null;
  let reverts: Record<ItemKey, number> = {};
  let fire: string | null = null;

  switch (watcher.verdict) {
    case 'regression': {
      const unneeded = unneededRollbacks(Date.now());
      if (unneeded > 2) {
        result = 'unsure';
        reason = `${watcher.reason} Not rolled back by itself: ${String(unneeded)} rollbacks in the last 30 days were unneeded, so it asks first (decision 26).`;
        break;
      }
      if (input('unify_merge_binding').trim() === '') throw new Error('unify_merge_binding is empty: a revert cannot be sent to merge');
      const ctx = { repo, deploys, release, env, run };
      plan = planRollback(ctx, culprit, toggled.length > 0);
      const done = runRollback(ctx, plan, culprit, [watcher.reason, ...evidence.map(e => `- ${e}`)].join('\n'));
      if (done.failed !== null) {
        result = 'unsure';
        reason = `${watcher.reason} The rollback could not run by itself: ${done.failed}.`;
        plan = null;
        break;
      }
      if (done.method === 'toggle') {
        toggled.push(...done.toggled);
        result = 'continue';
        reason = `${watcher.reason} Turned the toggle ${done.toggled.map(t => t.toggle).join(', ')} off; watching on.`;
        plan = null;
        break;
      }
      method = done.method;
      reverts = done.reverts;
      fire = done.fire;
      result = 'rolled-back';
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

  const watch: WatchRecord = {
    result,
    coverage,
    verdict: watcher.verdict,
    reason,
    evidence,
    culprit,
    plan,
    method,
    reverts,
    toggled,
    revertPr: culprit !== null ? (reverts[culprit] ?? null) : (Object.values(reverts)[0] ?? null),
    fire,
    at: new Date().toISOString(),
  };
  updateDeploy(subject, run, record => ({ ...(record ?? deployed), watch }));
  emit({ result, stop: result !== 'continue', coverage, culprit, revert_pr: watch.revertPr, fire: fire ?? '', reason });
}

await script('unify-deploy act', main);

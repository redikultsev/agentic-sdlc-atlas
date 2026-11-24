/**
 * Deploy a merged revert this pipeline opened (shape A, decision 26): the merged base
 * through production's recipe (`deploy.hook`), with PIPELINE_REASON=rollback, and nothing
 * watched. No hook: the merge is the deploy, and the record says "no deploy hook". The
 * deploy is recorded in the state store before the hook runs and again when it ends, so
 * the Watcher of every other deploy can leave these minutes out of its numbers. A retry
 * after a finished deploy does not deploy twice.
 *
 * Once the revert is deployed, the items the rollback sent back to Releasing are not left
 * for the hourly run: one release run is started (engine key `release`, reason schedule)
 * for the first of them, with a delivery id from the revert PR, so a retry starts one.
 *
 * A failed hook writes the record, tells the Operator on the item (comment and the label
 * `pipeline:needs-attention`) and fails the node.
 *
 * The hook runs with PIPELINE_ENV, PIPELINE_ITEMS, PIPELINE_RELEASE (empty),
 * PIPELINE_REASON=rollback, PIPELINE_ITEM, PIPELINE_PR and PIPELINE_REVERT=true.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST, INPUTS_REPO_PATH, INPUTS_NUMBER and
 * INPUTS_UNIFY_DEPLOY_BINDING; the pack setting INPUTS_BASE; INPUTS_PR from cut (the
 * revert PR).
 */

import { emit, input, runId } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { readDeploys, runRecipe } from '../../.shared/environments.ts';
import { fireNext } from '../../.shared/fire.ts';
import { type ItemKey, keySlug } from '../../.shared/item.ts';
import { RELEASE_RUN } from '../../.shared/releases.ts';
import { type Repo, runInputs } from '../../.shared/repo.ts';
import { allWork, itemSubject, readDeploy, tellFailure, updateDeploy } from './lib.ts';

/** Start the release of what waits in Releasing (never the revert's own item, whose run would deploy the revert again). */
function releaseWaiting(repo: Repo, key: ItemKey, pr: number | null): string {
  const waiting = allWork()
    .filter(w => w.doc.state === 'releasing' && w.key !== key)
    .map(w => w.key)
    .sort();
  const first = waiting[0];
  if (first === undefined) return 'nothing waits in Releasing';
  return fireNext('unify-deploy', repo, first, `unify-deploy:${repo.host}/${repo.path}:after-revert:${String(pr ?? keySlug(key))}`, { reason: 'schedule' }, RELEASE_RUN);
}

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  if (key === undefined) return;
  const base = input('base').trim() || 'main';
  const pr = Number(input('pr')) || null;
  const run = runId();
  const production = readDeploys(base).environments.find(e => e.kind === 'production');
  if (production === undefined) throw new Error('project.yaml declares no production environment');
  const hook = production.deploy;
  const windowMinutes = production.watch?.minutes ?? 0;
  const subject = itemSubject(key);

  const done = readDeploy(subject, run).record;
  if (done !== null && done.endedAt !== null && done.ok) {
    const fired = releaseWaiting(repo, key, pr);
    emit({ deployed: done.hook !== null, ok: true, at: done.endedAt, hook: done.hook, note: `already deployed by this run; release: ${fired}`, window_minutes: windowMinutes });
    return;
  }

  const startedAt = new Date().toISOString();
  const fresh = { item: key, items: [key], release: null, env: production.name, reason: 'rollback' as const, pr, runId: run, startedAt, endedAt: null, hook, ok: false, revert: true, watch: null };
  updateDeploy(subject, run, () => fresh);

  if (hook === null) {
    const at = new Date().toISOString();
    updateDeploy(subject, run, record => ({ ...(record ?? fresh), endedAt: at, ok: true }));
    const fired = releaseWaiting(repo, key, pr);
    emit({ deployed: false, ok: true, at, hook: null, note: `no deploy hook: the merge is treated as deployed; release: ${fired}`, window_minutes: windowMinutes });
    return;
  }
  const result = runRecipe(hook, {
    PIPELINE_ENV: production.name,
    PIPELINE_ITEMS: keySlug(key),
    PIPELINE_RELEASE: '',
    PIPELINE_REASON: 'rollback',
    PIPELINE_ITEM: keySlug(key),
    PIPELINE_PR: pr === null ? '' : String(pr),
    PIPELINE_REVERT: 'true',
  });
  const at = new Date().toISOString();
  updateDeploy(subject, run, record => ({ ...(record ?? fresh), endedAt: at, ok: result.ok }));
  if (!result.ok) {
    await tellFailure(
      [key],
      `unify-deploy-failed:${run}`,
      'Deploy failed',
      `the deploy hook exited ${String(result.exit)} on the revert PR #${String(pr)}; the revert is on ${base} but not deployed, and nothing retries it by itself.`,
      result.tail
    );
    throw new Error(`the hook exited ${String(result.exit)}; reported on ${key}`);
  }
  const fired = releaseWaiting(repo, key, pr);
  emit({ deployed: true, ok: true, at, hook, note: `deployed by the hook; release: ${fired}`, window_minutes: windowMinutes });
}

await script('unify-deploy deploy', main);

/**
 * Deploy the merged base through the project's hook (`deploy.hook` in
 * `.pipeline/project.yaml`, read from the base). No hook: the merge is the deploy, and
 * the record says "no deploy hook". The deploy is recorded in the state store before the
 * hook runs and again when it ends, so the Watcher of every other deploy can leave these
 * minutes out of its numbers. A retry after a finished deploy does not deploy twice.
 *
 * A failed hook writes the record, tells the Operator on the item (comment and the label
 * `pipeline:needs-attention`) and fails the node: nothing is Live that did not deploy.
 *
 * The hook runs with PIPELINE_ITEM, PIPELINE_PR and PIPELINE_REVERT in its environment.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST, INPUTS_REPO_PATH, INPUTS_NUMBER; the
 * pack setting INPUTS_BASE; INPUTS_MODE and INPUTS_PR from reconcile.
 */

import { emit, input, runId } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { keySlug } from '../../.shared/item.ts';
import { projectPolicy } from '../../.shared/policy.ts';
import { runInputs } from '../../.shared/repo.ts';
import { readDeploy, updateDeploy } from './lib.ts';

const HOOK_TIMEOUT_MS = 60 * 60_000;
const NEEDS_ATTENTION = 'pipeline:needs-attention';

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const base = input('base').trim() || 'main';
  const revert = input('mode').trim() === 'revert';
  const pr = Number(input('pr')) || null;
  const run = runId();
  const policy = projectPolicy(base);
  const hook = policy.deploy.hook?.trim() || null;

  const done = readDeploy(key, run).record;
  if (done !== null && done.endedAt !== null && done.ok) {
    emit({ deployed: done.hook !== null, ok: true, at: done.endedAt, hook: done.hook, note: 'already deployed by this run', window_minutes: policy.deploy.windowMinutes });
    return;
  }

  const startedAt = new Date().toISOString();
  updateDeploy(key, run, () => ({ item: key, pr, runId: run, startedAt, endedAt: null, hook, ok: false, revert, watch: null }));

  if (hook === null) {
    const at = new Date().toISOString();
    updateDeploy(key, run, record => ({ ...(record ?? { item: key, pr, runId: run, startedAt, hook, revert, watch: null }), endedAt: at, ok: true }));
    emit({ deployed: false, ok: true, at, hook: null, note: 'no deploy hook: the merge is treated as deployed', window_minutes: policy.deploy.windowMinutes });
    return;
  }

  const result = Bun.spawnSync(['sh', '-c', hook], {
    env: { ...process.env, PIPELINE_ITEM: keySlug(key), PIPELINE_PR: pr === null ? '' : String(pr), PIPELINE_REVERT: revert ? 'true' : 'false' },
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: HOOK_TIMEOUT_MS,
  });
  const at = new Date().toISOString();
  const ok = result.exitCode === 0;
  updateDeploy(key, run, record => ({ ...(record ?? { item: key, pr, runId: run, startedAt, hook, revert, watch: null }), endedAt: at, ok }));
  if (!ok) {
    const tail = `${result.stdout.toString()}\n${result.stderr.toString()}`.trim().split('\n').slice(-20).join('\n');
    await tracker().comment(
      key,
      `unify-deploy-failed:${run}`,
      [
        '**Deploy failed**',
        '',
        `Why you: the deploy hook exited ${String(result.exitCode)}${result.signalCode ? ` (${result.signalCode})` : ''}; the merged change is on ${base} but not deployed, and nothing retries it by itself.`,
        '',
        '```',
        tail.replaceAll('```', "'''"),
        '```',
      ].join('\n')
    );
    await tracker().label(key, { add: [NEEDS_ATTENTION] });
    throw new Error(`the hook exited ${String(result.exitCode)}; reported on ${key}`);
  }
  emit({ deployed: true, ok: true, at, hook, note: 'deployed by the hook', window_minutes: policy.deploy.windowMinutes });
}

await script('unify-deploy deploy', main);

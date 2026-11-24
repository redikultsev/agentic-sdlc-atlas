/**
 * Take the release through the environments after merge, in the declared order (decision
 * 48), from where it stopped: an environment already deployed is passed over, so a retry
 * or the run after a gate never deploys twice.
 *
 * Per environment and service: `deployAndCheck` (the recipe, the version read from the
 * target, the smoke check) with PIPELINE_ITEMS, PIPELINE_RELEASE and PIPELINE_REASON=normal
 * (shape A also PIPELINE_ITEM, PIPELINE_PR and PIPELINE_REVERT for its single item). The
 * release record says deploying, deployed (a window follows) or verified per environment,
 * and every deploy is recorded with its reason for the Watcher's overlap rule.
 *
 * - A non-production environment with a person's gate: the run stops after it with one
 *   request (promote / hold); the answer starts the next run, which goes on from here.
 * - A failed deploy: the release fails on that environment, the Operator gets the tail on
 *   every item, the items stay Releasing, and the node fails.
 * - Every environment deployed: the items go Live (one already Live is left; one cancelled
 *   or changed by hand meanwhile is passed over and noted). The first production
 *   environment that declares a window is watched (`production`); none declares one:
 *   Done (`done`).
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST, INPUTS_REPO_PATH; the pack setting
 * INPUTS_BASE; INPUTS_RELEASE from cut.
 */

import { emit, input, runId } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { deployAndCheck, readDeploys } from '../../.shared/environments.ts';
import { setEnvStatus } from '../../.shared/releases.ts';
import { buildRequest } from '../../.shared/request.ts';
import { runInputs } from '../../.shared/repo.ts';
import type { ItemKey } from '../../.shared/item.ts';
import { moveState, StateMismatch } from '../../.shared/states.ts';
import { readWork } from '../../.shared/work.ts';
import { finishDone, mustRelease, readGates, releasePlan, releaseSubject, releaseVars, setGate, tellFailure, updateDeploy } from './lib.ts';

const NOTHING = { question: '', options: [], recommendation: null };

async function main(): Promise<void> {
  const { repo } = runInputs();
  const base = input('base').trim() || 'main';
  const id = input('release').trim();
  const run = runId();
  const deploys = readDeploys(base);
  const release = mustRelease(id);
  const plan = releasePlan(repo, deploys, release.items);
  const vars = releaseVars(deploys, release, 'normal');
  const gates = readGates(id);
  const notes: string[] = [];
  let watched: { env: string; at: string; minutes: number } | null = null;

  for (const [index, { env, services }] of plan.entries()) {
    const status = mustRelease(id).envs[env.name]?.status;
    if (status === 'deployed' || status === 'verified') {
      if (env.kind === 'production' && env.watch !== null && watched === null) watched = { env: env.name, at: mustRelease(id).envs[env.name].at, minutes: env.watch.minutes };
    } else {
      const subject = releaseSubject(id, env.name);
      const startedAt = new Date().toISOString();
      setEnvStatus(id, env.name, 'deploying');
      updateDeploy(subject, run, () => ({ item: release.items[0] ?? '', items: [...release.items], release: id, env: env.name, reason: 'normal', pr: vars.PIPELINE_PR ? Number(vars.PIPELINE_PR) : null, runId: run, startedAt, endedAt: null, hook: env.deploy, ok: false, revert: false, watch: null }));
      for (const service of services) {
        const result = deployAndCheck(env, service, release.commit, vars);
        notes.push(...result.notes);
        if (!result.ok) {
          const at = new Date().toISOString();
          updateDeploy(subject, run, record => ({ ...(record ?? { item: release.items[0] ?? '', pr: null, runId: run, startedAt, hook: env.deploy, revert: false, watch: null }), endedAt: at, ok: false }));
          setEnvStatus(id, env.name, 'failed', `${service.name}: ${result.step} failed`);
          await tellFailure(
            release.items,
            `unify-deploy-failed:${run}:${env.name}`,
            'Deploy failed',
            `the ${result.step} step of ${env.name}/${service.name} failed for release ${id}; the merged change is on ${base} but not deployed there, the items stay in Releasing, and nothing retries it by itself.`,
            result.tail
          );
          throw new Error(`release ${id}: ${env.name}/${service.name} failed at ${result.step}; reported on ${release.items.join(', ')}`);
        }
      }
      const at = new Date().toISOString();
      updateDeploy(subject, run, record => ({ ...(record ?? { item: release.items[0] ?? '', pr: null, runId: run, startedAt, hook: env.deploy, revert: false, watch: null }), endedAt: at, ok: true }));
      const windowed = env.kind === 'production' && env.watch !== null && watched === null;
      setEnvStatus(id, env.name, windowed ? 'deployed' : 'verified', notes.join('; '));
      if (windowed && env.watch !== null) watched = { env: env.name, at, minutes: env.watch.minutes };
      if (env.watch !== null && env.kind !== 'production') notes.push(`${env.name} declares a watch window; only production's window is watched`);
    }

    if (env.kind !== 'production' && env.gate !== null && gates[env.name]?.status !== 'passed') {
      setGate(id, env.name, 'open');
      const next = plan[index + 1]?.env.name ?? 'the end of the release';
      const request = buildRequest(
        {
          decide: `Promote release ${id} from ${env.name} to ${next}?`,
          why: `${env.name} declares a person's gate; the answer is for ${env.gate.answerers.join(', ')}.`,
          notVerified: notes.filter(n => n.startsWith(env.name)),
          facts: [...release.items.map(k => `${k}: PR #${String(readWork(k).doc.pr)}`), `commit ${release.commit.slice(0, 12)} is on ${env.name} and passed its checks`],
        },
        [
          { id: 'promote', label: 'Promote', does: `Deploys release ${id} to ${next} and on through the rest of the environments.`, effect: 'promote', extra: { env: env.name } },
          { id: 'hold', label: 'Hold', does: `Stops release ${id} at ${env.name}; its items stay in Releasing and go with the next release once the base moves.`, effect: 'hold', extra: { env: env.name } },
        ],
        { option: 'promote', why: `The release passed the checks on ${env.name}.`, confidence: 'medium' }
      );
      emit({ result: 'gate', env: env.name, deployed_at: '', window_minutes: 0, summary: `release ${id} waits at the gate of ${env.name}`, ...request });
      return;
    }
  }

  // Already Live (a resumed release) is left as it is; an item cancelled or changed by hand meanwhile is
  // passed over and noted, so it cannot hold up the rest of the release.
  const moved: ItemKey[] = [];
  for (const key of release.items) {
    try {
      await moveState(key, ['releasing'], 'live');
      moved.push(key);
    } catch (error) {
      if (!(error instanceof StateMismatch)) throw error;
      notes.push(`${key} left out: ${error.message}`);
    }
  }
  if (watched === null) {
    const done: string[] = [];
    for (const key of moved) done.push(await finishDone(key, null, run, '', id));
    emit({ result: 'done', env: '', deployed_at: '', window_minutes: 0, summary: `release ${id}: ${done.join('; ')}${notes.length > 0 ? ` (${notes.join('; ')})` : ''}`, ...NOTHING });
    return;
  }
  emit({ result: 'production', env: watched.env, deployed_at: watched.at, window_minutes: watched.minutes, summary: `release ${id} is on ${watched.env}${notes.length > 0 ? ` (${notes.join('; ')})` : ''}; ${moved.join(', ')} Live, watched for ${String(watched.minutes)} minutes`, ...NOTHING });
}

await script('unify-deploy promote', main);

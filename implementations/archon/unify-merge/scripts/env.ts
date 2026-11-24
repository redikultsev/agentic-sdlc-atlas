/**
 * The environment pass after the Merge gate (decisions 49–51, 53), for an Operator's merge
 * only (not R0, not a revert). The PR's changed files give the services, the services give
 * the pre-merge (environment, service) pairs in order; each pair without an approval is
 * passed in turn:
 * - a `shared` environment is held per service: an item that is not the holder joins the
 *   queue (urgent at the front), waits in Verifying with `queued:<env>/<service>` and the
 *   run ends; the holder reads what the environment runs first, and anything that is
 *   neither the hold's last build, the candidate ref's tip nor production's verified
 *   version is a request (wait or take); our own build overwritten while the item waits
 *   for a person is deployed again;
 * - the candidate is cut (the base with the item branch merged in; on a recheck after the
 *   merge, the base only) and deployed with the version read from the target and the smoke
 *   check. A conflict or a red smoke check releases every hold of the item and goes to a
 *   fix round; the build is recorded on the hold once the environment runs it; a
 *   failed deploy or version read is a request to the Operator (infrastructure, no round);
 * - green with no gate on the environment is an approval by the smoke check; green with a
 *   gate moves the item to TestReview and asks the environment's answerers.
 * `batch: true` is not built: one build carries one item.
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { cutCandidate, restrictedTree } from '../../.shared/candidate.ts';
import { deployAndCheck, readDeploys, runRecipe, sameVersion, type Environment, type Service } from '../../.shared/environments.ts';
import { forge } from '../../.shared/forge.ts';
import { git } from '../../.shared/git.ts';
import { join, readHold, recordBuild, releaseAll, type Build } from '../../.shared/holds.ts';
import type { ItemKey } from '../../.shared/item.ts';
import { previousVerified } from '../../.shared/releases.ts';
import { runInputs } from '../../.shared/repo.ts';
import { moveState, readState } from '../../.shared/states.ts';
import { bound, buildRequest, card, findingKey, NO_CARD, readItem, updateItem, type Card, type Finding } from './lib/item.ts';
import { baseName, fetchBranch } from './lib/facts.ts';
import { prAt } from './lib/gate.ts';
import { type EnvPass, prePairs, queuedFlag, RECHECK, type Ruled, takeFlag } from './lib/envs.ts';

/** Whether a build recorded for this item is the candidate of the current base and head, so a retry reuses it. */
function reusable(build: Build | null, key: ItemKey, env: string, service: string, baseTip: string, head: string | null): boolean {
  if (build === null || build.items.length !== 1 || build.items[0] !== key) return false;
  if (fetchBranch(`pipeline/candidate/${env}/${service}`) !== build.commit) return false;
  if (head === null) return build.commit === baseTip;
  const parents = git('rev-list', '--parents', '-n', '1', build.commit);
  return parents.code === 0 && parents.stdout.split(/\s+/).slice(1).join(' ') === `${baseTip} ${head}`;
}

function infraCard(key: ItemKey, env: Environment, service: Service, step: string, tail: string, commit: string): Card {
  return card(buildRequest(
    {
      decide: `${key}: the ${step} step on ${env.name}/${service.name} failed. Try the environment again, or hold the item?`,
      why: 'a deploy or a version read that fails is the environment, not the change; no fix round is spent on it.',
      notVerified: ['whether the environment is up'],
      facts: [`candidate ${commit || 'not cut yet'}`, `the step's last lines:\n${tail}`],
    },
    [
      { id: 'retry', label: 'Try again', does: `Starts the merge step again; it deploys to ${env.name}/${service.name} once more.`, effect: 'retry' },
      { id: 'hold', label: 'Hold', does: 'Ends this run; the item stays in Verifying and keeps the environment.', effect: 'hold' },
    ],
    { option: 'retry', why: 'a failed deploy is most often a passing outage of the environment.', confidence: 'low' }
  ));
}

function foreignCard(key: ItemKey, env: Environment, service: Service, runs: string, last: string | null, prod: string | null): Card {
  return card(buildRequest(
    {
      decide: `${key}: ${env.name}/${service.name} runs ${runs || 'nothing readable'}, which the pipeline did not put there. Wait, or take the environment?`,
      why: 'someone may be testing on it; the hold only says whose turn it is (decision 51).',
      notVerified: ['who deployed it and whether they still use it'],
      facts: [`the hold's last build: ${last ?? 'none'}`, `production's last verified version: ${prod ?? 'none'}`],
    },
    [
      { id: 'wait', label: 'Wait', does: 'Ends this run; the item keeps the hold and stays in Verifying.', effect: 'wait' },
      { id: 'take', label: 'Take it', does: `Deploys this item's candidate to ${env.name}/${service.name} over what runs there.`, effect: 'take' },
    ],
    { option: 'wait', why: 'overwriting a build someone is testing loses their work.', confidence: 'medium' }
  ));
}

function finding(text: string): Finding[] {
  return [{ key: findingKey('ci', text), source: 'ci', text, repeated: false }];
}

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  if (key === undefined) return;
  const base = baseName(input('base'));
  const ruled = bound<Ruled>(input('ruling'));
  if (ruled === null || ruled.decision !== 'merge') throw new Error('env runs only after a merge decision');
  const notes: string[] = [];
  const start: string[] = [];
  const out = (go: EnvPass['go'], extra: Partial<EnvPass> = {}, asked: Card = NO_CARD): void =>
    emit({ go, kind: '', env: '', service: '', commit: '', tree: '', answerers: '', remaining: 0, start, notes, ...extra, ...asked });
  if (!ruled.operator || ruled.revert) {
    notes.push('R0 or a revert: no pre-merge environment (decision 50)');
    return out('land');
  }
  const deploys = readDeploys(base);
  const doc = readItem(key);
  const recheck = doc.flags.includes(RECHECK);
  const { files } = forge('pr.files', { ref: { repo, number: ruled.pr } });
  const pairs = prePairs(deploys, files.map(f => f.path));
  const open = pairs.filter(p => !doc.approvals.some(a => a.env === p.env.name && a.service === p.service.name));
  if (open.length === 0) {
    notes.push(pairs.length === 0 ? 'no pre-merge environment carries the changed services' : `approved on ${pairs.map(p => `${p.env.name}/${p.service.name}`).join(', ')}`);
    return out('land');
  }
  const prodName = deploys.environments.find(e => e.kind === 'production')?.name ?? 'production';
  const prod = previousVerified(prodName)?.commit ?? null;
  const pr = prAt(repo, ruled.pr);

  for (const [i, { env, service }] of open.entries()) {
    const at = { env: env.name, service: service.name, remaining: open.length - i - 1 };
    const here = `${env.name}/${service.name}`;
    if (env.batch) notes.push(`${env.name} declares batch: true, which is not built; one build carries one item`);
    const vars = { PIPELINE_ENV: env.name, PIPELINE_SERVICE: service.name, PIPELINE_ITEMS: key, PIPELINE_REASON: 'normal' };
    const shared = env.kind === 'shared';
    if (shared) {
      const joined = join(env.name, service.name, key, doc.urgent);
      if (!joined.holds) {
        updateItem(key, d => {
          d.flags = [...d.flags.filter(f => !f.startsWith('queued:')), queuedFlag(env.name, service.name)];
        });
        notes.push(`queued on ${here} at place ${joined.place}, behind ${joined.holder ?? 'nobody'}${doc.urgent ? ' (urgent: at the front)' : ''}`);
        return out('queued', at);
      }
      updateItem(key, d => {
        d.flags = d.flags.filter(f => !f.startsWith('queued:'));
      });
    }

    // What the environment runs, read before deploying (decision 51); an ephemeral one is the item's own.
    const hold = shared ? readHold(env.name, service.name) : null;
    let runs: string | null = null;
    const take = readItem(key).flags.includes(takeFlag(env.name, service.name));
    if (shared && env.version !== null) {
      const read = runRecipe(env.version, { ...vars, PIPELINE_REF: '' }, 5 * 60_000);
      if (!read.ok) return out('ask', { ...at, kind: 'env-ask' }, infraCard(key, env, service, 'version read', read.tail, ''));
      runs = read.stdout.split(/\s+/)[0] ?? '';
      const last = hold?.build?.commit ?? null;
      // The candidate ref's tip is ours too: a deploy that failed after the recipe may have left it running.
      const tip = fetchBranch(`pipeline/candidate/${env.name}/${service.name}`);
      const known = (last !== null && sameVersion(runs, last)) || (prod !== null && sameVersion(runs, prod)) || (tip !== null && sameVersion(runs, tip));
      if (!known && !take) {
        const ours = hold?.build?.items.includes(key) === true;
        if (ours && (await readState(key)) === 'test-review') {
          notes.push(`${here} ran ${runs || 'nothing readable'} instead of this item's build ${last}, overwritten while it waited for a person: deployed again`);
        } else {
          return out('ask', { ...at, kind: 'env-ask' }, foreignCard(key, env, service, runs, last, prod));
        }
      }
    }
    if (take) updateItem(key, d => {
      d.flags = d.flags.filter(f => f !== takeFlag(env.name, service.name));
    });

    // The candidate: the base with the item branch merged in, or the merged base alone on a recheck (decision 49).
    const baseTip = fetchBranch(base);
    if (baseTip === null) throw new Error(`origin has no ${base}`);
    const head = recheck ? null : pr.head;
    let commit: string;
    let reused = false;
    if (hold !== null && reusable(hold.build, key, env.name, service.name, baseTip, head)) {
      commit = (hold.build as Build).commit;
      reused = true;
    } else {
      const cut = cutCandidate(base, recheck ? [] : [pr.branch], env.name, service.name);
      if ('conflict' in cut) {
        // A fix round keeps no hold, here or on an earlier environment (decision 51).
        start.push(...releaseAll(key));
        updateItem(key, d => {
          d.fix = { from: `candidate for ${here}`, findings: [{ key: findingKey('conflict', cut.conflict), source: 'conflict', text: `${cut.conflict}: merge ${base} into the item branch and resolve`, repeated: false }] };
        });
        notes.push(cut.conflict);
        return out('round', at);
      }
      commit = cut.commit;
    }
    const tree = restrictedTree(commit, service.paths);

    // A retry finds its own candidate already running: only the smoke check runs again.
    let checked: { ok: boolean; step: string; notes: readonly string[]; tail: string };
    if (reused && runs !== null && sameVersion(runs, commit)) {
      const smoke = env.smoke === null ? null : runRecipe(env.smoke, { ...vars, PIPELINE_REF: commit }, 30 * 60_000);
      checked = { ok: smoke === null || smoke.ok, step: smoke === null || smoke.ok ? 'none' : 'smoke', notes: [`${here} already runs ${commit}: not deployed again`], tail: smoke?.tail ?? '' };
    } else {
      checked = deployAndCheck(env, service, commit, { PIPELINE_ITEMS: key, PIPELINE_REASON: 'normal' });
    }
    notes.push(...checked.notes);
    // Recorded once the environment runs it (deployed, read back; the smoke check may still be red), so a
    // failed deploy leaves the previous build as the hold's last one.
    if (shared && !reused && (checked.ok || checked.step === 'smoke')) recordBuild(env.name, service.name, key, { commit, tree, items: [key], at: new Date().toISOString() });
    const passed = { ...at, commit, tree };
    if (!checked.ok && (checked.step !== 'smoke' || recheck)) {
      // Infrastructure, or the merged base itself failing its smoke check: the Operator decides, no fix round.
      return out('ask', { ...passed, kind: 'env-ask' }, infraCard(key, env, service, checked.step, checked.tail, commit));
    }
    if (!checked.ok) {
      // A fix round keeps no hold, here or on an earlier environment (decision 51).
      start.push(...releaseAll(key));
      updateItem(key, d => {
        d.fix = { from: `smoke on ${here}`, findings: finding(`the smoke check on ${here} failed at the candidate ${commit}:\n${checked.tail}`) };
      });
      notes.push(`smoke red on ${here}`);
      return out('round', passed);
    }
    if (env.gate === null) {
      updateItem(key, d => {
        d.approvals = [...d.approvals.filter(a => !(a.env === env.name && a.service === service.name)), { env: env.name, service: service.name, commit, tree, by: 'smoke', at: new Date().toISOString() }];
      });
      notes.push(`smoke green on ${here}: approved by the smoke check`);
      continue;
    }
    // A person's gate on the environment (decision 50): TestReview, outside the waiting cap.
    await moveState(key, ['verifying', 'test-review'], 'test-review');
    const answerers = env.gate.answerers.join(', ');
    const asked = card(buildRequest(
      {
        decide: `${key} runs on ${here} at ${commit.slice(0, 12)}: approve it, ask for changes, or hold?`,
        why: `${env.name} declares a person's gate; the answerers are ${answerers} (the engine does not check who answers yet).`,
        notVerified: ['behaviour beyond the smoke check'],
        facts: [
          `candidate ${commit}, tree ${tree} (restricted to ${service.paths.join(', ')})`,
          ...notes,
          ...(recheck ? ['the PR is merged: this is the merged base, sent back to the environment after the tree check'] : []),
          `environments after this one: ${at.remaining}`,
        ],
      },
      [
        { id: 'approve', label: 'Approve', does: `Records the approval on ${here}, bound to tree ${tree.slice(0, 12)}, and goes on to the merge.`, effect: 'approve' },
        ...(recheck
          ? []
          : [{ id: 'changes', label: 'Changes', does: `Sends your comment to the Implementer; frees ${here} for the next item, and the fixed item comes back first. No round is spent.`, effect: 'changes' }]),
        { id: 'hold', label: 'Hold', does: 'Ends this run; the item stays in TestReview and keeps the environment.', effect: 'hold' },
      ],
      { option: 'approve', why: 'the smoke check passed on this exact build.', confidence: 'low' }
    ));
    return out('gate', { ...passed, kind: 'test-gate', answerers }, asked);
  }
  out('land');
}

await script('unify-merge env', main);

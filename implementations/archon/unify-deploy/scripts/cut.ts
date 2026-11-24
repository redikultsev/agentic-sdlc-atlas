/**
 * Start of the release run (decisions 48, 52, 53): what does this run release?
 *
 * - `revert`: the item this run was fired for flags a revert this pipeline opened
 *   (`no-watch:<m>`) and that PR is merged. It clears the release line when the item is
 *   the culprit that blocked it (its merge commit becomes `clearedBy`). Shape A deploys
 *   it unwatched (decision 26); with declared environments the revert ships with the next
 *   release instead, so this run goes on to cut one.
 * - `release`: a release to deploy. An open release that is neither failed nor waiting is
 *   resumed (after its gate was passed, or on a retry); so is one deploying or watched in
 *   production, or waiting at a gate, when no other release run (engine key `release`)
 *   is live: the run that had it is gone, and promote goes on from where it stopped (a
 *   Live release is watched again). Otherwise every item the engine holds in Releasing
 *   whose PR is merged into the base and that no live release carries is cut into a new
 *   release, `releases/<id>`, id from the base commit and the sorted keys, and
 *   `work.release` is set on each. Only a run under the key `release` deploys: the
 *   hourly run, which has no item, starts one for the release (delivery id from the
 *   release and this run) and ends with `none`.
 * - `ask`: the project releases on the Operator's word (`release.trigger: operator`), no
 *   waiting item is urgent and this run is not that word: one request for the release.
 * - `blocked`: the release line is blocked after a rollback and the base does not hold
 *   the culprit's revert or fix: one request saying so (wait, or end the block).
 * - `none`: nothing waits, another live release run has the release under way (or a
 *   start of one is queued), the release went to a release run, the same request is
 *   open, or the trigger says not now (`schedule`, on a merge).
 * - `stop`: the run's own item disagrees with its record; `flag` raises it.
 *
 * An item whose tracker label disagrees with the engine is left out of the release and
 * flagged on the item; the rest go.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST, INPUTS_REPO_PATH, INPUTS_NUMBER (may be
 * empty), INPUTS_REASON (merge, schedule, operator or revert) and
 * INPUTS_UNIFY_DEPLOY_BINDING (the hourly run's hand-over); the pack setting INPUTS_BASE.
 */

import { emit, input, item, runId } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { readDeploys } from '../../.shared/environments.ts';
import { fireNext } from '../../.shared/fire.ts';
import { forge } from '../../.shared/forge.ts';
import type { ItemKey } from '../../.shared/item.ts';
import { createRelease, lineAllows, readLine, readRelease, type Release, RELEASE_RUN, releaseRuns, updateLine } from '../../.shared/releases.ts';
import { runInputs } from '../../.shared/repo.ts';
import { buildRequest, type Request } from '../../.shared/request.ts';
import { readState, StateMismatch } from '../../.shared/states.ts';
import { readWork, updateWork } from '../../.shared/work.ts';
import { allWork, baseCommit, contains, failedBeforeProduction, NEEDS_ATTENTION, productionEnvs, readAsk, readGates, releaseId, writeAsk } from './lib.ts';

type Mode = 'release' | 'revert' | 'ask' | 'blocked' | 'none' | 'stop';

const NOTHING = { question: '', options: [], recommendation: null };

function out(mode: Mode, summary: string, extra: Partial<{ release: string; items: ItemKey[]; pr: number | null; legacy: boolean }> & Partial<Request> = {}): void {
  emit({ mode, release: '', items: [], pr: null, legacy: false, summary, ...NOTHING, ...extra });
}

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  const base = input('base').trim() || 'main';
  const reason = input('reason').trim() || 'schedule';
  const run = runId();
  const deploys = readDeploys(base);
  const commit = baseCommit(base);
  const legacy = deploys.legacy;
  const notes: string[] = [];
  // Only a run under the engine key `release` deploys; the hourly run hands the release to one.
  const own = item()?.item.key === RELEASE_RUN;
  const go = (release: Release, summary: string): void => {
    if (own) return out('release', summary, { release: release.id, items: [...release.items], pr: singlePr(release), legacy });
    const first = release.items[0];
    if (first === undefined) return out('none', `release ${release.id} carries no item`);
    const fired = fireNext('unify-deploy', repo, first, `unify-deploy:${repo.host}/${repo.path}:release:${release.id}:${run}`, { reason }, RELEASE_RUN);
    out('none', `${summary}; handed to a release run (${fired})`, { release: release.id, items: [...release.items], legacy });
  };

  // ---- a merged revert this pipeline opened
  if (key !== undefined) {
    const work = readWork(key).doc;
    const noWatch = work.flags.filter(flag => flag.startsWith('no-watch:')).map(flag => Number(flag.slice('no-watch:'.length)));
    for (const revert of noWatch.reverse()) {
      const view = forge('pr.view', { selector: { kind: 'number', ref: { repo, number: revert } } });
      if (view === null || view.pr.state !== 'merged') continue;
      const merged = forge('pr.merge-state', { ref: { repo, number: revert } }).merge_commit;
      const { blocked } = readLine();
      const ours = blocked !== null && (blocked.culprit === key || (blocked.culprit === null && (readRelease(blocked.release)?.items ?? []).includes(key)));
      if (ours && blocked.clearedBy === null && merged !== null) {
        updateLine(line => {
          if (line.blocked !== null) line.blocked.clearedBy = merged;
        });
        notes.push(`the release line clears once a release holds ${merged.slice(0, 12)} (the revert of ${key})`);
      }
      if (legacy) {
        let current: string;
        try {
          current = await readState(key);
        } catch (error) {
          if (!(error instanceof StateMismatch)) throw error;
          out('stop', error.message, { items: [key], pr: revert, legacy });
          return;
        }
        out('revert', `PR #${String(revert)} is the revert this pipeline opened for ${key} (${current}); its deploy is not watched${notes.length > 0 ? `; ${notes.join('; ')}` : ''}`, { items: [key], pr: revert, legacy });
        return;
      }
      notes.push(`PR #${String(revert)}, the revert of ${key}, ships with the next release`);
      break;
    }
  }

  // ---- a release already under way
  const work = allWork();
  const holding = new Map<string, ItemKey[]>();
  for (const entry of work) {
    const id = entry.doc.release;
    if (typeof id !== 'string' || !['releasing', 'live'].includes(entry.doc.state ?? '')) continue;
    holding.set(id, [...(holding.get(id) ?? []), entry.key]);
  }
  for (const [id, keys] of holding) {
    const release = readRelease(id);
    if (release === null || failedBeforeProduction(release, deploys)) continue;
    const live = keys.some(k => work.find(w => w.key === k)?.doc.state === 'live');
    const production = new Set(productionEnvs(deploys).map(e => e.name));
    const atProduction = Object.entries(release.envs).some(([env, s]) => production.has(env) && ['deploying', 'deployed'].includes(s.status));
    const gate = Object.entries(readGates(id)).find(([, g]) => g.status === 'open');
    if (live || atProduction || gate !== undefined) {
      // A release run owns it while it deploys, watches or waits at the gate; resumed only when none is left.
      const where = gate !== undefined ? `waits at the gate of ${gate[0]}` : 'is deploying or watched in production';
      const others = releaseRuns(run);
      if (others.live.length > 0 || (!own && others.queued > 0)) {
        out('none', `release ${id} (${release.items.join(', ')}) ${where}; release run ${others.live.join(', ') || 'start queued'} has it`);
        return;
      }
      go(release, `release ${id} (${release.items.join(', ')}) ${where}, and no release run is left: resumed from where it stopped`);
      return;
    }
    go(release, `release ${id} (${release.items.join(', ')}) goes on from where it stopped`);
    return;
  }

  // ---- what waits in Releasing
  const taken: ItemKey[] = [];
  let urgent = false;
  for (const entry of work.filter(w => w.doc.state === 'releasing')) {
    const id = entry.doc.release ?? null;
    if (id !== null) {
      const release = readRelease(id);
      if (release !== null && !failedBeforeProduction(release, deploys)) continue;
    }
    const pr = entry.doc.pr ?? null;
    if (pr === null) {
      notes.push(`${entry.key} names no PR`);
      continue;
    }
    const view = forge('pr.view', { selector: { kind: 'number', ref: { repo, number: pr } } });
    if (view === null || view.pr.state !== 'merged') {
      notes.push(`PR #${String(pr)} of ${entry.key} is ${view === null ? 'not found' : view.pr.state}`);
      continue;
    }
    const merged = forge('pr.merge-state', { ref: { repo, number: pr } }).merge_commit;
    if (merged !== null && !contains(commit, merged)) {
      notes.push(`PR #${String(pr)} of ${entry.key} merged after ${commit.slice(0, 12)}`);
      continue;
    }
    try {
      await readState(entry.key);
    } catch (error) {
      if (!(error instanceof StateMismatch)) throw error;
      await tracker().comment(entry.key, `unify-deploy-left-out:${run}`, ['**Left out of the release**', '', `Why you: the item's label and its pipeline record disagree, and the pipeline does not overwrite either. ${error.message}`].join('\n'));
      await tracker().label(entry.key, { add: [NEEDS_ATTENTION] });
      notes.push(`${entry.key} left out: ${error.message}`);
      continue;
    }
    taken.push(entry.key);
    urgent ||= entry.doc.urgent === true;
  }
  const said = notes.length > 0 ? ` (${notes.join('; ')})` : '';
  if (taken.length === 0) {
    out('none', `nothing waits in Releasing${said}`);
    return;
  }
  const keys = [...taken].sort();
  const trigger = deploys.release.trigger;
  if (!urgent && trigger === 'schedule' && reason === 'merge') {
    out('none', `${keys.join(', ')} wait for the scheduled release${said}`);
    return;
  }

  const prs = keys.map(k => `${k}: PR #${String(readWork(k).doc.pr)}`);
  if (!urgent && trigger === 'operator' && reason !== 'operator') {
    const subject = keys.join(',');
    const asked = readAsk('release');
    if (asked !== null && (asked.status === 'open' || (asked.subject === subject && ['declined', 'answered'].includes(asked.status)))) {
      out('none', asked.status === 'open' ? 'a release request is open with the Operator' : asked.status === 'answered' ? `the Operator's release of ${subject} is starting` : `the Operator said not now to ${subject}`);
      return;
    }
    writeAsk('release', { subject, status: 'open', run, at: new Date().toISOString() });
    const request = buildRequest(
      {
        decide: `Release ${keys.length === 1 ? keys[0] : `these ${String(keys.length)} items`} to production now?`,
        why: 'the project releases on your word (release.trigger: operator).',
        notVerified: [],
        facts: [...prs, `base commit ${commit.slice(0, 12)}`],
      },
      [
        { id: 'release', label: 'Release', does: `Cuts a release of ${keys.join(', ')} at ${commit.slice(0, 12)} and deploys it through every environment after merge.`, effect: 'release', extra: { items: keys } },
        { id: 'not-now', label: 'Not now', does: 'Leaves them in Releasing; you are asked again when another item joins them.', effect: 'not-now', extra: { items: keys } },
      ],
      { option: 'release', why: 'Every item passed its gates and merged; waiting adds them up into a bigger release.', confidence: 'medium' }
    );
    out('ask', `asking the Operator to release ${keys.join(', ')}`, { items: keys, legacy, ...request });
    return;
  }

  const id = releaseId(commit, keys);
  const before = readRelease(id);
  if (before !== null && failedBeforeProduction(before, deploys) && reason !== 'operator') {
    out('none', `release ${id} of the same commit and items stopped before production; nothing retries it by itself until the base moves or the Operator asks${said}`);
    return;
  }

  if (productionEnvs(deploys).length > 0) {
    const line = lineAllows(commit, contains);
    if (!line.ok) {
      const blocked = readLine().blocked;
      const subject = blocked?.release ?? 'line';
      const asked = readAsk('line');
      if (asked !== null && asked.subject === subject && ['open', 'waiting'].includes(asked.status)) {
        out('none', `the release line is blocked and the Operator ${asked.status === 'open' ? 'has the request' : 'chose to wait'}: ${line.reason}`);
        return;
      }
      writeAsk('line', { subject, status: 'open', run, at: new Date().toISOString() });
      const request = buildRequest(
        {
          decide: `The release line is blocked: ${keys.join(', ')} cannot go to production yet.`,
          why: `${line.reason}. A production release now would ship the rolled-back change again (decision 52).`,
          notVerified: [],
          facts: [...prs, `base commit ${commit.slice(0, 12)}`, ...(blocked?.culprit ? [`merge the revert or a fix of ${blocked.culprit}; the next release then goes by itself`] : ['name the culprit or merge the reverts; the next release then goes by itself'])],
        },
        [
          { id: 'wait', label: 'Wait', does: 'Leaves the items in Releasing; the line clears by itself when the culprit\'s revert or fix is merged.', effect: 'wait', extra: { items: keys } },
          { id: 'end-block', label: 'End the block', does: 'Clears the release line now (you know production is safe without the revert) and starts the release.', effect: 'end-block', extra: { items: keys } },
        ],
        { option: 'wait', why: 'The revert merges without a gate, so waiting costs minutes; ending the block ships the fault again unless it is already fixed.', confidence: 'high' }
      );
      out('blocked', `the release line is blocked: ${line.reason}`, { items: keys, legacy, ...request });
      return;
    }
    if (line.reason !== '') notes.push(line.reason);
  }

  const release = createRelease({ id, at: new Date().toISOString(), commit, items: keys, reason: 'normal', urgent, envs: {} });
  for (const k of release.items) {
    updateWork(k, doc => {
      doc.release = id;
    });
  }
  if (reason === 'operator') writeAsk('release', null);
  go(release, `release ${id}: ${release.items.join(', ')} at ${commit.slice(0, 12)}${urgent ? ' (urgent)' : ''}${notes.length > 0 ? ` (${notes.join('; ')})` : ''}`);
}

function singlePr(release: Release): number | null {
  return release.items.length === 1 ? readWork(release.items[0]).doc.pr : null;
}

await script('unify-deploy cut', main);

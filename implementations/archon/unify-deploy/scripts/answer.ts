/**
 * Apply the Operator's answer to the watch's request. The effect is read from the chosen
 * option's `value.effect`, never from the text:
 *
 * - roll-back: the environment's rollback by decision 52 with the culprit the Watcher
 *   named (toggles are not tried again), then RolledBack, report, new item; with no
 *   culprit in a release of several items, as `investigate`.
 * - done: Done for every item.
 * - revert-all (after a redeploy with no culprit): every PR reverted and sent to merge,
 *   every item RolledBack.
 * - name-culprit: the key written in the text is the culprit: reverted and RolledBack,
 *   the others back to Releasing. A text that names no item of the release moves nothing.
 * - investigate: a new work item with the evidence; every item back to Releasing; the
 *   line stays blocked.
 * - other: the text is recorded as a ruling and nothing moves; the items stay Live, which
 *   unify-revisit raises again as needing attention; the next release run finds no run
 *   on the release and watches it again.
 *
 * The answer's text is recorded as a ruling on every item of the release (decision 32).
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST, INPUTS_REPO_PATH and
 * INPUTS_UNIFY_MERGE_BINDING; the pack setting INPUTS_BASE; INPUTS_RELEASE from cut;
 * INPUTS_ENV from promote; INPUTS_DECISION, INPUTS_TEXT and INPUTS_VALUE from the wait.
 */

import { emit, input, runId } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { readDeploys } from '../../.shared/environments.ts';
import { nullableJson, record } from '../../.shared/inputs.ts';
import { type ItemKey, keySlug, parseKey } from '../../.shared/item.ts';
import { updateLine } from '../../.shared/releases.ts';
import { runInputs } from '../../.shared/repo.ts';
import { recordRuling } from '../../.shared/rulings.ts';
import { readWork } from '../../.shared/work.ts';
import {
  applyRollback,
  backToReleasing,
  finishClean,
  finishRolledBack,
  mustRelease,
  planRollback,
  readDeploy,
  releaseSubject,
  revertAndMerge,
  runRollback,
  updateDeploy,
  type WatchRecord,
  watchedEnv,
} from './lib.ts';

async function main(): Promise<void> {
  const { repo } = runInputs();
  const base = input('base').trim() || 'main';
  const id = input('release').trim();
  const deploys = readDeploys(base);
  const env = watchedEnv(deploys, input('env').trim());
  const release = mustRelease(id);
  const decision = input('decision').trim();
  const text = input('text').trim();
  const value = record(nullableJson(input('value')));
  const effect = decision === 'other' ? 'other' : typeof value?.effect === 'string' ? value.effect : '';
  const run = runId();
  const subject = releaseSubject(id, env.name);
  for (const key of release.items) await recordRuling(key, { gate: 'watch', decision, text, project: false });

  const watch: WatchRecord = readDeploy(subject, run).record?.watch ?? {
    result: 'unsure', coverage: 'health-only', verdict: 'unsure', reason: 'no watch result recorded', evidence: [], revertPr: null, fire: null, at: new Date().toISOString(),
  };
  const save = (next: WatchRecord): WatchRecord => {
    updateDeploy(subject, run, found => {
      if (found === null) throw new Error(`no deploy record of release ${id} on ${env.name} in this run`);
      return { ...found, watch: next };
    });
    return next;
  };
  const needMerge = (): void => {
    if (input('unify_merge_binding').trim() === '') throw new Error('unify_merge_binding is empty: a revert cannot be sent to merge');
  };
  const revertEach = (keys: readonly ItemKey[]): Record<ItemKey, number> => {
    const reverts: Record<ItemKey, number> = { ...(watch.reverts ?? {}) };
    for (const key of keys) {
      const pr = readWork(key).doc.pr;
      if (pr === null || reverts[key] !== undefined) continue;
      // The redeploy already counted the rollback of every item.
      reverts[key] = revertAndMerge(repo, key, pr, `The Operator chose to revert. ${watch.reason}`, id, false).revertPr;
    }
    return reverts;
  };
  const investigate = async (current: WatchRecord): Promise<string> => {
    const created = await tracker().create(
      'project',
      `pipeline-release-regression:${id}`,
      `Regression after release ${id}: cause not found`,
      [
        `Release ${id} (${release.items.join(', ')}) was rolled back on ${env.name}; neither the Watcher nor the Operator could pin the regression on one item.`,
        '',
        `What the Watcher saw: ${current.reason}`,
        '',
        ...current.evidence.map(e => `- ${e}`),
        '',
        'The items are back in Releasing and the release line stays blocked until the cause is reverted or fixed, or the Operator ends the block.',
        ...(text === '' ? [] : ['', `The Operator: ${text}`]),
      ].join('\n')
    );
    const moved: string[] = [];
    for (const key of release.items) moved.push(await backToReleasing(key, run, `release ${id} was rolled back and its cause is investigated in ${created}.`));
    return `${moved.join('; ')}; investigated in ${created}`;
  };

  switch (effect) {
    case 'roll-back': {
      needMerge();
      const ctx = { repo, deploys, release, env, run };
      const plan = planRollback(ctx, watch.culprit ?? null, true);
      const done = runRollback(ctx, plan, watch.culprit ?? null, `The Operator chose to roll back. ${watch.reason}`);
      if (done.failed !== null) {
        for (const key of release.items) await tracker().label(key, { add: ['pipeline:needs-attention'] });
        emit({ effect, summary: `the rollback could not run: ${done.failed}; nothing moved` });
        return;
      }
      const next = save({ ...watch, result: 'rolled-back', plan, method: done.method, reverts: done.reverts, fire: done.fire, revertPr: Object.values(done.reverts)[0] ?? null });
      const moved = await applyRollback(release, env.name, next, run, text);
      emit({ effect, summary: plan.ask ? await investigate(next) : moved.join('; ') });
      return;
    }
    case 'done':
      emit({ effect, summary: (await finishClean(release, env.name, watch, run, text)).join('; ') });
      return;
    case 'revert-all': {
      needMerge();
      const next = save({ ...watch, reverts: revertEach(release.items) });
      const moved: string[] = [];
      for (const key of release.items) moved.push(await finishRolledBack(key, next, run, text));
      emit({ effect, summary: moved.join('; ') });
      return;
    }
    case 'name-culprit': {
      const named = text.split(/[\s,;:()]+/).map(word => parseKey(word)).find((k): k is ItemKey => k !== null && release.items.includes(k));
      if (named === undefined) {
        emit({ effect: 'other', summary: `the text names no item of release ${id} (${release.items.join(', ')}); nothing moved and the items stay Live` });
        return;
      }
      needMerge();
      updateLine(line => {
        if (line.blocked !== null && line.blocked.release === id) line.blocked.culprit = named;
      });
      const next = save({ ...watch, culprit: named, reverts: revertEach([named]) });
      const moved = [await finishRolledBack(named, next, run, text)];
      for (const key of release.items.filter(k => k !== named)) moved.push(await backToReleasing(key, run, `release ${id} was rolled back because of ${named}; this item was not the cause.`));
      emit({ effect, summary: moved.join('; ') });
      return;
    }
    case 'investigate':
      emit({ effect, summary: await investigate(watch) });
      return;
    case 'other':
      emit({ effect, summary: `release ${id}: the Operator's text is recorded as a ruling on ${release.items.map(k => keySlug(k)).join(', ')}; the items stay Live` });
      return;
    default:
      throw new Error(`the answer '${decision}' carries no effect this script knows`);
  }
}

await script('unify-deploy answer', main);

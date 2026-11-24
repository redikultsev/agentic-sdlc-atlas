/**
 * End the watch: read the result `act` recorded in this run's deploy record of the
 * watched environment and apply it to every item of the release.
 *
 * - done: Done, with the coverage noted (health-only says what could not be seen); a
 *   culprit whose toggle was turned off is RolledBack instead; the environment is verified.
 * - rolled-back: the plan of decision 52. The culprit RolledBack with a report and a new
 *   item with the evidence; the others back to Releasing; the line blocked after a
 *   redeploy. No culprit in a release of several items: nothing moves yet (production
 *   already runs the previous version) and one request asks: revert all, name the
 *   culprit, or investigate as a work item.
 * - unsure (or no result, which a loop that ran out of passes leaves): nothing moves; one
 *   request: roll back or keep.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST, INPUTS_REPO_PATH; the pack setting
 * INPUTS_BASE; INPUTS_RELEASE from cut; INPUTS_ENV from promote.
 */

import { emit, input, runId } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { readWork } from '../../.shared/work.ts';
import { runInputs } from '../../.shared/repo.ts';
import { buildRequest } from '../../.shared/request.ts';
import { applyRollback, finishClean, mustRelease, readDeploy, releaseSubject } from './lib.ts';

const NOTHING = { question: '', options: [], recommendation: null };

async function main(): Promise<void> {
  runInputs();
  const id = input('release').trim();
  const env = input('env').trim();
  const run = runId();
  const release = mustRelease(id);
  const watch = readDeploy(releaseSubject(id, env), run).record?.watch ?? null;
  const items = release.items;
  const prs = items.map(k => `${k}: PR #${String(readWork(k).doc.pr)}`);
  const subject = items.length === 1 ? `${items[0]} (PR #${String(readWork(items[0]).doc.pr)})` : `release ${id} (${items.join(', ')})`;

  if (watch?.result === 'done') {
    const done = await finishClean(release, env, watch, run, '');
    emit({ result: 'done', coverage: watch.coverage, summary: done.join('; '), ...NOTHING });
    return;
  }
  if (watch?.result === 'rolled-back' && watch.plan) {
    const done = await applyRollback(release, env, watch, run, '');
    if (!watch.plan.ask) {
      emit({ result: 'rolled-back', coverage: watch.coverage, summary: done.join('; '), ...NOTHING });
      return;
    }
    const request = buildRequest(
      {
        decide: `${env} went back to the previous verified release; which item of release ${id} caused the regression?`,
        why: 'the Watcher saw a regression but could not pin it on one item, so every item waits for your word (decision 52).',
        notVerified: ["the Watcher's reading of the numbers is the agent's; the numbers themselves are the signals script's"],
        facts: [watch.reason, ...watch.evidence, ...prs, 'the release line stays blocked until the cause is reverted or fixed'],
      },
      [
        { id: 'revert-all', label: 'Revert all', does: `Opens a revert of every PR in the release, sends each to merge with no gate, and marks ${items.join(', ')} RolledBack with a new item each.`, effect: 'revert-all' },
        { id: 'name-culprit', label: 'Name the culprit', does: 'Write the culprit\'s key in the text: it is reverted and RolledBack, the others go back to Releasing.', effect: 'name-culprit' },
        { id: 'investigate', label: 'Investigate', does: `Files a work item with this evidence; ${items.join(', ')} go back to Releasing and the line stays blocked until it is resolved.`, effect: 'investigate' },
      ],
      { option: 'investigate', why: 'Nothing pins the regression on one item, and production already runs the previous version, so there is time to find the cause.', confidence: 'low' }
    );
    emit({ result: 'unsure', coverage: watch.coverage, summary: `release ${id}: rolled back; asking the Operator for the culprit`, ...request });
    return;
  }

  const reason = watch?.reason ?? 'The watch loop ended without a result (it ran out of passes before the window closed).';
  const request = buildRequest(
    {
      decide: `Roll back ${subject} or keep it deployed (Live on ${env})?`,
      why: 'the Watcher could not call it clean or a regression on the numbers it had.',
      notVerified: [
        ...(watch?.coverage === 'health-only' ? ['what the items changed: the environment declares no signals, so only the deploy itself was watched'] : []),
        "the Watcher's reading of the numbers is the agent's; the numbers themselves are the signals script's",
      ],
      facts: [reason, ...(watch?.evidence ?? []), ...prs, ...(watch?.culprit ? [`the Watcher points at ${watch.culprit}`] : [])],
    },
    [
      {
        id: 'roll-back',
        label: 'Roll back',
        does: `Rolls ${env} back by its own method (${items.length === 1 ? 'a revert of the PR, sent to merge with no gate' : 'the culprit the Watcher named, or the previous verified release'}), marks the culprit RolledBack and files a new item with this evidence.`,
        effect: 'roll-back',
      },
      { id: 'keep', label: 'Keep it', does: `Leaves ${subject} deployed and marks ${items.join(', ')} Done.`, effect: 'done' },
    ],
    watch?.verdict === 'regression'
      ? { option: 'roll-back', why: 'The Watcher saw a regression; it asks only because recent rollbacks were unneeded or the rollback could not run by itself. A rollback is cheap to undo.', confidence: 'medium' }
      : { option: 'keep', why: 'Nothing pins a regression on this release; a later regression is still caught by the next deploy\'s Watcher or an alert.', confidence: 'low' }
  );
  emit({ result: 'unsure', coverage: watch?.coverage ?? 'health-only', summary: `release ${id}: asking the Operator`, ...request });
}

await script('unify-deploy outcome', main);

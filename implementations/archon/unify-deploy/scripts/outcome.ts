/**
 * End the watch: read the result `act` recorded in this run's deploy record and apply it.
 *
 * - done: Done, with the coverage noted (health-only says what could not be seen).
 * - rolled-back: RolledBack, a report on the item, a new item with the evidence.
 * - unsure (or no result, which a loop that ran out of passes leaves): nothing moves; the
 *   output carries one decision request, which the `ask` wait raises.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST, INPUTS_REPO_PATH and INPUTS_NUMBER;
 * INPUTS_PR from reconcile.
 */

import { emit, input, runId } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { buildRequest } from '../../.shared/request.ts';
import { finishDone, finishRolledBack, readDeploy } from './lib.ts';

const NOTHING = { question: '', options: [], recommendation: null };

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  if (key === undefined) return;
  const pr = Number(input('pr')) || null;
  const run = runId();
  const watch = readDeploy(key, run).record?.watch ?? null;

  if (watch?.result === 'done') {
    emit({ result: 'done', coverage: watch.coverage, summary: await finishDone(key, pr, watch, run, ''), ...NOTHING });
    return;
  }
  if (watch?.result === 'rolled-back' && watch.revertPr !== null && pr !== null) {
    emit({ result: 'rolled-back', coverage: watch.coverage, summary: await finishRolledBack(key, pr, watch, watch.revertPr, run, ''), ...NOTHING });
    return;
  }

  const reason = watch?.reason ?? 'The watch loop ended without a result (it ran out of passes before the window closed).';
  const request = buildRequest(
    {
      decide: `Roll back PR #${String(pr)} or keep it deployed (${key} is Live)?`,
      why: 'the Watcher could not call it clean or a regression in this PR on the numbers it had.',
      notVerified: [
        ...(watch?.coverage === 'health-only' ? ['what the PR changed: the project declares no signals, so only the deploy itself was watched'] : []),
        "the Watcher's reading of the numbers is the agent's; the numbers themselves are the signals script's",
      ],
      facts: [reason, ...(watch?.evidence ?? [])],
    },
    [
      {
        id: 'roll-back',
        label: 'Roll back',
        does: `Opens a revert of PR #${String(pr)}, sends it to merge with no gate, marks ${key} RolledBack and files a new item with this evidence.`,
        effect: 'roll-back',
      },
      {
        id: 'keep',
        label: 'Keep it',
        does: `Leaves PR #${String(pr)} deployed and marks ${key} Done.`,
        effect: 'done',
      },
    ],
    watch?.verdict === 'regression-in-this-pr'
      ? { option: 'roll-back', why: 'The Watcher saw a regression in this PR; it asks only because recent rollbacks were unneeded. A revert is cheap to undo.', confidence: 'medium' }
      : { option: 'keep', why: 'Nothing pins a regression on this PR; a later regression is still caught by the next deploy\'s Watcher or an alert.', confidence: 'low' }
  );
  emit({ result: 'unsure', coverage: watch?.coverage ?? 'health-only', summary: `${key}: asking the Operator`, ...request });
}

await script('unify-deploy outcome', main);

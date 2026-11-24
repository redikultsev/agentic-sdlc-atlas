/**
 * The waiting cap at the spec stage (decision 9): the spec stage raises requests (business
 * questions, SpecReview), so it holds while WAITING_CAP other items already wait for the
 * Operator. This item's own TriageReview state is not counted.
 *
 * Inputs: repo_host, repo_path, number. Emits `{ under, waiting, cap }`.
 */

import { emit } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { WAITING_CAP } from '../../.shared/request.ts';
import { waitingOthers } from '../../.shared/stage.ts';

async function main(): Promise<void> {
  const { key } = runInputs();
  const waiting = waitingOthers(key ?? null);
  emit({ under: waiting < WAITING_CAP, waiting, cap: WAITING_CAP });
}

await script('unify-spec count', main);

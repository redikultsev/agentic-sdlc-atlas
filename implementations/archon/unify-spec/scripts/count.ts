/**
 * The waiting cap at the spec stage (decision 9): the spec stage raises requests (business
 * questions, SpecReview), so it holds while WAITING_CAP other items already wait for the
 * Operator. This item's own TriageReview label is not counted.
 *
 * Inputs: repo_host, repo_path, number. Emits `{ under, waiting, cap }`.
 */

import { emit, refuse } from 'archon:script';
import { runInputs } from '../../.shared/repo.ts';
import { WAITING_CAP } from '../../.shared/request.ts';
import { waitingOthers } from '../../.shared/stage.ts';

try {
  const { repo, number } = runInputs();
  const waiting = waitingOthers(repo, number ?? null);
  emit({ under: waiting < WAITING_CAP, waiting, cap: WAITING_CAP });
} catch (error) {
  refuse(`unify-spec count: ${error instanceof Error ? error.message : String(error)}`);
}

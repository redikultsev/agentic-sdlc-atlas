/**
 * The waiting cap (decision 9): with WAITING_CAP items already holding an open request,
 * nothing new starts; the next poll looks again.
 *
 * Inputs: repo_host, repo_path. Emits `{ go, waiting, cap }`.
 */

import { emit, input, refuse } from 'archon:script';
import { repoOf } from '../../.shared/repo.ts';
import { WAITING_CAP, waitingCount } from '../../.shared/request.ts';

try {
  const waiting = waitingCount(repoOf(input('repo_host'), input('repo_path')));
  emit({ go: waiting < WAITING_CAP, waiting, cap: WAITING_CAP });
} catch (error) {
  refuse(`pipeline-poll cap: ${error instanceof Error ? error.message : String(error)}`);
}

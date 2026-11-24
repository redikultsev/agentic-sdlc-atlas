/**
 * The waiting cap (decision 9): with WAITING_CAP items already holding an open request,
 * nothing new starts; the next poll looks again.
 *
 * Inputs: repo_host, repo_path. Emits `{ go, waiting, cap }`.
 */

import { emit } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { WAITING_CAP, waitingCount } from '../../.shared/request.ts';

async function main(): Promise<void> {
  const waiting = waitingCount();
  emit({ go: waiting < WAITING_CAP, waiting, cap: WAITING_CAP });
}

await script('unify-poll cap', main);

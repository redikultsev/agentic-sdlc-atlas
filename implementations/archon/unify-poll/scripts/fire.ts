/**
 * Start triage on the picked issue through the triage binding. The delivery id comes
 * from the repository and the issue number (plus the approved body's digest), so a retry
 * or a second poll starts at most one run per issue; the id is recorded in `work/<n>` so
 * the next poll passes over an issue it already started.
 *
 * Inputs: repo_host, repo_path, unify_triage_binding (read by fireNext); bound
 * `number` and `delivery` from pick. Emits `{ fired, disposition }`.
 */

import { emit, input, refuse } from 'archon:script';
import { fireNext } from '../../.shared/fire.ts';
import { repoOf } from '../../.shared/repo.ts';
import { updateWork } from '../../.shared/work.ts';

function main(): void {
  const repo = repoOf(input('repo_host'), input('repo_path'));
  const number = Number(input('number'));
  const delivery = input('delivery');
  if (!Number.isInteger(number) || number <= 0 || delivery === '') throw new Error('pick handed no issue');
  if (input('unify_triage_binding') === '') throw new Error('unify_triage_binding is empty');
  const disposition = fireNext('unify-triage', repo, number, delivery);
  updateWork(number, doc => {
    const flag = `fired:${delivery}`;
    if (!doc.flags.includes(flag)) doc.flags.push(flag);
  });
  emit({ fired: number, disposition });
}

try {
  main();
} catch (error) {
  refuse(`unify-poll fire: ${error instanceof Error ? error.message : String(error)}`);
}

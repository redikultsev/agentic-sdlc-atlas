/**
 * Start triage on the picked item through the triage binding. The delivery id comes
 * from the repository and the item key (plus the approved body's digest), so a retry
 * or a second poll starts at most one run per item; the id is recorded in `work/<key>` so
 * the next poll passes over an item it already started.
 *
 * Inputs: repo_host, repo_path, unify_triage_binding (read by fireNext); bound
 * `number` (the item key) and `delivery` from pick. Emits `{ fired, disposition }`.
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { fireNext } from '../../.shared/fire.ts';
import { runInputs } from '../../.shared/repo.ts';
import { updateWork } from '../../.shared/work.ts';

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  const delivery = input('delivery');
  if (key === undefined || delivery === '') throw new Error('pick handed no item');
  if (input('unify_triage_binding') === '') throw new Error('unify_triage_binding is empty');
  const disposition = fireNext('unify-triage', repo, key, delivery);
  updateWork(key, doc => {
    const flag = `fired:${delivery}`;
    if (!doc.flags.includes(flag)) doc.flags.push(flag);
  });
  emit({ fired: key, disposition });
}

await script('unify-poll fire', main);

/**
 * Start the next step of an item's pipeline through its fire-only binding.
 *
 * The binding that starts a workflow passes the paths of the bindings it may fire as
 * inputs (`<name>_binding: { binding: <name> }` in `.pack/pack.yaml`), the way Archon's
 * own pack does, so no script guesses a file name. Chain bindings use `overlap: queue`:
 * a fire from a run that is still ending waits for it. The delivery id is built from
 * values a retry repeats, so one decision starts at most one run. What happened to the
 * fire is recorded in `work/<n>`; unify-revisit finds a fire that did not start.
 */

import { input, trigger } from 'archon:script';
import { itemKey, type Repo } from './repo.ts';
import { updateWork } from './work.ts';

export function fireNext(
  binding: string,
  repo: Repo,
  number: number,
  deliveryId: string,
  extra: Readonly<Record<string, string>> = {}
): string {
  const path = input(`${binding.replaceAll('-', '_')}_binding`);
  if (!path || !path.startsWith('/')) throw new Error(`no binding file for ${binding}: is it registered with archon pack bindings?`);
  const fired = trigger.fire(
    path,
    { repo_host: repo.host, repo_path: repo.path, number: String(number), ...extra },
    { deliveryId, item: itemKey(number) }
  );
  const disposition = fired.disposition?.status ?? 'unknown';
  updateWork(number, doc => {
    doc.lastFire = { what: binding, disposition, at: new Date().toISOString() };
  });
  return `${binding}: ${disposition}`;
}

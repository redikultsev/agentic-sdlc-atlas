/**
 * Holds of shared environments that no longer match the items (decisions 51, 43). For
 * every hold in the engine's store (`holds/<env>/<service>`):
 *
 * 1. A holder whose engine state is not Verifying or TestReview (cancelled, Blocked,
 *    Implementing, done, no state at all) loses the hold; `release` hands it at once to
 *    the first queued item in Verifying. A queued item in such a state leaves the queue.
 *    A `returning` mark (an item sent back with changes) stays while the item is in
 *    Implementing, Verifying or TestReview, and is dropped otherwise.
 * 2. A holder that still carries `queued:<env>/<service>` was handed the hold but its run
 *    has not taken it yet: unify-merge is fired for it with `holderDelivery`, the id
 *    unify-merge's own start used, so a start still queued behind the merge resource is
 *    not doubled; a fire lost after a release is made up here.
 * 3. An item whose `queued:<env>/<service>` names a hold that lists it neither as holder
 *    nor in the queue loses the flag: it waits for nothing.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST, INPUTS_REPO_PATH and
 * INPUTS_UNIFY_MERGE_BINDING (read by fireNext).
 */

import { emit, state } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { fireNext } from '../../.shared/fire.ts';
import { type Hold, holdName, holderDelivery, queuedFlag, readHold, release } from '../../.shared/holds.ts';
import type { ItemKey } from '../../.shared/item.ts';
import { runInputs } from '../../.shared/repo.ts';
import type { State } from '../../.shared/states.ts';
import { updateWork } from '../../.shared/work.ts';
import { message, workItems } from './lib.ts';

/** The states in which an item may hold or wait for a shared environment. */
const HOLDING: readonly (State | null)[] = ['verifying', 'test-review'];

/** The states in which an item sent back with changes still comes back. */
const RETURNING: readonly (State | null)[] = ['implementing', 'verifying', 'test-review'];

const QUEUED = 'queued:';

async function main(): Promise<void> {
  const { repo } = runInputs();
  const states = new Map(workItems().map(item => [item.key as string, item]));
  const stateOf = (key: ItemKey): State | null => states.get(key)?.state ?? null;
  const freed: { env: string; service: string; item: ItemKey; state: string; next: ItemKey | null }[] = [];
  const left: { env: string; service: string; item: ItemKey; state: string }[] = [];
  const started: { env: string; service: string; item: ItemKey; fired: string }[] = [];
  const unflagged: { item: ItemKey; flag: string }[] = [];
  const errors: string[] = [];

  const names = state.listValues('holds/').map(found => found.name.split('/')).filter(parts => parts.length === 3);
  for (const [, env, service] of names as [string, string, string][]) {
    try {
      let hold: Hold = readHold(env, service);
      // 1. Holders and queued items that left Verifying and TestReview; marks of items that will not come back.
      for (const key of [...(hold.holder === null ? [] : [hold.holder]), ...hold.queue]) {
        const held = stateOf(key);
        if (HOLDING.includes(held)) continue;
        const wasHolder = hold.holder === key;
        const next = release(env, service, key);
        if (wasHolder) freed.push({ env, service, item: key, state: held ?? 'no state', next });
        else left.push({ env, service, item: key, state: held ?? 'no state' });
        hold = readHold(env, service);
      }
      for (const key of hold.returning.filter(k => !RETURNING.includes(stateOf(k)))) {
        release(env, service, key);
        left.push({ env, service, item: key, state: stateOf(key) ?? 'no state' });
      }
      hold = readHold(env, service);
      // 2. A holder handed the hold whose run has not taken it.
      const holder = hold.holder;
      if (holder !== null && hold.since !== null && (states.get(holder)?.flags ?? []).includes(queuedFlag(env, service))) {
        const fired = fireNext('unify-merge', repo, holder, holderDelivery(repo, holder, env, service, hold.since));
        started.push({ env, service, item: holder, fired });
      }
    } catch (error) {
      errors.push(`${holdName(env, service)}: ${message(error)}`);
    }
  }

  // 3. Flags that name a hold which no longer lists the item.
  for (const item of states.values()) {
    for (const flag of item.flags.filter(f => f.startsWith(QUEUED))) {
      const [env, service] = flag.slice(QUEUED.length).split('/');
      if (env === undefined || service === undefined) continue;
      const hold = readHold(env, service);
      if (hold.holder === item.key || hold.queue.includes(item.key)) continue;
      try {
        updateWork(item.key, doc => {
          doc.flags = doc.flags.filter(f => f !== flag);
        });
        unflagged.push({ item: item.key, flag });
      } catch (error) {
        errors.push(`${item.key} ${flag}: ${message(error)}`);
      }
    }
  }
  emit({ freed, left, started, unflagged, errors });
}

await script('unify-revisit holds', main);

/**
 * The hold of a shared environment per service (decision 51): a record in the engine's
 * store `holds/<env>/<service>`, taken and passed on by conditional writes, so two runs
 * never both hold it. Items queue in order; an urgent item goes to the front, behind the
 * holder (decision 53). Waiting is a condition inside Verifying: the item's document says
 * where it waits (`queuedFlag` in its flags), no session runs for it.
 *
 * The hold ends when the item merges, is cancelled or Blocked, goes to a fix round, or
 * when the Operator ends it; `release` then hands it to the first queued item in
 * Verifying, which the caller starts with `holderDelivery`. An item an answerer sent back
 * with changes is marked `returning` instead of queued: it joins at the front when it
 * comes back. What the environment runs is read only to check the hold, never to decide
 * it.
 */

import { state } from 'archon:script';
import type { ItemKey } from './item.ts';
import type { Repo } from './repo.ts';
import { readWork } from './work.ts';

export interface Build {
  /** The candidate commit deployed: the base with the items merged in (decision 49). */
  readonly commit: string;
  /** Its tree restricted to the service's paths: what an approval is bound to. */
  readonly tree: string;
  readonly items: readonly ItemKey[];
  readonly at: string;
}

export interface Hold {
  holder: ItemKey | null;
  since: string | null;
  queue: ItemKey[];
  /** Items sent back with changes: each joins at the front of the queue when it comes back. */
  returning: ItemKey[];
  /** The build the engine last put on the environment for this service. */
  build: Build | null;
}

export function holdName(env: string, service: string): string {
  return `holds/${env}/${service}`;
}

/** The flag of an item waiting in the queue of `<env>/<service>`: a condition inside Verifying. */
export function queuedFlag(env: string, service: string): string {
  return `queued:${env}/${service}`;
}

/**
 * The one delivery id that starts the item a hold was handed to: the hold, the holder and
 * the time it was handed over. unify-merge and unify-revisit both fire with it, so the
 * engine starts one run per handover.
 */
export function holderDelivery(repo: Repo, holder: ItemKey, env: string, service: string, since: string): string {
  const at = `${repo.host}/${repo.path}${holder.startsWith('#') ? '' : ':'}${holder}`;
  return `unify-merge:${at}:hold:${env}/${service}:${since}`;
}

/** `holderDelivery` for an item handed the hold its `queued:` flag names; null when it holds none it waits for. */
export function handoverDelivery(repo: Repo, key: ItemKey): string | null {
  for (const flag of readWork(key).doc.flags.filter(f => f.startsWith('queued:'))) {
    const [env, service] = flag.slice('queued:'.length).split('/');
    if (env === undefined || service === undefined) continue;
    const hold = readHold(env, service);
    if (hold.holder === key && hold.since !== null) return holderDelivery(repo, key, env, service, hold.since);
  }
  return null;
}

function fill(value: Partial<Hold> | null): Hold {
  return { holder: null, since: null, queue: [], returning: [], build: null, ...(value ?? {}) };
}

export function readHold(env: string, service: string): Hold {
  return fill(state.get(holdName(env, service)).value as Partial<Hold> | null);
}

function change<T>(env: string, service: string, fn: (hold: Hold) => T): T {
  const name = holdName(env, service);
  for (let attempt = 0; attempt < 5; attempt++) {
    const found = state.get(name);
    const hold = fill(found.value as Partial<Hold> | null);
    const result = fn(hold);
    if (state.put(name, hold, { ifRevision: found.revision }).ok) return result;
  }
  throw new Error(`${name} kept moving under five writes`);
}

/**
 * Join the queue, or take the hold when it is free. An urgent item, or one coming back
 * from changes (`returning`), goes to the front. Returns whether this item holds it now
 * and its place in the queue (0 for the holder). Idempotent.
 */
export function join(env: string, service: string, key: ItemKey, urgent = false): { readonly holds: boolean; readonly place: number; readonly holder: ItemKey | null } {
  return change(env, service, hold => {
    const returning = hold.returning.includes(key);
    hold.returning = hold.returning.filter(k => k !== key);
    if (hold.holder === key) return { holds: true, place: 0, holder: key };
    if (hold.holder === null) {
      hold.queue = hold.queue.filter(k => k !== key);
      hold.holder = key;
      hold.since = new Date().toISOString();
      return { holds: true, place: 0, holder: key };
    }
    if (!hold.queue.includes(key)) {
      if (urgent || returning) hold.queue.unshift(key);
      else hold.queue.push(key);
    }
    return { holds: false, place: hold.queue.indexOf(key) + 1, holder: hold.holder };
  });
}

/** Record the build the engine put on the environment. Only the holder may. */
export function recordBuild(env: string, service: string, key: ItemKey, build: Build): void {
  change(env, service, hold => {
    if (hold.holder !== key) throw new Error(`${key} does not hold ${env}/${service} (${hold.holder ?? 'nobody'} does)`);
    hold.build = build;
  });
}

/**
 * End the item's hold or leave the queue. `returns` marks it `returning` (an answerer
 * asked for changes: the fixed item comes back first); otherwise its mark is cleared. The
 * hold goes at once to the first queued item in Verifying; queued items in another state
 * are passed over and stay queued. Returns the item that should start next, or null.
 */
export function release(env: string, service: string, key: ItemKey, returns = false): ItemKey | null {
  return change(env, service, hold => {
    const held = hold.holder === key;
    hold.queue = hold.queue.filter(k => k !== key);
    hold.returning = [...hold.returning.filter(k => k !== key), ...(returns ? [key] : [])];
    if (!held) return null;
    // Hand the hold over at once, so the next item holds it when its run starts.
    const next = hold.queue.find(k => readWork(k).doc.state === 'verifying') ?? null;
    hold.queue = hold.queue.filter(k => k !== next);
    hold.holder = next;
    hold.since = next === null ? null : new Date().toISOString();
    return next;
  });
}

/** Every hold the item is in, as holder or in a queue (a `returning` mark is not one). */
export function holdsOf(key: ItemKey): { readonly env: string; readonly service: string; readonly holder: boolean }[] {
  return state
    .listValues('holds/')
    .map(found => ({ parts: found.name.split('/'), hold: (found.value ?? {}) as Partial<Hold> }))
    .filter(({ hold }) => hold.holder === key || (hold.queue ?? []).includes(key))
    .map(({ parts, hold }) => ({ env: parts[1] ?? '', service: parts[2] ?? '', holder: hold.holder === key }));
}

/**
 * Leave every hold and queue (cancelled, Blocked, merged, a fix round); returns the items
 * to start next. `returning` marks stay; unify-revisit drops those of items that left.
 */
export function releaseAll(key: ItemKey): ItemKey[] {
  const next: ItemKey[] = [];
  for (const h of holdsOf(key)) {
    const n = release(h.env, h.service, key);
    if (n !== null) next.push(n);
  }
  return [...new Set(next)];
}

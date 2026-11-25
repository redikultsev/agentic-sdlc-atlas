/**
 * What the revisit pass's three scripts share: the marks it sets, the engine's view of
 * every item with a run in the last 30 days, the items the engine holds a state for, and
 * the host CLI.
 */

import { items, type ItemWindow, state } from 'archon:script';
import { archonCommand } from '../../.shared/host.ts';
import { type ItemKey, keyOfStateSlug, parseKey } from '../../.shared/item.ts';
import { STATES, type State } from '../../.shared/states.ts';
import type { WorkDoc } from '../../.shared/work.ts';

/** Marks this pass sets; not yet in `.shared/states.ts` MARKS (unify-ping ensures them). */
export const MARKS_REVISIT = {
  needsAttention: 'pipeline:needs-attention',
  setAside: 'pipeline:set-aside',
} as const;

export type EngineItem = ItemWindow['items'][number];

/** Every item with a run in the window, by run key (`issue-<n>`, `item-<key>`), all pages. */
export function engineItems(since = '30d'): Map<string, EngineItem> {
  const found = new Map<string, EngineItem>();
  let page = items({ since, limit: 100 });
  for (let pages = 0; pages < 50; pages++) {
    for (const entry of page.items) found.set(entry.item.key, entry);
    if (page.next === null) break;
    page = items({ after: page.next });
  }
  return found;
}

export interface HeldItem {
  readonly key: ItemKey;
  /** The engine's state, or null when the document holds none (or one this pack does not know). */
  readonly state: State | null;
  readonly flags: readonly string[];
}

/** Every item with a `work/<key>` document in the engine's store, in key order. */
export function workItems(): HeldItem[] {
  const held: HeldItem[] = [];
  for (const found of state.listValues('work/')) {
    const key = keyOfStateSlug(found.name.slice('work/'.length));
    if (key === null) continue;
    const doc = (found.value ?? {}) as Partial<WorkDoc>;
    const known = typeof doc.state === 'string' && doc.state in STATES ? (doc.state as State) : null;
    held.push({ key, state: known, flags: doc.flags ?? [] });
  }
  return held.sort((a, b) => a.key.localeCompare(b.key, 'en', { numeric: true }));
}

/** One host CLI command that prints JSON; returns it with the exit code. */
export function hostCommand(args: readonly string[]): { code: number; json: unknown; text: string } {
  const result = Bun.spawnSync([...archonCommand(), ...args], { env: process.env, stdout: 'pipe', stderr: 'pipe' });
  const text = result.stdout.toString().trim();
  let json: unknown = null;
  try {
    json = text === '' ? null : (JSON.parse(text) as unknown);
  } catch {
    json = null;
  }
  return { code: result.exitCode, json, text: text || result.stderr.toString().trim() };
}

export function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

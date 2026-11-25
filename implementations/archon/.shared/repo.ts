/**
 * The repository and the work item a run is about.
 *
 * Archon gives a script neither: the repository comes from the pack settings
 * `repo_host` and `repo_path`, the item from the run input `number`, which holds the
 * item's key (`12`, `#12` or `PROJ-123`; the name is from before keys). Every workflow
 * declares both inputs, so every script reads them the same way. The repository is the
 * code host's (PRs, checks, merges); the item is the tracker's, reached through
 * `connector.ts`.
 */

import { input, refuse } from 'archon:script';
import { asKey, type ItemKey, keySlug, parseKey } from './item.ts';

export interface Repo {
  readonly host: string;
  readonly path: string;
}

/** A numbered thing on the code host: a PR, or an issue where the tracker is the code host. */
export interface IssueRef {
  readonly repo: Repo;
  readonly number: number;
}

export function repoOf(host: string | undefined, path: string | undefined): Repo {
  if (!host || !path || !path.includes('/')) throw new Error('repo_host and repo_path must name a repository');
  return { host, path };
}

/** The item key bound to this node as `number`, or a refusal. */
export function itemOf(raw: string | undefined): ItemKey | undefined {
  const key = parseKey(raw ?? '');
  if (key === null) {
    refuse(`the run has no item key (got '${raw ?? ''}')`);
    return undefined;
  }
  return key;
}

/** The engine's key for the runs of an item; it lives in `item.ts`, which the read server shares. */
export { runKey } from './item.ts';

/** The branch that collects an item's change. */
export function itemBranch(item: ItemKey | number): string {
  return `pipeline/${keySlug(asKey(item))}`;
}

/** Inputs every pack workflow declares, read once per script. */
export function runInputs(): { readonly repo: Repo; readonly key: ItemKey | undefined } {
  const repo = repoOf(input('repo_host'), input('repo_path'));
  const raw = input('number');
  return { repo, key: raw === undefined || raw === '' ? undefined : itemOf(raw) };
}

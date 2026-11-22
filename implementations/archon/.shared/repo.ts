/**
 * The repository and the work item a run is about.
 *
 * Archon gives a script neither: the repository comes from the pack settings
 * `repo_host` and `repo_path`, the item number from the run input `number`. Every
 * workflow declares both inputs, so every script reads them the same way.
 */

import { input, refuse } from 'archon:script';

export interface Repo {
  readonly host: string;
  readonly path: string;
}

export interface IssueRef {
  readonly repo: Repo;
  readonly number: number;
}

export function repoOf(host: string | undefined, path: string | undefined): Repo {
  if (!host || !path || !path.includes('/')) throw new Error('repo_host and repo_path must name a repository');
  return { host, path };
}

/** The item number bound to this node as `number`, or a refusal. */
export function itemNumber(raw: string | undefined): number | undefined {
  const value = Number((raw ?? '').trim());
  if (!Number.isInteger(value) || value <= 0) {
    refuse(`the run has no item number (got '${raw ?? ''}')`);
    return undefined;
  }
  return value;
}

/** The engine item key of an issue: every run for it carries this key. */
export function itemKey(number: number): string {
  return `issue-${number}`;
}

/** The branch that collects an item's change. */
export function itemBranch(number: number): string {
  return `pipeline/${number}`;
}

/** Inputs every pack workflow declares, read once per script. */
export function runInputs(): { readonly repo: Repo; readonly number: number | undefined } {
  const repo = repoOf(input('repo_host'), input('repo_path'));
  const raw = input('number');
  return { repo, number: raw === undefined || raw === '' ? undefined : itemNumber(raw) };
}

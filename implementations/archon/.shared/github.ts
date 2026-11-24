/**
 * What Archon's forge does not offer on the code host, through the GitHub API with the
 * host's `gh`: PR search, updating a PR branch, and the login the pipeline acts as. Issue
 * operations go through `connector.ts`. Works only where the container's `gh` is logged in or the run has
 * Archon's App token; unify-ping checks it before anything relies on it.
 */

import { issueNumber, type ItemKey } from './item.ts';
import type { Repo } from './repo.ts';

function gh(args: readonly string[], body?: unknown): unknown {
  const full = ['gh', 'api', ...args, ...(body === undefined ? [] : ['--input', '-'])];
  const result = Bun.spawnSync(full, {
    stdin: body === undefined ? undefined : new TextEncoder().encode(JSON.stringify(body)),
    stdout: 'pipe',
    stderr: 'pipe',
    env: process.env,
  });
  if (result.exitCode !== 0) {
    const first = result.stderr.toString().trim().split('\n')[0] ?? '';
    throw new Error(`gh api ${args[0] ?? ''} failed: ${first}`);
  }
  const text = result.stdout.toString().trim();
  return text === '' ? null : (JSON.parse(text) as unknown);
}

export interface FoundPr {
  readonly number: number;
  readonly title: string;
  readonly state: 'open' | 'closed';
  readonly merged: boolean;
  readonly url: string;
}

/** PRs that mention the item's key (body, title, "Part of"), open or merged. */
export function prsMentioning(repo: Repo, key: ItemKey): FoundPr[] {
  const term = issueNumber(key) ?? key;
  const q = encodeURIComponent(`repo:${repo.path} is:pr ${term} in:title,body`);
  const found = gh([`search/issues?q=${q}&per_page=30`]) as { items: { number: number; title: string; state: 'open' | 'closed'; html_url: string; pull_request?: { merged_at: string | null } }[] };
  return found.items.map(item => ({
    number: item.number,
    title: item.title,
    state: item.state,
    merged: item.pull_request?.merged_at != null,
    url: item.html_url,
  }));
}

/** Bring a PR branch up to date with its base on GitHub's side (merge commit). */
export function updatePrBranch(repo: Repo, pr: number, expectedHead: string): void {
  gh(['-X', 'PUT', `repos/${repo.path}/pulls/${pr}/update-branch`], { expected_head_sha: expectedHead });
}

/** The login the pipeline's token acts as. */
export function selfLogin(): string {
  return (gh(['user']) as { login: string }).login;
}

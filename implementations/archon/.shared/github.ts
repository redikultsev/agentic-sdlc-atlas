/**
 * What Archon's forge does not offer, through the GitHub API with the host's `gh`:
 * listing issues by what they lack, sub-issues, "blocked by" links, PR search, and
 * updating a PR branch. Works only where the container's `gh` is logged in or the run has
 * Archon's App token; unify-ping checks it before anything relies on it.
 */

import type { IssueRef, Repo } from './repo.ts';

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

interface GhIssue {
  readonly number: number;
  readonly id: number;
  readonly title: string;
  readonly labels: readonly { name: string }[];
  readonly pull_request?: unknown;
  readonly created_at: string;
  readonly user: { login: string } | null;
}

/** Open issues (not PRs), oldest first, one page of up to 100. */
export function openIssuesOldestFirst(repo: Repo): GhIssue[] {
  const page = gh([`repos/${repo.path}/issues?state=open&sort=created&direction=asc&per_page=100`]) as GhIssue[];
  return page.filter(issue => issue.pull_request === undefined);
}

/** The REST id of an issue, which the sub-issue and dependency endpoints take. */
export function issueId(ref: IssueRef): number {
  return (gh([`repos/${ref.repo.path}/issues/${ref.number}`]) as GhIssue).id;
}

/** Make `child` a sub-issue of `parent`; adding one that is already there is not an error. */
export function addSubIssue(parent: IssueRef, child: IssueRef): void {
  try {
    gh(['-X', 'POST', `repos/${parent.repo.path}/issues/${parent.number}/sub_issues`], { sub_issue_id: issueId(child) });
  } catch (error) {
    if (!/already|exists|422/i.test((error as Error).message)) throw error;
  }
}

/** Record that `issue` is blocked by `blocker` (GitHub issue dependencies). */
export function addBlockedBy(issue: IssueRef, blocker: IssueRef): void {
  try {
    gh(['-X', 'POST', `repos/${issue.repo.path}/issues/${issue.number}/dependencies/blocked_by`], { issue_id: issueId(blocker) });
  } catch (error) {
    if (!/already|exists|422/i.test((error as Error).message)) throw error;
  }
}

export interface FoundPr {
  readonly number: number;
  readonly title: string;
  readonly state: 'open' | 'closed';
  readonly merged: boolean;
  readonly url: string;
}

/** PRs that mention the issue number (body, title, closing keyword), open or merged. */
export function prsMentioning(ref: IssueRef): FoundPr[] {
  const q = encodeURIComponent(`repo:${ref.repo.path} is:pr ${ref.number} in:title,body`);
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

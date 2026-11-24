/**
 * What the merge scripts share (a copy of unify-round/scripts/lib/facts.ts): git on the
 * run's worktree, the PR of the item branch, and checks at a head. Every value comes in
 * as an argument: scripts read their inputs as literal `input()`.
 */

import { forge } from '../../../.shared/forge.ts';
import { git, gitOrThrow } from '../../../.shared/git.ts';
import type { ItemKey } from '../../../.shared/item.ts';
import { itemBranch, type IssueRef, type Repo } from '../../../.shared/repo.ts';

export function baseName(raw: string): string {
  return raw.trim() === '' ? 'main' : raw.trim();
}

/** Fetch one branch from origin; its commit, or null when origin has no such branch. */
export function fetchBranch(branch: string): string | null {
  const fetched = git('fetch', '--quiet', 'origin', `+refs/heads/${branch}:refs/remotes/origin/${branch}`);
  if (fetched.code !== 0) return null;
  const sha = git('rev-parse', `refs/remotes/origin/${branch}`);
  return sha.code === 0 ? sha.stdout : null;
}

/** The commit origin has for a branch right now, read from the remote itself. */
export function remoteHead(branch: string): string | null {
  const listed = git('ls-remote', '--heads', 'origin', branch);
  if (listed.code !== 0) throw new Error(`git ls-remote failed: ${listed.stderr}`);
  const line = listed.stdout.split('\n').find(l => l.endsWith(`refs/heads/${branch}`));
  return line ? line.split(/\s+/)[0] : null;
}

export function slugBranch(key: ItemKey, sliceId: string): string {
  return `${itemBranch(key)}-slice-${sliceId.replace(/[^A-Za-z0-9._-]/g, '-')}`;
}

/** The open PR whose head is the item branch, or null. */
export function itemPr(repo: Repo, key: ItemKey, base: string): { number: number; head: string; draft: boolean; body: string; title: string } | null {
  const view = forge('pr.view', {
    selector: { kind: 'head', repo, headRepo: repo, head: itemBranch(key), base, state: 'open' },
  });
  if (view === null || view.pr.state !== 'open') return null;
  return { number: view.pr.number, head: view.pr.head_revision ?? '', draft: view.pr.is_draft, body: view.body, title: view.title };
}

export interface ChecksResult {
  readonly state: 'green' | 'red' | 'pending' | 'none';
  readonly red: readonly string[];
  readonly pending: readonly string[];
  readonly revision: string;
}

function summarize(units: readonly { unit: { name: string }; state: string }[], revision: string, overall: string): ChecksResult {
  const red = units.filter(u => u.state === 'red').map(u => u.unit.name);
  const pending = units.filter(u => u.state === 'pending' || u.state === 'unknown').map(u => u.unit.name);
  const state = overall === 'none' ? 'none' : red.length > 0 ? 'red' : pending.length > 0 ? 'pending' : 'green';
  return { state, red, pending, revision };
}

export function prChecks(ref: IssueRef): ChecksResult {
  const read = forge('checks.state', { ref });
  const scope = read.required ?? read;
  return summarize(scope.units, read.revision, scope.summary.state);
}

export function commitChecks(repo: Repo, revision: string): ChecksResult {
  const read = forge('checks.commit', { repo, at: { kind: 'revision', revision } });
  return summarize(read.units, read.revision, read.summary.state);
}

/** Poll a PR's checks until none is pending, the head moves, or the deadline passes. */
export function awaitChecks(ref: IssueRef, head: string, deadline: number): ChecksResult & { readonly timedOut: boolean; readonly moved: boolean } {
  for (;;) {
    const result = prChecks(ref);
    if (result.revision !== head) return { ...result, timedOut: false, moved: true };
    if (result.state !== 'pending') return { ...result, timedOut: false, moved: false };
    if (Date.now() > deadline) return { ...result, timedOut: true, moved: false };
    Bun.sleepSync(30_000);
  }
}

/** Files changed between the base and a head, with their status letters. */
export function changedFiles(base: string, head: string): { status: string; path: string }[] {
  const out = gitOrThrow('diff', '--name-status', '--no-renames', `${base}...${head}`);
  return out === '' ? [] : out.split('\n').map(line => {
    const [status, ...rest] = line.split('\t');
    return { status: status.trim(), path: rest.join('\t') };
  });
}

/** Lines added and removed between the base and a head. */
export function changedLines(base: string, head: string): number {
  const out = gitOrThrow('diff', '--numstat', `${base}...${head}`);
  let total = 0;
  for (const line of out.split('\n')) {
    const [added, removed] = line.split('\t');
    total += (Number(added) || 0) + (Number(removed) || 0);
  }
  return total;
}

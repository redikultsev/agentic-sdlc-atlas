/**
 * The candidate of a pre-merge environment and what an approval is bound to (decision 49):
 * the base branch with the item's branch (or several items' branches, one build) merged
 * in, as a commit pushed to `pipeline/candidate/<env>/<service>`, and its git tree
 * restricted to the service's paths. After the merge, the base's restricted tree is
 * compared with the approved one: equal, the release goes; different, the files that
 * differ are listed in two groups, the project's insignificant paths and the rest.
 *
 * Merging uses `git merge-tree --write-tree`, so the checkout is never touched.
 */

import { git, gitOrThrow } from './git.ts';
import { globMatch } from './policy.ts';

/** The commit of base + branches, or the files that conflict. */
export function cutCandidate(base: string, branches: readonly string[], env: string, service: string): { readonly commit: string } | { readonly conflict: string } {
  gitOrThrow('fetch', '--quiet', 'origin', base, ...branches.map(b => `refs/heads/${b}:refs/remotes/origin/${b}`));
  let tip = gitOrThrow('rev-parse', `origin/${base}`);
  const parents = [tip];
  for (const branch of branches) {
    const merged = git('merge-tree', '--write-tree', '--name-only', tip, `origin/${branch}`);
    if (merged.code !== 0) return { conflict: `${branch} conflicts with ${base}: ${merged.stdout.split('\n').slice(1).filter(Boolean).join(', ')}` };
    const tree = merged.stdout.split('\n')[0] ?? '';
    const head = gitOrThrow('rev-parse', `origin/${branch}`);
    parents.push(head);
    tip = gitOrThrow('commit-tree', tree, '-p', tip, '-p', head, '-m', `pipeline candidate: ${base} + ${branch}`);
  }
  const ref = `refs/heads/pipeline/candidate/${env}/${service}`;
  gitOrThrow('push', '--quiet', '--force', 'origin', `${tip}:${ref}`);
  const remote = gitOrThrow('ls-remote', 'origin', ref).split(/\s+/)[0] ?? '';
  if (remote !== tip) throw new Error(`origin ${ref} reads ${remote || 'nothing'} after pushing ${tip}`);
  return { commit: tip };
}

/** Path → blob of every file under the service's paths in a commit or tree. */
export function filesOf(treeish: string, paths: readonly string[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of gitOrThrow('ls-tree', '-r', '--full-tree', treeish).split('\n')) {
    const m = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(line);
    if (m && paths.some(p => globMatch(p, m[2]))) out.set(m[2], m[1]);
  }
  return out;
}

/** One digest for the restricted tree: what the approval names. */
export function restrictedTree(treeish: string, paths: readonly string[]): string {
  const files = [...filesOf(treeish, paths).entries()].sort(([a], [b]) => a.localeCompare(b));
  const hasher = new Bun.CryptoHasher('sha256');
  for (const [path, blob] of files) hasher.update(`${blob} ${path}\n`);
  return hasher.digest('hex').slice(0, 40);
}

/** The files that differ between two restricted trees, split by the project's insignificant paths. */
export function treeDifference(approved: Map<string, string>, merged: Map<string, string>, insignificant: readonly string[]): { readonly insignificant: string[]; readonly rest: string[] } {
  const paths = new Set([...approved.keys(), ...merged.keys()]);
  const differ = [...paths].filter(p => approved.get(p) !== merged.get(p)).sort();
  const minor = differ.filter(p => insignificant.some(g => globMatch(g, p)));
  return { insignificant: minor, rest: differ.filter(p => !minor.includes(p)) };
}

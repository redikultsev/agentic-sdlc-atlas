/**
 * Put the slice's branch in this child's worktree: an existing remote slice branch is
 * continued (its progress file tells a fresh session where it stopped); otherwise the
 * branch starts from the item branch, or from the base when the item has none yet.
 */

import { emit, input, refuse } from 'archon:script';
import { existsSync } from 'node:fs';
import { git, gitOrThrow } from '../../.shared/git.ts';
import { nullableJson, isObject } from '../../.shared/inputs.ts';

function fetch(branch: string): string | null {
  const fetched = git('fetch', '--quiet', 'origin', `+refs/heads/${branch}:refs/remotes/origin/${branch}`);
  if (fetched.code !== 0) return null;
  const sha = git('rev-parse', `refs/remotes/origin/${branch}`);
  return sha.code === 0 ? sha.stdout : null;
}

try {
  const slice = nullableJson(input('slice'));
  if (!isObject(slice) || typeof slice.branch !== 'string' || typeof slice.item_branch !== 'string' || typeof slice.base !== 'string') {
    throw new Error('the slice input is not a frontier slice');
  }
  const own = slice.fix === true ? null : fetch(slice.branch);
  const start = own ?? fetch(slice.item_branch) ?? fetch(slice.base);
  if (start === null) throw new Error(`origin has none of ${slice.branch}, ${slice.item_branch}, ${slice.base}`);
  gitOrThrow('checkout', '--quiet', '-B', slice.branch, start);
  const progress = String(slice.progress);
  emit({
    branch: slice.branch,
    start,
    continued: own !== null,
    progress,
    has_progress: existsSync(progress),
    brief: String(slice.brief ?? ''),
    id: String(slice.id ?? ''),
  });
} catch (error) {
  refuse(error instanceof Error ? error.message : String(error));
}

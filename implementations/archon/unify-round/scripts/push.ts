/** Push the joined item branch to origin and read the remote head back. */

import { emit, input } from 'archon:script';
import { git } from '../../.shared/git.ts';
import { bound, run } from './lib/item.ts';
import { remoteHead } from './lib/facts.ts';

run(() => {
  const joined = bound<{ head: string }>(input('join'));
  const branch = input('branch').trim();
  if (joined === null || branch === '') throw new Error('join left no head to push');
  if (remoteHead(branch) !== joined.head) {
    const pushed = git('push', '--quiet', 'origin', `${joined.head}:refs/heads/${branch}`);
    if (pushed.code !== 0) throw new Error(`git push ${branch} failed: ${pushed.stderr}`);
  }
  const after = remoteHead(branch);
  if (after !== joined.head) throw new Error(`origin has ${after ?? 'no'} ${branch} after the push, expected ${joined.head}`);
  emit({ branch, head: after });
});

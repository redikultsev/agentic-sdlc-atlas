/**
 * The fingerprint of a PR's own diff (decision 33): `git patch-id --stable` of
 * merge-base..head. A rebase that leaves the diff and its context unchanged keeps it;
 * a change on the base right next to the diff changes it, and then only the stale checks
 * run again. Verdicts are recorded with it in `work/<n>`.
 */

import { gitOrThrow } from './git.ts';

export function fingerprint(base: string, head: string): string {
  const mergeBase = gitOrThrow('merge-base', base, head);
  const diff = Bun.spawnSync(['git', 'diff', '--no-color', mergeBase, head], { stdout: 'pipe', stderr: 'pipe' });
  if (diff.exitCode !== 0) throw new Error(`git diff failed: ${diff.stderr.toString().trim()}`);
  if (diff.stdout.length === 0) return 'empty';
  const id = Bun.spawnSync(['git', 'patch-id', '--stable'], { stdin: diff.stdout, stdout: 'pipe', stderr: 'pipe' });
  const out = id.stdout.toString().trim().split(/\s+/)[0] ?? '';
  if (id.exitCode !== 0 || out === '') throw new Error('git patch-id gave no id');
  return out;
}

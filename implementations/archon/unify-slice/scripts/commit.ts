/**
 * Commit what the Implementer left in the worktree, push the slice branch and read the
 * remote head back. The slice ends `pushed` or `failed(reason)`: an Implementer that
 * stopped, or one that changed nothing, is a failed slice; a scope stop (decision 37)
 * fails with the reason `scope: …` so the round asks the Operator instead of retrying.
 */

import { emit, input, refuse } from 'archon:script';
import { git, gitOrThrow } from '../../.shared/git.ts';
import { nullableJson, isObject } from '../../.shared/inputs.ts';

function remoteHead(branch: string): string | null {
  const listed = git('ls-remote', '--heads', 'origin', branch);
  if (listed.code !== 0) throw new Error(`git ls-remote failed: ${listed.stderr}`);
  const line = listed.stdout.split('\n').find(l => l.endsWith(`refs/heads/${branch}`));
  return line ? line.split(/\s+/)[0] : null;
}

try {
  const prepared = nullableJson(input('prepare'));
  const done = nullableJson(input('implement'));
  if (!isObject(prepared) || !isObject(done)) throw new Error('prepare or implement left no result');
  const branch = String(prepared.branch);
  const start = String(prepared.start);
  const stepsSkipped = Array.isArray(done.steps_skipped) ? done.steps_skipped.map(String) : [];
  const discoveries = Array.isArray(done.discoveries) ? done.discoveries : [];
  const summary = String(done.summary ?? '');
  const end = (status: 'pushed' | 'failed', reason: string, head: string | null): void =>
    emit({ status, reason, branch, head, steps_skipped: stepsSkipped, discoveries, summary });

  if (done.branch !== branch) {
    end('failed', `the Implementer reports branch ${String(done.branch)}, the slice is on ${branch}`, null);
  } else if (done.status === 'scope') {
    end('failed', `scope: ${String(done.scope_question ?? done.reason)}`, null);
  } else if (done.status !== 'done') {
    end('failed', String(done.reason || 'the Implementer stopped'), null);
  } else {
    const current = gitOrThrow('rev-parse', '--abbrev-ref', 'HEAD');
    if (current !== branch) throw new Error(`the worktree is on ${current}, not ${branch}`);
    gitOrThrow('add', '--all');
    if (git('diff', '--cached', '--quiet').code !== 0) {
      gitOrThrow('commit', '--quiet', '-m', `slice ${String(prepared.id)}: ${summary.split('\n')[0].slice(0, 60) || 'implement'}`);
    }
    const head = gitOrThrow('rev-parse', 'HEAD');
    if (head === start) {
      end('failed', 'the slice changed nothing', null);
    } else {
      const before = remoteHead(branch);
      if (before !== head) {
        // The slice branch belongs to the pipeline; a fix slice restarts it from the item branch.
        const pushed = git('push', '--quiet', `--force-with-lease=refs/heads/${branch}:${before ?? ''}`, 'origin', `${head}:refs/heads/${branch}`);
        if (pushed.code !== 0) throw new Error(`git push ${branch} failed: ${pushed.stderr}`);
      }
      const after = remoteHead(branch);
      if (after !== head) throw new Error(`origin has ${after ?? 'no'} ${branch} after the push, expected ${head}`);
      end('pushed', '', head);
    }
  }
} catch (error) {
  refuse(error instanceof Error ? error.message : String(error));
}

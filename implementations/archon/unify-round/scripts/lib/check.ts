/**
 * Running the project's check command (`.pipeline/project.yaml` check.command) at a
 * commit, in a throwaway worktree, and reading which test ids failed. The id convention
 * is the common runner output: a line `FAIL <id>`, `FAILED <id>` or TAP `not ok <n> - <id>`.
 * A failing command that names no id fails as one id, `check-exit-<code>`.
 */

import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { git, gitOrThrow } from '../../../.shared/git.ts';

export interface CheckRun {
  readonly commit: string;
  readonly exitCode: number | null;
  readonly failing: string[];
  readonly missingTools: string[];
  readonly tail: string;
  readonly timedOut: boolean;
}

const FAIL_LINE = /^\s*(?:FAIL|FAILED|✗|not ok(?:\s+\d+)?(?:\s+-)?)\s+(.+?)\s*$/;

export function failingIds(output: string, exitCode: number | null): string[] {
  const ids = new Set<string>();
  for (const line of output.split('\n')) {
    const match = FAIL_LINE.exec(line);
    if (match) ids.add(match[1].slice(0, 200));
  }
  if (ids.size === 0 && exitCode !== 0) ids.add(`check-exit-${exitCode ?? 'killed'}`);
  return [...ids].sort();
}

export function missingTools(toolchain: readonly string[]): string[] {
  return toolchain.filter(tool => {
    const name = tool.trim().split(/\s+/)[0];
    return name !== '' && Bun.spawnSync(['sh', '-c', `command -v '${name.replaceAll("'", '')}'`]).exitCode !== 0;
  });
}

export function runCheckAt(commit: string, command: string, timeoutMinutes: number, toolchain: readonly string[], scratch: string): CheckRun {
  const missing = missingTools(toolchain);
  if (missing.length > 0) {
    return { commit, exitCode: null, failing: [], missingTools: missing, tail: '', timedOut: false };
  }
  const dir = mkdtempSync(join(scratch, 'base-check-'));
  const tree = join(dir, 'tree');
  gitOrThrow('worktree', 'add', '--detach', '--quiet', tree, commit);
  try {
    const result = Bun.spawnSync(['sh', '-c', command], {
      cwd: tree,
      stdout: 'pipe',
      stderr: 'pipe',
      env: process.env,
      timeout: Math.max(1, timeoutMinutes) * 60_000,
    });
    const output = `${result.stdout.toString()}\n${result.stderr.toString()}`;
    const timedOut = result.signalCode !== null && result.signalCode !== undefined;
    return {
      commit,
      exitCode: result.exitCode,
      failing: timedOut ? ['check-timeout'] : failingIds(output, result.exitCode),
      missingTools: [],
      tail: output.trim().split('\n').slice(-20).join('\n'),
      timedOut,
    };
  } finally {
    git('worktree', 'remove', '--force', tree);
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Run the project's test suite (`check.command` in `.pipeline/project.yaml` on the base)
 * through the git and gh guard, as agents run it, and report what the guard refused
 * (trial 29: the guard broke the project's own tests). The guard is present when
 * `guard_dir` is set (it is put first on PATH) or when the `git` or `gh` found on PATH is a
 * script wrapper rather than the binary. Runs in this checkout, bounded by
 * `check.timeoutMinutes`. Never fails the node: a red suite is a finding of the report.
 *
 * Bound inputs: the pack setting INPUTS_BASE; the workflow's INPUTS_GUARD_DIR.
 */

import { readFileSync } from 'node:fs';
import { emit, input, refuse } from 'archon:script';
import { projectPolicy } from '../../.shared/policy.ts';

const REFUSAL = /\b(refus\w*|not allowed|blocked by|denied by|guard)\b/i;

/** The host's own environment, read by name: PATH is the host's, not a run input. */
function hostEnv(name: string): string {
  return process.env[name] ?? '';
}

function isWrapper(path: string | null): boolean {
  if (path === null) return false;
  try {
    return readFileSync(path).subarray(0, 2).toString() === '#!';
  } catch {
    return false;
  }
}

function main(): void {
  const base = input('base').trim() || 'main';
  const guardDir = input('guard_dir').trim();
  const policy = projectPolicy(base);
  const command = policy.check.command.trim();
  const hostPath = hostEnv('PATH');
  const env = { ...process.env, PATH: guardDir === '' ? hostPath : `${guardDir}:${hostPath}` };
  const gitPath = Bun.which('git', { PATH: env.PATH });
  const ghPath = Bun.which('gh', { PATH: env.PATH });
  const guard = guardDir !== '' || isWrapper(gitPath) || isWrapper(ghPath);
  const where = { git: gitPath, gh: ghPath };
  if (command === '') {
    emit({ ran: false, ok: null, command, guard, where, exit: null, timed_out: false, refusals: [], tail: [], note: 'check.command is empty in .pipeline/project.yaml on the base (or the file is missing)' });
    return;
  }
  const timeoutMs = Math.max(1, policy.check.timeoutMinutes) * 60_000;
  const result = Bun.spawnSync(['sh', '-c', command], { env, stdout: 'pipe', stderr: 'pipe', timeout: timeoutMs });
  const lines = `${result.stdout.toString()}\n${result.stderr.toString()}`.split('\n').filter(line => line.trim() !== '');
  const refusals = lines.filter(line => REFUSAL.test(line)).slice(0, 20);
  const timedOut = result.exitCode === null || result.signalCode !== null;
  emit({
    ran: true,
    ok: result.exitCode === 0 && refusals.length === 0,
    command,
    guard,
    where,
    exit: result.exitCode,
    timed_out: timedOut,
    refusals,
    tail: lines.slice(-15),
    note: guard ? 'ran through the guard' : 'no guard found on PATH: the suite ran without one',
  });
}

try {
  main();
} catch (error) {
  refuse(`unify-ping tests: ${error instanceof Error ? error.message : String(error)}`);
}

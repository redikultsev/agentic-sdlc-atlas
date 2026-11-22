/**
 * `gh api` access: what `.shared/github.ts` needs for sub-issues, blocked-by links, PR
 * search and branch updates, and what pipeline-deploy needs to open a revert. Reports the
 * login the token acts as and whether it matches the pack setting `pipeline_login`, and
 * whether it can read the repository. Never fails the node: the report shows the result.
 *
 * Bound inputs: INPUTS_HOST, INPUTS_PATH from the repo node; the pack setting
 * INPUTS_PIPELINE_LOGIN.
 */

import { emit, input, refuse } from 'archon:script';
import { selfLogin } from '../../.shared/github.ts';

function readRepo(path: string): string | null {
  const result = Bun.spawnSync(['gh', 'api', `repos/${path}`, '--jq', '.full_name'], { stdout: 'pipe', stderr: 'pipe', env: process.env });
  if (result.exitCode === 0) return null;
  return result.stderr.toString().trim().split('\n')[0] ?? `exit ${String(result.exitCode)}`;
}

function main(): void {
  const host = input('host');
  const path = input('path');
  const expected = input('pipeline_login').trim();
  let login: string | null = null;
  let error: string | null = null;
  try {
    login = selfLogin();
  } catch (failure) {
    error = failure instanceof Error ? failure.message : String(failure);
  }
  const repoError = login === null ? null : readRepo(path);
  const loginMatches = expected === '' || login === null ? null : login.toLowerCase() === expected.toLowerCase();
  emit({
    ok: login !== null && repoError === null && loginMatches !== false,
    host,
    login,
    expected_login: expected,
    login_matches: loginMatches,
    repo_error: repoError,
    error,
  });
}

try {
  main();
} catch (error) {
  refuse(`pipeline-ping access: ${error instanceof Error ? error.message : String(error)}`);
}

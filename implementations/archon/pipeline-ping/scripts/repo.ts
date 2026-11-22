/**
 * The repository the checks run against: the run's `repo_host` and `repo_path` when the
 * Operator passed them, otherwise the checkout's `origin` remote. A by-hand ping needs no
 * inputs, so `archon workflow run <pack>:pipeline-ping` keeps working as an install check.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST and INPUTS_REPO_PATH.
 */

import { emit, input, refuse } from 'archon:script';
import { git } from '../../.shared/git.ts';

/** host and owner/name from an ssh or https remote URL, or null. */
function parseRemote(url: string): { host: string; path: string } | null {
  const trimmed = url.trim().replace(/\.git$/, '');
  const ssh = /^[\w.-]+@([\w.-]+):([\w.-]+\/[\w.-]+)$/.exec(trimmed);
  if (ssh) return { host: ssh[1], path: ssh[2] };
  const web = /^(?:https?|ssh|git):\/\/(?:[^@/]+@)?([\w.-]+)(?::\d+)?\/([\w.-]+\/[\w.-]+)$/.exec(trimmed);
  if (web) return { host: web[1], path: web[2] };
  return null;
}

function main(): void {
  const host = input('repo_host').trim();
  const path = input('repo_path').trim();
  if (host !== '' && path.includes('/')) {
    emit({ host, path, source: 'inputs' });
    return;
  }
  const remote = git('remote', 'get-url', 'origin');
  const parsed = remote.code === 0 ? parseRemote(remote.stdout) : null;
  if (parsed === null) {
    refuse('pipeline-ping: pass repo_host and repo_path, or run it in a checkout whose origin remote names the repository');
    return;
  }
  emit({ ...parsed, source: 'origin remote' });
}

try {
  main();
} catch (error) {
  refuse(`pipeline-ping repo: ${error instanceof Error ? error.message : String(error)}`);
}

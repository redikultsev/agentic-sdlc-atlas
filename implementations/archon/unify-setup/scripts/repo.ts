/**
 * The repository the map is proposed to: the run's `repo_host` and `repo_path` when the
 * Operator passed them, otherwise the checkout's `origin` remote (as unify-ping does).
 *
 * Inputs: repo_host, repo_path. Emits `{ host, path, source }`.
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
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

async function main(): Promise<void> {
  const host = input('repo_host').trim();
  const path = input('repo_path').trim();
  if (host !== '' && path.includes('/')) {
    emit({ host, path, source: 'inputs' });
    return;
  }
  const remote = git('remote', 'get-url', 'origin');
  const parsed = remote.code === 0 ? parseRemote(remote.stdout) : null;
  if (parsed === null) throw new Error('pass repo_host and repo_path, or run it in a checkout whose origin remote names the repository');
  emit({ ...parsed, source: 'origin remote' });
}

await script('unify-setup repo', main);

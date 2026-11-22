/**
 * What the Researcher and the Planner read: the approved spec from the item branch, its
 * criterion ids, the base commit the plan is checked against, the item's size, and the
 * request with trusted comments and rulings as marked data.
 *
 * Inputs: repo_host, repo_path, number, base, pipeline_login.
 * Emits `{ context, spec, criteria, base_commit, size }`.
 */

import { emit, forge, input, refuse } from 'archon:script';
import { git, gitOrThrow } from '../../.shared/git.ts';
import { selfLogin } from '../../.shared/github.ts';
import { trustedAuthors } from '../../.shared/policy.ts';
import { itemBranch, runInputs } from '../../.shared/repo.ts';
import { itemContext } from '../../.shared/stage.ts';

function main(): void {
  const { repo, number } = runInputs();
  if (number === undefined) return;
  const ref = { repo, number };
  const base = input('base') || 'main';
  const branch = itemBranch(number);
  gitOrThrow('fetch', '--quiet', 'origin', base);
  const fetched = git('fetch', '--quiet', 'origin', `refs/heads/${branch}:refs/remotes/origin/${branch}`);
  if (fetched.code !== 0) throw new Error(`the item branch ${branch} is not on the remote: no approved spec to plan from`);
  const shown = git('show', `origin/${branch}:.pipeline/work/${number}/spec.md`);
  if (shown.code !== 0) throw new Error(`${branch} has no .pipeline/work/${number}/spec.md`);
  const criteria = [...shown.stdout.matchAll(/^### (AC\d+)\./gm)].map(m => m[1]);
  const labels = forge('workitem.view', { ref }).labels ?? [];
  const size = (labels.find(l => l.startsWith('size:')) ?? 'size:m').slice(5).toUpperCase();
  emit({
    context: itemContext(ref, trustedAuthors(base), input('pipeline_login') || selfLogin()),
    spec: shown.stdout,
    criteria,
    base_commit: gitOrThrow('rev-parse', `origin/${base}`),
    size,
  });
}

try {
  main();
} catch (error) {
  refuse(`pipeline-plan gather: ${error instanceof Error ? error.message : String(error)}`);
}

/**
 * What the Researcher and the Planner read: the approved spec from the item branch, its
 * criterion ids, the base commit the plan is checked against, the item's size, and the
 * request with trusted comments and rulings as marked data; and whether the project
 * declares toggles in `.pipeline/project.yaml` (decision 61), as a fact for the Planner
 * and a flag for check-plan. A project.yaml that does not parse counts as no toggles, and
 * the fact says why.
 *
 * Inputs: repo_host, repo_path, number, base, pipeline_login.
 * Emits `{ context, spec, criteria, base_commit, size, toggles, toggles_declared }`.
 */

import { emit, input } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { git, gitOrThrow } from '../../.shared/git.ts';
import { selfLogin } from '../../.shared/github.ts';
import { trustedAuthors } from '../../.shared/policy.ts';
import { readDeploys } from '../../.shared/environments.ts';
import { keySlug } from '../../.shared/item.ts';
import { itemBranch, runInputs } from '../../.shared/repo.ts';
import { itemContext } from '../../.shared/stage.ts';

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const base = input('base') || 'main';
  const branch = itemBranch(key);
  gitOrThrow('fetch', '--quiet', 'origin', base);
  const fetched = git('fetch', '--quiet', 'origin', `refs/heads/${branch}:refs/remotes/origin/${branch}`);
  if (fetched.code !== 0) throw new Error(`the item branch ${branch} is not on the remote: no approved spec to plan from`);
  const shown = git('show', `origin/${branch}:.pipeline/work/${keySlug(key)}/spec.md`);
  if (shown.code !== 0) throw new Error(`${branch} has no .pipeline/work/${keySlug(key)}/spec.md`);
  const criteria = [...shown.stdout.matchAll(/^### (AC\d+)\./gm)].map(m => m[1]);
  const { labels } = await tracker().view(key);
  let declared = false;
  let toggles: string;
  try {
    const set = readDeploys(base).toggles;
    declared = set !== null;
    toggles = set !== null
      ? `The project declares toggles (.pipeline/project.yaml toggles.set: \`${set.set}\`, called as \`<cmd> <name> off\`). Name the toggle this change ships behind in \`toggle\` when it should ship behind one; null otherwise.`
      : 'The project declares no toggles in .pipeline/project.yaml: `toggle` must be null.';
  } catch (error) {
    toggles = `.pipeline/project.yaml does not parse (${error instanceof Error ? error.message : String(error)}), so no toggles count: \`toggle\` must be null.`;
  }
  const size = (labels.find(l => l.startsWith('size:')) ?? 'size:m').slice(5).toUpperCase();
  emit({
    context: await itemContext(key, trustedAuthors(base), input('pipeline_login') || selfLogin()),
    spec: shown.stdout,
    criteria,
    base_commit: gitOrThrow('rev-parse', `origin/${base}`),
    size,
    toggles,
    toggles_declared: declared,
  });
}

await script('unify-plan gather', main);

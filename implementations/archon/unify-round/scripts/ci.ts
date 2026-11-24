/**
 * CI at the PR head, waited for up to the check timeout in `.pipeline/project.yaml`.
 * Failures the base already has are not counted (review finding 7): a check red at the
 * base commit too, or an id recorded in `work/<key>` as failing at the base. A project with
 * no CI checks gets the project check command run at the head instead, so a missing CI is
 * never read as green.
 */

import { artifactsDir, emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { projectPolicy } from '../../.shared/policy.ts';
import { readItem } from './lib/item.ts';
import { runCheckAt } from './lib/check.ts';
import { awaitChecks, baseName, commitChecks } from './lib/facts.ts';

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  if (key === undefined) return;
  const policy = projectPolicy(baseName(input('base')));
  const pr = Number(input('pr'));
  const head = input('head').trim();
  const doc = readItem(key);
  const known = new Set(doc.base?.failing ?? []);
  const deadline = Date.now() + Math.max(1, policy.check.timeoutMinutes) * 60_000;
  const checks = awaitChecks({ repo, number: pr }, head, deadline);
  if (checks.moved) throw new Error(`the PR head moved from ${head} to ${checks.revision} while CI ran`);
  if (checks.state === 'none') {
    if (policy.check.command.trim() === '') {
      emit({ state: 'none', red: [], discounted: [], head, source: 'none' });
      return;
    }
    const local = runCheckAt(head, policy.check.command, policy.check.timeoutMinutes, policy.check.toolchain, artifactsDir());
    const red = local.failing.filter(id => !known.has(id));
    const discounted = local.failing.filter(id => known.has(id));
    emit({ state: local.missingTools.length > 0 ? 'none' : red.length > 0 ? 'red' : 'green', red, discounted, head, source: 'project-check' });
    return;
  }
  if (checks.timedOut) {
    emit({ state: 'timeout', red: [...checks.red], discounted: [], head, source: 'ci' });
    return;
  }
  const atBase = doc.base !== null && checks.red.length > 0 ? new Set(commitChecks(repo, doc.base.commit).red) : new Set<string>();
  const discounted = checks.red.filter(name => atBase.has(name) || known.has(name));
  const red = checks.red.filter(name => !discounted.includes(name));
  emit({ state: red.length > 0 ? 'red' : 'green', red, discounted, head, source: 'ci' });
}

await script('unify-round ci', main);

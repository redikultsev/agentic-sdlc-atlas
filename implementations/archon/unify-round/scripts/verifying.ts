/**
 * Move the item to Verifying and fix what the checks judge: the PR, its head, and the
 * diff fingerprint (decision 33). Runs after publish, or straight after Implementing in
 * verify mode (a found PR). Also reads the acceptance criteria ids from the spec on the
 * branch, so the Validator runs only for items that have them.
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { fingerprint } from '../../.shared/fingerprint.ts';
import { git } from '../../.shared/git.ts';
import { keySlug } from '../../.shared/item.ts';
import { moveState } from '../../.shared/states.ts';
import { docName } from '../../.shared/work.ts';
import { bound, readItem } from './lib/item.ts';
import { baseName, fetchBranch } from './lib/facts.ts';

const CRITERION = /^\s*[-*]\s*\**\[?([A-Z]{1,4}-?\d+)\]?\**[:.)\s]/;

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const base = baseName(input('base'));
  const routed = bound<{ mode: string }>(input('route'));
  const implementing = bound<{ ok: boolean }>(input('implementing'));
  const joined = bound<{ go: boolean }>(input('join'));
  const published = bound<{ pr: number; head: string }>(input('publish'));
  const none = { go: false, pr: 0, head: '', branch: '', fingerprint: '', criteria: [], has_criteria: false, spec: '' };
  if (routed === null || routed.mode === 'stop' || implementing === null) return emit(none);
  if (routed.mode === 'implement' && (joined === null || !joined.go || published === null)) return emit(none);
  const doc = readItem(key);
  if (doc.pr === null || doc.branch === null) throw new Error(`${docName(key)} has no PR to verify`);
  const head = fetchBranch(doc.branch);
  if (head === null) throw new Error(`origin has no ${doc.branch}`);
  if (published !== null && published.head !== head) throw new Error(`${doc.branch} moved from ${published.head} to ${head} after publish`);
  fetchBranch(base);
  const print = fingerprint(`origin/${base}`, head);
  const specPath = `.pipeline/work/${keySlug(key)}/spec.md`;
  const spec = git('show', `${head}:${specPath}`);
  const criteria = spec.code === 0
    ? [...new Set(spec.stdout.split('\n').map(l => CRITERION.exec(l)?.[1]).filter((id): id is string => id !== undefined))]
    : [];
  await moveState(key, ['implementing', 'verifying'], 'verifying');
  emit({ go: true, pr: doc.pr, head, branch: doc.branch, fingerprint: print, criteria, has_criteria: criteria.length > 0, spec: spec.code === 0 ? specPath : '' });
}

await script('unify-round verifying', main);

/**
 * Move the item to Verifying and fix what the checks judge: the PR, its head, and the
 * diff fingerprint (decision 33). Runs after publish, or straight after Implementing in
 * verify mode (a found PR). Also reads the acceptance criteria ids from the spec on the
 * branch, so the Validator runs only for items that have them.
 */

import { emit, input } from 'archon:script';
import { fingerprint } from '../../.shared/fingerprint.ts';
import { git } from '../../.shared/git.ts';
import { moveState } from '../../.shared/states.ts';
import { bound, readItem, run } from './lib/item.ts';
import { baseName, fetchBranch, itemRef } from './lib/facts.ts';

const CRITERION = /^\s*[-*]\s*\**\[?([A-Z]{1,4}-?\d+)\]?\**[:.)\s]/;

run(() => {
  const ref = itemRef(input('repo_host'), input('repo_path'), input('number'));
  const base = baseName(input('base'));
  const routed = bound<{ mode: string }>(input('route'));
  const implementing = bound<{ ok: boolean }>(input('implementing'));
  const joined = bound<{ go: boolean }>(input('join'));
  const published = bound<{ pr: number; head: string }>(input('publish'));
  const none = { go: false, pr: 0, head: '', branch: '', fingerprint: '', criteria: [], has_criteria: false, spec: '' };
  if (routed === null || routed.mode === 'stop' || implementing === null) return emit(none);
  if (routed.mode === 'implement' && (joined === null || !joined.go || published === null)) return emit(none);
  const doc = readItem(ref.number);
  if (doc.pr === null || doc.branch === null) throw new Error(`work/${ref.number} has no PR to verify`);
  const head = fetchBranch(doc.branch);
  if (head === null) throw new Error(`origin has no ${doc.branch}`);
  if (published !== null && published.head !== head) throw new Error(`${doc.branch} moved from ${published.head} to ${head} after publish`);
  fetchBranch(base);
  const print = fingerprint(`origin/${base}`, head);
  const specPath = `.pipeline/work/${ref.number}/spec.md`;
  const spec = git('show', `${head}:${specPath}`);
  const criteria = spec.code === 0
    ? [...new Set(spec.stdout.split('\n').map(l => CRITERION.exec(l)?.[1]).filter((id): id is string => id !== undefined))]
    : [];
  moveState(ref, ['implementing', 'verifying'], 'verifying');
  emit({ go: true, pr: doc.pr, head, branch: doc.branch, fingerprint: print, criteria, has_criteria: criteria.length > 0, spec: spec.code === 0 ? specPath : '' });
});

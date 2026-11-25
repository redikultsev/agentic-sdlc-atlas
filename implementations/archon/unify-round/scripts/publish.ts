/**
 * Open the item's draft PR, or update its description (decision 43: after every round
 * what became untrue is rewritten, because the Operator reads it at the Merge gate).
 * Idempotent: the PR is found by its head branch before anything is created, and the
 * body is written only when it differs; both are read back. The body names the item with
 * "Part of", never a closing keyword (decision 45). It lists the new tests with their red
 * records from `work/<key>`, every round so far, and the tests without one with the reason
 * (decision 58); the same records give the same text, so a rerun changes nothing. The merge
 * run adds the provenance line before the Merge gate (decision 59, `.shared/provenance.ts`);
 * a new round drops it, since the record it showed is stale.
 */

import { emit, input } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { forge } from '../../.shared/forge.ts';
import { issueKey, issueNumber, keySlug } from '../../.shared/item.ts';
import { runInputs } from '../../.shared/repo.ts';
import { redSection } from '../../.shared/red.ts';
import { bound, readItem, updateItem } from './lib/item.ts';
import { baseName, itemPr } from './lib/facts.ts';

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  if (key === undefined) return;
  const base = baseName(input('base'));
  const pushed = bound<{ branch: string; head: string }>(input('push'));
  const joined = bound<{ summaries: string[]; failed: { id: string; reason: string }[] }>(input('join'));
  if (pushed === null || joined === null) throw new Error('push or join left no result');
  const item = await tracker().view(key);
  const doc = readItem(key);
  const own = issueNumber(key);
  const slices = doc.slices.map(s => `- ${s.id}: ${s.status}${s.issue !== null && s.issue !== own ? ` (${issueKey(s.issue)})` : ''}`);
  const body = [
    `<!-- pipeline-pr:${keySlug(key)} -->`,
    `Part of ${key}`,
    '',
    '## What changed',
    ...(joined.summaries.length > 0 ? joined.summaries.map(s => `- ${s}`) : ['- (no new slice this round)']),
    ...(slices.length > 0 ? ['', '## Slices', ...slices] : []),
    ...(joined.failed.length > 0 ? ['', '## Not done this round', ...joined.failed.map(f => `- ${f.id}: ${f.reason}`)] : []),
    ...(doc.redRecords.length > 0 ? ['', ...redSection(doc.redRecords)] : []),
    ...(doc.flags.some(f => f.startsWith('guard:')) ? ['', '## Flags', ...doc.flags.filter(f => f.startsWith('guard:')).map(f => `- ${f}`)] : []),
    '',
    `Head: ${pushed.head}`,
  ].join('\n');

  let pr = itemPr(repo, key, base);
  if (pr === null) {
    const created = forge('pr.create', {
      repo,
      headRepo: repo,
      head: pushed.branch,
      headRevision: pushed.head,
      base,
      title: `${item.title} (${key})`,
      body,
      draft: true,
    });
    pr = itemPr(repo, key, base);
    if (pr === null || pr.number !== created.pr.number) throw new Error(`PR for ${pushed.branch} does not read back after create`);
  } else if (pr.body.trim() !== body.trim()) {
    forge('pr.edit-body', { ref: { repo, number: pr.number }, body });
    const after = itemPr(repo, key, base);
    if (after === null || after.body.trim() !== body.trim()) throw new Error(`PR #${pr.number} description does not read back`);
  }
  const number = pr.number;
  updateItem(key, d => {
    d.pr = number;
  });
  emit({ pr: number, head: pushed.head });
}

await script('unify-round publish', main);

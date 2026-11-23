/**
 * Open the item's draft PR, or update its description (decision 43: after every round
 * what became untrue is rewritten, because the Operator reads it at the Merge gate).
 * Idempotent: the PR is found by its head branch before anything is created, and the
 * body is written only when it differs; both are read back.
 */

import { emit, input } from 'archon:script';
import { forge } from '../../.shared/forge.ts';
import { bound, readItem, run, updateItem } from './lib/item.ts';
import { baseName, itemPr, itemRef } from './lib/facts.ts';

run(() => {
  const ref = itemRef(input('repo_host'), input('repo_path'), input('number'));
  const base = baseName(input('base'));
  const pushed = bound<{ branch: string; head: string }>(input('push'));
  const joined = bound<{ summaries: string[]; failed: { id: string; reason: string }[] }>(input('join'));
  if (pushed === null || joined === null) throw new Error('push or join left no result');
  const issue = forge('workitem.view', { ref });
  const doc = readItem(ref.number);
  const slices = doc.slices.map(s => `- ${s.id}: ${s.status}${s.issue !== null && s.issue !== ref.number ? ` (#${s.issue})` : ''}`);
  const body = [
    `<!-- pipeline-pr:${ref.number} -->`,
    `Closes #${ref.number}`,
    '',
    '## What changed',
    ...(joined.summaries.length > 0 ? joined.summaries.map(s => `- ${s}`) : ['- (no new slice this round)']),
    ...(slices.length > 0 ? ['', '## Slices', ...slices] : []),
    ...(joined.failed.length > 0 ? ['', '## Not done this round', ...joined.failed.map(f => `- ${f.id}: ${f.reason}`)] : []),
    ...(doc.flags.some(f => f.startsWith('guard:')) ? ['', '## Flags', ...doc.flags.filter(f => f.startsWith('guard:')).map(f => `- ${f}`)] : []),
    '',
    `Head: ${pushed.head}`,
  ].join('\n');

  let pr = itemPr(ref.repo, ref.number, base);
  if (pr === null) {
    const created = forge('pr.create', {
      repo: ref.repo,
      headRepo: ref.repo,
      head: pushed.branch,
      headRevision: pushed.head,
      base,
      title: `${issue.title} (#${ref.number})`,
      body,
      draft: true,
    });
    pr = itemPr(ref.repo, ref.number, base);
    if (pr === null || pr.number !== created.pr.number) throw new Error(`PR for ${pushed.branch} does not read back after create`);
  } else if (pr.body.trim() !== body.trim()) {
    forge('pr.edit-body', { ref: { repo: ref.repo, number: pr.number }, body });
    const after = itemPr(ref.repo, ref.number, base);
    if (after === null || after.body.trim() !== body.trim()) throw new Error(`PR #${pr.number} description does not read back`);
  }
  const number = pr.number;
  updateItem(ref.number, d => {
    d.pr = number;
  });
  emit({ pr: number, head: pushed.head });
});

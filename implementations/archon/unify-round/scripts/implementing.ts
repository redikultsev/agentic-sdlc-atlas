/**
 * Move the item to Implementing (from TriageReview, PlanReview, Verifying, MergeReview or
 * Blocked) and record the branch the round works on: the item branch, or in verify mode
 * the found PR, which becomes this item's PR.
 */

import { emit, input } from 'archon:script';
import { forge } from '../../.shared/forge.ts';
import { itemBranch } from '../../.shared/repo.ts';
import { moveState } from '../../.shared/states.ts';
import { bound, run, updateItem } from './lib/item.ts';
import { itemRef } from './lib/facts.ts';

run(() => {
  const ref = itemRef(input('repo_host'), input('repo_path'), input('number'));
  const routed = bound<{ mode: string; pr: number | null }>(input('route'));
  if (routed === null) throw new Error('route-ruling left no result');
  moveState(ref, ['triage-review', 'plan-review', 'implementing', 'verifying', 'merge-review', 'blocked'], 'implementing');
  let branch = itemBranch(ref.number);
  if (routed.mode === 'verify' && routed.pr !== null) {
    const view = forge('pr.view', { selector: { kind: 'number', ref: { repo: ref.repo, number: routed.pr } } });
    if (view === null || view.pr.state !== 'open') throw new Error(`PR #${routed.pr} is no longer open`);
    branch = view.pr.head;
  }
  updateItem(ref.number, doc => {
    doc.branch = branch;
    if (routed.mode === 'verify' && routed.pr !== null) doc.pr = routed.pr;
  });
  emit({ ok: true, mode: routed.mode, branch });
});

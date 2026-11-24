/**
 * Move the item to Implementing (from TriageReview, PlanReview, Verifying, MergeReview or
 * Blocked) and record the branch the round works on: the item branch, or in verify mode
 * the found PR, which becomes this item's PR.
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { forge } from '../../.shared/forge.ts';
import { itemBranch, runInputs } from '../../.shared/repo.ts';
import { moveState } from '../../.shared/states.ts';
import { bound, updateItem } from './lib/item.ts';

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  if (key === undefined) return;
  const routed = bound<{ mode: string; pr: number | null }>(input('route'));
  if (routed === null) throw new Error('route-ruling left no result');
  await moveState(key, ['triage-review', 'plan-review', 'implementing', 'verifying', 'merge-review', 'blocked'], 'implementing');
  let branch = itemBranch(key);
  if (routed.mode === 'verify' && routed.pr !== null) {
    const view = forge('pr.view', { selector: { kind: 'number', ref: { repo, number: routed.pr } } });
    if (view === null || view.pr.state !== 'open') throw new Error(`PR #${routed.pr} is no longer open`);
    branch = view.pr.head;
  }
  updateItem(key, doc => {
    doc.branch = branch;
    if (routed.mode === 'verify' && routed.pr !== null) doc.pr = routed.pr;
  });
  emit({ ok: true, mode: routed.mode, branch });
}

await script('unify-round implementing', main);

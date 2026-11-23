/**
 * Land the PR (decisions 24, 33): the head must still be the one the card showed (a
 * moved head with the same diff needs a new card; a changed diff goes back to a round);
 * the branch is brought up to date with the latest base on GitHub's side; CI must pass at
 * the new head; every verdict must still carry the current diff fingerprint, or the
 * stale checks run again in a round; then the merge is pinned to the head and read back.
 * At most 3 update attempts across runs, then a request.
 */

import { emit, input } from 'archon:script';
import { forge } from '../../.shared/forge.ts';
import { updatePrBranch } from '../../.shared/github.ts';
import { projectPolicy } from '../../.shared/policy.ts';
import { bound, buildRequest, card, findingKey, NO_CARD, readItem, run, updateItem, type Card, type Finding } from './lib/item.ts';
import { awaitChecks, baseName, itemRef } from './lib/facts.ts';
import { prAt, printAt, staleKinds } from './lib/gate.ts';

const ATTEMPTS = 3;

function stuckCard(number: number, head: string, detail: string): Card {
  return card(buildRequest(
    {
      decide: `#${number}: landing gave up after ${ATTEMPTS} branch updates. Try landing again, send it back to a round, or hold it?`,
      why: 'the base keeps moving under the PR, and another automatic attempt would only repeat it.',
      notVerified: ['whether the base will settle soon'],
      facts: [detail, `head ${head}`],
    },
    [
      { id: 'retry', label: 'Try landing again', does: 'Starts the merge step again with a new card and 3 fresh update attempts.', effect: 'retry' },
      { id: 'round', label: 'Back to a round', does: 'Starts a round that merges the base into the item branch and verifies again.', effect: 'round' },
      { id: 'hold', label: 'Hold', does: 'Ends this run; the item stays in MergeReview.', effect: 'hold' },
    ],
    { option: 'retry', why: 'a busy base usually settles within the hour.', confidence: 'low' }
  ));
}

run(() => {
  const ref = itemRef(input('repo_host'), input('repo_path'), input('number'));
  const base = baseName(input('base'));
  const ruled = bound<{ decision: string; pr: number; head: string; fingerprint: string; operator: boolean; revert: boolean }>(input('ruling'));
  if (ruled === null || ruled.decision !== 'merge') throw new Error('land runs only after a merge decision');
  const policy = projectPolicy(base);
  const prRef = { repo: ref.repo, number: ruled.pr };
  const result = (reported: string, head: string, reported_detail: string, merge: string | null = null, reportedFindings: Finding[] = []): void => {
    // A revert that cannot land goes to the Operator, never into an implementation round.
    const failedRevert = ruled.revert && reported !== 'merged';
    const outcome = failedRevert ? 'stuck' : reported;
    const detail = failedRevert ? `the revert PR #${prRef.number} did not land (${reported}): ${reported_detail}` : reported_detail;
    const findings = failedRevert ? [] : reportedFindings;
    if (findings.length > 0) updateItem(ref.number, d => {
      d.fix = { from: `merge ${outcome}`, findings };
    });
    const asked: Card = outcome === 'stuck' ? stuckCard(ref.number, head, detail) : NO_CARD;
    emit({ outcome, head, detail, merge_commit: merge, attempts: readItem(ref.number).landAttempts, ...asked });
  };
  const finding = (source: Finding['source'], text: string): Finding[] => [{ key: findingKey(source, text), source, text, repeated: false }];

  let pr = prAt(ref.repo, prRef.number);
  if (pr.state === 'merged') return result('merged', pr.head, 'already merged');
  if (pr.head !== ruled.head && ruled.revert) return result('moved', pr.head, `the revert PR moved from ${ruled.head} to ${pr.head}`);
  if (pr.head !== ruled.head) {
    const print = printAt(base, pr.branch, pr.head);
    if (print === ruled.fingerprint) return result('new-card', pr.head, `the head moved from ${ruled.head} to ${pr.head} with the same diff`);
    return result('moved', pr.head, `the head moved from ${ruled.head} to ${pr.head} and the diff changed`, null, finding('conflict', `new commits after the merge card (${pr.head}); verify them`));
  }
  if (pr.draft) forge('pr.ready', { ref: prRef });

  for (;;) {
    const state = forge('pr.merge-state', { ref: prRef });
    if (state.mergeable === 'conflict') {
      return result('conflict', pr.head, `conflicts with ${base} at ${state.default_revision}`, null, finding('conflict', `PR conflicts with ${base} at ${state.default_revision}: merge ${base} into the item branch and resolve`));
    }
    const ci = awaitChecks(prRef, pr.head, Date.now() + Math.max(1, policy.check.timeoutMinutes) * 60_000);
    if (ci.moved) return result('moved', ci.revision, 'the head moved while CI ran', null, finding('conflict', `the head moved to ${ci.revision} during landing`));
    if (ci.timedOut) return result('red', pr.head, `CI did not finish at ${pr.head}`, null, finding('ci', `CI did not finish at ${pr.head} during landing`));
    if (ci.state === 'red') return result('red', pr.head, `red at ${pr.head}: ${ci.red.join(', ')}`, null, ci.red.map(id => finding('ci', `red on the latest ${base}: ${id}`)[0]));
    const fresh = readItem(ref.number);
    // A revert carries no review verdicts (decision 26): CI and the head pin are its checks.
    const print = ruled.revert ? '' : printAt(base, pr.branch, pr.head);
    const stale = ruled.revert ? [] : staleKinds(fresh, print, ruled.operator);
    if (!ruled.revert && (print !== ruled.fingerprint || stale.length > 0)) {
      return result('stale', pr.head, `the diff changed next to the base (${print}); stale: ${stale.join(', ') || 'all'}`, null, finding('conflict', `a base change next to the diff made ${stale.join(', ') || 'the verdicts'} stale; re-check`));
    }
    if (state.behind > 0) {
      if (fresh.landAttempts >= ATTEMPTS) return result('stuck', pr.head, `${ATTEMPTS} updates and ${base} keeps moving`);
      updateItem(ref.number, d => {
        d.landAttempts += 1;
      });
      updatePrBranch(ref.repo, prRef.number, pr.head);
      const before = pr.head;
      for (let i = 0; i < 20 && pr.head === before; i++) {
        Bun.sleepSync(3_000);
        pr = prAt(ref.repo, prRef.number);
      }
      if (pr.head === before) throw new Error(`PR #${prRef.number} did not move after the branch update`);
      continue;
    }
    const merged = forge('pr.merge', { ref: prRef, method: 'squash', conditions: { head: pr.head } });
    const after = prAt(ref.repo, prRef.number);
    if (after.state !== 'merged') throw new Error(`PR #${prRef.number} reads ${after.state} after the merge`);
    updateItem(ref.number, d => {
      d.landAttempts = 0;
      if (ruled.revert) d.flags = d.flags.filter(f => f !== `revert-pr:${prRef.number}`);
    });
    return result('merged', pr.head, `merged at ${pr.head}`, merged.landed.commit);
  }
});

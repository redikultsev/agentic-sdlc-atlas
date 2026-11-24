/**
 * Whether this PR merges without the Operator (R0, decision 25), by facts only, with the
 * policy read from the base: `.pipeline/automerge.yaml` (allowed paths, size, never-zones,
 * working hours, kill switch), the guard's flags in `work/<key>`, the `merge_lane` setting,
 * the never-R0 paths of `.shared/policy.ts`, new dependencies, CI at the head, and every
 * verdict current at the diff fingerprint (decision 33). A stale verdict sends the item
 * back to a round for the stale checks; otherwise R0 lands, and anything else goes to the
 * Merge gate with the head SHA on the card, flags first (decision 24).
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { forge } from '../../.shared/forge.ts';
import { ALWAYS_NEVER, automergeRules, globMatch } from '../../.shared/policy.ts';
import { docName } from '../../.shared/work.ts';
import { buildRequest, card, NO_CARD, readItem, type Option } from './lib/item.ts';
import { baseName, prChecks } from './lib/facts.ts';
import { inHours, prAt, printAt, revertRate, staleKinds } from './lib/gate.ts';

const MANIFESTS = /(^|\/)(package\.json|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|go\.mod|go\.sum|Cargo\.toml|Cargo\.lock|requirements[^/]*\.txt|pyproject\.toml|poetry\.lock|uv\.lock|Gemfile(\.lock)?|composer\.(json|lock)|pom\.xml|build\.gradle(\.kts)?)$/;
const CHANGES_CAP = 3;

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  if (key === undefined) return;
  const base = baseName(input('base'));
  const lane = input('merge_lane').trim() === 'auto' ? 'auto' : 'manual';
  const doc = readItem(key);
  const revertFlag = doc.flags.filter(f => f.startsWith('revert-pr:')).pop();
  if (revertFlag !== undefined) {
    // Decision 26: a revert of a regression needs no gate; land still checks head, update and CI.
    const revert = prAt(repo, Number(revertFlag.slice('revert-pr:'.length)));
    if (revert.state !== 'open') throw new Error(`revert PR #${revert.number} is ${revert.state}`);
    emit({ path: 'revert', r0: false, reasons: ['a revert merges without the gate (decision 26)'], pr: revert.number, head: revert.head, fingerprint: '', stale: [], ...NO_CARD });
    return;
  }
  if (doc.pr === null) throw new Error(`${docName(key)} records no PR`);
  const pr = prAt(repo, doc.pr);
  if (pr.state !== 'open') throw new Error(`PR #${pr.number} is ${pr.state}`);
  const print = printAt(base, pr.branch, pr.head);
  const stale = staleKinds(doc, print, false);
  const short = pr.head.slice(0, 12);
  if (stale.length > 0) {
    emit({ path: 'stale', r0: false, reasons: [`stale at ${short}: ${stale.join(', ')}`], pr: pr.number, head: pr.head, fingerprint: print, stale, ...NO_CARD });
    return;
  }

  const { files } = forge('pr.files', { ref: { repo, number: pr.number } });
  const paths = files.map(f => f.path);
  const lines = files.reduce((n, f) => n + (f.patch ?? '').split('\n').filter(l => /^[+-](?![+-]{2})/.test(l)).length, 0);
  const guardFlags = doc.flags.filter(f => f.startsWith('guard:'));
  const rules = automergeRules(base);
  const notR0: string[] = [];
  if (lane === 'manual') notR0.push('merge_lane is manual');
  if (rules === null) notR0.push('the base has no .pipeline/automerge.yaml');
  if (guardFlags.length > 0) notR0.push(`guard flags: ${guardFlags.join(', ')}`);
  const never = [...ALWAYS_NEVER, ...(rules?.neverZones ?? [])];
  const inNever = paths.filter(p => never.some(z => globMatch(z, p)));
  if (inNever.length > 0) notR0.push(`never-zone paths: ${inNever.join(', ')}`);
  const deps = paths.filter(p => MANIFESTS.test(p));
  if (deps.length > 0) notR0.push(`dependency manifests changed: ${deps.join(', ')}`);
  if (doc.flags.includes('no-base-check')) notR0.push('the project declares no check command');
  if (rules !== null) {
    const outside = paths.filter(p => !rules.paths.some(r => globMatch(r, p)));
    if (outside.length > 0) notR0.push(`paths outside the R0 rules: ${outside.join(', ')}`);
    if (lines > rules.maxChangedLines) notR0.push(`${lines} changed lines, the R0 limit is ${rules.maxChangedLines}`);
    if (!inHours(rules.hours)) notR0.push('outside the working hours of the R0 rules');
    const reverts = revertRate(repo, rules.killSwitch.days);
    if (reverts.rate > rules.killSwitch.revertRate) {
      notR0.push(`kill switch: ${reverts.reverts} of ${reverts.merged} merged PRs reverted in ${rules.killSwitch.days} days`);
    }
  }
  const checks = prChecks({ repo, number: pr.number });
  if (checks.state !== 'green') notR0.push(`checks at the head are ${checks.state}`);
  if (notR0.length === 0) {
    emit({ path: 'r0', r0: true, reasons: [], pr: pr.number, head: pr.head, fingerprint: print, stale: [], ...NO_CARD });
    return;
  }

  const { threads } = forge('pr.threads', { ref: { repo, number: pr.number } });
  const openThreads = threads.filter(t => !t.resolved).length;
  const atCap = doc.changes >= CHANGES_CAP;
  const options: Option[] = [
    {
      id: 'merge',
      label: `Merge at ${short}`,
      does: `Merges PR #${pr.number} pinned to head ${pr.head}, after updating it on the latest ${base} and green CI; it deploys at once. A different head is refused.`,
      effect: 'merge',
      extra: { head: pr.head, fingerprint: print },
    },
    atCap
      ? { id: 'back-to-plan', label: 'Back to the plan', does: `"Changes" was used ${doc.changes} times; moves the item to Planning with your comment.`, effect: 'back-to-plan' }
      : { id: 'changes', label: 'Changes', does: 'Sends your comment to the Implementer as the next round\'s fix; no round is spent.', effect: 'changes' },
  ];
  const request = buildRequest(
    {
      decide: `Merge PR #${pr.number} for ${key} at ${short}, or ${atCap ? 'back to the plan' : 'changes'}?`,
      why: `it is not R0: ${notR0.join('; ')}.`,
      notVerified: ['the reviewer\'s reading of the change (below, after the raw facts)'],
      facts: [
        ...guardFlags.map(f => `FLAG ${f}`),
        `head ${pr.head}, fingerprint ${print}`,
        `${paths.length} files, ${lines} changed lines${deps.length > 0 ? `, new or changed dependencies: ${deps.join(', ')}` : ''}`,
        `open review threads: ${openThreads}`,
        `"changes" used: ${doc.changes} of ${CHANGES_CAP}`,
        ...(doc.review !== null && doc.review.fingerprint === print ? [doc.review.explanation] : ['no review explanation at this fingerprint']),
      ],
    },
    options,
    { option: 'merge', why: 'CI, review and acceptance passed at this exact diff.', confidence: 'medium' }
  );
  emit({ path: 'gate', r0: false, reasons: notR0, pr: pr.number, head: pr.head, fingerprint: print, stale: [], ...card(request) });
}

await script('unify-merge rules', main);

/**
 * Move the item to SpecReview and build the spec request. Normally: approve (Planning,
 * the plan stage starts), or clarify through `other` with what to change; when the check
 * found problems, a declared `clarify` option sends them back as they are. After three
 * clarifies: approve as it is, or stop and sort it out by hand; `other` is then only
 * recorded. A label someone else moved gives a stop request.
 *
 * Inputs: repo_host, repo_path, number; bound round (prev-ruling's output) and commit
 * (commit-spec's output, null when no draft was written this round).
 * Emits the card with `over`, `url`, `criteria`, `problems`.
 */

import { emit, input, refuse } from 'archon:script';
import { nullableJson } from '../../.shared/inputs.ts';
import { itemBranch, runInputs } from '../../.shared/repo.ts';
import { buildRequest, type Option } from '../../.shared/request.ts';
import { stopCard, tryMove } from '../../.shared/stage.ts';

function main(): void {
  const { repo, number } = runInputs();
  if (number === undefined) return;
  const ref = { repo, number };
  const round = JSON.parse(input('round')) as { over: boolean; mismatch: string; clarify: number };
  const commit = nullableJson(input('commit')) as { url: string; criteria: string[]; problems: string[] } | null;
  const url = commit?.url ?? `https://${repo.host}/${repo.path}/tree/${itemBranch(number)}/.pipeline/work/${number}`;
  const extra = { over: round.over, url, criteria: commit?.criteria ?? [], problems: commit?.problems ?? [] };
  const mismatch = round.mismatch !== '' ? round.mismatch : tryMove(ref, ['specifying', 'spec-review'], 'spec-review');
  if (mismatch !== null && mismatch !== '') {
    emit({ ...stopCard(ref, 'spec', mismatch), ...extra });
    return;
  }
  const approve: Option = { id: 'approve', label: 'Approve the spec', does: 'Moves the item to Planning and starts the plan stage.', effect: 'approve' };
  let request;
  if (round.over) {
    request = buildRequest(
      {
        decide: `#${number}: three clarify rounds are used. Approve the last spec as it is, or stop and sort it out by hand?`,
        why: 'the spec stage writes at most three drafts; another round is your call, not the pipeline\'s.',
        notVerified: extra.problems.map(p => `check: ${p}`),
        facts: [`Last spec: ${url}`, `Clarify answers so far: ${round.clarify}.`, 'An "other" answer is recorded as a ruling and this request comes back.'],
      },
      [
        { ...approve, label: 'Approve the last spec as it is' },
        { id: 'stop', label: 'Stop here', does: 'Ends this run; the item stays in SpecReview for you to handle by hand.', effect: 'stop' },
      ],
      { option: 'stop', why: 'Three rounds did not converge; a conversation will be faster than a fourth draft.', confidence: 'medium' }
    );
  } else {
    const options: Option[] = [approve];
    if (extra.problems.length > 0) {
      options.push({ id: 'clarify', label: 'Send the problems back', does: 'Runs the Interviewer again with the check\'s problems as the instruction; counts as one of three clarify rounds.', effect: 'clarify' });
    }
    request = buildRequest(
      {
        decide: `#${number}: approve this spec, or answer "other" with what to clarify (clarify ${round.clarify} of 3 used)?`,
        why: 'no plan or code is written before you approve the spec (SpecReview).',
        notVerified: [...extra.problems.map(p => `check: ${p}`), 'whether the criteria match what you want: the agent wrote them from the request and the code'],
        facts: [`Spec: ${url}`, `Criteria: ${extra.criteria.join(', ') || 'none'}.`],
      },
      options,
      extra.problems.length > 0
        ? { option: 'clarify', why: `The spec check found ${extra.problems.length} problem(s).`, confidence: 'high' }
        : { option: 'approve', why: 'The spec passes its checks; read the criteria and the "Not in scope" list.', confidence: 'medium' }
    );
  }
  emit({ ok: true, reason: '', ...request, ...extra });
}

try {
  main();
} catch (error) {
  refuse(`pipeline-spec card: ${error instanceof Error ? error.message : String(error)}`);
}

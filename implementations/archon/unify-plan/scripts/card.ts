/**
 * Move the item to PlanReview and build the plan request: approve (slice items with
 * their blocked-by links, Implementing, the first round starts), or redo through `other`
 * with what to change; when the plan check found problems, a declared `redo` option sends
 * them back as they are. With implement_lane manual the approve option is the explicit
 * start of the Implementer, and the card says so. After three redos: approve as it is, or
 * stop. A label someone else moved gives a stop request.
 *
 * Inputs: repo_host, repo_path, number, implement_lane; bound round (prev-ruling), plan
 * (check-plan, null when no plan was written this round), research (check-refs).
 * Emits the card with `over`, `url`, `slices`, `problems`, `toggle` (the facts say "ships
 * behind toggle X" when the plan names one, decision 61).
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { nullableJson } from '../../.shared/inputs.ts';
import { keySlug } from '../../.shared/item.ts';
import { itemBranch, runInputs } from '../../.shared/repo.ts';
import { buildRequest, type Option } from '../../.shared/request.ts';
import { stopCard, tryMove } from '../../.shared/stage.ts';

interface Slice { id: string; title: string; files: string[]; check: string; criteria: string[]; blocked_by: string[]; changed_lines: number; risks: string[] }

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  if (key === undefined) return;
  const manual = (input('implement_lane') || 'auto') === 'manual';
  const round = JSON.parse(input('round')) as { over: boolean; mismatch: string; redo: number };
  const plan = nullableJson(input('plan')) as { url: string; slices: Slice[]; problems: string[]; toggle?: string | null } | null;
  const research = nullableJson(input('research')) as { problems: string[]; url: string } | null;
  const url = plan?.url ?? `https://${repo.host}/${repo.path}/tree/${itemBranch(key)}/.pipeline/work/${keySlug(key)}`;
  const problems = plan?.problems ?? [];
  const toggle = plan?.toggle ?? null;
  const extra = { over: round.over, url, slices: plan?.slices ?? [], problems, toggle };
  const mismatch = round.mismatch !== '' ? round.mismatch : await tryMove(key, ['planning', 'plan-review'], 'plan-review');
  if (mismatch !== null && mismatch !== '') {
    emit({ ...stopCard(key, 'plan', mismatch), ...extra });
    return;
  }
  const n = extra.slices.length;
  const approve: Option = {
    id: 'approve',
    label: manual ? 'Approve and start implementing' : 'Approve the plan',
    does: `Creates ${n} slice item(s) with their blocked-by links, moves the item to Implementing and starts the first round.`,
    effect: 'approve',
  };
  const notVerified = [
    ...problems.map(p => `plan check: ${p}`),
    ...(research?.problems ?? []).map(p => `research reference refused: ${p}`),
    'whether the slices are cut well: files, risks and order are the agent\'s reading',
  ];
  const facts = [
    `Plan: ${url}`,
    ...(toggle === null ? [] : [`Ships behind toggle ${toggle}: switching it off is the first rollback (decision 61).`]),
    ...(research !== null && research.url !== '' ? [`Research (the agent's reading, references checked): ${research.url}`] : []),
    ...extra.slices.map(s => `${s.id} ${s.title}: ${s.files.length} file(s), ~${s.changed_lines} lines, covers ${s.criteria.join(', ')}, blocked by ${s.blocked_by.join(', ') || 'nothing'}`),
    ...(manual ? ['implement_lane is manual: nothing starts unless you choose "Approve and start implementing".'] : []),
  ];
  let request;
  if (round.over) {
    request = buildRequest(
      { decide: `${key}: three redo rounds are used. Approve the last plan as it is, or stop and sort it out by hand?`, why: 'the plan stage writes at most three plans; another round is your call.', notVerified, facts },
      [{ ...approve, label: manual ? 'Approve the last plan and start implementing' : 'Approve the last plan as it is' }, { id: 'stop', label: 'Stop here', does: 'Ends this run; the item stays in PlanReview for you to handle by hand.', effect: 'stop' }],
      { option: 'stop', why: 'Three rounds did not converge; a conversation will be faster than a fourth plan.', confidence: 'medium' }
    );
  } else {
    const options: Option[] = [approve];
    if (problems.length > 0) options.push({ id: 'redo', label: 'Send the problems back', does: 'Runs the Planner again with the check\'s problems as the instruction; counts as one of three redo rounds.', effect: 'redo' });
    request = buildRequest(
      { decide: `${key}: approve this plan of ${n} slice(s), or answer "other" with what to redo (redo ${round.redo} of 3 used)?`, why: 'no code is written before you approve the plan (PlanReview).', notVerified, facts },
      options,
      problems.length > 0
        ? { option: 'redo', why: `The plan check found ${problems.length} problem(s).`, confidence: 'high' }
        : { option: 'approve', why: 'Every criterion is covered, the order has no cycle, every slice has files and a check.', confidence: 'medium' }
    );
  }
  emit({ ok: true, reason: '', ...request, ...extra });
}

await script('unify-plan card', main);

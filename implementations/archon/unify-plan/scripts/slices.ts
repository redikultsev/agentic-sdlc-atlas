/**
 * Act on the answer that ended the plan loop (read from the run's node outcomes: the gate
 * is the loop's only sink), by the option's `value.effect`.
 *
 * approve: one sub-issue per slice, created idempotently (the marker carries the item and
 * the slice id, so a retry finds the issue it made), labelled `pipeline:slice`, linked as
 * a sub-issue of the item and "blocked by" its blocker slices; the slices recorded in
 * `work/<n>`; the move PlanReview → Implementing; then unify-round, once per run.
 * stop: nothing.
 *
 * Inputs: repo_host, repo_path, number, unify_round_binding (read by fireNext); bound
 * card (the loop's output: the last card, with its slices). Emits `{ effect, slices, fired, summary }`.
 */

import { emit, forge, input, refuse, runId } from 'archon:script';
import { fireNext } from '../../.shared/fire.ts';
import { addBlockedBy, addSubIssue } from '../../.shared/github.ts';
import { runInputs } from '../../.shared/repo.ts';
import { recordRuling } from '../../.shared/rulings.ts';
import { MARKS } from '../../.shared/states.ts';
import { updateWork } from '../../.shared/work.ts';
import { chosenEffect, lastAnswer, tryMove } from '../../.shared/stage.ts';

interface Slice { id: string; title: string; files: string[]; check: string; criteria: string[]; blocked_by: string[]; changed_lines: number; risks: string[] }

function main(): void {
  const { repo, number } = runInputs();
  if (number === undefined) return;
  const parent = { repo, number };
  const card = JSON.parse(input('card')) as { url: string; slices: Slice[] };
  const answer = lastAnswer('rounds', 'plan-gate');
  if (answer === null) throw new Error('the PlanReview gate has no recorded answer');
  const effect = chosenEffect(answer, 'redo');
  if (effect === 'redo') throw new Error('the loop ended on a redo answer');
  if (answer.text.trim() !== '') recordRuling(parent, { gate: 'plan-review', decision: answer.decision, text: answer.text, project: false });
  if (effect === 'stop') {
    emit({ effect, slices: [], fired: '', summary: `#${number}: stop` });
    return;
  }
  if (effect !== 'approve') throw new Error(`unknown effect '${effect}'`);

  const issues = new Map<string, number>();
  for (const s of card.slices) {
    const created = forge('workitem.create', {
      repo,
      marker: `unify-slice:${number}:${s.id}`,
      title: `#${number} ${s.id}: ${s.title}`,
      body: [
        `Slice ${s.id} of #${number}. Plan: ${card.url}`,
        '',
        `- Covers: ${s.criteria.join(', ')}`,
        `- Blocked by: ${s.blocked_by.join(', ') || 'nothing'}`,
        `- Files: ${s.files.map(f => `\`${f}\``).join(', ')}`,
        `- Check: \`${s.check}\``,
      ].join('\n'),
    });
    const child = created.workitem.ref.number;
    issues.set(s.id, child);
    const subject = { kind: 'issue' as const, ref: { repo, number: child } };
    if (!(forge('workitem.view', { ref: subject.ref }).labels ?? []).includes(MARKS.slice)) forge('workitem.label.add', { subject, name: MARKS.slice });
    addSubIssue(parent, { repo, number: child });
  }
  for (const s of card.slices) {
    const child = issues.get(s.id) as number;
    for (const b of s.blocked_by) {
      const blocker = issues.get(b);
      if (blocker !== undefined) addBlockedBy({ repo, number: child }, { repo, number: blocker });
    }
  }
  updateWork(number, doc => {
    const before = new Map(doc.slices.map(s => [s.id, s]));
    doc.slices = card.slices.map(s => ({
      id: s.id,
      issue: issues.get(s.id) ?? null,
      status: before.get(s.id)?.status ?? 'open',
      branch: before.get(s.id)?.branch ?? null,
      blockedBy: s.blocked_by,
    }));
  });
  const mismatch = tryMove(parent, ['plan-review'], 'implementing');
  if (mismatch !== null) throw new Error(mismatch);
  if (input('unify_round_binding') === '') throw new Error('unify_round_binding is empty');
  const fired = fireNext('unify-round', repo, number, `unify-round:${repo.host}/${repo.path}#${number}:plan:${runId()}`);
  const slices = card.slices.map(s => ({ id: s.id, issue: issues.get(s.id) ?? 0 }));
  emit({ effect, slices, fired, summary: `#${number}: approved; ${slices.length} slice(s) ${slices.map(s => `${s.id}=#${s.issue}`).join(', ')}; ${fired}` });
}

try {
  main();
} catch (error) {
  refuse(`unify-plan slices: ${error instanceof Error ? error.message : String(error)}`);
}

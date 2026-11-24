/**
 * Act on the answer that ended the plan loop (read from the run's node outcomes: the gate
 * is the loop's only sink), by the option's `value.effect`.
 *
 * approve: one slice item per slice, created idempotently (the marker carries the item and
 * the slice id, so a retry finds the item it made), labelled `pipeline:slice`, linked as
 * a slice of the item and "blocked by" its blocker slices where the tracker has such links;
 * the slices recorded in `work/<key>`; the move PlanReview → Implementing; then
 * unify-round, once per run.
 * stop: nothing.
 *
 * Inputs: repo_host, repo_path, number, unify_round_binding (read by fireNext); bound
 * card (the loop's output: the last card, with its slices). Emits `{ effect, slices, fired, summary }`.
 */

import { emit, input, runId } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { fireNext } from '../../.shared/fire.ts';
import { type ItemKey, issueNumber, keySlug } from '../../.shared/item.ts';
import { runInputs } from '../../.shared/repo.ts';
import { recordRuling } from '../../.shared/rulings.ts';
import { MARKS } from '../../.shared/states.ts';
import { updateWork } from '../../.shared/work.ts';
import { chosenEffect, lastAnswer, tryMove } from '../../.shared/stage.ts';

interface Slice { id: string; title: string; files: string[]; check: string; criteria: string[]; blocked_by: string[]; changed_lines: number; risks: string[] }

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  if (key === undefined) return;
  const t = tracker();
  const card = JSON.parse(input('card')) as { url: string; slices: Slice[] };
  const answer = lastAnswer('rounds', 'plan-gate');
  if (answer === null) throw new Error('the PlanReview gate has no recorded answer');
  const effect = chosenEffect(answer, 'redo');
  if (effect === 'redo') throw new Error('the loop ended on a redo answer');
  if (answer.text.trim() !== '') await recordRuling(key, { gate: 'plan-review', decision: answer.decision, text: answer.text, project: false });
  if (effect === 'stop') {
    emit({ effect, slices: [], fired: '', summary: `${key}: stop` });
    return;
  }
  if (effect !== 'approve') throw new Error(`unknown effect '${effect}'`);

  const items = new Map<string, ItemKey>();
  for (const s of card.slices) {
    const child = await t.create(
      key,
      `unify-slice:${keySlug(key)}:${s.id}`,
      `${key} ${s.id}: ${s.title}`,
      [
        `Slice ${s.id} of ${key}. Plan: ${card.url}`,
        '',
        `- Covers: ${s.criteria.join(', ')}`,
        `- Blocked by: ${s.blocked_by.join(', ') || 'nothing'}`,
        `- Files: ${s.files.map(f => `\`${f}\``).join(', ')}`,
        `- Check: \`${s.check}\``,
      ].join('\n')
    );
    items.set(s.id, child);
    await t.label(child, { add: [MARKS.slice] });
    await t.slice(key, child);
  }
  for (const s of card.slices) {
    const child = items.get(s.id) as ItemKey;
    for (const b of s.blocked_by) {
      const blocker = items.get(b);
      if (blocker !== undefined) await t.blockedBy(child, blocker);
    }
  }
  updateWork(key, doc => {
    const before = new Map(doc.slices.map(s => [s.id, s]));
    doc.slices = card.slices.map(s => {
      const child = items.get(s.id);
      return {
        id: s.id,
        issue: child === undefined ? null : issueNumber(child),
        status: before.get(s.id)?.status ?? 'open',
        branch: before.get(s.id)?.branch ?? null,
        blockedBy: s.blocked_by,
      };
    });
  });
  const mismatch = await tryMove(key, ['plan-review'], 'implementing');
  if (mismatch !== null) throw new Error(mismatch);
  if (input('unify_round_binding') === '') throw new Error('unify_round_binding is empty');
  const at = `${repo.host}/${repo.path}${key.startsWith('#') ? '' : ':'}${key}`;
  const fired = fireNext('unify-round', repo, key, `unify-round:${at}:plan:${runId()}`);
  const slices = card.slices.map(s => {
    const child = items.get(s.id);
    return { id: s.id, issue: child === undefined ? 0 : (issueNumber(child) ?? 0), key: child ?? '' };
  });
  emit({
    effect,
    slices: slices.map(s => ({ id: s.id, issue: s.issue })),
    fired,
    summary: `${key}: approved; ${slices.length} slice(s) ${slices.map(s => `${s.id}=${s.key}`).join(', ')}; ${fired}`,
  });
}

await script('unify-plan slices', main);

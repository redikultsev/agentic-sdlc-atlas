/**
 * The seven numbers of the weekly summary (decisions 27 and 38), computed here from the
 * tracker, the engine's items (`items()`), the items' `work/<key>` documents and the deploy
 * records, never by the agent. Also the cases the Retro agent reads: one per item with a
 * correction or a failure in the window.
 *
 *  1. operator_minutes_per_item: per item with an answer in the window, the minutes from
 *     the start of the answered run (or its previous answer) to each answer, summed; the
 *     mean over those items. An upper bound: the engine does not expose when a wait
 *     opened, so the agent work before the gate is included.
 *  2. done_without_help: of items Done in the window, the share with no "changes",
 *     "clarify" or "redo", fewer than 3 rounds, no "other" answer and never flagged for
 *     attention or set aside.
 *  3. fix_rounds_to_green: mean failed rounds (`work/<key>.rounds`) of items merged.
 *  4. prs_merged_share: of the pipeline's PRs that closed in the window, the share merged.
 *  5. rollbacks: deploys the Watcher rolled back in the window.
 *  6. cost_per_merged_change: the reported USD of every run started in the window over the
 *     PRs merged in it; runs that reported tokens and no cost are counted apart.
 *  7. follow_rate: per request type (the wait label `gate`), the share of answered
 *     requests with a recommendation where the Operator chose it (`archon workflow
 *     attention --count-by label:gate --since`).
 *
 * A number with nothing to divide is null, never zero.
 *
 * Beside the seven, one table (decision 59): the items of the window that have a provenance
 * record, grouped by the pack version and the Implementer's model that built them, with
 * items merged in the window, "changes" at the gates and rollbacks. Items without a record
 * (built before it existed) are counted in a note.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST, INPUTS_REPO_PATH and INPUTS_SINCE.
 */

import { emit, input, state } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { forge } from '../../.shared/forge.ts';
import { isObject } from '../../.shared/inputs.ts';
import { asKey, type ItemKey, parseKey } from '../../.shared/item.ts';
import { repoOf } from '../../.shared/repo.ts';
import { stateOf } from '../../.shared/states.ts';
import { untrusted } from '../../.shared/trust.ts';
import { readWork } from '../../.shared/work.ts';
import { implementerLabel, packLabel, readProvenance } from '../../.shared/provenance.ts';
import { engineItems, hostJson, message, weekId } from './lib.ts';

const UNIT: Record<string, number> = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };

function windowStart(since: string, now: number): number {
  const match = /^(\d+)([mhdw])$/.exec(since);
  if (match) return now - Number(match[1]) * UNIT[match[2]];
  const at = Date.parse(since);
  if (!Number.isFinite(at)) throw new Error(`since '${since}' is neither a duration (7d) nor a date`);
  return at;
}

/** The item key of an engine run key (`issue-12`, `item-PROJ-1`), or null for another kind. */
function itemOfRun(runKey: string): ItemKey | null {
  const issue = /^issue-(\d+)$/.exec(runKey);
  if (issue) return parseKey(issue[1]);
  return runKey.startsWith('item-') ? parseKey(runKey.slice('item-'.length)) : null;
}

const mean = (values: readonly number[]): number | null => (values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length);
const share = (part: number, whole: number): number | null => (whole === 0 ? null : part / whole);
const round2 = (value: number | null): number | null => (value === null ? null : Math.round(value * 100) / 100);

interface DeployWatch {
  readonly item?: ItemKey | number;
  readonly pr?: number | null;
  readonly watch?: { readonly result?: string; readonly at?: string; readonly reason?: string } | null;
}

function followRates(since: string): { rates: { type: string; asked: number; answered: number; followed: number; rate: number | null }[]; error: string | null } {
  const { json, error } = hostJson(['workflow', 'attention', '--json', '--count-by', 'label:gate', '--since', since]);
  const groups = isObject(json) && Array.isArray(json.counts) ? json.counts : null;
  if (groups === null) return { rates: [], error: error ?? 'archon workflow attention gave no counts' };
  const rates = groups.filter(isObject).map(group => {
    const rec = isObject(group.recommendations) ? group.recommendations : {};
    const asked = Number(rec.asked ?? 0);
    const answered = Number(rec.answered ?? 0);
    const followed = Number(rec.followed ?? 0);
    const type = typeof group.value === 'string' ? group.value : '(no gate label)';
    return { type, asked, answered, followed, rate: round2(share(followed, answered)) };
  });
  return { rates, error: null };
}

async function main(): Promise<void> {
  const repo = repoOf(input('repo_host'), input('repo_path'));
  const since = input('since').trim() || '7d';
  const now = Date.now();
  const from = windowStart(since, now);
  const inWindow = (at: string | null | undefined): boolean => typeof at === 'string' && Date.parse(at) >= from && Date.parse(at) <= now;
  const notes: string[] = [];

  const engine = engineItems(since);
  const operatorMinutes: number[] = [];
  const roundsMerged: number[] = [];
  let done = 0;
  let doneUnaided = 0;
  let usd = 0;
  let costUnknownRuns = 0;
  let prsMerged = 0;
  let prsClosed = 0;
  const cases: Record<string, unknown>[] = [];
  const built: { item: ItemKey; pack: string; implementer: string; merged: boolean; changes: number; rolledBack: boolean }[] = [];
  let noRecord = 0;

  for (const entry of engine) {
    const key = itemOfRun(entry.item.key);
    if (key === null) continue;
    const work = readWork(key).doc;
    let labels: readonly string[] = [];
    let title = '';
    try {
      const view = await tracker().view(key);
      labels = view.labels;
      title = view.title;
    } catch (error) {
      notes.push(`${key} not read: ${message(error)}`);
    }
    const found = stateOf(labels);
    const current = 'state' in found ? found.state : 'conflict';

    // 1. Operator minutes from answer timestamps.
    const answers = entry.answers.filter(a => a.kind !== 'ruling' && inWindow(a.at));
    let minutes = 0;
    const lastByRun = new Map<string, number>();
    for (const answer of [...answers].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
      const runId = 'runId' in answer ? answer.runId : null;
      const run = entry.runs.find(r => r.id === runId);
      const start = Math.max(run === undefined ? Date.parse(answer.at) : Date.parse(run.startedAt), runId === null ? 0 : (lastByRun.get(runId) ?? 0));
      minutes += Math.max(0, Date.parse(answer.at) - start) / 60_000;
      if (runId !== null) lastByRun.set(runId, Date.parse(answer.at));
    }
    if (answers.length > 0) operatorMinutes.push(minutes);
    const otherAnswers = answers.filter(a => (a.kind === 'attention' && a.answer !== null && 'decision' in a.answer && a.answer.decision === 'other') || (a.kind === 'gate' && a.decision === 'other'));

    // 2. Done without help.
    const helped = work.changes > 0 || work.clarify > 0 || work.redo > 0 || work.rounds >= 3 || otherAnswers.length > 0 || labels.includes('pipeline:needs-attention') || work.flags.includes('set-aside');
    if (current === 'done') {
      done += 1;
      if (!helped) doneUnaided += 1;
    }

    // 3, 4, 6. Merged PRs and rounds.
    let mergedNow = false;
    if (work.pr !== null) {
      try {
        const view = forge('pr.view', { selector: { kind: 'number', ref: { repo, number: work.pr } } });
        const merged = view?.pr.state === 'merged';
        if (merged && inWindow(view.timestamps?.merged_at)) {
          mergedNow = true;
          prsMerged += 1;
          roundsMerged.push(work.rounds);
        } else if (view?.pr.state === 'closed' && inWindow(view.timestamps?.closed_at)) {
          prsClosed += 1;
        }
      } catch (error) {
        notes.push(`PR #${String(work.pr)} not read: ${message(error)}`);
      }
    }
    const provenance = readProvenance(key);
    if (provenance === null) noRecord += 1;
    else built.push({ item: key, pack: packLabel(provenance), implementer: implementerLabel(provenance), merged: mergedNow, changes: work.changes, rolledBack: current === 'rolled-back' });
    for (const run of entry.runs) {
      if (!inWindow(run.startedAt)) continue;
      if (run.spend.usd !== null) usd += run.spend.usd;
      else if ((run.spend.inputTokens ?? 0) + (run.spend.outputTokens ?? 0) > 0) costUnknownRuns += 1;
    }

    if (helped || current === 'blocked' || current === 'rolled-back') {
      cases.push({
        item: key,
        title: title === '' ? '' : untrusted(`title of ${key}`, title),
        state: current,
        rounds: work.rounds,
        changes: work.changes,
        clarify: work.clarify,
        redo: work.redo,
        discoveries: work.discoveries,
        verdicts: work.verdicts.slice(-6).map(v => `${v.kind}: ${v.verdict}`),
        // The Operator's own words at the gates: trusted.
        operator_words: otherAnswers.map(a => (a.kind === 'attention' && a.answer !== null ? a.answer.text : a.kind === 'gate' ? (a.text ?? '') : '')).filter(t => t !== ''),
        flags: work.flags,
      });
    }
  }

  // 5. Rollbacks, from the deploy records.
  const rollbacks = state
    .listValues('deploys/')
    .map(doc => doc.value as DeployWatch | null)
    .filter(record => record?.watch?.result === 'rolled-back' && inWindow(record.watch.at));
  for (const record of rollbacks) {
    const item = record?.item === undefined ? undefined : asKey(record.item);
    const known = cases.find(c => c.item === item);
    if (known !== undefined) known.rollback = record?.watch?.reason ?? '';
  }

  // Outcomes by pack version and Implementer model (decision 59).
  const rolledBackItems = new Set(rollbacks.map(r => (r?.item === undefined ? '' : asKey(r.item))));
  const rows = new Map<string, { pack: string; implementer: string; items: number; merged: number; changes: number; rollbacks: number }>();
  for (const b of built) {
    const id = `${b.pack} ${b.implementer}`;
    const row = rows.get(id) ?? { pack: b.pack, implementer: b.implementer, items: 0, merged: 0, changes: 0, rollbacks: 0 };
    row.items += 1;
    if (b.merged) row.merged += 1;
    row.changes += b.changes;
    if (b.rolledBack || rolledBackItems.has(b.item)) row.rollbacks += 1;
    rows.set(id, row);
  }
  if (noRecord > 0) notes.push(`${String(noRecord)} items have no provenance record and are not in the table by version`);

  // 7. Follow rate.
  const follow = followRates(since);
  if (follow.error !== null) notes.push(`follow rate not read: ${follow.error}`);
  if (costUnknownRuns > 0) notes.push(`${String(costUnknownRuns)} runs reported tokens but no cost; cost per merged change leaves them out`);
  notes.push('operator minutes are an upper bound: the engine does not expose when a wait opened');

  emit({
    week: weekId(now),
    window: { since: new Date(from).toISOString(), until: new Date(now).toISOString() },
    numbers: {
      operator_minutes_per_item: round2(mean(operatorMinutes)),
      done_without_help: round2(share(doneUnaided, done)),
      fix_rounds_to_green: round2(mean(roundsMerged)),
      prs_merged_share: round2(share(prsMerged, prsMerged + prsClosed)),
      rollbacks: rollbacks.length,
      cost_per_merged_change: prsMerged === 0 ? null : round2(usd / prsMerged),
      follow_rate: follow.rates,
    },
    counts: { items: engine.length, done, merged: prsMerged, closed_unmerged: prsClosed, cost_unknown_runs: costUnknownRuns },
    cases,
    versions: [...rows.values()],
    notes,
  });
}

await script('unify-retro metrics', main);

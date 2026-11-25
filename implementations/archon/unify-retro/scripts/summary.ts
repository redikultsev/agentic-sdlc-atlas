/**
 * The weekly summary as one decision request: the seven numbers (computed by `metrics`),
 * what was filed, and one choice. The week's record (numbers, filed proposals) is kept in
 * the state document `retro/<week>`, so next week's summary and the Operator can compare.
 *
 * The choice: the proposals go to Triage as they are (`noted`), or they are held until the
 * Operator approves each (`hold`: the label `pipeline:needs-approval` keeps intake away).
 *
 * Gate answers given through a chat tool (decision 65) follow the seven when there were any.
 *
 * The table by pack version and Implementer model (decision 59) follows the seven, one
 * line per row, and is kept in the week's record too.
 *
 * Bound inputs: INPUTS_WEEK, INPUTS_METRICS, INPUTS_COUNTS, INPUTS_VERSIONS and INPUTS_NOTES from metrics;
 * INPUTS_FILED and INPUTS_DROPPED from file; INPUTS_SUMMARY from the Retro agent.
 */

import { emit, input, state } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { buildRequest } from '../../.shared/request.ts';

interface Metrics {
  operator_minutes_per_item: number | null;
  done_without_help: number | null;
  fix_rounds_to_green: number | null;
  prs_merged_share: number | null;
  rollbacks: number;
  cost_per_merged_change: number | null;
  follow_rate: { type: string; answered: number; followed: number; rate: number | null }[];
}

const num = (value: number | null, unit = ''): string => (value === null ? 'n/a (nothing to count)' : `${String(value)}${unit}`);
const pct = (value: number | null): string => (value === null ? 'n/a (nothing to count)' : `${String(Math.round(value * 100))}%`);

async function main(): Promise<void> {
  const week = input('week').trim();
  const metrics = JSON.parse(input('metrics')) as Metrics;
  const counts = JSON.parse(input('counts')) as { items: number; done: number; merged: number; closed_unmerged: number; chat_tool_answers?: number; chat_tool_items?: string[] };
  const notes = JSON.parse(input('notes') || '[]') as string[];
  const versions = JSON.parse(input('versions') || '[]') as { pack: string; implementer: string; items: number; merged: number; changes: number; rollbacks: number }[];
  const filed = JSON.parse(input('filed') || '[]') as { key: string; title: string }[];
  const dropped = JSON.parse(input('dropped') || '[]') as { title: string; why: string }[];
  const retroSummary = input('summary').trim();

  const follow = metrics.follow_rate.length === 0
    ? 'n/a (no answered request carried a recommendation)'
    : metrics.follow_rate.map(r => `${r.type} ${pct(r.rate)} of ${String(r.answered)}`).join(', ');
  const facts = [
    `Operator time per item: ${num(metrics.operator_minutes_per_item, ' min')} (upper bound)`,
    `Done without manual help: ${pct(metrics.done_without_help)} of ${String(counts.done)} done`,
    `Fix rounds to green: ${num(metrics.fix_rounds_to_green)} per merged change`,
    `PRs merged: ${pct(metrics.prs_merged_share)} (${String(counts.merged)} merged, ${String(counts.closed_unmerged)} closed unmerged)`,
    `Rollbacks: ${String(metrics.rollbacks)}`,
    `Cost per merged change: ${metrics.cost_per_merged_change === null ? 'n/a (nothing merged)' : `$${String(metrics.cost_per_merged_change)}`}`,
    `Recommendation followed, by request type: ${follow}`,
    ...((counts.chat_tool_answers ?? 0) === 0
      ? []
      : [`Gate answers given through a chat tool, not the console: ${String(counts.chat_tool_answers)} (${(counts.chat_tool_items ?? []).join(', ')})`]),
    ...(versions.length === 0
      ? ['By pack version and Implementer model: no item of the week has a provenance record']
      : ['By pack version and Implementer model (items · merged · "changes" · rollbacks):', ...versions.map(v => `pack ${v.pack}, Implementer ${v.implementer}: ${String(v.items)} · ${String(v.merged)} · ${String(v.changes)} · ${String(v.rollbacks)}`)]),
    `Proposals filed for Triage: ${filed.length === 0 ? 'none' : filed.map(f => `${f.key} ${f.title}`).join('; ')}`,
    ...(dropped.length === 0 ? [] : [`Dropped: ${dropped.map(d => `${d.title} (${d.why})`).join('; ')}`]),
    ...(retroSummary === '' ? [] : [`The Retro's reading: ${retroSummary}`]),
  ];
  const request = buildRequest(
    {
      decide: `Weekly summary ${week}: send this week's ${String(filed.length)} proposals to Triage as they are, or hold them?`,
      why: 'the weekly numbers and the Retro\'s proposals come to you once a week (decision 27); which proposal is worth doing is decided at Triage.',
      notVerified: notes,
      facts,
    },
    [
      { id: 'noted', label: 'Send to Triage', does: 'Leaves the proposal items as they are; intake picks them up for Triage.', effect: 'noted' },
      { id: 'hold', label: 'Hold the proposals', does: 'Adds pipeline:needs-approval to this week\'s proposal items, so none goes to Triage until you approve it.', effect: 'hold' },
    ],
    { option: 'noted', why: 'Each proposal is judged at Triage anyway; holding only delays them.', confidence: 'medium' }
  );

  for (let attempt = 0; attempt < 3; attempt++) {
    const found = state.get(`retro/${week}`);
    const value = { week, metrics, counts, versions, filed, dropped, notes, at: new Date().toISOString() };
    if (state.put(`retro/${week}`, value, { ifRevision: found.revision }).ok) break;
  }
  emit({ ...request, filed: filed.map(f => f.key) });
}

await script('unify-retro summary', main);

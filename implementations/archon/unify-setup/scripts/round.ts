/**
 * Start of a compose round. The redos are counted from this run's own answers to the
 * setup gate (a run is about no item, so nothing is kept in the engine's store): the
 * round after the third redo is the `last`, and its card offers no further redo, only
 * approve or stop. On a redo the agent gets what the last round found: its map, the
 * check's problems and the probe lines (the tracker's words, marked as data), and the
 * Operator's comment.
 *
 * Inputs: bound prev_decision, prev_text (the last answer), prev_map (the last map),
 * prev_check, prev_probe (the last check and probe outputs; empty when not run).
 * Emits `{ last, redo, comment, previous }`.
 */

import { emit, input, outcomes } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { nullableJson } from '../../.shared/inputs.ts';
import { untrusted } from '../../.shared/trust.ts';

const LIMIT = 3;
const REDO = new Set(['redo', 'other']);

function redos(): number {
  return outcomes().nodes.filter(n => {
    if ((n.node_id !== 'rounds.setup-gate' && n.node_id !== 'setup-gate') || n.state !== 'completed') return false;
    const decision = (n.output as { decision?: unknown } | undefined)?.decision;
    return typeof decision === 'string' && REDO.has(decision);
  }).length;
}

function bound(name: string): Record<string, unknown> | null {
  const value = nullableJson(name);
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

async function main(): Promise<void> {
  const decision = input('prev_decision').trim();
  const comment = REDO.has(decision) ? input('prev_text').trim() : '';
  const redo = redos();
  const map = input('prev_map').trim();
  const check = bound(input('prev_check'));
  const probe = bound(input('prev_probe'));
  const previous: string[] = [];
  if (map !== '') previous.push('Your previous map:', '```yaml', map, '```');
  if (check !== null && check.ok === false) previous.push('', 'The script check refused it:', ...((check.problems as string[] | undefined) ?? []).map(p => `- ${p}`));
  if (probe !== null) {
    const lines = (probe.lines as { op: string; result: string; detail: string }[] | undefined) ?? [];
    previous.push('', `The probe on the test item ${probe.ok === true ? 'passed' : 'failed'}:`, untrusted("the probe's lines, with the tracker's own words", lines.map(l => `${l.op}: ${l.result}: ${l.detail}`).join('\n')));
  }
  emit({ last: redo >= LIMIT, redo, comment, previous: previous.join('\n') });
}

await script('unify-setup round', main);

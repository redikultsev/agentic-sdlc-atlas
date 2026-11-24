/**
 * The Operator's rulings (decision 32, registers per decision 44). A ruling is the text of
 * a gate answer, never a free comment: only the wait's own answer becomes one. It is
 * written as a comment on the item, dated, with the gate it answered; the write key makes
 * it idempotent, so a retried node never writes it twice. A ruling marked as true for the
 * whole project is also appended to the "Pipeline rulings" register item.
 */

import { runId } from 'archon:script';
import { tracker } from './connector.ts';
import type { ItemKey } from './item.ts';
import { MARKS } from './states.ts';

export interface Ruling {
  readonly gate: string;
  readonly decision: string;
  readonly text: string;
  readonly project: boolean;
}

export async function recordRuling(key: ItemKey, ruling: Ruling, at = new Date().toISOString()): Promise<void> {
  if (ruling.text.trim() === '') return;
  const marker = `pipeline-ruling:${runId()}:${ruling.gate}`;
  const body = [`**Ruling** (${at.slice(0, 10)}, ${ruling.gate}: ${ruling.decision})`, '', ruling.text.trim()].join('\n');
  await tracker().comment(key, marker, body);
  if (ruling.project) {
    const register = await ensureRulingsRegister();
    await tracker().comment(register, `${marker}:project`, `**Ruling** (${at.slice(0, 10)}, from ${key}, ${ruling.gate})\n\n${ruling.text.trim()}`);
  }
}

/** The open rulings register, or null when the project has none yet. */
export async function rulingsRegister(): Promise<ItemKey | null> {
  const t = tracker();
  if (!t.has('list')) return null;
  return (await t.list(MARKS.rulings))[0]?.key ?? null;
}

async function ensureRulingsRegister(): Promise<ItemKey> {
  const found = await rulingsRegister();
  if (found !== null) return found;
  const t = tracker();
  const key = await t.create(
    'project',
    'pipeline-rulings-register',
    'Pipeline rulings',
    'Answers the Operator gave that hold for the whole project. Agents read them before they ask. One comment per ruling; never edited.'
  );
  await t.ensureLabel(MARKS.rulings, 'ededed', 'The register of project rulings');
  await t.label(key, { add: [MARKS.rulings] });
  return key;
}

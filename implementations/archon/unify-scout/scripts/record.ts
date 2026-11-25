/**
 * Keep what the scout found (decision 55): its findings go into the findings buffer with
 * the scout as their source (`recordScoutFindings` in `.shared/findings.ts`), up to its
 * limit of 2 waiting, an urgent one filed at once through the connector; a finding the
 * scout's memory already holds is passed over. Then the look is written into the scout's
 * memory (`remember` in `.shared/scouts.ts`): what it looked at and what it proposed. A
 * retry of this node keeps nothing twice.
 *
 * Bound inputs: INPUTS_SCOUT (the picked scout), INPUTS_SMALL / INPUTS_MEDIUM /
 * INPUTS_LARGE (the output of the one look node that ran; the others are null).
 * Emits `{ scout, kept, repeated, over_limit, over_buffer, summary }`.
 */

import { emit, input, runId } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { recordScoutFindings } from '../../.shared/findings.ts';
import { repoOf } from '../../.shared/repo.ts';
import { readMemory, remember } from '../../.shared/scouts.ts';

interface LookOutput {
  readonly findings?: unknown[];
  readonly looked?: string;
  readonly summary?: string;
}

async function main(): Promise<void> {
  repoOf(input('repo_host'), input('repo_path'));
  const scout = (input('scout') ?? '').trim();
  if (scout === '') throw new Error('no scout was picked');
  const look = ['small', 'medium', 'large'].map(tier => JSON.parse(input(tier) || 'null') as LookOutput | null).find(o => o !== null) ?? null;
  if (look === null) throw new Error(`no look node gave an answer for the ${scout} scout`);
  const at = new Date().toISOString();
  const known = new Set(readMemory(scout).proposed.map(p => p.id));
  const found = Array.isArray(look.findings) ? look.findings : [];
  const out = await recordScoutFindings(scout, found, known, at);
  const passed = out.repeated + out.overLimit + out.overBuffer;
  remember(scout, runId(), at, look.looked ?? '', out.kept, passed);
  const notKept = [
    out.repeated > 0 ? `${out.repeated} proposed before` : '',
    out.overLimit > 0 ? `${out.overLimit} over the limit of 2 waiting` : '',
    out.overBuffer > 0 ? `${out.overBuffer} not kept: the buffer is full` : '',
  ].filter(s => s !== '');
  const urgent = out.kept.filter(k => k.key !== null).map(k => k.key);
  emit({
    scout,
    kept: out.kept,
    repeated: out.repeated,
    over_limit: out.overLimit,
    over_buffer: out.overBuffer,
    summary: `The ${scout} scout proposed ${found.length}: ${out.kept.length} kept${urgent.length > 0 ? ` (${urgent.join(', ')} filed at once as urgent)` : ''}${notKept.length > 0 ? `; ${notKept.join(', ')}` : ''}.`,
  });
}

await script('unify-scout record', main);

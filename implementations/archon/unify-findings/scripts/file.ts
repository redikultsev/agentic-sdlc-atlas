/**
 * Act on the grouping the agent proposed (decision 60; `applyGrouping` in
 * `.shared/findings.ts`): a grouping that leaves a finding out, places one twice, names an
 * unknown one, or drops one against an item that does not cover it writes nothing, and
 * the buffer waits for the next pass. Otherwise one request per group through the
 * connector, idempotent by a marker made of its findings, and the buffer emptied of what
 * was filed or dropped, each only after its request read back.
 *
 * Bound inputs: INPUTS_IDS (the buffer as gather read it), INPUTS_GROUPING (the agent's
 * output). Emits `{ ok, problems, filed, dropped, left }`.
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { applyGrouping, type Grouping } from '../../.shared/findings.ts';
import { repoOf } from '../../.shared/repo.ts';

async function main(): Promise<void> {
  repoOf(input('repo_host'), input('repo_path'));
  const ids = JSON.parse(input('ids') || '[]') as string[];
  const raw = JSON.parse(input('grouping') || 'null') as Partial<Grouping> | null;
  const grouping: Grouping = { groups: raw?.groups ?? [], dropped: raw?.dropped ?? [] };
  emit(await applyGrouping(ids, grouping));
}

await script('unify-findings file', main);

/**
 * Which scout looks in this run (decision 55; `.shared/scouts.ts`): the scouts declared in
 * `.pipeline/project.yaml` on the base, each one's memory and its findings waiting in the
 * buffer. At most one scout per run: the one this run already began (a retried node), the
 * one the Operator named, or the due one that has waited longest; a scout with 2 findings
 * waiting is passed over. The look is marked begun in the scout's memory before anything
 * runs, then its measure commands run and the agent's context is built: the area and brief
 * in the project's words, the measurements and the memory as data. No scout declared,
 * none due, or the named one at its limit: `has` is false and the run ends here.
 *
 * Inputs: the run's `scout` (empty for the timer), the pack setting `base`.
 * Emits `{ has, scout, tier, cap, reason, passed, context }`.
 */

import { emit, input, runId } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { buffered } from '../../.shared/findings.ts';
import { begin, choose, lookContext, measure, readMemory, readScouts } from '../../.shared/scouts.ts';

function main(): void {
  const base = input('base')?.trim() || 'main';
  const scouts = readScouts(base);
  const buffer = buffered();
  const waiting = new Map<string, number>();
  for (const f of buffer) if (f.scout) waiting.set(f.scout, (waiting.get(f.scout) ?? 0) + 1);
  const memories = new Map(scouts.map(s => [s.name, readMemory(s.name)] as const));
  const run = runId();
  const pick = choose(scouts, memories, waiting, Date.now(), (input('scout') ?? '').trim(), run);
  if (pick.scout === null) {
    emit({ has: false, scout: '', tier: '', cap: 0, reason: pick.reason, passed: pick.passed, context: '' });
    return;
  }
  const scout = pick.scout;
  const memory = begin(scout.name, run, new Date().toISOString());
  const context = lookContext(scout, memory, buffer, measure(scout));
  emit({ has: true, scout: scout.name, tier: scout.tier, cap: scout.cap, reason: pick.reason, passed: pick.passed, context });
}

await script('unify-scout pick', main);

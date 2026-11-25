/**
 * The scouts the project declares (decision 55): `.pipeline/project.yaml` on the base
 * through `readScouts`. Lists each scout (how often it looks, its budget and the cost cap a
 * look runs under, its paths and measure commands, its findings waiting in the buffer and
 * when it last looked). No scouts declared passes and says so. A section that does not
 * parse (a name the engine's store would refuse, a budget under the smallest cap, no
 * paths or brief) fails the check with the reason.
 *
 * Bound inputs: the pack setting INPUTS_BASE (default main).
 */

import { emit, input, refuse } from 'archon:script';
import { buffered } from '../../.shared/findings.ts';
import { readMemory, readScouts } from '../../.shared/scouts.ts';

function main(): void {
  const base = input('base').trim() || 'main';
  try {
    const scouts = readScouts(base);
    const buffer = buffered();
    emit({
      ok: true,
      base,
      error: null,
      scouts: scouts.map(s => ({
        name: s.name,
        every: s.every,
        budget: s.budget,
        cap: s.cap,
        paths: s.paths,
        measure: s.measure.length,
        waiting: buffer.filter(f => f.scout === s.name).length,
        last: readMemory(s.name).last?.at ?? null,
      })),
    });
  } catch (error) {
    emit({ ok: false, base, error: error instanceof Error ? error.message : String(error), scouts: [] });
  }
}

try {
  main();
} catch (error) {
  refuse(`unify-ping scouts: ${error instanceof Error ? error.message : String(error)}`);
}

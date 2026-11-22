/**
 * Items the pipeline could not read (decision 43): a failed read of the tracker or of
 * the engine's record is a retry, never a verdict or Blocked; after two failed reads in a
 * row the item is set aside, so it stops holding a place in the work in progress.
 *
 * Every pass reads each open item in a pipeline state with `workitem.view`, and counts an
 * engine record the engine itself reports as unreadable (`degraded`) as a failed read
 * too. The count of failures in a row lives in the state document `revisit/reads`. At two:
 * `work/<n>` gets the flag `set-aside` and the issue the label `pipeline:set-aside` (best
 * effort: the forge may be what fails). A good read clears both and resets the count.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST and INPUTS_REPO_PATH.
 */

import { emit, forge, input, refuse, state } from 'archon:script';
import { itemKey, repoOf } from '../../.shared/repo.ts';
import { STATES } from '../../.shared/states.ts';
import { updateWork } from '../../.shared/work.ts';
import { engineItems, MARKS_REVISIT, message, openWithLabel } from './lib.ts';

const READS = 'revisit/reads';
const SET_ASIDE_AT = 2;

function main(): void {
  const repo = repoOf(input('repo_host'), input('repo_path'));
  const engine = engineItems();
  const numbers = new Set<number>();
  const errors: string[] = [];
  for (const def of Object.values(STATES)) {
    try {
      for (const n of openWithLabel(repo, def.label)) numbers.add(n);
    } catch (error) {
      errors.push(`list ${def.label}: ${message(error)}`);
    }
  }

  const found = state.get(READS);
  const counts: Record<string, number> = { ...((found.value as { counts?: Record<string, number> } | null)?.counts ?? {}) };
  const setAside: number[] = [];
  const restored: number[] = [];
  const failing: { item: number; failures: number; why: string }[] = [];

  for (const number of [...numbers].sort((a, b) => a - b)) {
    const key = String(number);
    const subject = { kind: 'issue' as const, ref: { repo, number } };
    let why: string | null = null;
    let labels: readonly string[] = [];
    try {
      labels = forge('workitem.view', { ref: { repo, number } }).labels ?? [];
    } catch (error) {
      why = `tracker: ${message(error)}`;
    }
    const degraded = engine.get(itemKey(number))?.degraded ?? [];
    if (why === null && degraded.length > 0) why = `engine: ${degraded.map(d => d.reason).join(', ')}`;

    if (why === null) {
      if ((counts[key] ?? 0) > 0) delete counts[key];
      if (labels.includes(MARKS_REVISIT.setAside)) {
        updateWork(number, doc => {
          doc.flags = doc.flags.filter(flag => flag !== 'set-aside');
        });
        forge('workitem.label.remove', { subject, name: MARKS_REVISIT.setAside });
        restored.push(number);
      }
      continue;
    }
    counts[key] = (counts[key] ?? 0) + 1;
    failing.push({ item: number, failures: counts[key], why });
    if (counts[key] === SET_ASIDE_AT) {
      setAside.push(number);
      try {
        updateWork(number, doc => {
          if (!doc.flags.includes('set-aside')) doc.flags.push('set-aside');
        });
        forge('workitem.label.add', { subject, name: MARKS_REVISIT.setAside });
      } catch (error) {
        errors.push(`set aside #${key}: ${message(error)}`);
      }
    }
  }
  // Items no longer in any pipeline state drop out of the count.
  for (const key of Object.keys(counts)) if (!numbers.has(Number(key))) delete counts[key];
  const write = state.put(READS, { counts }, { ifRevision: found.revision });
  if (!write.ok) errors.push(`${READS} moved during this pass (${write.conflict}); the next pass counts again`);
  emit({ checked: numbers.size, failing, set_aside: setAside, restored, errors });
}

try {
  main();
} catch (error) {
  refuse(`pipeline-revisit stale: ${message(error)}`);
}

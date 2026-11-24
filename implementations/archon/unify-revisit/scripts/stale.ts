/**
 * Items the pipeline could not read (decision 43): a failed read of the tracker or of
 * the engine's record is a retry, never a verdict or Blocked; after two failed reads in a
 * row the item is set aside, so it stops holding a place in the work in progress.
 *
 * Every pass takes the items from the engine's store (`work/<key>`), first writes what
 * waits for each in the tracker (writes queued while it was down, decision 47), then
 * reads each open item in a pipeline state from the tracker, and counts an engine record
 * the engine itself reports as unreadable (`degraded`) as a failed read too. The count of
 * failures in a row lives in the state document `revisit/reads`. At two: `work/<key>`
 * gets the flag `set-aside` and the tracker shows it as the label `pipeline:set-aside`
 * (best effort: the tracker may be what fails). A good read clears both and resets the
 * count.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST and INPUTS_REPO_PATH.
 */

import { emit, state } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { type ItemKey, keySlug } from '../../.shared/item.ts';
import { runKey } from '../../.shared/repo.ts';
import { SET_ASIDE } from '../../.shared/request.ts';
import { updateWork } from '../../.shared/work.ts';
import { engineItems, MARKS_REVISIT, message, workItems } from './lib.ts';

const READS = 'revisit/reads';
const SET_ASIDE_AT = 2;

async function main(): Promise<void> {
  const t = tracker();
  const engine = engineItems();
  const held = workItems();
  const errors: string[] = [];

  let flushed = 0;
  for (const item of held) {
    try {
      flushed += await t.flush(item.key);
    } catch (error) {
      errors.push(`flush ${item.key}: ${message(error)}`);
    }
  }

  const found = state.get(READS);
  const counts: Record<string, number> = { ...((found.value as { counts?: Record<string, number> } | null)?.counts ?? {}) };
  const setAside: ItemKey[] = [];
  const restored: ItemKey[] = [];
  const failing: { item: ItemKey; failures: number; why: string }[] = [];
  const checked = new Set<string>();

  for (const item of held) {
    if (item.state === null) continue;
    const { key } = item;
    const slug = keySlug(key);
    let why: string | null = null;
    try {
      if (!(await t.view(key)).open) continue;
    } catch (error) {
      why = `tracker: ${message(error)}`;
    }
    checked.add(slug);
    const degraded = engine.get(runKey(key))?.degraded ?? [];
    if (why === null && degraded.length > 0) why = `engine: ${degraded.map(d => d.reason).join(', ')}`;

    if (why === null) {
      if ((counts[slug] ?? 0) > 0) delete counts[slug];
      if (item.flags.includes(SET_ASIDE)) {
        updateWork(key, doc => {
          doc.flags = doc.flags.filter(flag => flag !== SET_ASIDE);
        });
        await t.label(key, { remove: [MARKS_REVISIT.setAside] });
        restored.push(key);
      }
      continue;
    }
    counts[slug] = (counts[slug] ?? 0) + 1;
    failing.push({ item: key, failures: counts[slug], why });
    if (counts[slug] === SET_ASIDE_AT) {
      setAside.push(key);
      try {
        updateWork(key, doc => {
          if (!doc.flags.includes(SET_ASIDE)) doc.flags.push(SET_ASIDE);
        });
        await t.label(key, { add: [MARKS_REVISIT.setAside] });
      } catch (error) {
        errors.push(`set aside ${key}: ${message(error)}`);
      }
    }
  }
  // Items no longer in any pipeline state drop out of the count.
  for (const slug of Object.keys(counts)) if (!checked.has(slug)) delete counts[slug];
  const write = state.put(READS, { counts }, { ifRevision: found.revision });
  if (!write.ok) errors.push(`${READS} moved during this pass (${write.conflict}); the next pass counts again`);
  emit({ checked: checked.size, failing, set_aside: setAside, restored, flushed, errors });
}

await script('unify-revisit stale', main);

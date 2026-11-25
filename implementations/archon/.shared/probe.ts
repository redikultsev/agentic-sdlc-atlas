/**
 * The probe of a project map on one test item (decision 46): every operation the map
 * declares is run through the connector, so its write rules hold (once per key, read
 * back), and each gets a line: passed, failed with the tracker's words, or not probed and
 * why. Nothing is created or closed: those change the project, so they are reported as
 * not probed. The probe label and comment are left only when a removal fails, and the
 * result says so.
 */

import type { Tracker } from './connector.ts';
import type { ItemKey } from './item.ts';

export const PROBE_LABEL = 'pipeline:probe';

export interface ProbeLine {
  readonly op: string;
  readonly result: 'passed' | 'failed' | 'not-probed';
  readonly detail: string;
}

export interface ProbeReport {
  readonly ok: boolean;
  readonly lines: readonly ProbeLine[];
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export async function probeMap(t: Tracker, key: ItemKey, run: string): Promise<ProbeReport> {
  const lines: ProbeLine[] = [];
  const step = async (op: string, body: () => Promise<string>): Promise<boolean> => {
    try {
      lines.push({ op, result: 'passed', detail: await body() });
      return true;
    } catch (error) {
      lines.push({ op, result: 'failed', detail: message(error) });
      return false;
    }
  };
  const skip = (op: string, detail: string) => lines.push({ op, result: 'not-probed', detail });

  await step('view', async () => {
    const v = await t.view(key);
    if (v.title.trim() === '') throw new Error(`${key} reads with an empty title: check read.title`);
    if (v.creator === null) throw new Error(`${key} reads with no creator: check read.creator (trust needs it, decision 39)`);
    return `"${v.title.slice(0, 60)}", ${v.open ? 'open' : 'closed'}, ${v.labels.length} label(s), created by ${v.creator.login ?? v.creator.id}`;
  });
  await step('comments', async () => `${(await t.comments(key)).length} comment(s)`);
  const added = await step('label.add', async () => {
    await t.label(key, { add: [PROBE_LABEL] });
    return `${PROBE_LABEL} added and read back`;
  });
  if (added) {
    await step('label.remove', async () => {
      await t.label(key, { remove: [PROBE_LABEL] });
      return `${PROBE_LABEL} removed and read back`;
    });
  } else skip('label.remove', 'the label could not be added');
  const marker = `pipeline-probe:${run}`;
  const commented = await step('comment', async () => {
    const id = await t.comment(key, marker, `Pipeline probe ${run}: the pipeline checks it can comment here. Nothing to do.`);
    if (id === null) throw new Error('the tracker was down: the comment is queued, not written');
    return `comment ${id} written and read back`;
  });
  if (!t.has('comment-edit')) skip('comment.edit', 'not declared: a retried comment is left as first written');
  else if (commented) {
    await step('comment.edit', async () => {
      await t.comment(key, marker, `Pipeline probe ${run}: edited and read back. Nothing to do.`);
      return 'edited and read back';
    });
  } else skip('comment.edit', 'the comment could not be written');
  if (!t.has('list')) skip('list', 'not declared: intake and the registers need it');
  else {
    await step('list', async () => {
      const open = await t.list(null);
      return `${open.length} open item(s)${open.some(i => i.key === key) ? `, ${key} among them` : `; ${key} is not among them, check read.key or the query`}`;
    });
  }
  if (!t.has('blockers')) skip('blockers', 'not declared: revisit cannot see a closed blocker');
  else await step('blockers', async () => `${((await t.blockers(key)) ?? []).length} blocker(s)`);
  if (!t.has('label-set-by')) skip('label.set-by', 'not declared: an approval label counts only with its setter (decision 39)');
  else if (added) await step('label.set-by', async () => `${PROBE_LABEL} was last set by ${(await t.labelSetBy(key, PROBE_LABEL)) ?? 'nobody the tracker names'}`);
  else skip('label.set-by', 'the probe label could not be added');
  for (const op of ['create', 'close', 'slice', 'blocked-by'] as const) {
    skip(op, t.has(op) ? 'declared; not probed, since it changes the project' : 'not declared');
  }
  return { ok: lines.every(l => l.result !== 'failed'), lines };
}

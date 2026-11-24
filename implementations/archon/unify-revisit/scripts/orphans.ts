/**
 * Two checks on items the engine holds in an agent state (Triaging, Specifying, Planning,
 * Implementing, Verifying, Releasing, Live), the states where a run should be working the item:
 *
 * 1. Orphans (a restart, a dead run, a fire that started nothing): no run of the item is
 *    pending, running or paused, no start of it is queued in the engine, `work/<key>` does
 *    not record its last fire as queued (a queued fire counts as live), and no question
 *    of it is open. Such an item gets one comment and the label `pipeline:needs-attention`:
 *    the pipeline never guesses which step to restart.
 * 2. Runs over the project's limits (`limits.sessionMinutes`, `limits.sessionUsd` in
 *    `.pipeline/project.yaml`; decision 29, enforced here until the sandbox does it per
 *    session): a running run is cancelled (`archon workflow cancel`), a paused one
 *    abandoned (`archon workflow abandon`), through the host CLI in ARCHON_CLI_COMMAND,
 *    and one failed round is counted in `work/<key>`, once per run. Not counted as over: a
 *    unify-deploy run (its watch window is a clock of its own), a run the Operator
 *    paused, and a run paused at a question or a provider usage limit. A run whose cost
 *    the provider does not report is listed as cost unknown, not stopped.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST and INPUTS_REPO_PATH; the pack setting
 * INPUTS_BASE.
 */

import { emit, input } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { type ItemKey, keySlug } from '../../.shared/item.ts';
import { projectPolicy } from '../../.shared/policy.ts';
import { runKey } from '../../.shared/repo.ts';
import type { State } from '../../.shared/states.ts';
import { readWork, updateWork } from '../../.shared/work.ts';
import { engineItems, hostCommand, MARKS_REVISIT, message, workItems, type EngineItem } from './lib.ts';

const AGENT_STATES: readonly State[] = ['triaging', 'specifying', 'planning', 'implementing', 'verifying', 'releasing', 'live'];
const LIVE_RUN = new Set(['pending', 'running', 'paused']);

type Run = EngineItem['runs'][number];

function exempt(run: Run, entry: EngineItem): string | null {
  if (run.workflow.endsWith('unify-deploy')) return 'a deploy watch window';
  if (run.operatorPause !== null) return 'paused by the Operator';
  if (run.status === 'paused') {
    if (entry.questions.some(q => 'run' in q && q.run !== undefined && q.run.id === run.id)) return 'paused at a question';
    if (entry.waits.some(w => w.runId === run.id)) return 'waiting for an event';
  }
  return null;
}

async function main(): Promise<void> {
  const base = input('base').trim() || 'main';
  const limits = projectPolicy(base).limits;
  const engine = engineItems();
  const now = Date.now();

  const orphans: { item: ItemKey; state: string; flagged: boolean }[] = [];
  const stopped: { item: ItemKey; run: string; workflow: string; action: string; why: string; ok: boolean; detail: string }[] = [];
  const costUnknown: { item: ItemKey; run: string }[] = [];
  const errors: string[] = [];

  const held = workItems();
  for (const state of AGENT_STATES) {
    for (const { key } of held.filter(item => item.state === state)) {
      try {
        const entry = engine.get(runKey(key));
        const runs = entry?.runs ?? [];

        // 2. Runs over the limits.
        for (const run of runs) {
          if (run.status !== 'running' && run.status !== 'paused') continue;
          if (entry === undefined || exempt(run, entry) !== null) continue;
          const minutes = (now - Date.parse(run.startedAt)) / 60_000;
          const usd = run.spend.usd;
          if (usd === null && (run.spend.inputTokens ?? 0) + (run.spend.outputTokens ?? 0) > 0) costUnknown.push({ item: key, run: run.id });
          const why =
            minutes > limits.sessionMinutes
              ? `ran ${String(Math.round(minutes))} min, over the ${String(limits.sessionMinutes)} min limit`
              : usd !== null && usd > limits.sessionUsd
                ? `cost $${usd.toFixed(2)}, over the $${String(limits.sessionUsd)} limit`
                : null;
          if (why === null) continue;
          const action = run.status === 'running' ? 'cancel' : 'abandon';
          const result = hostCommand(['workflow', action, run.id, '--json']);
          const ok = result.code === 0;
          if (ok) {
            updateWork(key, doc => {
              const flag = `limit-stopped:${run.id}`;
              if (doc.flags.includes(flag)) return;
              doc.flags.push(flag);
              doc.rounds += 1;
            });
            await tracker().comment(key, `pipeline-limit:${run.id}`, `**Stopped over the limit**: run ${run.id} (${run.workflow}) ${why}. It was ${action === 'cancel' ? 'cancelled' : 'abandoned'} and counts as one failed round (decision 29).`);
          }
          stopped.push({ item: key, run: run.id, workflow: run.workflow, action, why, ok, detail: ok ? '' : result.text.slice(0, 300) });
        }

        // 1. Orphans.
        const live = runs.some(run => LIVE_RUN.has(run.status));
        const queued = (entry?.queued.length ?? 0) > 0 || readWork(key).doc.lastFire?.disposition === 'queued';
        const asking = (entry?.questions.length ?? 0) > 0;
        if (live || queued || asking) continue;
        const view = await tracker().view(key);
        if (!view.open) continue;
        const flagged = view.labels.includes(MARKS_REVISIT.needsAttention);
        if (!flagged) {
          await tracker().comment(
            key,
            `pipeline-orphan:${keySlug(key)}:${state}`,
            [
              `**Nothing is working this item**: it is ${state}, but no run of it is live, none is queued and no question is open.`,
              '',
              'Why you: a run ended without moving the label (a restart, a crash, a fire that started nothing), and the pipeline does not guess which step to restart. Restart the step, or set the label to where the item really is, then remove `pipeline:needs-attention`.',
            ].join('\n')
          );
          await tracker().label(key, { add: [MARKS_REVISIT.needsAttention] });
        }
        orphans.push({ item: key, state, flagged: !flagged });
      } catch (error) {
        errors.push(`${key}: ${message(error)}`);
      }
    }
  }
  emit({ orphans, stopped, cost_unknown: costUnknown, errors });
}

await script('unify-revisit orphans', main);

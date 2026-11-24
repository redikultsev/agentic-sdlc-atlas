/**
 * Two checks on items the engine holds in an agent state (Triaging, Specifying, Planning,
 * Implementing, Verifying, Releasing, Live), the states where a run should be working the
 * item, and in TestReview (not an Operator state, decision 50: its run waits at the
 * answerer's gate, so a paused run there is waiting, not stuck):
 *
 * 1. Orphans (a restart, a dead run, a fire that started nothing): no run of the item is
 *    pending, running or paused, no start of it is queued in the engine, `work/<key>` does
 *    not record its last fire as queued (a queued fire counts as live), no question of it
 *    is open, and it does not wait in the queue of a shared environment (a `queued:` flag:
 *    waiting is a condition inside Verifying, decision 51, and no time limit counts). A
 *    Live item counts as worked while a release run (engine key `release`) is live or
 *    queued; a Releasing item is never an orphan: it waits for a release, and the hourly
 *    release run cuts one (and resumes a release whose run died). Such an item gets one
 *    comment and the label `pipeline:needs-attention`: the pipeline never guesses which
 *    step to restart.
 * 2. Runs over the project's limits (`limits.sessionMinutes`, `limits.sessionUsd` in
 *    `.pipeline/project.yaml`; decision 29, enforced here until the sandbox does it per
 *    session): a running run is cancelled (`archon workflow cancel`), a paused one
 *    abandoned (`archon workflow abandon`), through the host CLI in ARCHON_CLI_COMMAND,
 *    and one failed round is counted in `work/<key>`, once per run. Not counted as over: a
 *    unify-deploy run (its watch window is a clock of its own), a run the Operator
 *    paused, a run paused at a question or a provider usage limit, and a run of an item in
 *    TestReview or queued for an environment (waiting for an answerer or a hold). A run whose cost
 *    the provider does not report is listed as cost unknown, not stopped.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST and INPUTS_REPO_PATH; the pack setting
 * INPUTS_BASE.
 */

import { emit, input } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { type ItemKey, keySlug } from '../../.shared/item.ts';
import { projectPolicy } from '../../.shared/policy.ts';
import { RELEASE_RUN } from '../../.shared/releases.ts';
import { runKey } from '../../.shared/repo.ts';
import type { State } from '../../.shared/states.ts';
import { readWork, updateWork } from '../../.shared/work.ts';
import { engineItems, hostCommand, MARKS_REVISIT, message, workItems, type EngineItem } from './lib.ts';

const AGENT_STATES: readonly State[] = ['triaging', 'specifying', 'planning', 'implementing', 'verifying', 'test-review', 'releasing', 'live'];

/** Waiting for a shared environment's hold (decision 51): `queued:<env>/<service>` in the item's flags. */
export function waitsForHold(flags: readonly string[]): boolean {
  return flags.some(flag => flag.startsWith('queued:'));
}
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
  const release = engine.get(RELEASE_RUN);
  const releaseWorking = (release?.runs.some(run => LIVE_RUN.has(run.status)) ?? false) || (release?.queued.length ?? 0) > 0;
  for (const state of AGENT_STATES) {
    for (const { key, flags } of held.filter(item => item.state === state)) {
      const waiting = state === 'test-review' || waitsForHold(flags);
      try {
        const entry = engine.get(runKey(key));
        const runs = entry?.runs ?? [];

        // 2. Runs over the limits.
        for (const run of runs) {
          if (run.status !== 'running' && run.status !== 'paused') continue;
          if (entry === undefined || waiting || exempt(run, entry) !== null) continue;
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
        // A Live item is watched by the release run, under the engine key `release`, not its own.
        const live = runs.some(run => LIVE_RUN.has(run.status)) || (state === 'live' && releaseWorking);
        const queued = (entry?.queued.length ?? 0) > 0 || readWork(key).doc.lastFire?.disposition === 'queued' || waitsForHold(flags);
        const asking = (entry?.questions.length ?? 0) > 0;
        // Releasing waits for a release: the hourly release run cuts every merged item there.
        if (live || queued || asking || state === 'releasing') continue;
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

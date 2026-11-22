/**
 * The numbers the Watcher reads: before and after this deploy, for every signal the
 * project declares in `.pipeline/project.yaml` (`deploy.signals`), computed here and never
 * by the agent.
 *
 * A signal is `"<name>: <command>"` (or a bare command, named by itself). The command
 * runs with SIGNAL_FROM and SIGNAL_TO (ISO times) and prints one number for that span: an
 * error count per minute, a latency, orders per minute. Windows, with D the deploy and N
 * now:
 *   after       [D, N]
 *   before      [D - (N - D), D]          the same length just before the deploy
 *   day_before  [D - 24h, N - 24h]        the same hours a day earlier
 * Each window leaves out the minutes of every other deploy (its record from start to end
 * plus 5 minutes to settle), so another change's effect is not read as this one's; the
 * window is cut into the spans between them and a signal is the duration-weighted mean
 * over those spans. A project that declares no signals gets the health check only: the
 * deploy hook's result, and `coverage: health-only`, which `outcome` notes at Done.
 *
 * Also hands the Watcher the paths the PR changed and their patches (marked untrusted,
 * cut at 20 KB): it watches what the PR touches first.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST, INPUTS_REPO_PATH, INPUTS_NUMBER; the
 * pack setting INPUTS_BASE; INPUTS_PR, INPUTS_DEPLOYED_AT, INPUTS_DEPLOY_OK from the
 * deploy nodes.
 */

import { emit, forge, input, refuse, runId } from 'archon:script';
import { projectPolicy } from '../../.shared/policy.ts';
import { itemNumber, repoOf } from '../../.shared/repo.ts';
import { untrusted } from '../../.shared/trust.ts';
import { allDeploys } from './lib.ts';

const MINUTE = 60_000;
const SETTLE = 5 * MINUTE;
const SIGNAL_TIMEOUT_MS = 60_000;
const PATCH_BUDGET = 20_000;

type Span = readonly [number, number];

/** `[from, to]` with every excluded span cut out. */
function cut(window: Span, excluded: readonly Span[]): Span[] {
  let spans: Span[] = [window];
  for (const [xFrom, xTo] of excluded) {
    spans = spans.flatMap(([from, to]): Span[] => {
      if (xTo <= from || xFrom >= to) return [[from, to]];
      const parts: Span[] = [];
      if (xFrom > from) parts.push([from, xFrom]);
      if (xTo < to) parts.push([xTo, to]);
      return parts;
    });
  }
  return spans.filter(([from, to]) => to - from >= MINUTE);
}

function parseSignal(entry: string): { name: string; command: string } {
  const match = /^([\w .-]{1,40}):\s+(.+)$/.exec(entry.trim());
  return match ? { name: match[1].trim(), command: match[2] } : { name: entry.trim(), command: entry.trim() };
}

/** The duration-weighted mean of the command over the spans, or the first error. */
function measure(command: string, spans: readonly Span[]): { value: number | null; error: string | null } {
  if (spans.length === 0) return { value: null, error: 'no span left after cutting out other deploys' };
  let weighted = 0;
  let total = 0;
  for (const [from, to] of spans) {
    const result = Bun.spawnSync(['sh', '-c', command], {
      env: { ...process.env, SIGNAL_FROM: new Date(from).toISOString(), SIGNAL_TO: new Date(to).toISOString() },
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: SIGNAL_TIMEOUT_MS,
    });
    const text = result.stdout.toString().trim();
    const value = Number(text.split(/\s+/)[0]);
    if (result.exitCode !== 0 || text === '' || !Number.isFinite(value)) {
      const why = result.exitCode !== 0 ? `exit ${String(result.exitCode)}: ${result.stderr.toString().trim().split('\n')[0] ?? ''}` : `printed '${text.slice(0, 60)}', not a number`;
      return { value: null, error: why };
    }
    weighted += value * (to - from);
    total += to - from;
  }
  return { value: weighted / total, error: null };
}

function round(value: number | null): number | null {
  return value === null ? null : Math.round(value * 1000) / 1000;
}

function main(): void {
  const repo = repoOf(input('repo_host'), input('repo_path'));
  const number = itemNumber(input('number'));
  if (number === undefined) return;
  const base = input('base').trim() || 'main';
  const pr = Number(input('pr')) || null;
  const deployedAtText = input('deployed_at').trim();
  const deployOk = input('deploy_ok').trim() !== 'false';
  const policy = projectPolicy(base);
  const run = runId();

  const deployedAt = Date.parse(deployedAtText);
  if (!Number.isFinite(deployedAt)) throw new Error(`no deploy time (got '${deployedAtText}')`);
  const now = Date.now();
  const endsAt = deployedAt + policy.deploy.windowMinutes * MINUTE;
  const elapsed = Math.max(0, now - deployedAt);

  const others = allDeploys().filter(record => record.runId !== run);
  const excluded: Span[] = others.map(record => {
    const from = Date.parse(record.startedAt);
    const to = record.endedAt === null ? now : Date.parse(record.endedAt);
    return [from, to + SETTLE] as const;
  });
  const windows = {
    after: [deployedAt, now] as const,
    before: [deployedAt - elapsed, deployedAt] as const,
    day_before: [deployedAt - 86_400_000, now - 86_400_000] as const,
  };
  const spans = {
    after: cut(windows.after, excluded),
    before: cut(windows.before, excluded),
    day_before: cut(windows.day_before, excluded),
  };
  const excludedNearby = others
    .filter(record => Date.parse(record.startedAt) <= now && (record.endedAt === null ? now : Date.parse(record.endedAt)) + SETTLE >= windows.day_before[0])
    .map(record => ({ item: record.item, pr: record.pr, from: record.startedAt, to: record.endedAt }));

  const declared = policy.deploy.signals.map(parseSignal);
  const signals = declared.map(({ name, command }) => {
    const after = measure(command, spans.after);
    const before = measure(command, spans.before);
    const dayBefore = measure(command, spans.day_before);
    const delta = after.value !== null && before.value !== null && before.value !== 0 ? ((after.value - before.value) / Math.abs(before.value)) * 100 : null;
    return {
      name,
      before: round(before.value),
      after: round(after.value),
      day_before: round(dayBefore.value),
      delta_pct: round(delta),
      error: after.error ?? before.error ?? dayBefore.error,
    };
  });

  let files: { path: string; status: string }[] = [];
  let patches = '';
  if (pr !== null) {
    const listed = forge('pr.files', { ref: { repo, number: pr } });
    files = listed.files.map(file => ({ path: file.path, status: file.status }));
    let budget = PATCH_BUDGET;
    const parts: string[] = [];
    for (const file of listed.files) {
      if (file.patch === null || budget <= 0) continue;
      const piece = `--- ${file.path}\n${file.patch}`.slice(0, budget);
      budget -= piece.length;
      parts.push(piece);
    }
    patches = parts.length === 0 ? '' : untrusted(`diff of PR #${String(pr)}`, parts.join('\n'));
  }

  emit({
    coverage: declared.length === 0 ? 'health-only' : 'full',
    health: { deploy_ok: deployOk },
    signals,
    window: {
      deployed_at: new Date(deployedAt).toISOString(),
      now: new Date(now).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      ended: now >= endsAt,
      elapsed_minutes: Math.round(elapsed / MINUTE),
    },
    excluded: excludedNearby,
    pr,
    files,
    patches,
  });
}

try {
  main();
} catch (error) {
  refuse(`unify-deploy signals: ${error instanceof Error ? error.message : String(error)}`);
}

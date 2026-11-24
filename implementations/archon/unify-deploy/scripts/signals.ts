/**
 * The numbers the Watcher reads: before and after this release's deploy to the watched
 * environment, for every signal that environment declares in `.pipeline/project.yaml`
 * (`watch.signals`; `deploy.signals` in shape A), computed here and never by the agent.
 *
 * A signal is `"<name>: <command>"` (or a bare command, named by itself). The command
 * runs with SIGNAL_FROM and SIGNAL_TO (ISO times) and prints one number for that span: an
 * error count per minute, a latency, orders per minute. Windows, with D the deploy and N
 * now:
 *   after       [D, N]
 *   before      [D - (N - D), D]          the same length just before the deploy
 *   day_before  [D - 24h, N - 24h]        the same hours a day earlier
 * After a toggle was turned off in this window (decision 61), D in `after` and
 * `day_before` is the last toggle, so the minutes before it do not count against it.
 * Each window leaves out the minutes of every other deploy to the same environment (its
 * record from start to end plus 5 minutes to settle), so another change's effect is not
 * read as this one's; the window is cut into the spans between them and a signal is the
 * duration-weighted mean over those spans. An environment that declares no signals gets
 * the health check only: the deploy's result, and `coverage: health-only`, which
 * `outcome` notes at Done.
 *
 * Also hands the Watcher every item of the release with its PR and the paths it changed,
 * and their patches (marked untrusted, cut at 20 KB in all): it watches what the items
 * touch first and names the culprit.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST, INPUTS_REPO_PATH; the pack setting
 * INPUTS_BASE; INPUTS_RELEASE from cut; INPUTS_ENV, INPUTS_DEPLOYED_AT and
 * INPUTS_DEPLOY_OK from promote.
 */

import { emit, input, runId } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { readDeploys } from '../../.shared/environments.ts';
import { runInputs } from '../../.shared/repo.ts';
import { untrusted } from '../../.shared/trust.ts';
import { allDeploys, itemFiles, mustRelease, readDeploy, releaseSubject, watchedEnv } from './lib.ts';

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


async function main(): Promise<void> {
  const { repo } = runInputs();
  const base = input('base').trim() || 'main';
  const id = input('release').trim();
  const env = watchedEnv(readDeploys(base), input('env').trim());
  const release = mustRelease(id);
  const deployedAtText = input('deployed_at').trim();
  const deployOk = input('deploy_ok').trim() !== 'false';
  const run = runId();
  const minutes = env.watch?.minutes ?? 30;
  const toggled = readDeploy(releaseSubject(id, env.name), run).record?.watch?.toggled ?? [];

  const deployedAt = Date.parse(deployedAtText);
  if (!Number.isFinite(deployedAt)) throw new Error(`no deploy time (got '${deployedAtText}')`);
  const now = Date.now();
  const endsAt = deployedAt + minutes * MINUTE;
  const lastToggle = toggled.length === 0 ? null : Date.parse(toggled[toggled.length - 1].at);
  const from = lastToggle === null ? deployedAt : Math.max(deployedAt, lastToggle);
  const elapsed = Math.max(0, now - from);

  // A record from before environments is production's.
  const others = allDeploys().filter(record => record.runId !== run && (record.env ?? 'production') === env.name);
  const excluded: Span[] = others.map(record => {
    const start = Date.parse(record.startedAt);
    const end = record.endedAt === null ? now : Date.parse(record.endedAt);
    return [start, end + SETTLE] as const;
  });
  const windows = {
    after: [from, now] as const,
    before: [deployedAt - elapsed, deployedAt] as const,
    day_before: [from - 86_400_000, now - 86_400_000] as const,
  };
  const spans = {
    after: cut(windows.after, excluded),
    before: cut(windows.before, excluded),
    day_before: cut(windows.day_before, excluded),
  };
  const excludedNearby = others
    .filter(record => Date.parse(record.startedAt) <= now && (record.endedAt === null ? now : Date.parse(record.endedAt)) + SETTLE >= windows.day_before[0])
    .map(record => ({ item: record.item, items: record.items ?? [record.item], pr: record.pr, reason: record.reason ?? (record.revert ? 'rollback' : 'normal'), from: record.startedAt, to: record.endedAt }));

  const declared = (env.watch?.signals ?? []).map(parseSignal);
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

  const changed = itemFiles(repo, release.items);
  const items = changed.map(i => ({ key: i.key, pr: i.pr, files: i.files.map(f => ({ path: f.path, status: f.status })) }));
  let budget = PATCH_BUDGET;
  const parts: string[] = [];
  for (const item of changed) {
    for (const file of item.files) {
      if (file.patch === null || budget <= 0) continue;
      const piece = `--- ${item.key} ${file.path}\n${file.patch}`.slice(0, budget);
      budget -= piece.length;
      parts.push(piece);
    }
  }
  const single = items.length === 1 ? items[0] : null;

  emit({
    coverage: declared.length === 0 ? 'health-only' : 'full',
    ended: now >= endsAt,
    health: { deploy_ok: deployOk },
    signals,
    window: {
      deployed_at: new Date(deployedAt).toISOString(),
      after_from: new Date(from).toISOString(),
      now: new Date(now).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      ended: now >= endsAt,
      elapsed_minutes: Math.round(elapsed / MINUTE),
    },
    excluded: excludedNearby,
    release: id,
    env: env.name,
    items,
    toggled,
    pr: single?.pr ?? null,
    files: single?.files ?? [],
    patches: parts.length === 0 ? '' : untrusted(`diff of release ${id}`, parts.join('\n')),
  });
}

await script('unify-deploy signals', main);

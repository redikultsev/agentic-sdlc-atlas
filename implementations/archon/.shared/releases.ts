/**
 * Releases (decisions 48, 52, 53): what is merged waits in Releasing until a release takes
 * it. A release is a record in the engine's store `releases/<id>`: the base commit it
 * ships, the items it carries, why it was made, and how far it got in each environment
 * after merge. Releases run one at a time (the release run's engine key is `release`).
 *
 * The release line (`releases-line`) is blocked after a rollback: no production promotion
 * from a base that does not hold the culprit's revert or fix (decision 52). The previous
 * verified version of an environment is the last release that passed its checks there.
 *
 * What a rollback does with the items of a release is `rollbackPlan`: pure, so the rules of
 * decision 52 are tested without an engine.
 */

import { items, state } from 'archon:script';
import type { ItemKey } from './item.ts';

export type EnvStatus = 'deploying' | 'deployed' | 'verified' | 'failed' | 'rolled-back';

export interface Release {
  readonly id: string;
  readonly at: string;
  /** The base commit the release ships. */
  readonly commit: string;
  readonly items: readonly ItemKey[];
  readonly reason: 'normal' | 'rollback';
  readonly urgent: boolean;
  envs: Record<string, { status: EnvStatus; at: string; note: string }>;
}

export interface Line {
  /** Set by a rollback; cleared when a base holding `clearedBy` is released. */
  blocked: { release: string; culprit: ItemKey | null; since: string; clearedBy: string | null } | null;
}

export function releaseName(id: string): string {
  return `releases/${id}`;
}

/** The engine key every release run starts under (fireNext's `runItem`): one release at a time. */
export const RELEASE_RUN = 'release';

/**
 * The release runs the engine has under the key `release`, other than `except` (the
 * caller's own run): the ids of those pending, running or paused, and how many starts are
 * queued. Reads the engine's items of the last 30 days.
 */
export function releaseRuns(except: string | null = null): { readonly live: readonly string[]; readonly queued: number } {
  let page = items({ since: '30d', limit: 100 });
  for (let pages = 0; pages < 50; pages++) {
    const entry = page.items.find(e => e.item.key === RELEASE_RUN);
    if (entry !== undefined) {
      return { live: entry.runs.filter(r => r.id !== except && ['pending', 'running', 'paused'].includes(r.status)).map(r => r.id), queued: entry.queued.length };
    }
    if (page.next === null) break;
    page = items({ after: page.next });
  }
  return { live: [], queued: 0 };
}

export function readRelease(id: string): Release | null {
  return (state.get(releaseName(id)).value as Release | null) ?? null;
}

/** Create the release once (a retry finds it); its id comes from what it ships. */
export function createRelease(release: Release): Release {
  const name = releaseName(release.id);
  const found = state.get(name);
  if (found.value !== null && found.value !== undefined) return found.value as Release;
  if (!state.put(name, release, { ifRevision: found.revision }).ok) return state.get(name).value as Release;
  return release;
}

export function setEnvStatus(id: string, env: string, status: EnvStatus, note = ''): void {
  const name = releaseName(id);
  for (let attempt = 0; attempt < 3; attempt++) {
    const found = state.get(name);
    const release = found.value as Release | null;
    if (release === null) throw new Error(`${name} does not exist`);
    release.envs = { ...release.envs, [env]: { status, at: new Date().toISOString(), note } };
    if (state.put(name, release, { ifRevision: found.revision }).ok) return;
  }
  throw new Error(`${name} kept moving under three writes`);
}

export function allReleases(): Release[] {
  return state
    .listValues('releases/')
    .map(found => found.value as Release)
    .filter(r => r !== null && typeof r === 'object' && typeof r.id === 'string')
    .sort((a, b) => a.at.localeCompare(b.at));
}

/** The last release that passed its checks on `env`, other than `except`. */
export function previousVerified(env: string, except: string | null = null): Release | null {
  const verified = allReleases().filter(r => r.id !== except && r.envs[env]?.status === 'verified');
  return verified[verified.length - 1] ?? null;
}

export function readLine(): Line {
  return { blocked: null, ...((state.get('releases-line').value as Partial<Line> | null) ?? {}) };
}

export function updateLine(fn: (line: Line) => void): void {
  for (let attempt = 0; attempt < 3; attempt++) {
    const found = state.get('releases-line');
    const line: Line = { blocked: null, ...((found.value as Partial<Line> | null) ?? {}) };
    fn(line);
    if (state.put('releases-line', line, { ifRevision: found.revision }).ok) return;
  }
  throw new Error('releases-line kept moving under three writes');
}

/**
 * May a release of `commit` go to production? Blocked until the base holds the commit that
 * clears the line (the culprit's revert or fix), told by `contains(commit, clearedBy)`.
 */
export function lineAllows(commit: string, contains: (commit: string, ancestor: string) => boolean): { readonly ok: boolean; readonly reason: string } {
  const { blocked } = readLine();
  if (blocked === null) return { ok: true, reason: '' };
  if (blocked.clearedBy !== null && contains(commit, blocked.clearedBy)) {
    updateLine(line => (line.blocked = null));
    return { ok: true, reason: `the line was blocked by release ${blocked.release}; ${commit} holds ${blocked.clearedBy}` };
  }
  return {
    ok: false,
    reason: `the release line is blocked since release ${blocked.release} was rolled back${blocked.culprit ? ` (culprit ${blocked.culprit})` : ''}; ${blocked.clearedBy ? `${commit} does not hold ${blocked.clearedBy}` : 'no revert or fix has merged yet'}`,
  };
}

export interface RollbackPlan {
  /** What runs at once: turn toggles off, revert the culprit (shape A), deploy the previous verified version, or nothing. */
  readonly first: 'toggle' | 'revert' | 'previous' | 'none';
  readonly toggles: readonly string[];
  readonly rolledBack: readonly ItemKey[];
  readonly backToReleasing: readonly ItemKey[];
  readonly blockLine: boolean;
  /** No culprit, or nothing can be redeployed: the Operator decides, with the evidence. */
  readonly ask: boolean;
}

/**
 * Decision 52 with 61 and 26: a culprit behind a toggle is turned off alone, the others
 * stay Live and the line stays open (if the toggle does not help, the caller plans again
 * without it). Otherwise the environment's rollback runs at once: `revert` reverts the
 * culprit (unknown culprit: back to the last version before every open window, which is
 * `previous`); `previous` redeploys the previous verified version; `forward` deploys
 * nothing and asks. A known culprit is RolledBack and the others go back to Releasing;
 * an unknown one leaves every item in Releasing and asks.
 */
export function rollbackPlan(input: {
  readonly items: readonly ItemKey[];
  readonly culprit: ItemKey | null;
  readonly kind: 'revert' | 'previous' | 'forward';
  readonly toggleOf: (key: ItemKey) => string | null;
  readonly togglesTried: boolean;
}): RollbackPlan {
  const { items, culprit, kind } = input;
  const others = items.filter(k => k !== culprit);
  const toggle = culprit === null ? null : input.toggleOf(culprit);
  if (toggle !== null && !input.togglesTried) {
    return { first: 'toggle', toggles: [toggle], rolledBack: [], backToReleasing: [], blockLine: false, ask: false };
  }
  if (kind === 'forward') {
    return { first: 'none', toggles: [], rolledBack: [], backToReleasing: [], blockLine: false, ask: true };
  }
  if (culprit !== null) {
    // A revert lands on the base itself, so the next release holds it already; a redeploy leaves the base ahead of production.
    return { first: kind === 'revert' ? 'revert' : 'previous', toggles: [], rolledBack: [culprit], backToReleasing: others, blockLine: kind === 'previous', ask: false };
  }
  if (items.length === 1) {
    return { first: kind === 'revert' ? 'revert' : 'previous', toggles: [], rolledBack: [...items], backToReleasing: [], blockLine: kind === 'previous', ask: false };
  }
  return { first: 'previous', toggles: [], rolledBack: [], backToReleasing: [...items], blockLine: true, ask: true };
}

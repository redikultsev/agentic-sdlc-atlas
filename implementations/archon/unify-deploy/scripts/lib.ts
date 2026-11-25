/**
 * What the release run's scripts share, and nothing outside this workflow needs: the
 * deploy records, the rollback counter, the revert, the rollback itself, the Operator's
 * open requests, and the endings (Done, RolledBack, back to Releasing).
 *
 * Deploy records live at `deploys/<subject>/<run id>`, one per deploy: the subject is the
 * item's slug for a revert's deploy, `release-<id>/<env>` for a release's deploy to one
 * environment. Every record carries its environment and its reason (normal, rollback;
 * decision 52). `signals` reads every record of the watched environment to cut the
 * minutes of other deploys out of its before/after windows; `act` writes the watch result
 * into the production record of this run, because a loop's output is not the body's:
 * `outcome`, `answer` and the Retro read the result from here.
 *
 * The revert is GitHub's own `revertPullRequest` (GraphQL, through the host's `gh`): it
 * needs no checkout and no push. The revert PR carries a marker, and the item's
 * `work/<key>` flags name it (`revert-pr:<m>`, `revert-of:<pr>`, `no-watch:<m>`), so a
 * retry finds it instead of opening a second one, unify-merge can merge it without a
 * gate (decision 26), and the deploy that follows its merge is not watched again.
 */

import { state } from 'archon:script';
import { tracker } from '../../.shared/connector.ts';
import { deployAndCheck, type Deploys, type Environment, environmentsFor, runRecipe, servicesOf } from '../../.shared/environments.ts';
import { forge } from '../../.shared/forge.ts';
import { fireNext } from '../../.shared/fire.ts';
import { git, gitOrThrow } from '../../.shared/git.ts';
import { asKey, type ItemKey, keySlug, parseKey, stateSlug } from '../../.shared/item.ts';
import { previousVerified, readRelease, type Release, type RollbackPlan, rollbackPlan, setEnvStatus, updateLine } from '../../.shared/releases.ts';
import type { Repo } from '../../.shared/repo.ts';
import { moveState } from '../../.shared/states.ts';
import { readWork, updateWork, type WorkDoc } from '../../.shared/work.ts';

export type WatchResult = 'continue' | 'done' | 'rolled-back' | 'unsure';
export type Coverage = 'full' | 'health-only';
export type Method = 'revert' | 'previous' | 'toggle';

export const NEEDS_ATTENTION = 'pipeline:needs-attention';

export interface WatchRecord {
  readonly result: WatchResult;
  readonly coverage: Coverage;
  readonly verdict: string;
  readonly reason: string;
  readonly evidence: readonly string[];
  /** The item the Watcher named, or null when it could not tell. */
  readonly culprit?: ItemKey | null;
  /** What the rollback did with the items (decision 52); null while nothing was rolled back. */
  readonly plan?: RollbackPlan | null;
  /** How production was put back: a revert, the previous verified version, or a toggle. */
  readonly method?: Method | null;
  /** The revert PR opened for each rolled-back item. */
  readonly reverts?: Readonly<Record<ItemKey, number>>;
  /** Toggles turned off in this window, in order; the Watcher's `after` counts from the last. */
  readonly toggled?: readonly { key: ItemKey; toggle: string; at: string }[];
  /** The legacy single-item revert, kept for the records written before releases. */
  readonly revertPr: number | null;
  readonly fire: string | null;
  readonly at: string;
}

export interface DeployRecord {
  /** The item's key (the first item of a release); a number in records written before keys. */
  item: ItemKey | number;
  /** Every item the deploy carries. */
  items?: ItemKey[];
  release?: string | null;
  /** The environment; records written before environments are production's. */
  env?: string;
  /** Why it deployed (decision 52); records written before releases are `normal` unless `revert`. */
  reason?: 'normal' | 'rollback';
  pr: number | null;
  runId: string;
  startedAt: string;
  endedAt: string | null;
  hook: string | null;
  ok: boolean;
  /** The deploy of a revert this pipeline opened: never watched. */
  revert: boolean;
  watch: WatchRecord | null;
}

/** The record subject of an item's own deploy (a revert). */
export function itemSubject(key: ItemKey): string {
  return stateSlug(key);
}

/** The record subject of a release's deploy to one environment. */
export function releaseSubject(id: string, env: string): string {
  return `release-${id}/${env}`;
}

export function deployDocName(subject: string, runId: string): string {
  return `deploys/${subject}/${runId}`;
}

export function readDeploy(subject: string, runId: string): { record: DeployRecord | null; revision: number } {
  const found = state.get(deployDocName(subject, runId));
  return { record: (found.value ?? null) as DeployRecord | null, revision: found.revision };
}

/** Read, change and write back under the revision read; retried on a conflict. */
export function updateDeploy(subject: string, runId: string, change: (record: DeployRecord | null) => DeployRecord): DeployRecord {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { record, revision } = readDeploy(subject, runId);
    const next = change(record === null ? null : { ...record });
    const result = state.put(deployDocName(subject, runId), next, { ifRevision: revision });
    if (result.ok) return next;
  }
  throw new Error(`${deployDocName(subject, runId)} kept moving under three writes`);
}

/** Every deploy record of the project, this run's included. */
export function allDeploys(): DeployRecord[] {
  return state
    .listValues('deploys/')
    .map(doc => doc.value as DeployRecord | null)
    .filter((record): record is DeployRecord => record !== null && typeof record.startedAt === 'string');
}

// ---------------------------------------------------------------- rollback counter

const ROLLBACKS = 'watcher/rollbacks';

export interface RollbackEntry {
  readonly at: string;
  /** The item's key; a number in entries written before keys. */
  readonly item: ItemKey | number;
  /** How it rolled back (decision 52 counts every method); entries before releases are reverts. */
  readonly method?: Method;
  readonly release?: string | null;
  readonly pr: number | null;
  readonly revertPr: number | null;
  readonly toggle?: string | null;
  /** Set true when a rollback turned out unneeded (decision 26); null until someone says. */
  readonly unneeded: boolean | null;
}

export function rollbacks(): RollbackEntry[] {
  const value = state.get(ROLLBACKS).value as { entries?: RollbackEntry[] } | null;
  return value?.entries ?? [];
}

/** Rollbacks marked unneeded in the last 30 days; above 2 the Watcher asks first. */
export function unneededRollbacks(now: number): number {
  return rollbacks().filter(e => e.unneeded === true && now - Date.parse(e.at) <= 30 * 86_400_000).length;
}

function sameRollback(a: RollbackEntry, b: RollbackEntry): boolean {
  return asKey(a.item) === asKey(b.item) && (a.method ?? 'revert') === (b.method ?? 'revert') && a.pr === b.pr && (a.release ?? null) === (b.release ?? null) && (a.toggle ?? null) === (b.toggle ?? null);
}

/** One entry per rollback, whatever the method; a retry replaces its own entry. Kept 90 days. */
export function recordRollback(entry: RollbackEntry): void {
  for (let attempt = 0; attempt < 3; attempt++) {
    const found = state.get(ROLLBACKS);
    const entries = ((found.value as { entries?: RollbackEntry[] } | null)?.entries ?? []).filter(e => !sameRollback(e, entry));
    const kept = entries.filter(e => Date.parse(entry.at) - Date.parse(e.at) <= 90 * 86_400_000);
    if (state.put(ROLLBACKS, { entries: [...kept, entry] }, { ifRevision: found.revision }).ok) return;
  }
  throw new Error(`${ROLLBACKS} kept moving under three writes`);
}

// ---------------------------------------------------------------- the Operator's open requests

/**
 * One request of a kind at a time (`deploy-asks/<kind>`): `open` while a run waits on it,
 * `declined` or `waiting` once answered so the same subject is not asked again. A new
 * subject (another set of items, another blocked release) asks again.
 */
export interface AskDoc {
  readonly subject: string;
  readonly status: 'open' | 'declined' | 'waiting' | 'answered';
  readonly run: string;
  readonly at: string;
}

export type AskKind = 'release' | 'line';

export function readAsk(kind: AskKind): AskDoc | null {
  return (state.get(`deploy-asks/${kind}`).value as AskDoc | null) ?? null;
}

export function writeAsk(kind: AskKind, doc: AskDoc | null): void {
  for (let attempt = 0; attempt < 3; attempt++) {
    const found = state.get(`deploy-asks/${kind}`);
    if (state.put(`deploy-asks/${kind}`, doc, { ifRevision: found.revision }).ok) return;
  }
  throw new Error(`deploy-asks/${kind} kept moving under three writes`);
}

/** Gates of non-production environments per release (`release-gates/<id>`). */
export type GateStatus = 'open' | 'passed' | 'held';

export function readGates(id: string): Record<string, { status: GateStatus; at: string; note: string }> {
  return ((state.get(`release-gates/${id}`).value as Record<string, { status: GateStatus; at: string; note: string }> | null) ?? {});
}

export function setGate(id: string, env: string, status: GateStatus, note = ''): void {
  for (let attempt = 0; attempt < 3; attempt++) {
    const found = state.get(`release-gates/${id}`);
    const gates = { ...((found.value as Record<string, unknown> | null) ?? {}), [env]: { status, at: new Date().toISOString(), note } };
    if (state.put(`release-gates/${id}`, gates, { ifRevision: found.revision }).ok) return;
  }
  throw new Error(`release-gates/${id} kept moving under three writes`);
}

export function clearGate(id: string, env: string): void {
  for (let attempt = 0; attempt < 3; attempt++) {
    const found = state.get(`release-gates/${id}`);
    const gates = { ...((found.value as Record<string, unknown> | null) ?? {}) };
    delete gates[env];
    if (state.put(`release-gates/${id}`, gates, { ifRevision: found.revision }).ok) return;
  }
  throw new Error(`release-gates/${id} kept moving under three writes`);
}

// ---------------------------------------------------------------- releases

/** The commit `origin/<base>` points at (the caller fetched it, e.g. through readDeploys). */
export function baseCommit(base: string): string {
  return gitOrThrow('rev-parse', `origin/${base}`);
}

/** `ancestor` is in `commit`'s history. */
export function contains(commit: string, ancestor: string): boolean {
  return git('merge-base', '--is-ancestor', ancestor, commit).code === 0;
}

/** The release id: from the commit and the sorted keys, so a retry finds the same release. */
export function releaseId(commit: string, keys: readonly ItemKey[]): string {
  const digest = new Bun.CryptoHasher('sha256').update([...keys].sort().join(',')).digest('hex');
  return `${commit.slice(0, 12)}-${digest.slice(0, 8)}`;
}

export function productionEnvs(deploys: Deploys): Environment[] {
  return deploys.environments.filter(e => e.stage === 'after-merge' && e.kind === 'production');
}

/** A release that stopped (a failed deploy, a held gate) before any production environment took it. */
export function failedBeforeProduction(release: Release, deploys: Deploys): boolean {
  const production = new Set(productionEnvs(deploys).map(e => e.name));
  const statuses = Object.entries(release.envs);
  const failed = statuses.some(([, s]) => s.status === 'failed');
  const reachedProduction = statuses.some(([env, s]) => production.has(env) && ['deployed', 'verified', 'rolled-back'].includes(s.status));
  return failed && !reachedProduction;
}

export interface WorkEntry {
  readonly key: ItemKey;
  readonly doc: Partial<WorkDoc>;
}

/** Every item the engine holds, from its store. */
export function allWork(): WorkEntry[] {
  return state
    .listValues('work/')
    .map(found => ({ key: parseKey(found.name.slice('work/'.length)), doc: (found.value ?? {}) as Partial<WorkDoc> }))
    .filter((entry): entry is WorkEntry => entry.key !== null);
}

/** The files each item's PR changed, read from the code host. */
export function itemFiles(repo: Repo, keys: readonly ItemKey[]): { key: ItemKey; pr: number | null; files: { path: string; status: string; patch: string | null }[] }[] {
  return keys.map(key => {
    const pr = readWork(key).doc.pr;
    if (pr === null) return { key, pr, files: [] };
    const listed = forge('pr.files', { ref: { repo, number: pr } });
    return { key, pr, files: listed.files.map(f => ({ path: f.path, status: f.status, patch: f.patch })) };
  });
}

/** The after-merge environments of a release, in order, each with the services it carries. */
export function releasePlan(repo: Repo, deploys: Deploys, keys: readonly ItemKey[]): ReturnType<typeof environmentsFor> {
  const changed = itemFiles(repo, keys).flatMap(i => i.files.map(f => f.path));
  return environmentsFor(deploys, 'after-merge', servicesOf(deploys, changed));
}

/** The recipe's environment for a release (decision 48; shape A also gets its single item). */
export function releaseVars(deploys: Deploys, release: Release, reason: 'normal' | 'rollback'): Record<string, string> {
  const vars: Record<string, string> = { PIPELINE_ITEMS: release.items.map(keySlug).join(','), PIPELINE_RELEASE: release.id, PIPELINE_REASON: reason };
  if (deploys.legacy) {
    const only = release.items.length === 1 ? release.items[0] : null;
    const pr = only === null ? null : readWork(only).doc.pr;
    Object.assign(vars, { PIPELINE_ITEM: only === null ? '' : keySlug(only), PIPELINE_PR: pr === null ? '' : String(pr), PIPELINE_REVERT: 'false' });
  }
  return vars;
}

/** Put the deploy failure in front of the Operator on every item: the tail, and the attention label. */
export async function tellFailure(keys: readonly ItemKey[], marker: string, title: string, why: string, tail: string): Promise<void> {
  for (const key of keys) {
    await tracker().comment(key, marker, [`**${title}**`, '', `Why you: ${why}`, '', '```', tail.replaceAll('```', "'''"), '```'].join('\n'));
    await tracker().label(key, { add: [NEEDS_ATTENTION] });
  }
}

// ---------------------------------------------------------------- gh api

function gh(args: readonly string[]): unknown {
  const result = Bun.spawnSync(['gh', 'api', ...args], { stdout: 'pipe', stderr: 'pipe', env: process.env });
  if (result.exitCode !== 0) {
    const first = result.stderr.toString().trim().split('\n')[0] ?? '';
    throw new Error(`gh api ${args[0] ?? ''} failed: ${first}`);
  }
  const text = result.stdout.toString().trim();
  return text === '' ? null : (JSON.parse(text) as unknown);
}

export function revertMarker(key: ItemKey, pr: number): string {
  return `<!-- pipeline-revert:${keySlug(key)}:${String(pr)} -->`;
}

/** An open revert of `pr` this pipeline opened for the item, found by its marker. */
function openRevert(repo: Repo, key: ItemKey, pr: number): { number: number; url: string } | null {
  const open = gh([`repos/${repo.path}/pulls?state=open&per_page=100`]) as { number: number; html_url: string; body: string | null }[];
  const found = open.find(p => (p.body ?? '').includes(revertMarker(key, pr)));
  return found === undefined ? null : { number: found.number, url: found.html_url };
}

const REVERT = `mutation($id: ID!, $title: String!, $body: String!) {
  revertPullRequest(input: { pullRequestId: $id, title: $title, body: $body }) {
    revertPullRequest { number url }
  }
}`;

/**
 * Open the revert of `pr` (or find the one already open), record it on the item, record
 * the rollback, and fire unify-merge for it. Idempotent: a retry finds the marker in
 * the open revert and the flags in `work/<key>`, and the delivery id makes the fire start at
 * most one merge run. `counted` false leaves the rollback counter to the caller (a
 * redeploy of the previous version already counted it).
 */
export function revertAndMerge(
  repo: Repo,
  key: ItemKey,
  pr: number,
  reason: string,
  release: string | null = null,
  counted = true
): { revertPr: number; url: string; created: boolean; fire: string } {
  const work = readWork(key).doc;
  const flagged = work.flags.find(flag => flag.startsWith('revert-pr:'));
  let revert = openRevert(repo, key, pr);
  let created = false;
  if (revert === null && flagged !== undefined) {
    const already = Number(flagged.slice('revert-pr:'.length));
    const view = forge('pr.view', { selector: { kind: 'number', ref: { repo, number: already } } });
    if (view !== null) revert = { number: already, url: view.pr.url };
  }
  if (revert === null) {
    const node = (gh([`repos/${repo.path}/pulls/${String(pr)}`]) as { node_id: string }).node_id;
    const body = [
      `Reverts #${String(pr)}: the Watcher found a regression in this PR during the watch window of ${release === null ? key : `release ${release} (${key})`}.`,
      '',
      reason,
      '',
      'Opened by the pipeline. It merges without a gate (decision 26) and its deploy is not watched again.',
      revertMarker(key, pr),
    ].join('\n');
    const answer = gh([
      'graphql',
      '-f', `query=${REVERT}`,
      '-f', `id=${node}`,
      '-f', `title=Revert #${String(pr)} (rollback of ${key})`,
      '-f', `body=${body}`,
    ]) as { data?: { revertPullRequest?: { revertPullRequest?: { number: number; url: string } } } };
    const made = answer.data?.revertPullRequest?.revertPullRequest;
    if (made === undefined) throw new Error(`GitHub opened no revert of #${String(pr)}`);
    revert = { number: made.number, url: made.url };
    created = true;
  }
  const opened = revert;
  updateWork(key, doc => {
    for (const flag of [`revert-pr:${String(opened.number)}`, `revert-of:${String(pr)}`, `no-watch:${String(opened.number)}`]) {
      if (!doc.flags.includes(flag)) doc.flags.push(flag);
    }
  });
  if (counted) recordRollback({ at: new Date().toISOString(), item: key, method: 'revert', release, pr, revertPr: opened.number, toggle: null, unneeded: null });
  const fire = fireNext('unify-merge', repo, key, `pipeline-revert:${repo.path}#${keySlug(key)}:${String(pr)}`);
  return { revertPr: opened.number, url: opened.url, created, fire };
}

// ---------------------------------------------------------------- the rollback

export interface RollbackContext {
  readonly repo: Repo;
  readonly deploys: Deploys;
  readonly release: Release;
  readonly env: Environment;
  readonly run: string;
}

/** The plan of decision 52 for this release; toggles only where the project can set one. */
export function planRollback(ctx: RollbackContext, culprit: ItemKey | null, togglesTried: boolean): RollbackPlan {
  return rollbackPlan({
    items: ctx.release.items,
    culprit: culprit !== null && ctx.release.items.includes(culprit) ? culprit : null,
    kind: ctx.env.rollback,
    toggleOf: key => (ctx.deploys.toggles === null ? null : readWork(key).doc.toggle),
    togglesTried,
  });
}

/**
 * Run what the plan says to run at once: turn the toggle off, revert the culprit, or
 * redeploy the previous verified version (and open the culprit's revert, so the line can
 * clear). Every method is counted as a rollback. What it did is returned for the watch
 * record; a step that could not run returns `failed` with the reason, and nothing moves.
 */
export function runRollback(
  ctx: RollbackContext,
  plan: RollbackPlan,
  culprit: ItemKey | null,
  reason: string
): { method: Method | null; reverts: Record<ItemKey, number>; toggled: { key: ItemKey; toggle: string; at: string }[]; fire: string | null; failed: string | null } {
  const at = new Date().toISOString();
  const none = { reverts: {}, toggled: [], fire: null };
  if (plan.first === 'toggle') {
    const toggle = plan.toggles[0];
    const set = ctx.deploys.toggles?.set;
    if (toggle === undefined || set === undefined || culprit === null) return { method: null, ...none, failed: 'the plan names a toggle the project cannot set' };
    const run = runRecipe(`${set} ${toggle} off`, { PIPELINE_TOGGLE: toggle, PIPELINE_STATE: 'off', PIPELINE_ENV: ctx.env.name, PIPELINE_RELEASE: ctx.release.id }, 5 * 60_000);
    if (!run.ok) return { method: null, ...none, failed: `turning toggle ${toggle} off failed: ${run.tail}` };
    recordRollback({ at, item: culprit, method: 'toggle', release: ctx.release.id, pr: readWork(culprit).doc.pr, revertPr: null, toggle, unneeded: null });
    return { method: 'toggle', reverts: {}, toggled: [{ key: culprit, toggle, at }], fire: null, failed: null };
  }
  if (plan.first === 'none') return { method: null, ...none, failed: `${ctx.env.name} rolls back forward only: nothing is redeployed` };

  const reverts: Record<ItemKey, number> = {};
  const fires: string[] = [];
  if (plan.first === 'previous') {
    const previous = previousVerified(ctx.env.name, ctx.release.id);
    if (previous === null) return { method: null, ...none, failed: `no earlier release passed its checks on ${ctx.env.name}, so there is no version to go back to` };
    const subject = releaseSubject(ctx.release.id, ctx.env.name);
    const rollbackRun = `${ctx.run}-rollback`;
    const services = releasePlan(ctx.repo, ctx.deploys, ctx.release.items).find(p => p.env.name === ctx.env.name)?.services ?? [];
    updateDeploy(subject, rollbackRun, record => record ?? { item: ctx.release.items[0] ?? '', items: [...ctx.release.items], release: ctx.release.id, env: ctx.env.name, reason: 'rollback', pr: null, runId: rollbackRun, startedAt: at, endedAt: null, hook: ctx.env.deploy, ok: false, revert: false, watch: null });
    const vars = { ...releaseVars(ctx.deploys, previous, 'rollback'), PIPELINE_RELEASE: previous.id };
    for (const service of services) {
      const result = deployAndCheck(ctx.env, service, previous.commit, vars);
      if (!result.ok) {
        updateDeploy(subject, rollbackRun, record => ({ ...(record as DeployRecord), endedAt: new Date().toISOString(), ok: false }));
        return { method: null, ...none, failed: `the redeploy of ${previous.id} to ${ctx.env.name}/${service.name} failed at ${result.step}: ${result.tail}` };
      }
    }
    updateDeploy(subject, rollbackRun, record => ({ ...(record as DeployRecord), endedAt: new Date().toISOString(), ok: true }));
    for (const key of plan.rolledBack.length > 0 ? plan.rolledBack : ctx.release.items) {
      recordRollback({ at, item: key, method: 'previous', release: ctx.release.id, pr: readWork(key).doc.pr, revertPr: null, toggle: null, unneeded: null });
    }
  }
  // The culprit's revert: shape A's whole rollback; after a redeploy, what clears the line (decision 52).
  for (const key of plan.rolledBack) {
    const pr = readWork(key).doc.pr;
    if (pr === null) {
      if (plan.first === 'revert') return { method: null, ...none, failed: `${key} names no PR to revert` };
      continue;
    }
    const revert = revertAndMerge(ctx.repo, key, pr, reason, ctx.release.id, plan.first === 'revert');
    reverts[key] = revert.revertPr;
    fires.push(revert.fire);
  }
  return { method: plan.first, reverts, toggled: [], fire: fires.length === 0 ? null : fires.join('; '), failed: null };
}

// ---------------------------------------------------------------- endings

async function closeIfOpen(key: ItemKey): Promise<void> {
  const view = await tracker().view(key);
  if (view.open) await tracker().close(key, 'completed');
}

/**
 * The toggle's cleanup (decision 61): once the change is Done, one new item to remove the
 * toggle, filed once per item by its marker. Null when the item ships behind no toggle.
 */
async function toggleCleanup(key: ItemKey): Promise<{ toggle: string; item: ItemKey } | null> {
  const toggle = readWork(key).doc.toggle;
  if (toggle === null || toggle.trim() === '') return null;
  const item = await tracker().create(
    key,
    `pipeline-toggle-cleanup:${keySlug(key)}`,
    `Remove toggle ${toggle}`,
    [
      `${key} shipped behind the toggle \`${toggle}\` and is Done: its watch window ended with no regression.`,
      '',
      'Remove the toggle and the branch of the code it switches off, so the code carries one path again (decision 61).',
    ].join('\n')
  );
  return { toggle, item };
}

/** Window over with no regression: Done, a report on the item, the toggle's cleanup filed, the item closed. */
export async function finishDone(key: ItemKey, watch: WatchRecord | null, run: string, ruling: string, release: string | null = null): Promise<string> {
  await moveState(key, ['live'], 'done');
  const pr = readWork(key).doc.pr;
  const coverage =
    watch === null
      ? 'No watch window is declared for production: Done once the smoke check passed.'
      : watch.coverage === 'full'
        ? 'Coverage: full (the project\'s declared signals).'
        : 'Coverage: health-only. The project declares no signals for the watched environment, so only the deploy itself was watched; a regression in what the PR changed could not be seen.';
  const cleanup = await toggleCleanup(key);
  await tracker().comment(
    key,
    `unify-deploy-report:${run}`,
    [
      `**Done**: ${watch === null ? 'the release' : 'the watch window'} of ${pr === null ? 'this change' : `PR #${String(pr)}`}${release === null ? '' : ` (release ${release})`} ended with no regression.`,
      '',
      coverage,
      ...(watch === null ? [] : ['', `The Watcher: ${watch.reason}`, ...watch.evidence.map(e => `- ${e}`)]),
      ...(cleanup === null ? [] : ['', `The change ships behind the toggle \`${cleanup.toggle}\`; its removal is filed as ${cleanup.item}.`]),
      ...(ruling === '' ? [] : ['', `The Operator: ${ruling}`]),
    ].join('\n')
  );
  await closeIfOpen(key);
  return `${key} is Done${watch?.coverage === 'health-only' ? ' (health-only coverage)' : ''}${cleanup === null ? '' : `; toggle cleanup ${cleanup.item}`}`;
}

/** How production lost the item, for the report. */
export function howRolledBack(key: ItemKey, watch: WatchRecord): string {
  const pr = readWork(key).doc.pr;
  const revertPr = watch.reverts?.[key] ?? watch.revertPr;
  const toggle = watch.toggled?.find(t => t.key === key);
  if (toggle !== undefined) return `the toggle \`${toggle.toggle}\` was turned off; the code stays and the toggle stays off`;
  const revert = revertPr === null || revertPr === undefined ? '' : `PR #${String(pr)} is reverted in PR #${String(revertPr)}, which merges without a gate`;
  if (watch.method === 'previous') return `production went back to the previous verified release${revert === '' ? '' : `; ${revert}`}`;
  return revert === '' ? 'production was rolled back' : `${revert} and deploys unwatched`;
}

/**
 * A regression rolled back: RolledBack, a report on the item, a new item with the
 * evidence for Triage (idempotent by marker), the item closed.
 */
export async function finishRolledBack(key: ItemKey, watch: WatchRecord, run: string, ruling: string): Promise<string> {
  await moveState(key, ['live'], 'rolled-back');
  const pr = readWork(key).doc.pr;
  const how = howRolledBack(key, watch);
  const evidence = watch.evidence.map(e => `- ${e}`);
  const created = await tracker().create(
    key,
    `pipeline-rollback:${keySlug(key)}:${String(pr)}`,
    `Regression after ${pr === null ? key : `#${String(pr)}`}: rolled back (from ${key})`,
    [
      `The Watcher found a regression from ${key}${pr === null ? '' : ` (PR #${String(pr)})`} during its watch window: ${how}.`,
      '',
      `What the Watcher saw: ${watch.reason}`,
      '',
      ...evidence,
      '',
      `Coverage: ${watch.coverage}. Numbers are before/after the deploy, computed by the pipeline's signals script, with other deploys' minutes left out.`,
      ...(ruling === '' ? [] : ['', `The Operator: ${ruling}`]),
    ].join('\n')
  );
  await tracker().comment(
    key,
    `unify-deploy-report:${run}`,
    [`**Rolled back**: ${how}.`, '', `Why: ${watch.reason}`, ...evidence, '', `The cause goes to a new work item: ${created}.`, ...(ruling === '' ? [] : ['', `The Operator: ${ruling}`])].join('\n')
  );
  await closeIfOpen(key);
  return `${key} is RolledBack (${how}); new item ${created}`;
}

/** An innocent item of a rolled-back release: back to Releasing, free for the next release (decision 52). */
export async function backToReleasing(key: ItemKey, run: string, why: string): Promise<string> {
  await moveState(key, ['live'], 'releasing');
  updateWork(key, doc => {
    doc.release = null;
  });
  await tracker().comment(key, `unify-deploy-back:${run}`, [`**Back to Releasing**: ${why}`, '', 'It ships with the next release.'].join('\n'));
  return `${key} is back in Releasing`;
}

/** Look up the release a run works on; a missing record is a broken assumption. */
export function mustRelease(id: string): Release {
  const release = readRelease(id);
  if (release === null) throw new Error(`releases/${id} does not exist`);
  return release;
}

/** The production environment the release is watched on: the first production one that declares a window. */
export function watchedEnv(deploys: Deploys, name: string): Environment {
  const env = deploys.environments.find(e => e.name === name);
  if (env === undefined) throw new Error(`project.yaml declares no environment ${name}`);
  return env;
}

// ---------------------------------------------------------------- applying a rollback

/** Block the release line after a redeploy (decision 52); a block already set by this release stays as it is. */
export function blockLine(release: string, culprit: ItemKey | null): void {
  updateLine(line => {
    if (line.blocked !== null && line.blocked.release === release) {
      if (culprit !== null && line.blocked.culprit === null) line.blocked.culprit = culprit;
      return;
    }
    line.blocked = { release, culprit, since: new Date().toISOString(), clearedBy: null };
  });
}

/**
 * Move the items as the rollback's plan says: the culprits RolledBack (report, new item
 * for Triage), the others back to Releasing; the environment is marked rolled back and
 * the line blocked when the plan says so. A plan that asks moves nothing: the Operator's
 * answer does (`answer`).
 */
export async function applyRollback(release: Release, env: string, watch: WatchRecord, run: string, ruling: string): Promise<string[]> {
  const plan = watch.plan;
  if (plan === null || plan === undefined) throw new Error('the watch record holds no rollback plan');
  setEnvStatus(release.id, env, 'rolled-back', watch.method ?? '');
  if (plan.blockLine) blockLine(release.id, watch.culprit ?? null);
  if (plan.ask) return [];
  const done: string[] = [];
  for (const key of plan.rolledBack) done.push(await finishRolledBack(key, watch, run, ruling));
  for (const key of plan.backToReleasing) done.push(await backToReleasing(key, run, `release ${release.id} was rolled back because of ${watch.culprit ?? 'another item'}; this item was not the cause.`));
  return done;
}

/** A clean window: Done for every item, but a culprit whose toggle was turned off is RolledBack. */
export async function finishClean(release: Release, env: string, watch: WatchRecord, run: string, ruling: string): Promise<string[]> {
  const off = new Set((watch.toggled ?? []).map(t => t.key));
  const done: string[] = [];
  for (const key of release.items) done.push(off.has(key) ? await finishRolledBack(key, watch, run, ruling) : await finishDone(key, watch, run, ruling, release.id));
  setEnvStatus(release.id, env, 'verified');
  return done;
}

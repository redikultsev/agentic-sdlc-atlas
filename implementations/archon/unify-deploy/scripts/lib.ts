/**
 * What the deploy workflow's scripts share, and nothing outside this workflow needs:
 * the deploy record in the state store, the rollback counter, and the revert.
 *
 * Deploy records live at `deploys/<n>/<run id>`, one per deploy run. `signals` reads every
 * record to cut the minutes of other deploys out of its before/after windows; `act`
 * writes the watch result into this run's record, because a loop's output is not the
 * body's: `outcome` and the Retro read the result from here.
 *
 * The revert is GitHub's own `revertPullRequest` (GraphQL, through the host's `gh`): it
 * needs no checkout and no push. The revert PR carries a marker, and the item's
 * `work/<n>` flags name it (`revert-pr:<m>`, `revert-of:<pr>`, `no-watch:<m>`), so a
 * retry finds it instead of opening a second one, unify-merge can merge it without a
 * gate (decision 26), and the deploy that follows its merge is not watched again.
 */

import { state } from 'archon:script';
import { forge } from '../../.shared/forge.ts';
import { fireNext } from '../../.shared/fire.ts';
import type { IssueRef, Repo } from '../../.shared/repo.ts';
import { moveState } from '../../.shared/states.ts';
import { readWork, updateWork } from '../../.shared/work.ts';

export type WatchResult = 'continue' | 'done' | 'rolled-back' | 'unsure';
export type Coverage = 'full' | 'health-only';

export interface WatchRecord {
  readonly result: WatchResult;
  readonly coverage: Coverage;
  readonly verdict: string;
  readonly reason: string;
  readonly evidence: readonly string[];
  readonly revertPr: number | null;
  readonly fire: string | null;
  readonly at: string;
}

export interface DeployRecord {
  item: number;
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

export function deployDocName(number: number, runId: string): string {
  return `deploys/${String(number)}/${runId}`;
}

export function readDeploy(number: number, runId: string): { record: DeployRecord | null; revision: number } {
  const found = state.get(deployDocName(number, runId));
  return { record: (found.value ?? null) as DeployRecord | null, revision: found.revision };
}

/** Read, change and write back under the revision read; retried on a conflict. */
export function updateDeploy(number: number, runId: string, change: (record: DeployRecord | null) => DeployRecord): DeployRecord {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { record, revision } = readDeploy(number, runId);
    const next = change(record === null ? null : { ...record });
    const result = state.put(deployDocName(number, runId), next, { ifRevision: revision });
    if (result.ok) return next;
  }
  throw new Error(`${deployDocName(number, runId)} kept moving under three writes`);
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
  readonly item: number;
  readonly pr: number;
  readonly revertPr: number;
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

function recordRollback(entry: RollbackEntry): void {
  for (let attempt = 0; attempt < 3; attempt++) {
    const found = state.get(ROLLBACKS);
    const entries = ((found.value as { entries?: RollbackEntry[] } | null)?.entries ?? []).filter(
      e => !(e.item === entry.item && e.pr === entry.pr)
    );
    const kept = entries.filter(e => Date.parse(entry.at) - Date.parse(e.at) <= 90 * 86_400_000);
    if (state.put(ROLLBACKS, { entries: [...kept, entry] }, { ifRevision: found.revision }).ok) return;
  }
  throw new Error(`${ROLLBACKS} kept moving under three writes`);
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

export function revertMarker(number: number, pr: number): string {
  return `<!-- pipeline-revert:${String(number)}:${String(pr)} -->`;
}

/** An open revert of `pr` this pipeline opened for the item, found by its marker. */
function openRevert(repo: Repo, number: number, pr: number): { number: number; url: string } | null {
  const open = gh([`repos/${repo.path}/pulls?state=open&per_page=100`]) as { number: number; html_url: string; body: string | null }[];
  const found = open.find(p => (p.body ?? '').includes(revertMarker(number, pr)));
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
 * the open revert and the flags in `work/<n>`, and the delivery id makes the fire start at
 * most one merge run.
 */
export function revertAndMerge(
  ref: IssueRef,
  pr: number,
  reason: string
): { revertPr: number; url: string; created: boolean; fire: string } {
  const { repo, number } = ref;
  const work = readWork(number).doc;
  const flagged = work.flags.find(flag => flag.startsWith('revert-pr:'));
  let revert = openRevert(repo, number, pr);
  let created = false;
  if (revert === null && flagged !== undefined) {
    const already = Number(flagged.slice('revert-pr:'.length));
    const view = forge('pr.view', { selector: { kind: 'number', ref: { repo, number: already } } });
    if (view !== null) revert = { number: already, url: view.pr.url };
  }
  if (revert === null) {
    const node = (gh([`repos/${repo.path}/pulls/${String(pr)}`]) as { node_id: string }).node_id;
    const body = [
      `Reverts #${String(pr)}: the Watcher found a regression in this PR during the watch window of #${String(number)}.`,
      '',
      reason,
      '',
      'Opened by the pipeline. It merges without a gate (decision 26) and its deploy is not watched again.',
      revertMarker(number, pr),
    ].join('\n');
    const answer = gh([
      'graphql',
      '-f', `query=${REVERT}`,
      '-f', `id=${node}`,
      '-f', `title=Revert #${String(pr)} (rollback of #${String(number)})`,
      '-f', `body=${body}`,
    ]) as { data?: { revertPullRequest?: { revertPullRequest?: { number: number; url: string } } } };
    const made = answer.data?.revertPullRequest?.revertPullRequest;
    if (made === undefined) throw new Error(`GitHub opened no revert of #${String(pr)}`);
    revert = { number: made.number, url: made.url };
    created = true;
  }
  const opened = revert;
  updateWork(number, doc => {
    for (const flag of [`revert-pr:${String(opened.number)}`, `revert-of:${String(pr)}`, `no-watch:${String(opened.number)}`]) {
      if (!doc.flags.includes(flag)) doc.flags.push(flag);
    }
  });
  recordRollback({ at: new Date().toISOString(), item: number, pr, revertPr: opened.number, unneeded: null });
  const fire = fireNext('unify-merge', repo, number, `pipeline-revert:${repo.path}#${String(number)}:${String(pr)}`);
  return { revertPr: opened.number, url: opened.url, created, fire };
}

// ---------------------------------------------------------------- endings

function closeIfOpen(ref: IssueRef): void {
  const view = forge('workitem.view', { ref });
  if (view.state === 'open') forge('workitem.close', { ref, reason: 'completed' });
}

/** Window over with no regression: Done, a report on the item, the item closed. */
export function finishDone(ref: IssueRef, pr: number | null, watch: WatchRecord | null, run: string, ruling: string): string {
  moveState(ref, ['live'], 'done');
  const coverage =
    watch?.coverage === 'full'
      ? 'Coverage: full (the project\'s declared signals).'
      : 'Coverage: health-only. The project declares no signals in `.pipeline/project.yaml`, so only the deploy itself was watched; a regression in what the PR changed could not be seen.';
  forge('workitem.comment.upsert', {
    subject: { kind: 'issue', ref },
    marker: `unify-deploy-report:${run}`,
    body: [
      `**Done**: the watch window of ${pr === null ? 'this change' : `PR #${String(pr)}`} ended with no regression.`,
      '',
      coverage,
      ...(watch === null ? [] : ['', `The Watcher: ${watch.reason}`, ...watch.evidence.map(e => `- ${e}`)]),
      ...(ruling === '' ? [] : ['', `The Operator: ${ruling}`]),
    ].join('\n'),
  });
  closeIfOpen(ref);
  return `#${String(ref.number)} is Done${watch?.coverage === 'health-only' ? ' (health-only coverage)' : ''}`;
}

/**
 * A regression rolled back: RolledBack, a report on the item, a new issue with the
 * evidence for Triage (idempotent by marker), the item closed.
 */
export function finishRolledBack(ref: IssueRef, pr: number, watch: WatchRecord, revertPr: number, run: string, ruling: string): string {
  moveState(ref, ['live'], 'rolled-back');
  const evidence = watch.evidence.map(e => `- ${e}`);
  const created = forge('workitem.create', {
    repo: ref.repo,
    title: `Regression after #${String(pr)}: rolled back (from #${String(ref.number)})`,
    body: [
      `The Watcher found a regression in PR #${String(pr)} during the watch window of #${String(ref.number)}, and the pipeline reverted it in PR #${String(revertPr)}.`,
      '',
      `What the Watcher saw: ${watch.reason}`,
      '',
      ...evidence,
      '',
      `Coverage: ${watch.coverage}. Numbers are before/after the deploy, computed by the pipeline's signals script, with other deploys' minutes left out.`,
      ...(ruling === '' ? [] : ['', `The Operator: ${ruling}`]),
    ].join('\n'),
    marker: `pipeline-rollback:${String(ref.number)}:${String(pr)}`,
  });
  forge('workitem.comment.upsert', {
    subject: { kind: 'issue', ref },
    marker: `unify-deploy-report:${run}`,
    body: [
      `**Rolled back**: PR #${String(pr)} was reverted in PR #${String(revertPr)}, which merges and deploys without a gate.`,
      '',
      `Why: ${watch.reason}`,
      ...evidence,
      '',
      `The cause goes to a new work item: #${String(created.workitem.ref.number)}.`,
      ...(ruling === '' ? [] : ['', `The Operator: ${ruling}`]),
    ].join('\n'),
  });
  closeIfOpen(ref);
  return `#${String(ref.number)} is RolledBack; revert #${String(revertPr)}; new item #${String(created.workitem.ref.number)}`;
}

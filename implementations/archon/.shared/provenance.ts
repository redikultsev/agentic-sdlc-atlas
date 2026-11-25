/**
 * The provenance record of one item (decision 59): what built and checked the change. Kept
 * in the engine's state as its own document `provenance/<key>`, written by the merge run
 * before the Merge gate (and before an R0 merge) and rewritten only when it changed. One
 * line of it goes on the Merge gate request and in the PR description; the rest is read with
 * `archon state get provenance/<key>`. The Retro groups outcomes by it.
 *
 * What it holds and where each fact comes from:
 * - pack: the content digest Archon pins for each run of the item when it freezes the
 *   workflow source (`metadata.workflow_source.digest` of `archon workflow get`). The pack
 *   has no version field (Archon's manifest forbids one) and a tag is not visible to a run;
 *   the digest names exactly what ran. It also changes when Archon's bundled defaults or the
 *   home-scoped source change, which is a change in what ran too. Distinct digests in run order.
 * - roles: per agent node, the provider-resolved model of every session (never the alias
 *   asked for; "not reported" when the provider gave none), sessions, seconds and USD, from
 *   the node summaries of `archon workflow get <run> --json --verbose`, for every run of the
 *   item (`item()`) and every `workflow:` child its fan-out nodes started (slice runs carry
 *   no item; they are found through `fanOutOutcome.slots[].child_run_id`). A cost the
 *   provider did not report is counted apart, never as zero (decision 29).
 * - settings: the git blob ids of `.pipeline/tracker.yaml` and `.pipeline/project.yaml` at
 *   the base commit the item was built on (`work/<key>.base.commit`), or "none".
 * - checks: passed, skipped with the reason, or flagged, from `work/<key>` at the diff the
 *   gate shows: the base check, CI, the guard, the reviewer, the Validator, the
 *   Implementer's skipped steps, tests without a red record (decision 58).
 * - rounds: failed fix rounds and "changes" from `work/<key>`.
 *
 * Every call to the host goes through `engine`, so a test replaces it.
 */

import { item, state } from 'archon:script';
import { forge } from './forge.ts';
import { git } from './git.ts';
import { hostJson } from './host.ts';
import { isObject } from './inputs.ts';
import { type ItemKey, keySlug } from './item.ts';
import { allTests } from './red.ts';
import type { Repo } from './repo.ts';
import { currentVerdicts, type WorkDoc } from './work.ts';

export interface RoleFacts {
  /** Provider-resolved models, each once, in the order first seen. */
  models: string[];
  sessions: number;
  seconds: number;
  /** USD the provider reported. */
  usd: number;
  /** Sessions whose cost the provider did not report, or reported only in part. */
  costNotReported: number;
}

export interface CheckFact {
  readonly check: string;
  readonly result: 'passed' | 'skipped' | 'flagged';
  readonly why: string;
}

export interface Provenance {
  readonly item: string;
  readonly head: string;
  readonly fingerprint: string;
  /** The base commit the item was built on, as the round's base check recorded it. */
  readonly base: string;
  readonly pack: readonly string[];
  readonly settings: { readonly tracker: string; readonly project: string };
  readonly roles: Readonly<Record<string, RoleFacts>>;
  readonly checks: readonly CheckFact[];
  readonly rounds: { readonly fix: number; readonly changes: number };
  /** Runs read, and the ones that could not be read with why. */
  readonly runs: { readonly read: number; readonly unread: readonly string[] };
  readonly at: string;
}

/** The node summary fields of `archon workflow get --json --verbose` this module reads. */
interface NodeSummary {
  readonly nodeId?: string;
  readonly durationMs?: number;
  readonly execution?: {
    readonly node?: { readonly kind?: string };
    readonly binding?: { readonly model?: { readonly requested?: string; readonly resolved?: { readonly source?: string; readonly value?: string; readonly reason?: string } } };
    readonly timing?: { readonly durationMs?: number };
    readonly spend?: { readonly costUsd?: { readonly source?: string; readonly value?: number; readonly partial?: boolean } };
  };
  readonly fanOutOutcome?: { readonly slots?: readonly { readonly child_run_id?: string }[] };
}

/** The host seam: the item's runs, one run's detail, a file's blob at a commit. */
export const engine = {
  runs(): { id: string; startedAt: string }[] {
    return (item()?.runs ?? []).map(r => ({ id: r.id, startedAt: r.startedAt }));
  },
  run(id: string): Record<string, unknown> {
    return hostJson(['workflow', 'get', id, '--json', '--verbose']);
  },
  blob(commit: string, path: string): string {
    const found = git('rev-parse', '--verify', '--quiet', `${commit}:${path}`);
    if (found.code === 0 && found.stdout !== '') return found.stdout;
    return git('cat-file', '-e', `${commit}^{commit}`).code === 0 ? 'none' : `unknown (${commit} is not in this checkout)`;
  },
};

/** Node ids of agent nodes, named by the role they play in the model. */
const ROLE: Readonly<Record<string, string>> = { implement: 'implementer', review: 'reviewer' };

export function docName(key: ItemKey): string {
  return `provenance/${keySlug(key)}`;
}

/** The command that prints the whole record: the pointer next to the one line. */
export function readCommand(key: ItemKey): string {
  return `archon state get ${docName(key)}`;
}

function digestOf(run: Record<string, unknown>): string | null {
  const meta = isObject(run.metadata) ? run.metadata : {};
  const source = isObject(meta.workflow_source) ? meta.workflow_source : {};
  return typeof source.digest === 'string' && source.digest !== '' ? source.digest : null;
}

function startedOf(run: Record<string, unknown>): string {
  return typeof run.started_at === 'string' ? run.started_at : '';
}

/** Every run of the item and every child its fan-outs started, each read once. */
function readRuns(): { runs: Record<string, unknown>[]; unread: string[] } {
  const queue = engine.runs().sort((a, b) => a.startedAt.localeCompare(b.startedAt)).map(r => r.id);
  const seen = new Set<string>();
  const runs: Record<string, unknown>[] = [];
  const unread: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (seen.has(id)) continue;
    seen.add(id);
    try {
      const run = engine.run(id);
      runs.push(run);
      for (const node of (Array.isArray(run.nodes) ? run.nodes : []) as NodeSummary[]) {
        for (const slot of node.fanOutOutcome?.slots ?? []) if (typeof slot.child_run_id === 'string') queue.push(slot.child_run_id);
      }
    } catch (error) {
      unread.push(`${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { runs: runs.sort((a, b) => startedOf(a).localeCompare(startedOf(b))), unread };
}

export function rolesOf(runs: readonly Record<string, unknown>[]): Record<string, RoleFacts> {
  const roles: Record<string, RoleFacts> = {};
  for (const run of runs) {
    for (const node of (Array.isArray(run.nodes) ? run.nodes : []) as NodeSummary[]) {
      const exec = node.execution;
      if (exec?.node?.kind !== 'agent' || typeof node.nodeId !== 'string') continue;
      const role = ROLE[node.nodeId] ?? node.nodeId;
      const facts = (roles[role] ??= { models: [], sessions: 0, seconds: 0, usd: 0, costNotReported: 0 });
      const resolved = exec.binding?.model?.resolved;
      const model = resolved?.source === 'provider' && typeof resolved.value === 'string' && resolved.value !== '' ? resolved.value : 'not reported';
      if (!facts.models.includes(model)) facts.models.push(model);
      facts.sessions += 1;
      facts.seconds += Math.round((exec.timing?.durationMs ?? node.durationMs ?? 0) / 1000);
      const cost = exec.spend?.costUsd;
      if (cost?.source === 'provider' && typeof cost.value === 'number') {
        facts.usd = Math.round((facts.usd + cost.value) * 10_000) / 10_000;
        if (cost.partial === true) facts.costNotReported += 1;
      } else {
        facts.costNotReported += 1;
      }
    }
  }
  return roles;
}

export function checksOf(doc: WorkDoc, fingerprint: string): CheckFact[] {
  const current = currentVerdicts(doc, fingerprint);
  const latest = (kind: string): string | null => current.filter(v => v.kind === kind).pop()?.verdict ?? null;
  const checks: CheckFact[] = [];
  if (doc.flags.includes('no-base-check')) checks.push({ check: 'base check', result: 'skipped', why: 'the project declares no check command' });
  else if (doc.base !== null) {
    checks.push({ check: 'base check', result: 'passed', why: `ran at ${doc.base.commit.slice(0, 12)}` });
    if (doc.base.failing.length > 0) {
      checks.push({ check: 'checks red at the base', result: 'skipped', why: `${doc.base.failing.length} not counted: ${doc.base.failing.slice(0, 5).join(', ')}` });
    }
  }
  const ci = latest('ci');
  if (ci === 'green') checks.push({ check: 'ci', result: 'passed', why: 'green at this diff' });
  else if (ci === 'none') checks.push({ check: 'ci', result: 'skipped', why: 'no checks reported at this head' });
  else checks.push({ check: 'ci', result: 'flagged', why: ci === null ? 'no CI verdict at this diff' : ci });
  const guard = doc.flags.filter(f => f.startsWith('guard:'));
  checks.push(guard.length === 0 ? { check: 'guard', result: 'passed', why: 'no weakened check found' } : { check: 'guard', result: 'flagged', why: guard.join(', ') });
  const review = latest('review');
  checks.push(review === 'pass' ? { check: 'review', result: 'passed', why: 'pass at this diff' } : { check: 'review', result: 'flagged', why: review ?? 'no review verdict at this diff' });
  if (!doc.verdicts.some(v => v.kind === 'validator')) checks.push({ check: 'validator', result: 'skipped', why: 'no acceptance criteria' });
  else {
    const validator = latest('validator');
    checks.push(validator === 'pass' ? { check: 'validator', result: 'passed', why: 'every criterion passed at this diff' } : { check: 'validator', result: 'flagged', why: validator ?? 'no verdict at this diff' });
  }
  for (const record of doc.redRecords) {
    for (const step of record.skipped) checks.push({ check: 'Implementer step', result: 'skipped', why: `${record.slice} (${record.at.slice(0, 10)}): ${step}` });
  }
  for (const test of allTests(doc.redRecords)) {
    if (test.red === null) checks.push({ check: 'red record', result: 'skipped', why: `${test.name}: ${test.why_no_red ?? ''}` });
  }
  return checks;
}

/** The record from the item's runs and `work/<key>` at the diff the gate shows. */
export function buildProvenance(key: ItemKey, doc: WorkDoc, at: { head: string; fingerprint: string; base: string }): Provenance {
  const { runs, unread } = readRuns();
  const pack: string[] = [];
  for (const run of runs) {
    const digest = digestOf(run);
    if (digest !== null && !pack.includes(digest)) pack.push(digest);
  }
  const base = doc.base?.commit ?? at.base;
  return {
    item: key,
    head: at.head,
    fingerprint: at.fingerprint,
    base,
    pack,
    settings: { tracker: engine.blob(base, '.pipeline/tracker.yaml'), project: engine.blob(base, '.pipeline/project.yaml') },
    roles: rolesOf(runs),
    checks: checksOf(doc, at.fingerprint),
    rounds: { fix: doc.rounds, changes: doc.changes },
    runs: { read: runs.length, unread },
    at: new Date().toISOString(),
  };
}

const short = (digest: string): string => digest.replace(/^sha256:/, '').slice(0, 12);

/** The pack version as one label: the short digest, or the digests in run order when it changed. */
export function packLabel(record: Pick<Provenance, 'pack'>): string {
  return record.pack.length === 0 ? 'not recorded' : record.pack.map(short).join('→');
}

/** The Implementer's models as one label, for the Retro's table. */
export function implementerLabel(record: Pick<Provenance, 'roles'>): string {
  return record.roles.implementer?.models.join(', ') ?? 'none';
}

/**
 * One line: pack version, the model of each role, checks passed and skipped, and the
 * pointer to the rest. Head, fingerprint, guard flags, size and "changes" are on the
 * request already, so the line does not repeat them.
 */
export function provenanceLine(key: ItemKey, record: Provenance): string {
  const roles = Object.entries(record.roles).map(([role, facts]) => `${role} ${facts.models.join('/')}`);
  const passed = record.checks.filter(c => c.result === 'passed').map(c => c.check);
  const skipped = new Map<string, CheckFact[]>();
  for (const c of record.checks.filter(x => x.result === 'skipped')) skipped.set(c.check, [...(skipped.get(c.check) ?? []), c]);
  const skippedText = [...skipped.entries()].map(([check, list]) => (list.length === 1 ? `${check} (${list[0].why.slice(0, 80)})` : `${check} ×${list.length}`));
  const flagged = record.checks.filter(c => c.result === 'flagged').map(c => c.check);
  return [
    `Provenance: pack ${packLabel(record)}`,
    roles.length === 0 ? 'no agent session read' : roles.join(', '),
    `passed ${passed.length === 0 ? 'none' : passed.join(', ')}`,
    `skipped ${skippedText.length === 0 ? 'none' : skippedText.join(', ')}`,
    ...(flagged.length === 0 ? [] : [`flagged ${flagged.join(', ')}`]),
    ...(record.runs.unread.length === 0 ? [] : [`${record.runs.unread.length} run(s) not read`]),
    `the rest: \`${readCommand(key)}\``,
  ].join(' · ');
}

function withoutTime(record: unknown): string {
  return JSON.stringify(isObject(record) ? { ...record, at: '' } : record);
}

export function readProvenance(key: ItemKey): Provenance | null {
  const found = state.get(docName(key));
  return isObject(found.value) ? (found.value as unknown as Provenance) : null;
}

/**
 * Build the record and store it when it differs from the stored one in anything but its
 * time, under the revision read (a conditional write); a stored record that matches is
 * returned as it is, so a retry writes nothing.
 */
export function refreshProvenance(key: ItemKey, doc: WorkDoc, at: { head: string; fingerprint: string; base: string }): Provenance {
  const record = buildProvenance(key, doc, at);
  for (let attempt = 0; attempt < 3; attempt++) {
    const found = state.get(docName(key));
    if (isObject(found.value) && withoutTime(found.value) === withoutTime(record)) return found.value as unknown as Provenance;
    if (state.put(docName(key), record, { ifRevision: found.revision }).ok) return record;
  }
  throw new Error(`${docName(key)} kept moving under three writes`);
}

const START = '<!-- pipeline-provenance -->';
const END = '<!-- /pipeline-provenance -->';

/** The PR body with the provenance section replaced, or added at the end. */
export function withProvenance(body: string, line: string): string {
  const block = `${START}\n## Provenance\n\n${line}\n${END}`;
  const from = body.indexOf(START);
  const to = body.indexOf(END);
  if (from >= 0 && to > from) return `${body.slice(0, from)}${block}${body.slice(to + END.length)}`;
  return `${body.trimEnd()}\n\n${block}`;
}

/** Put the line in the PR description when it is not there yet; read it back. */
export function showOnPr(repo: Repo, number: number, line: string): void {
  const read = (): string => {
    const view = forge('pr.view', { selector: { kind: 'number', ref: { repo, number } } });
    if (view === null) throw new Error(`PR #${number} does not exist`);
    return view.body;
  };
  const body = read();
  const wanted = withProvenance(body, line);
  if (wanted.trim() === body.trim()) return;
  forge('pr.edit-body', { ref: { repo, number }, body: wanted });
  if (read().trim() !== wanted.trim()) throw new Error(`PR #${number} provenance line does not read back`);
}

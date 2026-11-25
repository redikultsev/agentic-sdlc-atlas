/**
 * Scouts (decision 55): agents that look for work nobody asked for, read-only, over one
 * area each, on a schedule the project sets, from `.pipeline/project.yaml` on the base:
 *
 *   scouts:
 *     - name: deps                  # lower case: it names the scout's memory, scouts/<name>
 *       every: weekly               # daily | weekly (default weekly)
 *       budget: 2                   # USD per look; the engine stops the session at the cap
 *       paths: [package.json, bun.lock]
 *       brief: Dependencies more than a year behind, and ones with a published advisory.
 *       measure: [npm outdated --json]   # optional, at most 3, run by code before the agent
 *
 * No `scouts` key: there are none and `unify-scout` does nothing.
 *
 * - **Schedule.** One hourly timer runs `unify-scout`; each tick takes one due scout (never
 *   looked, or its last look began at least a day or a week ago, less SLACK_MS), the
 *   longest waiting first. The start of a look is written to the scout's memory before the
 *   agent runs, so a look that fails waits for the next period instead of spending again
 *   every hour.
 * - **Budget.** Archon's `maxBudgetUsd` is fixed in the YAML, so the workflow has one agent
 *   node per cap in CAPS and a look runs on the largest cap not above the scout's budget:
 *   it never spends more than declared. A budget under the smallest cap is refused; one
 *   above the largest runs at the largest, and `unify-ping` says so.
 * - **Limit.** A scout with MAX_PER_SCOUT findings waiting in the buffer is not started, and
 *   a look keeps at most the room left (`recordScoutFindings` in `findings.ts`).
 * - **Memory.** `scouts/<name>`: when the last look began, the last MAX_LOOKS looks (what the
 *   scout says it looked at), and the last MAX_PROPOSED findings it proposed with their
 *   outcome: waiting, urgent (filed at once), filed by the daily pass as a request, or
 *   dropped by it as in work or rejected. The agent gets it next time as data, and code
 *   passes over a finding whose id is in it.
 * - **Measure.** Commands the Operator declared on the base, run by the pick script in the
 *   launch checkout like `check.command`, each bounded in time and cut; the agent itself
 *   has only read tools.
 */

import { state } from 'archon:script';
import { runRecipe } from './environments.ts';
import { type Applied, type Finding, MAX_PER_SCOUT } from './findings.ts';
import type { ItemKey } from './item.ts';
import { fromBase } from './policy.ts';
import { untrusted } from './trust.ts';

export type Every = 'daily' | 'weekly';
export const PERIOD_MS: Readonly<Record<Every, number>> = { daily: 86_400_000, weekly: 604_800_000 };
/** A tick a little early still counts: the hourly timer drifts. */
export const SLACK_MS = 30 * 60_000;

/** The cost caps a look can run under, one agent node each in unify-scout.yaml, smallest first. */
export const CAPS = [
  { tier: 'small', usd: 1 },
  { tier: 'medium', usd: 2 },
  { tier: 'large', usd: 5 },
] as const;
export type Tier = (typeof CAPS)[number]['tier'];

export interface Scout {
  readonly name: string;
  readonly every: Every;
  /** The budget the project declared, USD per look. */
  readonly budget: number;
  /** The cap the look runs under: the largest in CAPS not above the budget. */
  readonly tier: Tier;
  readonly cap: number;
  readonly paths: readonly string[];
  readonly brief: string;
  readonly measure: readonly string[];
}

/** It becomes part of a state document name, which Archon's store limits to `[a-z0-9._-]`. */
const NAME = /^[a-z0-9][a-z0-9._-]{0,39}$/;
const MAX_MEASURE = 3;
const MAX_BRIEF = 1000;

function capOf(name: string, budget: number): { tier: Tier; cap: number } {
  const fit = [...CAPS].reverse().find(c => c.usd <= budget);
  if (fit === undefined) throw new Error(`project.yaml: scout ${name} has budget ${budget}, below the smallest cap of ${CAPS[0].usd} USD`);
  return { tier: fit.tier, cap: fit.usd };
}

/** The `scouts` section of project.yaml; an error names what is wrong. */
export function parseScouts(raw: unknown): Scout[] {
  const r = raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>).scouts : undefined;
  if (r === undefined || r === null) return [];
  if (!Array.isArray(r)) throw new Error('project.yaml: scouts must be a list');
  const scouts = r.map((s, i): Scout => {
    if (s === null || typeof s !== 'object' || Array.isArray(s)) throw new Error(`project.yaml: scout ${i + 1} is not a map`);
    const e = s as Record<string, unknown>;
    const name = String(e.name ?? '');
    if (!NAME.test(name)) throw new Error(`project.yaml: scout name '${name}' must be lower case letters, digits, '.', '_' or '-' (at most 40, starting with a letter or digit)`);
    const every = (e.every ?? 'weekly') as Every;
    if (!(every in PERIOD_MS)) throw new Error(`project.yaml: scout ${name} has every '${String(e.every)}', not daily or weekly`);
    const budget = Number(e.budget);
    if (e.budget === undefined || !Number.isFinite(budget)) throw new Error(`project.yaml: scout ${name} declares no budget (USD per look)`);
    const paths = Array.isArray(e.paths) ? e.paths.filter((p): p is string => typeof p === 'string' && p.trim() !== '').map(p => p.trim()) : [];
    if (paths.length === 0) throw new Error(`project.yaml: scout ${name} names no paths`);
    const brief = typeof e.brief === 'string' ? e.brief.trim() : '';
    if (brief === '') throw new Error(`project.yaml: scout ${name} has no brief`);
    if (brief.length > MAX_BRIEF) throw new Error(`project.yaml: scout ${name} has a brief over ${MAX_BRIEF} characters`);
    const measure = e.measure === undefined ? [] : Array.isArray(e.measure) ? e.measure.map(m => String(m).trim()).filter(m => m !== '') : null;
    if (measure === null) throw new Error(`project.yaml: scout ${name} has measure that is not a list of commands`);
    if (measure.length > MAX_MEASURE) throw new Error(`project.yaml: scout ${name} has ${measure.length} measure commands, at most ${MAX_MEASURE}`);
    return { name, every, budget, ...capOf(name, budget), paths, brief, measure };
  });
  if (new Set(scouts.map(s => s.name)).size !== scouts.length) throw new Error('project.yaml: two scouts share a name');
  return scouts;
}

export function readScouts(base: string): Scout[] {
  const text = fromBase(base, '.pipeline/project.yaml');
  return parseScouts(text === null ? null : Bun.YAML.parse(text));
}

// --- memory ------------------------------------------------------------------------------

export type Outcome = 'waiting' | 'urgent' | 'filed' | 'dropped';

export interface Proposal {
  readonly id: string;
  readonly at: string;
  readonly where: string;
  readonly what: string;
  outcome: Outcome;
  /** The urgent item, the request the daily pass filed, or the item that covered a drop. */
  key: ItemKey | null;
  /** For a drop: in-work or rejected. */
  reason: string | null;
}

export interface Look {
  readonly run: string;
  readonly at: string;
  /** What the scout says it looked at, cut. */
  looked: string;
  kept: number;
  /** Proposed but not kept: repeats, over the limit, a full buffer. */
  passed: number;
}

export interface Memory {
  last: { run: string; at: string } | null;
  looks: Look[];
  proposed: Proposal[];
}

export const MAX_LOOKS = 10;
export const MAX_PROPOSED = 30;
const CUT_LOOKED = 400;
const CUT_WHAT = 200;

export const memoryName = (name: string) => `scouts/${name}`;

export function readMemory(name: string): Memory {
  const value = state.get(memoryName(name)).value as Partial<Memory> | null;
  return { last: null, looks: [], proposed: [], ...(value ?? {}) };
}

function updateMemory(name: string, change: (m: Memory) => void): Memory {
  const doc = memoryName(name);
  for (let attempt = 0; attempt < 3; attempt++) {
    const found = state.get(doc);
    const m: Memory = { last: null, looks: [], proposed: [], ...((found.value as Partial<Memory> | null) ?? {}) };
    change(m);
    m.looks = m.looks.slice(-MAX_LOOKS);
    m.proposed = m.proposed.slice(-MAX_PROPOSED);
    if (state.put(doc, m, { ifRevision: found.revision }).ok) return m;
  }
  throw new Error(`${doc} kept moving under three writes`);
}

const cut = (text: string, n: number) => (text.length <= n ? text : `${text.slice(0, n)} [cut]`);

// --- the pick ----------------------------------------------------------------------------

export interface Pick {
  readonly scout: Scout | null;
  /** Why this scout, or why none. */
  readonly reason: string;
  readonly passed: { readonly name: string; readonly why: string }[];
}

export function isDue(scout: Scout, memory: Memory, now: number): boolean {
  return memory.last === null || now - Date.parse(memory.last.at) >= PERIOD_MS[scout.every] - SLACK_MS;
}

/**
 * The scout this run looks with: the one this run already began (a retried node); else the
 * named one, if it is not at its limit; else the due scout not at its limit that has
 * waited longest (never looked first, then the declared order). `waiting` counts each
 * scout's findings in the buffer.
 */
export function choose(scouts: readonly Scout[], memories: ReadonlyMap<string, Memory>, waiting: ReadonlyMap<string, number>, now: number, named: string, run: string): Pick {
  const memory = (s: Scout) => memories.get(s.name) ?? { last: null, looks: [], proposed: [] };
  const atLimit = (s: Scout) => (waiting.get(s.name) ?? 0) >= MAX_PER_SCOUT;
  const begun = scouts.find(s => memory(s).last?.run === run);
  if (begun) return { scout: begun, reason: `this run began the ${begun.name} scout's look`, passed: [] };
  const limit = (s: Scout) => `at its limit: ${waiting.get(s.name) ?? 0} findings wait for the daily pass`;
  if (named !== '') {
    const s = scouts.find(x => x.name === named);
    if (s === undefined) throw new Error(`no scout named '${named}' is declared in .pipeline/project.yaml on the base (declared: ${scouts.map(x => x.name).join(', ') || 'none'})`);
    if (atLimit(s)) return { scout: null, reason: `the ${s.name} scout is ${limit(s)}`, passed: [{ name: s.name, why: limit(s) }] };
    return { scout: s, reason: `the Operator asked for the ${s.name} scout`, passed: [] };
  }
  if (scouts.length === 0) return { scout: null, reason: 'the project declares no scouts', passed: [] };
  const passed: { name: string; why: string }[] = [];
  const ready: Scout[] = [];
  for (const s of scouts) {
    const m = memory(s);
    if (!isDue(s, m, now)) passed.push({ name: s.name, why: `not due: looked ${m.last?.at ?? ''}, every ${s.every}` });
    else if (atLimit(s)) passed.push({ name: s.name, why: limit(s) });
    else ready.push(s);
  }
  const lastAt = (s: Scout) => memory(s).last?.at ?? '';
  const scout = [...ready].sort((a, b) => lastAt(a).localeCompare(lastAt(b)))[0] ?? null;
  for (const s of ready) if (s !== scout) passed.push({ name: s.name, why: 'due, waits for the next tick: one scout per run' });
  return { scout, reason: scout === null ? 'no scout is due and under its limit' : `the ${scout.name} scout is due`, passed };
}

/** Mark the look as begun: the scout is not due again for a period, whatever the look does. */
export function begin(name: string, run: string, at: string): Memory {
  return updateMemory(name, m => {
    if (m.last?.run !== run) m.last = { run, at };
  });
}

export interface Measured {
  readonly command: string;
  readonly exit: number | null;
  readonly output: string;
}

const MEASURE_MS = 5 * 60_000;
const CUT_OUTPUT = 4000;

/** Run the scout's measure commands; a failing one is reported with its output, never thrown. */
export function measure(scout: Scout): Measured[] {
  return scout.measure.map(command => {
    const run = runRecipe(command, { PIPELINE_SCOUT: scout.name }, MEASURE_MS);
    const output = run.ok ? run.stdout : run.tail;
    return { command, exit: run.exit, output: output.length <= CUT_OUTPUT ? output : `[cut to the last ${CUT_OUTPUT} characters]\n${output.slice(-CUT_OUTPUT)}` };
  });
}

/** What the agent reads: the area in the project's words, its measurements and its memory, the last two as data. */
export function lookContext(scout: Scout, memory: Memory, buffer: readonly Finding[], measured: readonly Measured[]): string {
  const inBuffer = new Set(buffer.map(f => f.id));
  const shown = (p: Proposal) => (p.outcome === 'waiting' && !inBuffer.has(p.id) ? 'handled by the daily pass (outcome not recorded)' : p.outcome === 'waiting' ? 'waiting for the daily pass' : p.outcome === 'urgent' ? `filed at once as ${p.key ?? '?'}` : p.outcome === 'filed' ? `filed as ${p.key ?? '?'}` : `dropped: ${p.reason ?? ''} (${p.key ?? '?'})`);
  const room = Math.max(0, MAX_PER_SCOUT - buffer.filter(f => f.scout === scout.name).length);
  return [
    `## The ${scout.name} scout`,
    '',
    `Looks ${scout.every}. Area (paths): ${scout.paths.join(', ')}`,
    '',
    'What the project asks this scout to look for:',
    '',
    scout.brief,
    '',
    `Room for at most ${room} new finding(s) this time; more are not kept.`,
    '',
    '## Measurements, run by the pipeline before this session',
    '',
    measured.length === 0 ? 'The project declares no measure commands for this scout.' : untrusted('measure output', measured.map(m => `$ ${m.command}\n(exit ${m.exit ?? 'none: timed out'})\n${m.output}`).join('\n\n')),
    '',
    '## Your memory: earlier looks and what you proposed',
    '',
    memory.looks.length === 0 && memory.proposed.length === 0
      ? 'This scout has not looked before.'
      : untrusted(
          'scout memory',
          [
            'Looks, oldest first:',
            ...memory.looks.map(l => `- ${l.at}: ${l.looked} (kept ${l.kept}, passed over ${l.passed})`),
            '',
            'Proposed, oldest first:',
            ...memory.proposed.map(p => `- ${p.at} [${shown(p)}] ${p.where}: ${p.what}`),
          ].join('\n')
        ),
  ].join('\n');
}

/** Write what this look did into the scout's memory; a retry of the same run changes nothing more. */
export function remember(name: string, run: string, at: string, looked: string, kept: readonly { id: string; where: string; what: string; key: ItemKey | null }[], passed: number): Memory {
  return updateMemory(name, m => {
    const look: Look = { run, at, looked: cut(looked.trim().replace(/\s+/g, ' '), CUT_LOOKED), kept: kept.length, passed };
    const i = m.looks.findIndex(l => l.run === run);
    if (i >= 0) m.looks[i] = { ...look, kept: Math.max(look.kept, m.looks[i].kept) };
    else m.looks.push(look);
    for (const k of kept) {
      if (m.proposed.some(p => p.id === k.id)) continue;
      m.proposed.push({ id: k.id, at, where: cut(k.where, CUT_WHAT), what: cut(k.what, CUT_WHAT), outcome: k.key === null ? 'waiting' : 'urgent', key: k.key, reason: null });
    }
  });
}

/**
 * After the daily pass: each scout's finding it filed or dropped gets its outcome in that
 * scout's memory. `before` is the buffer as the pass read it, which names each finding's
 * scout. A proposal the memory no longer holds is passed over.
 */
export function noteOutcomes(before: readonly Finding[], applied: Applied): void {
  const scoutOf = new Map(before.flatMap(f => (f.scout ? [[f.id, f.scout] as const] : [])));
  const changes = new Map<string, ((m: Memory) => void)[]>();
  const add = (id: string, set: (p: Proposal) => void) => {
    const name = scoutOf.get(id);
    if (name === undefined) return;
    const list = changes.get(name) ?? [];
    list.push(m => {
      const p = m.proposed.find(x => x.id === id);
      if (p) set(p);
    });
    changes.set(name, list);
  };
  for (const f of applied.filed)
    for (const id of f.findings)
      add(id, p => {
        p.outcome = 'filed';
        p.key = f.key;
      });
  for (const d of applied.dropped)
    add(d.finding, p => {
      p.outcome = 'dropped';
      p.key = d.item;
      p.reason = d.reason;
    });
  for (const [name, list] of changes) updateMemory(name, m => list.forEach(change => change(m)));
}

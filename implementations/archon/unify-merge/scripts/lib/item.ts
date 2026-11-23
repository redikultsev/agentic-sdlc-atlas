/**
 * Helpers the item workflows of this group share: the start check (`reconcile`), the
 * extra facts this workflow keeps in `work/<n>` beside the shared fields, moves that need
 * more than one step, and reading a wait's answer. The same file sits in
 * `unify-round/scripts/lib/item.ts`; it belongs in `.shared/` once the pack takes it.
 */

import { refuse } from 'archon:script';
import { forge } from '../../../.shared/forge.ts';
import { nullableJson, isObject } from '../../../.shared/inputs.ts';
import type { IssueRef } from '../../../.shared/repo.ts';
import { buildRequest, type Option, type Request } from '../../../.shared/request.ts';
import { MOVES, moveState, readState, StateMismatch, type From, type State } from '../../../.shared/states.ts';
import { readWork, updateWork, type WorkDoc } from '../../../.shared/work.ts';

/** One finding the next round must address, with where it came from. */
export interface Finding {
  readonly key: string;
  readonly source: 'ci' | 'review' | 'validator' | 'operator' | 'thread' | 'conflict' | 'slice' | 'steps';
  readonly text: string;
  /** decision 36 (2): the same finding came back after a fix, so the whole class is fixed. */
  readonly repeated: boolean;
}

/** Facts this group keeps in `work/<n>` beside the shared WorkDoc fields. */
export interface RoundFacts {
  /** What the next round fixes; null when the next round implements new slices. */
  fix: { readonly from: string; readonly findings: readonly Finding[] } | null;
  /** Finding keys per spent round, oldest first: the trend shown at Blocked (decision 37). */
  history: { readonly round: number; readonly keys: readonly string[] }[];
  /** The review's explanation for R1/R2 and its fingerprint, shown on the merge card. */
  review: { readonly fingerprint: string; readonly head: string; readonly explanation: string } | null;
  /** Update attempts in land since the last merge card. */
  landAttempts: number;
}

export type ItemDoc = WorkDoc & RoundFacts;

export function withFacts(doc: WorkDoc): ItemDoc {
  const raw = doc as Partial<ItemDoc>;
  return Object.assign(doc, {
    fix: raw.fix ?? null,
    history: raw.history ?? [],
    review: raw.review ?? null,
    landAttempts: raw.landAttempts ?? 0,
  });
}

export function readItem(number: number): ItemDoc {
  return withFacts(readWork(number).doc);
}

export function updateItem(number: number, change: (doc: ItemDoc) => void): ItemDoc {
  return withFacts(updateWork(number, doc => change(withFacts(doc))));
}

/** Run a script body; any throw becomes the node's refusal with its message. */
export function run(main: () => void): void {
  try {
    main();
  } catch (error) {
    refuse(error instanceof Error ? error.message : String(error));
  }
}

/** The card fields a script hands to a `wait` node; empty when nothing is asked. */
export interface Card {
  readonly ask: boolean;
  readonly question: string;
  readonly options: Request['options'];
  readonly recommendation: Request['recommendation'] | null;
}

export const NO_CARD: Card = { ask: false, question: '', options: [], recommendation: null };

export function card(request: Request): Card {
  return { ask: true, question: request.question, options: request.options, recommendation: request.recommendation };
}

export { buildRequest, type Option };

/** A `select` wait's answer bound with `if_skipped: null`: null when nobody was asked. */
export interface Answer {
  readonly decision: string;
  readonly text: string;
  readonly effect: string;
  readonly value: Record<string, unknown>;
}

export function answerOf(bound: string | undefined): Answer | null {
  const raw = nullableJson(bound);
  if (!isObject(raw)) return null;
  const value = isObject(raw.value) ? raw.value : {};
  const decision = typeof raw.decision === 'string' ? raw.decision : '';
  return {
    decision,
    text: typeof raw.text === 'string' ? raw.text : '',
    effect: decision === 'other' ? 'other' : typeof value.effect === 'string' ? value.effect : decision,
    value,
  };
}

/** A bound script output, null when its producer was skipped. */
export function bound<T>(raw: string | undefined): T | null {
  const value = nullableJson(raw);
  return value === null ? null : (value as T);
}

/**
 * The start check every item run makes: the label names a state this workflow may start
 * from, and `work/<n>` does not contradict it (a PR recorded for an item with no branch,
 * or a branch recorded before any implementing). A mismatch is a request, never an
 * overwrite: the Operator either confirms the label or stops the run.
 */
export function reconcile(ref: IssueRef, workflow: string, starts: readonly From[], target: State, extra: readonly string[] = []): {
  readonly ok: boolean;
  readonly state: string;
  readonly problems: readonly string[];
  readonly card: Card;
} {
  const problems: string[] = [...extra];
  let state: From | 'conflict' = 'none';
  try {
    state = readState(ref);
  } catch (error) {
    if (!(error instanceof StateMismatch)) throw error;
    state = 'conflict';
    problems.push(error.message);
  }
  if (state !== 'conflict' && !starts.includes(state)) {
    problems.push(`the label says ${state}; ${workflow} starts only from ${starts.join(', ')}`);
  }
  const doc = readItem(ref.number);
  if (doc.pr !== null && doc.branch === null) problems.push(`work/${ref.number} records PR #${doc.pr} but no branch`);
  if (problems.length === 0) return { ok: true, state, problems, card: NO_CARD };
  const canProceed = state !== 'conflict' && pathTo(state, target) !== null;
  const options: Option[] = [
    { id: 'stop', label: 'Stop this run', does: 'Ends the run and changes nothing; fix the label and start the step again.', effect: 'stop' },
  ];
  if (canProceed) {
    options.unshift({
      id: 'proceed',
      label: `Continue from ${state}`,
      does: `Takes the label as the truth and runs ${workflow} from ${state}.`,
      effect: 'proceed',
    });
  }
  const request = buildRequest(
    {
      decide: `#${ref.number}: the item's label and its record disagree; continue ${workflow} or stop?`,
      why: 'the label is the only state, and a run never overwrites a label it did not expect.',
      notVerified: ['who changed the label, and why'],
      facts: problems,
    },
    options,
    { option: 'stop', why: 'a label someone changed by hand usually means they want the item held.', confidence: 'medium' }
  );
  return { ok: false, state, problems, card: card(request) };
}

/** The reconcile answer: go on, or end the run where it stands. */
export function reconcileGo(ok: boolean, answer: Answer | null): boolean {
  if (ok) return true;
  return answer !== null && answer.effect === 'proceed';
}

/** The shortest legal path of moves from `from` to `to`, or null; `from` itself excluded. */
export function pathTo(from: From, to: State): State[] | null {
  if (from === to) return [];
  const seen = new Set<string>([from]);
  const queue: { at: From; path: State[] }[] = [{ at: from, path: [] }];
  while (queue.length > 0) {
    const { at, path } = queue.shift() as { at: From; path: State[] };
    for (const next of MOVES[at]) {
      if (seen.has(next)) continue;
      const step = [...path, next];
      if (next === to) return step;
      seen.add(next);
      queue.push({ at: next, path: step });
    }
  }
  return null;
}

/**
 * Move along legal moves only, one label move at a time, each read back. Used where
 * docs/states.md has no direct move (MergeReview to Planning goes through Implementing
 * and Blocked). Refuses from a state outside `expected`.
 */
export function moveAlong(ref: IssueRef, expected: readonly From[], to: State): void {
  const current = readState(ref);
  if (current === to) return;
  if (!expected.includes(current)) throw new StateMismatch(`#${ref.number} is ${current}, expected ${expected.join(' or ')} before ${to}`);
  const path = pathTo(current, to);
  if (path === null) throw new StateMismatch(`docs/states.md has no path ${current} → ${to}`);
  let at: From = current;
  for (const step of path) {
    moveState(ref, [at], step);
    at = step;
  }
}

/**
 * Tell the requester why the item left the pipeline (ForHuman, Cancelled); a cancelled
 * item's issue is also closed as not planned. ForHuman stays open: a human does it.
 */
export function closeWithReason(ref: IssueRef, marker: string, reason: string, close = false): void {
  forge('workitem.comment.upsert', { subject: { kind: 'issue', ref }, marker, body: reason });
  if (!close) return;
  const view = forge('workitem.view', { ref });
  if (view.state === 'open') forge('workitem.close', { ref, reason: 'not_planned' });
}

/** A short stable key for a finding's text: same words, same key. */
export function findingKey(source: string, text: string): string {
  const normal = text.toLowerCase().replace(/[0-9a-f]{7,40}/g, '').replace(/\s+/g, ' ').trim().slice(0, 160);
  let hash = 0;
  for (const ch of `${source}:${normal}`) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `${source}-${hash.toString(16)}`;
}

/** Whether the finding keys shrank round by round, for the Blocked card (decision 37). */
export function trend(history: RoundFacts['history']): string {
  if (history.length === 0) return 'no recorded rounds';
  const counts = history.map(h => h.keys.length).join(' → ');
  const fresh = history.slice(1).map((h, i) => h.keys.filter(k => !history[i].keys.includes(k)).length);
  const allNew = fresh.length > 0 && fresh.every((n, i) => n === history[i + 1].keys.length && n > 0);
  const shrinking = history.every((h, i) => i === 0 || h.keys.length <= history[i - 1].keys.length);
  const shape = allNew ? 'new defects each round' : shrinking ? 'findings shrank round by round' : 'findings did not shrink';
  return `findings per round ${counts}: ${shape}`;
}

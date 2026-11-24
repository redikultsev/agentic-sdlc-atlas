/**
 * The 17 work item states of docs/states.md and the only moves between them.
 *
 * The engine holds the state (decision 45): it lives in the item's document `work/<key>`
 * in Archon's store, and the tracker shows it as a `state:*` label. A move writes the
 * document first, under the revision it read, so two runs never both move an item; then
 * it puts the label right and reads it back. When the label and the document disagree,
 * nothing is overwritten: the caller raises a difference to the Operator, who either
 * brings the tracker back to the engine or adopts the tracker's change.
 *
 * Labels change one at a time with label.add and label.remove, never labels.set, which
 * replaces the whole set and races people.
 */

import { forge } from './forge.ts';
import type { IssueRef } from './repo.ts';
import { readWork, updateWork } from './work.ts';

export const STATES = {
  triaging: { label: 'state:triaging', operator: false },
  'triage-review': { label: 'state:triage-review', operator: true },
  specifying: { label: 'state:specifying', operator: false },
  'spec-review': { label: 'state:spec-review', operator: true },
  planning: { label: 'state:planning', operator: false },
  'plan-review': { label: 'state:plan-review', operator: true },
  implementing: { label: 'state:implementing', operator: false },
  verifying: { label: 'state:verifying', operator: false },
  'merge-review': { label: 'state:merge-review', operator: true },
  /** Waits for a person on the environment's list, outside the Operator's cap (decision 50). */
  'test-review': { label: 'state:test-review', operator: false },
  /** Merged; waits for the release that carries it, or the release is deploying (decision 48). */
  releasing: { label: 'state:releasing', operator: false },
  live: { label: 'state:live', operator: false },
  blocked: { label: 'state:blocked', operator: true },
  'for-human': { label: 'state:for-human', operator: false },
  done: { label: 'state:done', operator: false },
  'rolled-back': { label: 'state:rolled-back', operator: false },
  cancelled: { label: 'state:cancelled', operator: false },
} as const;

export type State = keyof typeof STATES;
export const NONE = 'none' as const;
export type From = State | typeof NONE;

/**
 * Allowed moves, read off the two diagrams in docs/states.md (a test checks every arrow
 * there is here). `none` is an item the engine holds no state for. Besides the arrows:
 * the Operator can cancel in any state, and hand an item to a human at any of their own
 * gates (docs/states.md, text above the diagrams); a slice that cannot be built goes from
 * Implementing to Blocked.
 */
export const MOVES: Readonly<Record<From, readonly State[]>> = {
  none: ['triaging'],
  triaging: ['triage-review', 'cancelled'],
  'triage-review': ['implementing', 'specifying', 'for-human', 'cancelled'],
  specifying: ['spec-review', 'cancelled'],
  'spec-review': ['specifying', 'planning', 'cancelled', 'for-human'],
  planning: ['plan-review', 'cancelled'],
  'plan-review': ['planning', 'implementing', 'cancelled', 'for-human'],
  implementing: ['verifying', 'blocked', 'cancelled'],
  verifying: ['implementing', 'blocked', 'merge-review', 'test-review', 'releasing', 'cancelled'],
  'merge-review': ['implementing', 'verifying', 'cancelled', 'for-human'],
  'test-review': ['implementing', 'releasing', 'cancelled', 'for-human'],
  releasing: ['live', 'cancelled'],
  live: ['done', 'rolled-back', 'releasing', 'cancelled'],
  blocked: ['implementing', 'planning', 'for-human', 'cancelled'],
  'for-human': [],
  done: [],
  'rolled-back': [],
  cancelled: [],
};

const LABEL_TO_STATE = new Map<string, State>(
  Object.entries(STATES).map(([state, def]) => [def.label, state as State])
);

/** The state an issue's labels name: none, one, or a conflict. */
export function stateOf(labels: readonly string[]): { readonly state: From } | { readonly conflict: readonly string[] } {
  const found = labels.filter(label => LABEL_TO_STATE.has(label));
  if (found.length > 1) return { conflict: found };
  return { state: found.length === 0 ? NONE : (LABEL_TO_STATE.get(found[0]) as State) };
}

export class StateMismatch extends Error {}

/** The tracker shows something other than what the engine holds (decision 45). */
export class StateDifference extends StateMismatch {
  constructor(
    readonly ref: IssueRef,
    /** What the engine holds. */
    readonly engine: From,
    /** What the tracker shows: a state, or `conflict` when it shows more than one. */
    readonly tracker: From | 'conflict',
    readonly labels: readonly string[]
  ) {
    super(
      tracker === 'conflict'
        ? `#${ref.number}: the engine holds ${engine}; the tracker shows more than one state (${labels.join(', ')})`
        : `#${ref.number}: the engine holds ${engine}; the tracker shows ${tracker}`
    );
  }
}

function stateLabels(ref: IssueRef): string[] {
  const view = forge('workitem.view', { ref });
  return (view.labels ?? []).filter(label => LABEL_TO_STATE.has(label));
}

function trackerState(labels: readonly string[]): From | 'conflict' {
  const found = stateOf(labels);
  return 'conflict' in found ? 'conflict' : found.state;
}

/**
 * The engine's state of an item, after checking the tracker shows the same. An item the
 * pack worked before the engine held states has a document with no state: its label is
 * adopted once, since the label was the state then. A difference is thrown, never fixed.
 */
export function readState(ref: IssueRef): From {
  const labels = stateLabels(ref);
  const tracker = trackerState(labels);
  const { doc, revision } = readWork(ref.number);
  if (doc.state === null && revision > 0 && tracker !== 'conflict' && tracker !== NONE) {
    updateWork(ref.number, d => {
      if (d.state !== null) throw new StateMismatch(`${ref.number}: another run set the state while it was adopted`);
      d.state = tracker;
      d.stateAt = { at: new Date().toISOString(), how: 'adopted' };
    });
    return tracker;
  }
  const engine = (doc.state ?? NONE) as From;
  if (tracker !== engine) throw new StateDifference(ref, engine, tracker, labels);
  return engine;
}

/** Put the tracker's state labels right: exactly `state`, or none. Read back. */
function showState(ref: IssueRef, state: From): void {
  const subject = { kind: 'issue' as const, ref };
  const want = state === NONE ? null : STATES[state].label;
  const have = stateLabels(ref);
  if (want !== null && !have.includes(want)) forge('workitem.label.add', { subject, name: want });
  for (const label of have) if (label !== want) forge('workitem.label.remove', { subject, name: label });
  const after = trackerState(stateLabels(ref));
  if (after !== state) throw new Error(`#${ref.number}: the tracker shows ${after} after it was set to ${state}`);
}

/**
 * Move an item to `to`. `expected` lists the states this step may start from; any other
 * state, or a difference with the tracker, is a mismatch the caller raises as a request
 * instead of overwriting. Idempotent: an item already in `to` is left as it is.
 */
export function moveState(ref: IssueRef, expected: readonly From[], to: State): void {
  const current = readState(ref);
  if (current === to) return;
  if (!expected.includes(current)) {
    throw new StateMismatch(`#${ref.number} is ${current}, expected ${expected.join(' or ')} before ${to}`);
  }
  if (!MOVES[current].includes(to)) throw new StateMismatch(`docs/states.md has no move ${current} → ${to}`);
  updateWork(ref.number, doc => {
    if ((doc.state ?? NONE) !== current) throw new StateMismatch(`#${ref.number} was moved to ${doc.state ?? NONE} by another run`);
    doc.state = to;
    doc.stateAt = { at: new Date().toISOString(), how: 'move' };
  });
  showState(ref, to);
}

/**
 * The Operator's answer to a difference (decision 45): `engine` puts the tracker back to
 * what the engine holds; `tracker` adopts the state the tracker shows. Adopting needs one
 * state on the tracker. Either way the engine records that the Operator decided.
 */
export function resolveDifference(ref: IssueRef, keep: 'engine' | 'tracker'): From {
  const { doc } = readWork(ref.number);
  const engine = (doc.state ?? NONE) as From;
  if (keep === 'engine') {
    showState(ref, engine);
    return engine;
  }
  const tracker = trackerState(stateLabels(ref));
  if (tracker === 'conflict') throw new StateMismatch(`#${ref.number}: the tracker shows more than one state; there is nothing single to adopt`);
  updateWork(ref.number, d => {
    d.state = tracker === NONE ? null : tracker;
    d.stateAt = { at: new Date().toISOString(), how: 'operator' };
  });
  return tracker;
}

/** Pipeline labels besides the states; all are ensured at install by unify-ping. */
export const MARKS = {
  approved: 'pipeline:approved',
  needsApproval: 'pipeline:needs-approval',
  rejected: 'pipeline:rejected',
  discovery: 'pipeline:discovery',
  rulings: 'pipeline:rulings',
  slice: 'pipeline:slice',
  retro: 'pipeline:retro',
  needsAttention: 'pipeline:needs-attention',
  setAside: 'pipeline:set-aside',
} as const;

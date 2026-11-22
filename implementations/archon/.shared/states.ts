/**
 * The 15 work item states of docs/states.md (decision 28), as `state:*` labels, and the
 * only moves between them. The label is the only state: this module moves it with
 * label.add and label.remove (never labels.set, which replaces the whole set and races
 * people), reads it back, and refuses a move from a label it did not expect.
 */

import { forge } from 'archon:script';
import type { IssueRef } from './repo.ts';

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

/** Allowed moves, read off the two diagrams in docs/states.md. `none` is an issue with no state label. */
export const MOVES: Readonly<Record<From, readonly State[]>> = {
  none: ['triaging'],
  triaging: ['triage-review'],
  'triage-review': ['implementing', 'specifying', 'for-human', 'cancelled'],
  specifying: ['spec-review'],
  'spec-review': ['specifying', 'planning'],
  planning: ['plan-review'],
  'plan-review': ['planning', 'implementing'],
  implementing: ['verifying', 'blocked'],
  verifying: ['implementing', 'blocked', 'merge-review', 'live'],
  'merge-review': ['implementing', 'live'],
  live: ['done', 'rolled-back'],
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

export function readState(ref: IssueRef): From {
  const view = forge('workitem.view', { ref });
  const result = stateOf(view.labels ?? []);
  if ('conflict' in result) throw new StateMismatch(`#${ref.number} has more than one state label: ${result.conflict.join(', ')}`);
  return result.state;
}

/**
 * Move an item to `to`. `expected` lists the states this step may start from; any other
 * current state (a person edited the label, or another run moved it) is a mismatch the
 * caller raises as a request instead of overwriting. Idempotent: an item already in `to`
 * is left as it is.
 */
export function moveState(ref: IssueRef, expected: readonly From[], to: State): void {
  const current = readState(ref);
  if (current === to) return;
  if (!expected.includes(current)) {
    throw new StateMismatch(`#${ref.number} is ${current}, expected ${expected.join(' or ')} before ${to}`);
  }
  if (!MOVES[current].includes(to)) throw new StateMismatch(`docs/states.md has no move ${current} → ${to}`);
  const subject = { kind: 'issue' as const, ref };
  forge('workitem.label.add', { subject, name: STATES[to].label });
  if (current !== NONE) forge('workitem.label.remove', { subject, name: STATES[current].label });
  const after = readState(ref);
  if (after !== to) throw new Error(`#${ref.number} reads ${after} after the move to ${to}`);
}

/** Pipeline labels besides the states; all are ensured at install by pipeline-ping. */
export const MARKS = {
  approved: 'pipeline:approved',
  needsApproval: 'pipeline:needs-approval',
  rejected: 'pipeline:rejected',
  discovery: 'pipeline:discovery',
  rulings: 'pipeline:rulings',
  slice: 'pipeline:slice',
  retro: 'pipeline:retro',
} as const;

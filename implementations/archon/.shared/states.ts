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
 * Labels change one at a time through the connector, never as a whole set, which races
 * people. While the tracker is down the engine goes on: a read returns the engine's state
 * unchecked and the label write waits in the connector's queue (decision 47).
 */

import { tracker, TrackerError } from './connector.ts';
import type { ItemKey } from './item.ts';
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

const ALL_LABELS = Object.values(STATES).map(def => def.label as string);

export class StateMismatch extends Error {}

/** The tracker shows something other than what the engine holds (decision 45). */
export class StateDifference extends StateMismatch {
  constructor(
    readonly key: ItemKey,
    /** What the engine holds. */
    readonly engine: From,
    /** What the tracker shows: a state, or `conflict` when it shows more than one. */
    readonly tracker: From | 'conflict',
    readonly labels: readonly string[],
    /** Said instead of the default, for a write the tracker refused. */
    message?: string
  ) {
    super(
      message ??
      (tracker === 'conflict'
        ? `${key}: the engine holds ${engine}; the tracker shows more than one state (${labels.join(', ')})`
        : `${key}: the engine holds ${engine}; the tracker shows ${tracker}`)
    );
  }
}

async function stateLabels(key: ItemKey): Promise<string[]> {
  return (await tracker().view(key)).labels.filter(label => LABEL_TO_STATE.has(label));
}

function trackerState(labels: readonly string[]): From | 'conflict' {
  const found = stateOf(labels);
  return 'conflict' in found ? 'conflict' : found.state;
}

/**
 * The engine's state of an item, after checking the tracker shows the same. An item the
 * pack worked before the engine held states has a document with no state: its label is
 * adopted once, since the label was the state then. A difference is thrown, never fixed.
 * While the tracker is down the engine's state is returned unchecked (decision 47).
 */
export async function readState(key: ItemKey): Promise<From> {
  let labels: string[];
  try {
    // Writes queued while the tracker was down go first, or they would read as a difference.
    await tracker().flush(key);
    labels = await stateLabels(key);
  } catch (error) {
    const held = readWork(key).doc.state;
    if (error instanceof TrackerError && error.kind === 'outage' && held !== null) return held as From;
    throw error;
  }
  const shown = trackerState(labels);
  const { doc, revision } = readWork(key);
  if (doc.state === null && revision > 0 && shown !== 'conflict' && shown !== NONE) {
    updateWork(key, d => {
      if (d.state !== null) throw new StateMismatch(`${key}: another run set the state while it was adopted`);
      d.state = shown;
      d.stateAt = { at: new Date().toISOString(), how: 'adopted' };
    });
    return shown;
  }
  const engine = (doc.state ?? NONE) as From;
  if (shown !== engine) throw new StateDifference(key, engine, shown, labels);
  return engine;
}

/**
 * Put the tracker's state labels right: exactly `state`, or none; the connector reads it
 * back, or queues it while the tracker is down. A stale write is dropped: when the engine
 * moved on since, the later move shows its own state (decision 47, rule 3).
 */
async function showState(key: ItemKey, state: From): Promise<void> {
  if (((readWork(key).doc.state ?? NONE) as From) !== state) return;
  const want = state === NONE ? null : STATES[state].label;
  await tracker().label(key, { add: want === null ? [] : [want], remove: ALL_LABELS.filter(l => l !== want) });
}

/**
 * Move an item to `to`. `expected` lists the states this step may start from; any other
 * state, or a difference with the tracker, is a mismatch the caller raises as a request
 * instead of overwriting. Idempotent: an item already in `to` is left as it is.
 */
export async function moveState(key: ItemKey, expected: readonly From[], to: State): Promise<void> {
  const current = await readState(key);
  if (current === to) return;
  if (!expected.includes(current)) {
    throw new StateMismatch(`${key} is ${current}, expected ${expected.join(' or ')} before ${to}`);
  }
  if (!MOVES[current].includes(to)) throw new StateMismatch(`docs/states.md has no move ${current} → ${to}`);
  updateWork(key, doc => {
    if ((doc.state ?? NONE) !== current) throw new StateMismatch(`${key} was moved to ${doc.state ?? NONE} by another run`);
    doc.state = to;
    doc.stateAt = { at: new Date().toISOString(), how: 'move' };
  });
  await showState(key, to);
}

/**
 * The Operator's answer to a difference (decision 45): `engine` puts the tracker back to
 * what the engine holds; `tracker` adopts the state the tracker shows. Adopting needs one
 * state on the tracker. Either way the engine records that the Operator decided.
 */
export async function resolveDifference(key: ItemKey, keep: 'engine' | 'tracker'): Promise<From> {
  const { doc } = readWork(key);
  const engine = (doc.state ?? NONE) as From;
  if (keep === 'engine') {
    await showState(key, engine);
    return engine;
  }
  const shown = trackerState(await stateLabels(key));
  if (shown === 'conflict') throw new StateMismatch(`${key}: the tracker shows more than one state; there is nothing single to adopt`);
  updateWork(key, d => {
    d.state = shown === NONE ? null : shown;
    d.stateAt = { at: new Date().toISOString(), how: 'operator' };
  });
  return shown;
}

/** Pipeline labels besides the states; all are ensured at install by unify-ping. */
export const MARKS = {
  approved: 'pipeline:approved',
  needsApproval: 'pipeline:needs-approval',
  rejected: 'pipeline:rejected',
  /** A request the daily pass made from the findings buffer (decision 60); the poll takes it after people's requests. */
  discovery: 'pipeline:discovery',
  /** A finding an agent marked urgent, filed at once without the buffer (decision 60). */
  urgentFinding: 'pipeline:urgent-finding',
  rulings: 'pipeline:rulings',
  slice: 'pipeline:slice',
  retro: 'pipeline:retro',
  needsAttention: 'pipeline:needs-attention',
  setAside: 'pipeline:set-aside',
} as const;

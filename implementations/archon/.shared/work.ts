/**
 * The item's document `work/<key>` in Archon's state store: the item's state, which is
 * the truth the pipeline acts on (decision 45; `states.ts` moves it, the tracker's label
 * only shows it), and the facts tied to it. Conditional writes, so two runs never
 * overwrite each other; the document stays far under the 64 KiB cap. Each workflow checks
 * at its start that the tracker and this document agree (its own `reconcile` script).
 */

import { state } from 'archon:script';
import { asKey, type ItemKey, keySlug } from './item.ts';
import type { SliceRecord } from './red.ts';

export interface Verdict {
  readonly kind: 'ci' | 'review' | 'validator' | 'operator';
  readonly verdict: string;
  readonly fingerprint: string;
  readonly head: string;
  readonly at: string;
}

export interface WorkDoc {
  /** The item's state, one of `states.ts`; null until the engine first holds it (an item from before decision 45 is adopted from its label once). */
  state: string | null;
  /** When the state was last set, and how: a move, adopted from the tracker's label, or the Operator's answer to a difference. */
  stateAt: { at: string; how: 'move' | 'adopted' | 'operator' } | null;
  /** Failed fix rounds in the current Implementing/Verifying stretch (decision 15). */
  rounds: number;
  /** "changes" answers at the merge gate (decision 24 keeps them out of `rounds`). */
  changes: number;
  /** "clarify" at the spec gate and "redo" at the plan gate. */
  clarify: number;
  redo: number;
  branch: string | null;
  pr: number | null;
  /** Test ids failing at the base commit, and that commit (trial log 18, 31). */
  base: { commit: string; failing: string[] } | null;
  slices: { id: string; issue: number | null; status: 'open' | 'pushed' | 'failed' | 'merged'; branch: string | null; blockedBy: string[] }[];
  verdicts: Verdict[];
  discoveries: number;
  /** Where the last fire of the next step went: admitted, queued, skipped or unknown. */
  lastFire: { what: string; disposition: string; at: string } | null;
  flags: string[];
  /** The fix the next round must make (findings, failing ids), set by unify-round. */
  fix: unknown;
  /** One line per round: when, what failed, findings count, for the Blocked trend (decision 37). */
  history: unknown[];
  /** The last review verdict and findings, for the class-level rule (decision 36). */
  review: unknown;
  /** Branch updates tried by land on the current card (at most 3). */
  landAttempts: number;
  /** Set by the Operator at Accept or later: front of every queue, a release right after the merge (decision 53). */
  urgent: boolean;
  /** The toggle the change ships behind, when the plan names one (decision 61). */
  toggle: string | null;
  /** Approvals on pre-merge environments, each bound to the candidate's restricted tree (decisions 49, 50). */
  approvals: { env: string; service: string; commit: string; tree: string; by: string; at: string }[];
  /** The release that carries the item, once one took it (decision 48). */
  release: string | null;
  /** What Triage found the item to be (bug, feature, chore, question), set at Accept; null for an item accepted before it was kept. */
  kind: string | null;
  /** Each slice run's new tests with their red record, and its skipped steps (decision 58; `red.ts`). */
  redRecords: SliceRecord[];
}

export function emptyWork(): WorkDoc {
  return {
    state: null,
    stateAt: null,
    rounds: 0,
    changes: 0,
    clarify: 0,
    redo: 0,
    branch: null,
    pr: null,
    base: null,
    slices: [],
    verdicts: [],
    discoveries: 0,
    lastFire: null,
    flags: [],
    fix: null,
    history: [],
    review: null,
    landAttempts: 0,
    urgent: false,
    toggle: null,
    approvals: [],
    release: null,
    kind: null,
    redRecords: [],
  };
}

export function docName(item: ItemKey | number): string {
  return `work/${keySlug(asKey(item))}`;
}

export function readWork(item: ItemKey | number): { readonly doc: WorkDoc; readonly revision: number } {
  // A never-written document reads with a null value; a deleted one carries the revision a recreating put must name.
  const found = state.get(docName(item));
  if (found.value === null || found.value === undefined) return { doc: emptyWork(), revision: found.revision };
  return { doc: { ...emptyWork(), ...(found.value as Partial<WorkDoc>) }, revision: found.revision };
}

/**
 * Read, change and write back under the revision read; on a conflict read again and
 * retry, up to three times. `change` must be safe to run more than once.
 */
export function updateWork(item: ItemKey | number, change: (doc: WorkDoc) => void): WorkDoc {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { doc, revision } = readWork(item);
    change(doc);
    const result = state.put(docName(item), doc, { ifRevision: revision });
    if (result.ok) return doc;
  }
  throw new Error(`${docName(item)} kept moving under three writes`);
}

/** The verdicts recorded for the given fingerprint; older ones are stale (decision 33). */
export function currentVerdicts(doc: WorkDoc, fingerprint: string): Verdict[] {
  return doc.verdicts.filter(v => v.fingerprint === fingerprint);
}

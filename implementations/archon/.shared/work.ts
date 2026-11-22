/**
 * The item's document `work/<n>` in Archon's state store: facts tied to the item's
 * current state, never the state itself (that is the label). Conditional writes, so two
 * runs never overwrite each other; the document stays far under the 64 KiB cap.
 */

import { state } from 'archon:script';

export interface Verdict {
  readonly kind: 'ci' | 'review' | 'validator' | 'operator';
  readonly verdict: string;
  readonly fingerprint: string;
  readonly head: string;
  readonly at: string;
}

export interface WorkDoc {
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
}

export function emptyWork(): WorkDoc {
  return {
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
  };
}

export function docName(number: number): string {
  return `work/${number}`;
}

export function readWork(number: number): { readonly doc: WorkDoc; readonly revision: number } {
  // A never-written document reads with a null value; a deleted one carries the revision a recreating put must name.
  const found = state.get(docName(number));
  if (found.value === null || found.value === undefined) return { doc: emptyWork(), revision: found.revision };
  return { doc: { ...emptyWork(), ...(found.value as Partial<WorkDoc>) }, revision: found.revision };
}

/**
 * Read, change and write back under the revision read; on a conflict read again and
 * retry, up to three times. `change` must be safe to run more than once.
 */
export function updateWork(number: number, change: (doc: WorkDoc) => void): WorkDoc {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { doc, revision } = readWork(number);
    change(doc);
    const result = state.put(docName(number), doc, { ifRevision: revision });
    if (result.ok) return doc;
  }
  throw new Error(`work/${number} kept moving under three writes`);
}

/** The verdicts recorded for the given fingerprint; older ones are stale (decision 33). */
export function currentVerdicts(doc: WorkDoc, fingerprint: string): Verdict[] {
  return doc.verdicts.filter(v => v.fingerprint === fingerprint);
}

/**
 * Decision requests to the Operator (decisions 11, 38). A `card` script builds one and
 * emits `{question, options, recommendation}`; the `wait` node takes the three by
 * reference. Every option carries `value.effect`, the exact action the script after the
 * gate takes; the presentation rules give the text its shape: what to decide, why it came
 * to the Operator, what was not verified on top, then the facts. A malformed request
 * (a recommendation naming no option, repeated ids) throws before anyone sees it.
 *
 * The waiting cap (decision 9) counts items that have an open request: items the engine
 * holds in an Operator state.
 */

import { state } from 'archon:script';
import type { ItemKey } from './item.ts';
import { type State, STATES } from './states.ts';
import { docName, type WorkDoc } from './work.ts';

export interface Option {
  readonly id: string;
  readonly label: string;
  readonly does: string;
  readonly effect: string;
  readonly extra?: Readonly<Record<string, unknown>>;
}

export interface Request {
  readonly question: string;
  readonly options: readonly { id: string; label: string; does: string; value: Record<string, unknown> }[];
  readonly recommendation: { option: string; why: string; confidence: 'low' | 'medium' | 'high' };
}

export interface RequestText {
  readonly decide: string;
  readonly why: string;
  readonly notVerified: readonly string[];
  readonly facts: readonly string[];
}

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function buildRequest(
  text: RequestText,
  options: readonly Option[],
  recommendation: { option: string; why: string; confidence: 'low' | 'medium' | 'high' }
): Request {
  const ids = new Set<string>();
  for (const option of options) {
    if (!ID.test(option.id)) throw new Error(`option id '${option.id}' is not kebab-case`);
    if (option.id === 'other') throw new Error("'other' is reserved; the wait adds it");
    if (ids.has(option.id)) throw new Error(`option '${option.id}' is declared twice`);
    ids.add(option.id);
  }
  if (!ids.has(recommendation.option)) throw new Error(`the recommendation names '${recommendation.option}', which is no option`);
  const lines = [
    text.decide,
    '',
    ...(text.notVerified.length > 0 ? ['Not verified: ' + text.notVerified.join('; ') + '.', ''] : []),
    `Why you: ${text.why}`,
    ...(text.facts.length > 0 ? ['', ...text.facts.map(f => `- ${f}`)] : []),
  ];
  return {
    question: lines.join('\n'),
    options: options.map(o => ({ id: o.id, label: o.label, does: o.does, value: { effect: o.effect, ...(o.extra ?? {}) } })),
    recommendation,
  };
}

/**
 * Items with an open request to the Operator, from the engine's store (decision 45): an
 * Operator state and not set aside (a set-aside item waits for nobody and frees its
 * place). `own` leaves the asking item out.
 */
export function waitingCount(own: ItemKey | null = null): number {
  const skip = own === null ? null : docName(own);
  return state.listValues('work/').filter(found => {
    if (found.name === skip) return false;
    const doc = (found.value ?? {}) as Partial<WorkDoc>;
    const held = doc.state as State | null | undefined;
    return held != null && STATES[held]?.operator === true && !(doc.flags ?? []).includes(SET_ASIDE);
  }).length;
}

/** The engine's flag for an item set aside by unify-revisit; the tracker shows it as a label. */
export const SET_ASIDE = 'set-aside';

export const WAITING_CAP = 3;

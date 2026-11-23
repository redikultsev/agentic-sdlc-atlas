/**
 * Decision requests to the Operator (decisions 11, 38). A `card` script builds one and
 * emits `{question, options, recommendation}`; the `wait` node takes the three by
 * reference. Every option carries `value.effect`, the exact action the script after the
 * gate takes; the presentation rules give the text its shape: what to decide, why it came
 * to the Operator, what was not verified on top, then the facts. A malformed request
 * (a recommendation naming no option, repeated ids) throws before anyone sees it.
 *
 * The waiting cap (decision 9) counts items that have an open request: issues in an
 * Operator state.
 */

import { forge } from './forge.ts';
import type { Repo } from './repo.ts';
import { MARKS, STATES } from './states.ts';

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

const OPERATOR_LABELS = Object.values(STATES)
  .filter(s => s.operator)
  .map(s => s.label);

/** Items with an open request to the Operator. */
export function waitingCount(repo: Repo): number {
  const numbers = new Set<number>();
  for (const label of OPERATOR_LABELS) {
    const listed = forge('workitem.list', { repo, label });
    for (const item of listed.items) if (item.kind === 'issue' && item.state === 'open') numbers.add(item.ref.number);
  }
  // A set-aside item waits for nobody: it frees its place.
  const aside = forge('workitem.list', { repo, label: MARKS.setAside });
  for (const item of aside.items) numbers.delete(item.ref.number);
  return numbers.size;
}

export const WAITING_CAP = 3;

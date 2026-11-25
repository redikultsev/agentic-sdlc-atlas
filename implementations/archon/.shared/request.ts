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

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { artifactsDir, state } from 'archon:script';
import { cardOf, type DecisionCard } from './card.ts';
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
  /** The question, one line: what the Operator decides. */
  readonly decide: string;
  /** One line under the question: what the item is about, in plain words. */
  readonly headline?: string;
  readonly why: string;
  /** One to three facts the Operator can check in seconds: a reproduction rate, a control case, a failing test. */
  readonly check?: readonly string[];
  readonly notVerified: readonly string[];
  readonly facts: readonly string[];
  /** The cause as a few short steps from input to wrong output, for a defect; the card draws it as a chain. */
  readonly cause?: readonly string[];
  /** When set, the full case goes to the run's artifacts as `<case>.md` and `<case>.card.json` (decision 68), and the message names it instead of listing the facts. */
  readonly case?: string;
}

/** The request as a typed card (decision 68), the same blocks the text shows. */
export function requestCard(
  text: RequestText,
  options: readonly Option[],
  recommendation: { option: string; why: string; confidence: 'low' | 'medium' | 'high' }
): DecisionCard {
  return cardOf({
    question: text.decide,
    headline: text.headline,
    recommendation,
    meaning: CONFIDENCE[recommendation.confidence],
    checks: (text.check ?? []).filter(c => c.trim() !== '').slice(0, 3),
    notVerified: text.notVerified,
    cause: text.cause,
    whyYou: text.why,
    facts: text.facts,
    options,
  });
}

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** What each confidence means, said next to it (a bare word or a percentage calibrates nobody). */
export const CONFIDENCE: Readonly<Record<'low' | 'medium' | 'high', string>> = {
  high: 'every claim behind it was run or read',
  medium: 'the main claim has evidence; the gaps are listed',
  low: 'a reading, not yet backed; check before you accept',
};

const bullet = (line: string): string => `  • ${line}`;

/**
 * The request in its presentation order (decision 38, revised 2026-11-25): the question
 * and what it is about; the recommendation with its confidence and what that means; what
 * the Operator can check in seconds; what was not verified, in plain view; why it came to
 * the Operator; then the facts, or the name of the case file that holds them. The console
 * shows plain text, so blocks are separated by blank lines and named in words.
 */
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
  const chosen = options.find(o => o.id === recommendation.option)!;
  const check = (text.check ?? []).filter(c => c.trim() !== '').slice(0, 3);
  const recommended = `Recommended: ${chosen.label}. Confidence ${recommendation.confidence}: ${CONFIDENCE[recommendation.confidence]}.`;
  const caseFile = text.case
    ? writeCase(text.case, caseMarkdown(text, options, recommendation, chosen.label), requestCard(text, options, recommendation))
    : null;
  const lines = [
    text.decide,
    ...(text.headline ? [text.headline] : []),
    '',
    recommended,
    ...(recommendation.why ? [recommendation.why] : []),
    ...(check.length > 0 ? ['', 'Check it yourself:', ...check.map(bullet)] : []),
    ...(text.notVerified.length > 0 ? ['', 'Not verified:', ...text.notVerified.map(bullet)] : []),
    '',
    `Why this came to you: ${text.why}`,
    ...(caseFile !== null
      ? ['', `The whole case (evidence, options, sources): the run's Artifacts tab, ${caseFile}.`]
      : text.facts.length > 0
        ? ['', 'Facts:', ...text.facts.map(bullet)]
        : []),
  ];
  return {
    question: lines.join('\n'),
    options: options.map(o => ({ id: o.id, label: o.label, does: o.does, value: { effect: o.effect, ...(o.extra ?? {}) } })),
    recommendation,
  };
}

/** The whole case as markdown: the same blocks with headings, then the facts and the options with what each does. */
export function caseMarkdown(
  text: RequestText,
  options: readonly Option[],
  recommendation: { option: string; why: string; confidence: 'low' | 'medium' | 'high' },
  label: string
): string {
  const list = (items: readonly string[]): string[] => items.map(i => `- ${i}`);
  return [
    `# ${text.decide}`,
    ...(text.headline ? ['', text.headline] : []),
    '',
    `**Recommended: ${label}.** Confidence ${recommendation.confidence}: ${CONFIDENCE[recommendation.confidence]}.`,
    ...(recommendation.why ? ['', recommendation.why] : []),
    ...((text.check ?? []).length > 0 ? ['', '## Check it yourself', '', ...list(text.check ?? [])] : []),
    ...(text.notVerified.length > 0 ? ['', '## Not verified', '', ...list(text.notVerified)] : []),
    ...((text.cause ?? []).length > 0 ? ['', '## The cause', '', (text.cause ?? []).join(' → ')] : []),
    '',
    '## Why this came to you',
    '',
    text.why,
    ...(text.facts.length > 0 ? ['', '## Facts', '', ...list(text.facts)] : []),
    '',
    '## Options',
    '',
    '| Option | What happens |',
    '|---|---|',
    ...options.map(o => `| ${o.label}${o.id === recommendation.option ? ' (recommended)' : ''} | ${o.does.replaceAll('|', '/')} |`),
    '| Other | Your text says what to do instead; it is recorded as a ruling. |',
    '',
  ].join('\n');
}

/** Writes the case into the run's artifacts, as markdown and as the card's data; null when the run has no artifacts directory. */
function writeCase(name: string, markdown: string, card: DecisionCard): string | null {
  const base = name.replace(/[^A-Za-z0-9._-]+/g, '-');
  try {
    const dir = artifactsDir();
    if (!dir) return null;
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${base}.md`), markdown);
    writeFileSync(join(dir, `${base}.card.json`), JSON.stringify(card, null, 2));
    return `${base}.md`;
  } catch {
    return null;
  }
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

/**
 * The decision card as data (decision 68): the same request the Operator reads as text,
 * typed so any surface can draw it (a page of ours, a plugin of another engine, a tracker
 * comment) without parsing prose. No engine import: it is built from what `request.ts`
 * holds and is rendered by `decision-ui/card.html`.
 */

export type Confidence = 'low' | 'medium' | 'high';

/** "3 of 3", "1 of 3 runs", "0/3": a count the card draws as dots. */
export interface Rate {
  readonly hits: number;
  readonly runs: number;
}

export interface CardCheck {
  readonly text: string;
  readonly rate: Rate | null;
}

export interface CardOption {
  readonly id: string;
  readonly label: string;
  readonly does: string;
  readonly recommended: boolean;
}

export interface DecisionCard {
  readonly version: 1;
  readonly question: string;
  readonly headline: string | null;
  readonly recommendation: { readonly option: string; readonly label: string; readonly confidence: Confidence; readonly meaning: string; readonly why: string };
  readonly checks: readonly CardCheck[];
  readonly notVerified: readonly string[];
  /** The cause as steps from input to wrong output, when the request is about a defect. */
  readonly cause: readonly string[];
  readonly whyYou: string;
  readonly facts: readonly string[];
  readonly options: readonly CardOption[];
  /** The free-text answer every request accepts; it is recorded as a ruling. */
  readonly other: true;
}

const RATE = /(\d+)\s*(?:of|из|\/)\s*(\d+)/i;

/** The first "k of N" in a check, when k ≤ N ≤ 20 (more runs than that is a chart, not dots). */
export function rateOf(text: string): Rate | null {
  const m = RATE.exec(text);
  if (!m) return null;
  const hits = Number(m[1]);
  const runs = Number(m[2]);
  return runs > 0 && runs <= 20 && hits <= runs ? { hits, runs } : null;
}

export function cardOf(input: {
  question: string;
  headline?: string;
  recommendation: { option: string; why: string; confidence: Confidence };
  meaning: string;
  checks: readonly string[];
  notVerified: readonly string[];
  cause?: readonly string[];
  whyYou: string;
  facts: readonly string[];
  options: readonly { id: string; label: string; does: string }[];
}): DecisionCard {
  const chosen = input.options.find(o => o.id === input.recommendation.option);
  if (chosen === undefined) throw new Error(`the recommendation names '${input.recommendation.option}', which is no option`);
  return {
    version: 1,
    question: input.question,
    headline: input.headline?.trim() || null,
    recommendation: { option: chosen.id, label: chosen.label, confidence: input.recommendation.confidence, meaning: input.meaning, why: input.recommendation.why },
    checks: input.checks.map(text => ({ text, rate: rateOf(text) })),
    notVerified: [...input.notVerified],
    cause: (input.cause ?? []).map(s => s.trim()).filter(s => s !== '').slice(0, 6),
    whyYou: input.whyYou,
    facts: [...input.facts],
    options: input.options.map(o => ({ id: o.id, label: o.label, does: o.does, recommended: o.id === chosen.id })),
    other: true,
  };
}

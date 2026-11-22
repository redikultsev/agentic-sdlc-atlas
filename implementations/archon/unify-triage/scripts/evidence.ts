/**
 * The evidence check of the Triage verdict (SPEC "Task shape"): every claim carries the raw
 * evidence that decides it, or it is refused. Duplicate, already built and rejected before
 * need a link and the quote; reproduced and refuted need the command and its output (a
 * refutation is a recorded reproduction attempt); a root cause needs file:line. A bug
 * needs a reproduction attempt; every assumption needs its source. Refused claims are not
 * shown to the Operator as facts: the card lists them as not verified.
 *
 * Bound: verdict (the triage agent's output). Emits `{ ok, problems, verdict }`.
 */

import { emit, input, refuse } from 'archon:script';

interface Claim {
  kind: string;
  statement: string;
  link: string | null;
  quote: string | null;
  command: string | null;
  output: string | null;
  file_line: string | null;
}

interface Verdict {
  kind: string;
  claims: Claim[];
  root_cause: { file_line: string; explanation: string }[];
  duplicates: { url: string; quote: string; relation: string }[];
  assumptions: { text: string; source: string }[];
  [key: string]: unknown;
}

const FILE_LINE = /^[^\s:]+:\d+(-\d+)?$/;
const URL = /^https?:\/\/\S+$/;
const has = (s: string | null | undefined): boolean => typeof s === 'string' && s.trim() !== '';

export function problemsOf(v: Verdict): { problems: string[]; kept: Claim[] } {
  const problems: string[] = [];
  const kept: Claim[] = [];
  for (const [i, c] of v.claims.entries()) {
    const linked = has(c.link) && URL.test((c.link ?? '').trim()) && has(c.quote);
    const ran = has(c.command) && has(c.output);
    const located = has(c.file_line) && FILE_LINE.test((c.file_line ?? '').trim());
    let missing: string | null = null;
    if (['duplicate', 'already-built', 'rejected-before'].includes(c.kind) && !linked) missing = 'a link and the quote that decides it';
    else if (['reproduced', 'refuted'].includes(c.kind) && !ran) missing = 'the reproduction command and its output';
    else if (c.kind === 'root-cause' && !located) missing = 'the file:line of the cause';
    else if (c.kind === 'other' && !(linked || ran || located)) missing = 'a link with a quote, a command with its output, or a file:line';
    if (missing === null) kept.push(c);
    else problems.push(`claim ${i + 1} (${c.kind}: "${c.statement.slice(0, 120)}") lacks ${missing}`);
  }
  for (const r of v.root_cause) if (!FILE_LINE.test(r.file_line.trim())) problems.push(`the root cause "${r.file_line}" is not a file:line`);
  for (const d of v.duplicates) if (!URL.test(d.url.trim()) || !has(d.quote)) problems.push(`the related item "${d.url}" lacks a link or a quote`);
  for (const a of v.assumptions) if (!has(a.source)) problems.push(`the assumption "${a.text.slice(0, 120)}" names no source`);
  if (v.kind === 'bug' && !kept.some(c => c.kind === 'reproduced' || c.kind === 'refuted')) {
    problems.push('a bug verdict has no recorded reproduction attempt');
  }
  return { problems, kept };
}

function main(): void {
  const verdict = JSON.parse(input('verdict')) as Verdict;
  const { problems, kept } = problemsOf(verdict);
  emit({ ok: problems.length === 0, problems, verdict: { ...verdict, claims: kept } });
}

try {
  main();
} catch (error) {
  refuse(`unify-triage evidence: ${error instanceof Error ? error.message : String(error)}`);
}

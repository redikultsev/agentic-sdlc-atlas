/**
 * The pipeline's workflows as code. Two to start: triage with the Accept gate, and delivery
 * across every repository of an item with review rounds, a shared limit of 3 and the merge
 * gate (decisions 15, 22, 37). The roles name their skills and models; prompts are short
 * here and grow into the pack's command files as the platform takes over from Archon.
 */

import { cardOf, type Confidence, type DecisionCard } from '../../archon/.shared/card.ts';
import { END, fail, type StepContext, type Workflow } from './engine.ts';
import type { RoleSpec } from './runner.ts';

const MEANING: Record<Confidence, string> = {
  high: 'every claim behind it was run or read',
  medium: 'the main claim has evidence; the gaps are listed',
  low: 'a reading, not yet backed; check before you accept',
};

export const ROLES = {
  triage: {
    name: 'triage',
    prompt:
      'Triage this request: reproduce it if it is a bug, find the root cause, propose size S/M/L, risk R0/R1/R2 and an outcome. Change nothing.\n\n{input}\n\n' +
      'Verdict fields: kind, size, risk, outcome (accept | for-human | wont-do), reason, confidence (low | medium | high), headline, checks (strings with counts), not_checked (first person), cause_chain (short steps), facts.',
    skills: ['unify-root-cause', 'unify-reproduce'],
    model: 'sonnet',
    timeoutMs: 30 * 60_000,
    budgetUsd: 3,
  },
  implementer: {
    name: 'implementer',
    prompt: 'Implement the accepted item in this repository, tests first, on its branch. Push nothing to protected branches.\n\n{input}\n\nVerdict fields: status (done | failed | nothing-here), branch, summary.',
    skills: ['unify-root-cause', 'unify-reproduce'],
    model: 'opus',
    timeoutMs: 60 * 60_000,
    budgetUsd: 10,
  },
  review: {
    name: 'review',
    prompt: 'Review the change of this item across its repositories. Judge only the change.\n\n{input}\n\nVerdict fields: verdict (pass | fix | block), findings (strings), summary.',
    skills: ['unify-root-cause'],
    // Another model than the Implementer's (decision 22); another family once a second runner exists.
    model: 'sonnet',
    timeoutMs: 30 * 60_000,
    budgetUsd: 5,
  },
} satisfies Record<string, RoleSpec>;

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

function requestText(ctx: StepContext): string {
  const repos = ctx.item.repos.map(r => `- ${r.name} (base ${r.base})`).join('\n');
  return `Item ${ctx.item.key}: ${ctx.item.title}\n\n<untrusted source="request">\n${ctx.item.body}\n</untrusted>\n\nRepositories:\n${repos}`;
}

function triageCheck(v: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (!['S', 'M', 'L'].includes(str(v.size))) problems.push('size is not S, M or L');
  if (!['R0', 'R1', 'R2'].includes(str(v.risk))) problems.push('risk is not R0, R1 or R2');
  if (!['accept', 'for-human', 'wont-do'].includes(str(v.outcome))) problems.push('outcome is not accept, for-human or wont-do');
  if (!['low', 'medium', 'high'].includes(str(v.confidence))) problems.push('confidence is not low, medium or high');
  if (str(v.reason).trim() === '') problems.push('no reason');
  return problems;
}

export function acceptCard(ctx: StepContext): DecisionCard {
  const v = (ctx.data.triage as { verdict: Record<string, unknown> }).verdict;
  const size = str(v.size);
  const risk = str(v.risk);
  const outcome = str(v.outcome);
  const confidence = str(v.confidence) as Confidence;
  return cardOf({
    question: `${ctx.item.key}: accept this ${str(v.kind, 'item')} as ${size}, ${risk}?`,
    headline: str(v.headline) || undefined,
    recommendation: { option: outcome === 'accept' ? 'accept' : outcome, why: str(v.reason), confidence },
    meaning: MEANING[confidence],
    checks: strs(v.checks).slice(0, 3),
    notVerified: strs(v.not_checked),
    cause: strs(v.cause_chain),
    whyYou: 'Every item passes your Accept before any spec or code is written. Size and risk are the agent\'s reading: answer "other" with yours and triage runs again with your words.',
    facts: [`Kind ${str(v.kind)}, size ${size}, risk ${risk}.`, ...strs(v.facts), `Repositories: ${ctx.item.repos.map(r => r.name).join(', ')}.`],
    options: [
      { id: 'accept', label: `Accept as ${size}, ${risk}`, does: `Starts delivery in ${ctx.item.repos.length} repositor${ctx.item.repos.length === 1 ? 'y' : 'ies'}, a branch and PR in each.` },
      { id: 'for-human', label: 'For a human', does: 'Hands it to a person; the pipeline only tracks it.' },
      { id: 'wont-do', label: "Won't do", does: 'Closes it as not planned, with the reason.' },
    ],
  });
}

export const triage: Workflow = {
  name: 'triage',
  steps: [
    { kind: 'agent', id: 'triage', role: ROLES.triage, input: ctx => requestText(ctx) + correction(ctx), check: triageCheck, next: () => 'accept' },
    {
      kind: 'gate',
      id: 'accept',
      card: acceptCard,
      // "other" is a ruling: triage runs again with the Operator's words.
      next: answer => (answer.option === 'other' ? 'triage' : END),
    },
  ],
};

function correction(ctx: StepContext): string {
  const prev = ctx.data.accept as { option: string; text: string } | undefined;
  return prev?.option === 'other' ? `\n\nThe Operator's ruling on your last verdict (follow it): ${prev.text}` : '';
}

export const MAX_ROUNDS = 3;

function rounds(ctx: StepContext): number {
  return typeof ctx.data.rounds === 'number' ? ctx.data.rounds : 0;
}

export const deliver: Workflow = {
  name: 'deliver',
  steps: [
    {
      kind: 'each-repo',
      id: 'implement',
      role: ROLES.implementer,
      input: (ctx, repo) => `${requestText(ctx)}\n\nThis session: repository ${repo.name}, branch pipeline/${ctx.item.key}.${findings(ctx)}`,
      next: verdicts => (Object.values(verdicts).some(v => str(v.status) === 'failed') ? fail('an Implementer session failed') : 'review'),
    },
    { kind: 'agent', id: 'review', role: ROLES.review, input: ctx => `${requestText(ctx)}\n\nThe change per repository:\n${JSON.stringify((ctx.data.implement as { verdicts: unknown }).verdicts, null, 2)}`, next: () => 'route' },
    {
      kind: 'script',
      id: 'route',
      run: ctx => {
        const verdict = str((ctx.data.review as { verdict: Record<string, unknown> }).verdict.verdict);
        return { verdict, round: rounds(ctx) + 1 };
      },
      next: out => {
        const { verdict, round } = out as { verdict: string; round: number };
        if (verdict === 'pass') return 'merge';
        if (verdict === 'fix' && round < MAX_ROUNDS) return 'rounds';
        return 'blocked';
      },
    },
    { kind: 'script', id: 'rounds', run: ctx => rounds(ctx) + 1, next: () => 'implement' },
    {
      kind: 'gate',
      id: 'merge',
      card: ctx => cardOf({
        question: `${ctx.item.key}: merge the change in ${ctx.item.repos.length} repositories?`,
        recommendation: { option: 'merge', why: str((ctx.data.review as { verdict: Record<string, unknown> }).verdict.summary), confidence: 'medium' },
        meaning: MEANING.medium,
        checks: [],
        notVerified: [],
        whyYou: 'Merging is yours unless the auto-merge rules cover the change.',
        facts: Object.entries((ctx.data.implement as { verdicts: Record<string, Record<string, unknown>> }).verdicts).map(([repo, v]) => `${repo}: ${str(v.summary)}`),
        options: [
          { id: 'merge', label: 'Merge all', does: 'Merges the PR in every repository, in the order given.' },
          { id: 'changes', label: 'Ask for changes', does: 'Sends the item back for one more round with your words.' },
        ],
      }),
      next: answer => (answer.option === 'merge' ? END : 'rounds'),
    },
    {
      kind: 'gate',
      id: 'blocked',
      card: ctx => cardOf({
        question: `${ctx.item.key} is blocked after ${rounds(ctx) + 1} round(s). What now?`,
        recommendation: { option: 'one-more', why: 'The reviewer still asks for changes.', confidence: 'low' },
        meaning: MEANING.low,
        checks: [],
        notVerified: [],
        whyYou: `All fix rounds of an item share one limit of ${MAX_ROUNDS}.`,
        facts: strs((ctx.data.review as { verdict: Record<string, unknown> }).verdict.findings),
        options: [
          { id: 'one-more', label: 'One more round', does: 'Runs the Implementer again with the findings.' },
          { id: 'cancel', label: 'Cancel', does: 'Stops the item.' },
        ],
      }),
      next: answer => (answer.option === 'one-more' ? 'rounds' : END),
    },
  ],
};

function findings(ctx: StepContext): string {
  const review = ctx.data.review as { verdict: Record<string, unknown> } | undefined;
  const list = review ? strs(review.verdict.findings) : [];
  return list.length > 0 ? `\n\nFix these findings of the last review:\n${list.map(f => `- ${f}`).join('\n')}` : '';
}

export const WORKFLOWS = [triage, deliver];

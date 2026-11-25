/**
 * The decision card as data (decision 68): built from the same request as the text, rates
 * read from the checks, written beside the case markdown, and the sample the renderer uses
 * stays a valid card.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fake } from './archon-script.stub.ts';
import { cardOf, type DecisionCard, rateOf } from '../.shared/card.ts';
import { buildRequest, type Option } from '../.shared/request.ts';

const OPTIONS: Option[] = [
  { id: 'accept', label: 'Accept as M, R1', does: 'Moves the item to Specifying.', effect: 'accept' },
  { id: 'wont-do', label: "Won't do", does: 'Closes the item.', effect: 'wont-do' },
];

let dir = '';
beforeEach(() => {
  fake.reset();
  dir = mkdtempSync(join(tmpdir(), 'card-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('rates', () => {
  test('the first count in a check, in English or Russian, within 20 runs', () => {
    expect(rateOf('flight in 3 of 3 runs')).toEqual({ hits: 3, runs: 3 });
    expect(rateOf('в 2 из 3 прогонов')).toEqual({ hits: 2, runs: 3 });
    expect(rateOf('0/3 runs')).toEqual({ hits: 0, runs: 3 });
    expect(rateOf('5 of 3')).toBeNull();
    expect(rateOf('40 of 60 closures')).toBeNull();
    expect(rateOf('no count here')).toBeNull();
  });
});

describe('the card', () => {
  test('carries the recommendation label, marks the recommended option, keeps six cause steps at most', () => {
    const card = cardOf({
      question: 'Q?',
      recommendation: { option: 'accept', why: 'because', confidence: 'high' },
      meaning: 'every claim was run',
      checks: ['3 of 3'],
      notVerified: [],
      cause: ['a', ' ', 'b', 'c', 'd', 'e', 'f', 'g'],
      whyYou: 'you decide',
      facts: [],
      options: OPTIONS,
    });
    expect(card.recommendation.label).toBe('Accept as M, R1');
    expect(card.options.map(o => o.recommended)).toEqual([true, false]);
    expect(card.cause).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(card.checks[0].rate).toEqual({ hits: 3, runs: 3 });
    expect(() => cardOf({ ...card, recommendation: { option: 'merge', why: '', confidence: 'low' }, meaning: '', checks: [], whyYou: '', options: OPTIONS })).toThrow("names 'merge'");
  });

  test('a request with a case writes the card beside the markdown, with the same blocks', () => {
    fake.artifacts = dir;
    buildRequest(
      { decide: 'PROJ-1: accept?', headline: 'H', why: 'w', check: ['2 of 3 runs'], notVerified: ['I did not x.'], cause: ['in', 'out'], facts: ['f'], case: 'triage-PROJ-1' },
      OPTIONS,
      { option: 'accept', why: 'r', confidence: 'medium' }
    );
    const card = JSON.parse(readFileSync(join(dir, 'triage-PROJ-1.card.json'), 'utf8')) as DecisionCard;
    expect(card).toMatchObject({ version: 1, question: 'PROJ-1: accept?', headline: 'H', notVerified: ['I did not x.'], cause: ['in', 'out'], facts: ['f'], other: true });
    expect(card.checks[0].rate).toEqual({ hits: 2, runs: 3 });
    expect(readFileSync(join(dir, 'triage-PROJ-1.md'), 'utf8')).toContain('## The cause\n\nin → out');
  });

  test("the renderer's sample is a valid card", () => {
    const sample = JSON.parse(readFileSync(join(import.meta.dir, '..', 'decision-ui', 'sample.card.json'), 'utf8')) as DecisionCard;
    const rebuilt = cardOf({
      question: sample.question,
      headline: sample.headline ?? undefined,
      recommendation: sample.recommendation,
      meaning: sample.recommendation.meaning,
      checks: sample.checks.map(c => c.text),
      notVerified: sample.notVerified,
      cause: sample.cause,
      whyYou: sample.whyYou,
      facts: sample.facts,
      options: sample.options,
    });
    expect(rebuilt).toEqual(sample);
  });
});

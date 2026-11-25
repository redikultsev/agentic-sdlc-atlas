/**
 * The decision request's presentation (decision 38, revised 2026-11-25): the question and
 * what it is about, the recommendation with what its confidence means, what the Operator can
 * check in seconds, what was not verified, why it came to the Operator, then the facts or
 * the case file in the run's artifacts.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fake } from './archon-script.stub.ts';
import { buildRequest, CONFIDENCE, type Option, type RequestText } from '../.shared/request.ts';

const OPTIONS: Option[] = [
  { id: 'accept', label: 'Accept as M, R1', does: 'Moves the item to Specifying.', effect: 'accept' },
  { id: 'wont-do', label: "Won't do", does: 'Closes the item as not planned.', effect: 'wont-do' },
];
const TEXT: RequestText = {
  decide: 'PROJ-1: accept this bug as M, R1?',
  headline: 'A cover phrase adds a false flight request.',
  why: 'every item passes your Accept.',
  check: ['Flight in 3 of 3 runs', 'Control: 0 of 3', 'Third', 'Fourth is dropped'],
  notVerified: ['I did not see which call returns it.'],
  facts: ['Kind: bug.', 'Root cause at a.py:1.'],
};
const REC = { option: 'accept', why: 'The cause is the split input.', confidence: 'medium' as const };

let dir = '';
beforeEach(() => {
  fake.reset();
  dir = mkdtempSync(join(tmpdir(), 'artifacts-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('the message', () => {
  test('blocks in order: question, headline, recommendation, check, not verified, why, facts', () => {
    const q = buildRequest(TEXT, OPTIONS, REC).question;
    const at = (s: string) => q.indexOf(s);
    expect(q.startsWith('PROJ-1: accept this bug as M, R1?\nA cover phrase adds a false flight request.\n')).toBe(true);
    expect(at('Recommended: Accept as M, R1.')).toBeGreaterThan(0);
    expect(q).toContain(`Confidence medium: ${CONFIDENCE.medium}.`);
    expect(at('Recommended:')).toBeLessThan(at('Check it yourself:'));
    expect(at('Check it yourself:')).toBeLessThan(at('Not verified:'));
    expect(at('Not verified:')).toBeLessThan(at('Why this came to you:'));
    expect(at('Why this came to you:')).toBeLessThan(at('Facts:'));
    expect(q).toContain('  • Third');
    expect(q).not.toContain('Fourth is dropped');
    expect(q).not.toContain('\n- ');
  });

  test('with a case file, the facts go to the artifacts and the message names the file', () => {
    fake.artifacts = dir;
    const q = buildRequest({ ...TEXT, case: 'triage-PROJ-1' }, OPTIONS, REC).question;
    expect(q).toContain("the run's Artifacts tab, triage-PROJ-1.md");
    expect(q).not.toContain('Facts:');
    const md = readFileSync(join(dir, 'triage-PROJ-1.md'), 'utf8');
    expect(md.startsWith('# PROJ-1: accept this bug as M, R1?')).toBe(true);
    expect(md).toContain('## Not verified\n\n- I did not see which call returns it.');
    expect(md).toContain('## Facts\n\n- Kind: bug.');
    expect(md).toContain('| Accept as M, R1 (recommended) | Moves the item to Specifying. |');
  });

  test('without an artifacts directory the facts stay in the message', () => {
    const q = buildRequest({ ...TEXT, case: 'triage-PROJ-1' }, OPTIONS, REC).question;
    expect(q).toContain('Facts:\n  • Kind: bug.');
    expect(existsSync(join(dir, 'triage-PROJ-1.md'))).toBe(false);
  });

  test('a recommendation naming no option still throws', () => {
    expect(() => buildRequest(TEXT, OPTIONS, { ...REC, option: 'merge' })).toThrow("names 'merge'");
  });
});

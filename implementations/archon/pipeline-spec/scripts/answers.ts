/**
 * The Operator's answer to the Interviewer's business questions is a ruling: written on
 * the item, dated, and handed to every spec round. No questions, no answer: empty.
 *
 * Inputs: repo_host, repo_path, number; bound text (the ask's answer, empty when skipped).
 * Emits `{ text }`.
 */

import { emit, input, refuse } from 'archon:script';
import { runInputs } from '../../.shared/repo.ts';
import { recordRuling } from '../../.shared/rulings.ts';

function main(): void {
  const { repo, number } = runInputs();
  if (number === undefined) return;
  const text = input('text').trim();
  if (text !== '') recordRuling({ repo, number }, { gate: 'questions', decision: 'answered', text, project: false });
  emit({ text });
}

try {
  main();
} catch (error) {
  refuse(`pipeline-spec answers: ${error instanceof Error ? error.message : String(error)}`);
}

/**
 * The Operator's answer to the Interviewer's business questions is a ruling: written on
 * the item, dated, and handed to every spec round. No questions, no answer: empty.
 *
 * Inputs: repo_host, repo_path, number; bound text (the ask's answer, empty when skipped).
 * Emits `{ text }`.
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { recordRuling } from '../../.shared/rulings.ts';

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const text = input('text').trim();
  if (text !== '') await recordRuling(key, { gate: 'questions', decision: 'answered', text, project: false });
  emit({ text });
}

await script('unify-spec answers', main);

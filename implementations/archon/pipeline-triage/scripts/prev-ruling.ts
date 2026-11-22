/**
 * Start of a triage round. When the Operator answered the previous round's Accept card
 * with `other` (a corrected size or risk, or what triage missed), that text is a ruling:
 * it is written on the item, dated, and handed to this round's Triage agent.
 *
 * Inputs: repo_host, repo_path, number; bound prev_decision and prev_text (the previous
 * round's answer, empty in the first round). Emits `{ correction }`.
 */

import { emit, input, refuse } from 'archon:script';
import { runInputs } from '../../.shared/repo.ts';
import { recordRuling } from '../../.shared/rulings.ts';
import { digest } from '../../.shared/trust.ts';

function main(): void {
  const { repo, number } = runInputs();
  if (number === undefined) return;
  const decision = input('prev_decision').trim();
  const text = input('prev_text').trim();
  if (decision !== 'other' || text === '') {
    emit({ correction: '' });
    return;
  }
  recordRuling({ repo, number }, { gate: `accept-${digest(text).slice(0, 8)}`, decision: 'other', text, project: false });
  emit({ correction: text });
}

try {
  main();
} catch (error) {
  refuse(`pipeline-triage prev-ruling: ${error instanceof Error ? error.message : String(error)}`);
}

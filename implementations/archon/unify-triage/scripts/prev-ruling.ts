/**
 * Start of a triage round. When the Operator answered the previous round's Accept card
 * with `other` (a corrected size or risk, or what triage missed), that text is a ruling:
 * it is written on the item, dated, and handed to this round's Triage agent.
 *
 * Inputs: repo_host, repo_path, number; bound prev_decision and prev_text (the previous
 * round's answer, empty in the first round). Emits `{ correction }`.
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { recordRuling } from '../../.shared/rulings.ts';
import { digest } from '../../.shared/trust.ts';

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const decision = input('prev_decision').trim();
  const text = input('prev_text').trim();
  if (decision !== 'other' || text === '') {
    emit({ correction: '' });
    return;
  }
  await recordRuling(key, { gate: `accept-${digest(text).slice(0, 8)}`, decision: 'other', text, project: false });
  emit({ correction: text });
}

await script('unify-triage prev-ruling', main);

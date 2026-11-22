/**
 * What the Interviewer reads besides the code: the request and trusted comments
 * (rulings included) as marked data, the project's rulings, and the size and risk Accept
 * gave the item.
 *
 * Inputs: repo_host, repo_path, number, base, pipeline_login. Emits `{ context, size }`.
 */

import { emit, forge, input, refuse } from 'archon:script';
import { selfLogin } from '../../.shared/github.ts';
import { trustedAuthors } from '../../.shared/policy.ts';
import { runInputs } from '../../.shared/repo.ts';
import { itemContext } from '../../.shared/stage.ts';

function main(): void {
  const { repo, number } = runInputs();
  if (number === undefined) return;
  const ref = { repo, number };
  const labels = forge('workitem.view', { ref }).labels ?? [];
  const size = (labels.find(l => l.startsWith('size:')) ?? 'size:m').slice(5).toUpperCase();
  const risk = (labels.find(l => l.startsWith('risk:')) ?? 'risk:r1').slice(5).toUpperCase();
  const context = [
    `Accepted at triage as size ${size}, risk ${risk}.`,
    itemContext(ref, trustedAuthors(input('base') || 'main'), input('pipeline_login') || selfLogin()),
  ].join('\n\n');
  emit({ context, size });
}

try {
  main();
} catch (error) {
  refuse(`unify-spec gather: ${error instanceof Error ? error.message : String(error)}`);
}

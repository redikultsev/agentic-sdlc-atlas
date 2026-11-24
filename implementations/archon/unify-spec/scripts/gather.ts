/**
 * What the Interviewer reads besides the code: the request and trusted comments
 * (rulings included) as marked data, the project's rulings, and the size and risk Accept
 * gave the item.
 *
 * Inputs: repo_host, repo_path, number, base, pipeline_login. Emits `{ context, size }`.
 */

import { emit, input } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { selfLogin } from '../../.shared/github.ts';
import { trustedAuthors } from '../../.shared/policy.ts';
import { runInputs } from '../../.shared/repo.ts';
import { itemContext } from '../../.shared/stage.ts';

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const { labels } = await tracker().view(key);
  const size = (labels.find(l => l.startsWith('size:')) ?? 'size:m').slice(5).toUpperCase();
  const risk = (labels.find(l => l.startsWith('risk:')) ?? 'risk:r1').slice(5).toUpperCase();
  const context = [
    `Accepted at triage as size ${size}, risk ${risk}.`,
    await itemContext(key, trustedAuthors(input('base') || 'main'), input('pipeline_login') || selfLogin()),
  ].join('\n\n');
  emit({ context, size });
}

await script('unify-spec gather', main);

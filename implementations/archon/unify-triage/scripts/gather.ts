/**
 * What the Triage agent reads besides the code: the request and trusted comments as
 * marked data, the project's rulings, PRs that mention the item (open and merged), and
 * the rejected-requests register (items labelled `pipeline:rejected`).
 *
 * Inputs: repo_host, repo_path, number, base, pipeline_login. Emits `{ context }`.
 */

import { emit, input } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { prsMentioning, selfLogin } from '../../.shared/github.ts';
import { trustedAuthors } from '../../.shared/policy.ts';
import { runInputs } from '../../.shared/repo.ts';
import { MARKS } from '../../.shared/states.ts';
import { untrusted } from '../../.shared/trust.ts';
import { itemContext } from '../../.shared/stage.ts';

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  if (key === undefined) return;
  const t = tracker();
  const trusted = trustedAuthors(input('base') || 'main');
  const login = input('pipeline_login') || selfLogin();
  const prs = prsMentioning(repo, key);
  const rejected = t.has('list') ? (await t.list(MARKS.rejected)).filter(i => i.key !== key).slice(0, 30) : [];
  const context = [
    await itemContext(key, trusted, login),
    prs.length === 0
      ? 'No PR mentions this item.'
      : ['PRs that mention this item:', ...prs.map(p => `- ${p.url} (${p.merged ? 'merged' : p.state}) ${untrusted(`PR #${p.number} title`, p.title)}`)].join('\n'),
    rejected.length === 0
      ? 'The rejected-requests register is empty.'
      : ['Rejected requests (closed, labelled pipeline:rejected); read the ones that may match:', ...rejected.map(i => `- ${t.url(i.key)}`)].join('\n'),
  ].join('\n\n');
  emit({ context });
}

await script('unify-triage gather', main);

/**
 * What the Triage agent reads besides the code: the request and trusted comments as
 * marked data, the project's rulings, PRs that mention the issue (open and merged), and
 * the rejected-requests register (closed issues labelled `pipeline:rejected`).
 *
 * Inputs: repo_host, repo_path, number, base, pipeline_login. Emits `{ context }`.
 */

import { emit, forge, input, refuse } from 'archon:script';
import { prsMentioning, selfLogin } from '../../.shared/github.ts';
import { trustedAuthors } from '../../.shared/policy.ts';
import { runInputs } from '../../.shared/repo.ts';
import { MARKS } from '../../.shared/states.ts';
import { untrusted } from '../../.shared/trust.ts';
import { itemContext } from '../../.shared/stage.ts';

function main(): void {
  const { repo, number } = runInputs();
  if (number === undefined) return;
  const ref = { repo, number };
  const trusted = trustedAuthors(input('base') || 'main');
  const login = input('pipeline_login') || selfLogin();
  const prs = prsMentioning(ref);
  const rejected = forge('workitem.list', { repo, label: MARKS.rejected }).items.filter(i => i.kind === 'issue' && i.ref.number !== number).slice(0, 30);
  const context = [
    itemContext(ref, trusted, login),
    prs.length === 0
      ? 'No PR mentions this issue.'
      : ['PRs that mention this issue:', ...prs.map(p => `- ${p.url} (${p.merged ? 'merged' : p.state}) ${untrusted(`PR #${p.number} title`, p.title)}`)].join('\n'),
    rejected.length === 0
      ? 'The rejected-requests register is empty.'
      : ['Rejected requests (closed, labelled pipeline:rejected); read the ones that may match:', ...rejected.map(i => `- ${i.url}`)].join('\n'),
  ].join('\n\n');
  emit({ context });
}

try {
  main();
} catch (error) {
  refuse(`unify-triage gather: ${error instanceof Error ? error.message : String(error)}`);
}

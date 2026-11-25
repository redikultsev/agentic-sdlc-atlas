/**
 * What the daily pass judges (decision 60): every finding in the buffer, oldest first, and
 * what a finding may already be covered by: the open items (work in progress, waiting
 * requests, earlier requests from this pass) and the register of rejected requests, both
 * listed through the connector. Agents wrote the findings and people wrote the titles, so
 * both reach the agent as marked data. An empty buffer ends the run here.
 *
 * Inputs: repo_host, repo_path. Emits `{ has, count, ids, context }`.
 */

import { emit, input } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { buffered } from '../../.shared/findings.ts';
import { repoOf } from '../../.shared/repo.ts';
import { MARKS } from '../../.shared/states.ts';
import { untrusted } from '../../.shared/trust.ts';

/** Open items shown to the agent, the newest ones. */
const OPEN_SHOWN = 200;

async function main(): Promise<void> {
  repoOf(input('repo_host'), input('repo_path'));
  const findings = buffered();
  if (findings.length === 0) {
    emit({ has: false, count: 0, ids: [], context: '' });
    return;
  }
  const t = tracker();
  const line = (i: { key: string; title: string; labels: readonly string[] }) => `- ${i.key} [${i.labels.join(', ')}] ${i.title}`;
  let open: string;
  let rejected: string;
  if (t.has('list')) {
    const items = await t.list(null);
    const shown = items.slice(-OPEN_SHOWN);
    open = items.length === 0 ? 'The tracker lists no open item.' : untrusted('item titles', shown.map(line).join('\n'));
    if (items.length > shown.length) open = `The newest ${shown.length} of ${items.length} open items:\n\n${open}`;
    const register = await t.list(MARKS.rejected);
    rejected = register.length === 0 ? 'The tracker lists no rejected request.' : untrusted('item titles', register.map(line).join('\n'));
  } else {
    open = 'The project\'s tracker map has no list operation: no open item can be shown, so drop nothing as in work.';
    rejected = 'The project\'s tracker map has no list operation: drop nothing as rejected.';
  }
  const context = [
    `## The findings buffer: ${findings.length} finding(s), oldest first`,
    '',
    untrusted('findings buffer', JSON.stringify(findings, null, 1)),
    '',
    '## Open items: key, labels, title',
    '',
    open,
    '',
    `## The register of rejected requests (items labelled ${MARKS.rejected})`,
    '',
    rejected,
  ].join('\n');
  emit({ has: true, count: findings.length, ids: findings.map(f => f.id), context });
}

await script('unify-findings gather', main);

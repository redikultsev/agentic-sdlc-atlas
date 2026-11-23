/**
 * The label and `work/<n>` disagree with a deploy (see reconcile): nothing deploys, and
 * the item is put in front of the Operator in the tracker, a comment with the reason and
 * the label `pipeline:needs-attention`. The comment's marker makes a retry write it once.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST, INPUTS_REPO_PATH, INPUTS_NUMBER;
 * INPUTS_REASON from reconcile.
 */

import { emit, input, refuse, runId } from 'archon:script';
import { forge } from '../../.shared/forge.ts';
import { itemNumber, repoOf } from '../../.shared/repo.ts';

const NEEDS_ATTENTION = 'pipeline:needs-attention';

function main(): void {
  const repo = repoOf(input('repo_host'), input('repo_path'));
  const number = itemNumber(input('number'));
  if (number === undefined) return;
  const reason = input('reason').trim();
  const subject = { kind: 'issue' as const, ref: { repo, number } };
  forge('workitem.comment.upsert', {
    subject,
    marker: `unify-deploy-stopped:${runId()}`,
    body: [
      '**Deploy not started**',
      '',
      `Why you: the item's label and its pipeline record disagree with a deploy, and the pipeline does not overwrite either. ${reason}`,
      '',
      'Set the label to the state the item is really in; the next revisit pass or merge picks it up.',
    ].join('\n'),
  });
  forge('workitem.label.add', { subject, name: NEEDS_ATTENTION });
  emit({ ok: false, summary: `#${String(number)}: deploy not started (${reason})` });
}

try {
  main();
} catch (error) {
  refuse(`unify-deploy flag: ${error instanceof Error ? error.message : String(error)}`);
}

/**
 * The label and `work/<key>` disagree with a deploy (see cut): nothing deploys, and
 * the item is put in front of the Operator in the tracker, a comment with the reason and
 * the label `pipeline:needs-attention`. The comment's marker makes a retry write it once.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST, INPUTS_REPO_PATH, INPUTS_NUMBER;
 * INPUTS_WHY from cut.
 */

import { emit, input, runId } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';

const NEEDS_ATTENTION = 'pipeline:needs-attention';

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const reason = input('why').trim();
  await tracker().comment(
    key,
    `unify-deploy-stopped:${runId()}`,
    [
      '**Deploy not started**',
      '',
      `Why you: the item's label and its pipeline record disagree with a deploy, and the pipeline does not overwrite either. ${reason}`,
      '',
      'Set the label to the state the item is really in; the next revisit pass or merge picks it up.',
    ].join('\n')
  );
  await tracker().label(key, { add: [NEEDS_ATTENTION] });
  emit({ ok: false, summary: `${key}: deploy not started (${reason})` });
}

await script('unify-deploy flag', main);

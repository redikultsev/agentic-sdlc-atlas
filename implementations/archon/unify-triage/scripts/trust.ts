/**
 * Whether the request may reach an agent (decision 39). A trusted author's request goes
 * on. Anyone else's waits for `pipeline:approved`: the first time the label is seen, set
 * by a trusted author or the pipeline's account, this script pins the approval to the
 * body's digest with an approval marker comment; a later run goes on only while the body
 * still has that digest. A body edited after approval loses the label, gets a comment and
 * `pipeline:needs-approval`, and the run ends; so does a request nobody approved yet. The
 * author is the item's creator (decision 47: on Jira the creator, never the reporter).
 *
 * Inputs: repo_host, repo_path, number, base, pipeline_login. Emits `{ proceed, author, reason }`.
 */

import { emit, input } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { selfLogin } from '../../.shared/github.ts';
import { trustedAuthors } from '../../.shared/policy.ts';
import { runInputs } from '../../.shared/repo.ts';
import { MARKS } from '../../.shared/states.ts';
import { APPROVAL_MARKER, digest, isTrusted, pinnedDigest } from '../../.shared/trust.ts';

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const t = tracker();
  const trusted = trustedAuthors(input('base') || 'main');
  const pipelineLogin = (input('pipeline_login') || selfLogin()).toLowerCase();
  const view = await t.view(key);
  const author = view.creator?.login ?? '';
  const labels = view.labels;
  const body = digest(view.body);
  const allow = async (): Promise<void> => {
    await t.label(key, { remove: [MARKS.needsApproval] });
  };
  const hold = async (reason: string, comment: string): Promise<void> => {
    await t.label(key, { add: [MARKS.needsApproval] });
    await t.comment(key, `pipeline-needs-approval:${body}`, comment);
    emit({ proceed: false, author, reason });
  };

  if (isTrusted(author, trusted)) {
    await allow();
    emit({ proceed: true, author, reason: `\`${author}\` is a trusted author` });
    return;
  }
  if (!labels.includes(MARKS.approved)) {
    await hold(
      `\`${author}\` is not a trusted author and nobody approved the request`,
      `This request waits for approval: its author is not on the trusted list. The Operator or a trusted author approves this exact text with the label \`${MARKS.approved}\`; an edit after that withdraws the approval.`
    );
    return;
  }
  const pinned = await pinnedDigest(key, trusted, pipelineLogin);
  if (pinned === body) {
    await allow();
    emit({ proceed: true, author, reason: `the body is the one approved (${body})` });
    return;
  }
  if (pinned !== null) {
    await t.label(key, { remove: [MARKS.approved] });
    await hold(
      `the body changed after approval (approved ${pinned}, now ${body})`,
      `The text of this request changed after it was approved, so the approval is withdrawn. Approve the new text with the label \`${MARKS.approved}\` to send it to triage.`
    );
    return;
  }
  const setter = await t.labelSetBy(key, MARKS.approved);
  if (setter === null || !(isTrusted(setter, trusted) || setter.toLowerCase() === pipelineLogin)) {
    await t.label(key, { remove: [MARKS.approved] });
    await hold(
      `the label ${MARKS.approved} was set by \`${setter ?? 'unknown'}\`, who is not trusted`,
      `The label \`${MARKS.approved}\` counts only when the Operator or a trusted author sets it; it was removed.`
    );
    return;
  }
  await t.comment(
    key,
    `${APPROVAL_MARKER}-pin`,
    `Approved for triage by \`${setter}\` for this exact text. An edit withdraws the approval.\n\n<!-- ${APPROVAL_MARKER}:${body} -->`
  );
  if ((await pinnedDigest(key, trusted, pipelineLogin)) !== body) {
    throw new Error(`the approval comment does not read back: is pipeline_login (${pipelineLogin}) the account this run writes as?`);
  }
  await allow();
  emit({ proceed: true, author, reason: `approved by \`${setter}\`; pinned to ${body}` });
}

await script('unify-triage trust', main);

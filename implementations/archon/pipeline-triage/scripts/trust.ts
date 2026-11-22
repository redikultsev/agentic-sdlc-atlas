/**
 * Whether the request may reach an agent (decision 39). A trusted author's request goes
 * on. Anyone else's waits for `pipeline:approved`: the first time the label is seen, set
 * by a trusted author or the pipeline's account, this script pins the approval to the
 * body's digest with an approval marker comment; a later run goes on only while the body
 * still has that digest. A body edited after approval loses the label, gets a comment and
 * `pipeline:needs-approval`, and the run ends; so does a request nobody approved yet.
 *
 * Inputs: repo_host, repo_path, number, base, pipeline_login. Emits `{ proceed, author, reason }`.
 */

import { emit, forge, input, refuse } from 'archon:script';
import { selfLogin } from '../../.shared/github.ts';
import { trustedAuthors } from '../../.shared/policy.ts';
import { type IssueRef, runInputs } from '../../.shared/repo.ts';
import { MARKS } from '../../.shared/states.ts';
import { APPROVAL_MARKER, digest, isTrusted, pinnedDigest } from '../../.shared/trust.ts';

/** Who last added `label` to the issue, from its events (the forge does not say). */
function labelSetBy(ref: IssueRef, label: string): string | null {
  const r = Bun.spawnSync(['gh', 'api', '--paginate', `repos/${ref.repo.path}/issues/${ref.number}/events?per_page=100`], { stdout: 'pipe', stderr: 'pipe', env: process.env });
  if (r.exitCode !== 0) throw new Error(`gh api issue events failed: ${r.stderr.toString().trim().split('\n')[0] ?? ''}`);
  const text = r.stdout.toString().trim().replace(/\]\s*\[/g, ',');
  const events = (text === '' ? [] : JSON.parse(text)) as { event: string; label?: { name: string }; actor?: { login: string } | null }[];
  const added = events.filter(e => e.event === 'labeled' && e.label?.name === label);
  return added.length === 0 ? null : (added[added.length - 1].actor?.login ?? null);
}

function main(): void {
  const { repo, number } = runInputs();
  if (number === undefined) return;
  const ref = { repo, number };
  const subject = { kind: 'issue' as const, ref };
  const trusted = trustedAuthors(input('base') || 'main');
  const pipelineLogin = (input('pipeline_login') || selfLogin()).toLowerCase();
  const view = forge('workitem.view', { ref });
  const author = view.author?.login ?? '';
  const labels = view.labels ?? [];
  const body = digest(view.body);
  const allow = (): void => {
    if (labels.includes(MARKS.needsApproval)) forge('workitem.label.remove', { subject, name: MARKS.needsApproval });
  };
  const hold = (reason: string, comment: string): void => {
    if (!labels.includes(MARKS.needsApproval)) forge('workitem.label.add', { subject, name: MARKS.needsApproval });
    forge('workitem.comment.upsert', { subject, marker: `pipeline-needs-approval:${body}`, body: comment });
    emit({ proceed: false, author, reason });
  };

  if (isTrusted(author, trusted)) {
    allow();
    emit({ proceed: true, author, reason: `\`${author}\` is a trusted author` });
    return;
  }
  if (!labels.includes(MARKS.approved)) {
    hold(
      `\`${author}\` is not a trusted author and nobody approved the request`,
      `This request waits for approval: its author is not on the trusted list. The Operator or a trusted author approves this exact text with the label \`${MARKS.approved}\`; an edit after that withdraws the approval.`
    );
    return;
  }
  const pinned = pinnedDigest(ref, trusted, pipelineLogin);
  if (pinned === body) {
    allow();
    emit({ proceed: true, author, reason: `the body is the one approved (${body})` });
    return;
  }
  if (pinned !== null) {
    forge('workitem.label.remove', { subject, name: MARKS.approved });
    hold(
      `the body changed after approval (approved ${pinned}, now ${body})`,
      `The text of this request changed after it was approved, so the approval is withdrawn. Approve the new text with the label \`${MARKS.approved}\` to send it to triage.`
    );
    return;
  }
  const setter = labelSetBy(ref, MARKS.approved);
  if (setter === null || !(isTrusted(setter, trusted) || setter.toLowerCase() === pipelineLogin)) {
    forge('workitem.label.remove', { subject, name: MARKS.approved });
    hold(
      `the label ${MARKS.approved} was set by \`${setter ?? 'unknown'}\`, who is not trusted`,
      `The label \`${MARKS.approved}\` counts only when the Operator or a trusted author sets it; it was removed.`
    );
    return;
  }
  forge('workitem.comment.upsert', {
    subject,
    marker: `${APPROVAL_MARKER}-pin`,
    body: `Approved for triage by \`${setter}\` for this exact text. An edit withdraws the approval.\n\n<!-- ${APPROVAL_MARKER}:${body} -->`,
  });
  if (pinnedDigest(ref, trusted, pipelineLogin) !== body) {
    throw new Error(`the approval comment does not read back: is pipeline_login (${pipelineLogin}) the account this run writes as?`);
  }
  allow();
  emit({ proceed: true, author, reason: `approved by \`${setter}\`; pinned to ${body}` });
}

try {
  main();
} catch (error) {
  refuse(`pipeline-triage trust: ${error instanceof Error ? error.message : String(error)}`);
}

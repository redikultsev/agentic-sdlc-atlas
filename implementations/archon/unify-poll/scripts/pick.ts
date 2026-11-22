/**
 * The oldest open issue that is new to the pipeline. New means: no `state:*` label, not
 * rejected, not the rulings register, not a slice, and not waiting for approval unless the
 * Operator or a trusted author has since approved it. An issue this poll already started
 * triage for under the same delivery id is passed over, so one triage run that ended
 * without a label (refused, crashed) does not starve every issue behind it: revisit finds it.
 *
 * Inputs: repo_host, repo_path. Emits `{ found, number, delivery, title, passed }`.
 */

import { emit, forge, input, refuse } from 'archon:script';
import { openIssuesOldestFirst } from '../../.shared/github.ts';
import { repoOf } from '../../.shared/repo.ts';
import { MARKS } from '../../.shared/states.ts';
import { digest } from '../../.shared/trust.ts';
import { readWork } from '../../.shared/work.ts';

/** Marks that say an issue is not a new request. */
const NOT_NEW = [MARKS.rejected, MARKS.rulings, MARKS.slice] as const;

function main(): void {
  const repo = repoOf(input('repo_host'), input('repo_path'));
  let passed = 0;
  for (const issue of openIssuesOldestFirst(repo)) {
    const labels = issue.labels.map(l => l.name);
    if (labels.some(l => l.startsWith('state:'))) continue;
    if (labels.some(l => (NOT_NEW as readonly string[]).includes(l))) continue;
    const approved = labels.includes(MARKS.approved);
    if (labels.includes(MARKS.needsApproval) && !approved) continue;
    // An approval holds for one body text, so a new approval of an edited body is a new start.
    let delivery = `unify-triage:${repo.host}/${repo.path}#${issue.number}`;
    if (approved) {
      const view = forge('workitem.view', { ref: { repo, number: issue.number } });
      delivery += `:approved:${digest(view.body)}`;
    }
    if (readWork(issue.number).doc.flags.includes(`fired:${delivery}`)) {
      passed++;
      continue;
    }
    emit({ found: true, number: issue.number, delivery, title: issue.title, passed });
    return;
  }
  emit({ found: false, number: 0, delivery: '', title: '', passed });
}

try {
  main();
} catch (error) {
  refuse(`unify-poll pick: ${error instanceof Error ? error.message : String(error)}`);
}

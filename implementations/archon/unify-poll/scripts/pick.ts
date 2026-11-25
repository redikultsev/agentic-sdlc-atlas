/**
 * The oldest open item that is new to the pipeline. New means: the engine holds no state
 * for it, no `state:*` label, not rejected, not the rulings register, not a slice, and not
 * waiting for approval unless the Operator or a trusted author has since approved it. With
 * the pack setting `intake_label`, only items carrying that label count at all. An item
 * this poll already started triage for under the same delivery id is passed over, so one
 * triage run that ended without a state (refused, crashed) does not starve every item
 * behind it: revisit finds it. People's requests go first: a request the daily pass made from
 * the findings buffer (`pipeline:discovery`) is taken only when no person's request is new
 * (decision 60); an urgent finding is taken with people's requests, oldest first.
 *
 * Inputs: repo_host, repo_path. Emits `{ found, number, delivery, title, passed }`;
 * `number` is the item key as the workflow input `number` takes it.
 */

import { emit, input } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { peopleFirst } from '../../.shared/findings.ts';
import { issueNumber } from '../../.shared/item.ts';
import { repoOf } from '../../.shared/repo.ts';
import { MARKS } from '../../.shared/states.ts';
import { digest } from '../../.shared/trust.ts';
import { readWork } from '../../.shared/work.ts';

/** Marks that say an item is not a new request. */
const NOT_NEW = [MARKS.rejected, MARKS.rulings, MARKS.slice] as const;

async function main(): Promise<void> {
  const repo = repoOf(input('repo_host'), input('repo_path'));
  const only = (input('intake_label') ?? '').trim();
  let passed = 0;
  for (const item of peopleFirst(await tracker().list(only || null))) {
    const { key, labels } = item;
    if (only !== '' && !labels.includes(only)) continue;
    if (labels.some(l => l.startsWith('state:'))) continue;
    if (labels.some(l => (NOT_NEW as readonly string[]).includes(l))) continue;
    const approved = labels.includes(MARKS.approved);
    if (labels.includes(MARKS.needsApproval) && !approved) continue;
    const { doc } = readWork(key);
    if (doc.state !== null) continue;
    // An approval holds for one body text, so a new approval of an edited body is a new start.
    let delivery = `unify-triage:${repo.host}/${repo.path}${issueNumber(key) === null ? ':' : ''}${key}`;
    if (approved) delivery += `:approved:${digest((await tracker().view(key)).body)}`;
    if (doc.flags.includes(`fired:${delivery}`)) {
      passed++;
      continue;
    }
    emit({ found: true, number: String(issueNumber(key) ?? key), delivery, title: item.title, passed });
    return;
  }
  emit({ found: false, number: '', delivery: '', title: '', passed });
}

await script('unify-poll pick', main);

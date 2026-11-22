/**
 * Blocked items whose cause went away (decision 43): an item labelled `state:blocked`
 * that is "blocked by" an issue which is now closed gets one comment saying so, so the
 * Operator answering its open request knows the cause is gone. Nothing moves: the
 * Operator's answer to the Blocked request does that. The marker names the blocker, so
 * each closed blocker is announced once.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST and INPUTS_REPO_PATH.
 */

import { emit, forge, input, refuse } from 'archon:script';
import { repoOf } from '../../.shared/repo.ts';
import { STATES } from '../../.shared/states.ts';
import { blockedBy, message, openWithLabel } from './lib.ts';

function main(): void {
  const repo = repoOf(input('repo_host'), input('repo_path'));
  const blocked = openWithLabel(repo, STATES.blocked.label);
  const notified: { item: number; blockers: number[] }[] = [];
  const errors: string[] = [];
  for (const number of blocked) {
    try {
      const blockers = blockedBy(repo, number);
      const closed = blockers.filter(b => b.state === 'closed').map(b => b.number);
      if (closed.length === 0) continue;
      const open = blockers.filter(b => b.state !== 'closed').map(b => b.number);
      forge('workitem.comment.upsert', {
        subject: { kind: 'issue', ref: { repo, number } },
        marker: `pipeline-blocker-gone:${String(number)}:${closed.join(',')}`,
        body: [
          `**The cause of Blocked is gone**: ${closed.map(b => `#${String(b)}`).join(', ')} ${closed.length === 1 ? 'is' : 'are'} closed.`,
          '',
          open.length === 0
            ? 'Nothing else blocks this item. Answer its open request to resume it (one more round, or back to plan).'
            : `Still blocked by ${open.map(b => `#${String(b)}`).join(', ')}.`,
        ].join('\n'),
      });
      notified.push({ item: number, blockers: closed });
    } catch (error) {
      errors.push(`#${String(number)}: ${message(error)}`);
    }
  }
  emit({ checked: blocked.length, notified, errors });
}

try {
  main();
} catch (error) {
  refuse(`pipeline-revisit blocked: ${message(error)}`);
}

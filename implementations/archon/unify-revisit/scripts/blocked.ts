/**
 * Blocked items whose cause went away (decision 43): an item the engine holds in Blocked
 * that is "blocked by" an item which is now closed gets one comment saying so, so the
 * Operator answering its open request knows the cause is gone. Nothing moves: the
 * Operator's answer to the Blocked request does that. The marker names the blocker, so
 * each closed blocker is announced once.
 *
 * A tracker whose map has no `blockers` read is counted as unread and said in `errors`.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST and INPUTS_REPO_PATH.
 */

import { emit } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { type ItemKey, keySlug } from '../../.shared/item.ts';
import { message, workItems } from './lib.ts';

/** The items `key` is blocked by, with whether each is open; null where the tracker does not say. */
function blockersOf(key: ItemKey): Promise<{ key: ItemKey; open: boolean }[] | null> {
  return tracker().blockers(key);
}

async function main(): Promise<void> {
  const blocked = workItems().filter(item => item.state === 'blocked');
  const notified: { item: ItemKey; blockers: ItemKey[] }[] = [];
  const errors: string[] = [];
  let unread = 0;
  for (const { key } of blocked) {
    try {
      const blockers = await blockersOf(key);
      if (blockers === null) {
        unread += 1;
        continue;
      }
      const closed = blockers.filter(b => !b.open).map(b => b.key);
      if (closed.length === 0) continue;
      const open = blockers.filter(b => b.open).map(b => b.key);
      await tracker().comment(
        key,
        `pipeline-blocker-gone:${keySlug(key)}:${closed.map(keySlug).join(',')}`,
        [
          `**The cause of Blocked is gone**: ${closed.join(', ')} ${closed.length === 1 ? 'is' : 'are'} closed.`,
          '',
          open.length === 0
            ? 'Nothing else blocks this item. Answer its open request to resume it (one more round, or back to plan).'
            : `Still blocked by ${open.join(', ')}.`,
        ].join('\n')
      );
      notified.push({ item: key, blockers: closed });
    } catch (error) {
      errors.push(`${key}: ${message(error)}`);
    }
  }
  if (unread > 0) errors.push(`blockers of ${String(unread)} Blocked item(s) not read: the tracker map has no blockers read`);
  emit({ checked: blocked.length, notified, errors });
}

await script('unify-revisit blocked', main);

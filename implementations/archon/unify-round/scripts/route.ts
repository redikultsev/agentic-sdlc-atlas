/**
 * Before any implementing: does another PR, open or merged, already do this item
 * (review finding 9)? PRs that mention the item key are found through the GitHub
 * search; the item's own PR and hits the Operator already ruled on are left out. A hit is
 * a request: park, verify the found change instead of building, or continue.
 */

import { emit } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { prsMentioning } from '../../.shared/github.ts';
import { buildRequest, card, NO_CARD, readItem, type Option } from './lib/item.ts';

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  if (key === undefined) return;
  const doc = readItem(key);
  const ruled = new Set(doc.flags.filter(f => f.startsWith('route-ruled:')).map(f => Number(f.split(':')[1])));
  const hits = prsMentioning(repo, key).filter(
    pr => pr.number !== doc.pr && !ruled.has(pr.number) && (pr.state === 'open' || pr.merged)
  );
  if (hits.length === 0) {
    emit({ hits: [], ...NO_CARD });
    return;
  }
  const open = hits.filter(pr => pr.state === 'open');
  const options: Option[] = [
    { id: 'park', label: 'Park the item', does: 'Ends this run; the item keeps its label and nothing is built.', effect: 'park' },
    ...(open.length > 0
      ? [{
          id: 'verify',
          label: `Verify #${open[0].number} instead`,
          does: `Takes PR #${open[0].number} as this item's change: no implementing, only CI, review and acceptance on it.`,
          effect: 'verify',
          extra: { pr: open[0].number },
        }]
      : []),
    { id: 'continue', label: 'Build it anyway', does: 'Records that the hits do not do this item and implements it.', effect: 'continue', extra: { ruled: hits.map(h => h.number) } },
  ];
  const request = buildRequest(
    {
      decide: `${key}: ${hits.length} other PR(s) mention this item. Park, verify one of them, or build it anyway?`,
      why: 'building what an open or merged change already does is wasted rounds, and only you know whether the hit is the same work.',
      notVerified: ['whether the found PRs actually do what this item asks: the search matched the item key only'],
      facts: hits.map(h => `#${h.number} ${h.merged ? 'merged' : h.state}: ${h.title} (${h.url})`),
    },
    options,
    open.length > 0
      ? { option: 'verify', why: 'an open PR naming this item is most often the same work.', confidence: 'low' }
      : { option: 'continue', why: 'a merged PR that mentions the number is often a related change, not this one.', confidence: 'low' }
  );
  emit({ hits: hits.map(h => h.number), ...card(request) });
}

await script('unify-round route', main);

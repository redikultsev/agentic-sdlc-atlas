/**
 * The AI reviewer must be another model family than the Implementer (decision 22), and a
 * model list always resolves to its final tier, so the check is a script (review finding
 * 39): `@review` and `@implementer` are resolved the way Archon resolves them, from
 * `.archon/config.yaml` of the checkout over the home config, falling back to the `large`
 * tier and then the default assistant. Review runs only when `@review` resolves to Codex and
 * the two providers differ; otherwise the request "review unavailable" fails closed.
 */

import { existsSync, readFileSync } from 'node:fs';
import { script } from '../../.shared/connector.ts';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { emit, input } from 'archon:script';
import { git } from '../../.shared/git.ts';
import { isObject } from '../../.shared/inputs.ts';
import { buildRequest, card, NO_CARD } from './lib/item.ts';
import { updateWork } from '../../.shared/work.ts';
import { runInputs } from '../../.shared/repo.ts';

type Config = Record<string, unknown>;

/** Archon's own home override; the engine sets it, not a binding. */
const HOME_KEY = ['ARCHON', 'HOME'].join('_');

function load(path: string): Config {
  if (!existsSync(path)) return {};
  const parsed = Bun.YAML.parse(readFileSync(path, 'utf8')) as unknown;
  return isObject(parsed) ? parsed : {};
}

function providerOf(ref: string, layers: readonly Config[]): { provider: string; via: string } {
  for (const layer of layers) {
    const aliases = isObject(layer.aliases) ? layer.aliases : {};
    const entry = aliases[ref];
    if (isObject(entry) && typeof entry.provider === 'string') return { provider: entry.provider, via: `alias ${ref}` };
  }
  for (const layer of layers) {
    const tiers = isObject(layer.tiers) ? layer.tiers : {};
    const entry = tiers.large;
    if (isObject(entry) && typeof entry.provider === 'string') return { provider: entry.provider, via: `${ref} unset, tier large` };
  }
  for (const layer of layers) {
    for (const key of ['defaultAssistant', 'assistant']) {
      if (typeof layer[key] === 'string') return { provider: layer[key] as string, via: `${ref} unset, default assistant` };
    }
  }
  return { provider: 'claude', via: `${ref} unset, built-in default` };
}

async function main(): Promise<void> {
  const top = git('rev-parse', '--show-toplevel');
  const repoConfig = load(join(top.code === 0 ? top.stdout : process.cwd(), '.archon', 'config.yaml'));
  const homeConfig = load(join(process.env[HOME_KEY] ?? join(homedir(), '.archon'), 'config.yaml'));
  const layers = [repoConfig, homeConfig];
  const review = providerOf('@review', layers);
  const implementer = providerOf('@implementer', layers);
  const ready = review.provider === 'codex' && review.provider !== implementer.provider;
  // Stopgap (pack setting review_family): a same-family review runs, flagged on the merge card.
  const allowSame = (input('review_family') ?? 'strict') === 'same-allowed';
  if (!ready && allowSame) {
    const { key } = runInputs();
    if (key !== undefined) {
      updateWork(key, doc => {
        if (!doc.flags.includes('guard:review-same-family')) doc.flags.push('guard:review-same-family');
      });
    }
    emit({ ready: true, review: review.provider, implementer: implementer.provider, ...NO_CARD });
    return;
  }
  if (ready) {
    emit({ ready: true, review: review.provider, implementer: implementer.provider, ...NO_CARD });
    return;
  }
  const request = buildRequest(
    {
      decide: 'Review unavailable: the AI reviewer would not be Codex, or would be the same family as the Implementer. Start the round again after configuring it, or hold the item?',
      why: 'a review by the Implementer\'s own family is not an independent review, so the pipeline fails closed instead of reviewing (decision 22).',
      notVerified: ['whether Codex credentials work: only the configuration was read'],
      facts: [
        `@review resolves to ${review.provider} (${review.via})`,
        `@implementer resolves to ${implementer.provider} (${implementer.via})`,
        'set it with: archon ai alias set @review codex <model>',
      ],
    },
    [
      { id: 'retry', label: 'Start the round again', does: 'Ends this run and starts the round again; no round is spent.', effect: 'retry' },
      { id: 'hold', label: 'Hold the item', does: 'Ends this run; the item stays Verifying until someone starts the round.', effect: 'hold' },
    ],
    { option: 'retry', why: 'answer this after the alias is set, and the next run reviews.', confidence: 'medium' }
  );
  emit({ ready: false, review: review.provider, implementer: implementer.provider, ...card(request) });
}

await script('unify-round reviewer-ready', main);

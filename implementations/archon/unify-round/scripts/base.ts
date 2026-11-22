/**
 * The full project check at the base commit, before any agent works (review findings 7
 * and 8): a red base is not the PR's failure. Failing test ids are compared with the ids
 * already known in `work/<n>`; the same red base passes on, recorded. New red, or a
 * missing toolchain, is a request: wait for the base, accept the listed ids, or a human.
 */

import { artifactsDir, emit, input } from 'archon:script';
import { projectPolicy } from '../../.shared/policy.ts';
import { gitOrThrow } from '../../.shared/git.ts';
import { buildRequest, card, NO_CARD, readItem, run, updateItem } from './lib/item.ts';
import { runCheckAt } from './lib/check.ts';
import { baseName, fetchBranch, itemRef } from './lib/facts.ts';

run(() => {
  const ref = itemRef(input('repo_host'), input('repo_path'), input('number'));
  const base = baseName(input('base'));
  const policy = projectPolicy(base);
  const commit = fetchBranch(policy.base) ?? gitOrThrow('rev-parse', `origin/${policy.base}`);
  if (policy.check.command.trim() === '') {
    updateItem(ref.number, doc => {
      doc.base = { commit, failing: doc.base?.failing ?? [] };
      if (!doc.flags.includes('no-base-check')) doc.flags.push('no-base-check');
    });
    emit({ go: true, commit, failing: [], fresh: [], ...NO_CARD });
    return;
  }
  const checked = runCheckAt(commit, policy.check.command, policy.check.timeoutMinutes, policy.check.toolchain, artifactsDir());
  const known = new Set(readItem(ref.number).base?.failing ?? []);
  const fresh = checked.failing.filter(id => !known.has(id));
  if (checked.missingTools.length === 0 && fresh.length === 0) {
    updateItem(ref.number, doc => {
      doc.base = { commit, failing: checked.failing };
    });
    emit({ go: true, commit, failing: checked.failing, fresh: [], ...NO_CARD });
    return;
  }
  const short = commit.slice(0, 12);
  const toolless = checked.missingTools.length > 0;
  const request = buildRequest(
    {
      decide: toolless
        ? `#${ref.number}: the toolchain for the check is missing on this host (${checked.missingTools.join(', ')}). Wait, or hand it to a human?`
        : `#${ref.number}: the base ${policy.base} at ${short} is red beyond the known failures. Wait for it, implement with these ids excepted, or a human?`,
      why: 'a red base would be counted as this PR\'s failure, and only you can accept a failure as inherited.',
      notVerified: toolless ? ['whether the check passes at the base: it could not run'] : ['whether the failures are flaky'],
      facts: [
        `check: ${policy.check.command}`,
        ...(toolless ? [] : [`new failing ids: ${fresh.join(', ')}`, `known ids: ${[...known].join(', ') || 'none'}`]),
        ...(checked.tail === '' ? [] : [`last output lines:\n${checked.tail}`]),
      ],
    },
    [
      { id: 'wait', label: 'Wait for the base', does: 'Ends this run; start the round again once the base is green.', effect: 'wait' },
      ...(toolless
        ? []
        : [{ id: 'except', label: 'Except these ids', does: `Records ${fresh.length} id(s) as inherited from the base; CI does not count them against the PR.`, effect: 'except', extra: { ids: checked.failing, commit } }]),
      { id: 'for-human', label: 'For a human', does: 'Moves the item to ForHuman; the pipeline only tracks it from here.', effect: 'for-human' },
    ],
    { option: 'wait', why: 'a base that just went red is usually fixed on the base within hours.', confidence: 'medium' }
  );
  emit({ go: false, commit, failing: checked.failing, fresh, ...card(request) });
});

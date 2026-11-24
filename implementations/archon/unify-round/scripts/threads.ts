/**
 * Open review threads on the PR (decision 35). Every open thread goes to the AI reviewer,
 * which re-checks it like its own finding; text from authors outside `.pipeline/trusted.json`
 * (and the pipeline's own login) is passed only as marked data. Nothing here resolves a thread.
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { forge } from '../../.shared/forge.ts';
import { trustedAuthors } from '../../.shared/policy.ts';
import { isTrusted, untrusted } from '../../.shared/trust.ts';

import { baseName } from './lib/facts.ts';

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  if (key === undefined) return;
  const trusted = [...trustedAuthors(baseName(input('base'))), input('pipeline_login').trim().toLowerCase()].filter(l => l !== '');
  const pr = Number(input('pr'));
  const { threads } = forge('pr.threads', { ref: { repo, number: pr } });
  const open = threads.filter(t => !t.resolved).map(t => {
    const first = t.comments[0];
    const author = first?.author?.login ?? null;
    const trustedAuthor = isTrusted(author, trusted);
    const body = t.comments.map(c => `${c.author?.login ?? 'unknown'}: ${c.body}`).join('\n');
    return {
      id: t.id,
      path: t.path,
      line: t.line,
      author,
      trusted: trustedAuthor,
      outdated: t.outdated,
      text: trustedAuthor ? body : untrusted(`review thread ${t.id} by ${author ?? 'unknown'}`, body),
    };
  });
  const text = open.length === 0
    ? 'No open review threads.'
    : open.map(t => `Thread ${t.id} at ${t.path ?? '(no file)'}:${t.line ?? ''} (${t.trusted ? 'trusted author' : 'untrusted author'}${t.outdated ? ', outdated' : ''})\n${t.text}`).join('\n\n');
  emit({ count: open.length, untrusted: open.filter(t => !t.trusted).length, threads: open, text });
}

await script('unify-round threads', main);

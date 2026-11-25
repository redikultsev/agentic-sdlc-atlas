/**
 * Act on the answer that ended the setup loop (read from the run's node outcomes: the gate
 * is the loop's only sink), by the option's `value.effect`.
 *
 * approve: commit `.pipeline/tracker.yaml` (the map the card showed, carried in the
 * option's value) to `pipeline/setup/<run id>` from the base, without touching the
 * checkout, and open a PR to the base titled "Connect the tracker: project map" whose
 * body says what was probed, what was not and what the tracker lacks, and that it is R2:
 * the Operator merges it (the merge gate treats `.pipeline/**` as never R0). A retry finds
 * the branch and the PR it made. The PR is read back; its body uses no closing keyword.
 * stop, or a redo the loop had no round left for: nothing is committed.
 *
 * Inputs: base; bound host, path (the repo node). Emits `{ effect, pr, url, branch, commit, summary }`.
 */

import { artifactsDir, emit, input, runId } from 'archon:script';
import { MAP_PATH, script } from '../../.shared/connector.ts';
import { forge } from '../../.shared/forge.ts';
import { repoOf } from '../../.shared/repo.ts';
import { chosenEffect, commitFiles, lastAnswer } from '../../.shared/stage.ts';
import { turnsOff } from './lib/ops.ts';

interface Line { op: string; result: 'passed' | 'failed' | 'not-probed'; detail: string }

const TITLE = 'Connect the tracker: project map';
const CLOSING = /\b(close[sd]?|fix(e[sd])?|resolve[sd]?)\b[\s:]+(#\d+|[A-Z][A-Z0-9_]*-\d+|https?:\/\/\S+\/issues\/\d+)/i;

/** Quote a closing keyword in the tracker's words (a test item titled "fixes #3" must not close #3). */
const neutral = (text: string) => text.replace(new RegExp(CLOSING.source, 'gi'), (all, word: string) => all.replace(word, `"${word}"`));

function body(lines: readonly Line[], lacks: readonly string[], base: string): string {
  const group = (result: Line['result']) => lines.filter(l => l.result === result).map(l => `- \`${l.op}\`: ${neutral(l.detail.replace(/\s+/g, ' '))}`);
  const passed = group('passed');
  const failed = group('failed');
  const skipped = group('not-probed');
  return [
    'The project map for the pipeline (decision 46): which MCP tool does each tracker operation the pipeline needs, and where each field of the answer is. Composed by the Setup agent from the project\'s tools, checked by script and probed on one test item.',
    '',
    '**This is R2.** The map is pipeline policy: the merge gate treats `.pipeline/**` as never R0, so the Operator reviews and merges this PR by hand. The pipeline reads the map only from the base branch once merged.',
    '',
    '## Probed and passed',
    ...(passed.length > 0 ? passed : ['- nothing']),
    ...(failed.length > 0 ? ['', '## Failed on the probe (will fail in the pipeline too)', ...failed] : []),
    '',
    '## Not probed',
    ...(skipped.length > 0 ? skipped : ['- nothing']),
    ...(lacks.length > 0 ? ['', '## What the tracker lacks, and what that turns off', ...lacks.map(op => `- \`${op}\`: ${turnsOff(op)}`)] : []),
    '',
    `Base: \`${base}\`. No token is in the map: the server line names environment variables as \`\${NAME}\`.`,
  ].join('\n');
}

async function main(): Promise<void> {
  const answer = lastAnswer('rounds', 'setup-gate');
  if (answer === null) throw new Error('the setup gate has no recorded answer');
  const effect = chosenEffect(answer, 'redo');
  if (effect === 'stop' || effect === 'redo') {
    emit({ effect: 'stop', pr: 0, url: '', branch: '', commit: '', summary: effect === 'redo' ? 'three redos were used; nothing committed' : 'stopped; nothing committed' });
    return;
  }
  if (effect !== 'approve') throw new Error(`unknown effect '${effect}'`);
  const map = answer.value?.map;
  if (typeof map !== 'string' || map.trim() === '') throw new Error('the approve option carries no map');
  const lines = (answer.value?.lines ?? []) as Line[];
  const lacks = (answer.value?.lacks ?? []) as string[];

  const repo = repoOf(input('host'), input('path'));
  const base = input('base').trim() || 'main';
  const branch = `pipeline/setup/${runId()}`;
  const { commit } = commitFiles(base, branch, [{ path: MAP_PATH, text: map }], 'pipeline: connect the tracker (project map)', artifactsDir());
  const text = body(lines, lacks, base);
  if (CLOSING.test(text)) throw new Error('the PR body would use a closing keyword');

  const find = () => forge('pr.view', { selector: { kind: 'head', repo, headRepo: repo, head: branch, base, state: 'open' } });
  let pr = find();
  if (pr === null) {
    const created = forge('pr.create', { repo, headRepo: repo, head: branch, headRevision: commit, base, title: TITLE, body: text, draft: false });
    pr = find();
    if (pr === null || pr.pr.number !== created.pr.number) throw new Error(`the PR for ${branch} does not read back after create`);
  }
  if (pr.pr.head_revision !== null && pr.pr.head_revision !== commit) throw new Error(`PR #${pr.pr.number} head reads ${pr.pr.head_revision}, not the map commit ${commit}`);
  emit({ effect, pr: pr.pr.number, url: pr.pr.url, branch, commit, summary: `PR #${pr.pr.number} opened to ${base}: ${pr.pr.url}; R2, the Operator merges it` });
}

await script('unify-setup publish', main);

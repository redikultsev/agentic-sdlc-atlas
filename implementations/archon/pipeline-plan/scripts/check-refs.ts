/**
 * The Researcher's references, checked (SPEC "Task shape"): every file:line it cites must
 * exist at the base commit, and a quoted line must be there (within two lines). A claim
 * that fails is struck from what the Planner reads and listed for the Operator. The
 * result is committed to the item branch as `.pipeline/work/<n>/research.md`, marked as
 * the agent's reading. An M item has no research: nothing to check.
 *
 * Inputs: repo_host, repo_path, number, base; bound research (null when skipped),
 * base_commit. Emits `{ ok, problems, checked, research, url }`.
 */

import { artifactsDir, emit, input, refuse } from 'archon:script';
import { git } from '../../.shared/git.ts';
import { nullableJson } from '../../.shared/inputs.ts';
import { itemBranch, runInputs } from '../../.shared/repo.ts';
import { commitFiles } from '../../.shared/stage.ts';

interface Claim { statement: string; file_line: string; quote: string }
interface Research { summary: string; modules: { path: string; role: string; claims: Claim[] }[]; invariants: Claim[] }

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();

export function checkRef(commit: string, claim: Claim, read: (path: string) => string | null): string | null {
  const m = /^([^\s:]+):(\d+)(?:-(\d+))?$/.exec(claim.file_line.trim());
  if (m === null) return `"${claim.file_line}" is not path:line`;
  const text = read(m[1]);
  if (text === null) return `${m[1]} does not exist at ${commit.slice(0, 12)}`;
  const lines = text.split('\n');
  const from = Number(m[2]);
  const to = m[3] === undefined ? from : Number(m[3]);
  if (from < 1 || to < from || to > lines.length) return `${claim.file_line}: ${m[1]} has ${lines.length} lines at ${commit.slice(0, 12)}`;
  if (claim.quote.trim() !== '') {
    const window = squash(lines.slice(Math.max(0, from - 3), Math.min(lines.length, to + 2)).join('\n'));
    if (!window.includes(squash(claim.quote))) return `${claim.file_line}: the quoted text is not there`;
  }
  return null;
}

function main(): void {
  const { repo, number } = runInputs();
  if (number === undefined) return;
  const research = nullableJson(input('research')) as Research | null;
  if (research === null) {
    emit({ ok: true, problems: [], checked: 0, research: '', url: '' });
    return;
  }
  const commit = input('base_commit');
  const cache = new Map<string, string | null>();
  const read = (path: string): string | null => {
    if (!cache.has(path)) {
      const shown = git('show', `${commit}:${path}`);
      cache.set(path, shown.code === 0 ? shown.stdout : null);
    }
    return cache.get(path) ?? null;
  };
  const problems: string[] = [];
  let checked = 0;
  const mark = (c: Claim): string => {
    checked++;
    const problem = checkRef(commit, c, read);
    if (problem !== null) problems.push(problem);
    return problem === null ? `- ${c.statement} (${c.file_line})` : `- ~~${c.statement} (${c.file_line})~~ refused: ${problem}`;
  };
  const md = [
    `# Research for #${number} (the agent's reading)`,
    '',
    `References checked by script at ${commit}; refused claims are struck through.`,
    '',
    research.summary,
    '',
    '## Modules',
    '',
    ...research.modules.flatMap(m => [`### ${m.path}`, '', m.role, '', ...m.claims.map(mark), '']),
    '## Invariants',
    '',
    ...research.invariants.map(mark),
    '',
  ].join('\n');
  const path = `.pipeline/work/${number}/research.md`;
  const { commit: head } = commitFiles(input('base') || 'main', itemBranch(number), [{ path, text: md }], `pipeline: research for #${number}`, artifactsDir());
  emit({ ok: problems.length === 0, problems, checked, research: md, url: `https://${repo.host}/${repo.path}/blob/${head}/${path}` });
}

try {
  main();
} catch (error) {
  refuse(`pipeline-plan check-refs: ${error instanceof Error ? error.message : String(error)}`);
}

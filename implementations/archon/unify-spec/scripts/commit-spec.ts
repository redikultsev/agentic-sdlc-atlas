/**
 * Check the Interviewer's spec and commit it to the item branch `pipeline/<key>` as
 * `.pipeline/work/<key>/spec.md` (decision 14), without touching the checkout. Checked:
 * at least one criterion, ids `AC<k>` unique, every criterion with an example, a "Not in
 * scope" list, every assumption with its source. Problems do not stop the commit: the card
 * shows them on top and offers to send them back.
 *
 * Inputs: repo_host, repo_path, number, base; bound spec (the interviewer's output).
 * Emits `{ commit, branch, path, url, criteria, problems }`.
 */

import { artifactsDir, emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { type ItemKey, keySlug } from '../../.shared/item.ts';
import { itemBranch, runInputs } from '../../.shared/repo.ts';
import { updateWork } from '../../.shared/work.ts';
import { commitFiles } from '../../.shared/stage.ts';

interface Spec {
  title: string;
  summary: string;
  criteria: { id: string; text: string; examples: { given: string; when: string; then: string }[] }[];
  not_in_scope: string[];
  assumptions: { text: string; source: string }[];
  decisions: { id: string; quote: string }[];
  open_points: string[];
}

export function specProblems(spec: Spec): string[] {
  const problems: string[] = [];
  if (spec.criteria.length === 0) problems.push('the spec has no acceptance criterion');
  const seen = new Set<string>();
  for (const c of spec.criteria) {
    if (!/^AC\d+$/.test(c.id)) problems.push(`criterion id '${c.id}' is not AC<number>`);
    if (seen.has(c.id)) problems.push(`criterion id '${c.id}' is used twice`);
    seen.add(c.id);
    if (c.examples.length === 0) problems.push(`criterion ${c.id} has no example`);
  }
  if (spec.not_in_scope.length === 0) problems.push('the "Not in scope" list is empty; say what is left out, or "nothing beyond the criteria"');
  for (const a of spec.assumptions) if (a.source.trim() === '') problems.push(`the assumption "${a.text.slice(0, 100)}" names no source`);
  return problems;
}

export function render(key: ItemKey, spec: Spec): string {
  const lines = [
    `# Spec for ${key}: ${spec.title}`,
    '',
    spec.summary,
    '',
    '## Acceptance criteria',
    '',
    ...spec.criteria.flatMap(c => [
      `### ${c.id}. ${c.text}`,
      '',
      ...c.examples.map(e => `- Given ${e.given}, when ${e.when}, then ${e.then}.`),
      '',
    ]),
    '## Not in scope',
    '',
    ...spec.not_in_scope.map(s => `- ${s}`),
    '',
    '## Assumptions',
    '',
    ...(spec.assumptions.length === 0 ? ['- None.'] : spec.assumptions.map(a => `- ${a.text} (source: ${a.source})`)),
    '',
    '## Past decisions cited',
    '',
    ...(spec.decisions.length === 0 ? ['- None.'] : spec.decisions.map(d => `- ${d.id}: "${d.quote}"`)),
    '',
    '## Open points',
    '',
    ...(spec.open_points.length === 0 ? ['- None.'] : spec.open_points.map(p => `- ${p}`)),
    '',
    '_Written by the Interviewer agent; approved or clarified by the Operator at SpecReview. Rulings are comments on the item._',
  ];
  return lines.join('\n');
}

async function main(): Promise<void> {
  const { repo, key } = runInputs();
  if (key === undefined) return;
  const base = input('base') || 'main';
  const spec = JSON.parse(input('spec')) as Spec;
  const branch = itemBranch(key);
  const path = `.pipeline/work/${keySlug(key)}/spec.md`;
  const { commit } = commitFiles(base, branch, [{ path, text: render(key, spec) }], `pipeline: spec for ${key}`, artifactsDir());
  updateWork(key, doc => {
    doc.branch = branch;
  });
  emit({
    commit,
    branch,
    path,
    url: `https://${repo.host}/${repo.path}/blob/${commit}/${path}`,
    criteria: spec.criteria.map(c => c.id),
    problems: specProblems(spec),
  });
}

await script('unify-spec commit-spec', main);

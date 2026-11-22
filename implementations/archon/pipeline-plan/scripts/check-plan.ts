/**
 * The Planner's plan, checked before any code (SPEC "Task shape"): every acceptance
 * criterion id of the spec is covered by a slice and no slice names an id the spec lacks;
 * slice ids `S<k>` are unique; blocked-by names existing slices and the graph has no
 * cycle; every slice names its files and a check command whose program exists here (the
 * command may fail at the base; it must start). Size is files and changed lines, never
 * time. The plan is committed to the item branch as `.pipeline/work/<n>/plan.md`;
 * problems do not stop the commit, the card shows them on top.
 *
 * Inputs: repo_host, repo_path, number, base; bound plan (the planner's output), criteria
 * (the spec's ids). Emits `{ ok, problems, url, slices }`.
 */

import { artifactsDir, emit, input, refuse } from 'archon:script';
import { itemBranch, runInputs } from '../../.shared/repo.ts';
import { commitFiles } from '../../.shared/stage.ts';

export interface Slice {
  id: string;
  title: string;
  files: string[];
  risks: string[];
  check: string;
  criteria: string[];
  blocked_by: string[];
  changed_lines: number;
}

interface Plan { summary: string; slices: Slice[] }

/** The slice ids on a cycle of the blocked-by graph, or empty when it has none. */
export function cycle(slices: readonly Slice[]): string[] {
  const indegree = new Map(slices.map(s => [s.id, 0]));
  for (const s of slices) for (const b of s.blocked_by) if (indegree.has(b)) indegree.set(s.id, (indegree.get(s.id) ?? 0) + 1);
  const ready = [...indegree].filter(([, d]) => d === 0).map(([id]) => id);
  const done = new Set<string>();
  while (ready.length > 0) {
    const id = ready.pop() as string;
    done.add(id);
    for (const s of slices) {
      if (!s.blocked_by.includes(id) || done.has(s.id)) continue;
      const d = (indegree.get(s.id) ?? 0) - 1;
      indegree.set(s.id, d);
      if (d === 0) ready.push(s.id);
    }
  }
  return slices.map(s => s.id).filter(id => !done.has(id));
}

export function planProblems(plan: Plan, criteria: readonly string[], starts: (program: string) => boolean): string[] {
  const problems: string[] = [];
  if (plan.slices.length === 0) problems.push('the plan has no slice');
  const ids = new Set<string>();
  for (const s of plan.slices) {
    if (!/^S\d+$/.test(s.id)) problems.push(`slice id '${s.id}' is not S<number>`);
    if (ids.has(s.id)) problems.push(`slice id '${s.id}' is used twice`);
    ids.add(s.id);
  }
  for (const s of plan.slices) {
    if (s.files.length === 0) problems.push(`${s.id} names no files`);
    if (s.check.trim() === '') problems.push(`${s.id} names no check command`);
    else {
      const program = s.check.trim().split(/\s+/)[0] ?? '';
      if (!starts(program)) problems.push(`${s.id}: the check command's program '${program}' is not found, so it cannot start`);
    }
    for (const b of s.blocked_by) {
      if (b === s.id) problems.push(`${s.id} is blocked by itself`);
      else if (!ids.has(b)) problems.push(`${s.id} is blocked by '${b}', which is no slice`);
    }
    for (const c of s.criteria) if (!criteria.includes(c)) problems.push(`${s.id} covers '${c}', which the spec does not have`);
  }
  const covered = new Set(plan.slices.flatMap(s => s.criteria));
  for (const c of criteria) if (!covered.has(c)) problems.push(`criterion ${c} is covered by no slice`);
  const looped = cycle(plan.slices);
  if (looped.length > 0) problems.push(`the blocked-by graph has a cycle through ${looped.join(', ')}`);
  return problems;
}

function render(number: number, plan: Plan, problems: readonly string[]): string {
  return [
    `# Plan for #${number}`,
    '',
    plan.summary,
    '',
    problems.length === 0 ? 'Checks: every criterion covered, no cycle, every slice with files and a check command.' : `Checks found ${problems.length} problem(s):\n\n${problems.map(p => `- ${p}`).join('\n')}`,
    '',
    ...plan.slices.flatMap(s => [
      `## ${s.id}. ${s.title}`,
      '',
      `- Covers: ${s.criteria.join(', ') || 'none'}`,
      `- Blocked by: ${s.blocked_by.join(', ') || 'nothing'}`,
      `- Files: ${s.files.map(f => `\`${f}\``).join(', ')}`,
      `- Changed lines (estimate of size, not time): ${s.changed_lines}`,
      `- Check: \`${s.check}\``,
      ...(s.risks.length === 0 ? [] : [`- Risks: ${s.risks.join('; ')}`]),
      '',
    ]),
    '_Written by the Planner agent; checked by script; approved or sent back by the Operator at PlanReview._',
  ].join('\n');
}

function main(): void {
  const { repo, number } = runInputs();
  if (number === undefined) return;
  const plan = JSON.parse(input('plan')) as Plan;
  const criteria = JSON.parse(input('criteria') || '[]') as string[];
  const starts = (program: string): boolean => program.includes('/') ? Bun.file(program).size > 0 : Bun.which(program) !== null;
  const problems = planProblems(plan, criteria, starts);
  const path = `.pipeline/work/${number}/plan.md`;
  const { commit } = commitFiles(input('base') || 'main', itemBranch(number), [{ path, text: render(number, plan, problems) }], `pipeline: plan for #${number}`, artifactsDir());
  emit({ ok: problems.length === 0, problems, url: `https://${repo.host}/${repo.path}/blob/${commit}/${path}`, slices: plan.slices });
}

try {
  main();
} catch (error) {
  refuse(`pipeline-plan check-plan: ${error instanceof Error ? error.message : String(error)}`);
}

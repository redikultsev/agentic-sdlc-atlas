/**
 * The Operator's rulings (decision 32, registers per decision 44). A ruling is the text of
 * a gate answer, never a free comment: only the wait's own answer becomes one. It is
 * written as a comment on the item, dated, with the gate it answered; the marker makes the
 * write idempotent, so a retried node never writes it twice. A ruling marked as true for
 * the whole project is also appended to the pinned "Pipeline rulings" issue.
 */

import { forge, runId } from 'archon:script';
import type { IssueRef, Repo } from './repo.ts';
import { MARKS } from './states.ts';

export interface Ruling {
  readonly gate: string;
  readonly decision: string;
  readonly text: string;
  readonly project: boolean;
}

export function recordRuling(ref: IssueRef, ruling: Ruling, at = new Date().toISOString()): void {
  if (ruling.text.trim() === '') return;
  const marker = `pipeline-ruling:${runId()}:${ruling.gate}`;
  const body = [
    `**Ruling** (${at.slice(0, 10)}, ${ruling.gate}: ${ruling.decision})`,
    '',
    ruling.text.trim(),
  ].join('\n');
  forge('workitem.comment.upsert', { subject: { kind: 'issue', ref }, marker, body });
  if (ruling.project) recordProjectRuling(ref.repo, ref.number, ruling, at, marker);
}

function rulingsIssue(repo: Repo): number {
  const listed = forge('workitem.list', { repo, label: MARKS.rulings });
  const open = listed.items.filter(item => item.kind === 'issue' && item.state === 'open');
  if (open.length > 0) return open[0].ref.number;
  const created = forge('workitem.create', {
    repo,
    title: 'Pipeline rulings',
    body: 'Answers the Operator gave that hold for the whole project. Agents read them before they ask. One comment per ruling; never edited.',
    marker: 'pipeline-rulings-register',
  });
  const number = created.workitem.ref.number;
  forge('workitem.label.add', { subject: { kind: 'issue', ref: { repo, number } }, name: MARKS.rulings });
  return number;
}

function recordProjectRuling(repo: Repo, from: number, ruling: Ruling, at: string, marker: string): void {
  const number = rulingsIssue(repo);
  const body = `**Ruling** (${at.slice(0, 10)}, from #${from}, ${ruling.gate})\n\n${ruling.text.trim()}`;
  forge('workitem.comment.upsert', { subject: { kind: 'issue', ref: { repo, number } }, marker: `${marker}:project`, body });
}

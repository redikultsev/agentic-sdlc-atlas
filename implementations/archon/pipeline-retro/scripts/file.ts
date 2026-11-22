/**
 * File the Retro's proposals as issues labelled `pipeline:retro`, for Triage. A proposal
 * is filed only when it rests on at least two distinct cases the metrics named (a lesson
 * is what repeated twice, decision 27) and names a file; the others are dropped and
 * reported. The marker is the week and the proposal's title, so a retry or a second run
 * in the same week files each proposal once.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST and INPUTS_REPO_PATH; INPUTS_WEEK and
 * INPUTS_CASES from metrics; INPUTS_RETRO, the agent's proposals.
 */

import { emit, forge, input, refuse } from 'archon:script';
import { repoOf } from '../../.shared/repo.ts';
import { MARKS } from '../../.shared/states.ts';
import { message } from './lib.ts';

interface Proposal {
  title: string;
  kind: 'check' | 'instruction' | 'remove-rule';
  file: string;
  change: string;
  cases: number[];
  why: string;
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function main(): void {
  const repo = repoOf(input('repo_host'), input('repo_path'));
  const week = input('week').trim();
  const known = new Set((JSON.parse(input('cases') || '[]') as { item: number }[]).map(c => c.item));
  const { proposals } = JSON.parse(input('retro')) as { proposals: Proposal[] };
  const filed: { number: number; title: string; created: boolean }[] = [];
  const dropped: { title: string; why: string }[] = [];

  for (const proposal of proposals) {
    const cases = [...new Set(proposal.cases)].filter(n => known.has(n));
    if (cases.length < 2) {
      dropped.push({ title: proposal.title, why: `rests on ${String(cases.length)} known case(s); a lesson needs two` });
      continue;
    }
    if (proposal.file.trim() === '' || proposal.title.trim() === '') {
      dropped.push({ title: proposal.title, why: 'names no file or no title' });
      continue;
    }
    const body = [
      `**Retro proposal (${week})**: ${proposal.kind}`,
      '',
      `File: \`${proposal.file}\``,
      '',
      proposal.change,
      '',
      `Why: ${proposal.why}`,
      '',
      `Cases: ${cases.map(n => `#${String(n)}`).join(', ')}`,
      '',
      'Filed by the weekly Retro. Whether it is worth doing is decided at Triage; instruction and rules files never merge as R0, and a change that weakens a check is R2.',
    ].join('\n');
    try {
      const created = forge('workitem.create', {
        repo,
        title: proposal.title,
        body,
        marker: `pipeline-retro:${week}:${slug(proposal.title)}`,
      });
      const number = created.workitem.ref.number;
      forge('workitem.label.add', { subject: { kind: 'issue', ref: { repo, number } }, name: MARKS.retro });
      filed.push({ number, title: proposal.title, created: created.changed });
    } catch (error) {
      dropped.push({ title: proposal.title, why: `not filed: ${message(error)}` });
    }
  }
  emit({ filed, dropped });
}

try {
  main();
} catch (error) {
  refuse(`pipeline-retro file: ${message(error)}`);
}

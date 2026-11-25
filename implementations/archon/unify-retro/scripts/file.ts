/**
 * File the Retro's proposals as items labelled `pipeline:retro`, for Triage. A proposal
 * is filed only when it rests on at least two distinct cases the metrics named (a lesson
 * is what repeated twice, decision 27), names a file and names its cost (decision 67); the
 * others are dropped and reported. A pack-scope proposal changes the pipeline pack, not
 * this repository, and its item says so. The marker is the week and the proposal's title, so a retry or a second run
 * in the same week files each proposal once.
 *
 * Bound inputs: the workflow's INPUTS_REPO_HOST and INPUTS_REPO_PATH; INPUTS_WEEK and
 * INPUTS_CASES from metrics; INPUTS_RETRO, the agent's proposals.
 */

import { emit, input } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { type ItemKey, parseKey } from '../../.shared/item.ts';
import { MARKS } from '../../.shared/states.ts';
import { message } from './lib.ts';

interface Proposal {
  title: string;
  kind: 'check' | 'skill' | 'instruction' | 'remove-rule';
  scope: 'pack' | 'project';
  file: string;
  change: string;
  cases: string[];
  why: string;
  cost: string;
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

async function main(): Promise<void> {
  const week = input('week').trim();
  const known = new Set((JSON.parse(input('cases') || '[]') as { item: string }[]).map(c => parseKey(String(c.item))));
  const { proposals } = JSON.parse(input('retro')) as { proposals: Proposal[] };
  const filed: { key: ItemKey; title: string }[] = [];
  const dropped: { title: string; why: string }[] = [];

  for (const proposal of proposals) {
    const cases = [...new Set(proposal.cases.map(c => parseKey(String(c))))].filter((k): k is ItemKey => k !== null && known.has(k));
    if (cases.length < 2) {
      dropped.push({ title: proposal.title, why: `rests on ${String(cases.length)} known case(s); a lesson needs two` });
      continue;
    }
    if (proposal.file.trim() === '' || proposal.title.trim() === '') {
      dropped.push({ title: proposal.title, why: 'names no file or no title' });
      continue;
    }
    if ((proposal.cost ?? '').trim() === '') {
      dropped.push({ title: proposal.title, why: 'names no cost: every rule makes some work slower or some cases worse' });
      continue;
    }
    const body = [
      `**Retro proposal (${week})**: ${proposal.kind}`,
      '',
      proposal.scope === 'pack' ? `File: \`${proposal.file}\` in the pipeline pack, not in this repository` : `File: \`${proposal.file}\``,
      '',
      proposal.change,
      '',
      `Why: ${proposal.why}`,
      '',
      `Cost: ${proposal.cost}`,
      '',
      `Cases: ${cases.join(', ')}`,
      '',
      'Filed by the weekly Retro. Whether it is worth doing is decided at Triage; instruction, skill and rules files never merge as R0, and a change that weakens a check is R2.',
    ].join('\n');
    try {
      const key = await tracker().create('project', `unify-retro:${week}:${slug(proposal.title)}`, proposal.title, body);
      await tracker().label(key, { add: [MARKS.retro] });
      filed.push({ key, title: proposal.title });
    } catch (error) {
      dropped.push({ title: proposal.title, why: `not filed: ${message(error)}` });
    }
  }
  emit({ filed, dropped });
}

await script('unify-retro file', main);

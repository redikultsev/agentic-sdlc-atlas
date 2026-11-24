/**
 * Move the item to TriageReview and build the Accept request (decisions 11, 38): what to
 * decide, what was not verified on top, then the facts with their evidence. Options:
 * accept, for a human, won't do; each carries `value.effect`, the action `apply` takes.
 * A size or risk the Operator disagrees with is corrected through `other`: the text is a
 * ruling and triage runs again with it. With implement_lane manual, an S item's accept
 * option is the explicit start of the Implementer, and the card says so. A label changed
 * since the last move gives a stop request instead.
 *
 * Inputs: repo_host, repo_path, number, implement_lane; bound evidence (the evidence
 * node's output). Emits the card with `size`, `risk`, `outcome`, `verdict_reason`, `problems`.
 */

import { emit, input } from 'archon:script';
import { script, tracker } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { buildRequest, type Option } from '../../.shared/request.ts';
import { stopCard, tryMove } from '../../.shared/stage.ts';

interface Claim { kind: string; statement: string; link: string | null; quote: string | null; command: string | null; output: string | null; file_line: string | null }
interface Verdict {
  size: 'S' | 'M' | 'L';
  risk: 'R0' | 'R1' | 'R2';
  outcome: 'accept' | 'for-human' | 'wont-do';
  kind: string;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
  claims: Claim[];
  root_cause: { file_line: string; explanation: string }[];
  duplicates: { url: string; quote: string; relation: string }[];
  assumptions: { text: string; source: string }[];
  data_sources: string;
}

function evidenceOf(c: Claim): string {
  const parts = [
    c.link ? `${c.link}${c.quote ? ` "${c.quote.slice(0, 200)}"` : ''}` : '',
    c.command ? `\`${c.command}\` → ${(c.output ?? '').slice(0, 200)}` : '',
    c.file_line ? c.file_line : '',
  ].filter(p => p !== '');
  return parts.join('; ');
}

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const lane = input('implement_lane') || 'auto';
  const evidence = JSON.parse(input('evidence')) as { ok: boolean; problems: string[]; verdict: Verdict };
  const v = evidence.verdict;
  const base = { size: v.size, risk: v.risk, outcome: v.outcome, verdict_reason: v.reason, problems: evidence.problems };

  const mismatch = await tryMove(key, ['triaging', 'triage-review'], 'triage-review');
  if (mismatch !== null) {
    emit({ ...base, ...stopCard(key, 'triage', mismatch) });
    return;
  }

  const small = v.size === 'S';
  const manualStart = small && lane === 'manual';
  const options: Option[] = [
    {
      id: 'accept',
      label: manualStart ? `Accept as ${v.size}, ${v.risk}, and start implementing` : `Accept as ${v.size}, ${v.risk}`,
      does: small
        ? 'Moves the item to Implementing and starts its first implementation round.'
        : 'Moves the item to Specifying and starts the spec stage (questions, then a spec for your review).',
      effect: 'accept',
    },
    { id: 'for-human', label: 'For a human', does: 'Moves the item to ForHuman and comments why; the pipeline only tracks it.', effect: 'for-human' },
    { id: 'wont-do', label: "Won't do", does: 'Labels it pipeline:rejected, comments the reason and closes the item as not planned.', effect: 'wont-do' },
  ];
  const recommended = v.outcome === 'accept' ? 'accept' : v.outcome;
  const request = buildRequest(
    {
      decide: `${key}: accept it as ${v.size} with risk ${v.risk}, hand it to a human, or close it? Triage proposes: ${v.outcome}. ${v.reason}`,
      why: 'every item passes your Accept before any spec or code is written (TriageReview).',
      notVerified: [
        ...evidence.problems.map(p => `refused: ${p}`),
        ...(v.data_sources.trim() === '' ? ['which logs or alerts exist for this project'] : []),
        'size and risk are the agent\'s reading; answer "other" with the right ones and triage runs again with your words as a ruling',
      ],
      facts: [
        `Kind: ${v.kind}. Size ${v.size} (files and changed lines, no time estimate), risk ${v.risk}.`,
        ...(manualStart ? ['implement_lane is manual: nothing starts unless you choose "Accept … and start implementing".'] : []),
        ...v.claims.map(c => `${c.kind}: ${c.statement} — ${evidenceOf(c)}`),
        ...v.root_cause.map(r => `Root cause at ${r.file_line}: ${r.explanation}`),
        ...v.duplicates.map(d => `${d.relation}: ${d.url} "${d.quote.slice(0, 200)}"`),
        ...v.assumptions.map(a => `Assumption: ${a.text} (source: ${a.source})`),
        `Data sources: ${v.data_sources.trim() === '' ? 'none named' : v.data_sources}`,
        tracker().url(key),
      ],
    },
    options,
    {
      option: recommended,
      why: evidence.ok ? `Triage's verdict: ${v.reason}` : `Triage's verdict, but ${evidence.problems.length} claim(s) were refused for missing evidence: ${v.reason}`,
      confidence: evidence.ok ? v.confidence : 'low',
    }
  );
  emit({ ...base, ok: true, reason: '', ...request });
}

await script('unify-triage card', main);

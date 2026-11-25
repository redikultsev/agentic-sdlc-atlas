/**
 * The setup request to the Operator: the probe lines (passed, failed, not probed), what
 * the tracker lacks and what that turns off in the pipeline, the agent's notes and
 * assumptions, and the map itself. Options: approve (opens the map's PR; the
 * recommendation only when the probe passed), redo (another compose round with the probe
 * result; answer `other` to add a comment), stop. A failed probe still allows approve,
 * with what will not work said, but recommends redo. A map the check refused cannot be
 * approved. The last round (three redos used) offers no redo.
 *
 * Inputs: base, test_item; bound round, compose, check, probe (null when not run).
 * Emits the card with `last`, `probe_ok`.
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { nullableJson } from '../../.shared/inputs.ts';
import { buildRequest, type Option } from '../../.shared/request.ts';
import { turnsOff } from './lib/ops.ts';

interface Line { op: string; result: 'passed' | 'failed' | 'not-probed'; detail: string }

async function main(): Promise<void> {
  const base = input('base').trim() || 'main';
  const item = input('test_item');
  const round = JSON.parse(input('round')) as { last: boolean; redo: number };
  const compose = nullableJson(input('compose')) as { map: string; notes: string; assumptions: string[] } | null;
  const check = nullableJson(input('check')) as { ok: boolean; problems: string[]; missing: string[]; lacks: string[] } | null;
  const probe = nullableJson(input('probe')) as { ok: boolean; lines: Line[] } | null;
  if (compose === null || check === null) throw new Error('the round wrote no map to show');

  const lines = probe?.lines ?? [];
  const failed = lines.filter(l => l.result === 'failed');
  const facts = [
    ...(probe === null ? ['Not probed: the check refused the map.'] : [`Probe on ${item}:`, ...lines.map(l => `  ${l.op}: ${l.result === 'not-probed' ? 'not probed' : l.result} (${l.detail})`)]),
    ...(check.lacks.length > 0 ? ['The tracker map lacks:', ...check.lacks.map(op => `  ${op}: ${turnsOff(op)}`)] : check.ok ? ['The map declares every optional operation.'] : []),
    `The agent's notes: ${compose.notes.trim() || 'none'}`,
    ...(compose.assumptions.length > 0 ? ['The agent\'s assumptions:', ...compose.assumptions.map(a => `  ${a}`)] : ['The agent states no assumption.']),
    `The map (.pipeline/tracker.yaml), redo ${round.redo} of 3 used:\n\`\`\`yaml\n${compose.map.trim()}\n\`\`\``,
  ];
  const notVerified = [
    'create, close and the links: the probe does not run what changes the project',
    ...(failed.length > 0 ? failed.map(l => `${l.op} failed on the probe: it will fail in the pipeline too`) : []),
  ];
  const approve: Option = {
    id: 'approve',
    label: failed.length > 0 ? 'Open the PR anyway' : 'Open the map\'s PR',
    does: `Commits .pipeline/tracker.yaml to a new branch from ${base} and opens a PR to ${base}; it is R2, so you merge it yourself.`,
    effect: 'approve',
    extra: { map: compose.map, lines, lacks: check.lacks },
  };
  const redo: Option = {
    id: 'redo',
    label: 'Compose again',
    does: 'Runs the Setup agent again with this round\'s check and probe result; answer "other" instead to add your comment. Counts as one of three redos.',
    effect: 'redo',
  };
  const stop: Option = { id: 'stop', label: 'Stop', does: 'Ends the run; nothing is committed.', effect: 'stop' };

  let request;
  if (!check.ok) {
    const options = round.last ? [stop] : [redo, stop];
    request = buildRequest(
      { decide: `The composed map failed the check: ${check.problems.join('; ')}. ${round.last ? 'Three redos are used: stop?' : 'Compose again, or stop?'}`, why: 'a map that fails the check cannot be probed or approved (decision 46).', notVerified: ['the probe: it did not run'], facts },
      options,
      round.last ? { option: 'stop', why: 'Three rounds did not give a map that passes the check.', confidence: 'medium' } : { option: 'redo', why: 'The check names what to fix.', confidence: 'high' }
    );
  } else if (failed.length > 0) {
    const options = round.last ? [approve, stop] : [redo, approve, stop];
    request = buildRequest(
      { decide: `The map failed the probe on ${failed.map(l => l.op).join(', ')}. ${round.last ? 'Three redos are used: open the PR anyway, or stop?' : 'Compose again, open the PR anyway, or stop?'}`, why: 'the project map is yours to approve, and a change to it is R2 (decision 46).', notVerified, facts },
      options,
      round.last ? { option: 'stop', why: 'What failed on the probe would fail on every item.', confidence: 'medium' } : { option: 'redo', why: `${failed.length} operation(s) failed on the test item; the agent gets the tracker's words.`, confidence: 'high' }
    );
  } else {
    const options = round.last ? [approve, stop] : [approve, redo, stop];
    request = buildRequest(
      { decide: `The map passed the probe on ${item}. Open its PR to ${base}${round.last ? ', or stop' : ', compose again, or stop'}?`, why: 'the project map is yours to approve, and a change to it is R2 (decision 46).', notVerified, facts },
      options,
      { option: 'approve', why: 'Every operation the probe ran passed and read back.', confidence: check.lacks.length > 0 ? 'medium' : 'high' }
    );
  }
  emit({ ok: true, reason: '', ...request, last: round.last, probe_ok: probe?.ok ?? false });
}

await script('unify-setup card', main);

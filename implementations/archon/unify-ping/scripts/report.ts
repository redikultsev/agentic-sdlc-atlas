/**
 * The readable install report: one line per check, then what to fix. `ok` is true only
 * when every check that ran passed; a check that did not run (no bindings directory, no
 * test command) is named as such, never counted as passed. Codex is reported, not
 * counted: unify-round fails closed on it at run time. So is the number of findings waiting
 * in the findings buffer for the daily pass (decision 60).
 *
 * The deploys line says how `.pipeline/project.yaml` reads: each environment with its
 * kind, stage and declared steps, the release trigger and the toggles; shape A (no
 * `environments`) passes and says so; a file that does not parse fails with its message.
 * The scouts line lists each declared scout (decision 55) with its schedule, budget, the
 * cost cap a look runs under when it differs, findings waiting and its last look; none
 * declared passes; a bad setting fails with its message.
 *
 * Bound inputs: INPUTS_REPO, INPUTS_LABELS, INPUTS_ACCESS, INPUTS_BINDINGS, INPUTS_CODEX,
 * INPUTS_TESTS, INPUTS_DEPLOYS and INPUTS_SCOUTS, the outputs of the checks.
 */

import { emit, input, refuse } from 'archon:script';
import { buffered, MAX_BUFFER } from '../../.shared/findings.ts';

type Json = Record<string, unknown>;

function read(name: string, raw: string): Json {
  try {
    return JSON.parse(raw) as Json;
  } catch {
    throw new Error(`the ${name} check gave no readable output`);
  }
}

const mark = (ok: unknown): string => (ok === true ? 'ok  ' : ok === false ? 'FAIL' : 'n/a ');
const list = (value: unknown): string[] => (Array.isArray(value) ? value.map(v => (typeof v === 'string' ? v : JSON.stringify(v))) : []);

function main(): void {
  const repo = read('repo', input('repo'));
  const labels = read('labels', input('labels'));
  const access = read('access', input('access'));
  const bindings = read('bindings', input('bindings'));
  const codex = read('codex', input('codex'));
  const tests = read('tests', input('tests'));
  const deploys = read('deploys', input('deploys'));
  const envs = (Array.isArray(deploys.environments) ? deploys.environments : []) as { name: string; kind: string; stage: string; steps: string[] }[];
  const deployLines =
    deploys.ok !== true
      ? [`${mark(false)} deploys: .pipeline/project.yaml on ${String(deploys.base)} does not parse: ${String(deploys.error)}`]
      : [
          `${mark(true)} deploys: ${deploys.legacy === true ? 'shape A from deploy: (no environments declared)' : `${envs.length} environment(s)`}; release trigger ${String(deploys.trigger)}; toggles ${deploys.toggles === null ? 'none' : `set by ${String(deploys.toggles)}`}`,
          ...envs.map(e => `       ${e.name}: ${e.kind}, ${e.stage}; ${e.steps.join(', ')}`),
        ];
  const scouts = read('scouts', input('scouts'));
  const declared = (Array.isArray(scouts.scouts) ? scouts.scouts : []) as { name: string; every: string; budget: number; cap: number; paths: string[]; measure: number; waiting: number; last: string | null }[];
  const scoutLines =
    scouts.ok !== true
      ? [`${mark(false)} scouts: .pipeline/project.yaml on ${String(scouts.base)}: ${String(scouts.error)}`]
      : [
          `${mark(true)} scouts: ${declared.length === 0 ? 'none declared (unify-scout does nothing)' : `${declared.length} declared, at most one look per hourly tick`}`,
          ...declared.map(
            s =>
              `       ${s.name}: ${s.every}, budget ${s.budget} USD${s.cap === s.budget ? '' : ` (a look runs under the ${s.cap} USD cap)`}; ${s.paths.join(', ')}${s.measure > 0 ? `; ${s.measure} measure command(s)` : ''}; ${s.waiting} finding(s) waiting; last look ${s.last ?? 'never'}`
          ),
        ];

  const lines = [
    `unify-sdlc install check for ${String(repo.host)}/${String(repo.path)} (from ${String(repo.source)})`,
    '',
    `${mark(labels.ok)} labels in ${String(labels.tracker)}: ${list(labels.ensured).length} ensured, ${list(labels.existing).length} left to the tracker, ${list(labels.failed).length} failed of ${String(labels.total)}${list(labels.lacks).length > 0 ? `; the tracker lacks ${list(labels.lacks).join(', ')} (skipped)` : ''}`,
    `${mark(access.ok)} gh api: ${access.login === null ? `no access (${String(access.error)})` : `acts as ${String(access.login)}`}${access.login_matches === false ? `, but pipeline_login is ${String(access.expected_login)}` : ''}${access.repo_error ? `; repository not readable: ${String(access.repo_error)}` : ''}`,
    `${mark(bindings.ok)} bindings: ${bindings.ok === null ? 'not checked' : `${list(bindings.found).length} of ${list(bindings.declared).length} found in ${String(bindings.dir)}`}`,
    `${mark(codex.configured)} codex review (reported only): ${codex.configured ? `@review on ${String(codex.model ?? 'codex')}` : list(codex.notes).join('; ')}`,
    ...deployLines,
    ...scoutLines,
    `${mark(tests.ok)} test suite through the guard: ${tests.ran ? `exit ${String(tests.exit)}${tests.timed_out ? ' (timed out)' : ''}, ${list(tests.refusals).length} guard refusals, ${String(tests.note)}` : String(tests.note)}`,
  ];
  const fixes = [
    ...list(labels.failed).map(f => `label: ${f}`),
    ...(access.ok === false ? ['log in gh for the pipeline account, or set pipeline_login to the account the token acts as'] : []),
    ...list(bindings.missing).map(id => `binding file missing for ${id}: run archon pack bindings --out <dir>`),
    ...list(bindings.problems).map(p => `binding: ${p}`),
    ...list(tests.refusals).map(r => `guard refused: ${r}`),
    ...(deploys.ok === false ? ['fix .pipeline/project.yaml on the base (its format is in decision 48)'] : []),
    ...(scouts.ok === false ? ['fix the scouts section of .pipeline/project.yaml on the base (its format is in .shared/scouts.ts)'] : []),
  ];
  // Reported, not counted: what waits for the daily pass (decision 60).
  const waiting = buffered().length;
  lines.push(`${mark(null)} findings buffer (reported only): ${waiting} of at most ${MAX_BUFFER} waiting for the daily pass (unify-findings)`);
  if (fixes.length > 0) lines.push('', 'To fix:', ...fixes.map(f => `- ${f}`));
  const counted = [labels.ok, access.ok, bindings.ok, tests.ok, deploys.ok, scouts.ok];
  const ok = counted.every(value => value !== false);
  emit({ pack: 'unify-sdlc', ok, report: lines.join('\n') });
}

try {
  main();
} catch (error) {
  refuse(`unify-ping report: ${error instanceof Error ? error.message : String(error)}`);
}

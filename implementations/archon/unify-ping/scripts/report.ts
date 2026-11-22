/**
 * The readable install report: one line per check, then what to fix. `ok` is true only
 * when every check that ran passed; a check that did not run (no bindings directory, no
 * test command) is named as such, never counted as passed. Codex is reported, not
 * counted: unify-round fails closed on it at run time.
 *
 * Bound inputs: INPUTS_REPO, INPUTS_LABELS, INPUTS_ACCESS, INPUTS_BINDINGS, INPUTS_CODEX
 * and INPUTS_TESTS, the outputs of the checks.
 */

import { emit, input, refuse } from 'archon:script';

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

  const lines = [
    `unify-sdlc install check for ${String(repo.host)}/${String(repo.path)} (from ${String(repo.source)})`,
    '',
    `${mark(labels.ok)} labels: ${list(labels.created).length} created, ${list(labels.existing).length} already there, ${list(labels.failed).length} failed of ${String(labels.total)}`,
    `${mark(access.ok)} gh api: ${access.login === null ? `no access (${String(access.error)})` : `acts as ${String(access.login)}`}${access.login_matches === false ? `, but pipeline_login is ${String(access.expected_login)}` : ''}${access.repo_error ? `; repository not readable: ${String(access.repo_error)}` : ''}`,
    `${mark(bindings.ok)} bindings: ${bindings.ok === null ? 'not checked' : `${list(bindings.found).length} of ${list(bindings.declared).length} found in ${String(bindings.dir)}`}`,
    `${mark(codex.configured)} codex review (reported only): ${codex.configured ? `@review on ${String(codex.model ?? 'codex')}` : list(codex.notes).join('; ')}`,
    `${mark(tests.ok)} test suite through the guard: ${tests.ran ? `exit ${String(tests.exit)}${tests.timed_out ? ' (timed out)' : ''}, ${list(tests.refusals).length} guard refusals, ${String(tests.note)}` : String(tests.note)}`,
  ];
  const fixes = [
    ...list(labels.failed).map(f => `label: ${f}`),
    ...(access.ok === false ? ['log in gh for the pipeline account, or set pipeline_login to the account the token acts as'] : []),
    ...list(bindings.missing).map(id => `binding file missing for ${id}: run archon pack bindings --out <dir>`),
    ...list(bindings.problems).map(p => `binding: ${p}`),
    ...list(tests.refusals).map(r => `guard refused: ${r}`),
  ];
  if (fixes.length > 0) lines.push('', 'To fix:', ...fixes.map(f => `- ${f}`));
  const counted = [labels.ok, access.ok, bindings.ok, tests.ok];
  const ok = counted.every(value => value !== false);
  emit({ pack: 'unify-sdlc', ok, report: lines.join('\n') });
}

try {
  main();
} catch (error) {
  refuse(`unify-ping report: ${error instanceof Error ? error.message : String(error)}`);
}

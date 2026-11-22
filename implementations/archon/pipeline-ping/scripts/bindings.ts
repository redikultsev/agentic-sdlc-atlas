/**
 * The binding files `archon pack bindings --out <dir>` wrote for this repository: one per
 * binding the pack declares in `.pack/pack.yaml`, and every `<name>_binding` input inside
 * them an absolute path to a file that exists. Without `bindings_dir` the check is
 * reported as not run, never as passed.
 *
 * Bound inputs: the workflow's INPUTS_BINDINGS_DIR.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { emit, input, packDir, refuse } from 'archon:script';
import { isObject } from '../../.shared/inputs.ts';

function declaredBindings(): string[] {
  const text = readFileSync(join(packDir(), '.pack', 'pack.yaml'), 'utf8');
  const parsed = Bun.YAML.parse(text) as unknown;
  const bindings = isObject(parsed) && isObject(parsed.bindings) ? parsed.bindings : {};
  return Object.keys(bindings);
}

/** The launch inputs of a written binding file, wherever its shape keeps them. */
function launchInputs(document: unknown): Record<string, unknown> {
  if (!isObject(document)) return {};
  const binding = isObject(document.binding) ? document.binding : document;
  const launch = isObject(binding.launch) ? binding.launch : {};
  return isObject(launch.inputs) ? launch.inputs : {};
}

function main(): void {
  const dir = input('bindings_dir').trim();
  const declared = declaredBindings();
  if (dir === '') {
    emit({ ok: null, dir, declared, found: [], missing: [], problems: ['bindings_dir is not set: the check did not run'] });
    return;
  }
  if (!existsSync(dir)) {
    emit({ ok: false, dir, declared, found: [], missing: declared, problems: [`${dir} does not exist`] });
    return;
  }
  const files = readdirSync(dir).filter(name => name.endsWith('.json'));
  const found: string[] = [];
  const missing: string[] = [];
  const problems: string[] = [];
  for (const id of declared) {
    const match = files.filter(name => name.includes(`-${id}-`));
    if (match.length === 0) {
      missing.push(id);
      continue;
    }
    found.push(id);
    for (const name of match) {
      let document: unknown;
      try {
        document = JSON.parse(readFileSync(join(dir, name), 'utf8')) as unknown;
      } catch (error) {
        problems.push(`${name} does not parse: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
      for (const [key, value] of Object.entries(launchInputs(document))) {
        if (!key.endsWith('_binding')) continue;
        if (typeof value !== 'string' || !value.startsWith('/')) problems.push(`${name}: ${key} is not an absolute path`);
        else if (!existsSync(value)) problems.push(`${name}: ${key} names ${value}, which does not exist`);
      }
    }
  }
  emit({ ok: missing.length === 0 && problems.length === 0, dir, declared, found, missing, problems });
}

try {
  main();
} catch (error) {
  refuse(`pipeline-ping bindings: ${error instanceof Error ? error.message : String(error)}`);
}

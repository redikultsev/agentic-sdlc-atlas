/**
 * Whether the AI reviewer can run on Codex: the `@review` alias in the checkout's
 * `.archon/config.yaml` names provider codex, and a Codex credential is visible to this
 * host (`CODEX_API_KEY`, the Docker `ARCHON_CODEX_*` tokens, or a login in the Codex
 * home). Reported, never failed: `reviewer-ready` in unify-round fails closed at run
 * time, and a credential connected through `archon ai key set` is not visible from here.
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { emit, refuse } from 'archon:script';
import { isObject } from '../../.shared/inputs.ts';

function reviewAlias(): { provider: string | null; model: string | null; error: string | null } {
  const path = join(process.cwd(), '.archon', 'config.yaml');
  if (!existsSync(path)) return { provider: null, model: null, error: '.archon/config.yaml not found in the checkout' };
  try {
    const parsed = Bun.YAML.parse(readFileSync(path, 'utf8')) as unknown;
    const aliases = isObject(parsed) && isObject(parsed.aliases) ? parsed.aliases : {};
    const alias = aliases['@review'] ?? aliases.review;
    if (!isObject(alias)) return { provider: null, model: null, error: 'no @review alias: the review node falls back to its tier' };
    return {
      provider: typeof alias.provider === 'string' ? alias.provider : null,
      model: typeof alias.model === 'string' ? alias.model : null,
      error: null,
    };
  } catch (error) {
    return { provider: null, model: null, error: `.archon/config.yaml does not parse: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/** The host's own environment, read by name: these are the Codex provider's variables, not run inputs. */
function hostEnv(name: string): string {
  return process.env[name] ?? '';
}

function credential(): string | null {
  for (const name of ['CODEX_API_KEY', 'ARCHON_CODEX_ID_TOKEN']) if (hostEnv(name) !== '') return name;
  const home = hostEnv('CODEX_HOME') || join(homedir(), '.codex');
  return existsSync(join(home, 'auth.json')) ? 'Codex login (auth.json)' : null;
}

function main(): void {
  const alias = reviewAlias();
  const found = credential();
  const configured = alias.provider === 'codex' && found !== null;
  const notes = [
    ...(alias.error === null ? [] : [alias.error]),
    ...(alias.provider !== null && alias.provider !== 'codex' ? [`@review resolves to ${alias.provider}, not codex`] : []),
    ...(found === null ? ['no Codex credential visible on this host (a credential connected in Archon is not visible here)'] : []),
  ];
  emit({ configured, provider: alias.provider, model: alias.model, credential: found, notes });
}

try {
  main();
} catch (error) {
  refuse(`unify-ping codex: ${error instanceof Error ? error.message : String(error)}`);
}

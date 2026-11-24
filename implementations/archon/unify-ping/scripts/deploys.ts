/**
 * How the project deploys, as the pipeline reads it (decision 48): `.pipeline/project.yaml`
 * on the base through `readDeploys`. Lists each environment (name, kind, stage, the
 * steps it declares: deploy, version, smoke, watch, gate, rollback), the release trigger
 * and the toggles. A project with no `environments` key is shape A from `deploy:`, which
 * passes. A file that does not parse fails the check with the parser's message.
 *
 * Bound inputs: the pack setting INPUTS_BASE (default main).
 */

import { emit, input, refuse } from 'archon:script';
import { type Environment, readDeploys } from '../../.shared/environments.ts';

/** The steps an environment declares, in a fixed order. */
export function stepsOf(env: Environment): string[] {
  return [
    env.deploy !== null ? 'deploy' : '',
    env.version !== null ? 'version' : '',
    env.smoke !== null ? 'smoke' : '',
    env.watch !== null ? `watch ${String(env.watch.minutes)} min` : '',
    env.gate !== null ? `gate (${env.gate.answerers.join(', ')})` : '',
    `rollback ${env.rollback}`,
  ].filter(s => s !== '');
}

function main(): void {
  const base = input('base').trim() || 'main';
  try {
    const d = readDeploys(base);
    emit({
      ok: true,
      base,
      error: null,
      legacy: d.legacy,
      environments: d.environments.map(e => ({ name: e.name, kind: e.kind, stage: e.stage, steps: stepsOf(e) })),
      trigger: d.release.trigger,
      toggles: d.toggles?.set ?? null,
    });
  } catch (error) {
    emit({ ok: false, base, error: error instanceof Error ? error.message : String(error), legacy: false, environments: [], trigger: '', toggles: null });
  }
}

try {
  main();
} catch (error) {
  refuse(`unify-ping deploys: ${error instanceof Error ? error.message : String(error)}`);
}

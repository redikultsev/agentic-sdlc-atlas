/**
 * How a project deploys (decision 48), from `.pipeline/project.yaml` on the base:
 *
 *   services:                       # optional; without it one service `app` owns every path
 *     - { name: api, paths: [services/api/**] }
 *   environments:                   # in order; `[]` means a merge is Done
 *     - name: test
 *       kind: shared                # shared | ephemeral | production
 *       stage: before-merge         # before-merge | after-merge (production is after-merge)
 *       services: [api]             # optional; default every service
 *       deploy: ./deploy/test.sh    # the recipe, a command in the project's repository
 *       version: ./deploy/version.sh test   # prints the version the target runs
 *       smoke: ./deploy/smoke.sh test       # optional smoke check
 *       watch: { minutes: 30, signals: [...] }   # optional: the Watcher's window
 *       gate: { answerers: [alice, bob] }        # optional: a person's gate (decision 50)
 *       rollback: previous          # revert | previous | forward
 *       batch: false                # one build may carry several queued items (decision 51)
 *   release: { trigger: merge }     # merge (default) | schedule | operator
 *   insignificant: [CHANGELOG.md, VERSION, docs/**]   # for the tree check (decision 49)
 *   toggles: { set: ./deploy/toggle.sh }               # optional (decision 61): `<cmd> <name> off`
 *
 * A project with no `environments` key keeps the older `deploy:` section: shape A, one
 * production environment after merge, its hook as the recipe, the Watcher's window, and
 * rollback by revert (decisions 8, 26).
 *
 * A recipe runs with PIPELINE_ENV, PIPELINE_SERVICE, PIPELINE_REF (the commit to deploy),
 * PIPELINE_ITEMS (keys, comma-separated), PIPELINE_RELEASE, PIPELINE_REASON (normal or
 * rollback), and for shape A also PIPELINE_ITEM, PIPELINE_PR and PIPELINE_REVERT.
 */

import { fromBase, globMatch } from './policy.ts';

export type Kind = 'shared' | 'ephemeral' | 'production';
export type Rollback = 'revert' | 'previous' | 'forward';

export interface Service {
  readonly name: string;
  readonly paths: readonly string[];
}

export interface Environment {
  readonly name: string;
  readonly kind: Kind;
  readonly stage: 'before-merge' | 'after-merge';
  /** Service names; null for every service. */
  readonly services: readonly string[] | null;
  readonly deploy: string | null;
  readonly version: string | null;
  readonly smoke: string | null;
  readonly watch: { readonly minutes: number; readonly signals: readonly string[] } | null;
  readonly gate: { readonly answerers: readonly string[] } | null;
  readonly rollback: Rollback;
  readonly batch: boolean;
}

export interface Deploys {
  readonly services: readonly Service[];
  readonly environments: readonly Environment[];
  readonly release: { readonly trigger: 'merge' | 'schedule' | 'operator' };
  readonly insignificant: readonly string[];
  readonly toggles: { readonly set: string } | null;
  /** True when the project declares no `environments` and shape A was derived from `deploy:`. */
  readonly legacy: boolean;
}

const ALL: Service = { name: 'app', paths: ['**'] };

type Raw = Partial<{
  services: Service[];
  environments: Partial<Environment>[];
  release: { trigger?: string };
  insignificant: string[];
  toggles: { set?: string };
  deploy: { hook?: string | null; windowMinutes?: number; signals?: string[] };
}>;

/**
 * Environment and service names become parts of state document names (`holds/<env>/<service>`,
 * deploy records), and Archon's store accepts only `[a-z0-9._-]` there: a name it would
 * refuse is refused here, when the settings are read, not at the first hold.
 */
const NAME = /^[a-z0-9._-]{1,60}$/;
function checkName(what: string, name: string): string {
  if (!NAME.test(name)) throw new Error(`project.yaml: ${what} name '${name}' must be lower case letters, digits, '.', '_' or '-' (at most 60)`);
  return name;
}

export function parseDeploys(raw: Raw | null): Deploys {
  const r = raw ?? {};
  const services = Array.isArray(r.services) && r.services.length > 0 ? r.services.map(s => ({ name: checkName('service', String(s.name)), paths: [...(s.paths ?? [])] })) : [ALL];
  const trigger = (r.release?.trigger ?? 'merge') as Deploys['release']['trigger'];
  if (!['merge', 'schedule', 'operator'].includes(trigger)) throw new Error(`project.yaml: release.trigger '${trigger}' is not merge, schedule or operator`);
  const common = {
    services,
    release: { trigger },
    insignificant: [...(r.insignificant ?? [])],
    toggles: typeof r.toggles?.set === 'string' && r.toggles.set.trim() !== '' ? { set: r.toggles.set.trim() } : null,
  };
  if (r.environments === undefined) {
    const hook = r.deploy?.hook?.trim() || null;
    return {
      ...common,
      legacy: true,
      environments: [
        {
          name: 'production',
          kind: 'production',
          stage: 'after-merge',
          services: null,
          deploy: hook,
          version: null,
          smoke: null,
          watch: { minutes: r.deploy?.windowMinutes ?? 30, signals: [...(r.deploy?.signals ?? [])] },
          gate: null,
          rollback: 'revert',
          batch: false,
        },
      ],
    };
  }
  const names = new Set(services.map(s => s.name));
  const environments = r.environments.map((e, i): Environment => {
    const name = checkName('environment', String(e.name ?? `environment-${i + 1}`));
    const kind = (e.kind ?? 'shared') as Kind;
    if (!['shared', 'ephemeral', 'production'].includes(kind)) throw new Error(`project.yaml: environment ${name} has kind '${kind}'`);
    const stage = (e.stage ?? (kind === 'production' ? 'after-merge' : 'before-merge')) as Environment['stage'];
    if (kind === 'production' && stage !== 'after-merge') throw new Error(`project.yaml: production environment ${name} must be after-merge`);
    const rollback = (e.rollback ?? (kind === 'production' ? 'revert' : 'forward')) as Rollback;
    if (!['revert', 'previous', 'forward'].includes(rollback)) throw new Error(`project.yaml: environment ${name} has rollback '${rollback}'`);
    for (const s of e.services ?? []) if (!names.has(s)) throw new Error(`project.yaml: environment ${name} names service '${s}', which is not declared`);
    const gate = e.gate && Array.isArray(e.gate.answerers) && e.gate.answerers.length > 0 ? { answerers: e.gate.answerers.map(a => a.toLowerCase()) } : null;
    return {
      name,
      kind,
      stage,
      services: e.services ? [...e.services] : null,
      deploy: e.deploy?.trim() || null,
      version: e.version?.trim() || null,
      smoke: e.smoke?.trim() || null,
      watch: e.watch ? { minutes: Number(e.watch.minutes ?? 30), signals: [...(e.watch.signals ?? [])] } : null,
      gate,
      rollback,
      batch: e.batch === true,
    };
  });
  if (new Set(environments.map(e => e.name)).size !== environments.length) throw new Error('project.yaml: two environments share a name');
  return { ...common, legacy: false, environments };
}

export function readDeploys(base: string): Deploys {
  const text = fromBase(base, '.pipeline/project.yaml');
  return parseDeploys(text === null ? null : (Bun.YAML.parse(text) as Raw));
}

/** The services whose paths the changed files touch. */
export function servicesOf(deploys: Deploys, changed: readonly string[]): Service[] {
  return deploys.services.filter(s => changed.some(path => s.paths.some(p => globMatch(p, path))));
}

/** Environments of a stage that carry any of the given services, in the declared order. */
export function environmentsFor(deploys: Deploys, stage: Environment['stage'], services: readonly Service[]): { env: Environment; services: Service[] }[] {
  return deploys.environments
    .filter(env => env.stage === stage)
    .map(env => ({ env, services: services.filter(s => env.services === null || env.services.includes(s.name)) }))
    .filter(found => found.services.length > 0);
}

export interface RecipeRun {
  readonly ok: boolean;
  readonly exit: number | null;
  readonly stdout: string;
  readonly tail: string;
}

/** Run one recipe in the launch checkout; never throws for the recipe's own failure. */
export function runRecipe(command: string, vars: Readonly<Record<string, string>>, timeoutMs = 60 * 60_000): RecipeRun {
  const result = Bun.spawnSync(['sh', '-c', command], { env: { ...process.env, ...vars }, stdout: 'pipe', stderr: 'pipe', timeout: timeoutMs });
  const stdout = result.stdout.toString();
  const tail = `${stdout}\n${result.stderr.toString()}`.trim().split('\n').slice(-20).join('\n');
  return { ok: result.exitCode === 0, exit: result.exitCode, stdout: stdout.trim(), tail };
}

/** A version the target reports is the commit when it equals it or is a prefix of at least 7 characters. */
export function sameVersion(reported: string, commit: string): boolean {
  const v = reported.trim().split(/\s+/)[0] ?? '';
  return v === commit || (v.length >= 7 && commit.startsWith(v));
}

/**
 * Deploy `ref` to one environment and service and check it there: the recipe, then the
 * running version read from the target (never from the CI server), then the smoke check.
 * A step the environment does not declare is skipped and said so.
 */
export function deployAndCheck(env: Environment, service: Service, ref: string, vars: Readonly<Record<string, string>>): { readonly ok: boolean; readonly step: 'deploy' | 'version' | 'smoke' | 'none'; readonly notes: readonly string[]; readonly tail: string } {
  const all = { PIPELINE_ENV: env.name, PIPELINE_SERVICE: service.name, PIPELINE_REF: ref, ...vars };
  const notes: string[] = [];
  if (env.deploy === null) notes.push(`${env.name} declares no deploy recipe: the merge is the deploy`);
  else {
    const run = runRecipe(env.deploy, all);
    if (!run.ok) return { ok: false, step: 'deploy', notes, tail: run.tail };
  }
  if (env.version === null) notes.push(`${env.name} declares no version read: the running version was not checked`);
  else {
    const run = runRecipe(env.version, all, 5 * 60_000);
    if (!run.ok) return { ok: false, step: 'version', notes, tail: run.tail };
    if (!sameVersion(run.stdout, ref)) return { ok: false, step: 'version', notes, tail: `${env.name} runs ${run.stdout || 'nothing'}, not ${ref}` };
  }
  if (env.smoke !== null) {
    const run = runRecipe(env.smoke, all, 30 * 60_000);
    if (!run.ok) return { ok: false, step: 'smoke', notes, tail: run.tail };
  }
  return { ok: true, step: 'none', notes, tail: '' };
}

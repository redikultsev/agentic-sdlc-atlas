/**
 * What the merge scripts share about pre-merge environments (decisions 49–51): the flags
 * an item carries in `work/<key>` while it waits for one, and the (environment, service)
 * pairs a change must pass before it merges.
 */

import { environmentsFor, servicesOf, type Deploys, type Environment, type Service } from '../../../.shared/environments.ts';

/** The ruling's output, as land, env and test-ruling read it. */
export interface Ruled {
  readonly decision: string;
  readonly pr: number;
  readonly head: string;
  readonly fingerprint: string;
  readonly operator: boolean;
  readonly revert: boolean;
}

/** The env pass's output, as test-ruling and next read it. */
export interface EnvPass {
  readonly go: 'land' | 'queued' | 'ask' | 'gate' | 'round';
  readonly kind: '' | 'env-ask' | 'test-gate';
  readonly env: string;
  readonly service: string;
  readonly commit: string;
  readonly tree: string;
  readonly answerers: string;
  readonly remaining: number;
  readonly start: readonly string[];
  readonly notes: readonly string[];
}

/** The PR is merged and the Operator sent it back to the environment on the merged base (decision 49). */
export const RECHECK = 'recheck';

/** Waiting in the queue of a shared environment (decision 51): a condition inside Verifying. */
export { queuedFlag } from '../../../.shared/holds.ts';

/** The Operator chose to deploy over what a shared environment runs; used once. */
export function takeFlag(env: string, service: string): string {
  return `take:${env}/${service}`;
}

export interface Pair {
  readonly env: Environment;
  readonly service: Service;
}

/** Every pre-merge (environment, service) the changed files reach, in the declared order. */
export function prePairs(deploys: Deploys, changed: readonly string[]): Pair[] {
  return environmentsFor(deploys, 'before-merge', servicesOf(deploys, changed)).flatMap(({ env, services }) => services.map(service => ({ env, service })));
}

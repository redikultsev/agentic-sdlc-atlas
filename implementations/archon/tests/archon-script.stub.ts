/**
 * `bun test` preload: an in-memory `archon:script` for the pack's shared modules. It
 * keeps the parts the modules under test use: the state store with revisions and
 * conditional writes, and a few issues with labels behind `forge` (the tracker itself is
 * faked one level up, as a connector adapter: `fake-tracker.ts`). Every call is
 * recorded, and a test can make the next write of a document lose a race or a label
 * write fail. Nothing here talks to an engine.
 */
import { plugin } from 'bun';

type Doc = { revision: number; value: unknown };
type Issue = { state: 'open' | 'closed'; labels: string[] };

export const fake = {
  docs: new Map<string, Doc>(),
  issues: new Map<number, Issue>(),
  calls: [] as { op: string; request: unknown }[],
  /** Before the next put of this document lands, run this (another run's write). */
  racePut: new Map<string, () => void>(),
  /** Label operations that throw, by label name. */
  failLabel: new Set<string>(),
  reset() {
    this.docs.clear();
    this.issues.clear();
    this.calls.length = 0;
    this.racePut.clear();
    this.failLabel.clear();
  },
  issue(number: number, labels: string[] = []) {
    this.issues.set(number, { state: 'open', labels: [...labels] });
  },
  labels(number: number): string[] {
    return [...(this.issues.get(number)?.labels ?? [])];
  },
};

class ForgeError extends Error {}

const state = {
  get(name: string) {
    const doc = fake.docs.get(name);
    return { name, revision: doc?.revision ?? 0, value: doc?.value ?? null, lease: null };
  },
  put(name: string, value: unknown, options: { ifRevision: number }) {
    const race = fake.racePut.get(name);
    if (race) {
      fake.racePut.delete(name);
      race();
    }
    const current = fake.docs.get(name)?.revision ?? 0;
    if (current !== options.ifRevision) return { ok: false, conflict: 'revision_moved' };
    fake.docs.set(name, { revision: current + 1, value: structuredClone(value) });
    return { ok: true, revision: { revision: current + 1 } };
  },
  listValues(prefix = '') {
    return [...fake.docs.entries()]
      .filter(([name, doc]) => name.startsWith(prefix) && doc.value !== null)
      .map(([name, doc]) => ({ name, revision: doc.revision, value: structuredClone(doc.value), lease: null }));
  },
};

function forge(op: string, request: any): any {
  fake.calls.push({ op, request: structuredClone(request) });
  const number: number = request.ref?.number ?? request.subject?.ref?.number;
  const issue = fake.issues.get(number);
  if (!issue) throw new ForgeError(`${op}: no issue #${number}`);
  switch (op) {
    case 'workitem.view':
      return { state: issue.state, labels: [...issue.labels] };
    case 'workitem.label.add':
      if (fake.failLabel.has(request.name)) throw new ForgeError(`label.add ${request.name} failed`);
      if (!issue.labels.includes(request.name)) issue.labels.push(request.name);
      return {};
    case 'workitem.label.remove':
      if (fake.failLabel.has(request.name)) throw new ForgeError(`label.remove ${request.name} failed`);
      issue.labels = issue.labels.filter(l => l !== request.name);
      return {};
    default:
      throw new Error(`the stub has no forge op ${op}`);
  }
}

plugin({
  name: 'archon-script-stub',
  setup(build) {
    build.module('archon:script', () => ({
      loader: 'object',
      exports: {
        state,
        forge,
        ForgeError,
        input: () => undefined,
        runId: () => 'run-1',
        emit: () => {},
        refuse: (reason: string) => {
          throw new Error(`refused: ${reason}`);
        },
        outcomes: () => ({ nodes: [] }),
        trigger: { fire: () => ({ disposition: { status: 'admitted' } }) },
      },
    }));
  },
});

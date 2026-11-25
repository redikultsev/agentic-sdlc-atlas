/**
 * Canned Archon answers for the read server's tests: what the CLI prints for each listed
 * read, and what the two HTTP routes return. Used by the unit tests through fake seams and
 * by `fake-archon.ts`, the stand-in `archon` binary of the end-to-end test.
 */

const project = { kind: 'project', key: 'acme/shop' };

export const WORK = {
  'work/12': { state: 'implementing', rounds: 1, flags: [], urgent: false, verdicts: [], slices: [] },
  'work/13': { state: 'merge-review', rounds: 0, flags: [], urgent: true, verdicts: [], slices: [] },
  'work/14': { state: 'merge-review', rounds: 0, flags: ['set-aside'], urgent: false, verdicts: [], slices: [] },
  'work/proj-7': { state: 'releasing', rounds: 0, flags: [], urgent: false, verdicts: [], slices: [] },
} as const;

export const PROVENANCE = { item: '#12', pack: ['sha256:aaaa'], roles: { implementer: { models: ['model-i'], sessions: 2, seconds: 600, usd: 1.5, costNotReported: 0 } } };

export const HOLDS = {
  'holds/staging/api': { holder: '#12', since: '2026-11-25T10:00:00Z', queue: ['#13', '#14'], returning: [], build: null },
  'holds/staging/web': { holder: null, since: null, queue: [], returning: [], build: null },
};

export const RELEASES = {
  'releases/r1': { id: 'r1', at: '2026-11-24T10:00:00Z', commit: 'c1', items: ['#10'], reason: 'normal', urgent: false, envs: { production: { status: 'verified', at: '2026-11-24T11:00:00Z', note: '' } } },
  'releases/r2': { id: 'r2', at: '2026-11-25T10:00:00Z', commit: 'c2', items: ['PROJ-7'], reason: 'normal', urgent: false, envs: { staging: { status: 'deployed', at: '2026-11-25T10:10:00Z', note: '' } } },
};

export const GATES = { 'release-gates/r2': { staging: { status: 'open', at: '2026-11-25T10:20:00Z', note: '' } } };

export const LINE = { blocked: null };

export const FINDINGS = {
  'findings/bbb': { id: 'bbb', item: '#13', role: 'reviewer', where: 'b.ts', what: 'second', evidence: 'e', at: '2026-11-25T09:00:00Z' },
  'findings/aaa': { id: 'aaa', item: '#12', role: 'implementer', where: 'a.ts', what: 'first', evidence: 'e', at: '2026-11-24T09:00:00Z' },
  'findings/ccc': { id: 'ccc', item: '#12', role: 'validator', where: 'c.ts', what: 'third', evidence: 'e', at: '2026-11-25T12:00:00Z' },
};

export const RUN_ID = '3f2a9c1e-0b7d-4e55-9a10-6c2d8e4f1a77';

export const RUN = {
  id: RUN_ID,
  workflow_name: 'unify-round',
  status: 'completed',
  outcome: 'succeeded',
  started_at: '2026-11-25T10:00:00Z',
  completed_at: '2026-11-25T10:30:00Z',
  metadata: { workflow_source: { digest: 'sha256:aaaa' }, total_cost_usd: 2.75 },
  nodes: [
    {
      nodeId: 'implement',
      state: 'completed',
      durationMs: 1_200_000,
      execution: {
        node: { kind: 'agent', id: 'implement' },
        binding: { model: { requested: '@implementer', resolved: { source: 'provider', value: 'model-i-2' } } },
        timing: { durationMs: 1_200_000 },
        spend: { costUsd: { source: 'provider', value: 2.75 } },
      },
    },
    {
      nodeId: 'review',
      state: 'completed',
      execution: {
        node: { kind: 'agent', id: 'review' },
        binding: { model: { requested: '@review', resolved: { source: 'unavailable', reason: 'not_reported' } } },
        spend: { costUsd: { source: 'unavailable', reason: 'unsupported' } },
      },
    },
    { nodeId: 'slices', state: 'completed', execution: { node: { kind: 'workflow' } }, fanOutOutcome: { slots: [{ child_run_id: 'child-run-0001' }] } },
    { nodeId: 'commit', state: 'completed', execution: { node: { kind: 'script' } } },
  ],
};

export const ITEM = {
  item: { id: 'i1', projectKey: 'acme/shop', key: 'issue-12' },
  runs: [{ id: RUN_ID, workflow: 'unify-round', status: 'completed', outcome: 'succeeded', spend: { usd: 2.75, inputTokens: 1, outputTokens: 1 } }],
  queued: [],
  skipped: [],
  hold: null,
  held: [],
  questions: [{ kind: 'attention', runId: RUN_ID }],
  answers: [],
  links: [],
  merged: null,
  landing: null,
};

export const ATTENTION = {
  ok: true,
  items: [
    { kind: 'awaiting_response', runId: RUN_ID, project: { key: 'acme/shop' } },
    { kind: 'attention', runId: 'another-run-0002', project: { key: 'acme/shop' } },
    { kind: 'usage_limit', runId: 'another-run-0003', project: { key: 'acme/shop' } },
  ],
};

function list(docs: Record<string, unknown>) {
  return { scope: project, documents: Object.entries(docs).map(([name, value], i) => ({ name, revision: i + 1, value, lease: null })) };
}

/** What the fake CLI prints for an argv; anything unlisted fails like Archon does. */
export function cliOutput(argv: readonly string[]): { code: number; stdout: string } {
  const ok = (v: unknown) => ({ code: 0, stdout: JSON.stringify(v) });
  const [a, b, c, d] = argv;
  if (a === 'state' && b === 'get') {
    const docs: Record<string, unknown> = { ...WORK, 'provenance/12': PROVENANCE, 'releases-line': LINE };
    const value = docs[c ?? ''] ?? null;
    return ok({ scope: project, name: c, revision: value === null ? 0 : 3, value, lease: null });
  }
  if (a === 'state' && b === 'list' && c === '--prefix') {
    const families: Record<string, Record<string, unknown>> = { 'work/': WORK, 'holds/': HOLDS, 'releases/': RELEASES, 'release-gates/': GATES, 'findings/': FINDINGS };
    return ok(list(families[d ?? ''] ?? {}));
  }
  if (a === 'workflow' && b === 'get' && c === RUN_ID) return ok(RUN);
  return { code: 1, stdout: JSON.stringify({ ok: false, error: `unknown: ${argv.join(' ')}`, code: 1 }) };
}

/** What the fake server answers for a GET path and query. */
export function httpOutput(path: string, query: URLSearchParams): { status: number; body: unknown } {
  if (path === '/api/items') return query.get('key') === 'issue-12' ? { status: 200, body: ITEM } : { status: 404, body: { error: 'not_found' } };
  if (path === '/api/runs/attention') return { status: 200, body: ATTENTION };
  return { status: 404, body: { error: 'no route' } };
}

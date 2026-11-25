/**
 * An in-memory stand-in for the part of GitHub's REST API the request server uses: the
 * token's account, a repository, listing issues by creator, creating an issue, reading one,
 * adding labels. As the server's `Http` seam (`http`) or as a local HTTP server (`serve`).
 * It records every request and refuses one without the expected token.
 */

import type { Http, HttpResponse } from '../request-server/github.ts';

export interface FakeIssue {
  number: number;
  title: string;
  body: string;
  labels: string[];
  user: string;
  created_at: string;
  pull_request?: unknown;
}

export interface Seen {
  method: string;
  path: string;
  body: unknown;
  auth: string | null;
}

export class FakeGitHub {
  readonly issues = new Map<string, FakeIssue[]>();
  readonly seen: Seen[] = [];
  readonly hasIssues = new Map<string, boolean>();
  /** Labels the create drops, as GitHub does for an account without push access. */
  dropLabelsOnCreate = false;
  /** A failure for the next create. */
  failCreate: { status: number; message: string } | null = null;
  /** Created issues that never read back with labels, whatever is added. */
  refuseLabels = false;
  now: () => Date = () => new Date();

  constructor(
    readonly token: string,
    readonly login = 'request-bot'
  ) {}

  repo(project: string): FakeIssue[] {
    let list = this.issues.get(project.toLowerCase());
    if (list === undefined) this.issues.set(project.toLowerCase(), (list = []));
    return list;
  }

  /** An issue someone filed earlier. */
  seed(project: string, issue: Partial<FakeIssue> & { title: string; body: string }): FakeIssue {
    const list = this.repo(project);
    const made: FakeIssue = { number: list.length + 1, labels: [], user: this.login, created_at: this.now().toISOString(), ...issue };
    list.push(made);
    return made;
  }

  creates(): Seen[] {
    return this.seen.filter(s => s.method === 'POST' && /\/issues$/u.test(s.path));
  }

  private shape(project: string, i: FakeIssue) {
    return {
      number: i.number,
      html_url: `https://github.example/${project}/issues/${i.number}`,
      title: i.title,
      body: i.body,
      labels: i.labels.map(name => ({ name })),
      user: { login: i.user },
      created_at: i.created_at,
      ...(i.pull_request === undefined ? {} : { pull_request: i.pull_request }),
    };
  }

  handle(method: string, rawPath: string, body: unknown, auth: string | null): HttpResponse {
    this.seen.push({ method, path: rawPath, body, auth });
    if (auth !== `Bearer ${this.token}`) return { status: 401, body: { message: 'Bad credentials' } };
    const url = new URL(rawPath, 'http://fake');
    const path = url.pathname.replace(/^\/api\/v3/u, '');
    if (method === 'GET' && path === '/user') return { status: 200, body: { login: this.login } };
    const m = /^\/repos\/([^/]+)\/([^/]+)(\/issues(?:\/(\d+)(\/labels)?)?)?$/u.exec(path);
    if (m === null) return { status: 404, body: { message: 'Not Found' } };
    const project = `${decodeURIComponent(m[1])}/${decodeURIComponent(m[2])}`;
    const list = this.repo(project);
    if (m[3] === undefined) {
      return method === 'GET' ? { status: 200, body: { full_name: project, has_issues: this.hasIssues.get(project.toLowerCase()) ?? true } } : { status: 404, body: null };
    }
    if (m[4] === undefined) {
      if (method === 'GET') {
        const q = url.searchParams;
        const creator = q.get('creator');
        const page = Number(q.get('page') ?? '1');
        const per = Number(q.get('per_page') ?? '30');
        const found = list.filter(i => creator === null || i.user === creator).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.number - a.number);
        return { status: 200, body: found.slice((page - 1) * per, page * per).map(i => this.shape(project, i)) };
      }
      if (this.failCreate !== null) {
        const f = this.failCreate;
        this.failCreate = null;
        return { status: f.status, body: { message: f.message } };
      }
      const b = body as { title: string; body: string; labels?: string[] };
      const issue = this.seed(project, { title: b.title, body: b.body, labels: this.dropLabelsOnCreate ? [] : [...(b.labels ?? [])] });
      return { status: 201, body: this.shape(project, issue) };
    }
    const issue = list.find(i => i.number === Number(m[4]));
    if (issue === undefined) return { status: 404, body: { message: 'Not Found' } };
    if (m[5] === undefined) return method === 'GET' ? { status: 200, body: this.shape(project, issue) } : { status: 404, body: null };
    if (method !== 'POST') return { status: 404, body: null };
    if (!this.refuseLabels) for (const l of (body as { labels: string[] }).labels) if (!issue.labels.includes(l)) issue.labels.push(l);
    return { status: 200, body: issue.labels.map(name => ({ name })) };
  }

  /** The server's seam, as the real client would call with this token. */
  http(token = this.token): Http {
    return async ({ method, path, body }) => this.handle(method, path, body === undefined ? undefined : structuredClone(body), `Bearer ${token}`);
  }

  serve(): ReturnType<typeof Bun.serve> {
    return Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      fetch: async req => {
        const url = new URL(req.url);
        const text = await req.text();
        const out = this.handle(req.method, url.pathname + url.search, text === '' ? undefined : JSON.parse(text), req.headers.get('authorization'));
        return Response.json(out.body, { status: out.status });
      },
    });
  }
}

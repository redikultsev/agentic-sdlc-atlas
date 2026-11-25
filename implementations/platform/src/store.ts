/**
 * The platform's durable state in one SQLite file (bun:sqlite): items, runs, decision
 * requests, answers, users, events. Every change of a run is one transaction, so a crash
 * leaves a run at its last finished step and the engine resumes it from there.
 */

import { Database } from 'bun:sqlite';
import type { DecisionCard } from '../../archon/.shared/card.ts';

export interface Repo {
  /** A short name, unique within the item ("api", "web"). */
  readonly name: string;
  /** The local checkout an agent works in. */
  readonly path: string;
  readonly base: string;
}

export interface Item {
  readonly key: string;
  readonly title: string;
  readonly body: string;
  readonly repos: readonly Repo[];
  readonly createdAt: string;
}

export type RunStatus = 'running' | 'waiting' | 'done' | 'failed';

export interface Run {
  readonly id: string;
  readonly itemKey: string;
  readonly workflow: string;
  readonly step: string;
  readonly status: RunStatus;
  /** Outputs by step id, the run's whole memory. */
  readonly data: Readonly<Record<string, unknown>>;
  readonly reason: string | null;
  readonly updatedAt: string;
}

export interface DecisionRequest {
  readonly id: string;
  readonly runId: string;
  readonly step: string;
  readonly card: DecisionCard;
  readonly status: 'open' | 'answered';
  readonly createdAt: string;
}

export interface Answer {
  readonly requestId: string;
  readonly option: string;
  readonly text: string;
  readonly user: string;
  readonly role: string;
  readonly at: string;
}

export type Role = 'operator' | 'member';

const now = (): string => new Date().toISOString();

export class Store {
  readonly db: Database;

  constructor(path = ':memory:') {
    this.db = new Database(path, { create: true });
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS items (key TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, repos TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, item_key TEXT NOT NULL REFERENCES items(key), workflow TEXT NOT NULL, step TEXT NOT NULL,
        status TEXT NOT NULL, data TEXT NOT NULL, reason TEXT, updated_at TEXT NOT NULL);
      -- One live run per item and workflow (decision 9: two runs never do the same work).
      CREATE UNIQUE INDEX IF NOT EXISTS one_live_run ON runs(item_key, workflow) WHERE status IN ('running', 'waiting');
      CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), step TEXT NOT NULL, card TEXT NOT NULL,
        status TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS answers (request_id TEXT PRIMARY KEY REFERENCES requests(id), option TEXT NOT NULL, text TEXT NOT NULL,
        user TEXT NOT NULL, role TEXT NOT NULL, at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS users (token TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT, kind TEXT NOT NULL, payload TEXT NOT NULL, at TEXT NOT NULL);
    `);
  }

  tx<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  addItem(item: Omit<Item, 'createdAt'>): Item {
    const names = new Set<string>();
    for (const r of item.repos) {
      if (names.has(r.name)) throw new Error(`repository '${r.name}' is named twice on ${item.key}`);
      names.add(r.name);
    }
    const created = { ...item, createdAt: now() };
    this.db.query('INSERT INTO items (key, title, body, repos, created_at) VALUES (?, ?, ?, ?, ?)').run(item.key, item.title, item.body, JSON.stringify(item.repos), created.createdAt);
    return created;
  }

  item(key: string): Item | null {
    const row = this.db.query('SELECT * FROM items WHERE key = ?').get(key) as Record<string, string> | null;
    return row && { key: row.key, title: row.title, body: row.body, repos: JSON.parse(row.repos), createdAt: row.created_at };
  }

  createRun(id: string, itemKey: string, workflow: string, step: string): Run {
    try {
      this.db.query('INSERT INTO runs (id, item_key, workflow, step, status, data, reason, updated_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)').run(id, itemKey, workflow, step, 'running', '{}', now());
    } catch (error) {
      if (String(error).includes('UNIQUE')) throw new Error(`${itemKey} already has a live ${workflow} run`);
      throw error;
    }
    this.event(id, 'run.started', { itemKey, workflow });
    return this.run(id)!;
  }

  run(id: string): Run | null {
    const row = this.db.query('SELECT * FROM runs WHERE id = ?').get(id) as Record<string, string> | null;
    return row && { id: row.id, itemKey: row.item_key, workflow: row.workflow, step: row.step, status: row.status as RunStatus, data: JSON.parse(row.data), reason: row.reason, updatedAt: row.updated_at };
  }

  runs(status?: RunStatus): Run[] {
    const rows = (status ? this.db.query('SELECT id FROM runs WHERE status = ? ORDER BY updated_at').all(status) : this.db.query('SELECT id FROM runs ORDER BY updated_at').all()) as { id: string }[];
    return rows.map(r => this.run(r.id)!);
  }

  /** Records a finished step and where the run goes next, in one write. */
  saveStep(runId: string, stepId: string, output: unknown, next: { step: string; status: RunStatus; reason?: string | null }): void {
    const run = this.run(runId);
    if (run === null) throw new Error(`no run ${runId}`);
    const data = { ...run.data, [stepId]: output };
    this.db.query('UPDATE runs SET step = ?, status = ?, data = ?, reason = ?, updated_at = ? WHERE id = ?').run(next.step, next.status, JSON.stringify(data), next.reason ?? null, now(), runId);
    this.event(runId, 'step.done', { step: stepId, next: next.step, status: next.status });
  }

  setStatus(runId: string, status: RunStatus, reason: string | null = null): void {
    this.db.query('UPDATE runs SET status = ?, reason = ?, updated_at = ? WHERE id = ?').run(status, reason, now(), runId);
    this.event(runId, `run.${status}`, { reason });
  }

  openRequest(id: string, runId: string, step: string, card: DecisionCard): DecisionRequest {
    this.db.query('INSERT INTO requests (id, run_id, step, card, status, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, runId, step, JSON.stringify(card), 'open', now());
    return this.request(id)!;
  }

  request(id: string): DecisionRequest | null {
    const row = this.db.query('SELECT * FROM requests WHERE id = ?').get(id) as Record<string, string> | null;
    return row && { id: row.id, runId: row.run_id, step: row.step, card: JSON.parse(row.card), status: row.status as 'open' | 'answered', createdAt: row.created_at };
  }

  requests(status: 'open' | 'answered'): DecisionRequest[] {
    return (this.db.query('SELECT id FROM requests WHERE status = ? ORDER BY created_at').all(status) as { id: string }[]).map(r => this.request(r.id)!);
  }

  recordAnswer(answer: Answer): void {
    this.db.query('INSERT INTO answers (request_id, option, text, user, role, at) VALUES (?, ?, ?, ?, ?, ?)').run(answer.requestId, answer.option, answer.text, answer.user, answer.role, answer.at);
    this.db.query("UPDATE requests SET status = 'answered' WHERE id = ?").run(answer.requestId);
  }

  answer(requestId: string): Answer | null {
    const row = this.db.query('SELECT * FROM answers WHERE request_id = ?').get(requestId) as Record<string, string> | null;
    return row && { requestId: row.request_id, option: row.option, text: row.text, user: row.user, role: row.role, at: row.at };
  }

  addUser(token: string, name: string, role: Role): void {
    this.db.query('INSERT OR REPLACE INTO users (token, name, role) VALUES (?, ?, ?)').run(token, name, role);
  }

  user(token: string): { name: string; role: Role } | null {
    return (this.db.query('SELECT name, role FROM users WHERE token = ?').get(token) as { name: string; role: Role } | null) ?? null;
  }

  event(runId: string | null, kind: string, payload: unknown): void {
    this.db.query('INSERT INTO events (run_id, kind, payload, at) VALUES (?, ?, ?, ?)').run(runId, kind, JSON.stringify(payload), now());
  }

  events(runId: string): { kind: string; payload: unknown }[] {
    return (this.db.query('SELECT kind, payload FROM events WHERE run_id = ? ORDER BY id').all(runId) as { kind: string; payload: string }[]).map(e => ({ kind: e.kind, payload: JSON.parse(e.payload) }));
  }

  close(): void {
    this.db.close();
  }
}

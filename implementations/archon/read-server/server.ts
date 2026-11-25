#!/usr/bin/env bun
/**
 * The pipeline's read-only MCP server over stdio (decision 63). Run with Bun:
 *   bun implementations/archon/read-server/server.ts
 * Settings come from the environment only (README.md); stdout carries JSON-RPC alone,
 * diagnostics go to stderr.
 */

import { tmpdir } from 'node:os';
import { handleLine, type Settings } from './protocol.ts';
import { cliSpawner, httpConfig, httpFetcher } from './sources.ts';
import { TOOLS } from './tools.ts';

function number(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${name} must be an integer from ${min} to ${max}`);
  return n;
}

function command(): string[] {
  const raw = process.env.ARCHON_READ_CLI;
  if (raw === undefined || raw === '') return ['archon'];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('ARCHON_READ_CLI must be a JSON string array, e.g. ["archon"]');
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(p => typeof p === 'string' && p !== '')) {
    throw new Error('ARCHON_READ_CLI must be a non-empty JSON string array');
  }
  return parsed as string[];
}

function settings(): Settings {
  return {
    spawn: cliSpawner(command(), process.env.ARCHON_READ_CWD || tmpdir(), process.env),
    fetcher: httpFetcher,
    http: httpConfig(process.env),
    timeoutMs: number('ARCHON_READ_TIMEOUT_MS', 20_000, 100, 300_000),
    maxBytes: number('ARCHON_READ_MAX_BYTES', 60_000, 1_000, 2_000_000),
    rawBytes: number('ARCHON_READ_RAW_BYTES', 16 * 1024 * 1024, 1_000, 256 * 1024 * 1024),
  };
}

function main(): void {
  let config: Settings;
  try {
    config = settings();
  } catch (e) {
    process.stderr.write(`unify-sdlc-read: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(2);
  }
  process.on('uncaughtException', e => process.stderr.write(`unify-sdlc-read: uncaught: ${e instanceof Error ? e.message : String(e)}\n`));
  process.on('unhandledRejection', e => process.stderr.write(`unify-sdlc-read: unhandled: ${e instanceof Error ? e.message : String(e)}\n`));
  const write = (line: string) => process.stdout.write(`${line}\n`);
  let buffer = '';
  const pending = new Set<Promise<void>>();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line === '') continue;
      const done: Promise<void> = handleLine(TOOLS, config, line)
        .then(out => {
          if (out !== null) write(out);
        })
        .catch(e => {
          process.stderr.write(`unify-sdlc-read: ${e instanceof Error ? e.message : String(e)}\n`);
        })
        .finally(() => pending.delete(done));
      pending.add(done);
    }
    if (buffer.length > 4 * 1024 * 1024) {
      buffer = '';
      write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'request line over 4 MiB' } }));
    }
  });
  // The client closed stdin: answer what is in flight, then leave.
  process.stdin.on('end', () => {
    void Promise.allSettled([...pending]).then(() => process.exit(0));
  });
}

main();

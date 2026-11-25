#!/usr/bin/env bun
/**
 * The pipeline's read-only MCP server over stdio (decision 63). Run with Bun:
 *   bun implementations/archon/read-server/server.ts
 * Settings come from the environment only (README.md); stdout carries JSON-RPC alone,
 * diagnostics go to stderr.
 */

import { tmpdir } from 'node:os';
import { serveStdio } from '../.shared/mcp-serve.ts';
import { readHandler, type Settings } from './protocol.ts';
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
  serveStdio(readHandler(TOOLS, config), 'unify-sdlc-read');
}

main();

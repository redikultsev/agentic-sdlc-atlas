/**
 * The MCP server line the Operator passes to unify-setup, in the shape `.shared/map.ts`
 * describes (`{ command, args?, env? }` or `{ type: http, url, headers? }`). A secret is
 * never written in it: a value under a name that reads like a credential (token, key,
 * secret, password, auth, cookie) may hold only `${NAME}` references, with an optional
 * scheme word such as `Bearer`, so the map that copies the line carries no token.
 */

import type { McpServer } from '../../../.shared/mcp.ts';

const SECRET_NAME = /token|secret|passw|key|auth|cookie|credential/i;
const SCHEME = /^(bearer|basic|token)\s+/i;

export function parseServer(raw: string): McpServer {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new Error(`server is not JSON: ${(error as Error).message}`);
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('server must be a JSON object');
  const s = value as Record<string, unknown>;
  if (s.type === 'http') {
    if (typeof s.url !== 'string' || !/^https?:\/\//.test(s.url)) throw new Error('an http server needs a url starting with http:// or https://');
    secrets('headers', s.headers);
  } else {
    if (s.type !== undefined && s.type !== 'stdio') throw new Error(`server type '${String(s.type)}' is neither stdio nor http`);
    if (typeof s.command !== 'string' || s.command.trim() === '') throw new Error('a stdio server needs a command');
    if (s.args !== undefined && (!Array.isArray(s.args) || s.args.some(a => typeof a !== 'string'))) throw new Error('server args must be a list of strings');
    secrets('env', s.env);
  }
  return value as McpServer;
}

function secrets(where: string, values: unknown): void {
  if (values === undefined) return;
  if (typeof values !== 'object' || values === null || Array.isArray(values)) throw new Error(`server ${where} must be an object`);
  for (const [name, v] of Object.entries(values)) {
    if (typeof v !== 'string') throw new Error(`server ${where}.${name} must be a string`);
    if (!SECRET_NAME.test(name)) continue;
    const rest = v.replace(SCHEME, '').replace(/\$\{[A-Za-z_][A-Za-z0-9_]*\}/g, '').trim();
    if (rest !== '' || !v.includes('${')) throw new Error(`server ${where}.${name} must name an environment variable as \${NAME}, never hold the value`);
  }
}

/** The same server, whatever the key order. */
export function sameServer(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

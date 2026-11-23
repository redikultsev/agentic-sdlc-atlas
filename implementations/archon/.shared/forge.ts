/**
 * Archon's `forge` with one rule applied for every marked write: the forge finds a
 * marked comment or issue again by its body's FIRST LINE, and refuses a write whose
 * first line is not exactly the marker (adapters/src/forge/github/comments.ts). Every
 * script imports `forge` from here, passes a short marker key such as
 * `pipeline-ruling:<run>:<gate>`, and gets the canonical form `<!-- unify:<key> -->` as
 * the marker and as the body's first line, so nobody has to remember the rule.
 */

import { forge as raw, type ForgeOperations } from 'archon:script';

export function canonicalMarker(marker: string): string {
  const trimmed = marker.trim();
  return trimmed.startsWith('<!--') ? trimmed : `<!-- unify:${trimmed} -->`;
}

function marked<T extends { marker: string; body: string }>(request: T): T {
  const marker = canonicalMarker(request.marker);
  const first = request.body.split(/\r?\n/, 1)[0] ?? '';
  const body = first === marker ? request.body : `${marker}\n${request.body}`;
  return { ...request, marker, body };
}

export function forge<Op extends keyof ForgeOperations>(
  op: Op,
  request: ForgeOperations[Op]['request']
): ForgeOperations[Op]['result'] {
  if (op === 'workitem.comment.upsert' || op === 'workitem.create') {
    return raw(op, marked(request as unknown as { marker: string; body: string }) as unknown as ForgeOperations[Op]['request']);
  }
  return raw(op, request);
}

export { ForgeError } from 'archon:script';

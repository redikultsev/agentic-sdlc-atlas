/**
 * Whose text reaches an agent (decision 39). A request from a trusted author goes to
 * Triage; any other waits for the label `pipeline:approved`, set by the Operator or a
 * trusted author, and that approval holds only for the body it was given on: the digest
 * is pinned in a marker comment, and an edit withdraws it. Every other text an agent reads
 * from someone not trusted (comments, alerts, code comments) is passed as marked data.
 */

import { createHash } from 'node:crypto';
import { tracker } from './connector.ts';
import type { ItemKey } from './item.ts';

export function digest(text: string): string {
  return createHash('sha256').update(text.replace(/\r\n/g, '\n').trim()).digest('hex').slice(0, 16);
}

export const APPROVAL_MARKER = 'pipeline-approval';

/**
 * The body digest pinned by the latest approval comment written by a trusted author or by
 * the pipeline's own account (`pipeline_login`). A marker in anyone else's comment is
 * ignored: it would let anyone approve their own request.
 */
export async function pinnedDigest(key: ItemKey, trusted: readonly string[], pipelineLogin: string): Promise<string | null> {
  const comments = await tracker().comments(key);
  const allowed = new Set([...trusted, pipelineLogin.toLowerCase()]);
  for (const comment of [...comments].reverse()) {
    const login = comment.author?.toLowerCase();
    if (login === undefined || !allowed.has(login)) continue;
    const match = new RegExp(`<!-- ${APPROVAL_MARKER}:([0-9a-f]{16}) -->`).exec(comment.body);
    if (match) return match[1];
  }
  return null;
}

/** Quote someone's text so an agent reads it as data, never as instructions. */
export function untrusted(source: string, text: string): string {
  const fenced = text.replaceAll('```', '`​``');
  return `<untrusted source="${source}">\n${fenced}\n</untrusted>`;
}

export function isTrusted(login: string | null | undefined, trusted: readonly string[]): boolean {
  return login !== null && login !== undefined && trusted.includes(login.toLowerCase());
}

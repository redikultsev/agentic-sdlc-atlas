/**
 * A work item's key, the same whatever tracker holds the item (decision 45): `#12` for an
 * issue on the project's code host, `PROJ-123` for a tracker key such as Jira's. The key
 * names the item's document in the engine's store, its branch and its runs; nothing else
 * about the tracker is in it.
 *
 * `work/12` is the document of `#12`, as it was before keys, so documents written by
 * earlier versions of the pack stay where they are.
 */

export type ItemKey = string;

const ISSUE = /^#?([1-9][0-9]*)$/;
const TRACKER = /^[A-Z][A-Z0-9_]*-[1-9][0-9]*$/;

/** The key of an issue number on the code host. */
export function issueKey(number: number): ItemKey {
  if (!Number.isInteger(number) || number <= 0) throw new Error(`not an issue number: ${number}`);
  return `#${number}`;
}

/** A key from what a person or a binding wrote (`12`, `#12`, `PROJ-123`), or null. */
export function parseKey(raw: string): ItemKey | null {
  const value = raw.trim();
  const issue = ISSUE.exec(value);
  if (issue) return `#${issue[1]}`;
  return TRACKER.test(value) ? value : null;
}

/** The issue number of a code-host key, or null for a tracker key. */
export function issueNumber(key: ItemKey): number | null {
  const issue = ISSUE.exec(key);
  return issue ? Number(issue[1]) : null;
}

/** The key as a path segment: `12` for `#12`, the key itself otherwise. */
export function keySlug(key: ItemKey): string {
  const number = issueNumber(key);
  if (number !== null) return String(number);
  if (!TRACKER.test(key)) throw new Error(`not an item key: ${key}`);
  return key;
}

/** Accepts a key or, from callers not moved to keys yet, an issue number. */
export function asKey(item: ItemKey | number): ItemKey {
  return typeof item === 'number' ? issueKey(item) : item;
}

/**
 * The engine's key for the runs of an item: `issue-12` for `#12`, as before keys, so runs
 * on the trial server keep their history; `item-PROJ-123` for a tracker key.
 */
export function runKey(item: ItemKey | number): string {
  const key = asKey(item);
  const number = issueNumber(key);
  return number === null ? `item-${key}` : `issue-${number}`;
}

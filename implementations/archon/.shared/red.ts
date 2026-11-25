/**
 * Red before green (decision 58): the Implementer runs each new test alone before it writes
 * the code and returns what the test printed when it failed. This module reads that answer,
 * keeps it per item in `work/<key>` (`redRecords`), writes the PR section that lists it, and
 * holds the one rule code enforces: in a bug fix, at least one new test must have a red
 * record, or the round counts a required fix. Whether a red test reproduces the bug is the
 * AI reviewer's call; it reads the records and, in doubt, runs one test on the base branch.
 * No script runs tests again (the owner rejected a second run).
 */

/** One new test as the Implementer returned it: its red output, or why it has none. */
export interface TestRecord {
  readonly name: string;
  readonly file: string;
  readonly command: string;
  /** The failing part of what the test printed before the code, at most 40 lines; null when it has no red run. */
  readonly red: string | null;
  /** Why the test has no red run (for example: guards old behaviour); null when it has one. */
  readonly why_no_red: string | null;
}

/** What one slice run left: its new tests and the steps it could not run. */
export interface SliceRecord {
  /** The slice id for a planned slice, so its re-run replaces it; `fix:<run id>` for a fix slice, so every fix round keeps its own. */
  readonly key: string;
  readonly slice: string;
  readonly at: string;
  readonly tests: readonly TestRecord[];
  readonly skipped: readonly string[];
}

export const RED_LINES = 40;
const RED_CHARS = 1000;
/** Records kept per item, oldest batches dropped first, so `work/<key>` stays far under 64 KiB. */
const MAX_TESTS = 40;
export const NO_REASON = 'the Implementer gave no red output and no reason';

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** The failing part, cut to 40 lines and 1000 characters, so the item's document stays small. */
export function trimRed(output: string): string {
  const lines = output.replace(/\r\n/g, '\n').trim().split('\n');
  const kept = lines.slice(0, RED_LINES).join('\n');
  const cut = kept.length > RED_CHARS ? `${kept.slice(0, RED_CHARS)}…` : kept;
  return lines.length > RED_LINES ? `${cut}\n… (${lines.length - RED_LINES} more lines cut)` : cut;
}

/**
 * The Implementer's `tests` answer as records: a test with a red output keeps it and no
 * reason; a test without one keeps its reason, or says it gave none. Entries that name no
 * test are dropped.
 */
export function readTests(raw: unknown): TestRecord[] {
  if (!Array.isArray(raw)) return [];
  const found: TestRecord[] = [];
  for (const entry of raw) {
    if (entry === null || typeof entry !== 'object') continue;
    const t = entry as Record<string, unknown>;
    const name = text(t.name);
    const file = text(t.file);
    if (name === '' && file === '') continue;
    const red = text(t.red);
    const why = text(t.why_no_red);
    found.push({
      name: name === '' ? file : name,
      file,
      command: text(t.command),
      red: red === '' ? null : trimRed(red),
      why_no_red: red === '' ? (why === '' ? NO_REASON : why) : null,
    });
  }
  return found;
}

/** The record key of a slice run: a planned slice by its id, a fix slice by the run that made it. */
export function sliceKey(slice: string, fix: boolean, runId: string): string {
  return fix ? `fix:${runId}` : slice;
}

/**
 * Put one slice run's records into the item's list: the entry with the same key is
 * replaced (a re-run of the slice), others stay (earlier rounds). Past 40 tests the
 * oldest entries go first.
 */
export function withSlice(records: readonly SliceRecord[], entry: SliceRecord): SliceRecord[] {
  const kept = [...records.filter(r => r.key !== entry.key), entry];
  let count = kept.reduce((n, r) => n + r.tests.length, 0);
  while (count > MAX_TESTS && kept.length > 1) count -= (kept.shift() as SliceRecord).tests.length;
  return kept;
}

export function allTests(records: readonly SliceRecord[]): TestRecord[] {
  return records.flatMap(r => r.tests);
}

/**
 * The hard rule of decision 58: a bug fix whose new tests have no red record is a required
 * fix. Null when it holds (not a bug, or one red record exists).
 */
export function missingRed(kind: string | null, records: readonly SliceRecord[]): string | null {
  if (kind !== 'bug') return null;
  if (allTests(records).some(t => t.red !== null)) return null;
  const none = allTests(records).length === 0 ? 'no new test was recorded' : 'none of the new tests has a red record';
  return `this is a bug fix and ${none} (decision 58): write the test that reproduces the bug, run it alone on the code without the fix and return its failing output in \`tests\``;
}

/** A code fence longer than any run of backticks in the text, so output cannot close it. */
function fence(body: string): string {
  const longest = Math.max(2, ...(body.match(/`+/g) ?? []).map(run => run.length));
  return '`'.repeat(longest + 1);
}

/**
 * The PR description's section: each new test with its red record in a collapsed block,
 * then the tests without one, each with its reason. Same records, same text.
 */
export function redSection(records: readonly SliceRecord[]): string[] {
  const tests = allTests(records);
  if (tests.length === 0) return [];
  const red = tests.filter(t => t.red !== null);
  const none = tests.filter(t => t.red === null);
  const lines = ['## New tests', ''];
  if (red.length === 0) lines.push('No new test has a red record.');
  for (const t of red) {
    const output = t.red as string;
    const f = fence(output);
    lines.push(`<details><summary>${escapeHtml(t.name)} (${escapeHtml(t.file)}): red before the code</summary>`, '', inline(t.command), '', f, output, f, '', '</details>');
  }
  if (none.length > 0) {
    lines.push('', 'Without a red record:');
    for (const t of none) lines.push(`- ${t.name} (${t.file}): ${t.why_no_red ?? NO_REASON}`);
  }
  return lines;
}

/** A command as inline code, with a delimiter its own backticks cannot close. */
function inline(command: string): string {
  if (command === '') return '(no command given)';
  const longest = Math.max(0, ...(command.match(/`+/g) ?? []).map(run => run.length));
  const tick = '`'.repeat(longest + 1);
  return longest === 0 ? `${tick}${command}${tick}` : `${tick} ${command} ${tick}`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

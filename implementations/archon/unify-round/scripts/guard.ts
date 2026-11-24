/**
 * Flags a diff that weakens the checks (decision 27, Task shape "Implementer"): deleted
 * test files, added skip or focus markers, a lowered numeric threshold, a change to check
 * configuration, or any path under the never-R0 list (`.shared/policy.ts` ALWAYS_NEVER).
 * Flags are written to `work/<key>` as `guard:*`; merge reads them first and never merges
 * such a PR as R0.
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { runInputs } from '../../.shared/repo.ts';
import { gitOrThrow } from '../../.shared/git.ts';
import { ALWAYS_NEVER, globMatch } from '../../.shared/policy.ts';
import { updateItem } from './lib/item.ts';
import { baseName, changedFiles, fetchBranch } from './lib/facts.ts';

const TEST_PATH = /(^|\/)(tests?|__tests__|spec)\/|[._-](test|spec)\.[a-z]+$|_test\.go$|^test_.*\.py$|\/test_[^/]*\.py$/i;
const SKIP = /\b(it|test|describe)\.(skip|only)\(|\bx(it|describe|test)\(|@pytest\.mark\.skip|@unittest\.skip|\bt\.Skip\(|#\[ignore\]|@Disabled\b|\.skip\(\)|pending\(/;
const CHECK_CONFIG = [
  '.github/workflows/**', '.gitlab-ci.yml', '.circleci/**', 'jest.config.*', 'vitest.config.*', 'playwright.config.*',
  'pytest.ini', 'tox.ini', 'setup.cfg', '.coveragerc', 'codecov.yml', '.codecov.yml', '.eslintrc*', 'eslint.config.*',
  '.golangci.yml', '.golangci.yaml', 'pyproject.toml', 'tsconfig*.json', 'bunfig.toml', 'karma.conf.*', '.mocharc*',
];
const THRESHOLD = /(threshold|coverage|min[_-]?\w*|fail[_-]?under|lines|branches|functions|statements)\W+(\d+(?:\.\d+)?)/i;

async function main(): Promise<void> {
  const { key } = runInputs();
  if (key === undefined) return;
  const base = baseName(input('base'));
  const head = input('head').trim();
  fetchBranch(base);
  const range = `origin/${base}...${head}`;
  const flags: string[] = [];
  for (const file of changedFiles(`origin/${base}`, head)) {
    if (file.status.startsWith('D') && TEST_PATH.test(file.path)) flags.push(`guard:deleted-test:${file.path}`);
    if (ALWAYS_NEVER.some(p => globMatch(p, file.path))) flags.push(`guard:never-zone:${file.path}`);
    if (CHECK_CONFIG.some(p => globMatch(p, file.path) || globMatch(`**/${p}`, file.path))) flags.push(`guard:check-config:${file.path}`);
  }
  const patch = gitOrThrow('diff', '--unified=0', '--no-color', range);
  let file = '';
  const removed = new Map<string, number>();
  for (const line of patch.split('\n')) {
    if (line.startsWith('+++ ')) {
      file = line.replace(/^\+\+\+ (b\/)?/, '');
      removed.clear();
      continue;
    }
    if (line.startsWith('-') && !line.startsWith('---')) {
      const m = THRESHOLD.exec(line);
      if (m) removed.set(m[1].toLowerCase(), Number(m[2]));
    }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      if (SKIP.test(line)) flags.push(`guard:skip-marker:${file}`);
      const m = THRESHOLD.exec(line);
      const before = m ? removed.get(m[1].toLowerCase()) : undefined;
      if (m && before !== undefined && Number(m[2]) < before) flags.push(`guard:lowered-threshold:${file}:${m[1]} ${before}→${m[2]}`);
    }
  }
  const unique = [...new Set(flags)];
  updateItem(key, doc => {
    doc.flags = [...doc.flags.filter(f => !f.startsWith('guard:')), ...unique];
  });
  emit({ flags: unique, head });
}

await script('unify-round guard', main);

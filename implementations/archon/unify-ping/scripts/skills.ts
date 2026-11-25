/**
 * The agents' skills (decision 67): every pack skill a role names is in the pack, and which
 * roles have the project's own skill (`.pipeline/skills/<role>.md` on the base). A missing
 * pack skill fails the check, since that role's sessions would refuse to start; a role
 * without a project skill is reported, never failed.
 *
 * Bound inputs: the pack setting INPUTS_BASE (default main).
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { packSkills, projectSkills, ROLE_SKILLS } from '../../.shared/skills.ts';

await script('unify-ping skills', () => {
  const base = input('base').trim() || 'main';
  const have = packSkills();
  const named = [...new Set(Object.values(ROLE_SKILLS).flat())].sort();
  const missing = named.filter(name => !have.has(name));
  emit({ ok: missing.length === 0, base, pack: named.filter(name => have.has(name)), missing, project: projectSkills(base) });
});

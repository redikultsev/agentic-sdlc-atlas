/**
 * The skills of one agent role, rendered for its command (decision 67): the pack's skills
 * for the role, then the project's `.pipeline/skills/<role>.md` from the base.
 *
 * Bound inputs: `role` from the node's `with`, and the workflow's `base`.
 */

import { emit, input } from 'archon:script';
import { script } from '../../.shared/connector.ts';
import { renderSkills } from '../../.shared/skills.ts';

await script('skills', () => {
  emit(renderSkills(input('role'), input('base') || 'main'));
});

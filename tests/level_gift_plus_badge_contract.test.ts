import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

describe('level gift Plus badge contract', () => {
  const singleModal = readFileSync(join(ROOT, 'components', 'LevelGiftModal.tsx'), 'utf8');
  const dualModal = readFileSync(join(ROOT, 'components', 'LevelGiftDualModal.tsx'), 'utf8');

  it('uses the shared lesson-style PlusBadge on premium level gifts', () => {
    expect(singleModal).toContain("import PlusBadge from './PlusBadge'");
    expect(singleModal).toContain('testID="level-gift-plus-badge"');
    expect(dualModal).toContain("import PlusBadge from './PlusBadge'");
    expect(dualModal).toContain('testID="level-gift-dual-peek-plus-badge"');
    expect(dualModal).toContain('testID="level-gift-dual-result-plus-badge"');
  });

  it('keeps the premium marker out of the rendered reward title', () => {
    const system = readFileSync(join(ROOT, 'app', 'level_gift_system.ts'), 'utf8');

    expect(system).toContain('replace(/\\s*\\((?:plus|плюс)\\)\\s*/gi');
    expect(system).toContain('export function isPremiumLevelGiftId');
  });
});

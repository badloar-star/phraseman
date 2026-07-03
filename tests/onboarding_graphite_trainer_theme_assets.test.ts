import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const KINDS = ['phrases', 'words', 'analytics'] as const;

describe('legacy onboarding graphite trainer theme assets', () => {
  test('trainer registry uses minimalDark assets and rejects onboarding-graphite leftovers', () => {
    const source = fs.readFileSync(path.join(ROOT, 'constants/trainerThemeIcons.ts'), 'utf8');

    expect(source).not.toContain('onboarding-graphite');
    for (const kind of KINDS) {
      expect(source).toContain(`assets/images/trainer_theme_icons/minimalDark/${kind}.webp`);
      expect(source).toContain(`require('../assets/images/trainer_theme_icons/minimalDark/${kind}.webp')`);
    }
  });
});

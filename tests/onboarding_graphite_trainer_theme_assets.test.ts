import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const KINDS = ['phrases', 'words', 'analytics'] as const;

describe('removed graphite trainer theme assets', () => {
  test('legacy theme ids reuse Indigo assets without deleted theme files', () => {
    const source = fs.readFileSync(path.join(ROOT, 'constants/trainerThemeIcons.ts'), 'utf8');

    expect(source).not.toContain('onboarding-graphite');
    for (const kind of KINDS) {
      expect(source).toContain(`assets/images/trainer_theme_icons/indigo/${kind}.webp`);
      expect(source).toContain(`require('../assets/images/trainer_theme_icons/indigo/${kind}.webp')`);
      expect(source).not.toContain(`assets/images/trainer_theme_icons/minimalDark/${kind}.webp`);
      expect(source).not.toContain(`assets/images/trainer_theme_icons/candyBlue/${kind}.webp`);
    }
  });
});

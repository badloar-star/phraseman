import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.join(__dirname, '..');
const KINDS = ['phrases', 'words', 'analytics'] as const;

describe('Onboarding Graphite trainer theme assets', () => {
  test('minimalDark trainer icons exist as generated transparent 256x256 WebP files', async () => {
    for (const kind of KINDS) {
      const file = path.join(
        ROOT,
        'assets/images/trainer_theme_icons/onboarding-graphite',
        `${kind}.webp`,
      );
      expect(fs.existsSync(file)).toBe(true);
      const metadata = await sharp(file).metadata();
      expect(metadata.width).toBe(256);
      expect(metadata.height).toBe(256);
      expect(metadata.format).toBe('webp');
      expect(metadata.hasAlpha).toBe(true);
    }
  });

  test('trainer registry points minimalDark to onboarding-graphite assets and amber palette', () => {
    const source = fs.readFileSync(path.join(ROOT, 'constants/trainerThemeIcons.ts'), 'utf8');

    for (const kind of KINDS) {
      expect(source).toContain(`assets/images/trainer_theme_icons/onboarding-graphite/${kind}.webp`);
      expect(source).toContain(
        `require('../assets/images/trainer_theme_icons/onboarding-graphite/${kind}.webp')`,
      );
    }
    expect(source).toContain("primary: '#F2B84B'");
    expect(source).toContain("stroke: '#FFF1B8'");
  });
});

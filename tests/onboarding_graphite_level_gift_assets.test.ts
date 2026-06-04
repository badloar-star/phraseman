import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.join(__dirname, '..');
const VARIANTS = ['common', 'rare', 'epic', 'premium'] as const;

describe('Onboarding Graphite level gift assets', () => {
  test('minimalDark gift variants exist as generated transparent 512x512 WebP files', async () => {
    for (const variant of VARIANTS) {
      const file = path.join(
        ROOT,
        'assets/images/level_gifts_v2',
        `onboarding-graphite-${variant}.webp`,
      );
      expect(fs.existsSync(file)).toBe(true);
      const metadata = await sharp(file).metadata();
      expect(metadata.width).toBe(512);
      expect(metadata.height).toBe(512);
      expect(metadata.format).toBe('webp');
      expect(metadata.hasAlpha).toBe(true);
    }
  });

  test('level gift registry points minimalDark to onboarding-graphite assets', () => {
    const source = fs.readFileSync(path.join(ROOT, 'constants/levelGiftImages.ts'), 'utf8');

    for (const variant of VARIANTS) {
      expect(source).toContain(
        `require('../assets/images/level_gifts_v2/onboarding-graphite-${variant}.webp')`,
      );
    }
  });
});

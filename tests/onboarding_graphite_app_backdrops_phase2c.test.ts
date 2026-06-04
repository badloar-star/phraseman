import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.join(__dirname, '..');

const PHASE_2C_BACKDROPS = [
  'diagnosticTest',
  'exam',
  'flashcards',
  'progressMap',
  'shardsShop',
  'levelGifts',
  'statistics',
] as const;

describe('Onboarding Graphite app backdrops Phase 2C', () => {
  test('final route backdrops exist as generated 1080x1920 WebP files', async () => {
    for (const name of PHASE_2C_BACKDROPS) {
      const file = path.join(
        ROOT,
        'assets/images/app_backdrops/onboarding-graphite',
        `${name}-onboarding-graphite.webp`,
      );
      expect(fs.existsSync(file)).toBe(true);
      const metadata = await sharp(file).metadata();
      expect(metadata.width).toBe(1080);
      expect(metadata.height).toBe(1920);
      expect(metadata.format).toBe('webp');
    }
  });

  test('minimalDark registry points final routes to generated onboarding-graphite backdrops', () => {
    const source = fs.readFileSync(
      path.join(ROOT, 'components/appArtBackdropRegistry.ts'),
      'utf8',
    );

    for (const name of PHASE_2C_BACKDROPS) {
      expect(source).toContain(
        `require('../assets/images/app_backdrops/onboarding-graphite/${name}-onboarding-graphite.webp')`,
      );
    }
  });
});

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.join(__dirname, '..');
const TIERS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;

describe('Onboarding Graphite streak assets', () => {
  test('minimalDark streak fire and freeze assets exist as transparent 80x80 WebP files', async () => {
    const files = [
      ...TIERS.map(tier => `streak-fire-onboarding-graphite-${String(tier).padStart(3, '0')}.webp`),
      'streak-freeze-onboarding-graphite.webp',
    ];

    for (const fileName of files) {
      const file = path.join(ROOT, 'assets/images/streak_icons/onboarding-graphite', fileName);
      expect(fs.existsSync(file)).toBe(true);
      const metadata = await sharp(file).metadata();
      expect(metadata.width).toBe(80);
      expect(metadata.height).toBe(80);
      expect(metadata.format).toBe('webp');
      expect(metadata.hasAlpha).toBe(true);
    }
  });

  test('streak registry points minimalDark to onboarding-graphite assets and amber chrome', () => {
    const source = fs.readFileSync(path.join(ROOT, 'constants/streakIconAssets.ts'), 'utf8');

    for (const tier of TIERS) {
      const suffix = String(tier).padStart(3, '0');
      expect(source).toContain(`assets/images/streak_icons/onboarding-graphite/streak-fire-onboarding-graphite-${suffix}.webp`);
      expect(source).toContain(`require('../assets/images/streak_icons/onboarding-graphite/streak-fire-onboarding-graphite-${suffix}.webp')`);
    }
    expect(source).toContain('assets/images/streak_icons/onboarding-graphite/streak-freeze-onboarding-graphite.webp');
    expect(source).toContain("require('../assets/images/streak_icons/onboarding-graphite/streak-freeze-onboarding-graphite.webp')");
    expect(source).toContain("minimalDark: { rgb: [242, 184, 75], accent: '#F2B84B' }");
  });
});

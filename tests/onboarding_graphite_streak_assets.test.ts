import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.join(__dirname, '..');
const TIERS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;
const THEME_DIRS = ['dark', 'neon', 'gold', 'coral', 'minimalLight', 'minimalDark'] as const;

describe('Onboarding Graphite streak assets', () => {
  test('streak fire and freeze assets exist as transparent 80x80 WebP files', async () => {
    const files = [
      ...THEME_DIRS.flatMap(theme =>
        TIERS.map(tier => path.join(theme, `streak-fire-${theme}-${String(tier).padStart(3, '0')}.webp`)),
      ),
      ...TIERS.map(tier => path.join('compass-premium', `streak-fire-compass-premium-${String(tier).padStart(3, '0')}.webp`)),
      ...THEME_DIRS.map(theme => path.join(theme, `streak-freeze-${theme}.webp`)),
      path.join('compass-premium', 'streak-freeze-compass-premium.webp'),
      'streak-freeze.webp',
    ];

    for (const fileName of files) {
      const file = path.join(ROOT, 'assets/images/streak_icons', fileName);
      expect(fs.existsSync(file)).toBe(true);
      const metadata = await sharp(file).metadata();
      expect(metadata.width).toBe(80);
      expect(metadata.height).toBe(80);
      expect(metadata.format).toBe('webp');
      expect(metadata.hasAlpha).toBe(true);
    }
  });

  test('streak registry keeps fire image sources wired for every theme tier', () => {
    const source = fs.readFileSync(path.join(ROOT, 'constants/streakIconAssets.ts'), 'utf8');

    for (const theme of THEME_DIRS) {
      for (const tier of TIERS) {
        const suffix = String(tier).padStart(3, '0');
        expect(source).toContain(`assets/images/streak_icons/${theme}/streak-fire-${theme}-${suffix}.webp`);
        expect(source).toContain(`require('../assets/images/streak_icons/${theme}/streak-fire-${theme}-${suffix}.webp')`);
      }
    }

    for (const tier of TIERS) {
      const suffix = String(tier).padStart(3, '0');
      expect(source).toContain(`assets/images/streak_icons/compass-premium/streak-fire-compass-premium-${suffix}.webp`);
      expect(source).toContain(`require('../assets/images/streak_icons/compass-premium/streak-fire-compass-premium-${suffix}.webp')`);
    }

    expect(source).toContain('source: STREAK_FIRE_ICON_SOURCES[safeThemeMode][tierDays]');
    expect(source).toContain('assetPath: STREAK_FIRE_ICON_ASSET_PATHS[safeThemeMode][tierDays]');
    expect(source).toContain("minimalDark: { rgb: [110, 168, 255], accent: '#6EA8FF' }");
    expect(source).toContain("compass: { rgb: [242, 196, 141], accent: '#F2C48D' }");
  });
});

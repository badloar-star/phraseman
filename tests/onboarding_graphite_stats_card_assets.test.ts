import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.join(__dirname, '..');

const STATS_CARDS = [
  'streak',
  'multipliers',
  'practice-balance',
  'week-rhythm',
  'percentiles',
  'archive-map',
  'wager',
] as const;

describe('Onboarding Graphite stats card assets', () => {
  test('minimalDark stats cards exist as generated 1200x600 WebP files', async () => {
    for (const name of STATS_CARDS) {
      const file = path.join(
        ROOT,
        'assets/images/statistics/cards/onboarding-graphite',
        `stats-card-${name}-onboarding-graphite.webp`,
      );
      expect(fs.existsSync(file)).toBe(true);
      const metadata = await sharp(file).metadata();
      expect(metadata.width).toBe(1200);
      expect(metadata.height).toBe(600);
      expect(metadata.format).toBe('webp');
    }
  });

  test('stats card registry points minimalDark to onboarding-graphite assets', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components/StatsCardArtSurface.tsx'), 'utf8');

    for (const name of STATS_CARDS) {
      expect(source).toContain(
        `require('../assets/images/statistics/cards/onboarding-graphite/stats-card-${name}-onboarding-graphite.webp')`,
      );
    }
  });

  test('stats chrome minimalDark uses onboarding graphite amber and ivory tones', () => {
    const source = fs.readFileSync(path.join(ROOT, 'constants/statsThemeChrome.ts'), 'utf8');
    const accentBlock = source.slice(
      source.indexOf('const STATS_CHROME_ACCENT_BY_THEME'),
      source.indexOf('const STATS_ACCENTS_BY_THEME'),
    );
    const paletteStart = source.indexOf('  minimalDark: {', source.indexOf('const STATS_ACCENTS_BY_THEME'));
    const paletteEnd = source.indexOf('  },', paletteStart);
    const paletteBlock = source.slice(paletteStart, paletteEnd);

    expect(accentBlock).toContain("minimalDark: '#F2B84B'");
    expect(paletteBlock).toContain("streak: '#F2B84B'");
    expect(paletteBlock).toContain("freeze: '#FFF1B8'");
    expect(paletteBlock).toContain("activity: '#F2B84B'");
    expect(paletteBlock).toContain("archiveMap: '#BBA46F'");
    expect(paletteBlock).not.toContain('#6EA8FF');
    expect(paletteBlock).not.toContain('#4DD6FF');
    expect(paletteBlock).not.toContain('#B993FF');
  });
});

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(__dirname, '..');

const THEMES = [
  'dark',
  'neon',
  'gold',
  'coral',
  'minimal-light',
  'minimal-dark',
] as const;

const LEVELS = ['easy', 'medium', 'hard'] as const;

describe('quiz level theme assets', () => {
  it('ships complete themed card and logo pairs with stable dimensions', async () => {
    const expectedPairs = THEMES.flatMap(theme =>
      LEVELS.map(level => ({
        theme,
        level,
        card: path.join(ROOT, 'assets', 'images', 'quizzes', 'level_cards', `quiz-card-${level}-${theme}.webp`),
        logo: path.join(ROOT, 'assets', 'images', 'quizzes', 'level_logos', `quiz-logo-${level}-${theme}.webp`),
      })),
    );

    expect(expectedPairs).toHaveLength(18);

    for (const pair of expectedPairs) {
      expect(fs.existsSync(pair.card)).toBe(true);
      expect(fs.existsSync(pair.logo)).toBe(true);

      const card = await sharp(pair.card).metadata();
      const logo = await sharp(pair.logo).metadata();

      expect(card.width).toBe(640);
      expect(card.height).toBe(236);
      expect(logo.width).toBe(260);
      expect(logo.height).toBe(260);
      expect(logo.hasAlpha).toBe(true);
    }
  });

  it('ships themed quiz completion medals as transparent cutouts', async () => {
    const medalThemes = [
      ...THEMES,
      'forest',
      'neon-green',
    ] as const;

    for (const theme of medalThemes) {
      const medalPath = path.join(
        ROOT,
        'assets',
        'images',
        'quizzes',
        'medals',
        `quiz-completion-medal-${theme}-cutout.webp`,
      );

      expect(fs.existsSync(medalPath)).toBe(true);

      const medal = await sharp(medalPath).metadata();

      expect(medal.width).toBe(512);
      expect(medal.height).toBe(512);
      expect(medal.hasAlpha).toBe(true);
    }
  });

  it('marks unfinished dev-only thematic quiz logos directly on the icon art', async () => {
    const devOnlySlugs = [
      'at-the-doctor',
      'body-and-health',
      'shopping-and-money',
    ] as const;
    const devLogoThemes = [
      ...THEMES,
      'forest',
      'neon-green',
    ] as const;

    for (const slug of devOnlySlugs) {
      for (const theme of devLogoThemes) {
        const logoPath = path.join(
          ROOT,
          'assets',
          'images',
          'quizzes',
          'theme_logos',
          `quiz-theme-${slug}-${theme}.webp`,
        );

        expect(fs.existsSync(logoPath)).toBe(true);

        const markerRegion = await sharp(logoPath)
          .ensureAlpha()
          .extract({ left: 154, top: 20, width: 74, height: 32 })
          .raw()
          .toBuffer();

        let opaquePixels = 0;
        for (let i = 3; i < markerRegion.length; i += 4) {
          if (markerRegion[i]! > 180) opaquePixels += 1;
        }

        expect(opaquePixels).toBeGreaterThan(1200);
      }
    }
  });
});

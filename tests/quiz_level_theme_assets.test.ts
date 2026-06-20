import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(__dirname, '..');

const CARD_THEMES = [
  'dark',
  'gold',
  'coral',
  'minimal-dark',
] as const;

const LOGO_THEMES = [
  ...CARD_THEMES,
  'forest',
  'neon-green',
  'midnight',
  'ember',
  'aurora',
  'volt',
] as const;

const LEVELS = ['easy', 'medium', 'hard'] as const;

const alphaBounds = (data: Buffer, width: number, height: number) => {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha < 12) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY };
};

describe('quiz level theme assets', () => {
  it('ships complete themed level cards with stable dimensions', async () => {
    const expectedCards = CARD_THEMES.flatMap(theme =>
      LEVELS.map(level => ({
        theme,
        level,
        card: path.join(ROOT, 'assets', 'images', 'quizzes', 'level_cards', `quiz-card-${level}-${theme}.webp`),
      })),
    );

    expect(expectedCards).toHaveLength(12);

    for (const pair of expectedCards) {
      expect(fs.existsSync(pair.card)).toBe(true);

      const card = await sharp(pair.card).metadata();

      expect(card.width).toBe(640);
      expect(card.height).toBe(236);
    }
  });

  it('ships themed quiz completion medals as transparent cutouts', async () => {
    for (const theme of LOGO_THEMES) {
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

  it('ships all thematic quiz logos as centered transparent cutouts with safe margins', async () => {
    const thematicSlugs = [
      'kitchen-and-cooking',
      'home-and-rooms',
      'at-the-doctor',
      'body-and-health',
      'shopping-and-money',
    ] as const;
    for (const slug of thematicSlugs) {
      for (const theme of LOGO_THEMES) {
        const logoPath = path.join(
          ROOT,
          'assets',
          'images',
          'quizzes',
          'theme_logos',
          `quiz-theme-${slug}-${theme}.webp`,
        );

        expect(fs.existsSync(logoPath)).toBe(true);

        const logo = await sharp(logoPath).metadata();
        expect(logo.width).toBe(260);
        expect(logo.height).toBe(260);
        expect(logo.hasAlpha).toBe(true);

        const raw = await sharp(logoPath)
          .ensureAlpha()
          .raw()
          .toBuffer();
        const bounds = alphaBounds(raw, 260, 260);

        expect(bounds).not.toBeNull();
        const safeMargin = Math.min(
          bounds!.minX,
          bounds!.minY,
          259 - bounds!.maxX,
          259 - bounds!.maxY,
        );
        const centerDeltaX = Math.abs(((bounds!.minX + bounds!.maxX) / 2) - 129.5);
        const centerDeltaY = Math.abs(((bounds!.minY + bounds!.maxY) / 2) - 129.5);

        expect(safeMargin).toBeGreaterThanOrEqual(22);
        expect(centerDeltaX).toBeLessThanOrEqual(8);
        expect(centerDeltaY).toBeLessThanOrEqual(8);
      }
    }
  });

  it('ships all level logos as centered transparent cutouts with safe margins', async () => {
    for (const level of LEVELS) {
      for (const theme of LOGO_THEMES) {
        const logoPath = path.join(
          ROOT,
          'assets',
          'images',
          'quizzes',
          'level_logos',
          `quiz-logo-${level}-${theme}.webp`,
        );

        expect(fs.existsSync(logoPath)).toBe(true);

        const logo = await sharp(logoPath).metadata();
        expect(logo.width).toBe(260);
        expect(logo.height).toBe(260);
        expect(logo.hasAlpha).toBe(true);

        const raw = await sharp(logoPath)
          .ensureAlpha()
          .raw()
          .toBuffer();
        const bounds = alphaBounds(raw, 260, 260);

        expect(bounds).not.toBeNull();
        const safeMargin = Math.min(
          bounds!.minX,
          bounds!.minY,
          259 - bounds!.maxX,
          259 - bounds!.maxY,
        );
        const centerDeltaX = Math.abs(((bounds!.minX + bounds!.maxX) / 2) - 129.5);
        const centerDeltaY = Math.abs(((bounds!.minY + bounds!.maxY) / 2) - 129.5);

        expect(safeMargin).toBeGreaterThanOrEqual(22);
        expect(centerDeltaX).toBeLessThanOrEqual(8);
        expect(centerDeltaY).toBeLessThanOrEqual(8);
      }
    }
  });
});

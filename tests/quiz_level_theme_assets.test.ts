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
});

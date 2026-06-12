import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(__dirname, '..');
const CINEMA_THEMES = ['midnight', 'ember', 'aurora', 'volt'] as const;
const QUIZ_LEVELS = ['easy', 'medium', 'hard'] as const;
const THEMATIC_SLUGS = [
  'kitchen-and-cooking',
  'home-and-rooms',
  'at-the-doctor',
  'body-and-health',
  'shopping-and-money',
] as const;
const TRAINER_KINDS = ['phrases', 'words', 'analytics'] as const;
const STREAK_TIERS = ['010', '020', '030', '040', '050', '060', '070', '080', '090', '100'] as const;
const SHARD_TIERS = ['single', '80', '180', '420'] as const;
const DALLE_SOURCE_FILES = [
  'midnight-solidkey-learning-v3-dalle.png',
  'midnight-object-rewards-dalle.png',
  'midnight-solidkey-home-v3-dalle.png',
  'ember-solidkey-learning-v3-dalle.png',
  'ember-object-rewards-dalle.png',
  'ember-solidkey-home-v3-dalle.png',
  'aurora-solidkey-learning-v3-dalle.png',
  'aurora-object-rewards-dalle.png',
  'aurora-solidkey-home-v3-dalle.png',
  'volt-solidkey-learning-v3-dalle.png',
  'volt-object-rewards-dalle.png',
  'volt-solidkey-home-v3-dalle.png',
] as const;

async function expectWebp(filePath: string, width: number, height: number, hasAlpha: boolean) {
  expect(fs.existsSync(filePath)).toBe(true);
  const meta = await sharp(filePath).metadata();
  expect(meta.format).toBe('webp');
  expect(meta.width).toBe(width);
  expect(meta.height).toBe(height);
  expect(Boolean(meta.hasAlpha)).toBe(hasAlpha);
}

describe('cinema theme production assets', () => {
  it('ships logos, trainer icons, streak icons, shards, and medals for every cinema theme', async () => {
    for (const theme of CINEMA_THEMES) {
      for (const level of QUIZ_LEVELS) {
        await expectWebp(
          path.join(ROOT, 'assets/images/quizzes/level_logos', `quiz-logo-${level}-${theme}.webp`),
          260,
          260,
          true,
        );
      }

      for (const slug of THEMATIC_SLUGS) {
        await expectWebp(
          path.join(ROOT, 'assets/images/quizzes/theme_logos', `quiz-theme-${slug}-${theme}.webp`),
          260,
          260,
          true,
        );
      }

      for (const kind of TRAINER_KINDS) {
        await expectWebp(
          path.join(ROOT, 'assets/images/trainer_theme_icons', theme, `${kind}.webp`),
          256,
          256,
          true,
        );
      }

      for (const tier of STREAK_TIERS) {
        await expectWebp(
          path.join(ROOT, 'assets/images/streak_icons', theme, `streak-fire-${theme}-${tier}.webp`),
          80,
          80,
          true,
        );
      }
      await expectWebp(
        path.join(ROOT, 'assets/images/streak_icons', theme, `streak-freeze-${theme}.webp`),
        80,
        80,
        true,
      );

      for (const tier of SHARD_TIERS) {
        await expectWebp(
          path.join(ROOT, 'assets/images/shards', `${theme}-${tier}.webp`),
          256,
          256,
          true,
        );
      }

      await expectWebp(
        path.join(ROOT, 'assets/images/quizzes/medals', `quiz-completion-medal-${theme}-cutout.webp`),
        512,
        512,
        true,
      );
    }
  });

  it('does not create new cinema quiz background cards', () => {
    for (const theme of CINEMA_THEMES) {
      for (const level of QUIZ_LEVELS) {
        expect(
          fs.existsSync(path.join(ROOT, 'assets/images/quizzes/level_cards', `quiz-card-${level}-${theme}.webp`)),
        ).toBe(false);
      }

      for (const slug of THEMATIC_SLUGS) {
        expect(
          fs.existsSync(path.join(ROOT, 'assets/images/quizzes/theme_cards', `quiz-theme-${slug}-${theme}.webp`)),
        ).toBe(false);
      }
    }
  });

  it('keeps DALL-E source atlases for cinema foreground assets', () => {
    for (const sourceFile of DALLE_SOURCE_FILES) {
      expect(fs.existsSync(path.join(ROOT, 'assets/images/cinema_dalle_sources', sourceFile))).toBe(true);
    }
  });

  it('does not keep compass premium fallbacks in core cinema foreground asset registries', () => {
    const files = [
      'app/quiz_thematic_registry.ts',
      'app/quiz_thematic_dev_registry.ts',
      'app/quizzes/medal_assets.ts',
      'app/oskolok.ts',
      'constants/levelGiftRewardIcons.ts',
      'constants/streakIconAssets.ts',
      'constants/trainerThemeIcons.ts',
    ];

    for (const file of files) {
      const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
      for (const theme of CINEMA_THEMES) {
        const fallbackPattern = new RegExp(`${theme}:\\s*CINEMA_[A-Z_]+`);
        expect(source).not.toMatch(fallbackPattern);
      }
    }
  });
});

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.join(__dirname, '..');
const LEVELS = ['easy', 'medium', 'hard'] as const;

describe('Onboarding Graphite quiz core assets', () => {
  test('level cards exist as generated 640x236 WebP files', async () => {
    for (const level of LEVELS) {
      const file = path.join(
        ROOT,
        'assets/images/quizzes/level_cards',
        `quiz-card-${level}-onboarding-graphite.webp`,
      );
      expect(fs.existsSync(file)).toBe(true);
      const metadata = await sharp(file).metadata();
      expect(metadata.width).toBe(640);
      expect(metadata.height).toBe(236);
      expect(metadata.format).toBe('webp');
    }
  });

  test('level logos and completion medal exist as generated transparent WebP files', async () => {
    const logoFiles = LEVELS.map(level => path.join(
      ROOT,
      'assets/images/quizzes/level_logos',
      `quiz-logo-${level}-onboarding-graphite.webp`,
    ));
    const medalFile = path.join(
      ROOT,
      'assets/images/quizzes/medals',
      'quiz-completion-medal-onboarding-graphite-cutout.webp',
    );

    for (const file of [...logoFiles, medalFile]) {
      expect(fs.existsSync(file)).toBe(true);
      const metadata = await sharp(file).metadata();
      expect(metadata.width).toBe(file === medalFile ? 512 : 260);
      expect(metadata.height).toBe(file === medalFile ? 512 : 260);
      expect(metadata.format).toBe('webp');
      expect(metadata.hasAlpha).toBe(true);
    }
  });

  test('minimalDark quiz core registries point to onboarding-graphite assets', () => {
    const constantsSource = fs.readFileSync(
      path.join(ROOT, 'app/quizzes/constants.ts'),
      'utf8',
    );
    const medalSource = fs.readFileSync(
      path.join(ROOT, 'app/quizzes/medal_assets.ts'),
      'utf8',
    );

    for (const level of LEVELS) {
      expect(constantsSource).toContain(
        `require('../../assets/images/quizzes/level_cards/quiz-card-${level}-onboarding-graphite.webp')`,
      );
      expect(constantsSource).toContain(
        `require('../../assets/images/quizzes/level_logos/quiz-logo-${level}-onboarding-graphite.webp')`,
      );
    }
    expect(medalSource).toContain(
      "require('../../assets/images/quizzes/medals/quiz-completion-medal-onboarding-graphite-cutout.webp')",
    );
  });

  test('quiz tab minimalDark live palette uses onboarding graphite tones', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'quizzes.tsx'), 'utf8');
    const paletteStart = source.indexOf('const THEME_PALETTES');
    const minimalStart = source.indexOf('  minimalDark: {', paletteStart);
    const nextThemeStart = source.indexOf('  ocean: {', minimalStart);
    const block = source.slice(minimalStart, nextThemeStart);

    expect(block).toContain("easy:   { gradA: '#171410', gradB: '#070706', accent: '#FFF1B8' }");
    expect(block).toContain("medium: { gradA: '#1C1710', gradB: '#090806', accent: '#F2B84B' }");
    expect(block).toContain("hard:   { gradA: '#15120D', gradB: '#050504', accent: '#BBA46F' }");
    expect(block).not.toContain('#6EA8FF');
    expect(block).not.toContain('#F26D6D');
    expect(block).not.toContain('#A78BFA');
  });

  test('shared quiz constants minimalDark palette matches onboarding graphite tones', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'quizzes', 'constants.ts'), 'utf8');
    const paletteStart = source.indexOf('export const THEME_PALETTES');
    const minimalStart = source.indexOf('  minimalDark: {', paletteStart);
    const nextThemeStart = source.indexOf('  ocean: {', minimalStart);
    const block = source.slice(minimalStart, nextThemeStart);

    expect(block).toContain("easy: { gradA: '#171410', gradB: '#070706', accent: '#FFF1B8' }");
    expect(block).toContain("medium: { gradA: '#1C1710', gradB: '#090806', accent: '#F2B84B' }");
    expect(block).toContain("hard: { gradA: '#15120D', gradB: '#050504', accent: '#BBA46F' }");
    expect(block).not.toContain('#FFD472');
    expect(block).not.toContain('#21180B');
  });

  test('quiz minimalDark text palettes use onboarding graphite ivory tokens', () => {
    const tabSource = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'quizzes.tsx'), 'utf8');
    const constantsSource = fs.readFileSync(path.join(ROOT, 'app', 'quizzes', 'constants.ts'), 'utf8');

    for (const source of [tabSource, constantsSource]) {
      const textStart = source.indexOf('const THEME_TEXT') >= 0
        ? source.indexOf('const THEME_TEXT')
        : source.indexOf('export const THEME_TEXT');
      const minimalStart = source.indexOf('minimalDark:', textStart);
      const minimalEnd = source.indexOf('}', minimalStart);
      const block = source.slice(minimalStart, minimalEnd);
      expect(block).toContain("primary: '#FFF8E8'");
      expect(block).toContain("secondary: '#E7D4A4'");
      expect(block).not.toContain('#F5F5F5');
      expect(block).not.toContain('rgba(245,245,245,0.64)');
    }
  });
});

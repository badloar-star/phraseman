import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const LEVELS = ['easy', 'medium', 'hard'] as const;

describe('legacy onboarding graphite quiz core assets', () => {
  test('quiz core registries use minimalDark assets and reject onboarding-graphite leftovers', () => {
    const constantsSource = fs.readFileSync(path.join(ROOT, 'app/quizzes/constants.ts'), 'utf8');
    const medalSource = fs.readFileSync(path.join(ROOT, 'app/quizzes/medal_assets.ts'), 'utf8');

    expect(constantsSource).not.toContain('onboarding-graphite');
    expect(medalSource).not.toContain('onboarding-graphite');
    for (const level of LEVELS) {
      expect(constantsSource).toContain(
        `require('../../assets/images/quizzes/level_cards/quiz-card-${level}-minimal-dark.webp')`,
      );
      expect(constantsSource).toContain(
        `require('../../assets/images/quizzes/level_logos/quiz-logo-${level}-minimal-dark.webp')`,
      );
    }
    expect(medalSource).toContain(
      "require('../../assets/images/quizzes/medals/quiz-completion-medal-minimal-dark-cutout.webp')",
    );
  });

  test('quiz minimalDark palettes are no longer old amber onboarding graphite tones', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'quizzes', 'constants.ts'), 'utf8');

    expect(source).not.toContain("accent: '#F2B84B'");
    expect(source).toContain("minimalDark: { primary: '#F5F5F5', secondary: '#A7ABB3' }");
  });
});

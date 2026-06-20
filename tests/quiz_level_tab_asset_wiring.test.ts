import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

describe('quiz level tab asset wiring', () => {
  it('renders themed quiz level logos on the tab screen', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'quizzes.tsx'), 'utf8');
    const constantsSource = fs.readFileSync(path.join(ROOT, 'app', 'quizzes', 'constants.ts'), 'utf8');

    expect(constantsSource).toContain('QUIZ_LEVEL_LOGOS');
    expect(constantsSource).toContain('quizAssetThemeKey');
    expect(constantsSource).toContain('getQuizLevelLogoSource');
    expect(constantsSource).toContain("case 'dark':");
    expect(constantsSource).toContain("case 'forest':");
    expect(constantsSource).toContain("return 'forest';");
    expect(constantsSource).toContain("case 'neon-green':");
    expect(constantsSource).toContain("return 'neonGreen';");
    expect(source).toContain('getQuizLevelLogoSource');
    expect(source).toContain('getQuizCompletionMedalSource');
    expect(source).toContain('levelLogo');
    expect(source).toContain('completionMedalSource');
    expect(source).toContain('transition={0}');
    expect(source).toContain('getQuizLevelLogoSource(themeMode, level)');
    expect(source).not.toContain('LEVEL_IMAGES');
    expect(source).not.toContain('levelLogoMap');
    expect(source).not.toContain("assets/images/levels/easy.webp");
    expect(source).not.toContain("assets/images/levels/medium.webp");
    expect(source).not.toContain("assets/images/levels/hard.webp");
    expect(source).not.toContain('{rankInfo.icon}</Text>');
  });
});

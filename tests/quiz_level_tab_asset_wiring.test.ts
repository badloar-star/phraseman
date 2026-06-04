import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

describe('quiz level tab asset wiring', () => {
  it('renders themed quiz card backgrounds and logos on the tab screen', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'quizzes.tsx'), 'utf8');

    expect(source).toContain('QUIZ_LEVEL_CARD_BACKGROUNDS');
    expect(source).toContain('QUIZ_LEVEL_LOGOS');
    expect(source).toContain('getQuizCompletionMedalSource');
    expect(source).toContain('cardBackground');
    expect(source).toContain('levelLogo');
    expect(source).toContain('completionMedalSource');
    expect(source).toContain('transition={0}');
    expect(source).toMatch(
      /QUIZ_LEVEL_CARD_BACKGROUNDS\[themeMode\]\?\.\[lv\]\s*\?\?\s*QUIZ_LEVEL_CARD_BACKGROUNDS\.minimalDark\[lv\]/,
    );
    expect(source).toMatch(
      /QUIZ_LEVEL_LOGOS\[themeMode\]\?\.\[lv\]\s*\?\?\s*QUIZ_LEVEL_LOGOS\.minimalDark\[lv\]/,
    );
    expect(source).not.toContain('LEVEL_IMAGES');
    expect(source).not.toContain("assets/images/levels/easy.webp");
    expect(source).not.toContain("assets/images/levels/medium.webp");
    expect(source).not.toContain("assets/images/levels/hard.webp");
    expect(source).not.toContain('{rankInfo.icon}</Text>');
  });
});

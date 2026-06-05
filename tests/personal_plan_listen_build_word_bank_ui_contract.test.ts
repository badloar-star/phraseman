import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan listen-build word bank UI contract', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_exercise.tsx'), 'utf8');

  it('uses a Duolingo-style answer field and wrapping word bank instead of vertical answer rows', () => {
    expect(source).toContain('styles.listenBuildAnswerBox');
    expect(source).toContain('Поле собранной фразы');
    expect(source).toContain('Слова появятся здесь');
    expect(source).toContain('styles.wordBank');
    expect(source).toContain('styles.wordTile');
    expect(source).toContain("flexWrap: 'wrap'");
    expect(source).toContain('setBuildWords((current) => current.filter((_, index) => index !== wordIndex))');
  });
});


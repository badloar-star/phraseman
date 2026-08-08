import fs from 'fs';
import path from 'path';

function readAppFile(...parts: string[]): string {
  return fs.readFileSync(path.join(__dirname, '..', 'app', ...parts), 'utf8');
}

describe('daily_active task progress sources', () => {
  it('only lesson phrase answers advance daily_active', () => {
    const nonLessonSources = [
      readAppFile('lesson_words.tsx'),
      readAppFile('lesson_irregular_verbs.tsx'),
    ];

    expect(fs.existsSync(path.join(__dirname, '..', 'app', 'quizzes.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(__dirname, '..', 'app', '(tabs)', 'quizzes.tsx'))).toBe(false);

    for (const src of nonLessonSources) {
      expect(src).not.toMatch(/\{\s*type:\s*'daily_active'\s*\}/);
    }

    expect(readAppFile('lesson1.tsx')).toMatch(/\{\s*type:\s*'daily_active'\s*\}/);
  });
});

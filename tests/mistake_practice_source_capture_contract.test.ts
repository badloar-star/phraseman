import fs from 'node:fs';
import path from 'node:path';

const read = (relative: string) => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');

describe('new mistake capture source coverage', () => {
  test.each([
    'app/lesson1.tsx',
    'app/lesson_words.tsx',
    'app/lesson_irregular_verbs.tsx',
    'app/diagnostic_test.tsx',
    'app/level_exam.tsx',
    'app/exam.tsx',
    'app/flashcards_swipe.tsx',
    'app/flashcards_blitz_session.tsx',
    'app/flashcards_speaking_session.tsx',
  ])('%s captures through the single new adapter', (relative) => {
    const source = read(relative);
    expect(source).toMatch(/capture(ObjectiveAttempt|CurrentAccountObjectiveAttempt)/);
  });
});

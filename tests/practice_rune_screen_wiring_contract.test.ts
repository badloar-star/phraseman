import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string): string => (
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8')
);

const activityScreens = [
  ['app/lesson1.tsx', "activity: 'lesson'"],
  ['app/lesson_words.tsx', "activity: 'vocabulary'"],
  ['app/lesson_irregular_verbs.tsx', "activity: 'irregular_verbs'"],
  ['app/flashcards_blitz_session.tsx', "activity: 'flashcards_blitz'"],
  ['app/flashcards_swipe.tsx', "activity: 'flashcards_training'"],
  ['app/mistake_practice_session.tsx', "activity: 'mistake_practice'"],
  ['app/flashcards_speaking_session.tsx', "activity: 'speaking_practice'"],
] as const;

test.each(activityScreens)('%s awards correct answers through the shared rune ledger hook', (file, activity) => {
  const source = read(file);
  expect(source).toContain('usePracticeRunes({');
  expect(source).toContain(activity);
  expect(source).toContain('practiceRunes.onCorrectAnswer(');
});

test.each(activityScreens.slice(1))('%s settles and preserves the shared completion counter', (file) => {
  const source = read(file);
  expect(source).toContain('practiceRunes.settle()');
  expect(source).toContain('runes={practiceRunes.runes}');
});

test('lesson hands the persisted earnings to its dedicated completion screen', () => {
  const lesson = read('app/lesson1.tsx');
  const completion = read('app/lesson_complete.tsx');
  expect(lesson).toContain('runeCompletionOrdinal');
  expect(completion).toContain("activity: 'lesson'");
  expect(completion).toContain('practiceRunes.settle()');
  expect(completion).toContain('runes={practiceRunes.runes}');
});

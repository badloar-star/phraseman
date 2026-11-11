import fs from 'node:fs';
import path from 'node:path';

const read = (relative: string) => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');

describe('new mistake capture source coverage', () => {
  test.each([
    'app/lesson1.tsx',
    'app/lesson_words.tsx',
    'app/lesson_irregular_verbs.tsx',
    'app/diagnostic_test.tsx',
    // зачем (владелец 11.11.2026, «Проверен, вырезать»): прежний встроенный экран экзамена уровня удалён из app/level_exam.tsx; запись ошибок экзамена уровня — в отдельном модуле
    'app/level_exam_mistake_capture.ts',
    'app/exam.tsx',
    'app/flashcards_swipe.tsx',
    'app/flashcards_blitz_session.tsx',
    'app/flashcards_speaking_session.tsx',
  ])('%s captures through the single new adapter', (relative) => {
    const source = read(relative);
    expect(source).toMatch(/capture(ObjectiveAttempt|CurrentAccountObjectiveAttempt)/);
  });

  // зачем (владелец 11.11, пересмотр обрезанных тестов): случай был вырезан целиком вместе с курсом занятий; живая часть возвращена
  test('manual diagnostic skip is not captured', () => {
    const diagnostic = read('app/diagnostic_test.tsx');
    const skipStart = diagnostic.indexOf('const handleSkip = () =>');
    const skip = diagnostic.slice(skipStart, diagnostic.indexOf('handleSkipRef.current = handleSkip', skipStart));
    expect(skip).not.toContain('captureDiagnosticWrong');
  });
});

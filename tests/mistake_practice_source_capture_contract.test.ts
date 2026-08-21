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
    'app/personal_plan_exercise.tsx',
    'app/learning-v2/session/[id].tsx',
    'app/learning_v2_direct_session_player_v1.tsx',
  ])('%s captures through the single new adapter', (relative) => {
    const source = read(relative);
    expect(source).toMatch(/capture(ObjectiveAttempt|CurrentAccountObjectiveAttempt)/);
  });

  test('technical voice failures remain neutral and manual diagnostic skip is not captured', () => {
    const learning = read('app/learning_v2_direct_session_player_v1.tsx');
    const evaluate = learning.slice(learning.indexOf('const evaluate ='), learning.indexOf('const finish ='));
    expect(evaluate.indexOf('technical_invalid')).toBeLessThan(evaluate.indexOf('captureCurrentAccountObjectiveAttempt({'));
    const diagnostic = read('app/diagnostic_test.tsx');
    const skipStart = diagnostic.indexOf('const handleSkip = () =>');
    const skip = diagnostic.slice(skipStart, diagnostic.indexOf('handleSkipRef.current = handleSkip', skipStart));
    expect(skip).not.toContain('captureDiagnosticWrong');
  });
});

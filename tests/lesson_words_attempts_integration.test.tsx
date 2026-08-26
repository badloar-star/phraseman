import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_words.tsx'), 'utf8');

describe('vocabulary training shared session attempts integration', () => {
  test('renders the shared attempts HUD and recovery modal', () => {
    expect(SOURCE).toContain("from '../components/session_attempts/SessionAttemptsHud'");
    expect(SOURCE).toContain("from '../components/session_attempts/SessionAttemptsRecoveryModal'");
    expect(SOURCE).toContain('<SessionAttemptsHud');
    expect(SOURCE).toContain('<SessionAttemptsRecoveryModal');
  });

  test('third pedagogical wrong stops before the queue advances', () => {
    expect(SOURCE).toContain("verdict: isRight ? 'correct' : 'pedagogical_wrong'");
    expect(SOURCE).toContain("attemptEffect === 'attempts_exhausted'");
    expect(SOURCE).toContain('return; // Keep the current vocabulary card for recovery.');
  });

  test('recovery unlocks the same card and ending uses the existing back route', () => {
    expect(SOURCE).toContain('retryCurrentVocabularyCardAfterRecovery');
    expect(SOURCE).toContain('endAttemptsSession();');
    expect(SOURCE).toContain("safeRouterBack(router, '/lessons_list')");
  });
});

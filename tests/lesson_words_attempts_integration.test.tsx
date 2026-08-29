import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_words.tsx'), 'utf8');

describe('vocabulary training shared session attempts integration', () => {
  test('renders the HUD and automatic reset without a recovery modal', () => {
    expect(SOURCE).toContain("from '../components/session_attempts/SessionAttemptsHud'");
    expect(SOURCE).toContain('<SessionAttemptsHud');
    expect(SOURCE).toContain('useSessionAttemptAutoReset');
    expect(SOURCE).not.toContain('SessionAttemptsRecoveryModal');
  });

  test('third pedagogical wrong stops before the queue advances', () => {
    expect(SOURCE).toContain("verdict: isRight ? 'correct' : 'pedagogical_wrong'");
    expect(SOURCE).toContain("attemptEffect === 'attempts_exhausted'");
    expect(SOURCE).toContain('return; // Keep the current vocabulary card for the automatic reset.');
  });

  test('every user forfeits only pending runes then restores the same card', () => {
    expect(SOURCE).toContain('forfeitPendingRunes');
    expect(SOURCE).toContain('restoreAfterSessionRuneForfeit');
    expect(SOURCE).toContain('retryCurrentVocabularyCardAfterSessionRuneForfeit');
  });
});

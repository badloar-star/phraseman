import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_irregular_verbs.tsx'), 'utf8');

describe('irregular verbs shared session attempts integration', () => {
  test('renders the HUD and automatic reset without a recovery modal', () => {
    expect(SOURCE).toContain("from '../components/session_attempts/SessionAttemptsHud'");
    expect(SOURCE).toContain('<SessionAttemptsHud');
    expect(SOURCE).toContain('useSessionAttemptAutoReset');
    expect(SOURCE).not.toContain('SessionAttemptsRecoveryModal');
  });

  test('third pedagogical wrong stops before the verb or form advances', () => {
    expect(SOURCE).toContain("verdict: isCorrect ? 'correct' : 'pedagogical_wrong'");
    expect(SOURCE).toContain("attemptEffect === 'attempts_exhausted'");
    expect(SOURCE).toContain('return; // Keep the current verb form for the automatic reset.');
  });

  test('every user forfeits only pending runes then restores the same verb form', () => {
    expect(SOURCE).toContain('forfeitPendingRunes');
    expect(SOURCE).toContain('restoreAfterSessionRuneForfeit');
    expect(SOURCE).toContain('retryCurrentVerbFormAfterSessionRuneForfeit');
  });
});

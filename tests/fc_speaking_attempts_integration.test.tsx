import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards_speaking_session.tsx'), 'utf8');

describe('flashcard speaking shared session attempts integration', () => {
  test('renders the common attempts HUD and automatic reset', () => {
    expect(SOURCE).toContain("from '../components/session_attempts/SessionAttemptsHud'");
    expect(SOURCE).toContain('<SessionAttemptsHud');
    expect(SOURCE).toContain('useSessionAttemptAutoReset');
    expect(SOURCE).not.toContain('SessionAttemptsRecoveryModal');
  });

  test('only a final accepted speaking score can consume an attempt', () => {
    expect(SOURCE).toContain("verdict: attempt.passed ? 'correct' : 'pedagogical_wrong'");
    expect(SOURCE).toContain("attemptEffect === 'attempts_exhausted'");
    expect(SOURCE).toContain("verdict: status === 'no_speech' ? 'no_speech' : 'technical_error'");
    expect(SOURCE).toContain("verdict: 'cancelled'");
  });

  test('exhaustion stops capture and recovery resets the same card', () => {
    expect(SOURCE).toContain('stopSpeech();');
    expect(SOURCE).toContain('setHoldActive(false);');
    expect(SOURCE).toContain('resetSpeakingCardAfterSessionRuneForfeit');
    expect(SOURCE).toContain('attemptKeyRef.current += 1');
  });
});

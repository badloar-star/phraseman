import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'flashcards_blitz_session.tsx'),
  'utf8',
);

describe('Blitz shared session attempts integration', () => {
  test('uses the shared three-attempt HUD and automatic reset', () => {
    expect(SOURCE).toContain("from '../components/session_attempts/SessionAttemptsHud'");
    expect(SOURCE).toContain("from '../hooks/useSessionAttempts'");
    expect(SOURCE).toContain('useSessionAttemptAutoReset');
    expect(SOURCE).toContain('<SessionAttemptsHud');
    expect(SOURCE).not.toContain('SessionAttemptsRecoveryModal');
  });

  test('third pedagogical wrong pauses instead of auto-finishing', () => {
    expect(SOURCE).toContain("verdict: isOk ? 'correct' : 'pedagogical_wrong'");
    expect(SOURCE).toContain("attemptEffect === 'attempts_exhausted'");
    expect(SOURCE).toContain('pauseBlitzCountdown');
    expect(SOURCE).not.toContain('setTimeout(finish, 600)');
    expect(SOURCE).not.toContain('heartsShake');
  });

  test('recovery preserves the question and resumes the exact timer remainder', () => {
    expect(SOURCE).toContain('pausedRemainingMsRef');
    expect(SOURCE).toContain('resumeBlitzCountdown');
    expect(SOURCE).toContain('setBtnStates(IDLE_BTNS)');
    expect(SOURCE).not.toContain('nextQuestion(); // recovery');
  });

});

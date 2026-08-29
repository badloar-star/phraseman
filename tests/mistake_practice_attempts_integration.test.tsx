import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'app', 'mistake_practice_session.tsx'), 'utf8');

describe('mistake practice shared session attempts integration', () => {
  test('renders the common attempts HUD and automatic reset', () => {
    expect(SOURCE).toContain("from '../components/session_attempts/SessionAttemptsHud'");
    expect(SOURCE).toContain('<SessionAttemptsHud');
    expect(SOURCE).toContain('useSessionAttemptAutoReset');
    expect(SOURCE).not.toContain('SessionAttemptsRecoveryModal');
  });

  test('registers only the accepted pedagogical verdict and keeps corrective feedback durable', () => {
    expect(SOURCE).toContain("verdict: correct ? 'correct' : 'pedagogical_wrong'");
    expect(SOURCE).toContain("attemptEffect === 'attempts_exhausted'");
    expect(SOURCE.indexOf('setFeedback({')).toBeLessThan(SOURCE.indexOf("attemptEffect === 'attempts_exhausted'"));
  });

  test('stops voice capture before the automatic reset', () => {
    expect(SOURCE).toContain('setSpeechHeld(false);');
    expect(SOURCE).toContain('resetMistakePracticeAfterSessionRuneForfeit');
  });
});

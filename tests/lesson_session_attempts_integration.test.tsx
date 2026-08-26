import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');

describe('ordinary lesson shared session attempts integration', () => {
  test('renders the shared attempts HUD and recovery modal', () => {
    expect(SOURCE).toContain("from '../components/session_attempts/SessionAttemptsHud'");
    expect(SOURCE).toContain("from '../components/session_attempts/SessionAttemptsRecoveryModal'");
    expect(SOURCE).toContain("from '../hooks/useSessionAttempts'");
    expect(SOURCE).toContain('<SessionAttemptsHud');
    expect(SOURCE).toContain('<SessionAttemptsRecoveryModal');
  });

  test('only a pedagogical wrong consumes an attempt and the third wrong pauses on the same phrase', () => {
    expect(SOURCE).toContain("verdict: isRight ? 'correct' : 'pedagogical_wrong'");
    expect(SOURCE).toContain("attemptEffect === 'attempts_exhausted'");
    expect(SOURCE).toContain('SESSION_ATTEMPTS_MOTION.exhaustedModalDelayMs');
    expect(SOURCE).toContain('retryCurrentLessonPhraseAfterRecovery');
  });

  test('ending from the modal follows the existing lesson exit path', () => {
    expect(SOURCE).toContain('endAttemptsSession();');
    expect(SOURCE).toContain('handleLessonHeaderBack();');
  });
});

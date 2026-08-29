import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');

describe('ordinary lesson shared session attempts integration', () => {
  test('renders hearts but never mounts a recovery modal', () => {
    expect(SOURCE).toContain("from '../components/session_attempts/SessionAttemptsHud'");
    expect(SOURCE).toContain("from '../hooks/useSessionAttempts'");
    expect(SOURCE).toContain("from '../hooks/useSessionAttemptAutoReset'");
    expect(SOURCE).toContain('<SessionAttemptsHud');
    expect(SOURCE).not.toContain('SessionAttemptsRecoveryModal');
  });

  test('only a pedagogical wrong consumes an attempt and the third wrong pauses on the same phrase', () => {
    expect(SOURCE).toContain("verdict: isRight ? 'correct' : 'pedagogical_wrong'");
    expect(SOURCE).toContain("attemptEffect === 'attempts_exhausted'");
    expect(SOURCE).toContain('retryCurrentLessonPhraseAfterSessionRuneForfeit');
  });

  test('every user forfeits only pending runes and restores the same lesson phrase', () => {
    expect(SOURCE).toContain('forfeitPendingRunes');
    expect(SOURCE).toContain('restoreAfterSessionRuneForfeit');
  });
});

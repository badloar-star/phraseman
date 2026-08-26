import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'flashcards_swipe.tsx'),
  'utf8',
);

describe('ordinary flashcard training shared session attempts integration', () => {
  test('uses the shared three-attempt HUD and recovery modal', () => {
    expect(SOURCE).toContain("from '../components/session_attempts/SessionAttemptsHud'");
    expect(SOURCE).toContain("from '../components/session_attempts/SessionAttemptsRecoveryModal'");
    expect(SOURCE).toContain("from '../hooks/useSessionAttempts'");
    expect(SOURCE).toContain('<SessionAttemptsHud');
    expect(SOURCE).toContain('<SessionAttemptsRecoveryModal');
  });

  test('only a final pedagogical wrong consumes an attempt and pauses the same prompt', () => {
    expect(SOURCE).toContain("verdict: correct ? 'correct' : 'pedagogical_wrong'");
    expect(SOURCE).toContain("attemptEffect === 'attempts_exhausted'");
    expect(SOURCE).toContain('audio.stop();');
    expect(SOURCE).toContain('SESSION_ATTEMPTS_MOTION.exhaustedModalDelayMs');
    expect(SOURCE).not.toContain('Попытка потеряна');
  });

  test('recovery does not advance, reorder, or reset the active flashcard', () => {
    expect(SOURCE).toContain('await attempts.recoverWithGift();');
    expect(SOURCE).toContain('await attempts.recoverWithRunes();');
    expect(SOURCE).not.toContain('nextQuestion(); // attempt recovery');
    expect(SOURCE).not.toContain('setQueue(buildPromptQueue(trainingCards)); // attempt recovery');
  });
});

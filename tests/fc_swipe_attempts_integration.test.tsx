import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'flashcards_swipe.tsx'),
  'utf8',
);

describe('ordinary flashcard training shared session attempts integration', () => {
  test('uses the shared three-attempt HUD and automatic reset', () => {
    expect(SOURCE).toContain("from '../components/session_attempts/SessionAttemptsHud'");
    expect(SOURCE).toContain("from '../hooks/useSessionAttempts'");
    expect(SOURCE).toContain('useSessionAttemptAutoReset');
    expect(SOURCE).toContain('<SessionAttemptsHud');
    expect(SOURCE).not.toContain('SessionAttemptsRecoveryModal');
  });

  test('only a final pedagogical wrong consumes an attempt and pauses the same prompt', () => {
    expect(SOURCE).toContain("verdict: correct ? 'correct' : 'pedagogical_wrong'");
    // 13.10 (750314a24, режим Б энергии; координатор): экран останавливается по ОБЩЕМУ предикату — attempts_exhausted ИЛИ energy_exhausted. Проверяем не только строку предиката,
    // но и что прямого сравнения только с attempts_exhausted не осталось (иначе на последней энергии занятие шло бы дальше бесплатно).
    expect(SOURCE).toContain("from './session_attempts/session_attempts_stop'");
    expect(SOURCE).toContain('isAttemptsStopEffect(attemptEffect)');
    expect(SOURCE).not.toContain("attemptEffect === 'attempts_exhausted'");
    expect(SOURCE).toContain('audio.stop();');
    expect(SOURCE).not.toContain('Попытка потеряна');
  });

  test('recovery does not advance, reorder, or reset the active flashcard', () => {
    expect(SOURCE).toContain('resetSwipeAfterSessionRuneForfeit');
    expect(SOURCE).not.toContain('nextQuestion(); // attempt recovery');
    expect(SOURCE).not.toContain('setQueue(buildPromptQueue(trainingCards)); // attempt recovery');
  });
});

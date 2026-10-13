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
    // 13.10 (750314a24, режим Б энергии; координатор): экран останавливается по ОБЩЕМУ предикату — attempts_exhausted ИЛИ energy_exhausted. Проверяем не только строку предиката,
    // но и что прямого сравнения только с attempts_exhausted не осталось (иначе на последней энергии занятие шло бы дальше бесплатно).
    expect(SOURCE).toContain("from './session_attempts/session_attempts_stop'");
    expect(SOURCE).toContain('isAttemptsStopEffect(attemptEffect)');
    expect(SOURCE).not.toContain("attemptEffect === 'attempts_exhausted'");
    expect(SOURCE).toContain('return; // Keep the current vocabulary card for the automatic reset.');
  });

  test('every user forfeits only pending runes then restores the same card', () => {
    expect(SOURCE).toContain('forfeitPendingRunes');
    expect(SOURCE).toContain('restoreAfterSessionRuneForfeit');
    expect(SOURCE).toContain('retryCurrentVocabularyCardAfterSessionRuneForfeit');
  });
});

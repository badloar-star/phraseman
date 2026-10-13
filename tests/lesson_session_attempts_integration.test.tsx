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
    // 13.10 (750314a24, режим Б энергии; координатор): экран останавливается по ОБЩЕМУ предикату — attempts_exhausted ИЛИ energy_exhausted. Проверяем не только строку предиката,
    // но и что прямого сравнения только с attempts_exhausted не осталось (иначе на последней энергии занятие шло бы дальше бесплатно).
    expect(SOURCE).toContain("from './session_attempts/session_attempts_stop'");
    expect(SOURCE).toContain('isAttemptsStopEffect(attemptEffect)');
    expect(SOURCE).not.toContain("attemptEffect === 'attempts_exhausted'");
    expect(SOURCE).toContain('retryCurrentLessonPhraseAfterSessionRuneForfeit');
  });

  test('every user forfeits only pending runes and restores the same lesson phrase', () => {
    expect(SOURCE).toContain('forfeitPendingRunes');
    expect(SOURCE).toContain('restoreAfterSessionRuneForfeit');
  });
});

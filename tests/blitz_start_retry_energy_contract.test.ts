/**
 * зачем (сверка 04.10 16:50, BUG_blitz_retry_after_spent / BUG_blitz_instant_finish):
 *  - сторож показывал «Попробовать снова», а запуск шёл дальше и списывал энергию;
 *  - повтор стартовал ВТОРОЙ запуск с тем же receiptId;
 *  - раунд отыгрывал 60 с за экраном ошибки и оставлял итог 0/0, который всплывал после повтора.
 * Сторожим устройство, которое это исключает.
 */
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards_blitz_session.tsx'), 'utf8');
const slice = (from: string, to: string): string => {
  const start = src.indexOf(from);
  const end = src.indexOf(to, start + from.length);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
};

describe('Блиц: запуск, повтор и энергия', () => {
  test('повтор при живом запуске присоединяется к нему и не стартует второй prepare', () => {
    const retry = slice('const retryQuotaStart = useCallback(() => {', '}, [loading, roundId]);');
    expect(retry).toContain('setResult(null);');
    const attach = retry.indexOf("'[FC-BLITZ-GATE] retry:attach_in_flight'");
    const latchReset = retry.indexOf('blitzChargedRoundRef.current = null;');
    expect(attach).toBeGreaterThan(-1);
    // ветка присоединения выходит ДО сброса латча (иначе второй запуск и второе списание)
    expect(attach).toBeLessThan(latchReset);
    expect(retry.slice(attach, latchReset)).toContain('return;');
  });

  test('запуск помечен «в полёте» до своего исхода', () => {
    expect(src).toContain('blitzRunInFlightRef.current = runToken;');
    expect(src).toContain('if (blitzRunInFlightRef.current === runToken) blitzRunInFlightRef.current = null;');
    expect(src).toContain("'[FC-BLITZ-GATE] run:settled'");
  });

  test('дошедший запуск снимает экран ошибки и показывает оплаченный раунд', () => {
    expect(src.split("gateLog('ok:after_retry_screen'").length - 1).toBe(2);
  });

  test('раунд не стартует за экраном ошибки; таймер — с первого кадра с вопросом', () => {
    const round = slice('// ── Старт/рестарт раунда', '// ── Следующий вопрос');
    expect(round).toContain("'[FC-BLITZ-GATE] round:held_behind_retry_screen'");
    expect(round).toMatch(/if \(quotaUnavailable\) \{/);
    expect(round).toContain('scheduleAfterPaint(() => {');
    expect(round).toContain("'[FC-BLITZ-GATE] round:timer_start'");
    expect(round).toContain('cancelAfterPaint(firstFrame)');
    expect(round).toMatch(/energyGate, quotaUnavailable\]\);/);
  });
});

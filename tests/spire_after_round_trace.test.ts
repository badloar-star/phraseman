/**
 * [SPIRE-AFTER-ROUND] (Сверка 25.10, 1 из 2: после «Время вышло» тап «В раздел Пик» → onLater, а картинка итога висит 7+ с;
 * правило владельца «сперва логи»): трасса закрытия окна итога — кто закрыл, смонтировано ли окно через 300 мс и 1 с.
 */
import * as fs from 'fs';
import * as path from 'path';
import { normalizeEol } from './helpers/read_source';
import { noteOutcomeHostMounted, noteOutcomeHostUnmounted, peekOutcomeHost, traceOutcomeCloseAfter } from '../components/spire/spire_outcome_host_trace';

const read = (rel: string) => normalizeEol(fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8'));

describe('[SPIRE-AFTER-ROUND] трасса закрытия итога', () => {
  it('счётчик окон и вердикт через 300 мс и 1 с: снято / всё ещё смонтировано', () => {
    jest.useFakeTimers();
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      noteOutcomeHostMounted('failed');
      expect(peekOutcomeHost().mounted).toBe(1);
      traceOutcomeCloseAfter('failed');
      jest.advanceTimersByTime(300);
      expect(log.mock.calls.some((c) => String(c[0]).includes('через 300мс после toSpire kind=failed: ОКНО ВСЁ ЕЩЁ СМОНТИРОВАНО'))).toBe(true);
      noteOutcomeHostUnmounted('failed', 'outcome_cleared');
      jest.advanceTimersByTime(700);
      expect(log.mock.calls.some((c) => String(c[0]).includes('через 1000мс после toSpire kind=failed: окно снято всего=0'))).toBe(true);
    } finally {
      log.mockRestore();
      jest.useRealTimers();
    }
  });

  it('проводка: окно отмечает монтирование и снятие, «В раздел Пик» запускает проверку, dismissOutcome пишет, что обнулил', () => {
    const host = read('components/spire/moments/SpireOutcomeMomentHost.tsx');
    expect(host).toContain('noteOutcomeHostMounted(kind);');
    expect(host).toContain("return () => noteOutcomeHostUnmounted(kind, 'outcome_cleared_or_screen_unmounted');");
    expect(host).toContain('onShow={');
    const choice = read('components/spire/use_after_round_choice.ts');
    expect(choice.indexOf('a.onLater();')).toBeLessThan(choice.indexOf('traceOutcomeCloseAfter(a.outcome.kind);'));
    expect(read('app/spire/use_spire_game.ts')).toContain('[SPIRE-AFTER-ROUND] dismissOutcome: итог');
  });
});

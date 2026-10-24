/**
 * [PEAK-PERF] (жалоба №3 «Пик: дальше 6–7 шага не уйти, сильно тормозит», координатор 24.10): сводка кадров считается верно,
 * а худший случай поиска верного порядка слов после ошибки в «Собери фразу» замерен — это синхронная работа в кадре.
 */
import { summarizePeakFrames } from '../app/spire/peak_perf_probe';
import { SPIRE_REVEAL_MAX_TRIES, spireRevealTokens } from '../modules/spire/answer_reveal';

describe('[PEAK-PERF] сводка кадров', () => {
  it('средний, худший и число длинных кадров (>50 мс)', () => {
    expect(summarizePeakFrames([16, 17, 80, 16, 120])).toEqual({ frames: 5, avgMs: 49.8, maxMs: 120, longFrames: 2 });
    expect(summarizePeakFrames([])).toEqual({ frames: 0, avgMs: 0, maxMs: 0, longFrames: 0 });
  });
});

describe('[PEAK-PERF] поиск верного порядка слов — худший случай', () => {
  it('9 слов в банке, 8 в ответе, отпечаток не находится: упирается в потолок перебора', () => {
    const bank = ['I', 'have', 'been', 'waiting', 'for', 'you', 'since', 'noon', 'today'];
    const started = Date.now();
    const found = spireRevealTokens('salt', 'task', bank, 8, 'no-such-fingerprint');
    const ms = Date.now() - started;
    // eslint-disable-next-line no-console
    console.log(`[PEAK-PERF] reveal worst case node: ${ms}мс на ${SPIRE_REVEAL_MAX_TRIES} попыток`); // guard-ok: замер для отчёта
    expect(found).toBeNull();
  });
});

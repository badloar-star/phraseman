/**
 * [PEAK-PERF] (жалоба №3 «Пик: дальше 6–7 шага не уйти, сильно тормозит», координатор 24.10): сводка кадров считается верно,
 * а худший случай поиска верного порядка слов после ошибки в «Собери фразу» замерен — это синхронная работа в кадре.
 */
import { normalizeEol } from './helpers/read_source';
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

describe('[PEAK-PERF] правка (координатор 24.10): поиск после отрисовки ошибки и с коротким потолком', () => {
  it('потолок 5 000 — в разы дешевле 40 000; найденный порядок совпадает', () => {
    const { SPIRE_REVEAL_FAST_TRIES } = require('../modules/spire/answer_reveal') as typeof import('../modules/spire/answer_reveal');
    const bank = ['I', 'have', 'been', 'waiting', 'for', 'you', 'since', 'noon', 'today'];
    const started = Date.now();
    expect(spireRevealTokens('salt', 'task', bank, 8, 'no-such-fingerprint', SPIRE_REVEAL_FAST_TRIES)).toBeNull();
    // eslint-disable-next-line no-console
    console.log(`[PEAK-PERF] reveal capped node: ${Date.now() - started}мс на ${SPIRE_REVEAL_FAST_TRIES} попыток`); // guard-ok: замер для отчёта
    const { arenaAnswerFingerprint } = require('../modules/arena/answer_check') as typeof import('../modules/arena/answer_check');
    const fp = arenaAnswerFingerprint('salt', 'task', ['you', 'have', 'been']);
    expect(spireRevealTokens('salt', 'task', ['have', 'you', 'been', 'x'], 3, fp, SPIRE_REVEAL_FAST_TRIES)).toEqual(['you', 'have', 'been']);
  });

  it('движок ступени не ищет в момент тапа: ошибка рисуется сразу, порядок — после отрисовки, в подсказку и «Мои ошибки»', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = normalizeEol(fs.readFileSync(path.resolve(__dirname, '..', 'app', 'spire', 'use_spire_step_runner.ts'), 'utf8'));
    expect(src).not.toMatch(/spireRevealTokens\(/);
    expect(src).toContain('revealTokensAfterPaint({');
    expect(src).toContain("correctText: ok ? tokens.join(' ') : null");
    expect(src).toMatch(/Promise\.resolve\(correctOrLater\)\.then\(\(correct\) => \{[\s\S]{0,300}correctText: correct\.join\(' '\)[\s\S]{0,300}spireCaptureMistakeOutcome\(/);
  });
});

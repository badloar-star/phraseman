// ═══════════════════════════════════════════════════════════════════════════
// Ряд столбиков для статистики раздела MAX (макет владельца со столбиками).
//
// Опасное место — честность роста. Показать «↑» там, где предыдущий отрезок
// пуст, значит соврать человеку: с нуля растёт что угодно.
// ═══════════════════════════════════════════════════════════════════════════

import {
  WEEKLY_BARS,
  computeVoiceWeeklySeries,
  type VoiceCallTrendSample,
} from '../app/max_voice_metrics';

const NOW = 1_800_000_000_000;

const sample = (daysAgo: number, over: Partial<VoiceCallTrendSample> = {}): VoiceCallTrendSample => ({
  atMs: NOW - daysAgo * 24 * 60 * 60 * 1000,
  speechSec: 60,
  uniqueWords: 10,
  cleanPhrases: 5,
  totalPhrases: 10,
  ...over,
});

describe('computeVoiceWeeklySeries', () => {
  it('рисует ровно WEEKLY_BARS столбиков', () => {
    const out = computeVoiceWeeklySeries([], NOW);
    expect(out.bars).toHaveLength(WEEKLY_BARS);
    expect(out.filledBars).toBe(0);
  });

  it('замер этой же миллисекунды попадает в последний столбик', () => {
    // Иначе только что законченный урок проваливался бы между делениями.
    const out = computeVoiceWeeklySeries([sample(0, { speechSec: 180 })], NOW);
    expect(out.bars[out.bars.length - 1]).toBe(3);
    expect(out.filledBars).toBe(1);
  });

  it('считает рост последнего отрезка к предыдущему', () => {
    // Шаг столбика — 3.5 дня: 5 дней назад это предыдущий отрезок.
    const out = computeVoiceWeeklySeries(
      [sample(5, { speechSec: 600 }), sample(1, { speechSec: 900 })],
      NOW,
    );
    expect(out.changePct).toBe(50);
  });

  it('не делит на ноль: рост с пустого отрезка не показывается', () => {
    const out = computeVoiceWeeklySeries([sample(1, { speechSec: 600 })], NOW);
    expect(out.changePct).toBeNull();
  });

  it('падение показывается отрицательным числом', () => {
    const out = computeVoiceWeeklySeries(
      [sample(5, { speechSec: 600 }), sample(1, { speechSec: 300 })],
      NOW,
    );
    expect(out.changePct).toBe(-50);
  });

  it('замеры старше окна в ряд не попадают', () => {
    const out = computeVoiceWeeklySeries([sample(40, { speechSec: 6000 })], NOW);
    expect(out.bars.every((b) => b === 0)).toBe(true);
  });
});

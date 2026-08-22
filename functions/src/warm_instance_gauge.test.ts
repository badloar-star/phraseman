// Тест чистой математики шкалы тёплых инстансов: паузы, вердикты, активные часы.
// Без сети и Firebase — только computeWarmGaugeStats.

import { computeWarmGaugeStats, COLD_GAP_MIN } from './warm_instance_gauge';

const MIN = 60_000;
const DAY = 86_400_000;
const START = 1_756_000_000_000; // произвольный фиксированный старт окна
const alwaysDayHour = () => 12;  // все события «днём» (активные часы)
const alwaysNightHour = () => 3; // все события «ночью»

describe('computeWarmGaugeStats', () => {
  test('пустое окно → no_data и нулевая шкала', () => {
    const s = computeWarmGaugeStats([], START, START + DAY, alwaysDayHour);
    expect(s.verdict).toBe('no_data');
    expect(s.readinessPct).toBe(0);
    expect(s.totalRequests).toBe(0);
  });

  test('запрос каждую минуту → ноль холодных стартов, можно отключать', () => {
    const points = Array.from({ length: 1440 }, (_, i) => ({ minuteMs: START + i * MIN, count: 2 }));
    const s = computeWarmGaugeStats(points, START, START + DAY, alwaysDayHour);
    expect(s.coldStartsPerDay).toBe(0);
    expect(s.maxGapMin).toBe(0);
    expect(s.verdict).toBe('ready');
    expect(s.readinessPct).toBe(100);
    expect(s.totalRequests).toBe(2880);
  });

  test('соседние минутные бакеты не считаются паузой, а порог — считается', () => {
    const points = [
      { minuteMs: START, count: 1 },
      { minuteMs: START + 1 * MIN, count: 1 },                    // тишина 0 мин
      { minuteMs: START + (2 + COLD_GAP_MIN) * MIN, count: 1 },   // тишина ровно COLD_GAP_MIN
    ];
    const s = computeWarmGaugeStats(points, START, START + DAY, alwaysDayHour);
    expect(s.coldStartsPerDay).toBe(1);
    expect(s.maxGapMin).toBe(COLD_GAP_MIN);
  });

  test('редкий трафик раз в час → много холодных стартов, держать тёплым', () => {
    const points = Array.from({ length: 24 }, (_, i) => ({ minuteMs: START + i * 60 * MIN, count: 1 }));
    const s = computeWarmGaugeStats(points, START, START + DAY, alwaysDayHour);
    expect(s.coldStartsPerDay).toBe(23);
    expect(s.verdict).toBe('keep');
    expect(s.readinessPct).toBe(0);
  });

  test('холодные старты только ночью → в активные часы чисто, вердикт ready', () => {
    const points = Array.from({ length: 24 }, (_, i) => ({ minuteMs: START + i * 60 * MIN, count: 1 }));
    const s = computeWarmGaugeStats(points, START, START + DAY, alwaysNightHour);
    expect(s.coldStartsPerDay).toBe(23);
    expect(s.coldStartsPerDayActive).toBe(0);
    expect(s.verdict).toBe('ready');
  });

  test('точки вне окна отбрасываются', () => {
    const points = [
      { minuteMs: START - 10 * MIN, count: 5 },
      { minuteMs: START + 10 * MIN, count: 1 },
      { minuteMs: START + DAY + 10 * MIN, count: 5 },
    ];
    const s = computeWarmGaugeStats(points, START, START + DAY, alwaysDayHour);
    expect(s.totalRequests).toBe(1);
  });
});

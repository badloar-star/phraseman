import {
  dailyQuotaFromLimits,
  dailyQuotaRemainingAt,
  dailyQuotaView,
} from '../app/max_call_daily_quota';

describe('MAX daily quota projection', () => {
  it('restores a premint reservation before the call consumes it', () => {
    expect(dailyQuotaFromLimits({
      dayRemainingSec: 13_860,
      reservedSec: 300,
      dailyVoiceSecMax: 14_400,
    })).toEqual({ startRemainingSec: 14_160, maxSec: 14_400 });
  });

  it('subtracts only active elapsed seconds and clamps at zero', () => {
    expect(dailyQuotaRemainingAt(600, 1_000, 61_400)).toBe(540);
    expect(dailyQuotaRemainingAt(10, 1_000, 20_000)).toBe(0);
  });

  it('returns stable minute, fraction, and tone values', () => {
    expect(dailyQuotaView(14_160, 14_400)).toEqual({
      minutes: 236,
      fraction: 0.9833333333333333,
      tone: 'normal',
      seconds: 14_160,
      lastMinute: false,
    });
    expect(dailyQuotaView(1_800, 14_400).tone).toBe('amber');
    expect(dailyQuotaView(60, 14_400).tone).toBe('red');
  });

  // зачем (аудит 2026-08-24): minutes считается floor'ом, поэтому последние
  // 59 секунд экран показывал «0 мин», пока разговор ещё шёл — читалось как
  // сломанный счётчик. Ниже минуты UI обязан показывать секунды.
  it('flags the last minute so the meter can show seconds instead of a lying zero', () => {
    // Ровно 60с — ещё честная «1 мин», секунды не нужны.
    expect(dailyQuotaView(60, 14_400)).toMatchObject({ minutes: 1, lastMinute: false });
    expect(dailyQuotaView(59, 14_400)).toMatchObject({ minutes: 0, seconds: 59, lastMinute: true });
    expect(dailyQuotaView(1, 14_400)).toMatchObject({ seconds: 1, lastMinute: true });
    // Ноль — это уже не «последняя минута»: экран обязан сказать «0 мин»,
    // а не нелепое «0 сек» после завершения/до выдачи пробника.
    expect(dailyQuotaView(0, 14_400)).toMatchObject({ minutes: 0, seconds: 0, lastMinute: false });
  });

  it('accepts snake-case aliases without exceeding the maximum', () => {
    expect(dailyQuotaFromLimits({
      day_remaining_sec: 20_000,
      reserved_sec: 300,
      day_max_sec: 14_400,
    })).toEqual({ startRemainingSec: 14_400, maxSec: 14_400 });
  });
});

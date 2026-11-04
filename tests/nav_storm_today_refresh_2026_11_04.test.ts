// «Шторм» при навигации (координатор 04.11): возврат в приложение чаще раза в 20 с не запускает обновление «Сегодня» заново; вход, полночь и смена пары — всегда.
import { FOREGROUND_REFRESH_MIN_MS, shouldSkipForegroundRefresh } from '../hooks/use_today_tasks';

const base = { pairKey: 'en|1', lastPairKey: 'en|1', lastStartedAtMs: 1_000_000, nowMs: 1_005_000 };

describe('shouldSkipForegroundRefresh', () => {
  it('возврат через 5 с после прошлого запуска — пропуск', () => expect(shouldSkipForegroundRefresh({ ...base, reason: 'foreground' })).toBe(true));
  it('возврат через ≥20 с — обновляем', () => expect(shouldSkipForegroundRefresh({ ...base, reason: 'foreground', nowMs: 1_000_000 + FOREGROUND_REFRESH_MIN_MS })).toBe(false));
  it('вход, полночь и смена цели не пропускаются никогда', () => {
    expect(shouldSkipForegroundRefresh({ ...base, reason: 'mount_or_target_change' })).toBe(false);
    expect(shouldSkipForegroundRefresh({ ...base, reason: 'local_midnight' })).toBe(false);
  });
  it('другая пара (язык/флаг Шпиля) — обновляем даже при быстром возврате', () => expect(shouldSkipForegroundRefresh({ ...base, reason: 'foreground', pairKey: 'es|1' })).toBe(false));
  it('часы ушли назад — обновляем', () => expect(shouldSkipForegroundRefresh({ ...base, reason: 'foreground', nowMs: 900_000 })).toBe(false));
});

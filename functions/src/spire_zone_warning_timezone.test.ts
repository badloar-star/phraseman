// зачем (🟡 №3 симуляции Шпиля, 12.10): воскресное предупреждение «зона» — в 20:00 по поясу человека, а не всем в 20:00 UTC
// (на Бали было 04:00). Выкладка — после починки TS2352 у Codex.
import { isSpireZoneWarningDueNow, spireZoneWarningDueHourUtc } from './spire_zone_warning_push';

// Неделя, кончающаяся в пн 12.10.2026 00:00 UTC (летнее время в США ещё действует), и неделя после перехода (пн 09.11).
const WEEK_END_SUMMER = Date.UTC(2026, 9, 12);
const WEEK_END_WINTER = Date.UTC(2026, 10, 9);

describe('час отправки по поясу', () => {
  it.each([
    ['Europe/Moscow', WEEK_END_SUMMER, 17],       // UTC+3 → 20:00 = 17:00 UTC
    ['Asia/Makassar', WEEK_END_SUMMER, 12],       // Бали UTC+8 → 12:00 UTC
    ['Europe/Kyiv', WEEK_END_SUMMER, 17],         // UTC+3 летом
    ['Europe/Kyiv', WEEK_END_WINTER, 18],         // UTC+2 зимой
    ['Asia/Tokyo', WEEK_END_SUMMER, 11],
    ['Pacific/Kiritimati', WEEK_END_SUMMER, 6],   // UTC+14 → 06:00 UTC, первый прогон
    ['America/New_York', WEEK_END_SUMMER, 22],    // 20:00 EDT = пн 00:00 UTC — после конца недели → запасной 22:00
    ['Pacific/Honolulu', WEEK_END_SUMMER, 22],    // запасной
    ['Europe/London', WEEK_END_WINTER, 20],
  ] as const)('%s → %s UTC', (tz, weekEnd, expected) => {
    expect(spireZoneWarningDueHourUtc(tz, weekEnd)).toBe(expected);
  });

  it('пояса нет или он битый — как раньше, 20:00 UTC', () => {
    expect(spireZoneWarningDueHourUtc(null, WEEK_END_SUMMER)).toBe(20);
    expect(spireZoneWarningDueHourUtc('Not/AZone', WEEK_END_SUMMER)).toBe(20);
  });

  it('слать на своём часе и на следующем (одна попытка догнать), но не раньше', () => {
    const sunday = WEEK_END_SUMMER - 24 * 3_600_000;
    expect(isSpireZoneWarningDueNow('Asia/Makassar', sunday + 12 * 3_600_000 + 60_000, WEEK_END_SUMMER)).toBe(true);
    expect(isSpireZoneWarningDueNow('Asia/Makassar', sunday + 13 * 3_600_000 + 60_000, WEEK_END_SUMMER)).toBe(true);
    expect(isSpireZoneWarningDueNow('Asia/Makassar', sunday + 11 * 3_600_000 + 60_000, WEEK_END_SUMMER)).toBe(false);
    expect(isSpireZoneWarningDueNow('Asia/Makassar', sunday + 17 * 3_600_000 + 60_000, WEEK_END_SUMMER)).toBe(false);
  });
});

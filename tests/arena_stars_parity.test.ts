import * as server from '../functions/src/stars_ledger';
import * as client from '../app/stars_view';

/**
 * Паритет проекций звёзд.
 *
 * Клиент и сервер считают недельный и сезонный счётчик РАЗНЫМИ файлами: сервер
 * не может импортировать клиентский код, клиент не может импортировать
 * серверный. Расхождение между ними означает, что игрок видит одно число, а
 * получает другое — и заметит это ровно в момент, когда награда не откроется.
 *
 * Поэтому обе реализации прогоняются здесь на одних и тех же входах.
 */

const cases = [
  { weekKey: '2026-W33', weekEarned: 40, prevWeekKey: '2026-W32', prevWeekEarned: 12 },
  { weekKey: '', weekEarned: 0, prevWeekKey: '', prevWeekEarned: 0 },
  { weekKey: '2026-W01', weekEarned: 7, prevWeekKey: '2025-W52', prevWeekEarned: 99 },
];

const state = (over: Record<string, unknown>) => ({
  ...server.EMPTY_STARS_STATE,
  seasonId: 'arena-2026-08-01',
  seasonEarned: 120,
  balance: 80,
  earnedTotal: 120,
  spentTotal: 40,
  ...over,
});

describe('паритет клиентской и серверной проекций звёзд', () => {
  it.each(cases)('одинаково считает неделю для %j', (over) => {
    const raw = state(over);
    const clientState = client.normalizeStarsView(raw);
    for (const probe of ['2026-W33', '2026-W32', '2026-W01', '2025-W52', '2020-W01']) {
      expect(client.starsWeekEarned(clientState, probe))
        .toBe(server.starsWeekEarned(raw as never, probe));
    }
  });

  it('одинаково считает сезон, включая чужой', () => {
    const raw = state({});
    const clientState = client.normalizeStarsView(raw);
    for (const probe of ['arena-2026-08-01', 'arena-2026-06-01', '']) {
      expect(client.starsSeasonEarned(clientState, probe))
        .toBe(server.starsSeasonEarned(raw as never, probe));
    }
  });

  it('одинаково считает тратимый баланс', () => {
    const raw = state({});
    expect(client.starsSpendable(client.normalizeStarsView(raw)))
      .toBe(server.starsSpendable(raw as never));
    expect(client.starsSpendable(undefined)).toBe(server.starsSpendable(undefined));
  });

  it('держит версию схемы одинаковой на обеих сторонах', () => {
    expect(client.STARS_SCHEMA_VERSION).toBe(server.STARS_SCHEMA_VERSION);
  });

  it('не даёт тратам уменьшить заработанное за всё время', () => {
    // D-10: счётчик, открывающий награды, от трат не зависит.
    const raw = state({});
    expect(client.starsEarnedAllTime(client.normalizeStarsView(raw))).toBe(120);
    expect(client.starsSpendable(client.normalizeStarsView(raw))).toBe(80);
  });
});

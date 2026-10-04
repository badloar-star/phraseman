// зачем (жалоба «серия висит», 04.10): при серии N и последнем засчитанном дне последние min(N,7) дней недели обязаны быть отмечены,
// даже если журнал времени в приложении пуст; «сегодня» — локальный день, как у счётчика.
import { buildStatsActivityRows, streakImpliedDayKeys } from '../modules/stats_activity_rows';

const pad = (n: number): string => String(n).padStart(2, '0');
const key = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const NOW = new Date(2026, 9, 4, 12, 0, 0); // воскресенье 4 октября 2026, локальный полдень
const TODAY = key(NOW);
const daysAgo = (n: number): string => key(new Date(2026, 9, 4 - n, 12, 0, 0));

describe('week marks follow the streak counter', () => {
  it('streak 8 counted today marks the last 7 days with an empty time journal', () => {
    const rows = buildStatsActivityRows({}, {}, 8, NOW, TODAY);
    const last7 = rows.days.slice(-7);
    expect(last7.map((d) => d.date)).toEqual([6, 5, 4, 3, 2, 1, 0].map(daysAgo));
    expect(last7.every((d) => d.active)).toBe(true);
  });

  it('streak 3 last counted yesterday marks yesterday and two days before, not today', () => {
    const rows = buildStatsActivityRows({}, {}, 3, NOW, daysAgo(1));
    const activeDates = rows.days.filter((d) => d.active).map((d) => d.date);
    expect(activeDates).toEqual([3, 2, 1].map(daysAgo));
    expect(rows.days[rows.days.length - 1].active).toBe(false);
  });

  it('min(N,7): streak 2 counted today marks only today and yesterday', () => {
    const rows = buildStatsActivityRows({}, {}, 2, NOW, TODAY);
    expect(rows.days.filter((d) => d.active).map((d) => d.date)).toEqual([1, 0].map(daysAgo));
  });

  it('a stale last counted day (older than yesterday) or zero streak marks nothing', () => {
    expect(buildStatsActivityRows({}, {}, 5, NOW, daysAgo(3)).days.some((d) => d.active)).toBe(false);
    expect(buildStatsActivityRows({}, {}, 0, NOW, TODAY).days.some((d) => d.active)).toBe(false);
    expect(streakImpliedDayKeys(5, null, TODAY)).toEqual([]);
  });

  it('time-based marks still count and combine with the streak days', () => {
    const rows = buildStatsActivityRows({}, { [daysAgo(6)]: 120_000 }, 2, NOW, TODAY);
    expect(rows.days.filter((d) => d.active).map((d) => d.date)).toEqual([daysAgo(6), daysAgo(1), daysAgo(0)]);
    expect(rows.activeDays).toBe(3);
  });
});

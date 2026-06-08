import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isMirrorWorthShowing,
  sumDailyBreakdownSince,
  type ProgressMirror,
} from '../app/paywall_progress_mirror';
import { statsDailyBreakdownKey } from '../app/target_storage_keys';

// Хелпер: дата YYYY-MM-DD со сдвигом на N дней от заданной точки.
function dayStr(base: Date, offsetDays: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0]!;
}

describe('paywall_progress_mirror — isMirrorWorthShowing', () => {
  const base: ProgressMirror = { lessons: 0, phrases: 0, words: 0, xp: 0, streak: 0 };

  it('скрывает блок при пустом прогрессе', () => {
    expect(isMirrorWorthShowing(base)).toBe(false);
  });

  it('показывает при достаточном числе уроков', () => {
    expect(isMirrorWorthShowing({ ...base, lessons: 2 })).toBe(true);
  });

  it('показывает при достаточном числе фраз даже без уроков', () => {
    expect(isMirrorWorthShowing({ ...base, phrases: 10 })).toBe(true);
  });

  it('скрывает при единственном уроке и малом числе фраз', () => {
    expect(isMirrorWorthShowing({ ...base, lessons: 1, phrases: 3 })).toBe(false);
  });
});

describe('paywall_progress_mirror — sumDailyBreakdownSince', () => {
  beforeEach(() => {
    (AsyncStorage as unknown as { __reset: () => void }).__reset();
  });

  it('суммирует метрику по дням начиная с даты старта (включительно)', async () => {
    const now = new Date('2026-06-08T12:00:00.000Z');
    const startedAt = new Date('2026-06-06T00:00:00.000Z').getTime(); // 3 дня окно
    const store = {
      [dayStr(now, -3)]: { phrases_learned: 99 }, // до окна — не считается
      [dayStr(now, -2)]: { phrases_learned: 10 },
      [dayStr(now, -1)]: { phrases_learned: 20 },
      [dayStr(now, 0)]: { phrases_learned: 8 },
    };
    await AsyncStorage.setItem(statsDailyBreakdownKey('en'), JSON.stringify(store));

    const sum = await sumDailyBreakdownSince('phrases_learned', startedAt, now.getTime());
    expect(sum).toBe(38);
  });

  it('складывает значения по обоим таргетам (en + fr) за один день', async () => {
    const now = new Date('2026-06-08T12:00:00.000Z');
    const startedAt = new Date('2026-06-07T00:00:00.000Z').getTime();
    await AsyncStorage.setItem(
      statsDailyBreakdownKey('en'),
      JSON.stringify({ [dayStr(now, 0)]: { words_learned: 5 } }),
    );
    await AsyncStorage.setItem(
      statsDailyBreakdownKey('fr'),
      JSON.stringify({ [dayStr(now, 0)]: { words_learned: 3 } }),
    );

    const sum = await sumDailyBreakdownSince('words_learned', startedAt, now.getTime());
    expect(sum).toBe(8);
  });

  it('возвращает 0 при отсутствии данных', async () => {
    const sum = await sumDailyBreakdownSince('phrases_learned', Date.now() - 1000, Date.now());
    expect(sum).toBe(0);
  });

  it('возвращает 0 при некорректном startedAt', async () => {
    const sum = await sumDailyBreakdownSince('phrases_learned', 0, Date.now());
    expect(sum).toBe(0);
  });
});

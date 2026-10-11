// зачем (координатор 11.10, пп.9–11): статистика и время в приложении при восстановлении — максимум по полю/дате.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { __cloudSyncTestHooks } from '../app/cloud_sync';
import { mergeNumericMaxRestoreValue } from '../app/restore_numeric_max_merge';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

describe('mergeNumericMaxRestoreValue', () => {
  it('числа — максимум, вложенные карты — по ключу, локальный ключ без пары переживает', () => {
    const local = JSON.stringify({ answersTotal: 50, energyHits: 1, featuresOpened: { cards: 4, only_local: 2 } });
    const cloud = JSON.stringify({ answersTotal: 40, energyHits: 3, featuresOpened: { cards: 2, only_cloud: 1 } });
    expect(JSON.parse(mergeNumericMaxRestoreValue(local, cloud))).toEqual({
      answersTotal: 50, energyHits: 3, featuresOpened: { cards: 4, only_cloud: 1, only_local: 2 },
    });
  });

  it('daily_stats: максимум внутри каждой даты, локальная дата без пары переживает', () => {
    const local = JSON.stringify({ '2026-10-10': { points: 30, lessons: 1 }, '2026-10-11': { points: 12 } });
    const cloud = JSON.stringify({ '2026-10-10': { points: 20, lessons: 3 }, '2026-10-09': 5 });
    expect(JSON.parse(mergeNumericMaxRestoreValue(local, cloud))).toEqual({
      '2026-10-09': 5, '2026-10-10': { points: 30, lessons: 3 }, '2026-10-11': { points: 12 },
    });
  });

  it('скаляр (общее время) — максимум; облако больше — облачная строка как есть', () => {
    expect(mergeNumericMaxRestoreValue('9000', '5000')).toBe('9000');
    expect(mergeNumericMaxRestoreValue('1000', '5000')).toBe('5000');
  });

  it('битое облако — локальное; битое/пустое локальное — облако', () => {
    expect(mergeNumericMaxRestoreValue('{"a":1}', 'not json')).toBe('{"a":1}');
    expect(mergeNumericMaxRestoreValue('not json', '{"a":1}')).toBe('{"a":1}');
    expect(mergeNumericMaxRestoreValue(null, '{"a":1}')).toBe('{"a":1}');
  });
});

describe('ветка «облако главнее»: статистика не откатывается', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('user_stats_v1, время в приложении и daily_stats', async () => {
    await AsyncStorage.multiSet([
      ['streak_count', '0'],
      ['user_stats_v1', JSON.stringify({ answersTotal: 50 })],
      ['phraseman_foreground_usage_ms_v1', '9000'],
      ['phraseman_foreground_daily_ms_v1', JSON.stringify({ '2026-10-11': 4000 })],
      ['daily_stats', JSON.stringify({ '2026-10-11': { points: 12 } })],
    ]);
    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc({
      exists: true,
      data: () => ({ progress: {
        streak_count: '5',
        last_active_date: '2026-10-10',
        user_stats_v1: JSON.stringify({ answersTotal: 40 }),
        phraseman_foreground_usage_ms_v1: '5000',
        phraseman_foreground_daily_ms_v1: JSON.stringify({ '2026-10-10': 3000 }),
        daily_stats: JSON.stringify({ '2026-10-10': { points: 20 } }),
      } }),
    });
    expect(restored).toBe(true);
    expect(JSON.parse((await AsyncStorage.getItem('user_stats_v1')) ?? '{}').answersTotal).toBe(50);
    expect(await AsyncStorage.getItem('phraseman_foreground_usage_ms_v1')).toBe('9000');
    expect(JSON.parse((await AsyncStorage.getItem('phraseman_foreground_daily_ms_v1')) ?? '{}')).toEqual({ '2026-10-10': 3000, '2026-10-11': 4000 });
    expect(Object.keys(JSON.parse((await AsyncStorage.getItem('daily_stats')) ?? '{}')).sort()).toEqual(['2026-10-10', '2026-10-11']);
  });
});

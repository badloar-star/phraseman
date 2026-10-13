/**
 * зачем (аудит Optimistic UI 13.10): сбой записи серии выдавался за успех — updateStreakOnActivity возвращала 0, день
 * помечался засчитанным, тост показывал «День засчитан 🔥 1», хотя ничего не записано, и повторов до конца дня не было.
 * Теперь: -1, день не помечен, «засчитано» не публикуется, следующее учебное действие пробует снова.
 */
import { addLocalDays, getLocalDayKey } from '../app/local_date';
import { STREAK_RULE_V137_SINCE_KEY } from '../app/streak_day_signal';

let AsyncStorage: typeof import('@react-native-async-storage/async-storage').default;

beforeEach(async () => {
  jest.resetModules();
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.clear();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

test('сбой записи серии: -1, день не помечен, «засчитано» не публикуется; следующее действие пробует снова', async () => {
  const today = getLocalDayKey();
  await AsyncStorage.multiSet([
    [STREAK_RULE_V137_SINCE_KEY, addLocalDays(today, -3)],
    ['last_active_date', addLocalDays(today, -1)],
    ['streak_count', '4'],
  ]);
  const hall = require('../app/hall_of_fame_utils');
  const signal = require('../app/streak_day_signal');
  const eventsModule = require('../app/events');
  const events: unknown[] = [];
  jest.spyOn(eventsModule, 'emitAppEvent').mockImplementation((...args: unknown[]) => {
    if (args[0] === 'streak_day_counted') events.push(args[1]);
  });
  const realSetItem = AsyncStorage.setItem.bind(AsyncStorage);
  const setItem = jest.spyOn(AsyncStorage, 'setItem').mockImplementation(async (key: string, value: string) => {
    if (key === 'last_active_date') throw new Error('disk_full');
    return realSetItem(key, value);
  });

  await expect(hall.touchStreakForToday('activity:lesson')).resolves.toBe(-1);
  expect(events).toHaveLength(0);
  expect(signal.peekStreakDayState()?.counted ?? false).toBe(false);

  // Диск ожил — следующее учебное действие засчитывает день (день не был помечен «тронутым»).
  setItem.mockRestore();
  const retry = hall.touchStreakForToday('activity:cards');
  expect(retry).not.toBeNull();
  await expect(retry).resolves.toBeGreaterThan(0);
  expect(events).toHaveLength(1);
});

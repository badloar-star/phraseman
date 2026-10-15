/**
 * §137 (04.10): день серии засчитывает только завершённое учебное действие (урок / карточки /
 * «Мои ошибки»). Открытие приложения лишь сверяет серию; в день перехода — старое правило.
 */
import { addLocalDays, getLocalDayKey } from '../app/local_date';
import { classifyStreakTouch, isLegacyRuleDay, STREAK_RULE_V137_SINCE_KEY } from '../app/streak_day_signal';

// Свежий набор модулей на каждый тест (состояние «день засчитан» живёт в памяти модуля);
// хранилище берём из того же набора, иначе тест и код видят разные экземпляры.
let AsyncStorage: typeof import('@react-native-async-storage/async-storage').default;

type Loaded = {
  touch: (reason: string) => Promise<number> | null;
  peek: () => { counted: boolean; days: number } | null;
  events: Array<{ days: number; source: string }>;
};

function load(): Loaded {
  let loaded!: Loaded;
  {
    const hall = require('../app/hall_of_fame_utils');
    const signal = require('../app/streak_day_signal');
    const eventsModule = require('../app/events');
    const events: Array<{ days: number; source: string }> = [];
    // DeviceEventEmitter в jest — заглушка, поэтому ловим сам вызов шины.
    jest.spyOn(eventsModule, 'emitAppEvent').mockImplementation((...args: unknown[]) => {
      if (args[0] === 'streak_day_counted') events.push(args[1] as { days: number; source: string });
    });
    loaded = { touch: hall.touchStreakForToday, peek: signal.peekStreakDayState, events };
  }
  return loaded;
}

const today = () => getLocalDayKey();
const daysAgo = (n: number) => addLocalDays(today(), -n);

beforeEach(async () => {
  jest.resetModules();
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.clear();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

// R35 (Ревизор/координатор 15.10): ступень Пика засчитывает день тем же путём, что урок (раньше — «в обход» серии).
test('lesson / cards / mistakes / finished dialog / Spire step count the day; opening and other actions are passive', () => {
  for (const kind of ['lesson', 'cards', 'mistakes', 'dialog', 'spire_steps']) expect(classifyStreakTouch(`activity:${kind}`).mode).toBe('count');
  for (const reason of ['activity:video', 'cold_start', 'foreground']) {
    expect(classifyStreakTouch(reason).mode).toBe('passive');
  }
});

test('legacy rule applies only on the first day with the new rule', () => {
  expect(isLegacyRuleDay(null, '2026-10-04')).toBe(true);
  expect(isLegacyRuleDay('2026-10-04', '2026-10-04')).toBe(true);
  expect(isLegacyRuleDay('2026-10-03', '2026-10-04')).toBe(false);
});

test('after the migration day, opening the app does not count the day; the first lesson does', async () => {
  await AsyncStorage.multiSet([
    [STREAK_RULE_V137_SINCE_KEY, daysAgo(3)],
    ['last_active_date', daysAgo(1)],
    ['streak_count', '4'],
  ]);
  const m = load();
  await m.touch('cold_start');
  expect(await AsyncStorage.getItem('last_active_date')).toBe(daysAgo(1));
  expect(await AsyncStorage.getItem('streak_count')).toBe('4');
  expect(m.peek()).toMatchObject({ counted: false, days: 4 });
  expect(m.events).toHaveLength(0);

  await m.touch('activity:video');
  expect(await AsyncStorage.getItem('last_active_date')).toBe(daysAgo(1));

  expect(await m.touch('activity:lesson')).toBe(5);
  expect(await AsyncStorage.getItem('last_active_date')).toBe(today());
  expect(m.peek()).toMatchObject({ counted: true, days: 5 });
  expect(m.events).toEqual([expect.objectContaining({ days: 5, source: 'activity:lesson' })]);

  expect(m.touch('activity:cards')).toBeNull();
  expect(m.events).toHaveLength(1);
});

test('a burnt streak is zeroed on opening without counting the day, then the first exercise starts at 1', async () => {
  await AsyncStorage.multiSet([
    [STREAK_RULE_V137_SINCE_KEY, daysAgo(10)],
    ['last_active_date', daysAgo(5)],
    ['streak_count', '7'],
  ]);
  const m = load();
  expect(await m.touch('foreground')).toBe(0);
  expect(await AsyncStorage.getItem('streak_count')).toBe('0');
  expect(await AsyncStorage.getItem('last_active_date')).toBe(daysAgo(5));

  expect(await m.touch('activity:mistakes')).toBe(1);
  expect(await AsyncStorage.getItem('last_active_date')).toBe(today());
  expect(m.events).toEqual([expect.objectContaining({ days: 1 })]);
});

test('on the migration day opening still counts the day (soft transition, streaks are not reset)', async () => {
  await AsyncStorage.multiSet([['last_active_date', daysAgo(1)], ['streak_count', '9']]);
  const m = load();
  expect(await m.touch('cold_start')).toBe(10);
  expect(await AsyncStorage.getItem(STREAK_RULE_V137_SINCE_KEY)).toBe(today());
  expect(m.events).toEqual([expect.objectContaining({ days: 10, source: 'migration:cold_start' })]);
});

test('an exercise finished while the opening check is running is not lost', async () => {
  await AsyncStorage.multiSet([
    [STREAK_RULE_V137_SINCE_KEY, daysAgo(2)],
    ['last_active_date', daysAgo(1)],
    ['streak_count', '2'],
  ]);
  const m = load();
  const passive = m.touch('cold_start');
  const counted = m.touch('activity:cards');
  await passive;
  expect(await counted).toBe(3);
  expect(await AsyncStorage.getItem('last_active_date')).toBe(today());
});

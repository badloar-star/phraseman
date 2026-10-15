// Заморозка Plus при НЕИЗВЕСТНОМ статусе Plus (координатор 15.10, аудит Optimistic UI, 🔴).
// зачем: медленная проверка Plus (> 3 с), неподнятый аккаунт или сбой записи молча сбрасывали серию в 1 — платящий человек
// терял серию. Теперь серия цела, решение откладывается и закрывается, когда статус станет известен. Сработал — чини логику.
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockTry = jest.fn();
jest.mock('../app/streak_auto_freeze', () => ({ tryAutoPremiumFreeze: (...a: unknown[]) => mockTry(...a) }));
jest.mock('../app/local_date', () => {
  const actual = jest.requireActual('../app/local_date');
  const getLocalDayKey = (date: Date = new Date()) => actual.localDayKeyForTimeZone(date, 'UTC');
  const comparators = actual.makeDayKeyComparators(getLocalDayKey);
  return {
    ...actual,
    getLocalDayKey,
    getLocalYesterdayKey: (date: Date = new Date()) => actual.addLocalDays(getLocalDayKey(date), -1),
    dayKeyRelation: comparators.relation,
    isSameLocalOrUtcDay: comparators.isSameLocalOrUtcDay,
    isYesterdayFlexible: comparators.isYesterdayFlexible,
    isDayBeforeYesterdayFlexible: comparators.isDayBeforeYesterdayFlexible,
  };
});

import { updateStreakOnActivity } from '../app/hall_of_fame_utils';
import {
  STREAK_FREEZE_PENDING_KEY,
  isAutoFreezeUndecided,
  resolveStreakFreezePending,
  writeStreakFreezePending,
} from '../app/streak_freeze_pending';

const at = (iso: string) => jest.useFakeTimers().setSystemTime(new Date(`${iso}T12:00:00.000Z`));

describe('isAutoFreezeUndecided', () => {
  it('таймаут / аккаунт не поднят / сбой записи / ошибка — статус неизвестен; нет Plus и лимит — известен', () => {
    for (const reason of ['premium_check_timeout', 'premium_unknown', 'commit_failed', 'error'] as const) {
      expect(isAutoFreezeUndecided({ applied: false, reason })).toBe(true);
    }
    expect(isAutoFreezeUndecided({ applied: false, reason: 'not_premium' })).toBe(false);
    expect(isAutoFreezeUndecided({ applied: false, reason: 'month_limit' })).toBe(false);
    expect(isAutoFreezeUndecided({ applied: true })).toBe(false);
    expect(isAutoFreezeUndecided(null)).toBe(false);
  });
});

describe('updateStreakOnActivity: пропуск ровно одного дня при неизвестном статусе Plus', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockTry.mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

  it('статус неизвестен → серия цела, решение отложено', async () => {
    at('2026-10-15');
    await AsyncStorage.multiSet([['last_active_date', '2026-10-13'], ['streak_count', '10']]);
    mockTry.mockResolvedValue({ applied: false, reason: 'premium_check_timeout' });
    await expect(updateStreakOnActivity()).resolves.toBe(10);
    expect(await AsyncStorage.getItem('streak_count')).toBe('10');
    expect(JSON.parse(String(await AsyncStorage.getItem(STREAK_FREEZE_PENDING_KEY)))).toMatchObject({ gapDay: '2026-10-14', keptStreak: 10, createdDay: '2026-10-15' });
  });

  it('нет Plus (статус известен) → сброс, как раньше; отложенной записи нет', async () => {
    at('2026-10-15');
    await AsyncStorage.multiSet([['last_active_date', '2026-10-13'], ['streak_count', '10']]);
    mockTry.mockResolvedValue({ applied: false, reason: 'not_premium' });
    await expect(updateStreakOnActivity()).resolves.toBe(1);
    expect(await AsyncStorage.getItem(STREAK_FREEZE_PENDING_KEY)).toBeNull();
  });

  it('Plus, но лимит месяца исчерпан → сброс и ОДИН тихий тост; повтор в тот же день — без тоста', async () => {
    const events = jest.requireActual('../app/events');
    const emit = jest.spyOn(events, 'emitAppEvent');
    at('2026-10-15');
    await AsyncStorage.multiSet([['last_active_date', '2026-10-13'], ['streak_count', '10']]);
    mockTry.mockResolvedValue({ applied: false, reason: 'month_limit' });
    await expect(updateStreakOnActivity()).resolves.toBe(1);
    const limitToasts = () => emit.mock.calls.filter(([name, payload]) => name === 'action_toast'
      && (payload as { messageRu?: string }).messageRu === 'Заморозки Plus на этот месяц закончились — серия началась заново');
    expect(limitToasts()).toHaveLength(1);
    expect(limitToasts()[0][1]).toMatchObject({ type: 'info', messageUk: 'Заморозки Plus на цей місяць закінчилися — серія почалася заново' });
    await updateStreakOnActivity();
    expect(limitToasts()).toHaveLength(1);
  });

  it('нет Plus → сброс без тоста про лимит', async () => {
    const events = jest.requireActual('../app/events');
    const emit = jest.spyOn(events, 'emitAppEvent');
    at('2026-10-15');
    await AsyncStorage.multiSet([['last_active_date', '2026-10-13'], ['streak_count', '10']]);
    mockTry.mockResolvedValue({ applied: false, reason: 'not_premium' });
    await updateStreakOnActivity();
    expect(emit.mock.calls.some(([, payload]) => String((payload as { messageRu?: string })?.messageRu).includes('Заморозки Plus'))).toBe(false);
  });

  it('на следующий день статус стал известен: нет Plus → серия = дни после пропуска (как сброс в день пропуска)', async () => {
    at('2026-10-15');
    await AsyncStorage.multiSet([['last_active_date', '2026-10-13'], ['streak_count', '10']]);
    mockTry.mockResolvedValue({ applied: false, reason: 'premium_unknown' });
    await updateStreakOnActivity(); // 15.10: серия 10, решение отложено
    at('2026-10-16');
    mockTry.mockResolvedValue({ applied: false, reason: 'not_premium' });
    // разрешение: 10 − 10 + 1 = 1 (день 15.10), затем 16.10 продолжает → 2
    await expect(updateStreakOnActivity()).resolves.toBe(2);
    expect(await AsyncStorage.getItem(STREAK_FREEZE_PENDING_KEY)).toBeNull();
  });

  it('на следующий день Plus подтвердился → заморозка тратится задним числом, серия продолжается', async () => {
    at('2026-10-15');
    await AsyncStorage.multiSet([['last_active_date', '2026-10-13'], ['streak_count', '10']]);
    mockTry.mockResolvedValue({ applied: false, reason: 'premium_check_timeout' });
    await updateStreakOnActivity();
    at('2026-10-16');
    mockTry.mockResolvedValue({ applied: true });
    await expect(updateStreakOnActivity()).resolves.toBe(11);
    expect(mockTry).toHaveBeenLastCalledWith('2026-10-15'); // ключ операции — день, когда решение отложили
    expect(await AsyncStorage.getItem(STREAK_FREEZE_PENDING_KEY)).toBeNull();
  });
});

describe('resolveStreakFreezePending', () => {
  const deps = (result: unknown, current: number) => {
    const written: number[] = [];
    const saved: number[] = [];
    const lost: string[] = [];
    return {
      written, saved, lost,
      d: {
        tryFreeze: async () => result as never,
        readStreak: async () => current,
        writeStreak: async (v: number) => { written.push(v); },
        onSaved: async (_p: unknown, s: number) => { saved.push(s); },
        onLost: async (_p: unknown, reason: string) => { lost.push(reason); },
      },
    };
  };
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('записи нет → ничего не делаем (одно чтение)', async () => {
    const h = deps({ applied: true }, 5);
    await expect(resolveStreakFreezePending('2026-10-16', h.d)).resolves.toBe('none');
    expect(h.saved).toEqual([]);
  });

  it('статус всё ещё неизвестен, < 7 дней → ждём, серию не трогаем', async () => {
    await writeStreakFreezePending({ gapDay: '2026-10-14', keptStreak: 10, createdDay: '2026-10-15', reason: 'premium_check_timeout' });
    const h = deps({ applied: false, reason: 'premium_check_timeout' }, 12);
    await expect(resolveStreakFreezePending('2026-10-18', h.d)).resolves.toBe('still_unknown');
    expect(h.written).toEqual([]);
    expect(await AsyncStorage.getItem(STREAK_FREEZE_PENDING_KEY)).not.toBeNull();
  });

  it('лимит месяца исчерпан → потеря с причиной month_limit, дни после пропуска сохраняются', async () => {
    await writeStreakFreezePending({ gapDay: '2026-10-14', keptStreak: 10, createdDay: '2026-10-15', reason: 'error' });
    const h = deps({ applied: false, reason: 'month_limit' }, 13);
    await expect(resolveStreakFreezePending('2026-10-18', h.d)).resolves.toBe('lost');
    expect(h.written).toEqual([4]);
    expect(h.lost).toEqual(['month_limit']);
  });

  it('статус неизвестен 7 дней → решаем как потерю (бесконечно хранить серию без подтверждения нельзя)', async () => {
    await writeStreakFreezePending({ gapDay: '2026-10-14', keptStreak: 10, createdDay: '2026-10-15', reason: 'premium_unknown' });
    const h = deps({ applied: false, reason: 'premium_unknown' }, 16);
    await expect(resolveStreakFreezePending('2026-10-22', h.d)).resolves.toBe('expired');
    expect(h.written).toEqual([7]);
    expect(h.lost).toEqual(['expired_premium_unknown']);
  });
});

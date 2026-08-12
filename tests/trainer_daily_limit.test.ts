// E2: дневной лимит тренера (баг 7) — trainer_session.ts подключён к хабу и сессиям.
// free — 1 бесплатная сессия/день на весь тренер, премиум — безлимит (таблица §4).
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DAILY_FREE_SESSION_KEY,
  hasUsedFreeSessionToday,
  markFreeSessionUsed,
  getFreeSessionsLeftToday,
  isTrainerSessionLocked,
} from '../app/trainer_session';

jest.mock('@react-native-async-storage/async-storage');

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
    mockStorage[k] = v;
    return Promise.resolve();
  });
});

const todayKey = () => new Date().toISOString().split('T')[0];

describe('isTrainerSessionLocked (чистый гейт)', () => {
  it('премиум — всегда открыт', () => {
    expect(isTrainerSessionLocked(true, false)).toBe(false);
    expect(isTrainerSessionLocked(true, true)).toBe(false);
  });
  it('free без использованной сессии — открыт', () => {
    expect(isTrainerSessionLocked(false, false)).toBe(false);
  });
  it('free после использованной сессии — заблокирован', () => {
    expect(isTrainerSessionLocked(false, true)).toBe(true);
  });
});

describe('дневной счётчик trainer_free_session_v1', () => {
  it('пустое хранилище — сессия не использована', async () => {
    await expect(hasUsedFreeSessionToday()).resolves.toBe(false);
    await expect(getFreeSessionsLeftToday()).resolves.toBe(1);
  });

  it('markFreeSessionUsed помечает сегодняшнюю сессию использованной', async () => {
    await markFreeSessionUsed();
    await expect(hasUsedFreeSessionToday()).resolves.toBe(true);
    await expect(getFreeSessionsLeftToday()).resolves.toBe(0);
    const stored = JSON.parse(mockStorage[DAILY_FREE_SESSION_KEY]);
    expect(stored.date).toBe(todayKey());
    expect(stored.count).toBe(1);
  });

  it('вчерашняя запись не блокирует сегодня (полуночный ролловер)', async () => {
    mockStorage[DAILY_FREE_SESSION_KEY] = JSON.stringify({ date: '2000-01-01', count: 3 });
    await expect(hasUsedFreeSessionToday()).resolves.toBe(false);
    await expect(getFreeSessionsLeftToday()).resolves.toBe(1);
  });

  it('повторный markFreeSessionUsed сегодня инкрементирует счётчик, не сбрасывая дату', async () => {
    await markFreeSessionUsed();
    await markFreeSessionUsed();
    const stored = JSON.parse(mockStorage[DAILY_FREE_SESSION_KEY]);
    expect(stored.date).toBe(todayKey());
    expect(stored.count).toBe(2);
    await expect(hasUsedFreeSessionToday()).resolves.toBe(true);
  });

  it('markFreeSessionUsed после вчерашней записи начинает новый день с 1', async () => {
    mockStorage[DAILY_FREE_SESSION_KEY] = JSON.stringify({ date: '2000-01-01', count: 5 });
    await markFreeSessionUsed();
    const stored = JSON.parse(mockStorage[DAILY_FREE_SESSION_KEY]);
    expect(stored.date).toBe(todayKey());
    expect(stored.count).toBe(1);
  });

  it('битый JSON в хранилище не блокирует пользователя', async () => {
    mockStorage[DAILY_FREE_SESSION_KEY] = 'not-json{';
    await expect(hasUsedFreeSessionToday()).resolves.toBe(false);
    await expect(getFreeSessionsLeftToday()).resolves.toBe(1);
  });

  it('сквозной сценарий гейта: free играет одну сессию, вторая заблокирована, премиум — нет', async () => {
    // старт дня: гейт открыт
    let locked = isTrainerSessionLocked(false, await hasUsedFreeSessionToday());
    expect(locked).toBe(false);
    // сессия стартовала → помечаем
    await markFreeSessionUsed();
    // вторая попытка free — замок
    locked = isTrainerSessionLocked(false, await hasUsedFreeSessionToday());
    expect(locked).toBe(true);
    // премиум с тем же состоянием — открыт
    expect(isTrainerSessionLocked(true, await hasUsedFreeSessionToday())).toBe(false);
  });
});

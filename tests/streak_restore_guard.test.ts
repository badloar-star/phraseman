// зачем (координатор 12.10, 🔴 streakJump): восстановление читает серию в начале и пишет слитое значение в конце — на
// холодном старте между этим секунды. Изменилась ли серия после чтения — перед записью проверяется; изменилась —
// слияние заново со свежим локальным по дате активности (не max). Не менялась — путь прежний.
import AsyncStorage from '@react-native-async-storage/async-storage';

// зачем: ветка «локальное главнее» пишет серию только при неотправленных событиях прогресса — включаем их флагом теста.
let mockPendingProgress = false;
jest.mock('../app/progress_events_client', () => ({
  ...jest.requireActual('../app/progress_events_client'),
  hasPendingProgressServerEvents: async () => mockPendingProgress,
}));

import { __cloudSyncTestHooks } from '../app/cloud_sync';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

const makeCloudUserDoc = (progress: Record<string, unknown>) => ({ exists: true, data: () => ({ progress }) });

describe('защита серии при восстановлении (restore_guard)', () => {
  let logs: string[];
  beforeEach(async () => {
    await AsyncStorage.clear();
    logs = [];
    const capture = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };
    jest.spyOn(console, 'log').mockImplementation(capture);
    jest.spyOn(console, 'warn').mockImplementation(capture);
  });
  afterEach(() => jest.restoreAllMocks());

  it('серия изменилась после чтения восстановлением → пишется свежее слияние, а не устаревшее', async () => {
    await AsyncStorage.multiSet([['streak_count', '5'], ['last_active_date', '2026-10-10'], ['streak_last_date', '2026-10-10']]);
    // зачем: в тестах AsyncStorage — уже подменённая функция; берём её исходную реализацию и возвращаем после теста.
    const getMock = AsyncStorage.getItem as unknown as jest.Mock;
    const realGetImpl = getMock.getMockImplementation() as (key: string) => Promise<string | null>;
    const originalGet = (key: string) => realGetImpl(key);
    const originalSet = (key: string, value: string) => AsyncStorage.setItem(key, value);
    let streakReads = 0;
    getMock.mockImplementation(async (key: string) => {
      const value = await originalGet(key);
      if (key === 'streak_count' && logs.some((l) => l.includes('[STREAK] cloud_restore')) === false) {
        streakReads += 1;
      }
      // Сразу после того, как восстановление прочитало серию (лог cloud_restore ещё не напечатан), «человек» закрывает
      // новый день: серия 6 с датой 11.10. Это то самое окно в секунды на холодном старте.
      if (key === 'streak_last_date' && streakReads > 0 && (await originalGet('streak_count')) === '5') {
        await originalSet('streak_count', '6');
        await originalSet('last_active_date', '2026-10-11');
        await originalSet('streak_last_date', '2026-10-11');
      }
      return value;
    });
    let restored: boolean | null = null;
    try {
      restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
        streak_count: '8',
        last_active_date: '2026-10-09',
        streak_last_date: '2026-10-09',
      }));
    } finally {
      getMock.mockImplementation(realGetImpl);
    }
    expect(restored).toBe(true);
    expect(logs.some((l) => l.includes('[STREAK] restore_guard changed_since_read'))).toBe(true);
    expect(await originalGet('streak_count')).toBe('6');
    expect(await originalGet('last_active_date')).toBe('2026-10-11');
  });

  // зачем (координатор 15.10, аудит Optimistic UI п.2): снимок Главной пишется ДО пар AsyncStorage — раньше туда шло устаревшее
  // слитое число, хотя урок уже сдвинул серию: цифра на Главной прыгала (8 → 6). Теперь снимок сверяется со свежей серией.
  it('сервер главный: серия изменилась после чтения → в снимок Главной свежее слияние, а не устаревшее', async () => {
    await AsyncStorage.multiSet([['streak_count', '5'], ['last_active_date', '2026-10-10'], ['streak_last_date', '2026-10-10']]);
    const getMock = AsyncStorage.getItem as unknown as jest.Mock;
    const realGetImpl = getMock.getMockImplementation() as (key: string) => Promise<string | null>;
    let mutated = false;
    getMock.mockImplementation(async (key: string) => {
      const value = await realGetImpl(key);
      if (key === 'streak_last_date' && !mutated && (await realGetImpl('streak_count')) === '5') {
        mutated = true;
        await AsyncStorage.setItem('streak_count', '6');
        await AsyncStorage.setItem('last_active_date', '2026-10-11');
        await AsyncStorage.setItem('streak_last_date', '2026-10-11');
      }
      return value;
    });
    try {
      await __cloudSyncTestHooks.applyRestoreFromUserDoc({
        exists: true,
        data: () => ({ progressServerAuthoritative: true, progress: { streak_count: 8, last_active_date: '2026-10-09', streak_last_date: '2026-10-09' } }),
      });
    } finally {
      getMock.mockImplementation(realGetImpl);
    }
    // устаревшее слияние (5@10.10 с облаком 8@09.10) = 8; свежее (6@11.10 с облаком) = 6 — снимок обязан получить 6, а не 8 (потом 6 — прыжок)
    expect(logs.some((l) => l.includes('[STREAK] snapshot_guard changed_since_read') && l.includes('staleMerged=8') && l.includes('snapshot=6'))).toBe(true);
    const snapLine = logs.find((l) => l.includes('[STREAK] snapshot:authoritative_cloud')) ?? '';
    expect(snapLine).toContain('merged=6');
  });

  it('серия не менялась после чтения → путь прежний, лог restore_guard ok', async () => {
    await AsyncStorage.multiSet([['streak_count', '5'], ['last_active_date', '2026-10-10'], ['streak_last_date', '2026-10-10']]);
    await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      streak_count: '8',
      last_active_date: '2026-10-09',
      streak_last_date: '2026-10-09',
    }));
    const guardLines = logs.filter((l) => l.includes('[STREAK] restore_guard'));
    expect(guardLines.some((l) => l.includes('restore_guard ok'))).toBe(true);
    expect(guardLines.some((l) => l.includes('changed_since_read'))).toBe(false);
    // Значение — ровно то слитое, что восстановление напечатало (путь прежний).
    const restoreLine = logs.find((l) => l.includes('[STREAK] cloud_restore')) ?? '';
    const merged = /merged=(\d+)@/.exec(restoreLine)?.[1];
    expect(restoreLine).toContain('restore=true');
    expect(await AsyncStorage.getItem('streak_count')).toBe(merged);
  });

  it('ветка «локальное главнее» (неотправленные события): серия изменилась после чтения → свежее слияние', async () => {
    mockPendingProgress = true;
    await AsyncStorage.multiSet([['streak_count', '5'], ['last_active_date', '2026-10-10'], ['streak_last_date', '2026-10-10']]);
    const getMock = AsyncStorage.getItem as unknown as jest.Mock;
    const realGetImpl = getMock.getMockImplementation() as (key: string) => Promise<string | null>;
    let mutated = false;
    getMock.mockImplementation(async (key: string) => {
      const value = await realGetImpl(key);
      // Восстановление только что прочитало серию (последний ключ тройки) — человек закрывает новый день.
      if (key === 'streak_last_date' && !mutated && (await realGetImpl('streak_count')) === '5') {
        mutated = true;
        await AsyncStorage.setItem('streak_count', '6');
        await AsyncStorage.setItem('last_active_date', '2026-10-12');
        await AsyncStorage.setItem('streak_last_date', '2026-10-12');
      }
      return value;
    });
    try {
      // облако новее по дате, но с меньшей серией: облако не главнее (3 < 5), слитое по дате = 3@11.10 ≠ локальному.
      await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
        streak_count: '3',
        last_active_date: '2026-10-11',
        streak_last_date: '2026-10-11',
      }));
    } finally {
      getMock.mockImplementation(realGetImpl);
      mockPendingProgress = false;
    }
    const restoreLine = logs.find((l) => l.includes('[STREAK] cloud_restore')) ?? '';
    expect(restoreLine).toContain('restore=false');
    expect(restoreLine).toContain('pending=true');
    expect(logs.some((l) => l.includes('restore_guard changed_since_read branch=local_sticky'))).toBe(true);
    expect(await realGetImpl('streak_count')).toBe('6');
  });
});

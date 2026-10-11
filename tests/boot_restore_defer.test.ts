// зачем (пункт (а), координатор 11.10): отложенное восстановление на холодном старте — решение, запуск, отмена,
// защита «последняя запись» и метка владельца.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitStorageMutation } from '../app/storage_mutation_bus';
import {
  BOOT_RESTORE_OWNER_KEY,
  bootRestoreDeferFlagFromCacheRaw,
  decideBootRestoreDefer,
  startDeferredBootRestore,
  type BootRestoreDeferInput,
} from '../app/boot_restore_defer';
import {
  clearBootRestoreDirtyKeys,
  markBootRestoreUserDocRead,
  peekBootRestoreDirtyKeys,
  whenDeferredBootRestoreDocRead,
} from '../app/boot_restore_dirty_keys';
import { __cloudSyncTestHooks, syncToCloud } from '../app/cloud_sync';
import { hasMeaningfulLocalAccountData } from '../app/local_account_data';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

const BASE: BootRestoreDeferInput = {
  flagEnabled: true, onboardingDone: '1', identityReady: true, recoveryProceed: true,
  ownerMark: 'uid-1', stableId: 'uid-1', mutationTracking: true,
};
const OUTCOME = { status: 'restored' as const, hasLocalAccountData: true, shouldSync: true };

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterAll(() => jest.restoreAllMocks());
afterEach(() => clearBootRestoreDirtyKeys());

describe('решение', () => {
  it('все условия выполнены — откладываем', () => {
    expect(decideBootRestoreDefer(BASE)).toEqual({ defer: true, reason: 'deferred' });
  });
  it.each([
    [{ flagEnabled: false }, 'flag_off'],
    [{ onboardingDone: null }, 'onboarding_not_done'],
    [{ identityReady: false }, 'identity_not_ready'],
    [{ recoveryProceed: false }, 'recovery_gate_not_proceed'],
    [{ ownerMark: null }, 'no_owner_mark'],
    [{ ownerMark: 'uid-2' }, 'owner_mismatch'],
    [{ mutationTracking: false }, 'no_mutation_tracking'],
  ] as const)('%j → прежний путь (%s)', (patch, reason) => {
    expect(decideBootRestoreDefer({ ...BASE, ...patch })).toEqual({ defer: false, reason });
  });
  it('рубильник: по умолчанию включён, выключается только явным false', () => {
    expect(bootRestoreDeferFlagFromCacheRaw(null)).toBe(true);
    expect(bootRestoreDeferFlagFromCacheRaw('{"bools":{}}')).toBe(true);
    expect(bootRestoreDeferFlagFromCacheRaw('{"bools":{"boot_restore_defer_enabled":false}}')).toBe(false);
    expect(bootRestoreDeferFlagFromCacheRaw('not json')).toBe(true);
  });
});

describe('отложенный запуск', () => {
  const deps = (over: Partial<Parameters<typeof startDeferredBootRestore>[0]> = {}) => {
    const calls = { run: 0 };
    let background: (() => void) | null = null;
    let idle: (() => void) | null = null;
    const d = {
      run: async () => { calls.run += 1; return OUTCOME; },
      isAccountCurrent: () => true,
      whenHomePainted: () => Promise.resolve('painted'),
      runAfterInteractions: (cb: () => void) => { idle = cb; },
      subscribeBackground: (cb: () => void) => { background = cb; return () => { background = null; }; },
      ceilingMs: 60_000,
      ...over,
    };
    return { d, calls, fireIdle: () => idle?.(), fireBackground: () => background?.() };
  };

  it('ничего не теряется: стартует после простоя один раз', async () => {
    const { d, calls, fireIdle, fireBackground } = deps();
    const promise = startDeferredBootRestore(d);
    await Promise.resolve();
    await Promise.resolve();
    expect(calls.run).toBe(0);
    fireIdle();
    fireBackground();
    await expect(promise).resolves.toEqual(OUTCOME);
    expect(calls.run).toBe(1);
  });

  it('уход в фон — старт сразу', async () => {
    const { d, calls, fireBackground } = deps({ whenHomePainted: () => new Promise(() => undefined) });
    const promise = startDeferredBootRestore(d);
    fireBackground();
    await expect(promise).resolves.toEqual(OUTCOME);
    expect(calls.run).toBe(1);
  });

  it('потолок — старт, даже если Главная не нарисовалась', async () => {
    jest.useFakeTimers();
    try {
      const { d, calls } = deps({ whenHomePainted: () => new Promise(() => undefined), ceilingMs: 8_000 });
      const promise = startDeferredBootRestore(d);
      jest.advanceTimersByTime(8_000);
      await expect(promise).resolves.toEqual(OUTCOME);
      expect(calls.run).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('запрос отправки в облако во время ожидания не отправляет, а запускает восстановление', async () => {
    const { d, calls } = deps({ whenHomePainted: () => new Promise(() => undefined) });
    const promise = startDeferredBootRestore(d);
    await syncToCloud({ forceNow: true });
    await expect(promise).resolves.toEqual(OUTCOME);
    expect(calls.run).toBe(1);
  });

  it('сбой при старте разрешает промис как провал, а не вешает его', async () => {
    const { d, fireBackground } = deps({ isAccountCurrent: () => { throw new Error('boom'); } });
    const promise = startDeferredBootRestore(d);
    fireBackground();
    await expect(promise).resolves.toEqual({ status: 'failed', hasLocalAccountData: true, shouldSync: false });
  });

  it('аккаунт сменился за время ожидания — отмена без синка и без провала', async () => {
    const { d, calls, fireBackground } = deps({ isAccountCurrent: () => false });
    const promise = startDeferredBootRestore(d);
    fireBackground();
    await expect(promise).resolves.toEqual({ status: 'not_found', hasLocalAccountData: true, shouldSync: false });
    expect(calls.run).toBe(0);
  });

  it('ключи, записанные за время ожидания, видны восстановлению; записи после старта — нет', async () => {
    let seen: string[] | null = null;
    const { d, fireBackground } = deps({
      run: async () => {
        const dirty = peekBootRestoreDirtyKeys();
        seen = dirty ? Array.from(dirty) : null;
        emitStorageMutation({ phase: 'end', keys: ['written_by_restore'] });
        return OUTCOME;
      },
    });
    const promise = startDeferredBootRestore(d);
    emitStorageMutation({ phase: 'end', keys: ['user_frame'] });
    fireBackground();
    await promise;
    expect(seen).toEqual(['user_frame']);
    expect(peekBootRestoreDirtyKeys()).toBeNull();
  });
});

describe('защита «последняя запись» в ветке «облако главнее»', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('записанный за ожидание ключ облако не перезаписывает; остальные — как раньше; слияния — как раньше', async () => {
    const { d, fireBackground } = deps2();
    await AsyncStorage.multiSet([
      ['streak_count', '0'],
      ['user_frame', 'frame_bought_now'],
      ['user_avatar', 'local_avatar'],
      ['app_lang', 'uk'],
      ['study_languages_started_v1', JSON.stringify(['en', 'fr'])],
    ]);
    const promise = startDeferredBootRestore(d);
    emitStorageMutation({ phase: 'end', keys: ['user_frame', 'study_languages_started_v1', 'app_lang'] });
    fireBackground();
    await promise;
    expect(await AsyncStorage.getItem('user_frame')).toBe('frame_bought_now');
    expect(await AsyncStorage.getItem('user_avatar')).toBe('cloud_avatar');
    // язык пишется уже после цикла — защита стоит и там
    expect(await AsyncStorage.getItem('app_lang')).toBe('uk');
    const langs = JSON.parse((await AsyncStorage.getItem('study_languages_started_v1')) ?? '[]') as string[];
    expect([...langs].sort()).toEqual(['en', 'es', 'fr']);
  });

  function deps2() {
    let background: (() => void) | null = null;
    return {
      d: {
        run: async () => {
          await __cloudSyncTestHooks.applyRestoreFromUserDoc({
            exists: true,
            data: () => ({ progress: {
              streak_count: '5', last_active_date: '2026-10-10',
              user_frame: 'frame_from_cloud', user_avatar: 'cloud_avatar', lang: 'ru',
              study_languages_started_v1: JSON.stringify(['en', 'es']),
            } }),
          });
          return OUTCOME;
        },
        isAccountCurrent: () => true,
        whenHomePainted: () => new Promise(() => undefined),
        runAfterInteractions: () => undefined,
        subscribeBackground: (cb: () => void) => { background = cb; return () => { background = null; }; },
        ceilingMs: 60_000,
      },
      fireBackground: () => background?.(),
    };
  }
});

describe('метка владельца', () => {
  it('не делает установку «непустой»', async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(BOOT_RESTORE_OWNER_KEY, 'uid-1');
    await expect(hasMeaningfulLocalAccountData()).resolves.toBe(false);
  });
  it('стирается вместе с данными аккаунта', () => {
    expect(__cloudSyncTestHooks).toBeDefined();
    const { accountLocalDataKeysForToday } = jest.requireActual('../app/cloud_sync') as { accountLocalDataKeysForToday: () => string[] };
    expect(accountLocalDataKeysForToday()).toContain(BOOT_RESTORE_OWNER_KEY);
  });
});

describe('предотправка ждёт только до чтения документа', () => {
  it('нет отложенного — не ждёт; идёт — ждёт отметки чтения документа', async () => {
    await expect(whenDeferredBootRestoreDocRead(1_000)).resolves.toBe('not_active');
    let release: (() => void) | null = null;
    let background: (() => void) | null = null;
    const promise = startDeferredBootRestore({
      run: () => new Promise((resolve) => { release = () => resolve(OUTCOME); }),
      isAccountCurrent: () => true,
      whenHomePainted: () => new Promise(() => undefined),
      runAfterInteractions: () => undefined,
      subscribeBackground: (cb) => { background = cb; return () => undefined; },
      ceilingMs: 60_000,
    });
    (background as unknown as () => void)();
    const waited = whenDeferredBootRestoreDocRead(60_000);
    markBootRestoreUserDocRead();
    await expect(waited).resolves.toBe('doc_read');
    (release as unknown as () => void)();
    await promise;
  });
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __cloudSyncTestHooks,
  ensureStableAuthLinkForStableIdDetailed,
  forgetAuthoritativeStableAuthLinkMemo,
  rememberSwapConfirmedStableAuthLink,
} from '../app/cloud_sync';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
} from '../app/account_generation';

const mockCallable = jest.fn(async () => ({
  data: { ok: true, stableUid: 'stable-a', authUid: 'provider-a', identityReady: true },
}));
const mockSetStableId = jest.fn<Promise<void>, [string]>(async () => undefined);

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false, IS_STORE_RELEASE: false }));
jest.mock('../app/user_id_policy', () => ({
  getAuthUserId: jest.fn(() => 'provider-a'),
  getCanonicalUserId: jest.fn(async () => 'stable-a'),
}));
jest.mock('../app/stable_id', () => ({ setStableId: (stableId: string) => mockSetStableId(stableId) }));
jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => ({ currentUser: { uid: 'provider-a', isAnonymous: false } }),
}));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockCallable),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage> & { __reset?: () => void };

describe('cloud sync identity anchor', () => {
  beforeEach(() => {
    storage.__reset?.();
    jest.clearAllMocks();
    __resetAccountGenerationForTests();
    beginAccountGeneration('stable-a');
    forgetAuthoritativeStableAuthLinkMemo('test_reset');
  });

  it('bypasses a fresh local cache when authoritative confirmation is required', async () => {
    await ensureStableAuthLinkForStableIdDetailed('stable-a');
    // зачем (14.10): дисковый кэш остался, а память ответа — нет (как в новом процессе) → авторитетный вызов идёт в сеть.
    forgetAuthoritativeStableAuthLinkMemo('new_process');
    await ensureStableAuthLinkForStableIdDetailed('stable-a', undefined, { requireAuthoritative: true });
    expect(mockCallable).toHaveBeenCalledTimes(2);
  });

  // зачем (координатор 14.10, прогон №4: 2 авторитетных вызова на холодном старте и 2–4 при входе — 3,3–3,6 с каждый):
  // подтверждённый сервером ответ переиспользуется в том же поколении аккаунта, без сети.
  it('reuses a server-confirmed answer for the same identity and account generation', async () => {
    await ensureStableAuthLinkForStableIdDetailed('stable-a', undefined, { requireAuthoritative: true });
    await expect(ensureStableAuthLinkForStableIdDetailed('stable-a', undefined, { requireAuthoritative: true }))
      .resolves.toMatchObject({ ok: true, stableUid: 'stable-a' });
    expect(mockCallable).toHaveBeenCalledTimes(1);
  });

  it('goes to the server again after the account generation changes', async () => {
    await ensureStableAuthLinkForStableIdDetailed('stable-a', undefined, { requireAuthoritative: true });
    beginAccountGeneration('stable-a');
    await ensureStableAuthLinkForStableIdDetailed('stable-a', undefined, { requireAuthoritative: true });
    expect(mockCallable).toHaveBeenCalledTimes(2);
  });

  it('never answers a metadata update from memory', async () => {
    await ensureStableAuthLinkForStableIdDetailed('stable-a', undefined, { requireAuthoritative: true });
    await ensureStableAuthLinkForStableIdDetailed('stable-a', { provider: 'google' } as never, { requireAuthoritative: true });
    expect(mockCallable).toHaveBeenCalledTimes(2);
  });

  // зачем изменено 2026-09-01 (владелец): раньше оба кода схлопывались в
  // identity_retired. Это и убивало модал «Восстановить аккаунт?»: внутри
  // 14-дневного grace вход отвечал «аккаунт мёртв», и приложение молча заводило
  // ПУСТОЙ профиль вместо предложения вернуть прогресс. Коды обязаны
  // различаться — pending обратим, retired нет.
  it.each([
    ['identity_retired', 'identity_retired'],
    ['account_delete_pending', 'account_delete_pending'],
  ])('classifies failed-precondition %s as %s', (message, expected) => {
    expect(__cloudSyncTestHooks.classifyCloudAccessFailure({
      code: 'functions/failed-precondition',
      message,
    })).toBe(expected);
  });

  it('opens the authoritative identity gate only when the server confirms identityReady', async () => {
    await expect(ensureStableAuthLinkForStableIdDetailed(
      'stable-a',
      undefined,
      { requireAuthoritative: true },
    )).resolves.toMatchObject({ ok: true, source: 'callable' });

    forgetAuthoritativeStableAuthLinkMemo('check_identity_ready_again');
    mockCallable.mockResolvedValueOnce({
      data: { ok: true, stableUid: 'stable-a', authUid: 'provider-a' },
    } as any);
    await expect(ensureStableAuthLinkForStableIdDetailed(
      'stable-a',
      undefined,
      { requireAuthoritative: true },
    )).resolves.toMatchObject({
      ok: false,
      source: 'callable',
      failure: 'identity_unavailable',
    });
  });

  // зачем (координатор 17.10, 💸): свап входа стирает кэш привязки — подтверждение сервера переносится в новое поколение,
  // и фоновое восстановление не зовёт authEnsureStableLink второй раз.
  it('carries the sign-in confirmation across the swap: no second callable for the same identity', async () => {
    beginAccountGeneration('stable-a'); // новое поколение после свапа, кэш на диске стёрт (storage reset в beforeEach)
    const proof = { ok: true, requestedStableId: 'stable-a', stableUid: 'stable-a', authUid: 'provider-a', source: 'callable' as const };
    await expect(rememberSwapConfirmedStableAuthLink(proof, 'stable-a', 'test')).resolves.toBe(true);
    await expect(ensureStableAuthLinkForStableIdDetailed('stable-a')).resolves.toMatchObject({ ok: true });
    await expect(ensureStableAuthLinkForStableIdDetailed('stable-a', undefined, { requireAuthoritative: true }))
      .resolves.toMatchObject({ ok: true, stableUid: 'stable-a' });
    expect(mockCallable).not.toHaveBeenCalled();
  });

  it.each([
    ['other auth uid', { authUid: 'provider-b' }, 'stable-a'],
    ['other stable id', { stableUid: 'stable-b' }, 'stable-a'],
    ['cached, not a server answer', { source: 'cache' as const }, 'stable-a'],
    ['failed answer', { ok: false }, 'stable-a'],
  ])('does not carry a confirmation that is not exactly ours: %s', async (_label, patch, canonical) => {
    const proof = { ok: true, requestedStableId: 'stable-a', stableUid: 'stable-a', authUid: 'provider-a', source: 'callable' as const, ...patch };
    await expect(rememberSwapConfirmedStableAuthLink(proof, canonical, 'test')).resolves.toBe(false);
    await ensureStableAuthLinkForStableIdDetailed('stable-a', undefined, { requireAuthoritative: true });
    expect(mockCallable).toHaveBeenCalledTimes(1);
  });

  it('wipes account-scoped storage before adopting a different server canonical id', async () => {
    await AsyncStorage.setItem('user_total_xp', '999999999');

    await expect(
      __cloudSyncTestHooks.adoptAuthoritativeStableIdentity('stable-a', 'stable-b'),
    ).resolves.toBe(true);

    expect(await AsyncStorage.getItem('user_total_xp')).toBeNull();
    expect(mockSetStableId).toHaveBeenCalledWith('stable-b');
    expect(captureAccountGeneration()).toMatchObject({ stableId: 'stable-b', phase: 'active' });
  });
});

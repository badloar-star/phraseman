/**
 * nickname_guard.ts — надёжная доставка имени в серверный name_index.
 *
 * Закрепляет два инварианта фикса «поиск по нику не находит всех»:
 *  1. НАДЁЖНОСТЬ: запись в индекс ретраится при каждом запуске, пока сервер не
 *     подтвердит ('ok'/'taken'); 'error' НЕ помечает синк — повтор при следующем вызове.
 *  2. БЕЗ УТЕЧКИ БЕСПЛАТНОЙ СМЕНЫ: source:'onboarding' уходит на сервер ТОЛЬКО при
 *     реальной смене/первой установке имени. Повторная сверка того же имени идёт БЕЗ
 *     source — иначе сервер (leaderboard.ts grantsFreeChange) перевыдавал бы бесплатную
 *     смену ника после каждого переименования, обнуляя 14-дневный кулдаун.
 */
const mockReserveNameDetailed = jest.fn();
const mockGenerateAndReserveNickname = jest.fn();
let mockStableId = 'stable-a';

jest.mock('../app/stable_id', () => ({
  peekStableId: () => mockStableId,
}));

jest.mock('../app/firestore_leaderboard', () => ({
  reserveNameDetailed: (...args: unknown[]) => mockReserveNameDetailed(...args),
  generateAndReserveNickname: (...args: unknown[]) => mockGenerateAndReserveNickname(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  mockReserveNameDetailed.mockReset();
  mockGenerateAndReserveNickname.mockReset();
  mockStableId = 'stable-a';
  require('@react-native-async-storage/async-storage').__reset?.();
  jest.mock('../app/firestore_leaderboard', () => ({
    reserveNameDetailed: (...args: unknown[]) => mockReserveNameDetailed(...args),
    generateAndReserveNickname: (...args: unknown[]) => mockGenerateAndReserveNickname(...args),
  }));
  const generation = require('../app/account_generation');
  generation.__resetAccountGenerationForTests();
  generation.beginAccountGeneration(mockStableId);
});

afterEach(() => {
  try {
    require('../app/nickname_guard').cancelPendingGeneratedNicknameRetry();
  } catch {}
});

async function seedStoredName(name: string): Promise<void> {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default
    ?? require('@react-native-async-storage/async-storage');
  await AsyncStorage.setItem('user_name', name);
}

test('empty profile stores only a smart nickname confirmed by the server', async () => {
  mockGenerateAndReserveNickname.mockResolvedValue({ status: 'ok', name: 'Quantum 48271', stableId: mockStableId });
  const { ensureUniqueGeneratedNickname } = require('../app/nickname_guard');

  await expect(ensureUniqueGeneratedNickname()).resolves.toBe('Quantum 48271');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default
    ?? require('@react-native-async-storage/async-storage');
  expect(await AsyncStorage.getItem('user_name')).toBe('Quantum 48271');
});

test('server failure never stores an unconfirmed generated nickname', async () => {
  mockGenerateAndReserveNickname.mockResolvedValue({ status: 'error' });
  const { ensureUniqueGeneratedNickname } = require('../app/nickname_guard');

  await expect(ensureUniqueGeneratedNickname()).rejects.toThrow('nickname_reservation_unavailable');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default
    ?? require('@react-native-async-storage/async-storage');
  expect(await AsyncStorage.getItem('user_name')).toBeNull();
});

test('an unsynced local fallback is replaced by the server-confirmed nickname', async () => {
  await seedStoredName('Phraseman 12345');
  mockGenerateAndReserveNickname.mockResolvedValue({ status: 'ok', name: 'Neon 73104', stableId: mockStableId });
  const { ensureUniqueGeneratedNickname } = require('../app/nickname_guard');

  await expect(ensureUniqueGeneratedNickname()).resolves.toBe('Neon 73104');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default
    ?? require('@react-native-async-storage/async-storage');
  expect(await AsyncStorage.getItem('user_name')).toBe('Neon 73104');
});

test('a legacy fallback marked synced after taken is still replaced by server generation', async () => {
  mockReserveNameDetailed.mockResolvedValue({ status: 'taken' });
  mockGenerateAndReserveNickname.mockResolvedValue({ status: 'ok', name: 'Omega 64012', stableId: mockStableId });
  const { ensureLocalNickname, ensureUniqueGeneratedNickname } = require('../app/nickname_guard');

  await ensureLocalNickname('Phraseman 12345');
  await expect(ensureUniqueGeneratedNickname()).resolves.toBe('Omega 64012');
  expect(mockGenerateAndReserveNickname).toHaveBeenCalledTimes(1);
});

test('pending background generation updates the local profile only after server success', async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default
    ?? require('@react-native-async-storage/async-storage');
  await AsyncStorage.multiSet([
    ['generated_nickname_pending_v1', JSON.stringify({ createdAt: 1 })],
    ['user_profile', JSON.stringify({ name: '', onboardingCompleted: true })],
  ]);
  mockGenerateAndReserveNickname.mockResolvedValue({ status: 'ok', name: 'Photon 50319', stableId: mockStableId });
  const { resumePendingGeneratedNickname } = require('../app/nickname_guard');

  await resumePendingGeneratedNickname();

  expect(await AsyncStorage.getItem('user_name')).toBe('Photon 50319');
  expect(JSON.parse(await AsyncStorage.getItem('user_profile'))).toMatchObject({ name: 'Photon 50319' });
  expect(await AsyncStorage.getItem('generated_nickname_pending_v1')).toBeNull();
});

test('pending background generation stays pending after an offline error', async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default
    ?? require('@react-native-async-storage/async-storage');
  await AsyncStorage.setItem('generated_nickname_pending_v1', JSON.stringify({ createdAt: 1 }));
  mockGenerateAndReserveNickname.mockResolvedValue({ status: 'error' });
  const { resumePendingGeneratedNickname } = require('../app/nickname_guard');

  await expect(resumePendingGeneratedNickname()).resolves.toBeUndefined();
  expect(await AsyncStorage.getItem('user_name')).toBeNull();
  expect(await AsyncStorage.getItem('generated_nickname_pending_v1')).not.toBeNull();
});

test('an old in-flight nickname response cannot write after an account transition', async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default
    ?? require('@react-native-async-storage/async-storage');
  await AsyncStorage.multiSet([
    ['generated_nickname_pending_v1', JSON.stringify({ createdAt: 1 })],
    ['user_profile', JSON.stringify({ name: '' })],
  ]);
  let resolveRequest!: (value: unknown) => void;
  mockGenerateAndReserveNickname.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
  const { resumePendingGeneratedNickname } = require('../app/nickname_guard');
  const generation = require('../app/account_generation');

  const flight = resumePendingGeneratedNickname();
  await generation.withAccountTransitionLock(async () => {
    generation.invalidateAccountGeneration();
    await AsyncStorage.multiRemove(['generated_nickname_pending_v1', 'user_profile']);
  });
  resolveRequest({ status: 'ok', name: 'Vector 90421', stableId: 'old-account' });
  await flight;

  expect(await AsyncStorage.getItem('user_name')).toBeNull();
  expect(await AsyncStorage.getItem('user_profile')).toBeNull();
  expect(await AsyncStorage.getItem('generated_name_confirmed_v1')).toBeNull();
  expect(await AsyncStorage.getItem('generated_nickname_pending_v1')).toBeNull();
  const { DeviceEventEmitter } = require('react-native');
  expect(DeviceEventEmitter.emit).not.toHaveBeenCalledWith('cloud_profile_hydrated');
});

test('первая установка имени: reserveNameDetailed вызывается с source:onboarding', async () => {
  mockReserveNameDetailed.mockResolvedValue({ status: 'ok' });
  const { ensureLocalNickname } = require('../app/nickname_guard');

  const name = await ensureLocalNickname('Roma');
  expect(name).toBe('Roma');
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(1);
  expect(mockReserveNameDetailed).toHaveBeenCalledWith('Roma', '', { source: 'onboarding' });
});

test('после подтверждённого синка повторный запуск НЕ дёргает сервер', async () => {
  mockReserveNameDetailed.mockResolvedValue({ status: 'ok' });
  const { ensureLocalNickname } = require('../app/nickname_guard');

  await ensureLocalNickname('Roma');
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(1);

  await ensureLocalNickname(); // обычный запуск, имя не менялось
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(1); // без лишнего вызова
});

test('сорвавшаяся запись ("error") ретраится при следующем запуске — и БЕЗ source:onboarding', async () => {
  mockReserveNameDetailed.mockResolvedValue({ status: 'error' });
  const { ensureLocalNickname } = require('../app/nickname_guard');

  await ensureLocalNickname('Roma'); // попытка 1 (смена имени → onboarding)
  expect(mockReserveNameDetailed).toHaveBeenNthCalledWith(1, 'Roma', '', { source: 'onboarding' });

  mockReserveNameDetailed.mockResolvedValue({ status: 'ok' });
  await ensureLocalNickname(); // запуск 2: имя то же → ретрай, но уже БЕЗ onboarding
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(2);
  expect(mockReserveNameDetailed).toHaveBeenNthCalledWith(2, 'Roma', 'Roma', {});

  await ensureLocalNickname(); // запуск 3: подтверждено → тишина
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(2);
});

test('статус "taken" тоже останавливает ретраи (имя в индексе есть)', async () => {
  mockReserveNameDetailed.mockResolvedValue({ status: 'taken' });
  const { ensureLocalNickname } = require('../app/nickname_guard');

  await ensureLocalNickname('Roma');
  await ensureLocalNickname();
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(1);
});

test('сверка уже сохранённого имени (маркера нет) идёт БЕЗ source:onboarding — нет перевыдачи бесплатной смены', async () => {
  // Эмулируем состояние после переименования в настройках: user_name уже обновлён
  // напрямую (мимо ensureLocalNickname), маркер синка отсутствует.
  await seedStoredName('NewName');
  mockReserveNameDetailed.mockResolvedValue({ status: 'ok' });
  const { ensureLocalNickname } = require('../app/nickname_guard');

  await ensureLocalNickname();
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(1);
  expect(mockReserveNameDetailed).toHaveBeenCalledWith('NewName', 'NewName', {});
});

test('исключение из reserveNameDetailed не ломает ensureLocalNickname и ретраится потом', async () => {
  mockReserveNameDetailed.mockRejectedValue(new Error('network'));
  const { ensureLocalNickname } = require('../app/nickname_guard');

  await expect(ensureLocalNickname('Roma')).resolves.toBe('Roma');

  mockReserveNameDetailed.mockResolvedValue({ status: 'ok' });
  await ensureLocalNickname();
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(2);
});

test('исчерпание бюджета ретраев снимает AppState-слушатель — нет вечной сети на каждый foreground', async () => {
  // зачем: аудит нагрева 2026-07-25 — слушатель foreground раньше жил вечно и дёргал
  // generateAndReserveNickname на каждый разворот приложения после исчерпания бюджета.
  jest.useFakeTimers();
  const removeSpy = jest.fn();
  const { AppState } = require('react-native');
  const addSpy = jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: removeSpy } as never);
  try {
    try { Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' }); } catch {}
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
      ?? require('@react-native-async-storage/async-storage');
    const guard = require('../app/nickname_guard');
    await AsyncStorage.setItem(guard.GENERATED_NICKNAME_PENDING_KEY, '1');
    mockGenerateAndReserveNickname.mockResolvedValue({ status: 'error' });

    await guard.resumePendingGeneratedNickname(); // попытка №1 → слушатель + таймер 5с
    expect(addSpy).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 3; i++) {
      await jest.runOnlyPendingTimersAsync(); // попытки №2..№4 по бюджету задержек
      await Promise.resolve();
    }
    await Promise.resolve();

    expect(mockGenerateAndReserveNickname).toHaveBeenCalledTimes(4);
    expect(removeSpy).toHaveBeenCalledTimes(1); // слушатель снят при исчерпании бюджета
    expect(jest.getTimerCount()).toBe(0); // и новых таймеров не осталось
  } finally {
    jest.useRealTimers();
    addSpy.mockRestore();
  }
});

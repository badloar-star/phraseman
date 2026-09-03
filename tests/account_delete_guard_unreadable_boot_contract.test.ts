jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage');

/**
 * Инцидент: пользователи, которые НИКОГДА не удаляли аккаунт, регулярно упирались
 * в стартовый экран «Нужна безопасная проверка» и не могли войти в приложение.
 *
 * Причина: readAccountDeletePendingAuthRaw() бросал одинаковую ошибку и когда
 * замок удаления реально повреждён, и когда защищённое хранилище просто не
 * прочиталось (Keychain недоступен до первой разблокировки, dev-пересборка,
 * отсутствие модуля). Старт трактовал ЛЮБОЙ бросок как «под нами может лежать
 * чужой аккаунт» и закрывал приложение.
 *
 * Контракт: блокировать можно ТОЛЬКО когда замок реально виден. Если следов
 * удаления не видели — ошибка чтения помечается как «no lock seen», и старт
 * обязан пустить пользователя в приложение.
 *
 * Обновление 2026-09-01 (коммит 97fdf2083 «локальный замок больше НЕ ИСТОЧНИК
 * ПРАВДЫ»): сломанный локальный след больше НЕ бросает исключение и не запирает
 * вход даже когда замок виден. Правда об удалении живёт на сервере (tombstone +
 * permanent denial), а половинчатый или расходящийся след на устройстве просто
 * СТИРАЕТСЯ, и чтение возвращает null. Тесты ниже сторожат новую модель:
 * ни в одном из случаев пользователь не остаётся запертым.
 */

const RECORD_KEY = 'account_delete_pending_auth_v2';
const ANCHOR_KEY = 'account_delete_pending_auth_anchor_v2';

function lock(overrides: Record<string, unknown> = {}) {
  return {
    operationId: 'delete-op-1',
    providerUid: 'deleted-provider',
    stableId: 'deleted-stable',
    source: 'local',
    phase: 'local_cleared',
    createdAt: 1_000,
    expiresAt: 10_000,
    ...overrides,
  };
}

function anchor(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    operationId: 'delete-op-1',
    providerUid: 'deleted-provider',
    deletedStableId: 'deleted-stable',
    source: 'local',
    createdAt: 1_000,
    ...overrides,
  };
}

let secureRows: Record<string, string> = {};

beforeEach(() => {
  jest.resetModules();
  const secure = require('expo-secure-store');
  secure.__reset();
  secure.getItemAsync.mockReset();
  secure.setItemAsync.mockReset();
  secure.deleteItemAsync.mockReset();
  secureRows = {};
  secure.getItemAsync.mockImplementation(async (key: string) => secureRows[key] ?? null);
  secure.setItemAsync.mockImplementation(async (key: string, value: string) => { secureRows[key] = value; });
  secure.deleteItemAsync.mockImplementation(async (key: string) => { delete secureRows[key]; });
  secure.__rows = secureRows;

  const asyncStorage = require('@react-native-async-storage/async-storage');
  asyncStorage.__reset();
});

test('Keychain недоступен и следов удаления нет: ошибка помечена «замка не видели»', async () => {
  const secure = require('expo-secure-store');
  // Хранилище физически не отдаёт данные — ровно то, что происходит на реальном
  // устройстве, когда Keychain ещё не разблокирован или dev-билд пересобран.
  secure.getItemAsync.mockRejectedValue(new Error('keychain unavailable'));
  const quarantine = require('../app/account_delete_quarantine');

  const error = await quarantine.readAccountDeletePendingAuthRaw().catch((e: unknown) => e);

  expect(error).toBeInstanceOf(Error);
  expect(quarantine.isAccountDeleteGuardNoLockSeenError(error)).toBe(true);
});

test('замок виден, но сломан (запись без якоря): след стёрт, вход НЕ заперт', async () => {
  const secure = require('expo-secure-store');
  // Валидная запись без якоря = половинчатый след. Раньше он означал
  // «повреждён» и запирал устройство навсегда — снять было нечем.
  secureRows[RECORD_KEY] = JSON.stringify(lock());
  const quarantine = require('../app/account_delete_quarantine');

  const result = await quarantine.readAccountDeletePendingAuthRaw().catch((e: unknown) => e);

  // Броска нет: замка «нет» — значит и запирать нечем.
  expect(result).not.toBeInstanceOf(Error);
  expect(result).toBeNull();
  // Мусор физически снят с устройства, иначе он вернётся на следующем старте.
  expect(secureRows[RECORD_KEY]).toBeUndefined();
  expect(secure.deleteItemAsync).toHaveBeenCalledWith(RECORD_KEY);
});

test('якорь и запись расходятся: обе половины стёрты, вход НЕ заперт', async () => {
  const secure = require('expo-secure-store');
  // Инцидент 31.08-01.09 (UID #e5c3): расхождение половин запирало вход, старт
  // и повторное удаление разом — выхода не было ни одного.
  secureRows[RECORD_KEY] = JSON.stringify(lock());
  secureRows[ANCHOR_KEY] = JSON.stringify(anchor({ providerUid: 'someone-else' }));
  const quarantine = require('../app/account_delete_quarantine');

  const result = await quarantine.readAccountDeletePendingAuthRaw().catch((e: unknown) => e);

  expect(result).not.toBeInstanceOf(Error);
  expect(result).toBeNull();
  expect(secureRows[RECORD_KEY]).toBeUndefined();
  expect(secureRows[ANCHOR_KEY]).toBeUndefined();
  expect(secure.deleteItemAsync).toHaveBeenCalledWith(RECORD_KEY);
  expect(secure.deleteItemAsync).toHaveBeenCalledWith(ANCHOR_KEY);
});

test('обычные ошибки не считаются «замка не видели»', async () => {
  const quarantine = require('../app/account_delete_quarantine');

  expect(quarantine.isAccountDeleteGuardNoLockSeenError(new Error('boom'))).toBe(false);
  expect(quarantine.isAccountDeleteGuardNoLockSeenError(null)).toBe(false);
  expect(quarantine.isAccountDeleteGuardNoLockSeenError(undefined)).toBe(false);
  expect(quarantine.isAccountDeleteGuardNoLockSeenError('string')).toBe(false);
});

test('старт НЕ блокирует пользователя, когда хранилище не прочиталось и замка не видели', async () => {
  const secure = require('expo-secure-store');
  secure.getItemAsync.mockRejectedValue(new Error('keychain unavailable'));
  const quarantine = require('../app/account_delete_quarantine');

  // Ровно тот путь, по которому _layout решает показывать ли экран блокировки:
  // resumePendingAccountDeleteLocalExit() → false = «закрыть приложение».
  const error = await quarantine.readAccountDeletePendingAuthRaw().catch((e: unknown) => e);
  const startupWouldBlock = !quarantine.isAccountDeleteGuardNoLockSeenError(error);

  expect(startupWouldBlock).toBe(false);
});

// зачем (02.10, координатор §84 / Q118): полная проверка целостности PhoneState ушла с холодного
// старта в фон. Тест держит оба пути: чистая база → отметка «проверено», без флага; порча →
// флаг «пересоздать до открытия на следующем старте»; плюс правила «раз в сутки / при смене версии»
// и то, что runtime действительно пересоздаёт базу по флагу ДО открытия и снимает флаг ПОСЛЕ.
jest.mock('expo-sqlite', () => ({}));
jest.mock('expo-file-system', () => ({ File: jest.fn() }));
jest.mock('expo-constants', () => ({ __esModule: true, default: {}, ExecutionEnvironment: {} }));

import fs from 'node:fs';
import path from 'node:path';
import {
  DEFERRED_INTEGRITY_MIN_INTERVAL_MS,
  clearIntegrityResetFlag,
  deferredIntegrityDue,
  flagRuntimeCorruption,
  isRuntimeCorruptionFailure,
  resetRuntimeCorruptionMemoryForTests,
  isIntegrityResetPending,
  runDeferredIntegrityCheck,
  type DeferredIntegrityStorage,
} from '../modules/phone-state/deferred_integrity';

function memoryStorage(): DeferredIntegrityStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => { map.set(key, value); },
    removeItem: async (key) => { map.delete(key); },
  };
}

const SCOPE = { stableUid: 'uid-1', accountGeneration: 'gen-1' } as const;
const OTHER = { stableUid: 'uid-2', accountGeneration: 'gen-1' } as const;

describe('PhoneState deferred integrity (§84)', () => {
  test('чистая база: проверка один раз, отметка записана, флага нет', async () => {
    const storage = memoryStorage();
    const getAllAsync = jest.fn(async () => []);
    const outcome = await runDeferredIntegrityCheck({ database: { getAllAsync }, scope: SCOPE, storage, appVersion: '2.0.0', nowMs: 1_000 });
    expect(outcome).toBe('clean');
    expect(getAllAsync).toHaveBeenCalledWith('PRAGMA cipher_integrity_check');
    expect(await isIntegrityResetPending(storage, SCOPE)).toBe(false);

    // В те же сутки и на той же версии — не повторяется.
    const again = await runDeferredIntegrityCheck({ database: { getAllAsync }, scope: SCOPE, storage, appVersion: '2.0.0', nowMs: 2_000 });
    expect(again).toBe('not_due');
    expect(getAllAsync).toHaveBeenCalledTimes(1);
  });

  test('порча: флаг ставится только для своего аккаунта и снимается после пересоздания', async () => {
    const storage = memoryStorage();
    const getAllAsync = jest.fn(async () => [{ cipher_integrity_check: 'HMAC verification failed for page 3' }]);
    const outcome = await runDeferredIntegrityCheck({ database: { getAllAsync }, scope: SCOPE, storage, appVersion: '2.0.0', nowMs: 1_000 });
    expect(outcome).toBe('corrupt');
    expect(await isIntegrityResetPending(storage, SCOPE)).toBe(true);
    expect(await isIntegrityResetPending(storage, OTHER)).toBe(false);

    await clearIntegrityResetFlag(storage, SCOPE);
    expect(await isIntegrityResetPending(storage, SCOPE)).toBe(false);
  });

  test('сбой самой проверки: без флага и без отметки — повторится', async () => {
    const storage = memoryStorage();
    const getAllAsync = jest.fn(async () => { throw new Error('database is locked'); });
    const outcome = await runDeferredIntegrityCheck({ database: { getAllAsync }, scope: SCOPE, storage, appVersion: '2.0.0', nowMs: 1_000 });
    expect(outcome).toBe('failed');
    expect(storage.map.size).toBe(0);
  });

  test('сбой чтения флага не блокирует открытие', async () => {
    const storage = { ...memoryStorage(), getItem: async () => { throw new Error('storage down'); } };
    expect(await isIntegrityResetPending(storage, SCOPE)).toBe(false);
  });

  test('раз в сутки и при смене версии', () => {
    expect(deferredIntegrityDue(null, 0, '2.0.0').due).toBe(true);
    expect(deferredIntegrityDue({ atMs: 0, appVersion: '2.0.0' }, 60_000, '2.0.0').due).toBe(false);
    expect(deferredIntegrityDue({ atMs: 0, appVersion: '2.0.0' }, DEFERRED_INTEGRITY_MIN_INTERVAL_MS, '2.0.0').due).toBe(true);
    expect(deferredIntegrityDue({ atMs: 0, appVersion: '2.0.0' }, 60_000, '2.0.1').due).toBe(true);
    // Часы ушли назад — проверяем, а не молчим.
    expect(deferredIntegrityDue({ atMs: 10_000, appVersion: '2.0.0' }, 0, '2.0.0').due).toBe(true);
  });

  // Координатор 02.10 (находка «Дизайна»): порча страниц в середине файла на открытии не видна, а
  // отложенная проверка до суток отвечает not_due — ошибка порчи в РАБОТЕ сразу ставит флаг.
  test('порча во время работы ставит флаг один раз; обычные ошибки — нет', async () => {
    resetRuntimeCorruptionMemoryForTests();
    const storage = memoryStorage();
    expect(await flagRuntimeCorruption(storage, SCOPE, new Error('UNIQUE constraint failed'), 'run')).toBe(false);
    expect(await isIntegrityResetPending(storage, SCOPE)).toBe(false);

    for (const message of [
      'Error code 11: database disk image is malformed',
      'HMAC verification failed for page 20',
      'Error code 26: file is not a database',
    ]) {
      expect(isRuntimeCorruptionFailure(new Error(message))).toBe(true);
    }
    const setItem = jest.spyOn(storage, 'setItem');
    expect(await flagRuntimeCorruption(storage, SCOPE, new Error('SQLITE_CORRUPT: page 30'), 'getAll')).toBe(true);
    expect(await flagRuntimeCorruption(storage, SCOPE, new Error('SQLITE_CORRUPT: page 40'), 'getAll')).toBe(true);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(await isIntegrityResetPending(storage, SCOPE)).toBe(true);
    expect(await isIntegrityResetPending(storage, OTHER)).toBe(false);
    const runtime = fs.readFileSync(path.join(__dirname, '..', 'app', 'phone_state_runtime.ts'), 'utf8');
    expect(runtime).toContain('void flagRuntimeCorruption(AsyncStorage, scope, error, operation)');
    expect(runtime).toContain("watched('transaction',");
  });

  test('runtime: по флагу пересоздаёт ДО открытия и снимает флаг ПОСЛЕ; планировщик уважает занятость', () => {
    const runtime = fs.readFileSync(path.join(__dirname, '..', 'app', 'phone_state_runtime.ts'), 'utf8');
    const pending = runtime.indexOf('const integrityResetPending = await isIntegrityResetPending(AsyncStorage, scope);');
    const recreate = runtime.indexOf('? await recreatePhoneStateDatabaseAfterUnreadable(scope)');
    const clear = runtime.indexOf('await clearIntegrityResetFlag(AsyncStorage, scope);');
    expect(pending).toBeGreaterThan(0);
    expect(recreate).toBeGreaterThan(pending);
    expect(clear).toBeGreaterThan(recreate);
    expect(runtime).toContain('deferred_integrity:busy route=');
    // Координатор 02.10: проверка — на ОТДЕЛЬНОМ соединении только для чтения, иначе очередь
    // основного соединения держала бы чтения приложения; соединение закрывается после проверки.
    expect(runtime).toContain('connection = await openPhoneStateIntegrityConnection(scope);');
    expect(runtime).toContain('await connection.closeAsync()');
    expect(runtime).not.toContain('database: session.database,');
    const database = fs.readFileSync(path.join(__dirname, '..', 'modules', 'phone-state', 'database.ts'), 'utf8');
    expect(database).toContain('{ useNewConnection: true }');
    expect(database).toContain('PRAGMA query_only = ON;');
    const layout = fs.readFileSync(path.join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
    expect(layout).toContain('schedulePhoneStateDeferredIntegrityCheck(');
    expect(layout).toContain('cancelDeferredIntegrity?.();');
  });
});

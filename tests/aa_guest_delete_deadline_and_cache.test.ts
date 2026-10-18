/**
 * Удаление аккаунта (координатор 12.10, журнал прода):
 * - B(1): постановка удаления ГОСТЯ ждёт ответ в фоне до 25 с (холодный старт accountDeleteEnqueue ≈9 с > прежних 8 с);
 *   связанные аккаунты и пути возобновления — прежние 8 с.
 */
import fs from 'fs';
import path from 'path';
import { normalizeEol } from './helpers/read_source';

const root = path.join(__dirname, '..');
const read = (rel: string) => normalizeEol(fs.readFileSync(path.join(root, rel), 'utf8'));

describe('B(1) дедлайн постановки удаления', () => {
  it('гость — 25 с, связанные — прежние 8 с', () => {
    const t = read('app/account_delete_timeout.ts');
    expect(t).toContain('export const ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS = 8_000;');
    expect(t).toContain('export const ACCOUNT_DELETE_GUEST_BACKGROUND_ENQUEUE_TIMEOUT_MS = 25_000;');
    const auth = read('app/auth_provider.ts');
    const start = auth.indexOf('const cloudDeleteEnqueueOperation = isProvablyAnonymousAccount');
    expect(start).toBeGreaterThan(0);
    const block = auth.slice(start, start + 600);
    expect(block).toContain('timeoutMs: ACCOUNT_DELETE_GUEST_BACKGROUND_ENQUEUE_TIMEOUT_MS');
    expect(block).toContain(": startCloudDeletionEnqueue(pendingDeleteStableId, enqueueProof, ...accountsV2EnqueueArgs);");
    // пути возобновления (связанные) — без нового аргумента
    expect(auth).toContain('const op = startCloudDeletionEnqueue(lock.stableId, proof, ...retryAccountsV2Args);');
    expect(auth).toContain('const ack = await startCloudDeletionEnqueue(lock.stableId, proof).acknowledgment;');
  });

  it('cloud_sync: один и тот же дедлайн и для таймера, и для таймаута вызова', () => {
    const cs = read('app/cloud_sync.ts');
    const fn = cs.slice(cs.indexOf('export function startCloudDeletionEnqueue('), cs.indexOf('const ACCOUNT_DELETE_CREDENTIAL_SAFE_WAIT_MS'));
    expect(fn).toContain('const enqueueTimeoutMs = options?.timeoutMs ?? ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS;');
    expect(fn).toContain("{ timeout: enqueueTimeoutMs }");
    expect(fn).not.toContain('ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS,\n');
  });
});

// ── B(2): очистка кэша Firestore SDK на следующем холодном старте (координатор 12.10).
// Метка — в AsyncStorage после проверенного стирания; читается уже существующим стартовым multiGet (ни одного отдельного вызова).
const mockStore: Record<string, string> = {};
let mockSecureCalls = 0;
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: async (key: string, value: string) => { mockStore[key] = value; },
    removeItem: async (key: string) => { delete mockStore[key]; },
    getItem: async (key: string) => (key in mockStore ? mockStore[key] : null),
  },
}));
jest.mock('expo-secure-store', () => ({
  getItem: () => { mockSecureCalls += 1; return null; },
  getItemAsync: async () => { mockSecureCalls += 1; return null; },
  setItemAsync: async () => { mockSecureCalls += 1; },
  deleteItemAsync: async () => { mockSecureCalls += 1; },
}));
let mockFirestoreModuleLoaded = 0;
jest.mock('@react-native-firebase/firestore', () => {
  mockFirestoreModuleLoaded += 1;
  return { __esModule: true, default: () => ({ clearPersistence: async () => undefined }) };
});

describe('B(2) очистка кэша Firestore SDK', () => {
  beforeEach(() => { for (const k of Object.keys(mockStore)) delete mockStore[k]; mockSecureCalls = 0; });

  it('без метки — ни SecureStore, ни Firestore; в лог — проверка ≤2 мс', async () => {
    const logs: string[] = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((...a: unknown[]) => { logs.push(a.join(' ')); });
    const before = mockFirestoreModuleLoaded;
    const { runFirestoreCacheClearFromStartupRead } = require('../app/firestore_cache_clear');
    await expect(runFirestoreCacheClearFromStartupRead(null)).resolves.toBe('none');
    expect(mockFirestoreModuleLoaded).toBe(before);
    expect(mockSecureCalls).toBe(0);
    const line = logs.find((l) => l.includes('firestore_cache_clear check'));
    expect(line).toMatch(/check ms=(\d+) marker=0 lock=0 reason=none source=startup_multiget/);
    expect(Number(/ms=(\d+)/.exec(line!)![1])).toBeLessThanOrEqual(2);
    spy.mockRestore();
  });

  it('метка → clearPersistence → метка снята', async () => {
    const mod = require('../app/firestore_cache_clear');
    await mod.markFirestoreCacheClearPending('account_delete');
    const marker = mockStore[mod.FIRESTORE_CACHE_CLEAR_MARKER_KEY];
    expect(marker).toMatch(/:account_delete$/);
    const clearPersistence = jest.fn(async () => undefined);
    await expect(mod.runFirestoreCacheClearFromStartupRead(marker, null, () => ({ clearPersistence }))).resolves.toBe('cleared');
    expect(clearPersistence).toHaveBeenCalledTimes(1);
    expect(mockStore[mod.FIRESTORE_CACHE_CLEAR_MARKER_KEY]).toBeUndefined();
    expect(mockSecureCalls).toBe(0);
  });

  it('failed-precondition — метка остаётся, повтор на следующем старте', async () => {
    const mod = require('../app/firestore_cache_clear');
    await mod.markFirestoreCacheClearPending('account_delete');
    const err = Object.assign(new Error('x'), { code: 'firestore/failed-precondition' });
    await expect(mod.runFirestoreCacheClearFromStartupRead(mockStore[mod.FIRESTORE_CACHE_CLEAR_MARKER_KEY], null, () => ({ clearPersistence: async () => { throw err; } })))
      .resolves.toBe('failed');
    expect(mockStore[mod.FIRESTORE_CACHE_CLEAR_MARKER_KEY]).toBeDefined();
  });

  it('СТОРОЖ: модуль очистки не использует SecureStore и не импортирует Firestore на верхнем уровне; boot-модуля в index.js нет', () => {
    const src = read('app/firestore_cache_clear.ts');
    expect(src).not.toMatch(/expo-secure-store/);
    expect(src).not.toMatch(/^import .*@react-native-firebase\/firestore/m);
    expect(read('index.js')).not.toContain('firestore_cache_clear');
    expect(fs.existsSync(path.join(root, 'app/firestore_cache_clear_boot.ts'))).toBe(false);
  });

  it('СТОРОЖ порядка: метка — ключ уже существующего стартового multiGet; обработчик раньше восстановления из облака', () => {
    const layout = read('app/_layout.tsx');
    // координатор 18.10 04:16: тем же чтением — метка устройства «онбординг пройден» (после выхода).
    expect(layout).toContain("const startupIdentityKeys = forceOnboardingForQA ? [] : ['onboarding_done', BOOT_RESTORE_OWNER_KEY, FIRESTORE_CACHE_CLEAR_MARKER_KEY, ACCOUNT_DELETE_PENDING_AUTH_KEY, DEVICE_ONBOARDING_DONE_KEY];");
    const handler = layout.indexOf('void startupIdentityPairsPromise.then((pairs) => {\n          const startupValues = new Map(pairs);\n          return runFirestoreCacheClearFromStartupRead(');
    expect(handler).toBeGreaterThan(layout.indexOf('const startupIdentityPairsPromise'));
    expect(layout.slice(handler, handler + 400)).toContain('startupValues.get(ACCOUNT_DELETE_PENDING_AUTH_KEY) ?? null');
    expect(handler).toBeLessThan(layout.indexOf('cloudHydratePromise = liveDeferred ?? (async () => {'));
    // отдельного чтения метки нет
    expect((layout.match(/FIRESTORE_CACHE_CLEAR_MARKER_KEY/g) ?? []).length).toBe(3); // импорт, ключ, разбор
  });

  it('СТОРОЖ: метка ставится ПОСЛЕ проверенного стирания и в конце пути возобновления; не в начале удаления', () => {
    const auth = read('app/auth_provider.ts');
    const verify = auth.indexOf("    if (!verified) return false;\n    // зачем (координатор 12.10, удаление данных + замер");
    const mark = auth.indexOf("await markFirestoreCacheClearPending('account_delete');");
    expect(verify).toBeGreaterThan(0);
    expect(mark).toBeGreaterThan(verify);
    const resume = auth.indexOf("if (!alreadyWipedLocally) await markFirestoreCacheClearPending('account_delete_resume');");
    expect(resume).toBeGreaterThan(auth.indexOf('async function completePreparedAccountDeleteLocalExit('));
    const begin = auth.indexOf('export async function beginAccountDeletion()');
    const beginBody = auth.slice(begin, auth.indexOf('\nexport ', begin + 10));
    expect(beginBody).not.toContain('markFirestoreCacheClearPending');
  });
});

// ── Процесс убили между AsyncStorage.clear и записью метки (координатор 12.10): решаем по зеркалу замка удаления.
describe('B(2) замок удаления без метки', () => {
  beforeEach(() => { for (const k of Object.keys(mockStore)) delete mockStore[k]; });
  const lock = JSON.stringify({ operationId: 'op-123', providerUid: 'p', createdAt: 1 });

  it('решение: метка → очистка; замок без метки → очистка; замок + cleared:<тот же op> → пропуск; ничего → нет', () => {
    const { decideStartupCacheClear } = require('../app/firestore_cache_clear');
    expect(decideStartupCacheClear('1:account_delete', null)).toMatchObject({ run: true, reason: 'marker' });
    expect(decideStartupCacheClear(null, lock)).toMatchObject({ run: true, reason: 'lock_without_marker', lockOperationId: 'op-123' });
    expect(decideStartupCacheClear('cleared:op-123', lock)).toMatchObject({ run: false, reason: 'already_cleared_for_lock' });
    expect(decideStartupCacheClear('cleared:op-OLD', lock)).toMatchObject({ run: true, reason: 'lock_without_marker' });
    expect(decideStartupCacheClear('cleared:op-123', null)).toMatchObject({ run: false, reason: 'none' });
    expect(decideStartupCacheClear(null, null)).toMatchObject({ run: false, reason: 'none' });
    expect(decideStartupCacheClear(null, '{битый')).toMatchObject({ run: false, reason: 'none' });
  });

  it('замок без метки: ставим метку, очищаем, после успеха — cleared:<op> (а не удаление, чтобы не чистить каждый старт)', async () => {
    const mod = require('../app/firestore_cache_clear');
    const clearPersistence = jest.fn(async () => undefined);
    await expect(mod.runFirestoreCacheClearFromStartupRead(null, lock, () => ({ clearPersistence }))).resolves.toBe('cleared');
    expect(clearPersistence).toHaveBeenCalledTimes(1);
    expect(mockStore[mod.FIRESTORE_CACHE_CLEAR_MARKER_KEY]).toBe('cleared:op-123');
    // следующий старт при живом замке — без очистки
    const second = jest.fn(async () => undefined);
    await expect(mod.runFirestoreCacheClearFromStartupRead(mockStore[mod.FIRESTORE_CACHE_CLEAR_MARKER_KEY], lock, () => ({ clearPersistence: second })))
      .resolves.toBe('none');
    expect(second).not.toHaveBeenCalled();
  });
});

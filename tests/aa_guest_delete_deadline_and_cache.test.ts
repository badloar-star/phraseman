/**
 * Удаление аккаунта (координатор 12.10, журнал прода):
 * - B(1): постановка удаления ГОСТЯ ждёт ответ в фоне до 25 с (холодный старт accountDeleteEnqueue ≈9 с > прежних 8 с);
 *   связанные аккаунты и пути возобновления — прежние 8 с.
 */
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

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

// ── B(2): очистка кэша Firestore SDK на следующем холодном старте (координатор 12.10)
const mockSecure: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItem: (key: string) => (key in mockSecure ? mockSecure[key] : null),
  setItemAsync: async (key: string, value: string) => { mockSecure[key] = value; },
  deleteItemAsync: async (key: string) => { delete mockSecure[key]; },
}));

describe('B(2) очистка кэша Firestore SDK', () => {
  beforeEach(() => { for (const k of Object.keys(mockSecure)) delete mockSecure[k]; });

  it('без метки — Firestore не трогается вовсе', async () => {
    const { runFirestoreCacheClearOnColdStart } = require('../app/firestore_cache_clear');
    const get = jest.fn();
    await expect(runFirestoreCacheClearOnColdStart(get)).resolves.toBe('none');
    expect(get).not.toHaveBeenCalled();
  });

  it('метка → clearPersistence → метка снята', async () => {
    const mod = require('../app/firestore_cache_clear');
    await mod.markFirestoreCacheClearPending('account_delete');
    expect(mockSecure[mod.FIRESTORE_CACHE_CLEAR_MARKER_KEY]).toMatch(/:account_delete$/);
    const clearPersistence = jest.fn(async () => undefined);
    await expect(mod.runFirestoreCacheClearOnColdStart(() => ({ clearPersistence }))).resolves.toBe('cleared');
    expect(clearPersistence).toHaveBeenCalledTimes(1);
    expect(mockSecure[mod.FIRESTORE_CACHE_CLEAR_MARKER_KEY]).toBeUndefined();
  });

  it('failed-precondition — метка остаётся, повтор на следующем старте', async () => {
    const mod = require('../app/firestore_cache_clear');
    await mod.markFirestoreCacheClearPending('account_delete');
    const err = Object.assign(new Error('x'), { code: 'firestore/failed-precondition' });
    await expect(mod.runFirestoreCacheClearOnColdStart(() => ({ clearPersistence: async () => { throw err; } }))).resolves.toBe('failed');
    expect(mockSecure[mod.FIRESTORE_CACHE_CLEAR_MARKER_KEY]).toBeDefined();
  });

  it('СТОРОЖ порядка: index.js запускает очистку раньше expo-router и модулей с работой при импорте', () => {
    const idx = read('index.js');
    const boot = idx.indexOf("import './app/firestore_cache_clear_boot';");
    expect(boot).toBeGreaterThan(idx.indexOf("import './app/firebase_emulator_dev_boot';"));
    for (const later of ["import './app/energy_peek_cache';", "import './app/runes_system';", "import './app/net_status';", "import 'expo-router/entry';"]) {
      expect(boot).toBeLessThan(idx.indexOf(later));
    }
    // модули до очистки Firestore не трогают
    for (const early of ['app/cold_start_entry_mark.ts', 'app/rnfb_release_quiet.ts', 'app/async_storage_null_bind_guard.ts']) {
      if (fs.existsSync(path.join(root, early))) expect(read(early)).not.toMatch(/firestore\(|getFirestore|@react-native-firebase\/firestore/);
    }
    // сама очистка грузит Firestore только при наличии метки
    expect(read('app/firestore_cache_clear.ts')).not.toMatch(/^import .*@react-native-firebase\/firestore/m);
  });

  it('СТОРОЖ: метка ставится в beginAccountDeletion (гость и связанный) после dev-подмен', () => {
    const auth = read('app/auth_provider.ts');
    const fn = auth.indexOf('export async function beginAccountDeletion()');
    const mark = auth.indexOf("void markFirestoreCacheClearPending('account_delete');", fn);
    expect(mark).toBeGreaterThan(fn);
    expect(mark).toBeGreaterThan(auth.indexOf('if (isDevDeleteFail())', fn));
    expect(mark).toBeLessThan(auth.indexOf('\nexport ', fn + 10));
  });
});

// ── Цена проверки на каждом старте (координатор 12.10): без метки Firestore НЕ загружается вовсе.
let mockFirestoreModuleLoaded = 0;
jest.mock('@react-native-firebase/firestore', () => {
  mockFirestoreModuleLoaded += 1;
  return { __esModule: true, default: () => ({ clearPersistence: async () => undefined }) };
});

describe('B(2) проверка на старте без метки', () => {
  beforeEach(() => { for (const k of Object.keys(mockSecure)) delete mockSecure[k]; });

  it('без метки модуль Firestore не загружается (рантайм), в лог — время проверки', async () => {
    jest.isolateModules(() => {
      const logs: string[] = [];
      const spy = jest.spyOn(console, 'log').mockImplementation((...a: unknown[]) => { logs.push(a.join(' ')); });
      const before = mockFirestoreModuleLoaded;
      const { runFirestoreCacheClearOnColdStart } = require('../app/firestore_cache_clear');
      void runFirestoreCacheClearOnColdStart();
      expect(mockFirestoreModuleLoaded).toBe(before);
      expect(logs.some((l) => /\[ACC-MUT\] firestore_cache_clear check ms=\d+ marker=0/.test(l))).toBe(true);
      spy.mockRestore();
    });
  });

  it('с меткой модуль Firestore загружается и очищает', async () => {
    const mod = require('../app/firestore_cache_clear');
    await mod.markFirestoreCacheClearPending('account_delete');
    await expect(mod.runFirestoreCacheClearOnColdStart()).resolves.toBe('cleared');
    expect(mockFirestoreModuleLoaded).toBeGreaterThan(0);
  });

  it('boot-модуль не импортирует Firestore сам', () => {
    expect(read('app/firestore_cache_clear_boot.ts')).not.toMatch(/firestore['"]/);
  });
});

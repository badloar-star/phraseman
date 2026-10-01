// PM-228 «логи bounded, sampled, неблокирующие» — замер нагрузки журнала DebugLogger.
// зачем: A1 — лимиты размера записи/числа записей, дедуп повторов, purge по TTL, без retry-штормов;
// A2 — нагрузка ИЗМЕРЕНА (число записей на диск, байты, время вызова), а не заявлена как «нулевая».
// Замер идёт в jest/node, не на телефоне: абсолютное время на устройстве будет другим, но число
// обращений к AsyncStorage и размер журнала от платформы не зависят.
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/app_health', () => ({
  logAppError: jest.fn(async () => undefined),
}));

type AsyncStorageMock = {
  getItem: jest.Mock<Promise<string | null>, [string]>;
  setItem: jest.Mock<Promise<void>, [string, string]>;
  clear: jest.Mock<Promise<void>, []>;
  __reset?: () => void;
};

const JOURNAL_KEY = 'debug_logs_v1';

async function loadLogger() {
  jest.resetModules();
  (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;
  const storage = (await import('@react-native-async-storage/async-storage')).default as unknown as AsyncStorageMock;
  storage.__reset?.();
  // зачем: мок хранилища общий на файл — без очистки журнал прошлого теста подмешивается в следующий.
  await storage.clear();
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  const mod = await import('../app/debug-logger');
  return { mod, storage };
}

const journalWrites = (storage: AsyncStorageMock) => storage.setItem.mock.calls.filter(([k]) => k === JOURNAL_KEY);

describe('PM-228 DebugLogger bounded + non-blocking', () => {
  // зачем: performance не подменяем — иначе замер времени показывает 0 и ничего не меряет.
  beforeEach(() => { jest.useFakeTimers({ doNotFake: ['performance'] }); });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__;
  });

  it('caps every field of an entry', async () => {
    const { mod } = await loadLogger();
    const huge = 'x'.repeat(50_000);
    const bounded = mod.boundDebugLogEntry({ timestamp: new Date(0).toISOString(), context: huge, error: huge, stack: huge, severity: 'warning' });
    expect(bounded.context.length).toBeLessThanOrEqual(mod.DEBUG_LOG_FIELD_LIMITS.context + 16);
    expect(bounded.error.length).toBeLessThanOrEqual(mod.DEBUG_LOG_FIELD_LIMITS.error + 16);
    expect(bounded.stack!.length).toBeLessThanOrEqual(mod.DEBUG_LOG_FIELD_LIMITS.stack + 16);
  });

  it('measures a 5000-call error storm: one batched disk write, bounded journal size', async () => {
    const { mod, storage } = await loadLogger();
    const bigStack = 'at frame\n'.repeat(5_000); // ~45 КБ стека на запись
    const N = 5_000;
    const started = performance.now();
    for (let i = 0; i < N; i += 1) {
      const err = new Error(`storm ${i % 300}`);
      err.stack = bigStack;
      mod.DebugLogger.error(`pm228:storm:${i % 300}`, err, 'warning');
    }
    const syncMs = performance.now() - started;
    // До таймера сброса — НИ ОДНОЙ записи на диск: вызов не блокируется на AsyncStorage.
    expect(journalWrites(storage)).toHaveLength(0);

    await jest.advanceTimersByTimeAsync(6_000);
    const writes = journalWrites(storage);
    expect(writes.length).toBeLessThanOrEqual(1);
    const persisted = JSON.parse(String(await storage.getItem(JOURNAL_KEY))) as Array<{ stack?: string; error: string }>;
    expect(persisted.length).toBeLessThanOrEqual(160);
    const bytes = String(await storage.getItem(JOURNAL_KEY)).length;
    // 160 записей × (200 + 1000 + 2000 + служебные поля) — потолок ~0.6 МБ, без лимита полей было бы ~7 МБ.
    expect(bytes).toBeLessThan(160 * 3_600);
    for (const e of persisted) expect((e.stack ?? '').length).toBeLessThanOrEqual(mod.DEBUG_LOG_FIELD_LIMITS.stack + 16);

    const perCallUs = (syncMs * 1000) / N;
    process.stdout.write(`[PM-228] calls=${N} syncMs=${syncMs.toFixed(1)} perCallUs=${perCallUs.toFixed(1)} diskWrites=${writes.length} journalEntries=${persisted.length} journalBytes=${bytes}\n`);
    // Щедрый потолок против регресса «полный цикл диска на каждый вызов», не обещание скорости телефона.
    expect(perCallUs).toBeLessThan(2_000);
  });

  it('dedupes an identical repeat into a counter instead of new entries', async () => {
    const { mod, storage } = await loadLogger();
    for (let i = 0; i < 1_000; i += 1) mod.DebugLogger.error('pm228:same', new Error('same failure'), 'warning');
    await jest.advanceTimersByTimeAsync(6_000);
    const persisted = JSON.parse(String(await storage.getItem(JOURNAL_KEY))) as Array<{ count?: number }>;
    expect(persisted).toHaveLength(1);
    expect(persisted[0].count).toBe(1_000);
  });

  it('purges entries older than 7 days on flush', async () => {
    const { mod, storage } = await loadLogger();
    const old = { timestamp: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(), context: 'old', error: 'old', severity: 'warning' };
    // Журнал читается с диска лениво, на первом вызове — подкладываем старую запись до него.
    await storage.setItem(JOURNAL_KEY, JSON.stringify([old]));
    mod.DebugLogger.error('pm228:fresh', new Error('fresh'), 'warning');
    await jest.advanceTimersByTimeAsync(6_000);
    const persisted = JSON.parse(String(await storage.getItem(JOURNAL_KEY))) as Array<{ context: string }>;
    expect(persisted.map((e) => e.context)).toEqual(['pm228:fresh']);
  });
});

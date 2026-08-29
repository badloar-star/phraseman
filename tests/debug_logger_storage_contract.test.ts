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

const flushAsyncWork = () => new Promise((resolve) => setTimeout(resolve, 0));

async function loadDebugLoggerWithFreshStorage() {
  jest.resetModules();
  (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;
  const storage = (await import('@react-native-async-storage/async-storage')).default as unknown as AsyncStorageMock;
  storage.__reset?.();
  jest.clearAllMocks();
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const debugLogger = await import('../app/debug-logger');
  return { debugLogger, storage, consoleError, consoleWarn };
}

describe('DebugLogger storage contract', () => {
  afterEach(() => {
    delete (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__;
    jest.restoreAllMocks();
  });

  it('does not turn non-critical warnings into React Native console errors', async () => {
    const { debugLogger, storage, consoleError, consoleWarn } = await loadDebugLoggerWithFreshStorage();

    debugLogger.DebugLogger.error('debug:test', new Error('recoverable failure'), 'warning');

    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalledWith('[WARNING] debug:test: recoverable failure');
    await flushAsyncWork();
    await storage.clear();
  });

  it('stores repeated errors in one bounded log key instead of timestamp keys', async () => {
    const { debugLogger, storage } = await loadDebugLoggerWithFreshStorage();

    await storage.setItem('debug_log_1', JSON.stringify({ old: true }));
    storage.setItem.mockClear();
    debugLogger.DebugLogger.error('debug:test', new Error('same failure'), 'warning');
    debugLogger.DebugLogger.error('debug:test', new Error('same failure'), 'warning');
    debugLogger.DebugLogger.error('debug:test', new Error('same failure'), 'warning');
    await flushAsyncWork();

    expect(storage.setItem.mock.calls.some(([key]) => key.startsWith('debug_log_'))).toBe(false);
    const raw = await storage.getItem('debug_logs_v1');
    const logs = JSON.parse(String(raw));
    expect(logs).toHaveLength(1);
    expect(logs[0]).toEqual(expect.objectContaining({
      context: 'debug:test',
      error: 'same failure',
      severity: 'warning',
      count: 3,
    }));
    await expect(storage.getItem('debug_log_1')).resolves.toBeNull();
  });

  it('caps persisted debug entries so the log cannot grow forever', async () => {
    const { debugLogger, storage } = await loadDebugLoggerWithFreshStorage();

    for (let i = 0; i < 180; i += 1) {
      debugLogger.DebugLogger.error(`debug:test:${i}`, new Error(`failure ${i}`), 'warning');
    }
    await flushAsyncWork();

    const raw = await storage.getItem('debug_logs_v1');
    const logs = JSON.parse(String(raw));
    expect(logs).toHaveLength(160);
    expect(logs[0].context).toBe('debug:test:20');
    expect(logs[159].context).toBe('debug:test:179');
  });
});

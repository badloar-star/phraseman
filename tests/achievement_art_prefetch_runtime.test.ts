// PM-213/PM-215 — прогрев арта достижений: не качает в фоне, уступает занятию.
//
// зачем: прогрев (P4, 64 картинки) раньше не знал про фон приложения и про «интерактивную
// тишину сети» живого урока Learning V2. Тест держит три факта: пачка идёт под арендой,
// в фоне очередь останавливается, при тишине сети URL забываются (повторятся на следующем
// событии), а не теряются навсегда.
export {};

const mockPrefetch = jest.fn();
const mockAppState = { currentState: 'active' as string, addEventListener: jest.fn(() => ({ remove: jest.fn() })) };

jest.mock('react-native', () => ({ AppState: mockAppState, Platform: { OS: 'android' } }));
jest.mock('expo-image', () => ({ Image: { prefetch: (...args: unknown[]) => mockPrefetch(...args) } }));
jest.mock('../app/debug-logger', () => ({
  DebugLogger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  reportSwallowed: jest.fn(),
}));

type PrefetchModule = typeof import('../app/achievement_art_prefetch');
type QuietModule = typeof import('../app/interactive_network_quiet');

async function loadModules(): Promise<{ art: PrefetchModule; quiet: QuietModule }> {
  jest.resetModules();
  (global as { __DEV__?: boolean }).__DEV__ = false;
  const quiet = await import('../app/interactive_network_quiet');
  const art = await import('../app/achievement_art_prefetch');
  return { art, quiet };
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
};

describe('achievement art prefetch runtime', () => {
  let log: jest.SpyInstance;

  beforeEach(() => {
    // queueMicrotask не подменяем: аренда сети переоткрывается через него после release.
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    mockPrefetch.mockReset();
    mockPrefetch.mockResolvedValue(true);
    mockAppState.currentState = 'active';
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    log.mockRestore();
    jest.useRealTimers();
  });

  it('prefetches the shelf in batches under a background network lease', async () => {
    const { art, quiet } = await loadModules();
    let leasesSeen = 0;
    mockPrefetch.mockImplementation(async () => {
      leasesSeen = Math.max(leasesSeen, quiet.interactiveNetworkQuietSnapshot().activeNetworkLeases);
      return true;
    });

    art.prefetchAllAchievementArt();
    await flush();
    await jest.advanceTimersByTimeAsync(10_000);

    expect(mockPrefetch).toHaveBeenCalled();
    expect(leasesSeen).toBe(1);
    expect(quiet.interactiveNetworkQuietSnapshot().activeNetworkLeases).toBe(0);
  });

  it('stops and forgets the queue when the app is not active, so the next event retries', async () => {
    const { art } = await loadModules();
    mockAppState.currentState = 'background';

    art.prefetchAllAchievementArt();
    await flush();
    expect(mockPrefetch).not.toHaveBeenCalled();
    expect(log.mock.calls.some(([message]) => String(message).includes('[RUNTIME-PREFETCH] achievement_art остановлен'))).toBe(true);

    // Следующее событие в активном приложении обязано снова поставить арт в очередь.
    mockAppState.currentState = 'active';
    art.prefetchAllAchievementArt();
    await flush();
    expect(mockPrefetch).toHaveBeenCalled();
  });

  it('yields to interactive network quiet and retries after it is released', async () => {
    const { art, quiet } = await loadModules();
    const handle = quiet.beginInteractiveNetworkQuiet();
    await quiet.waitForInteractiveNetworkQuiet(handle);

    art.prefetchAllAchievementArt();
    await flush();
    expect(mockPrefetch).not.toHaveBeenCalled();
    expect(log.mock.calls.some(([message]) => String(message).includes('[RUNTIME-PREFETCH] achievement_art остановлен'))).toBe(true);

    quiet.releaseInteractiveNetworkQuiet(handle);
    await flush();
    art.prefetchAllAchievementArt();
    await flush();
    expect(mockPrefetch).toHaveBeenCalled();
  });

  it('aborts an in-flight batch when interactive quiet begins, without waiting for the images', async () => {
    const { art, quiet } = await loadModules();
    mockPrefetch.mockImplementation(() => new Promise<boolean>(() => {}));

    art.prefetchAllAchievementArt();
    await flush();
    expect(quiet.interactiveNetworkQuietSnapshot().activeNetworkLeases).toBe(1);

    const handle = quiet.beginInteractiveNetworkQuiet();
    await quiet.waitForInteractiveNetworkQuiet(handle);
    expect(quiet.interactiveNetworkQuietSnapshot().activeNetworkLeases).toBe(0);
    quiet.releaseInteractiveNetworkQuiet(handle);
  });
});

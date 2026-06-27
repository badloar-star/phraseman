jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/firebase', () => ({ logEvent: jest.fn() }));
jest.mock('../app/posthog_client', () => ({
  capturePostHog: jest.fn(),
  identifyPostHog: jest.fn(),
  resetPostHog: jest.fn(),
  isPostHogEnabled: jest.fn(() => false),
}));

type AsyncStorageMock = {
  getItem: jest.Mock<Promise<string | null>, [string]>;
  setItem: jest.Mock<Promise<void>, [string, string]>;
  removeItem: jest.Mock<Promise<void>, [string]>;
  __reset?: () => void;
};

async function loadAnalyticsWithFreshCache() {
  jest.resetModules();
  const storage = (await import('@react-native-async-storage/async-storage')).default as unknown as AsyncStorageMock;
  storage.__reset?.();
  jest.clearAllMocks();
  const analytics = await import('../app/analytics');
  return { analytics, storage };
}

describe('analytics queue cache', () => {
  it('does not persist routine analytics events into the local AsyncStorage queue', async () => {
    const { analytics, storage } = await loadAnalyticsWithFreshCache();

    await analytics.trackEvent('app_open', { source: 'test' });
    await analytics.trackEvent('lesson_start', { lesson: 1 });

    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();

    await expect(analytics.getEventQueue()).resolves.toEqual([]);
    expect(storage.getItem).toHaveBeenCalledTimes(1);

    await analytics.clearEventQueue();
    await expect(analytics.getEventQueue()).resolves.toEqual([]);
    expect(storage.getItem).toHaveBeenCalledTimes(1);
  });
});

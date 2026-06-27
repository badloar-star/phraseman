const mockGetApp = jest.fn(() => ({ name: '[DEFAULT]' }));
const mockGetFunctions = jest.fn((_app: unknown, _region: string) => ({ region: 'us-central1' }));
const mockCallableInvoker = jest.fn(async () => ({ data: { ok: true, id: 'idea_1' } }));
const mockHttpsCallable = jest.fn((_functions: unknown, _name: string) => mockCallableInvoker);
const mockInitFirebaseAppCheckIfAvailable = jest.fn(async () => true);

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
}));
jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: () => mockInitFirebaseAppCheckIfAvailable(),
}));
jest.mock('@react-native-firebase/app', () => ({
  getApp: () => mockGetApp(),
}));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: (app: unknown, region: string) => mockGetFunctions(app, region),
  httpsCallable: (functions: unknown, name: string) => mockHttpsCallable(functions, name),
}));

async function loadIdeasClientWithFreshCache() {
  jest.resetModules();
  jest.clearAllMocks();
  return import('../app/ideas_client');
}

describe('ideas client callable cache', () => {
  it('dedupes concurrent AppCheck warmup and reuses the submitUserIdea callable', async () => {
    const { submitUserIdea } = await loadIdeasClientWithFreshCache();

    await Promise.all([
      submitUserIdea({
        title: 'One',
        description: 'First idea',
        benefit: 'Faster learning',
        category: 'feature',
        lang: 'ru',
        userName: 'Ada',
      }),
      submitUserIdea({
        title: 'Two',
        description: 'Second idea',
        benefit: 'Better lessons',
        category: 'content',
        lang: 'uk',
        userName: null,
      }),
    ]);

    expect(mockInitFirebaseAppCheckIfAvailable).toHaveBeenCalledTimes(1);
    expect(mockGetApp).toHaveBeenCalledTimes(1);
    expect(mockGetFunctions).toHaveBeenCalledTimes(1);
    expect(mockGetFunctions).toHaveBeenCalledWith({ name: '[DEFAULT]' }, 'us-central1');
    expect(mockHttpsCallable).toHaveBeenCalledTimes(1);
    expect(mockHttpsCallable).toHaveBeenCalledWith({ region: 'us-central1' }, 'submitUserIdea');
    expect(mockCallableInvoker).toHaveBeenCalledTimes(2);
    expect(mockCallableInvoker).toHaveBeenNthCalledWith(1, {
      payload: expect.objectContaining({
        title: 'One',
        description: 'First idea',
        benefit: 'Faster learning',
        category: 'feature',
        lang: 'ru',
        userName: 'Ada',
        platform: 'ios',
      }),
    });
    expect(mockCallableInvoker).toHaveBeenNthCalledWith(2, {
      payload: expect.objectContaining({
        title: 'Two',
        description: 'Second idea',
        benefit: 'Better lessons',
        category: 'content',
        lang: 'uk',
        userName: null,
        platform: 'ios',
      }),
    });

    await expect(submitUserIdea({
      title: 'Three',
      description: 'Third idea',
      benefit: 'Cleaner UI',
      category: 'improvement',
      lang: 'es',
    })).resolves.toEqual({ ok: true, id: 'idea_1' });

    expect(mockHttpsCallable).toHaveBeenCalledTimes(1);
    expect(mockCallableInvoker).toHaveBeenCalledTimes(3);
    expect(mockInitFirebaseAppCheckIfAvailable).toHaveBeenCalledTimes(2);
  });
});

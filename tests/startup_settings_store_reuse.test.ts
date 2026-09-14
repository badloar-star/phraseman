import type { SettingsBootReadScope } from '../lib/startup_settings_read_scope';

const storage = {
  getItem: jest.fn<Promise<string | null>, [string]>(),
  setItem: jest.fn<Promise<void>, [string, string]>(),
};
const publish = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => storage);
jest.mock('../app/app_snapshot_store', () => ({ patchAppSnapshot: (...args: unknown[]) => publish(...args) }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('actual user settings store with optional boot reuse', () => {
  let store: typeof import('../app/user_settings_store');
  let scope: SettingsBootReadScope;
  let hydrate: (scope?: SettingsBootReadScope) => Promise<void>;
  let persisted: string | null;
  let generation: number;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    persisted = JSON.stringify({ speechRate: 1.3, voiceOut: false, uiSounds: false });
    storage.getItem.mockImplementation(async () => persisted);
    storage.setItem.mockImplementation(async (_key, raw) => { persisted = raw; });
    store = require('../app/user_settings_store');
    // The optional argument is the requested feature: the baseline ignores it.
    hydrate = store.hydrateUserSettingsFromStorage;
    generation = 1;
    scope = require('../lib/startup_settings_read_scope').createSettingsBootReadScope(() => generation === 1);
  });

  test('two settled startup hydrations read once and publish equal normalized settings twice', async () => {
    await hydrate(scope);
    const first = store.getUserSettingsSnapshot();
    await hydrate(scope);
    expect(storage.getItem).toHaveBeenCalledTimes(1);
    expect(store.getUserSettingsSnapshot()).toEqual(first);
    expect(first).toMatchObject({ speechRate: 1.3, voiceOut: false, uiSounds: false });
    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish.mock.calls[1][0].settings).toMatchObject({ ...first, source: 'storage', updatedAt: expect.any(Number) });
  });

  test('ordinary screen loadSettings never uses the boot container', async () => {
    await hydrate(scope);
    persisted = '{"speechRate":1.1}';
    expect((await store.loadSettings()).speechRate).toBe(1.1);
    expect(storage.getItem).toHaveBeenCalledTimes(2);
  });

  test('a faster second request finishes while the first is still pending', async () => {
    const first = deferred<string | null>();
    storage.getItem.mockImplementationOnce(() => first.promise);
    const firstHydration = hydrate(scope);
    await hydrate(scope);
    expect(storage.getItem).toHaveBeenCalledTimes(2);
    expect(store.getUserSettingsSnapshot().speechRate).toBe(1.3);
    first.resolve(persisted);
    await firstHydration;
  });

  test('retries native storage after a failed first hydration', async () => {
    storage.getItem.mockRejectedValueOnce(new Error('temporary read failure'));
    await hydrate(scope);
    expect(store.getUserSettingsSnapshot()).toEqual(store.DEFAULT_SETTINGS);
    await hydrate(scope);
    expect(storage.getItem).toHaveBeenCalledTimes(2);
    expect(store.getUserSettingsSnapshot().speechRate).toBe(1.3);
  });

  test.each([null, '', '{broken', 'null', '[]', 'true', '42', '"text"'])(
    'does not cache missing, malformed or non-object settings: %p', async (raw) => {
      storage.getItem.mockResolvedValueOnce(raw);
      await hydrate(scope);
      expect(scope.peek()).toBeNull();
      await hydrate(scope);
      expect(storage.getItem).toHaveBeenCalledTimes(2);
      expect(store.getUserSettingsSnapshot().speechRate).toBe(1.3);
    },
  );

  test('keeps normalization and legacy-field removal on reused raw data', async () => {
    persisted = '{"speechRate":0.5,"speechVoiceId":42,"showHints":true,"appSoundsEnabled":true,"extra":{"x":1}}';
    await hydrate(scope);
    (store.getUserSettingsSnapshot() as unknown as { extra: { x: number } }).extra.x = 9;
    await hydrate(scope);
    expect(storage.getItem).toHaveBeenCalledTimes(1);
    expect(store.getUserSettingsSnapshot()).toMatchObject({ speechRate: 0.8, speechVoiceId: '', extra: { x: 1 } });
    expect(store.getUserSettingsSnapshot()).not.toHaveProperty('showHints');
    expect(store.getUserSettingsSnapshot()).not.toHaveProperty('appSoundsEnabled');
  });

  test.each(['saveSettings', 'applyUserSettingsNow'] as const)(
    '%s invalidates before synchronous local publication and native dispatch', async (method) => {
      await hydrate(scope);
      expect(scope.peek()).not.toBeNull();
      publish.mockImplementationOnce(() => expect(scope.peek()).toBeNull());
      const write = deferred<void>();
      storage.setItem.mockImplementationOnce(() => {
        expect(scope.peek()).toBeNull();
        return write.promise;
      });
      const result = store[method]({ ...store.DEFAULT_SETTINGS, speechRate: 1.2 });
      expect(store.getUserSettingsSnapshot().speechRate).toBe(1.2);
      expect(storage.setItem).toHaveBeenCalledTimes(1);
      expect(scope.peek()).toBeNull();
      write.resolve();
      await result;
      await Promise.resolve();
      expect(scope.peek()).toBeNull();
      await hydrate(scope);
      expect(storage.getItem).toHaveBeenCalledTimes(2);
    },
  );

  test.each(['saveSettings', 'applyUserSettingsNow'] as const)(
    '%s write failure leaves the next read fresh', async (method) => {
      await hydrate(scope);
      storage.setItem.mockRejectedValueOnce(new Error('disk full'));
      await store[method]({ ...store.DEFAULT_SETTINGS, speechRate: 1.2 });
      await Promise.resolve();
      await hydrate(scope);
      expect(storage.getItem).toHaveBeenCalledTimes(2);
      expect(store.getUserSettingsSnapshot().speechRate).toBe(1.3);
    },
  );

  test('an old account result is never reused after a generation change', async () => {
    await hydrate(scope);
    generation = 2;
    persisted = '{"speechRate":1.1}';
    await hydrate(scope);
    expect(storage.getItem).toHaveBeenCalledTimes(2);
    expect(store.getUserSettingsSnapshot().speechRate).toBe(1.1);
    expect(scope.peek()).toBeNull();
  });

  test('closed boot scopes no longer reuse data', async () => {
    await hydrate(scope);
    scope.close();
    await hydrate(scope);
    expect(storage.getItem).toHaveBeenCalledTimes(2);
  });
});

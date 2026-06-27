describe('async storage null bind guard', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  function loadGuardedAsyncStorage() {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.__reset?.();
    require('../app/async_storage_null_bind_guard');
    return AsyncStorage;
  }

  it('drops invalid keys before AsyncStorage.multiGet reaches Android SQLite', async () => {
    const AsyncStorage = loadGuardedAsyncStorage();
    await AsyncStorage.setItem('ok', '1');
    await AsyncStorage.setItem('second', '2');

    await expect(
      AsyncStorage.multiGet(['ok', null, undefined, '', 123, 'second'] as unknown as string[]),
    ).resolves.toEqual([
      ['ok', '1'],
      ['second', '2'],
    ]);
  });

  it('drops invalid keys before AsyncStorage.multiRemove reaches Android SQLite', async () => {
    const AsyncStorage = loadGuardedAsyncStorage();
    await AsyncStorage.multiSet([
      ['ok', '1'],
      ['second', '2'],
    ]);

    await AsyncStorage.multiRemove(['ok', null, undefined, '', 123, 'second'] as unknown as string[]);

    await expect(AsyncStorage.multiGet(['ok', 'second'])).resolves.toEqual([
      ['ok', null],
      ['second', null],
    ]);
  });

  it('patches direct native multiGet and multiRemove calls too', async () => {
    const originalGet = jest.fn(async (keys: string[]) => keys.map((key) => [key, null]));
    const originalRemove = jest.fn(async (_keys: string[]) => undefined);
    const native: {
      multiGet: (keys: string[], cb?: unknown) => Promise<unknown>;
      multiRemove: (keys: string[], cb?: unknown) => Promise<unknown>;
    } = {
      multiGet: originalGet,
      multiRemove: originalRemove,
    };

    jest.doMock('react-native', () => ({
      NativeModules: { RNCAsyncStorage: native },
      TurboModuleRegistry: { get: jest.fn(() => null) },
    }));

    require('../app/async_storage_null_bind_guard');

    await native.multiGet(['ok', null, undefined, '', 123, 'second'] as unknown as string[]);
    await native.multiRemove(['ok', null, undefined, '', 123, 'second'] as unknown as string[]);

    expect(originalGet).toHaveBeenCalledWith(['ok', 'second'], undefined);
    expect(originalRemove).toHaveBeenCalledWith(['ok', 'second'], undefined);
  });
});

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

    // зачем (03.10): охрана тянет debug-logger → константы приложения, которым нужен Platform из react-native; без него тест падал
    // на Platform.OS ещё до своих проверок (красный был и на чистом HEAD — сторож, который не доходил до проверки).
    jest.doMock('react-native', () => ({
      NativeModules: { RNCAsyncStorage: native },
      TurboModuleRegistry: { get: jest.fn(() => null) },
      Platform: { OS: 'android', select: (spec: Record<string, unknown>) => spec.android ?? spec.default },
    }));

    require('../app/async_storage_null_bind_guard');

    await native.multiGet(['ok', null, undefined, '', 123, 'second'] as unknown as string[]);
    await native.multiRemove(['ok', null, undefined, '', 123, 'second'] as unknown as string[]);

    expect(originalGet).toHaveBeenCalledWith(['ok', 'second'], undefined);
    expect(originalRemove).toHaveBeenCalledWith(['ok', 'second'], undefined);
  });

  // зачем ([COLD-START-IO], 03.10): пустой multiGet/multiRemove (на старте ~10 штук) в нативный модуль не идёт.
  it('empty or fully invalid key lists never reach the native module and answer [] like AsyncStorage', async () => {
    // предыдущий тест подменяет react-native через doMock — здесь нужен настоящий (иначе константы приложения падают на Platform.OS)
    jest.unmock('react-native');
    const AsyncStorage = loadGuardedAsyncStorage();
    const getSpy = jest.spyOn(require('@react-native-async-storage/async-storage').default, 'multiGet');
    await expect(AsyncStorage.multiGet([])).resolves.toEqual([]);
    await expect(AsyncStorage.multiGet([null, undefined, ''] as unknown as string[])).resolves.toEqual([]);
    const cb = jest.fn();
    await AsyncStorage.multiGet([], cb);
    expect(cb).toHaveBeenCalledWith(null, []);
    await expect(AsyncStorage.multiRemove([])).resolves.toBeUndefined();
    expect(getSpy).toHaveBeenCalled();
  });


  // зачем ([COLD-START-IO], 03.10): getAllKeys — single-flight. Одновременные вызовы делят один нативный вызов; результат
  // не хранится после завершения (денежные журналы: устаревший список ключей недопустим); запись отцепляет от общего вызова.
  describe('getAllKeys single-flight', () => {
    function spyKeys(AsyncStorage: { getAllKeys: unknown }) {
      const original = AsyncStorage.getAllKeys as () => Promise<string[]>;
      const spy = jest.fn(() => original.call(AsyncStorage));
      return spy;
    }
    function loadWithSpy() {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      AsyncStorage.__reset?.();
      const spy = spyKeys(AsyncStorage);
      AsyncStorage.getAllKeys = spy;
      require('../app/async_storage_null_bind_guard');
      return { AsyncStorage, spy };
    }
    // фоновые записи самого приложения (журнал здоровья) меняют эпоху — даём им осесть и смотрим только на свои ключи
    async function settle() {
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    function mine(keys: string[]) {
      return keys.filter((key) => !key.startsWith('app_health')).sort();
    }

    it('concurrent calls share one native call and get independent copies', async () => {
      const { AsyncStorage, spy } = loadWithSpy();
      await AsyncStorage.setItem('a', '1');
      await settle();
      spy.mockClear();
      const [x, y] = await Promise.all([AsyncStorage.getAllKeys(), AsyncStorage.getAllKeys()]);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(mine(x)).toEqual(['a']);
      expect(x).not.toBe(y);
    });

    it('sequential calls always hit the native layer (no stored result)', async () => {
      const { AsyncStorage, spy } = loadWithSpy();
      await AsyncStorage.setItem('a', '1');
      await settle();
      spy.mockClear();
      await AsyncStorage.getAllKeys();
      await AsyncStorage.getAllKeys();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('a write between calls is visible; a write started during a read detaches later callers', async () => {
      const { AsyncStorage, spy } = loadWithSpy();
      await AsyncStorage.setItem('a', '1');
      await settle();
      spy.mockClear();
      const first = AsyncStorage.getAllKeys();
      const write = AsyncStorage.setItem('b', '2');
      const second = AsyncStorage.getAllKeys();
      await write;
      await first;
      expect(spy).toHaveBeenCalledTimes(2);
      expect(mine(await second)).toEqual(['a', 'b']);
      expect(mine(await AsyncStorage.getAllKeys())).toEqual(['a', 'b']);
    });

    it('a failed native call is rethrown and does not poison the next call', async () => {
      const { AsyncStorage, spy } = loadWithSpy();
      jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      spy.mockImplementationOnce(() => Promise.reject(new Error('boom')));
      await expect(AsyncStorage.getAllKeys()).rejects.toThrow('boom');
      expect(mine(await AsyncStorage.getAllKeys())).toEqual([]);
    });
  });

});

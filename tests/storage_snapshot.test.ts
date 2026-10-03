// зачем (§122): read-through снапшот не имеет права отдать устаревшее значение после ЛЮБОЙ записи в ключ, откуда бы она ни пришла,
// и не должен трогать денежные журналы.
describe('storage snapshot (read-through)', () => {
  function load() {
    jest.resetModules();
    jest.restoreAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.__reset?.();
    require('../app/async_storage_null_bind_guard');
    const snapshot = require('../app/storage_snapshot') as typeof import('../app/storage_snapshot');
    snapshot.resetStorageSnapshotForTests();
    const getItem = jest.spyOn(AsyncStorage, 'getItem');
    const multiGet = jest.spyOn(AsyncStorage, 'multiGet');
    // фоновые чтения самого приложения (журнал здоровья) не наши — считаем только обращения по своим ключам
    const callsFor = (key: string) => getItem.mock.calls.filter((call) => call[0] === key).length;
    return { AsyncStorage, snapshot, getItem, multiGet, callsFor };
  }

  it('reads storage once, then answers from memory', async () => {
    const { AsyncStorage, snapshot, callsFor } = load();
    await AsyncStorage.setItem('premium_active', 'true');
    await expect(snapshot.readStoredItem('premium_active')).resolves.toBe('true');
    await expect(snapshot.readStoredItem('premium_active')).resolves.toBe('true');
    await expect(snapshot.readStoredItem('premium_active')).resolves.toBe('true');
    expect(callsFor('premium_active')).toBe(1);
    expect(snapshot.peekStoredItem('premium_active')).toBe('true');
  });

  it('caches an absent key as null too', async () => {
    const { snapshot, callsFor } = load();
    await expect(snapshot.readStoredItem('nothing_here')).resolves.toBeNull();
    await expect(snapshot.readStoredItem('nothing_here')).resolves.toBeNull();
    expect(callsFor('nothing_here')).toBe(1);
  });

  it('a write made behind the snapshot (plain AsyncStorage) is never served stale', async () => {
    const { AsyncStorage, snapshot } = load();
    await AsyncStorage.setItem('streak_count', '3');
    await snapshot.readStoredItem('streak_count');
    await AsyncStorage.setItem('streak_count', '4');
    expect(snapshot.peekStoredItem('streak_count')).toBeUndefined();
    await expect(snapshot.readStoredItem('streak_count')).resolves.toBe('4');
    await AsyncStorage.multiSet([['streak_count', '5']]);
    await expect(snapshot.readStoredItem('streak_count')).resolves.toBe('5');
    await AsyncStorage.multiRemove(['streak_count']);
    await expect(snapshot.readStoredItem('streak_count')).resolves.toBeNull();
    await AsyncStorage.setItem('streak_count', '9');
    await snapshot.readStoredItem('streak_count');
    await AsyncStorage.clear();
    await expect(snapshot.readStoredItem('streak_count')).resolves.toBeNull();
  });

  it('a read that started before a write cannot store its stale result', async () => {
    const { AsyncStorage, snapshot, getItem } = load();
    await AsyncStorage.setItem('user_frame', 'old');
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    getItem.mockImplementation(((key: string) => (key === 'user_frame' ? gate.then(() => 'old') : Promise.resolve(null))) as (...args: unknown[]) => any);
    const slowRead = snapshot.readStoredItem('user_frame');
    await AsyncStorage.setItem('user_frame', 'new');
    release();
    await slowRead;
    expect(snapshot.peekStoredItem('user_frame')).toBeUndefined();
    getItem.mockImplementation(((key: string) => Promise.resolve(key === 'user_frame' ? 'new' : null)) as (...args: unknown[]) => any);
    await expect(snapshot.readStoredItem('user_frame')).resolves.toBe('new');
  });

  it('write-through puts the value in memory first, then storage; value stays cached after success', async () => {
    const { AsyncStorage, snapshot } = load();
    const pending = snapshot.writeStoredItem('coin_rank_v1', '{"rank":2}');
    expect(snapshot.peekStoredItem('coin_rank_v1')).toBe('{"rank":2}');
    await pending;
    expect(snapshot.peekStoredItem('coin_rank_v1')).toBe('{"rank":2}');
    await expect(AsyncStorage.getItem('coin_rank_v1')).resolves.toBe('{"rank":2}');
    await snapshot.removeStoredItem('coin_rank_v1');
    expect(snapshot.peekStoredItem('coin_rank_v1')).toBeNull();
    await expect(AsyncStorage.getItem('coin_rank_v1')).resolves.toBeNull();
  });

  it('a failed write rolls back: nothing wrong stays in memory and the error is rethrown', async () => {
    const { AsyncStorage, snapshot } = load();
    await AsyncStorage.setItem('intro_full_access_started_at_v1', '1');
    await snapshot.readStoredItem('intro_full_access_started_at_v1');
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    await expect(snapshot.writeStoredItem('intro_full_access_started_at_v1', '2')).rejects.toThrow('disk full');
    expect(snapshot.peekStoredItem('intro_full_access_started_at_v1')).toBeUndefined();
    await expect(snapshot.readStoredItem('intro_full_access_started_at_v1')).resolves.toBe('1');
    expect(snapshot.snapshotRtStats().errors).toBeGreaterThan(0);
  });

  it('money journal keys are never held in memory: every read goes to storage', async () => {
    const { AsyncStorage, snapshot, getItem } = load();
    const keys = [
      'level_spin_star_operation_v1:owner:op1',
      'practice_rune_journal_v1:owner:j1',
      'energy_session_operation_v1:owner:x',
      'client_shard_operation_ledger_v1:owner',
    ];
    for (const key of keys) await AsyncStorage.setItem(key, 'v');
    getItem.mockClear();
    for (const key of keys) {
      expect(snapshot.isSnapshotDeniedKey(key)).toBe(true);
      await snapshot.readStoredItem(key);
      await snapshot.readStoredItem(key);
      expect(snapshot.peekStoredItem(key)).toBeUndefined();
    }
    expect(getItem).toHaveBeenCalledTimes(keys.length * 2);
  });

  it('readStoredItems asks storage once for all missing keys and serves the rest from memory', async () => {
    const { AsyncStorage, snapshot, multiGet } = load();
    await AsyncStorage.multiSet([['a_key', '1'], ['b_key', '2'], ['c_key', '3']]);
    await snapshot.readStoredItem('a_key');
    multiGet.mockClear();
    const rows = await snapshot.readStoredItems(['a_key', 'b_key', 'c_key', 'zzz']);
    expect(rows).toEqual([['a_key', '1'], ['b_key', '2'], ['c_key', '3'], ['zzz', null]]);
    expect(multiGet).toHaveBeenCalledTimes(1);
    expect(multiGet.mock.calls[0]?.[0]).toEqual(['b_key', 'c_key', 'zzz']);
    multiGet.mockClear();
    await snapshot.readStoredItems(['a_key', 'b_key', 'c_key', 'zzz']);
    expect(multiGet).not.toHaveBeenCalled();
  });

  it('hydrateStoredKeys warms keys with one multiGet; a failing storage is logged and swallowed', async () => {
    const { AsyncStorage, snapshot, multiGet, getItem } = load();
    await AsyncStorage.multiSet([['premium_active', 'true'], ['streak_count', '7']]);
    multiGet.mockClear();
    await snapshot.hydrateStoredKeys(['premium_active', 'streak_count', 'user_frame']);
    expect(multiGet).toHaveBeenCalledTimes(1);
    getItem.mockClear();
    await expect(snapshot.readStoredItem('streak_count')).resolves.toBe('7');
    expect(getItem).not.toHaveBeenCalled();
    multiGet.mockRejectedValueOnce(new Error('sqlite busy'));
    await expect(snapshot.hydrateStoredKeys(['never_read_key'])).resolves.toBeUndefined();
  });
});

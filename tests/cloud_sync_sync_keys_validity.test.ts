import { FRENCH_TARGET_SYNC_KEYS, getRuntimeSyncKeys, SYNC_KEYS } from '../app/cloud_sync';

function badKeys(keys: readonly unknown[]) {
  return keys
    .map((key, index) => ({ index, key, type: typeof key }))
    .filter(({ key }) => typeof key !== 'string' || key.length === 0);
}

describe('cloud sync storage key lists', () => {
  test('SYNC_KEYS contains only non-empty string keys', () => {
    expect(badKeys(SYNC_KEYS)).toEqual([]);
  });

  test('FRENCH_TARGET_SYNC_KEYS contains only non-empty string keys', () => {
    expect(badKeys(FRENCH_TARGET_SYNC_KEYS)).toEqual([]);
  });

  test('getRuntimeSyncKeys filters invalid runtime entries before AsyncStorage.multiGet', () => {
    expect(getRuntimeSyncKeys(['user_total_xp', undefined, '', null, 'streak_count'])).toEqual([
      'user_total_xp',
      'streak_count',
    ]);
  });
});

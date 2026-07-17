import AsyncStorage from '@react-native-async-storage/async-storage';
import { accountLocalDataKeysForToday, wipeLocalAccountData } from '../app/cloud_sync';
import { getAppSnapshot, patchAppSnapshot } from '../app/app_snapshot_store';
import { CUSTOMIZATION_ACCOUNT_LOCAL_KEYS } from '../constants/customization_storage_keys';
import {
  legacyFreeLessonCapKey,
  legacyFreeLessonMigrationKey,
} from '../app/target_storage_keys';

jest.mock('@react-native-async-storage/async-storage');

const store: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(store).forEach((key) => delete store[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => store[key] ?? null);
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: string[]) => {
    keys.forEach((key) => delete store[key]);
  });
});

it('removes purchase recovery and spend ledger during account switch wipe', async () => {
  CUSTOMIZATION_ACCOUNT_LOCAL_KEYS.forEach((key) => { store[key] = 'sentinel'; });
  patchAppSnapshot({
    customization: {
      source: 'storage', updatedAt: 1, activeAvatar: '18', storedAuraSelection: null,
      totalXp: 1, level: 1, shards: 1, ownedAvatars: {}, ownedAuras: {},
      giftedAvatarId: null, giftedAuraId: null,
    },
  });

  expect(accountLocalDataKeysForToday('2026-07-13')).toEqual(
    expect.arrayContaining([...CUSTOMIZATION_ACCOUNT_LOCAL_KEYS]),
  );
  await wipeLocalAccountData();

  CUSTOMIZATION_ACCOUNT_LOCAL_KEYS.forEach((key) => expect(store[key]).toBeUndefined());
  expect(getAppSnapshot().customization).toBeUndefined();
});

it('removes legacy lesson caps and migration markers during account switch wipe', async () => {
  const legacyKeys = [
    legacyFreeLessonCapKey('en'),
    legacyFreeLessonMigrationKey('en'),
    legacyFreeLessonCapKey('fr'),
    legacyFreeLessonMigrationKey('fr'),
  ];
  legacyKeys.forEach((key) => { store[key] = 'sentinel'; });

  expect(accountLocalDataKeysForToday('2026-07-13')).toEqual(
    expect.arrayContaining(legacyKeys),
  );
  await wipeLocalAccountData();

  legacyKeys.forEach((key) => expect(store[key]).toBeUndefined());
});

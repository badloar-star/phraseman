import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  accountLocalDataKeysForToday,
  saveAccountSwitchEmergencyBackup,
  wipeLocalAccountData,
} from '../app/cloud_sync';
import { shardDeltaQueueStorageKey } from '../app/shards_delta_queue';
import { getAppSnapshot, patchAppSnapshot } from '../app/app_snapshot_store';
import { CUSTOMIZATION_ACCOUNT_LOCAL_KEYS } from '../constants/customization_storage_keys';
import {
  legacyFreeLessonCapKey,
  legacyFreeLessonMigrationKey,
} from '../app/target_storage_keys';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/user_id_policy', () => ({
  clearArenaAuthUidCache: jest.fn(),
  getAuthUserId: jest.fn(() => null),
  getCanonicalUserId: jest.fn(async () => 'local-stable-id'),
}));

const store: Record<string, string> = {};
const BACKUP_KEY = 'account_switch_emergency_backup_latest_v1';

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(store).forEach((key) => delete store[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => store[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    store[key] = value;
  });
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: string[]) => (
    keys.map((key) => [key, store[key] ?? null])
  ));
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: string[]) => {
    keys.forEach((key) => delete store[key]);
  });
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => Object.keys(store));
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

it('removes fixed and wildcard personal-plan replay state without clearing device preferences', async () => {
  const oldAccountKeys = [
    'personal_plan_attempt_events_v1',
    'personal_plan_recovery_applied_actions_v1',
    'personal_plan_day_runtime_v1:account_a_plan:gavan:1',
    'personal_plan_day_runtime_v1:account_a_plan:gavan:32',
  ];
  const deviceKeys = ['app_theme', 'app_font_size', 'haptics_tap'];

  [...oldAccountKeys, ...deviceKeys, 'unrelated_device_cache_v1'].forEach((key) => {
    store[key] = `sentinel:${key}`;
  });

  await wipeLocalAccountData();

  oldAccountKeys.forEach((key) => expect(store[key]).toBeUndefined());
  deviceKeys.forEach((key) => expect(store[key]).toBe(`sentinel:${key}`));
  expect(store.unrelated_device_cache_v1).toBe('sentinel:unrelated_device_cache_v1');
});

it('keeps account B isolated when a deferred account A callback writes replay state during the wipe', async () => {
  let releaseFirstRemoval: (() => void) | undefined;
  let firstRemovalStarted: (() => void) | undefined;
  const firstRemovalStartedPromise = new Promise<void>((resolve) => {
    firstRemovalStarted = resolve;
  });
  const releaseFirstRemovalPromise = new Promise<void>((resolve) => {
    releaseFirstRemoval = resolve;
  });

  (AsyncStorage.multiRemove as jest.Mock).mockImplementationOnce(async (keys: string[]) => {
    keys.forEach((key) => delete store[key]);
    firstRemovalStarted?.();
    await releaseFirstRemovalPromise;
  });

  store.personal_plan_attempt_events_v1 = 'account-a-before-switch';
  const wipePromise = wipeLocalAccountData();
  await firstRemovalStartedPromise;

  store.personal_plan_attempt_events_v1 = 'account-a-deferred-attempt';
  store['personal_plan_day_runtime_v1:account_a_plan:gavan:7'] = 'account-a-deferred-runtime';
  releaseFirstRemoval?.();
  await wipePromise;

  expect(store.personal_plan_attempt_events_v1).toBeUndefined();
  expect(store['personal_plan_day_runtime_v1:account_a_plan:gavan:7']).toBeUndefined();

  store.personal_plan_attempt_events_v1 = 'account-b-attempt';
  store['personal_plan_day_runtime_v1:account_b_plan:gavan:1'] = 'account-b-runtime';
  expect(store.personal_plan_attempt_events_v1).toBe('account-b-attempt');
  expect(store['personal_plan_day_runtime_v1:account_b_plan:gavan:1']).toBe('account-b-runtime');
});

it('fails closed when wildcard account-key discovery is unavailable', async () => {
  store.personal_plan_attempt_events_v1 = 'account-a-attempts';
  store['personal_plan_day_runtime_v1:account_a_plan:gavan:9'] = 'account-a-runtime';
  (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValueOnce(new Error('storage scan failed'));

  await expect(wipeLocalAccountData()).rejects.toThrow('learning_v2_account_key_scan_failed');

  expect(store.personal_plan_attempt_events_v1).toBe('account-a-attempts');
  expect(store['personal_plan_day_runtime_v1:account_a_plan:gavan:9']).toBe('account-a-runtime');
});

it('fails closed when account-key removal is incomplete', async () => {
  store.personal_plan_attempt_events_v1 = 'account-a-attempts';
  (AsyncStorage.multiRemove as jest.Mock).mockRejectedValueOnce(new Error('storage remove failed'));

  await expect(wipeLocalAccountData()).rejects.toThrow('storage remove failed');

  expect(store.personal_plan_attempt_events_v1).toBe('account-a-attempts');
});

it('fails closed when the final defense-in-depth removal fails', async () => {
  store.personal_plan_attempt_events_v1 = 'account-a-before-switch';
  (AsyncStorage.multiRemove as jest.Mock)
    .mockImplementationOnce(async (keys: string[]) => {
      keys.forEach((key) => delete store[key]);
      store.personal_plan_attempt_events_v1 = 'account-a-late-write';
    })
    .mockRejectedValueOnce(new Error('late storage remove failed'));

  await expect(wipeLocalAccountData()).rejects.toThrow('late storage remove failed');

  expect(store.personal_plan_attempt_events_v1).toBe('account-a-late-write');
});

it('backs up the same fixed and wildcard V2 keys that account wipe removes', async () => {
  store.personal_plan_attempt_events_v1 = 'account-a-attempts';
  store.personal_plan_recovery_applied_actions_v1 = 'account-a-recovery';
  store['personal_plan_day_runtime_v1:account_a_plan:gavan:17'] = 'account-a-runtime';

  await saveAccountSwitchEmergencyBackup('test');

  const raw = store[BACKUP_KEY];
  const payload = JSON.parse(raw) as { pairs: Array<[string, string]> };
  expect(payload.pairs).toEqual(expect.arrayContaining([
    ['personal_plan_attempt_events_v1', 'account-a-attempts'],
    ['personal_plan_recovery_applied_actions_v1', 'account-a-recovery'],
    ['personal_plan_day_runtime_v1:account_a_plan:gavan:17', 'account-a-runtime'],
  ]));
});

it('backs up and verifies the exact owner-scoped shard earn queue before account switch', async () => {
  const queueKey = shardDeltaQueueStorageKey('local-stable-id');
  const queueRaw = JSON.stringify([{
    opId: 'op-owner-a-1234',
    ownerStableId: 'local-stable-id',
    delta: 2,
    type: 'earn',
    reason: 'lesson_first',
    createdAtMs: 1,
  }]);
  store[queueKey] = queueRaw;

  await expect(saveAccountSwitchEmergencyBackup(
    'pending_shard_earn_before_account_switch',
    'local-stable-id',
  )).resolves.toBe(true);

  const payload = JSON.parse(store[BACKUP_KEY]) as {
    version: number;
    stableId: string;
    pairs: Array<[string, string]>;
  };
  expect(payload.version).toBe(2);
  expect(payload.stableId).toBe('local-stable-id');
  expect(payload.pairs).toContainEqual([queueKey, queueRaw]);
});

it('does not report an emergency backup when wildcard discovery fails', async () => {
  store.personal_plan_attempt_events_v1 = 'account-a-attempts';
  store[BACKUP_KEY] = 'prior-valid-backup';
  (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValueOnce(new Error('storage scan failed'));

  await expect(saveAccountSwitchEmergencyBackup('test')).rejects.toThrow(
    'learning_v2_account_key_scan_failed',
  );

  expect(store[BACKUP_KEY]).toBe('prior-valid-backup');
});

it('restores the prior valid backup when replacement verification fails', async () => {
  store.personal_plan_attempt_events_v1 = 'account-a-attempts';
  store[BACKUP_KEY] = 'prior-valid-backup';
  (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(async (key: string) => {
    store[key] = 'corrupt-replacement';
  });

  await expect(saveAccountSwitchEmergencyBackup('test')).rejects.toThrow(
    'account_switch_backup_verification_failed',
  );

  expect(store[BACKUP_KEY]).toBe('prior-valid-backup');
});

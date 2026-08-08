import AsyncStorage from '@react-native-async-storage/async-storage';
import { beginAccountGeneration } from '../app/account_generation';
import {
  giftAccountLegacyOwnerKey,
  giftAccountStorageKey,
  readGiftAccountValue,
  removeGiftAccountValue,
} from '../app/gift_account_storage';

jest.mock('@react-native-async-storage/async-storage');

const storage: Record<string, string> = {};
let failSetKey: string | null = null;
let failRemoveKey: string | null = null;

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  failSetKey = null;
  failRemoveKey = null;
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    if (key === failSetKey) throw new Error(`set failed: ${key}`);
    storage[key] = value;
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    if (key === failRemoveKey) throw new Error(`remove failed: ${key}`);
    delete storage[key];
  });
});

test('claims a durable owner before materialization and only that UID resumes after a materialize failure', async () => {
  storage.legacy_gift = 'A-only';
  const a = beginAccountGeneration('account-a');
  const aScoped = giftAccountStorageKey('legacy_gift', a)!;
  const ownerKey = giftAccountLegacyOwnerKey('legacy_gift');
  failSetKey = aScoped;

  await expect(readGiftAccountValue('legacy_gift', a)).rejects.toThrow('set failed');
  expect(JSON.parse(storage[ownerKey])).toMatchObject({ ownerUid: 'account-a' });
  expect(storage.legacy_gift).toBe('A-only');

  failSetKey = null;
  const b = beginAccountGeneration('account-b');
  await expect(readGiftAccountValue('legacy_gift', b)).resolves.toBeNull();
  expect(giftAccountStorageKey('legacy_gift', b)!).not.toBe(aScoped);

  const aAgain = beginAccountGeneration('account-a');
  await expect(readGiftAccountValue('legacy_gift', aAgain)).resolves.toBe('A-only');
  expect(storage[aScoped]).toBe('A-only');
  expect(storage.legacy_gift).toBeUndefined();
});

test('keeps the owner tombstone when legacy removal fails so B cannot claim after restart', async () => {
  storage.legacy_gift = 'A-only';
  const a = beginAccountGeneration('account-a');
  failRemoveKey = 'legacy_gift';

  await expect(readGiftAccountValue('legacy_gift', a)).rejects.toThrow('remove failed');
  expect(storage[giftAccountStorageKey('legacy_gift', a)!]).toBe('A-only');
  expect(storage.legacy_gift).toBe('A-only');

  failRemoveKey = null;
  jest.resetModules();
  const b = beginAccountGeneration('account-b');
  await expect(readGiftAccountValue('legacy_gift', b)).resolves.toBeNull();
  expect(storage[giftAccountStorageKey('legacy_gift', b)!]).toBeUndefined();
});

test('a failed owner claim never materializes or removes legacy data', async () => {
  storage.legacy_gift = 'A-only';
  const a = beginAccountGeneration('account-a');
  failSetKey = giftAccountLegacyOwnerKey('legacy_gift');

  await expect(readGiftAccountValue('legacy_gift', a)).rejects.toThrow('set failed');
  expect(storage[giftAccountStorageKey('legacy_gift', a)!]).toBeUndefined();
  expect(storage.legacy_gift).toBe('A-only');
});

test('A to B to A remains isolated and a clean scoped wipe cannot expose removed legacy data', async () => {
  storage.legacy_gift = 'A-only';
  const a = beginAccountGeneration('account-a');
  await expect(readGiftAccountValue('legacy_gift', a)).resolves.toBe('A-only');

  const b = beginAccountGeneration('account-b');
  await expect(readGiftAccountValue('legacy_gift', b)).resolves.toBeNull();

  const aAgain = beginAccountGeneration('account-a');
  await removeGiftAccountValue('legacy_gift', aAgain);
  await expect(readGiftAccountValue('legacy_gift', aAgain)).resolves.toBeNull();
  expect(storage[giftAccountLegacyOwnerKey('legacy_gift')]).toBeDefined();
});

test('rejects a scoped read when the active account changes during awaited legacy cleanup', async () => {
  const a = beginAccountGeneration('account-a');
  storage[giftAccountStorageKey('legacy_gift', a)!] = 'A-only';
  let releaseLegacyRead!: () => void;
  let markLegacyReadStarted!: () => void;
  const legacyReadStarted = new Promise<void>((resolve) => { markLegacyReadStarted = resolve; });
  const legacyReadGate = new Promise<void>((resolve) => { releaseLegacyRead = resolve; });
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
    if (key === 'legacy_gift') {
      markLegacyReadStarted();
      await legacyReadGate;
    }
    return storage[key] ?? null;
  });

  const pending = readGiftAccountValue('legacy_gift', a);
  await legacyReadStarted;
  beginAccountGeneration('account-b');
  releaseLegacyRead();

  await expect(pending).rejects.toThrow('gift_account_storage_identity_changed');
});

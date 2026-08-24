import { createHash } from 'node:crypto';

import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

import * as AccountSecret from '../modules/phone-state/account_secret';
import {
  materializePhoneStateCredentials,
  type PhoneStateScope,
} from '../modules/phone-state/account_secret';
import { openPhoneStateDatabase } from '../modules/phone-state/database';

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

const SERVICE = 'phraseman.phone_state.sqlcipher.v1';
const SECURE_OPTIONS = {
  keychainService: SERVICE,
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};
const VALID_KEY = 'ab'.repeat(32);
const SCOPE: PhoneStateScope = {
  stableUid: 'account-A',
  accountGeneration: 3,
};

type MockDatabase = {
  execAsync: jest.Mock<Promise<void>, [string]>;
  getFirstAsync: jest.Mock<Promise<{ cipher_version: string } | null>, [string]>;
  getAllAsync: jest.Mock<Promise<Array<{ cipher_integrity_check: string }>>, [string]>;
  closeAsync: jest.Mock<Promise<void>, []>;
};

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function secureKeyFor(scope: PhoneStateScope): string {
  return `phone_state_key_v1_${sha256(scope.stableUid)}_${scope.accountGeneration}`;
}

function makeDatabase(): MockDatabase {
  return {
    execAsync: jest.fn(async (_sql: string) => undefined),
    getFirstAsync: jest.fn(async (_sql: string) => ({ cipher_version: '4.7.2 community' })),
    getAllAsync: jest.fn(async (_sql: string) => []),
    closeAsync: jest.fn(async () => undefined),
  };
}

async function seedStoredKey(scope = SCOPE, keyHex = VALID_KEY): Promise<void> {
  await SecureStore.setItemAsync(secureKeyFor(scope), keyHex, SECURE_OPTIONS);
  (SecureStore.setItemAsync as jest.Mock).mockClear();
}

beforeEach(() => {
  jest.restoreAllMocks();
  (SecureStore as typeof SecureStore & { __reset(): void }).__reset();
  (Crypto as typeof Crypto & { __reset(): void }).__reset();
  (SQLite.openDatabaseAsync as jest.Mock).mockReset();
  (Constants as { executionEnvironment: string }).executionEnvironment =
    ExecutionEnvironment.Standalone;
});

describe('phone-state account credentials', () => {
  test('uses only native SecureStore key characters while preserving account and generation isolation', async () => {
    const accountA3 = await materializePhoneStateCredentials(SCOPE);
    const accountB3 = await materializePhoneStateCredentials({
      stableUid: 'account-B',
      accountGeneration: 3,
    });
    const accountA4 = await materializePhoneStateCredentials({ ...SCOPE, accountGeneration: 4 });

    expect(accountA3.secureKey).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(accountB3.secureKey).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(accountA4.secureKey).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(new Set([
      accountA3.secureKey,
      accountB3.secureKey,
      accountA4.secureKey,
    ])).toHaveProperty('size', 3);
  });

  test('database names and SecureStore keys isolate accounts without exposing raw stableUid', async () => {
    const accountA = await materializePhoneStateCredentials(SCOPE);
    const accountB = await materializePhoneStateCredentials({
      stableUid: 'account-B',
      accountGeneration: 3,
    });
    const accountAHash = sha256('account-A');
    const accountBHash = sha256('account-B');

    expect(accountA).toMatchObject({
      databaseName: `phone-state-v1-${accountAHash.slice(0, 32)}-3.db`,
      secureKey: `phone_state_key_v1_${accountAHash}_3`,
    });
    expect(accountB.databaseName).toBe(`phone-state-v1-${accountBHash.slice(0, 32)}-3.db`);
    expect(accountA.databaseName).toMatch(/^phone-state-v1-[a-f0-9]{32}-3\.db$/);
    expect(accountA.databaseName).not.toContain('account-A');
    expect(accountA.secureKey).not.toContain('account-A');
    expect(accountA.databaseName).not.toBe(accountB.databaseName);
    expect(accountA.secureKey).not.toBe(accountB.secureKey);
    expect(accountA.keyHex).not.toBe(accountB.keyHex);
  });

  test('account generation isolates the database and SecureStore key', async () => {
    const generation3 = await materializePhoneStateCredentials(SCOPE);
    const generation4 = await materializePhoneStateCredentials({ ...SCOPE, accountGeneration: 4 });

    expect(generation3.databaseName).not.toBe(generation4.databaseName);
    expect(generation3.secureKey).not.toBe(generation4.secureKey);
    expect(generation3.keyHex).not.toBe(generation4.keyHex);
  });

  test('uses explicit hexadecimal SHA-256 and exact SecureStore options for get and set', async () => {
    await materializePhoneStateCredentials(SCOPE);

    expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
      Crypto.CryptoDigestAlgorithm.SHA256,
      SCOPE.stableUid,
      { encoding: Crypto.CryptoEncoding.HEX },
    );
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(secureKeyFor(SCOPE), SECURE_OPTIONS);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      secureKeyFor(SCOPE),
      expect.stringMatching(/^[a-f0-9]{64}$/),
      SECURE_OPTIONS,
    );
  });

  test('returns a valid stored key without generating or overwriting it', async () => {
    await seedStoredKey();

    const credentials = await materializePhoneStateCredentials(SCOPE);

    expect(credentials.keyHex).toBe(VALID_KEY);
    expect(Crypto.getRandomBytesAsync).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  test('malformed stored key fails closed and is never overwritten', async () => {
    await seedStoredKey(SCOPE, 'NOT-A-SQLCIPHER-KEY');

    await expect(materializePhoneStateCredentials(SCOPE)).rejects.toThrow('phone_state_key_invalid');
    expect(Crypto.getRandomBytesAsync).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  test('converts exactly 32 random bytes to two lowercase hexadecimal characters each', async () => {
    const bytes = Uint8Array.from({ length: 32 }, (_, index) => index);
    (Crypto.getRandomBytesAsync as jest.Mock).mockResolvedValueOnce(bytes);

    const credentials = await materializePhoneStateCredentials(SCOPE);

    expect(Crypto.getRandomBytesAsync).toHaveBeenCalledWith(32);
    expect(credentials.keyHex).toBe('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f');
  });

  test('rejects random output that is not exactly 32 bytes', async () => {
    (Crypto.getRandomBytesAsync as jest.Mock).mockResolvedValueOnce(new Uint8Array(31));

    await expect(materializePhoneStateCredentials(SCOPE)).rejects.toThrow('phone_state_key_invalid');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  test.each([
    { stableUid: '', accountGeneration: 0 },
    { stableUid: '   ', accountGeneration: 0 },
    { stableUid: 'account-A', accountGeneration: -1 },
    { stableUid: 'account-A', accountGeneration: 1.5 },
    { stableUid: 'account-A', accountGeneration: Number.MAX_SAFE_INTEGER + 1 },
  ])('rejects an unsafe account scope before hashing or storage: %p', async (scope) => {
    await expect(materializePhoneStateCredentials(scope)).rejects.toThrow('phone_state_scope_invalid');
    expect(Crypto.digestStringAsync).not.toHaveBeenCalled();
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
  });

  test('rejects a malformed account digest before constructing storage identifiers', async () => {
    (Crypto.digestStringAsync as jest.Mock).mockResolvedValueOnce('A'.repeat(64));

    await expect(materializePhoneStateCredentials(SCOPE)).rejects.toThrow('phone_state_scope_invalid');
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
  });

  test('coalesces concurrent materialization for the same scope', async () => {
    const [first, second, third] = await Promise.all([
      materializePhoneStateCredentials(SCOPE),
      materializePhoneStateCredentials(SCOPE),
      materializePhoneStateCredentials(SCOPE),
    ]);

    expect(first).toEqual(second);
    expect(second).toEqual(third);
    expect(Crypto.getRandomBytesAsync).toHaveBeenCalledTimes(1);
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
  });

  test('clears a rejected in-flight SecureStore read so the next call can retry', async () => {
    const original = new Error('secure get failed');
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(original);

    await expect(materializePhoneStateCredentials(SCOPE)).rejects.toBe(original);
    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(1);
    expect(Crypto.getRandomBytesAsync).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();

    const credentials = await materializePhoneStateCredentials(SCOPE);

    expect(credentials.keyHex).toMatch(/^[a-f0-9]{64}$/);
    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(2);
    expect(Crypto.getRandomBytesAsync).toHaveBeenCalledTimes(1);
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
  });

  test('clears a rejected in-flight SecureStore write so the next call can retry', async () => {
    const original = new Error('secure set failed');
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(original);

    await expect(materializePhoneStateCredentials(SCOPE)).rejects.toBe(original);
    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(1);
    expect(Crypto.getRandomBytesAsync).toHaveBeenCalledTimes(1);
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);

    const credentials = await materializePhoneStateCredentials(SCOPE);

    expect(credentials.keyHex).toMatch(/^[a-f0-9]{64}$/);
    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(2);
    expect(Crypto.getRandomBytesAsync).toHaveBeenCalledTimes(2);
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2);
  });
});

describe('phone-state SQLCipher database opener', () => {
  test('Expo Go override fails closed before credentials or SQLite are touched', async () => {
    const credentialSpy = jest.spyOn(AccountSecret, 'materializePhoneStateCredentials');

    await expect(openPhoneStateDatabase(SCOPE, { isExpoGo: true }))
      .rejects.toThrow('phone_state_native_unavailable');
    expect(credentialSpy).not.toHaveBeenCalled();
    expect(SQLite.openDatabaseAsync).not.toHaveBeenCalled();
  });

  test('automatically detects the StoreClient execution environment', async () => {
    (Constants as { executionEnvironment: string }).executionEnvironment =
      ExecutionEnvironment.StoreClient;
    const credentialSpy = jest.spyOn(AccountSecret, 'materializePhoneStateCredentials');

    await expect(openPhoneStateDatabase(SCOPE)).rejects.toThrow('phone_state_native_unavailable');
    expect(credentialSpy).not.toHaveBeenCalled();
    expect(SQLite.openDatabaseAsync).not.toHaveBeenCalled();
  });

  test('an untyped false override cannot bypass StoreClient detection', async () => {
    (Constants as { executionEnvironment: string }).executionEnvironment =
      ExecutionEnvironment.StoreClient;
    const credentialSpy = jest.spyOn(AccountSecret, 'materializePhoneStateCredentials');

    await expect(openPhoneStateDatabase(SCOPE, { isExpoGo: false } as never))
      .rejects.toThrow('phone_state_native_unavailable');
    expect(credentialSpy).not.toHaveBeenCalled();
    expect(SQLite.openDatabaseAsync).not.toHaveBeenCalled();
  });

  test('rejects a malformed credential before opening SQLite', async () => {
    jest.spyOn(AccountSecret, 'materializePhoneStateCredentials').mockResolvedValueOnce({
      databaseName: 'phone-state-v1-safe-3.db',
      keyHex: 'INVALID',
      secureKey: 'phone_state_key_v1_safe_3',
    });

    await expect(openPhoneStateDatabase(SCOPE))
      .rejects.toThrow('phone_state_key_invalid');
    expect(SQLite.openDatabaseAsync).not.toHaveBeenCalled();
  });

  test('opens, keys first, attests SQLCipher, accepts zero integrity rows, then configures', async () => {
    await seedStoredKey();
    const calls: string[] = [];
    const db = makeDatabase();
    db.execAsync.mockImplementation(async (sql) => { calls.push(`exec:${sql}`); });
    db.getFirstAsync.mockImplementation(async (sql) => {
      calls.push(`get:${sql}`);
      return { cipher_version: '4.7.2 community' };
    });
    db.getAllAsync.mockImplementation(async (sql) => {
      calls.push(`all:${sql}`);
      return [];
    });
    (SQLite.openDatabaseAsync as jest.Mock).mockImplementationOnce(async (databaseName: string) => {
      calls.push(`open:${databaseName}`);
      return db;
    });

    const result = await openPhoneStateDatabase(SCOPE);
    const databaseName = `phone-state-v1-${sha256(SCOPE.stableUid).slice(0, 32)}-3.db`;

    expect(result).toBe(db);
    expect(calls).toEqual([
      `open:${databaseName}`,
      `exec:PRAGMA key = "x'${VALID_KEY}'"`,
      'get:PRAGMA cipher_version',
      'all:PRAGMA cipher_integrity_check',
      'exec:PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;',
    ]);
    expect(db.closeAsync).not.toHaveBeenCalled();
  });

  test.each([null, { cipher_version: '' }, { cipher_version: '   ' }])(
    'missing or empty SQLCipher version closes once and fails capability attestation: %p',
    async (versionResult) => {
      await seedStoredKey();
      const db = makeDatabase();
      db.getFirstAsync.mockResolvedValueOnce(versionResult);
      (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValueOnce(db);

      await expect(openPhoneStateDatabase(SCOPE))
        .rejects.toThrow('phone_state_sqlcipher_unavailable');
      expect(db.closeAsync).toHaveBeenCalledTimes(1);
      expect(db.getAllAsync).not.toHaveBeenCalled();
      expect(db.execAsync).toHaveBeenCalledTimes(1);
    },
  );

  test('an integrity error row closes once and throws the stable integrity error', async () => {
    await seedStoredKey();
    const db = makeDatabase();
    db.getAllAsync.mockResolvedValueOnce([
      { cipher_integrity_check: 'HMAC verification failed for page 1' },
    ]);
    (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValueOnce(db);

    await expect(openPhoneStateDatabase(SCOPE))
      .rejects.toThrow('phone_state_cipher_integrity_failed');
    expect(db.closeAsync).toHaveBeenCalledTimes(1);
  });

  test.each(['key', 'cipher version query', 'integrity query', 'configuration'] as const)(
    '%s failure closes once and rethrows the original error',
    async (failurePoint) => {
      await seedStoredKey();
      const original = new Error(`${failurePoint} failed`);
      const db = makeDatabase();
      if (failurePoint === 'key') {
        db.execAsync.mockRejectedValueOnce(original);
      } else if (failurePoint === 'cipher version query') {
        db.getFirstAsync.mockRejectedValueOnce(original);
      } else if (failurePoint === 'integrity query') {
        db.getAllAsync.mockRejectedValueOnce(original);
      } else {
        db.execAsync.mockResolvedValueOnce(undefined).mockRejectedValueOnce(original);
      }
      (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValueOnce(db);

      await expect(openPhoneStateDatabase(SCOPE)).rejects.toBe(original);
      expect(db.closeAsync).toHaveBeenCalledTimes(1);
    },
  );

  test('a close failure never masks the original database error', async () => {
    await seedStoredKey();
    const original = new Error('configuration failed');
    const db = makeDatabase();
    db.execAsync.mockResolvedValueOnce(undefined).mockRejectedValueOnce(original);
    db.closeAsync.mockRejectedValueOnce(new Error('close failed'));
    (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValueOnce(db);

    await expect(openPhoneStateDatabase(SCOPE)).rejects.toBe(original);
    expect(db.closeAsync).toHaveBeenCalledTimes(1);
  });
});

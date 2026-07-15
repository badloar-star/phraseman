/**
 * Часть 1: friend_code.ts — утилиты без Firestore.
 * Часть 2 (ниже): firestore_friends — интеграция с моками.
 *
 * ВАЖНО ДЛЯ СБОРОК / РЕЛИЗОВ (2026):
 * Личный код друга и поиск в проде работают с фактической логикой приложения; моки
 * в интеграционных тестах могут не совпадать (лишние записи в индексе, lookup null и т.д.).
 * Не «чините» firestore_friends.ts только чтобы пройти эти тесты — сначала ручная
 * проверка друзей в сборке.
 */
import {
  FRIEND_CODE_ALPHABET,
  FRIEND_CODE_LENGTH,
  generateRandomCode,
  isValidFriendCode,
  isValidInviteCodeLookup,
  normalizeInviteCodeInput,
} from '../app/friend_code';

// ── Plan 01 Task 1: Alphabet, length, generation, validation ──────────────────

test('FRIEND_CODE_ALPHABET is exactly the expected Crockford base32 string', () => {
  expect(FRIEND_CODE_ALPHABET).toBe('ABCDEFGHJKMNPQRSTUVWXYZ23456789');
  expect(FRIEND_CODE_ALPHABET.length).toBeGreaterThanOrEqual(30);
});

test('FRIEND_CODE_ALPHABET contains no forbidden char 0 (zero)', () => {
  expect(FRIEND_CODE_ALPHABET).not.toContain('0');
});

test('FRIEND_CODE_ALPHABET contains no forbidden char O (oh)', () => {
  expect(FRIEND_CODE_ALPHABET).not.toContain('O');
});

test('FRIEND_CODE_ALPHABET contains no forbidden char 1 (one)', () => {
  expect(FRIEND_CODE_ALPHABET).not.toContain('1');
});

test('FRIEND_CODE_ALPHABET contains no forbidden char I (eye)', () => {
  expect(FRIEND_CODE_ALPHABET).not.toContain('I');
});

test('FRIEND_CODE_ALPHABET contains no forbidden char L (el)', () => {
  expect(FRIEND_CODE_ALPHABET).not.toContain('L');
});

test('FRIEND_CODE_LENGTH equals 6', () => {
  expect(FRIEND_CODE_LENGTH).toBe(6);
});

test('generateRandomCode() returns a string of length 6', () => {
  const code = generateRandomCode();
  expect(typeof code).toBe('string');
  expect(code.length).toBe(6);
});

test('generateRandomCode() only uses chars from FRIEND_CODE_ALPHABET (1000 samples)', () => {
  const alphabetSet = new Set(FRIEND_CODE_ALPHABET.split(''));
  for (let i = 0; i < 1000; i++) {
    const code = generateRandomCode();
    for (const ch of code) {
      expect(alphabetSet.has(ch)).toBe(true);
    }
  }
});

test('isValidFriendCode returns true for a valid 6-char code', () => {
  expect(isValidFriendCode('ABC234')).toBe(true);
});

test('isValidFriendCode returns false for length 5', () => {
  expect(isValidFriendCode('ABC23')).toBe(false);
});

test('isValidFriendCode returns false for length 7', () => {
  expect(isValidFriendCode('ABC2340')).toBe(false);
});

test('isValidFriendCode returns false for code containing forbidden O', () => {
  expect(isValidFriendCode('ABC23O')).toBe(false);
});

test('isValidFriendCode returns false for code containing forbidden 0 (zero)', () => {
  expect(isValidFriendCode('ABC230')).toBe(false);
});

test('isValidFriendCode returns false for code containing forbidden L', () => {
  expect(isValidFriendCode('ABC23L')).toBe(false);
});

test('isValidFriendCode returns false for lowercase input', () => {
  expect(isValidFriendCode('abc234')).toBe(false);
});

test('isValidFriendCode returns false for empty string', () => {
  expect(isValidFriendCode('')).toBe(false);
});

test('isValidFriendCode returns false for null (defensive)', () => {
  expect(isValidFriendCode(null as unknown as string)).toBe(false);
});

test('isValidInviteCodeLookup accepts friend-only code without L', () => {
  expect(isValidInviteCodeLookup('ABC234')).toBe(true);
});

test('isValidInviteCodeLookup accepts referral code containing L', () => {
  expect(isValidInviteCodeLookup('ABCL23')).toBe(true);
});

test('normalizeInviteCodeInput preserves L for referral/invite lookup', () => {
  expect(normalizeInviteCodeInput('abcl23')).toBe('ABCL23');
});

test('normalizeInviteCodeInput strips ambiguous chars and separators', () => {
  expect(normalizeInviteCodeInput(' a-b i o 0 1 l 2 3 ')).toBe('ABL23');
});

test('isValidInviteCodeLookup rejects invalid', () => {
  expect(isValidInviteCodeLookup('invalid')).toBe(false);
});

// ── Plan 01 Task 2: firestore_friends.ts integration tests ────────────────────
// См. общий блок «ВАЖНО ДЛЯ СБОРОК» в начале файла — красные тесты здесь ≠ баг в проде.

// Shared in-memory Firestore mock state — reset before each test.
let mockDocs: Map<string, Record<string, unknown>>;
let mockBannedUids: Set<string>;
let canonicalUidOverride: string | null = 'test-uid-abc';
let transactionCollisionCodes: Set<string>;
let mockReadFailurePaths: Set<string>;
let mockFriendEnsureMyCode: jest.Mock;

const buildFakeRef = (collection: string, docId: string) => ({
  collection,
  docId,
  _path: `${collection}/${docId}`,
});

function readFieldPath(data: Record<string, unknown>, fieldPath: string): unknown {
  return fieldPath.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && !Array.isArray(acc)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, data);
}

const buildFakeDb = () => ({
  collection: (col: string) => ({
    doc: (docId: string) => {
      const ref = buildFakeRef(col, docId);
      return {
        ...ref,
        get: async () => {
          const key = `${col}/${docId}`;
          if (mockReadFailurePaths.has(key)) throw new Error(`read unavailable: ${key}`);
          const data = mockDocs.get(key);
          return {
            exists: data !== undefined,
            data: () => data,
          };
        },
      };
    },
    where: (fieldPath: string, op: string, expected: unknown) => ({
      limit: (n: number) => ({
        get: async () => {
          const docs: Array<{ id: string; data: () => Record<string, unknown> }> = [];
          if (op !== '==') return { docs };
          for (const [key, data] of mockDocs.entries()) {
            if (!key.startsWith(`${col}/`)) continue;
            const docId = key.slice(col.length + 1);
            if (docId.includes('/')) continue;
            if (readFieldPath(data, fieldPath) === expected) {
              docs.push({ id: docId, data: () => data });
              if (docs.length >= n) break;
            }
          }
          return { docs };
        },
      }),
    }),
  }),
  runTransaction: async (fn: (tx: unknown) => Promise<void>) => {
    const ops: Array<() => void> = [];
    const tx = {
      get: async (ref: ReturnType<typeof buildFakeRef>) => {
        const key = ref._path;
        // Check collision codes first (simulate CODE_TAKEN scenario).
        if (transactionCollisionCodes.has(ref.docId)) {
          return { exists: true, data: () => ({ uid: 'other-uid' }) };
        }
        const data = mockDocs.get(key);
        return { exists: data !== undefined, data: () => data };
      },
      set: (ref: ReturnType<typeof buildFakeRef>, data: Record<string, unknown>, opts?: { merge?: boolean }) => {
        const key = ref._path;
        ops.push(() => {
          if (opts?.merge) {
            const existing = mockDocs.get(key) ?? {};
            mockDocs.set(key, deepMerge(existing, data));
          } else {
            mockDocs.set(key, data);
          }
        });
      },
    };
    await fn(tx);
    ops.forEach(op => op());
  },
});

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv !== null && typeof sv === 'object' && !Array.isArray(sv) &&
      tv !== null && typeof tv === 'object' && !Array.isArray(tv)
    ) {
      result[key] = deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
    } else {
      result[key] = sv;
    }
  }
  return result;
}

jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => canonicalUidOverride),
}));
jest.mock('@react-native-firebase/firestore', () => ({
  default: jest.fn(() => buildFakeDb()),
}));
jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({})),
}));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn((_functions, name: string) => {
    if (name === 'friendEnsureMyCode') return mockFriendEnsureMyCode;
    return jest.fn(async () => ({ data: {} }));
  }),
}));
jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: jest.fn(async () => undefined),
}));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: jest.fn(async () => canonicalUidOverride),
}));

beforeEach(() => {
  jest.resetModules();
  mockDocs = new Map();
  mockBannedUids = new Set();
  transactionCollisionCodes = new Set();
  mockReadFailurePaths = new Set();
  canonicalUidOverride = 'test-uid-abc';
  require('@react-native-async-storage/async-storage').__reset?.();

  mockFriendEnsureMyCode = jest.fn(async ({ stableId }: { stableId: string }) => {
    if (!stableId) return { data: { code: '' } };

    const userKey = `users/${stableId}`;
    const userDoc = mockDocs.get(userKey);
    const existing = (userDoc?.progress as Record<string, unknown> | undefined)?.friend_code;
    if (typeof existing === 'string' && isValidFriendCode(existing)) {
      mockDocs.set(`friend_code_index/${existing}`, { uid: stableId });
      return { data: { code: existing } };
    }

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = require('../app/friend_code').generateRandomCode();
      if (transactionCollisionCodes.has(code) || mockDocs.has(`friend_code_index/${code}`)) continue;
      mockDocs.set(`friend_code_index/${code}`, { uid: stableId });
      mockDocs.set(userKey, deepMerge(userDoc ?? {}, { progress: { friend_code: code } }));
      return { data: { code } };
    }

    return { data: { code: '' } };
  });

  // Re-apply mocks after resetModules.
  jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
  jest.mock('../app/user_id_policy', () => ({
    getCanonicalUserId: jest.fn(async () => canonicalUidOverride),
  }));
  jest.mock('@react-native-firebase/firestore', () => ({
    default: jest.fn(() => buildFakeDb()),
  }));
  jest.mock('@react-native-firebase/app', () => ({
    getApp: jest.fn(() => ({})),
  }));
  jest.mock('@react-native-firebase/functions', () => ({
    getFunctions: jest.fn(() => ({})),
    httpsCallable: jest.fn((_functions, name: string) => {
      if (name === 'friendEnsureMyCode') return mockFriendEnsureMyCode;
      return jest.fn(async () => ({ data: {} }));
    }),
  }));
  jest.mock('../app/app_check_init', () => ({
    initFirebaseAppCheckIfAvailable: jest.fn(async () => undefined),
  }));
  jest.mock('../app/cloud_sync', () => ({
    ensureAnonUser: jest.fn(async () => canonicalUidOverride),
  }));
});

test('Test H: FRIEND_CODE_INDEX_COLLECTION equals friend_code_index', async () => {
  const { FRIEND_CODE_INDEX_COLLECTION } = require('../app/firestore_friends');
  expect(FRIEND_CODE_INDEX_COLLECTION).toBe('friend_code_index');
});

test('Test A: ensureMyFriendCode returns existing code and backfills index when progress.friend_code exists', async () => {
  // Seed existing code for this user.
  mockDocs.set('users/test-uid-abc', { progress: { friend_code: 'ABCD23' } });
  const { ensureMyFriendCode } = require('../app/firestore_friends');
  const result = await ensureMyFriendCode();
  expect(result).toBe('ABCD23');
  // Existing user code is backfilled into the lookup index.
  const indexKeys = [...mockDocs.keys()].filter(k => k.startsWith('friend_code_index/'));
  expect(indexKeys).toEqual(['friend_code_index/ABCD23']);
});

test('Test B: ensureMyFriendCode generates and stores new 6-char code when none exists', async () => {
  const { ensureMyFriendCode, FRIEND_CODE_INDEX_COLLECTION } = require('../app/firestore_friends');
  const code = await ensureMyFriendCode();
  expect(typeof code).toBe('string');
  expect(code!.length).toBe(6);
  // Code written to friend_code_index.
  const indexDoc = mockDocs.get(`${FRIEND_CODE_INDEX_COLLECTION}/${code}`);
  expect(indexDoc).toBeDefined();
  expect(indexDoc?.uid).toBe('test-uid-abc');
  // Code written to users/{uid}.progress.friend_code.
  const userDoc = mockDocs.get('users/test-uid-abc');
  expect((userDoc?.progress as Record<string, unknown>)?.friend_code).toBe(code);
});

test('Test C: ensureMyFriendCode retries on collision and succeeds with second code', async () => {
  // Pre-generate the first code that will be tried, mark it as taken.
  // We intercept generateRandomCode to return a known sequence.
  const { generateRandomCode: realGenerate } = require('../app/friend_code');
  let callCount = 0;
  jest.spyOn(require('../app/friend_code'), 'generateRandomCode').mockImplementation(() => {
    callCount++;
    const code = callCount === 1 ? 'TAKEN2' : realGenerate();
    return code;
  });
  transactionCollisionCodes.add('TAKEN2');

  const { ensureMyFriendCode } = require('../app/firestore_friends');
  const code = await ensureMyFriendCode();
  expect(code).not.toBeNull();
  expect(code).not.toBe('TAKEN2');
  expect(callCount).toBeGreaterThanOrEqual(2);
});

test('Test D: ensureMyFriendCode returns null when canonical UID is null', async () => {
  canonicalUidOverride = null;
  jest.mock('../app/user_id_policy', () => ({
    getCanonicalUserId: jest.fn(async () => null),
  }));
  const { ensureMyFriendCode } = require('../app/firestore_friends');
  const result = await ensureMyFriendCode();
  expect(result).toBeNull();
});

test('Test E: lookupUserByFriendCode returns uid when code exists in index', async () => {
  mockDocs.set('friend_code_index/ABCD23', { uid: 'target-uid-xyz' });
  mockDocs.set('users/target-uid-xyz', { name: 'Target' });
  const cloudSync = require('../app/cloud_sync');
  const { lookupUserByFriendCode } = require('../app/firestore_friends');
  const result = await lookupUserByFriendCode('ABCD23');
  expect(cloudSync.ensureAnonUser).toHaveBeenCalledTimes(1);
  expect(result).toEqual({ uid: 'target-uid-xyz', source: 'friend_code_index' });
});

test('Test E0: lookupUserByFriendCode returns null when auth cannot be prepared', async () => {
  canonicalUidOverride = null;
  mockDocs.set('friend_code_index/ABCD23', { uid: 'target-uid-xyz' });
  const cloudSync = require('../app/cloud_sync');
  const { lookupUserByFriendCode } = require('../app/firestore_friends');
  const result = await lookupUserByFriendCode('ABCD23');
  expect(result).toBeNull();
  expect(cloudSync.ensureAnonUser).toHaveBeenCalledTimes(1);
});

test('Test F: lookupUserByFriendCode returns null when target user is banned', async () => {
  mockDocs.set('friend_code_index/ABCD23', { uid: 'banned-uid-999' });
  mockDocs.set('users/banned-uid-999', { name: 'Banned' });
  mockDocs.set('banned_users/banned-uid-999', { reason: 'spam' });
  const { lookupUserByFriendCode } = require('../app/firestore_friends');
  const result = await lookupUserByFriendCode('ABCD23');
  expect(result).toBeNull();
});

test('Test E2: lookupUserByFriendCode resolves a REFERRAL code to its owner when friend index misses', async () => {
  // Пользователю на виду реферальный код (карточка «Твой код для друзей», share-ссылка).
  // Поиск обязан принять и его: referral_codes/{code} → ownerStableId → тот же users/{uid}.
  mockDocs.set('referral_codes/XYZL2A', { ownerStableId: 'ref-owner-stable' });
  mockDocs.set('users/ref-owner-stable', { name: 'Referral Owner' });
  const { lookupUserByFriendCode } = require('../app/firestore_friends');
  const result = await lookupUserByFriendCode('XYZL2A');
  expect(result).toEqual({ uid: 'ref-owner-stable', source: 'referral_code' });
});

test('Test E2b: lookupUserByFriendCode reports unavailable when referral lookup cannot confirm a miss', async () => {
  mockReadFailurePaths.add('referral_codes/ABC234');
  const { lookupUserByFriendCode } = require('../app/firestore_friends');

  await expect(lookupUserByFriendCode('ABC234')).rejects.toThrow('friend_lookup_unavailable');
});

test('Test E3: lookupUserByFriendCode falls back to users progress.friend_code when index was not backfilled', async () => {
  mockDocs.set('users/legacy-code-owner', { progress: { friend_code: 'LEG234' } });
  const { lookupUserByFriendCode } = require('../app/firestore_friends');
  const result = await lookupUserByFriendCode('LEG234');
  expect(result).toEqual({ uid: 'legacy-code-owner', source: 'legacy_friend_code' });
});

test('Test F2: lookupUserByFriendCode does not return a BANNED referral owner', async () => {
  // Реферальный код резолвится, но владелец забанен → тихо «не найден» (как для friend-кода).
  mockDocs.set('referral_codes/BANREF', { ownerStableId: 'banned-ref' });
  mockDocs.set('users/banned-ref', { name: 'Banned Referral' });
  mockDocs.set('banned_users/banned-ref', { reason: 'x' });
  const { lookupUserByFriendCode } = require('../app/firestore_friends');
  const result = await lookupUserByFriendCode('BANREF');
  expect(result).toBeNull();
});

test('Test G: lookupUserByFriendCode returns null for invalid code without Firestore call', async () => {
  const { lookupUserByFriendCode } = require('../app/firestore_friends');
  const result = await lookupUserByFriendCode('invalid');
  expect(result).toBeNull();
  // No Firestore docs touched.
  expect(mockDocs.size).toBe(0);
});

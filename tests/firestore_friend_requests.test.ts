/**
 * Tests for firestore_friend_requests.ts — friend request lifecycle.
 * Uses same mock pattern as tests/friend_code.test.ts.
 *
 * ВАЖНО ДЛЯ СБОРОК / РЕЛИЗОВ (2026):
 * В проде друзья и заявки сейчас работают через актуальный клиент и облако; поведение
 * может расходиться с этими мок‑тестами. Не чините «ради зелёного Jest», не проверив
 * реальные сценарии в приложении — иначе легко сломать то, что уже заведено у пользователей.
 */

import type {
  SendRequestResult,
  FriendEntry,
  FriendRequestEntry,
} from '../app/firestore_friend_requests';

// ── In-memory Firestore state ──────────────────────────────────────────────
let mockDocs: Map<string, Record<string, unknown>>;
let canonicalUidOverride: string | null = 'my-uid-111';
let authUidOverride: string | null = 'auth-uid-999';
let stableAuthLinkCalls: number;
let stableAuthLinkResult: boolean;
let stableAuthLinkImplementation: () => Promise<boolean>;
let stableAuthLinkForStableIdCalls: number;
let stableAuthLinkForStableIdImplementation: (stableId: string) => Promise<boolean>;
type DetailedAuthLinkResult = {
  ok: boolean;
  requestedStableId: string;
  stableUid: string | null;
  authUid: string | null;
  source: 'callable' | 'cache' | 'unavailable';
  failure?: 'stable_id_mismatch' | 'unavailable';
};
let stableAuthLinkDetailedCalls: number;
let stableAuthLinkDetailedImplementation: (stableId: string) => Promise<DetailedAuthLinkResult>;
let liveSnapshotListenerCalls: number;
let liveSnapshotListenerPaths: string[];
let firestoreDbAvailable: boolean;

// Simulate a batch that collects operations and commits them atomically.
const createFakeBatch = () => {
  const ops: Array<() => void> = [];
  return {
    set: (ref: FakeRef, data: Record<string, unknown>) => {
      ops.push(() => { mockDocs.set(ref._path, data); });
    },
    delete: (ref: FakeRef) => {
      ops.push(() => { mockDocs.delete(ref._path); });
    },
    commit: async () => {
      ops.forEach(op => op());
    },
  };
};

interface FakeRef {
  _path: string;
  collection: (col: string) => FakeCollectionRef;
  update: (data: Record<string, unknown>) => Promise<void>;
  delete: () => Promise<void>;
  set: (data: Record<string, unknown>) => Promise<void>;
  get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
}

interface FakeCollectionRef {
  doc: (id: string) => FakeRef;
  where: (field: string, op: string, val: unknown) => FakeQueryRef;
  limit: (count: number) => FakeQueryRef;
  startAfter: (cursor: { id: string } | string) => FakeQueryRef;
  get: () => Promise<FakeSnapshot>;
  onSnapshot: (cb: (snap: FakeSnapshot) => void, errCb?: (e: Error) => void) => () => void;
}

interface FakeQueryRef {
  where: (field: string, op: string, val: unknown) => FakeQueryRef;
  limit: (count: number) => FakeQueryRef;
  startAfter: (cursor: { id: string } | string) => FakeQueryRef;
  get: () => Promise<FakeSnapshot>;
  onSnapshot: (cb: (snap: FakeSnapshot) => void, errCb?: (e: Error) => void) => () => void;
}

interface FakeSnapshot {
  docs: Array<{ id: string; data: () => Record<string, unknown>; ref: FakeRef }>;
  metadata?: { fromCache: boolean };
  size: number;
}

const buildFakeRef = (path: string): FakeRef => ({
  _path: path,
  collection: (col: string) => buildFakeCollection(`${path}/${col}`),
  update: async (data: Record<string, unknown>) => {
    const existing = mockDocs.get(path) ?? {};
    mockDocs.set(path, { ...existing, ...data });
  },
  delete: async () => {
    mockDocs.delete(path);
  },
  set: async (data: Record<string, unknown>) => {
    mockDocs.set(path, data);
  },
  get: async () => {
    const d = mockDocs.get(path);
    return { exists: d !== undefined, data: () => d };
  },
});

type FakeFilter = { field: string; value: unknown };

const buildFakeQuery = (
  colPath: string,
  filters: FakeFilter[] = [],
  maxCount: number | null = null,
  afterId: string | null = null,
): FakeQueryRef => {
  const snapshot = (): FakeSnapshot => {
    const docs = Array.from(mockDocs.entries())
      .filter(([key, data]) => {
        if (!key.startsWith(colPath + '/')) return false;
        const docId = key.slice(colPath.length + 1);
        return !docId.includes('/')
          && (!afterId || docId > afterId)
          && filters.every(({ field, value }) => data[field] === value);
      })
      .map(([key, data]) => {
        const id = key.slice(colPath.length + 1);
        return { id, data: () => data, ref: buildFakeRef(key) };
      })
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, maxCount ?? undefined);
    return { docs, metadata: { fromCache: false }, size: docs.length };
  };

  return {
    where: (field: string, _op: string, value: unknown) =>
      buildFakeQuery(colPath, [...filters, { field, value }], maxCount, afterId),
    limit: (count: number) => buildFakeQuery(colPath, filters, count, afterId),
    startAfter: (cursor: { id: string } | string) =>
      buildFakeQuery(colPath, filters, maxCount, typeof cursor === 'string' ? cursor : cursor.id),
    get: async () => snapshot(),
    onSnapshot: (cb: (snap: FakeSnapshot) => void) => {
      liveSnapshotListenerCalls += 1;
      liveSnapshotListenerPaths.push(colPath);
      cb(snapshot());
      return () => {};
    },
  };
};

const buildFakeCollection = (colPath: string): FakeCollectionRef => ({
  doc: (id: string) => buildFakeRef(`${colPath}/${id}`),
  ...buildFakeQuery(colPath),
});

const buildFakeDb = () => ({
  collection: (col: string) => buildFakeCollection(col),
  batch: () => createFakeBatch(),
});

// ── Jest module mocks ──────────────────────────────────────────────────────

jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => canonicalUidOverride),
  getAuthUserId: jest.fn(() => authUidOverride),
}));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: jest.fn(async () => canonicalUidOverride),
  ensureStableAuthLink: jest.fn(() => {
    stableAuthLinkCalls += 1;
    return stableAuthLinkImplementation();
  }),
  ensureStableAuthLinkForStableId: jest.fn((stableId: string) => {
    stableAuthLinkForStableIdCalls += 1;
    return stableAuthLinkForStableIdImplementation(stableId);
  }),
  ensureStableAuthLinkForStableIdDetailed: jest.fn((stableId: string) => {
    stableAuthLinkDetailedCalls += 1;
    return stableAuthLinkDetailedImplementation(stableId);
  }),
}));
jest.mock('@react-native-firebase/firestore', () => ({
  default: jest.fn(() => firestoreDbAvailable ? buildFakeDb() : null),
}));

beforeEach(() => {
  jest.resetModules();
  mockDocs = new Map();
  canonicalUidOverride = 'my-uid-111';
  authUidOverride = 'auth-uid-999';
  stableAuthLinkCalls = 0;
  stableAuthLinkResult = true;
  stableAuthLinkImplementation = async () => stableAuthLinkResult;
  stableAuthLinkForStableIdCalls = 0;
  stableAuthLinkForStableIdImplementation = async () => stableAuthLinkResult;
  stableAuthLinkDetailedCalls = 0;
  stableAuthLinkDetailedImplementation = async (stableId: string) => {
    stableAuthLinkForStableIdCalls += 1;
    const authUidAtStart = authUidOverride;
    const ok = await stableAuthLinkForStableIdImplementation(stableId);
    return {
      ok,
      requestedStableId: stableId,
      stableUid: ok ? stableId : null,
      authUid: authUidAtStart,
      source: ok ? 'callable' : 'unavailable',
      ...(ok ? {} : { failure: 'unavailable' as const }),
    };
  };
  liveSnapshotListenerCalls = 0;
  liveSnapshotListenerPaths = [];
  firestoreDbAvailable = true;
  require('@react-native-async-storage/async-storage').__reset?.();

  jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
  jest.mock('../app/user_id_policy', () => ({
    getCanonicalUserId: jest.fn(async () => canonicalUidOverride),
    getAuthUserId: jest.fn(() => authUidOverride),
  }));
  jest.mock('../app/cloud_sync', () => ({
    ensureAnonUser: jest.fn(async () => canonicalUidOverride),
    ensureStableAuthLink: jest.fn(() => {
      stableAuthLinkCalls += 1;
      return stableAuthLinkImplementation();
    }),
    ensureStableAuthLinkForStableId: jest.fn((stableId: string) => {
      stableAuthLinkForStableIdCalls += 1;
      return stableAuthLinkForStableIdImplementation(stableId);
    }),
    ensureStableAuthLinkForStableIdDetailed: jest.fn((stableId: string) => {
      stableAuthLinkDetailedCalls += 1;
      return stableAuthLinkDetailedImplementation(stableId);
    }),
  }));
  jest.mock('@react-native-firebase/firestore', () => ({
    default: jest.fn(() => firestoreDbAvailable ? buildFakeDb() : null),
  }));
  const generation = require('../app/account_generation');
  generation.__resetAccountGenerationForTests();
  generation.beginAccountGeneration('my-uid-111');
});

// ── sendFriendRequest tests ────────────────────────────────────────────────

test('R01: sendFriendRequest when toUid == myUid returns self without Firestore write', async () => {
  const { sendFriendRequest } = require('../app/firestore_friend_requests');
  const result: SendRequestResult = await sendFriendRequest('my-uid-111');
  expect(result).toBe('self');
  expect(mockDocs.size).toBe(0);
});

test('R02: sendFriendRequest treats one-sided friendship as stale and resends request', async () => {
  mockDocs.set('users/my-uid-111/friends/target-uid-222', { createdAt: 1000 });
  const { sendFriendRequest } = require('../app/firestore_friend_requests');
  const result: SendRequestResult = await sendFriendRequest('target-uid-222');
  expect(result).toBe('sent');
  expect(mockDocs.has('users/my-uid-111/friends/target-uid-222')).toBe(false);
  expect(mockDocs.has('users/target-uid-222/friend_requests/my-uid-111')).toBe(true);
});

test('R03: sendFriendRequest when pending request exists returns already_sent', async () => {
  mockDocs.set('users/target-uid-222/friend_requests/my-uid-111', { status: 'pending', createdAt: 1000 });
  const { sendFriendRequest } = require('../app/firestore_friend_requests');
  const result: SendRequestResult = await sendFriendRequest('target-uid-222');
  expect(result).toBe('already_sent');
});

test('R04: sendFriendRequest happy path creates pending request and returns sent', async () => {
  const { sendFriendRequest } = require('../app/firestore_friend_requests');
  const result: SendRequestResult = await sendFriendRequest('target-uid-222');
  expect(result).toBe('sent');
  const doc = mockDocs.get('users/target-uid-222/friend_requests/my-uid-111');
  expect(doc).toBeDefined();
  expect(doc?.status).toBe('pending');
  expect(typeof doc?.createdAt).toBe('number');
});

test('R04c: sendFriendRequest includes the sender display name for the recipient request row', async () => {
  const storage = require('@react-native-async-storage/async-storage').default;
  await storage.setItem('user_name', '  Roma   Prime  ');
  const { sendFriendRequest } = require('../app/firestore_friend_requests');
  const result: SendRequestResult = await sendFriendRequest('target-uid-222');

  expect(result).toBe('sent');
  const doc = mockDocs.get('users/target-uid-222/friend_requests/my-uid-111');
  expect(doc?.fromName).toBe('Roma Prime');
});

test('R04b: sendFriendRequest resolves stable auth through the scoped callable, not a direct user write', async () => {
  const { sendFriendRequest } = require('../app/firestore_friend_requests');
  const result: SendRequestResult = await sendFriendRequest('target-uid-222');

  expect(result).toBe('sent');
  expect(stableAuthLinkCalls).toBe(0);
  expect(stableAuthLinkDetailedCalls).toBe(1);
  expect(mockDocs.has('users/my-uid-111')).toBe(false);
});

test('R04d: sendFriendRequest writes from the server-canonical stable uid after an account merge', async () => {
  stableAuthLinkDetailedImplementation = async stableId => ({
    ok: true,
    requestedStableId: stableId,
    stableUid: 'server-canonical-uid',
    authUid: authUidOverride,
    source: 'callable',
  });
  const { sendFriendRequest } = require('../app/firestore_friend_requests');

  await expect(sendFriendRequest('target-uid-222')).resolves.toBe('sent');
  expect(mockDocs.has('users/target-uid-222/friend_requests/server-canonical-uid')).toBe(true);
  expect(mockDocs.has('users/target-uid-222/friend_requests/my-uid-111')).toBe(false);
});

test('R05: sendFriendRequest returns error when getCanonicalUserId returns null', async () => {
  canonicalUidOverride = null;
  jest.mock('../app/user_id_policy', () => ({
    getCanonicalUserId: jest.fn(async () => null),
  }));
  const { sendFriendRequest } = require('../app/firestore_friend_requests');
  const result: SendRequestResult = await sendFriendRequest('target-uid-222');
  expect(result).toBe('error');
  expect(mockDocs.size).toBe(0);
});

// ── acceptFriendRequest tests ──────────────────────────────────────────────

test('A01: acceptFriendRequest deletes friend_request after atomic friend creation', async () => {
  mockDocs.set('users/my-uid-111/friend_requests/from-uid-333', { status: 'pending', createdAt: 500 });
  const { acceptFriendRequest } = require('../app/firestore_friend_requests');
  await acceptFriendRequest('from-uid-333');
  const reqDoc = mockDocs.get('users/my-uid-111/friend_requests/from-uid-333');
  expect(reqDoc).toBeUndefined();
});

test('A02: acceptFriendRequest creates users/myUid/friends/fromUid entry', async () => {
  mockDocs.set('users/my-uid-111/friend_requests/from-uid-333', { status: 'pending', createdAt: 500 });
  const { acceptFriendRequest } = require('../app/firestore_friend_requests');
  await acceptFriendRequest('from-uid-333');
  const friendDoc = mockDocs.get('users/my-uid-111/friends/from-uid-333');
  expect(friendDoc).toBeDefined();
  expect(typeof friendDoc?.createdAt).toBe('number');
});

test('A03: acceptFriendRequest creates reverse users/fromUid/friends/myUid entry', async () => {
  mockDocs.set('users/my-uid-111/friend_requests/from-uid-333', { status: 'pending', createdAt: 500 });
  const { acceptFriendRequest } = require('../app/firestore_friend_requests');
  await acceptFriendRequest('from-uid-333');
  const reverseDoc = mockDocs.get('users/from-uid-333/friends/my-uid-111');
  expect(reverseDoc).toBeDefined();
  expect(typeof reverseDoc?.createdAt).toBe('number');
});

test('A04: acceptFriendRequest resolves stable auth through the scoped callable before batch writes', async () => {
  mockDocs.set('users/my-uid-111/friend_requests/from-uid-333', { status: 'pending', createdAt: 500 });
  const { acceptFriendRequest } = require('../app/firestore_friend_requests');
  await acceptFriendRequest('from-uid-333');

  expect(stableAuthLinkCalls).toBe(0);
  expect(stableAuthLinkDetailedCalls).toBe(1);
  expect(mockDocs.has('users/my-uid-111')).toBe(false);
});

test('A05: acceptFriendRequest mutates the server-canonical account after an account merge', async () => {
  stableAuthLinkDetailedImplementation = async stableId => ({
    ok: true,
    requestedStableId: stableId,
    stableUid: 'server-canonical-uid',
    authUid: authUidOverride,
    source: 'callable',
  });
  mockDocs.set('users/server-canonical-uid/friend_requests/from-uid-333', { status: 'pending', createdAt: 500 });
  const { acceptFriendRequest } = require('../app/firestore_friend_requests');

  await acceptFriendRequest('from-uid-333');
  expect(mockDocs.has('users/server-canonical-uid/friends/from-uid-333')).toBe(true);
  expect(mockDocs.has('users/from-uid-333/friends/server-canonical-uid')).toBe(true);
  expect(mockDocs.has('users/server-canonical-uid/friend_requests/from-uid-333')).toBe(false);
});

// ── declineFriendRequest tests ─────────────────────────────────────────────

test('D01: declineFriendRequest DELETES users/myUid/friend_requests/fromUid doc', async () => {
  mockDocs.set('users/my-uid-111/friend_requests/from-uid-333', { status: 'pending', createdAt: 500 });
  const { declineFriendRequest } = require('../app/firestore_friend_requests');
  await declineFriendRequest('from-uid-333');
  expect(mockDocs.has('users/my-uid-111/friend_requests/from-uid-333')).toBe(false);
});

test('D02: declineFriendRequest deletes from the server-canonical account after an account merge', async () => {
  stableAuthLinkDetailedImplementation = async stableId => ({
    ok: true,
    requestedStableId: stableId,
    stableUid: 'server-canonical-uid',
    authUid: authUidOverride,
    source: 'callable',
  });
  mockDocs.set('users/server-canonical-uid/friend_requests/from-uid-333', { status: 'pending', createdAt: 500 });
  const { declineFriendRequest } = require('../app/firestore_friend_requests');

  await declineFriendRequest('from-uid-333');
  expect(mockDocs.has('users/server-canonical-uid/friend_requests/from-uid-333')).toBe(false);
});

// ── deleteFriend tests ─────────────────────────────────────────────────────

test('X01: deleteFriend deletes users/myUid/friends/friendUid', async () => {
  mockDocs.set('users/my-uid-111/friends/friend-uid-444', { createdAt: 700 });
  mockDocs.set('users/friend-uid-444/friends/my-uid-111', { createdAt: 700 });
  const { deleteFriend } = require('../app/firestore_friend_requests');
  await deleteFriend('friend-uid-444');
  expect(mockDocs.has('users/my-uid-111/friends/friend-uid-444')).toBe(false);
});

test('X02: deleteFriend also deletes reverse users/friendUid/friends/myUid', async () => {
  mockDocs.set('users/my-uid-111/friends/friend-uid-444', { createdAt: 700 });
  mockDocs.set('users/friend-uid-444/friends/my-uid-111', { createdAt: 700 });
  const { deleteFriend } = require('../app/firestore_friend_requests');
  await deleteFriend('friend-uid-444');
  expect(mockDocs.has('users/friend-uid-444/friends/my-uid-111')).toBe(false);
});

test('X03: deleteFriend removes both edges for the server-canonical account after a merge', async () => {
  stableAuthLinkDetailedImplementation = async stableId => ({
    ok: true,
    requestedStableId: stableId,
    stableUid: 'server-canonical-uid',
    authUid: authUidOverride,
    source: 'callable',
  });
  mockDocs.set('users/server-canonical-uid/friends/friend-uid-444', { createdAt: 700 });
  mockDocs.set('users/friend-uid-444/friends/server-canonical-uid', { createdAt: 700 });
  const { deleteFriend } = require('../app/firestore_friend_requests');

  await deleteFriend('friend-uid-444');
  expect(mockDocs.has('users/server-canonical-uid/friends/friend-uid-444')).toBe(false);
  expect(mockDocs.has('users/friend-uid-444/friends/server-canonical-uid')).toBe(false);
});

test('V01: ensureFriendRequestViewerAuthLink uses the stable auth callable helper', async () => {
  const { ensureFriendRequestViewerAuthLink } = require('../app/firestore_friend_requests');
  await expect(ensureFriendRequestViewerAuthLink('my-uid-111')).resolves.toBe(true);

  expect(stableAuthLinkCalls).toBe(0);
  expect(stableAuthLinkForStableIdCalls).toBe(1);
  expect(mockDocs.has('users/my-uid-111')).toBe(false);
});

test('V02: concurrent viewer auth-link preparation shares one in-flight request', async () => {
  let finish!: (value: boolean) => void;
  stableAuthLinkForStableIdImplementation = () => new Promise(resolve => { finish = resolve; });
  const { ensureFriendRequestViewerAuthLink } = require('../app/firestore_friend_requests');

  const first = ensureFriendRequestViewerAuthLink('my-uid-111');
  const second = ensureFriendRequestViewerAuthLink('my-uid-111');
  await Promise.resolve();

  expect(stableAuthLinkForStableIdCalls).toBe(1);
  finish(true);
  await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
});

test('V02a: a successful viewer auth-link preflight is reused within a bounded TTL', async () => {
  const now = jest.spyOn(Date, 'now').mockReturnValue(10_000);
  const {
    ensureFriendRequestViewerAuthLink,
    FRIEND_REQUEST_VIEWER_AUTH_LINK_SUCCESS_TTL_MS,
  } = require('../app/firestore_friend_requests');

  await expect(ensureFriendRequestViewerAuthLink('my-uid-111')).resolves.toBe(true);
  now.mockReturnValue(10_000 + FRIEND_REQUEST_VIEWER_AUTH_LINK_SUCCESS_TTL_MS - 1);
  await expect(ensureFriendRequestViewerAuthLink('my-uid-111')).resolves.toBe(true);
  expect(stableAuthLinkForStableIdCalls).toBe(1);

  now.mockReturnValue(10_000 + FRIEND_REQUEST_VIEWER_AUTH_LINK_SUCCESS_TTL_MS + 1);
  await expect(ensureFriendRequestViewerAuthLink('my-uid-111')).resolves.toBe(true);
  expect(stableAuthLinkForStableIdCalls).toBe(2);
  now.mockRestore();
});

test('V02b: viewer auth-link preparation never shares a result across accounts', async () => {
  const finishByStableId = new Map<string, (value: boolean) => void>();
  let implementationCalls = 0;
  stableAuthLinkForStableIdImplementation = stableId => {
    implementationCalls += 1;
    if (implementationCalls > 2) return Promise.resolve(true);
    return new Promise(resolve => { finishByStableId.set(stableId, resolve); });
  };
  const { ensureFriendRequestViewerAuthLink } = require('../app/firestore_friend_requests');

  const oldAccount = ensureFriendRequestViewerAuthLink('old-stable-id');
  const newAccount = ensureFriendRequestViewerAuthLink('new-stable-id');
  await Promise.resolve();
  await Promise.resolve();

  expect(stableAuthLinkForStableIdCalls).toBe(2);
  finishByStableId.get('new-stable-id')?.(true);
  await expect(newAccount).resolves.toBe(true);
  finishByStableId.get('old-stable-id')?.(true);
  await expect(oldAccount).resolves.toBe(true);

  await expect(ensureFriendRequestViewerAuthLink('new-stable-id')).resolves.toBe(true);
  expect(stableAuthLinkForStableIdCalls).toBe(2);
});

test('V02c: a late success is cached only for the auth UID that started it', async () => {
  let finish!: (value: boolean) => void;
  stableAuthLinkForStableIdImplementation = () => new Promise(resolve => { finish = resolve; });
  const { ensureFriendRequestViewerAuthLink } = require('../app/firestore_friend_requests');

  const oldAuthAttempt = ensureFriendRequestViewerAuthLink('my-uid-111');
  await Promise.resolve();
  await Promise.resolve();
  authUidOverride = 'auth-uid-new';
  finish(true);
  await expect(oldAuthAttempt).resolves.toBe(false);

  stableAuthLinkForStableIdImplementation = async () => true;
  await expect(ensureFriendRequestViewerAuthLink('my-uid-111')).resolves.toBe(true);
  expect(stableAuthLinkForStableIdCalls).toBe(2);
});

test('V03: viewer auth-link preparation returns false when linking fails', async () => {
  stableAuthLinkResult = false;
  const { ensureFriendRequestViewerAuthLink } = require('../app/firestore_friend_requests');

  await expect(ensureFriendRequestViewerAuthLink('my-uid-111')).resolves.toBe(false);
});

test('V04: viewer auth-link preparation has one bounded total wait', async () => {
  jest.useFakeTimers();
  stableAuthLinkForStableIdImplementation = () => new Promise(() => {});
  const {
    ensureFriendRequestViewerAuthLink,
    FRIEND_REQUEST_VIEWER_AUTH_LINK_TIMEOUT_MS,
  } = require('../app/firestore_friend_requests');

  const result = Promise.race([
    ensureFriendRequestViewerAuthLink('my-uid-111'),
    new Promise(resolve => setTimeout(() => resolve('test_timeout'), 15_001)),
  ]);
  await jest.advanceTimersByTimeAsync(15_001);

  expect(FRIEND_REQUEST_VIEWER_AUTH_LINK_TIMEOUT_MS).toBe(15_000);
  await expect(result).resolves.toBe(false);
  jest.useRealTimers();
});

// ── subscriptions tests ────────────────────────────────────────────────────

test('S00: exported live subscriptions do not open Firestore listeners until auth linking succeeds', async () => {
  let finish!: (value: boolean) => void;
  stableAuthLinkForStableIdImplementation = () => new Promise(resolve => { finish = resolve; });
  const {
    subscribeToFriends,
    subscribeToIncomingRequests,
  } = require('../app/firestore_friend_requests');

  const unsubFriends = subscribeToFriends(() => {});
  const unsubRequests = subscribeToIncomingRequests(() => {});
  for (let i = 0; i < 6; i += 1) await Promise.resolve();

  expect(stableAuthLinkForStableIdCalls).toBe(1);
  expect(liveSnapshotListenerCalls).toBe(0);
  finish(false);
  for (let i = 0; i < 6; i += 1) await Promise.resolve();
  expect(liveSnapshotListenerCalls).toBe(0);
  unsubFriends();
  unsubRequests();
});

test('S00b: successful preflight lets both subscriptions reuse the success cache', async () => {
  const {
    ensureFriendRequestViewerAuthLink,
    subscribeToFriends,
    subscribeToIncomingRequests,
  } = require('../app/firestore_friend_requests');

  await expect(ensureFriendRequestViewerAuthLink('my-uid-111')).resolves.toBe(true);
  const unsubFriends = subscribeToFriends(() => {});
  const unsubRequests = subscribeToIncomingRequests(() => {});
  for (let i = 0; i < 8; i += 1) await Promise.resolve();

  expect(stableAuthLinkForStableIdCalls).toBe(1);
  expect(liveSnapshotListenerCalls).toBe(2);
  unsubFriends();
  unsubRequests();
});

test('S00c: a server-canonical stable uid opens the listener on the canonical document', async () => {
  stableAuthLinkDetailedImplementation = async stableId => ({
    ok: true,
    requestedStableId: stableId,
    stableUid: 'another-stable-uid',
    authUid: authUidOverride,
    source: 'callable',
  });
  const { beginAccountGeneration } = require('../app/account_generation');
  beginAccountGeneration('my-uid-111');
  const { subscribeToFriends } = require('../app/firestore_friend_requests');

  const unsubscribe = subscribeToFriends(() => {});
  // Detailed preflight has an async callable + bounded wrapper + account check.
  // Drain the whole chain so this assertion does not race the listener open.
  for (let i = 0; i < 16; i += 1) await Promise.resolve();

  expect(stableAuthLinkDetailedCalls).toBe(1);
  expect(liveSnapshotListenerCalls).toBe(1);
  expect(liveSnapshotListenerPaths).toEqual(['users/another-stable-uid/friends']);
  unsubscribe();
});

test('S00c2: a detailed preflight for another requested account never opens a listener', async () => {
  stableAuthLinkDetailedImplementation = async () => ({
    ok: true,
    requestedStableId: 'another-requested-account',
    stableUid: 'another-stable-uid',
    authUid: authUidOverride,
    source: 'callable',
  });
  const { beginAccountGeneration } = require('../app/account_generation');
  beginAccountGeneration('my-uid-111');
  const { subscribeToFriends } = require('../app/firestore_friend_requests');

  const unsubscribe = subscribeToFriends(() => {});
  for (let i = 0; i < 16; i += 1) await Promise.resolve();

  expect(stableAuthLinkDetailedCalls).toBe(1);
  expect(liveSnapshotListenerCalls).toBe(0);
  unsubscribe();
});

test('S00d: auth switching while detailed preflight is pending prevents the old listener', async () => {
  let finish!: (value: DetailedAuthLinkResult) => void;
  stableAuthLinkDetailedImplementation = () => new Promise(resolve => { finish = resolve; });
  const { beginAccountGeneration } = require('../app/account_generation');
  beginAccountGeneration('my-uid-111');
  const { subscribeToFriends } = require('../app/firestore_friend_requests');

  const unsubscribe = subscribeToFriends(() => {});
  for (let i = 0; i < 4; i += 1) await Promise.resolve();
  authUidOverride = 'auth-uid-new';
  finish({
    ok: true,
    requestedStableId: 'my-uid-111',
    stableUid: 'my-uid-111',
    authUid: 'auth-uid-999',
    source: 'callable',
  });
  for (let i = 0; i < 16; i += 1) await Promise.resolve();

  expect(liveSnapshotListenerCalls).toBe(0);
  unsubscribe();
});

test('S00e: account generation switching while preflight is pending prevents the old listener', async () => {
  let finish!: (value: DetailedAuthLinkResult) => void;
  stableAuthLinkDetailedImplementation = () => new Promise(resolve => { finish = resolve; });
  const { beginAccountGeneration } = require('../app/account_generation');
  beginAccountGeneration('my-uid-111');
  const { subscribeToIncomingRequests } = require('../app/firestore_friend_requests');

  const unsubscribe = subscribeToIncomingRequests(() => {});
  for (let i = 0; i < 4; i += 1) await Promise.resolve();
  beginAccountGeneration('new-stable-uid');
  finish({
    ok: true,
    requestedStableId: 'my-uid-111',
    stableUid: 'my-uid-111',
    authUid: 'auth-uid-999',
    source: 'callable',
  });
  for (let i = 0; i < 16; i += 1) await Promise.resolve();

  expect(liveSnapshotListenerCalls).toBe(0);
  unsubscribe();
});

test('S00f: missing auth uid reports preflight failure without erasing cached incoming requests', async () => {
  canonicalUidOverride = null;
  const { subscribeToIncomingRequests } = require('../app/firestore_friend_requests');
  const onRequests = jest.fn();
  const onSetupState = jest.fn();

  const unsubscribe = subscribeToIncomingRequests(onRequests, undefined, onSetupState);
  for (let i = 0; i < 8; i += 1) await Promise.resolve();

  expect(onRequests).not.toHaveBeenCalled();
  expect(onSetupState).toHaveBeenCalledWith('preflight_failed');
  expect(liveSnapshotListenerCalls).toBe(0);
  unsubscribe();
});

test('S00g: unavailable Firestore reports preflight failure without erasing cached incoming requests', async () => {
  firestoreDbAvailable = false;
  const { subscribeToIncomingRequests } = require('../app/firestore_friend_requests');
  const onRequests = jest.fn();
  const onSetupState = jest.fn();

  const unsubscribe = subscribeToIncomingRequests(onRequests, undefined, onSetupState);
  for (let i = 0; i < 16; i += 1) await Promise.resolve();

  expect(onRequests).not.toHaveBeenCalled();
  expect(onSetupState).toHaveBeenCalledWith('preflight_failed');
  expect(liveSnapshotListenerCalls).toBe(0);
  unsubscribe();
});

test('S01: subscribeToFriends calls callback with FriendEntry array and returns unsubscribe fn', async () => {
  mockDocs.set('users/my-uid-111/friends/friend-uid-555', { createdAt: 800 });
  const { subscribeToFriends } = require('../app/firestore_friend_requests');
  let received: FriendEntry[] | null = null;
  // Allow async UID resolution.
  await new Promise<void>(resolve => {
    const unsub = subscribeToFriends((friends: FriendEntry[]) => {
      received = friends;
      resolve();
    });
    expect(typeof unsub).toBe('function');
  });
  expect(received).not.toBeNull();
  expect(Array.isArray(received)).toBe(true);
  const receivedFriends = received as unknown as FriendEntry[];
  const entry = receivedFriends.find(f => f.uid === 'friend-uid-555');
  expect(entry).toBeDefined();
  expect(entry?.createdAt).toBe(800);
});

test('S02: subscribeToIncomingRequests filters by status pending and returns unsubscribe fn', async () => {
  mockDocs.set('users/my-uid-111/friend_requests/req-uid-666', { status: 'pending', createdAt: 900, fromName: 'Roma Prime' });
  mockDocs.set('users/my-uid-111/friend_requests/req-uid-777', { status: 'accepted', createdAt: 901 });
  const { subscribeToIncomingRequests } = require('../app/firestore_friend_requests');
  let received: FriendRequestEntry[] | null = null;
  await new Promise<void>(resolve => {
    const unsub = subscribeToIncomingRequests((requests: FriendRequestEntry[]) => {
      received = requests;
      resolve();
    });
    expect(typeof unsub).toBe('function');
  });
  expect(received).not.toBeNull();
  // Should only include pending requests.
  const entries = received as unknown as FriendRequestEntry[];
  expect(entries.every(r => r.status === 'pending')).toBe(true);
  const pendingEntry = entries.find(r => r.fromUid === 'req-uid-666');
  expect(pendingEntry).toBeDefined();
  expect(pendingEntry?.createdAt).toBe(900);
  expect(pendingEntry?.fromName).toBe('Roma Prime');
  // Accepted request must NOT appear.
  expect(entries.find(r => r.fromUid === 'req-uid-777')).toBeUndefined();
});

test('C01: stale-friend cleanup rotates its bounded page beyond the first 20 friends', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-07-15T12:00:00.000Z'));
  try {
    for (let index = 1; index <= 21; index += 1) {
      const friendUid = `friend-${String(index).padStart(3, '0')}`;
      mockDocs.set(`users/my-uid-111/friends/${friendUid}`, { createdAt: index });
      if (index <= 20) {
        mockDocs.set(`users/${friendUid}/friends/my-uid-111`, { createdAt: index });
      }
    }
    const {
      cleanupStaleFriendData,
      FRIEND_CLEANUP_TTL_MS,
    } = require('../app/firestore_friend_requests');

    await cleanupStaleFriendData();
    expect(mockDocs.has('users/my-uid-111/friends/friend-021')).toBe(true);

    jest.advanceTimersByTime(FRIEND_CLEANUP_TTL_MS + 1);
    await cleanupStaleFriendData();

    expect(mockDocs.has('users/my-uid-111/friends/friend-021')).toBe(false);
  } finally {
    jest.useRealTimers();
  }
});

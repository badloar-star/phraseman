// Tests for firestore_friend_requests.ts — friend request lifecycle.
// Uses same mock pattern as tests/friend_code.test.ts.

import type {
  SendRequestResult,
  FriendEntry,
  FriendRequestEntry,
} from '../app/firestore_friend_requests';

// ── In-memory Firestore state ──────────────────────────────────────────────
let mockDocs: Map<string, Record<string, unknown>>;
let canonicalUidOverride: string | null = 'my-uid-111';

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
  onSnapshot: (cb: (snap: FakeSnapshot) => void, errCb?: (e: Error) => void) => () => void;
}

interface FakeQueryRef {
  onSnapshot: (cb: (snap: FakeSnapshot) => void, errCb?: (e: Error) => void) => () => void;
}

interface FakeSnapshot {
  docs: Array<{ id: string; data: () => Record<string, unknown> }>;
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

const buildFakeCollection = (colPath: string): FakeCollectionRef => ({
  doc: (id: string) => buildFakeRef(`${colPath}/${id}`),
  where: (field: string, _op: string, val: unknown) => ({
    onSnapshot: (cb: (snap: FakeSnapshot) => void) => {
      // Synchronously deliver matching docs.
      const docs: Array<{ id: string; data: () => Record<string, unknown> }> = [];
      for (const [key, data] of mockDocs.entries()) {
        if (key.startsWith(colPath + '/')) {
          const docId = key.slice(colPath.length + 1);
          if (!docId.includes('/') && data[field] === val) {
            docs.push({ id: docId, data: () => data });
          }
        }
      }
      cb({ docs });
      return () => {};
    },
  }),
  onSnapshot: (cb: (snap: FakeSnapshot) => void) => {
    const docs: Array<{ id: string; data: () => Record<string, unknown> }> = [];
    for (const [key, data] of mockDocs.entries()) {
      if (key.startsWith(colPath + '/')) {
        const docId = key.slice(colPath.length + 1);
        if (!docId.includes('/')) {
          docs.push({ id: docId, data: () => data });
        }
      }
    }
    cb({ docs });
    return () => {};
  },
});

const buildFakeDb = () => ({
  collection: (col: string) => buildFakeCollection(col),
  batch: () => createFakeBatch(),
});

// ── Jest module mocks ──────────────────────────────────────────────────────

jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => canonicalUidOverride),
}));
jest.mock('@react-native-firebase/firestore', () => ({
  default: jest.fn(() => buildFakeDb()),
}));

beforeEach(() => {
  jest.resetModules();
  mockDocs = new Map();
  canonicalUidOverride = 'my-uid-111';

  jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
  jest.mock('../app/user_id_policy', () => ({
    getCanonicalUserId: jest.fn(async () => canonicalUidOverride),
  }));
  jest.mock('@react-native-firebase/firestore', () => ({
    default: jest.fn(() => buildFakeDb()),
  }));
});

// ── sendFriendRequest tests ────────────────────────────────────────────────

test('R01: sendFriendRequest when toUid == myUid returns self without Firestore write', async () => {
  const { sendFriendRequest } = require('../app/firestore_friend_requests');
  const result: SendRequestResult = await sendFriendRequest('my-uid-111');
  expect(result).toBe('self');
  expect(mockDocs.size).toBe(0);
});

test('R02: sendFriendRequest when myUid/friends/toUid exists returns already_friends without write', async () => {
  mockDocs.set('users/my-uid-111/friends/target-uid-222', { createdAt: 1000 });
  const { sendFriendRequest } = require('../app/firestore_friend_requests');
  const result: SendRequestResult = await sendFriendRequest('target-uid-222');
  expect(result).toBe('already_friends');
  // No new request document written.
  expect(mockDocs.has('users/target-uid-222/friend_requests/my-uid-111')).toBe(false);
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

test('A01: acceptFriendRequest updates friend_request status to accepted', async () => {
  mockDocs.set('users/my-uid-111/friend_requests/from-uid-333', { status: 'pending', createdAt: 500 });
  const { acceptFriendRequest } = require('../app/firestore_friend_requests');
  await acceptFriendRequest('from-uid-333');
  const reqDoc = mockDocs.get('users/my-uid-111/friend_requests/from-uid-333');
  expect(reqDoc?.status).toBe('accepted');
  expect(typeof reqDoc?.updatedAt).toBe('number');
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

// ── declineFriendRequest tests ─────────────────────────────────────────────

test('D01: declineFriendRequest DELETES users/myUid/friend_requests/fromUid doc', async () => {
  mockDocs.set('users/my-uid-111/friend_requests/from-uid-333', { status: 'pending', createdAt: 500 });
  const { declineFriendRequest } = require('../app/firestore_friend_requests');
  await declineFriendRequest('from-uid-333');
  expect(mockDocs.has('users/my-uid-111/friend_requests/from-uid-333')).toBe(false);
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

// ── subscriptions tests ────────────────────────────────────────────────────

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
  mockDocs.set('users/my-uid-111/friend_requests/req-uid-666', { status: 'pending', createdAt: 900 });
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
  // Accepted request must NOT appear.
  expect(entries.find(r => r.fromUid === 'req-uid-777')).toBeUndefined();
});

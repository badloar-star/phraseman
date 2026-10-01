type DocData = Record<string, unknown>;
const docs = new Map<string, DocData>();

function makeRef(path: string) {
  return {
    path,
    get: async () => ({ exists: docs.has(path), data: () => docs.get(path) }),
    delete: async () => { docs.delete(path); },
    collection: (name: string) => makeCol(`${path}/${name}`),
  };
}

function makeCol(path: string) {
  return {
    doc: (id: string) => makeRef(`${path}/${id}`),
    count: () => ({
      get: async () => ({
        data: () => ({
          count: [...docs.keys()].filter((k) => k.startsWith(`${path}/`) && !k.slice(path.length + 1).includes('/')).length,
        }),
      }),
    }),
  };
}

const fakeDb = {
  collection: (name: string) => makeCol(name),
  batch: () => {
    const ops: Array<() => void> = [];
    return {
      set: (ref: { path: string }, data: DocData) => { ops.push(() => { docs.set(ref.path, data); }); },
      delete: (ref: { path: string }) => { ops.push(() => { docs.delete(ref.path); }); },
      commit: async () => { ops.forEach((o) => o()); },
    };
  },
};

class FakeHttpsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (_opts: unknown, handler: unknown) => handler,
}));
jest.mock('firebase-admin', () => ({ firestore: jest.fn(() => fakeDb) }));

const { friendBlockUser, friendUnblockUser, FRIEND_BLOCK_MAX } = require('./friend_block');

const call = (fn: (r: unknown) => Promise<unknown>, data: Record<string, unknown>, uid: string | null = 'auth-me') =>
  fn({ auth: uid ? { uid } : null, data });

beforeEach(() => {
  docs.clear();
  docs.set('users/me', { firebaseAuthUid: 'auth-me' });
});

describe('friendBlockUser / friendUnblockUser (Q41)', () => {
  it('blocks, is idempotent, and clears the incoming request', async () => {
    docs.set('users/me/friend_requests/bad', { status: 'pending' });
    await expect(call(friendBlockUser, { stableId: 'me', actorUid: 'bad' })).resolves.toEqual({ ok: true, blocked: true, alreadyBlocked: false });
    expect(docs.get('users/me/blocked/bad')).toMatchObject({ source: 'friends' });
    expect(docs.has('users/me/friend_requests/bad')).toBe(false);
    await expect(call(friendBlockUser, { stableId: 'me', actorUid: 'bad' })).resolves.toMatchObject({ alreadyBlocked: true });
  });

  it('unblocks idempotently', async () => {
    docs.set('users/me/blocked/bad', { createdAt: 1 });
    await expect(call(friendUnblockUser, { stableId: 'me', actorUid: 'bad' })).resolves.toEqual({ ok: true, blocked: false });
    expect(docs.has('users/me/blocked/bad')).toBe(false);
    await expect(call(friendUnblockUser, { stableId: 'me', actorUid: 'bad' })).resolves.toMatchObject({ ok: true });
  });

  it('rejects unauthenticated, bad ids, self-block and foreign stableId', async () => {
    await expect(call(friendBlockUser, { stableId: 'me', actorUid: 'x' }, null)).rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(call(friendBlockUser, { stableId: 'me', actorUid: 'a/b' })).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(call(friendBlockUser, { stableId: 'me', actorUid: '__x__' })).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(call(friendBlockUser, { stableId: 'me', actorUid: 'me' })).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(call(friendBlockUser, { stableId: 'me', actorUid: 'x' }, 'someone-else')).rejects.toMatchObject({ code: 'permission-denied' });
    expect([...docs.keys()].some((k) => k.includes('/blocked/'))).toBe(false);
  });

  it('enforces the block list limit', async () => {
    for (let i = 0; i < FRIEND_BLOCK_MAX; i += 1) docs.set(`users/me/blocked/u${i}`, { createdAt: 1 });
    await expect(call(friendBlockUser, { stableId: 'me', actorUid: 'new' })).rejects.toMatchObject({ code: 'resource-exhausted' });
    // уже заблокированный проходит идемпотентно даже на лимите
    await expect(call(friendBlockUser, { stableId: 'me', actorUid: 'u1' })).resolves.toMatchObject({ alreadyBlocked: true });
  });
});

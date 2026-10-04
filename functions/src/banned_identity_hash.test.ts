/** PM-252 (координатор 04.10): бан возвращается, когда удалённый забаненный входит тем же email. */
import * as admin from 'firebase-admin';
import { BANNED_IDENTITY_HASHES, bannedEmailHashId, restoreBanFromIdentityHash } from './banned_identity_hash';

type Data = Record<string, unknown>;
function makeDb(seed: Record<string, Record<string, Data>>, opts: { failGet?: boolean } = {}) {
  const store: Record<string, Map<string, Data>> = {};
  for (const [c, docs] of Object.entries(seed)) store[c] = new Map(Object.entries(docs));
  const col = (c: string) => (store[c] ??= new Map());
  let reads = 0;
  const ref = (c: string, id: string) => ({
    c, id,
    get: async () => {
      reads += 1;
      if (opts.failGet) throw new Error('unavailable');
      return { exists: col(c).has(id), data: () => col(c).get(id) };
    },
  });
  const db = {
    collection: (c: string) => ({ doc: (id: string) => ref(c, id) }),
    batch: () => {
      const ops: Array<() => void> = [];
      return {
        set: (r: { c: string; id: string }, d: Data) => ops.push(() => col(r.c).set(r.id, { ...(col(r.c).get(r.id) ?? {}), ...d })),
        commit: async () => { ops.forEach((op) => op()); },
      };
    },
  };
  return { db: db as unknown as admin.firestore.Firestore, store, reads: () => reads };
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

const hashSeed = { [BANNED_IDENTITY_HASHES]: { [bannedEmailHashId('ann@example.com')]: { bannedAtMs: 5 } } };

test('matching email hash bans the new account the same way the admin ban does', async () => {
  const { db, store } = makeDb(hashSeed);
  const result = await restoreBanFromIdentityHash(db, { stableUid: 'new-1', email: ' Ann@Example.com ', provider: 'google.com' });
  expect(result).toBe('restored');
  expect(store.banned_users.get('new-1')).toMatchObject({ uid: 'new-1', reason: 'identity_hash_match' });
  expect(store.users.get('new-1')).toMatchObject({ banned: true });
});

test('no match costs exactly one document read and writes nothing', async () => {
  const { db, store, reads } = makeDb(hashSeed);
  expect(await restoreBanFromIdentityHash(db, { stableUid: 'u', email: 'bob@example.com', provider: 'apple.com' })).toBe('no_match');
  expect(reads()).toBe(1);
  expect(store.banned_users).toBeUndefined();
});

test('no email → no read at all', async () => {
  const { db, reads } = makeDb(hashSeed);
  expect(await restoreBanFromIdentityHash(db, { stableUid: 'u', email: undefined, provider: 'google.com' })).toBe('no_email');
  expect(reads()).toBe(0);
});

test('a read failure does not break sign-in and is logged', async () => {
  const { db } = makeDb(hashSeed, { failGet: true });
  expect(await restoreBanFromIdentityHash(db, { stableUid: 'u', email: 'ann@example.com', provider: 'google.com' })).toBe('check_failed');
  expect(console.error).toHaveBeenCalledWith('[BAN-HASH] check_failed', expect.any(String));
});

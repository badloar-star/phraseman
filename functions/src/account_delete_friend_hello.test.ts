import { deleteFriendHelloCooldownsAboutUser } from './account_delete';

// зачем (PM-164, Q37): окно тишины «Привета» лежит у отправителя под docId получателя — при удалении
// получателя такие записи в чужих деревьях обязаны сноситься по пути users/{sender}/friend_hello_cooldowns/{stableUid}.
function makeCtx(existing: Set<string>) {
  const recursiveDelete = jest.fn(async (..._args: unknown[]) => {});
  const makeUser = (uid: string) => ({
    collection: (name: string) => ({
      doc: (id: string) => {
        const path = `users/${uid}/${name}/${id}`;
        return { get: async () => ({ exists: existing.has(path), ref: { path } }) };
      },
    }),
  });
  const db = {
    collection: jest.fn(() => ({ doc: (uid: string) => makeUser(uid), listDocuments: async () => [makeUser('s1'), makeUser('s2')] })),
    recursiveDelete,
  };
  const ctx = { db, writer: { flush: jest.fn(async () => {}) }, seen: new Set<string>() };
  const stats = { docsDeleted: 0, docsUpdated: 0, queriesRun: 0, authDeleted: false };
  return { db, ctx, stats, recursiveDelete };
}

describe('account delete: friend_hello_cooldowns of other users', () => {
  it('deletes only existing cooldown docs of the deleted uid for the given peers', async () => {
    const { db, ctx, stats, recursiveDelete } = makeCtx(new Set(['users/peer1/friend_hello_cooldowns/stable-123']));
    await deleteFriendHelloCooldownsAboutUser(db as any, 'stable-123', ctx as any, stats as any, ['peer1', 'peer2']);
    expect(recursiveDelete).toHaveBeenCalledTimes(1);
    expect(recursiveDelete.mock.calls[0]?.[0]).toMatchObject({ path: 'users/peer1/friend_hello_cooldowns/stable-123' });
    expect(stats.queriesRun).toBe(2);
  });

  it('falls back to listing all users when peers are unknown', async () => {
    const { db, ctx, stats, recursiveDelete } = makeCtx(new Set(['users/s2/friend_hello_cooldowns/stable-123']));
    await deleteFriendHelloCooldownsAboutUser(db as any, 'stable-123', ctx as any, stats as any, null);
    expect(recursiveDelete).toHaveBeenCalledTimes(1);
    expect(stats.queriesRun).toBe(2);
  });

  it('skips on empty uid', async () => {
    const { db, ctx, stats, recursiveDelete } = makeCtx(new Set());
    await deleteFriendHelloCooldownsAboutUser(db as any, '', ctx as any, stats as any, ['p']);
    expect(recursiveDelete).not.toHaveBeenCalled();
  });
});

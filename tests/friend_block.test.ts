jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn() }));
jest.mock('@react-native-firebase/functions', () => ({ getFunctions: jest.fn(), httpsCallable: jest.fn() }));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/cloud_sync', () => ({ ensureAnonUser: jest.fn(), ensureStableAuthLinkForStableId: jest.fn() }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn() }));

import { createFriendBlockStore, type FriendBlockDeps } from '../app/friend_block';

function makeDeps(over: Partial<FriendBlockDeps> = {}): FriendBlockDeps {
  return {
    getMyUid: async () => 'me',
    callBlock: jest.fn(async () => {}),
    callUnblock: jest.fn(async () => {}),
    fetchRemote: jest.fn(async () => ['a']),
    loadCache: jest.fn(async () => null),
    saveCache: jest.fn(async () => {}),
    now: () => 1_000_000,
    ...over,
  };
}

const flush = async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); };

describe('friend_block client store', () => {
  it('blocks optimistically before the server answers', async () => {
    let release: () => void = () => {};
    const deps = makeDeps({ callBlock: jest.fn(() => new Promise<void>((r) => { release = r; })) });
    const s = createFriendBlockStore(deps);
    const p = s.blockUser('x');
    await flush();
    expect(s.isBlockedLocally('x')).toBe(true);
    release();
    expect(await p).toBe('ok');
  });

  it('rolls back on error and reports error', async () => {
    const s = createFriendBlockStore(makeDeps({ callBlock: jest.fn(async () => { throw { code: 'functions/internal' }; }) }));
    expect(await s.blockUser('x')).toBe('error');
    expect(s.isBlockedLocally('x')).toBe(false);
  });

  it('reports limit on resource-exhausted', async () => {
    const s = createFriendBlockStore(makeDeps({ callBlock: jest.fn(async () => { throw { code: 'functions/resource-exhausted' }; }) }));
    expect(await s.blockUser('x')).toBe('limit');
    expect(s.isBlockedLocally('x')).toBe(false);
  });

  it('ignores double tap while a call is in flight', async () => {
    let release: () => void = () => {};
    const callBlock = jest.fn(() => new Promise<void>((r) => { release = r; }));
    const s = createFriendBlockStore(makeDeps({ callBlock }));
    const p1 = s.blockUser('x');
    await flush();
    await s.blockUser('x');
    release();
    await p1;
    expect(callBlock).toHaveBeenCalledTimes(1);
  });

  it('refuses to block self or empty id', async () => {
    const s = createFriendBlockStore(makeDeps());
    expect(await s.blockUser('me')).toBe('error');
    expect(await s.blockUser('')).toBe('error');
  });

  it('unblock removes locally', async () => {
    const s = createFriendBlockStore(makeDeps());
    await s.blockUser('x');
    await s.unblockUser('x');
    expect(s.isBlockedLocally('x')).toBe(false);
  });

  it('refresh uses fresh cache without hitting the server, and refetches when stale', async () => {
    const fetchRemote = jest.fn(async () => ['srv']);
    const s = createFriendBlockStore(makeDeps({
      fetchRemote,
      loadCache: jest.fn(async () => ({ uids: ['c'], fetchedAt: 1_000_000 - 1000 })),
    }));
    await s.refresh();
    expect(fetchRemote).not.toHaveBeenCalled();
    expect(s.getBlockedUids()).toEqual(['c']);
    const s2 = createFriendBlockStore(makeDeps({
      fetchRemote,
      loadCache: jest.fn(async () => ({ uids: ['c'], fetchedAt: -100_000_000 })),
    }));
    await s2.refresh();
    expect(fetchRemote).toHaveBeenCalledTimes(1);
    expect(s2.getBlockedUids()).toEqual(['srv']);
  });
});

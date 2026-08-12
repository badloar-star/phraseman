import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  countUnreadNotifications,
  readCachedUserNotifications,
  refreshUserNotificationsOnce,
} from '../app/user_notifications';
import { getCanonicalUserId } from '../app/user_id_policy';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: jest.fn(async () => 'auth-user'),
  ensureStableAuthLink: jest.fn(async () => true),
}));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn() }));

const mockDocsByUid: Record<string, { id: string; data: Record<string, unknown> }[]> = {};
const mockFailingUids = new Set<string>();
const mockDeferredUids = new Set<string>();
const mockGetCountByUid: Record<string, number> = {};
const mockGetReleasesByUid: Record<string, (() => void)[]> = {};

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn((uid: string) => ({
        collection: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn(async () => {
                mockGetCountByUid[uid] = (mockGetCountByUid[uid] ?? 0) + 1;
                if (mockDeferredUids.has(uid)) {
                  await new Promise<void>((resolve) => {
                    (mockGetReleasesByUid[uid] ??= []).push(resolve);
                  });
                }
                if (mockFailingUids.has(uid)) throw new Error('offline');
                return {
                  docs: (mockDocsByUid[uid] ?? []).map((row) => ({
                    id: row.id,
                    data: () => row.data,
                  })),
                };
              }),
            })),
          })),
        })),
      })),
    })),
  })),
}));

const storage: Record<string, string> = {};

async function flushMicrotasksUntil(predicate: () => boolean, attempts = 30): Promise<void> {
  for (let attempt = 0; attempt < attempts && !predicate(); attempt += 1) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  Object.keys(mockDocsByUid).forEach((key) => delete mockDocsByUid[key]);
  mockFailingUids.clear();
  mockDeferredUids.clear();
  Object.keys(mockGetCountByUid).forEach((key) => delete mockGetCountByUid[key]);
  Object.keys(mockGetReleasesByUid).forEach((key) => delete mockGetReleasesByUid[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete storage[key];
  });
});

describe('notification cache account isolation', () => {
  it('never returns account A notifications to account B when B is offline', async () => {
    (getCanonicalUserId as jest.Mock).mockResolvedValue('stable-A');
    mockDocsByUid['stable-A'] = [{
      id: 'private-A',
      data: { type: 'report_reply', text: 'private reply A', read: false, createdAt: 100 },
    }];
    await expect(refreshUserNotificationsOnce({ force: true })).resolves.toEqual([
      expect.objectContaining({ id: 'private-A', text: 'private reply A' }),
    ]);

    (getCanonicalUserId as jest.Mock).mockResolvedValue('stable-B');
    mockFailingUids.add('stable-B');

    await expect(refreshUserNotificationsOnce({ force: true })).resolves.toEqual([]);
    await expect(readCachedUserNotifications()).resolves.toEqual([]);
  });

  it('does not expose the unowned legacy v1 cache to any account', async () => {
    storage.user_notifications_cache_v1 = JSON.stringify([
      { id: 'legacy-private', type: 'report_reply', text: 'unknown owner', read: false, createdAt: 1 },
    ]);
    (getCanonicalUserId as jest.Mock).mockResolvedValue('stable-B');

    await expect(readCachedUserNotifications()).resolves.toEqual([]);
  });

  it('coalesces simultaneous refreshes for the same canonical UID', async () => {
    (getCanonicalUserId as jest.Mock).mockResolvedValue('stable-C');
    mockDeferredUids.add('stable-C');
    mockDocsByUid['stable-C'] = [{
      id: 'only-once',
      data: { type: 'report_reply', text: 'one request', read: false, createdAt: 200 },
    }];

    const first = refreshUserNotificationsOnce({ force: true });
    const second = refreshUserNotificationsOnce({ force: true });
    await flushMicrotasksUntil(() => mockGetCountByUid['stable-C'] === 1);
    expect(mockGetCountByUid['stable-C']).toBe(1);

    mockGetReleasesByUid['stable-C']?.forEach((release) => release());
    await expect(Promise.all([first, second])).resolves.toEqual([
      [expect.objectContaining({ id: 'only-once' })],
      [expect.objectContaining({ id: 'only-once' })],
    ]);
    expect(mockGetCountByUid['stable-C']).toBe(1);
  });

  it('normalizes report reply coin rewards while accepting legacy shard payloads', async () => {
    (getCanonicalUserId as jest.Mock).mockResolvedValue('stable-coins');
    mockDocsByUid['stable-coins'] = [
      {
        id: 'current-reward',
        data: {
          type: 'report_reply',
          reportReply: { messageId: 'message-current', coins: 1, claimed: false },
          createdAt: 300,
        },
      },
      {
        id: 'legacy-reward',
        data: {
          type: 'report_reply',
          reportReply: { messageId: 'message-legacy', shards: 1, claimed: false },
          createdAt: 200,
        },
      },
    ];

    const notifications = await refreshUserNotificationsOnce({ force: true });

    expect(notifications.map((notification) => notification.reportReply?.coins)).toEqual([1, 1]);
  });

  it('purges retired tournament notifications from Firestore, cache and unread count', async () => {
    (getCanonicalUserId as jest.Mock).mockResolvedValue('stable-retired');
    mockDocsByUid['stable-retired'] = [
      {
        id: 'retired-tournament-bank',
        data: {
          type: 'tournament_weekly_bank',
          text: 'legacy tournament payout',
          read: false,
          createdAt: 400,
        },
      },
      {
        id: 'live-friend-request',
        data: {
          type: 'friend_request',
          text: 'live notification',
          read: false,
          createdAt: 300,
        },
      },
    ];

    const refreshed = await refreshUserNotificationsOnce({ force: true });

    expect(refreshed.map((notification) => notification.id)).toEqual(['live-friend-request']);
    expect(countUnreadNotifications(refreshed)).toBe(1);
    const persisted = JSON.parse(storage['user_notifications_cache_v2:stable-retired'] ?? '[]');
    expect(persisted.map((notification: { id: string }) => notification.id)).toEqual(['live-friend-request']);
  });

  it('keeps owner-only Arena partner nudges visible with their bounded navigation payload', async () => {
    (getCanonicalUserId as jest.Mock).mockResolvedValue('stable-arena-partner');
    mockDocsByUid['stable-arena-partner'] = [{
      id: 'arena-partner-pair-day',
      data: {
        type: 'arena_partner_nudge',
        fromUid: 'stable-friend',
        fromName: 'Friend',
        nav: { kind: 'arena_partner', partnershipId: 'pair-safe-id' },
        read: false,
        createdAt: 500,
      },
    }, {
      id: 'arena-partner-invite',
      data: {
        type: 'arena_partner_invite',
        fromUid: 'stable-friend-2',
        fromName: 'Second friend',
        nav: { kind: 'arena_partner', partnershipId: 'pair-invite-id' },
        read: false,
        createdAt: 490,
      },
    }];

    await expect(refreshUserNotificationsOnce({ force: true })).resolves.toEqual([
      expect.objectContaining({
        type: 'arena_partner_nudge',
        nav: { kind: 'arena_partner', partnershipId: 'pair-safe-id' },
      }),
      expect.objectContaining({
        type: 'arena_partner_invite',
        nav: { kind: 'arena_partner', partnershipId: 'pair-invite-id' },
      }),
    ]);
  });

  it('physically purges a retired tournament notification from the offline cache', async () => {
    (getCanonicalUserId as jest.Mock).mockResolvedValue('stable-retired-cache');
    storage['user_notifications_cache_v2:stable-retired-cache'] = JSON.stringify([
      {
        id: 'live-friend-request-cache',
        type: 'friend_request',
        read: false,
        createdAt: 300,
      },
      {
        id: 'retired-from-disk',
        type: 'tournament_weekly_bank',
        read: false,
        createdAt: 200,
      },
    ]);

    await expect(readCachedUserNotifications()).resolves.toEqual([
      expect.objectContaining({ id: 'live-friend-request-cache' }),
    ]);
    await Promise.resolve();
    const persisted = JSON.parse(storage['user_notifications_cache_v2:stable-retired-cache'] ?? '[]');
    expect(persisted.map((notification: { id: string }) => notification.id)).toEqual([
      'live-friend-request-cache',
    ]);
  });

});

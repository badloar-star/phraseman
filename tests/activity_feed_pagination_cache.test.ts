/**
 * PM-167 + PM-172: «Активность» (центр событий) —
 *  - мёртвые типы Арены и подарков/дуэлей не показываются и вычищаются из кэша;
 *  - на старте читается одна страница, старое — только курсором по запросу;
 *  - обновление только по TTL экрана, даже force — не чаще USER_NOTIFICATIONS_FORCE_FLOOR_MS;
 *  - маркеры друзей строятся из тех же строк (без второго чтения).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  USER_NOTIFICATIONS_FORCE_FLOOR_MS,
  USER_NOTIFICATIONS_PAGE_SIZE,
  loadOlderUserNotifications,
  readCachedUserNotifications,
  refreshUserNotificationsOnce,
} from '../app/user_notifications';
import { friendSocialEventsFromNotifications } from '../app/friend_social_events';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: jest.fn(async () => 'auth-user'),
  ensureStableAuthLink: jest.fn(async () => true),
}));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => 'stable-feed') }));

type Row = { id: string; data: Record<string, unknown> };
const mockRows: Row[] = [];
const mockCalls: { kind: 'first' | 'older'; cursor?: unknown; limit: number }[] = [];

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        collection: jest.fn(() => ({
          orderBy: jest.fn(() => {
            const sorted = () => [...mockRows].sort((a, b) => Number(b.data.createdAt) - Number(a.data.createdAt));
            const snap = (rows: Row[]) => ({ docs: rows.map((r) => ({ id: r.id, data: () => r.data })) });
            return {
              limit: jest.fn((n: number) => ({
                get: jest.fn(async () => { mockCalls.push({ kind: 'first', limit: n }); return snap(sorted().slice(0, n)); }),
              })),
              startAfter: jest.fn((cursor: number) => ({
                limit: jest.fn((n: number) => ({
                  get: jest.fn(async () => {
                    mockCalls.push({ kind: 'older', cursor, limit: n });
                    return snap(sorted().filter((r) => Number(r.data.createdAt) < cursor).slice(0, n));
                  }),
                })),
              })),
            };
          }),
        })),
      })),
    })),
  })),
}));

const storage: Record<string, string> = {};
let nowMs = 1_000_000_000;

beforeEach(() => {
  jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  mockRows.length = 0;
  mockCalls.length = 0;
  Object.keys(storage).forEach((k) => delete storage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (k: string) => storage[k] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (k: string, v: string) => { storage[k] = v; });
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async () => undefined);
});

afterEach(() => jest.restoreAllMocks());

function seed(count: number, extra: Row[] = []) {
  for (let i = 0; i < count; i += 1) {
    mockRows.push({ id: `n${i}`, data: { type: 'friend_request', fromUid: `u${i}`, createdAt: 10_000 - i, read: false } });
  }
  mockRows.push(...extra);
}

describe('activity feed (PM-167/PM-172)', () => {
  it('drops retired Arena types and gift/duel friend events, keeps high-five', async () => {
    nowMs += 10 * USER_NOTIFICATIONS_FORCE_FLOOR_MS;
    seed(0, [
      { id: 'arena', data: { type: 'arena_friend_invite', createdAt: 9 } },
      { id: 'partner', data: { type: 'arena_partner_invite', createdAt: 8 } },
      { id: 'gift', data: { type: 'friend_nudge', createdAt: 7, nav: { kind: 'friend_event', actorStableUid: 'a', eventId: 'g', action: 'gift' } } },
      { id: 'duel', data: { type: 'friend_nudge', createdAt: 6, nav: { kind: 'friend_event', actorStableUid: 'a', eventId: 'd', action: 'duel_invite' } } },
      { id: 'hi', data: { type: 'activity_like', createdAt: 5, nav: { kind: 'friend_event', actorStableUid: 'a', eventId: 'h', action: 'high_five' } } },
    ]);
    const list = await refreshUserNotificationsOnce({ force: true });
    expect(list.map((r) => r.id)).toEqual(['hi']);
    // Маркеры друзей — из тех же строк, без второго чтения.
    expect(friendSocialEventsFromNotifications(list).map((e) => e.kind)).toEqual(['high_five']);
    expect(mockCalls).toHaveLength(1);
  });

  it('start reads one bounded page; older pages only by cursor on request', async () => {
    nowMs += 10 * USER_NOTIFICATIONS_FORCE_FLOOR_MS;
    seed(120);
    const first = await refreshUserNotificationsOnce({ force: true });
    expect(first).toHaveLength(50);
    expect(mockCalls).toEqual([{ kind: 'first', limit: 50 }]);

    const page = await loadOlderUserNotifications();
    expect(mockCalls[1]).toEqual({ kind: 'older', cursor: first[first.length - 1].createdAt, limit: USER_NOTIFICATIONS_PAGE_SIZE });
    expect(page.fetched).toBe(USER_NOTIFICATIONS_PAGE_SIZE);
    expect(page.list).toHaveLength(50 + USER_NOTIFICATIONS_PAGE_SIZE);
    expect(new Set(page.list.map((r) => r.id)).size).toBe(page.list.length);
    expect(page.hasMore).toBe(true);
    expect(await readCachedUserNotifications()).toHaveLength(70);
  });

  it('refresh respects the screen TTL; even force is floored', async () => {
    nowMs += 10 * USER_NOTIFICATIONS_FORCE_FLOOR_MS;
    seed(3);
    await refreshUserNotificationsOnce({ force: true });
    nowMs += 1_000;
    await refreshUserNotificationsOnce({ force: true });
    await refreshUserNotificationsOnce({ minIntervalMs: 12 * 60 * 60_000 });
    expect(mockCalls).toHaveLength(1);

    nowMs += USER_NOTIFICATIONS_FORCE_FLOOR_MS;
    await refreshUserNotificationsOnce({ force: true });
    expect(mockCalls).toHaveLength(2);
    await refreshUserNotificationsOnce({ minIntervalMs: 12 * 60 * 60_000 });
    expect(mockCalls).toHaveLength(2);
  });

  it('module has no realtime listener', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../app/user_notifications.ts'), 'utf8');
    expect(src).not.toMatch(/onSnapshot\s*\(/);
  });
});

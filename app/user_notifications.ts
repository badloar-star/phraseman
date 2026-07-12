import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureStableAuthLink } from './cloud_sync';
import { getCanonicalUserId } from './user_id_policy';

/**
 * Клиентский слой единого центра событий (колокольчик на главной).
 * Данные: users/{stableUid}/notifications — пишут ТОЛЬКО cloud functions
 * (functions/src/user_notifications.ts), клиент читает/помечает/удаляет.
 */

const LEGACY_CACHE_KEY = 'user_notifications_cache_v1';
const LEGACY_LAST_REFRESH_KEY = 'user_notifications_last_refresh_ms_v1';
const CACHE_KEY_PREFIX = 'user_notifications_cache_v2:';
const LAST_REFRESH_KEY_PREFIX = 'user_notifications_last_refresh_ms_v2:';
const MAX_NOTIFICATIONS = 50;
const MAX_MEMORY_OWNERS = 2;

export type UserNotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'activity_like'
  | 'friend_gift_received'
  | 'friend_gift_thanks'
  | 'help_board_comment'
  | 'help_board_reply'
  | 'help_board_like'
  | 'league_chat_reply'
  | 'report_reply';

export interface UserNotificationNavHelpBoard {
  kind: 'help_board';
  topicId: string;
  commentId?: string;
  boardKey?: string;
}

export interface UserNotificationNavLeagueChat {
  kind: 'league_chat';
  groupId: string;
  weekId: string;
  leagueId: number;
  messageId: string;
}

export interface UserNotificationNavFriends {
  kind: 'friends';
}

export interface UserNotificationNavReportReply {
  kind: 'report_reply';
  messageId: string;
}

export type UserNotificationNav =
  | UserNotificationNavHelpBoard
  | UserNotificationNavLeagueChat
  | UserNotificationNavFriends
  | UserNotificationNavReportReply;

export interface UserNotificationReportReply {
  messageId: string;
  title: string;
  body: string;
  shards: number;
  claimed: boolean;
  claimedAtMs: number | null;
}

export interface UserNotification {
  id: string;
  type: UserNotificationType;
  fromUid: string;
  fromName: string;
  fromAvatar?: string;
  text?: string;
  nav?: UserNotificationNav | null;
  reportReply?: UserNotificationReportReply | null;
  read: boolean;
  createdAt: number;
}

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    return firestore();
  } catch {
    return null;
  }
};

async function getNotificationOwnerUid(): Promise<string | null> {
  await ensureAnonUser();
  await ensureStableAuthLink().catch(() => false);
  const stableUid = await getCanonicalUserId().catch(() => null);
  return String(stableUid || '').trim() || null;
}

function cleanText(value: unknown, maxLen: number): string {
  return String(value ?? '').trim().slice(0, maxLen);
}

function normalizeReportReply(value: unknown): UserNotificationReportReply | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const messageId = cleanText(row.messageId, 128);
  if (!messageId) return null;
  const shards = Math.max(0, Math.floor(Number(row.shards ?? 0) || 0));
  const claimedAtMsRaw = Math.floor(Number(row.claimedAtMs ?? 0) || 0);
  return {
    messageId,
    title: cleanText(row.title, 120),
    body: cleanText(row.body, 1200),
    shards,
    claimed: row.claimed === true,
    claimedAtMs: claimedAtMsRaw > 0 ? claimedAtMsRaw : null,
  };
}

function normalizeNotification(id: string, data: Record<string, unknown>): UserNotification {
  const nav = data.nav && typeof data.nav === 'object' ? (data.nav as UserNotificationNav) : null;
  return {
    id,
    type: String(data.type || '') as UserNotificationType,
    fromUid: String(data.fromUid || ''),
    fromName: String(data.fromName || ''),
    fromAvatar: String(data.fromAvatar || ''),
    text: String(data.text || ''),
    nav,
    reportReply: normalizeReportReply(data.reportReply),
    read: data.read === true,
    createdAt: Number(data.createdAt || 0),
  };
}

const cachedMemoryByOwner = new Map<string, UserNotification[]>();
const refreshInFlightByOwner = new Map<string, Promise<UserNotification[]>>();
let legacyCacheCleanupStarted = false;

function ownerStorageKey(prefix: string, ownerUid: string): string {
  return `${prefix}${encodeURIComponent(ownerUid)}`;
}

function rememberOwnerCache(ownerUid: string, list: UserNotification[]): void {
  cachedMemoryByOwner.delete(ownerUid);
  cachedMemoryByOwner.set(ownerUid, list);
  while (cachedMemoryByOwner.size > MAX_MEMORY_OWNERS) {
    const oldestOwnerUid = cachedMemoryByOwner.keys().next().value;
    if (typeof oldestOwnerUid !== 'string') break;
    cachedMemoryByOwner.delete(oldestOwnerUid);
  }
}

function cleanupUnownedLegacyCache(): void {
  if (legacyCacheCleanupStarted) return;
  legacyCacheCleanupStarted = true;
  void AsyncStorage.multiRemove([LEGACY_CACHE_KEY, LEGACY_LAST_REFRESH_KEY]).catch(() => {});
}

/** Мгновенный первый кадр: последний известный снапшот без похода в сеть. */
export function peekCachedUserNotifications(ownerUid?: string | null): UserNotification[] {
  const safeOwnerUid = String(ownerUid || '').trim();
  return safeOwnerUid ? (cachedMemoryByOwner.get(safeOwnerUid) ?? []) : [];
}

export async function readCachedUserNotifications(): Promise<UserNotification[]> {
  cleanupUnownedLegacyCache();
  const ownerUid = await getNotificationOwnerUid();
  if (!ownerUid) return [];
  const memory = cachedMemoryByOwner.get(ownerUid);
  if (memory) return memory;
  try {
    const raw = await AsyncStorage.getItem(ownerStorageKey(CACHE_KEY_PREFIX, ownerUid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const currentOwnerUid = await getNotificationOwnerUid();
    if (currentOwnerUid !== ownerUid) return [];
    const list = parsed.filter((row) => row && typeof row === 'object' && typeof row.id === 'string');
    rememberOwnerCache(ownerUid, list);
    return list;
  } catch {
    return [];
  }
}

function getNotificationsQuery(ownerUid: string): any | null {
  const db = getFirestore();
  if (!db) return null;
  return db
    .collection('users')
    .doc(ownerUid)
    .collection('notifications')
    .orderBy('createdAt', 'desc')
    .limit(MAX_NOTIFICATIONS);
}

function writeCache(ownerUid: string, list: UserNotification[]): void {
  rememberOwnerCache(ownerUid, list);
  AsyncStorage.setItem(ownerStorageKey(CACHE_KEY_PREFIX, ownerUid), JSON.stringify(list)).catch(() => {});
}

async function readLastRefreshMs(ownerUid: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(ownerStorageKey(LAST_REFRESH_KEY_PREFIX, ownerUid));
    const n = Math.floor(Number(raw || 0));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

async function writeLastRefreshMs(ownerUid: string, ms: number): Promise<void> {
  await AsyncStorage.setItem(
    ownerStorageKey(LAST_REFRESH_KEY_PREFIX, ownerUid),
    String(Math.max(0, Math.floor(ms))),
  ).catch(() => {});
}

export function countUnreadNotifications(list: UserNotification[]): number {
  return list.reduce((acc, row) => acc + (row.read ? 0 : 1), 0);
}

export async function refreshUserNotificationsOnce(options: {
  force?: boolean;
  minIntervalMs?: number;
} = {}): Promise<UserNotification[]> {
  cleanupUnownedLegacyCache();
  const ownerUid = await getNotificationOwnerUid();
  if (!ownerUid) return [];
  const existingRefresh = refreshInFlightByOwner.get(ownerUid);
  if (existingRefresh) return existingRefresh;

  const refresh = (async (): Promise<UserNotification[]> => {
    const now = Date.now();
    const minIntervalMs = Math.max(0, Math.floor(Number(options.minIntervalMs ?? 0)) || 0);
    if (!options.force && minIntervalMs > 0) {
      const lastRefreshMs = await readLastRefreshMs(ownerUid);
      if (lastRefreshMs > 0 && now - lastRefreshMs < minIntervalMs) {
        const currentOwnerUid = await getNotificationOwnerUid();
        return currentOwnerUid === ownerUid ? (cachedMemoryByOwner.get(ownerUid) ?? readCachedUserNotifications()) : [];
      }
    }

    const query = getNotificationsQuery(ownerUid);
    if (!query) return readCachedUserNotifications();
    try {
      const snap = await query.get();
      const currentOwnerUid = await getNotificationOwnerUid();
      if (currentOwnerUid !== ownerUid) return [];
      const list = (snap.docs || []).map((doc: any) => normalizeNotification(doc.id, doc.data?.() || {}));
      writeCache(ownerUid, list);
      await writeLastRefreshMs(ownerUid, now);
      return list;
    } catch {
      const currentOwnerUid = await getNotificationOwnerUid();
      return currentOwnerUid === ownerUid ? readCachedUserNotifications() : [];
    }
  })();
  refreshInFlightByOwner.set(ownerUid, refresh);
  try {
    return await refresh;
  } finally {
    if (refreshInFlightByOwner.get(ownerUid) === refresh) {
      refreshInFlightByOwner.delete(ownerUid);
    }
  }
}

/**
 * Realtime-подписка на центр событий. Возвращает unsubscribe.
 * Первый колбэк может прийти из кеша (offline-friendly), затем — live.
 */
export function subscribeUserNotifications(
  onChange: (list: UserNotification[]) => void,
): () => void {
  let disposed = false;
  let unsubscribeSnapshot: (() => void) | null = null;

  void (async () => {
    const ownerUid = await getNotificationOwnerUid();
    if (!ownerUid) return;
    const query = getNotificationsQuery(ownerUid);
    if (disposed) return;
    if (!query) return;
    unsubscribeSnapshot = query.onSnapshot(
      (snap: any) => {
        if (disposed || !snap) return;
        void (async () => {
          const currentOwnerUid = await getNotificationOwnerUid();
          if (disposed || currentOwnerUid !== ownerUid) return;
          const list = (snap.docs || []).map((doc: any) => normalizeNotification(doc.id, doc.data?.() || {}));
          writeCache(ownerUid, list);
          onChange(list);
        })();
      },
      () => {},
    );
  })();

  return () => {
    disposed = true;
    if (unsubscribeSnapshot) unsubscribeSnapshot();
  };
}

/** Пометить события прочитанными (батчем; правила пускают только read/readAt/updatedAt). */
export async function markUserNotificationsRead(ids: string[]): Promise<void> {
  const db = getFirestore();
  if (!db || ids.length === 0) return;
  const stableUid = await getNotificationOwnerUid();
  if (!stableUid) return;
  const now = Date.now();
  try {
    const batch = db.batch();
    ids.slice(0, MAX_NOTIFICATIONS).forEach((id) => {
      const ref = db.collection('users').doc(stableUid).collection('notifications').doc(id);
      batch.update(ref, { read: true, readAt: now, updatedAt: now });
    });
    await batch.commit();
  } catch {
    // best-effort: непрочитанность догонит следующий снапшот
  }
}

export async function deleteUserNotification(id: string): Promise<void> {
  const db = getFirestore();
  if (!db || !id) return;
  const stableUid = await getNotificationOwnerUid();
  if (!stableUid) return;
  try {
    await db.collection('users').doc(stableUid).collection('notifications').doc(id).delete();
  } catch {}
}

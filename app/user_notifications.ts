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

const CACHE_KEY = 'user_notifications_cache_v1';
const LAST_REFRESH_KEY = 'user_notifications_last_refresh_ms_v1';
const MAX_NOTIFICATIONS = 50;

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

let cachedMemory: UserNotification[] | null = null;

/** Мгновенный первый кадр: последний известный снапшот без похода в сеть. */
export function peekCachedUserNotifications(): UserNotification[] {
  return cachedMemory ?? [];
}

export async function readCachedUserNotifications(): Promise<UserNotification[]> {
  if (cachedMemory) return cachedMemory;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    cachedMemory = parsed.filter((row) => row && typeof row === 'object' && typeof row.id === 'string');
    return cachedMemory ?? [];
  } catch {
    return [];
  }
}

async function getNotificationsQuery(): Promise<any | null> {
  const db = getFirestore();
  if (!db) return null;
  const stableUid = await getNotificationOwnerUid();
  if (!stableUid) return null;
  return db
    .collection('users')
    .doc(stableUid)
    .collection('notifications')
    .orderBy('createdAt', 'desc')
    .limit(MAX_NOTIFICATIONS);
}

function writeCache(list: UserNotification[]): void {
  cachedMemory = list;
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list)).catch(() => {});
}

async function readLastRefreshMs(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(LAST_REFRESH_KEY);
    const n = Math.floor(Number(raw || 0));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

async function writeLastRefreshMs(ms: number): Promise<void> {
  await AsyncStorage.setItem(LAST_REFRESH_KEY, String(Math.max(0, Math.floor(ms)))).catch(() => {});
}

export function countUnreadNotifications(list: UserNotification[]): number {
  return list.reduce((acc, row) => acc + (row.read ? 0 : 1), 0);
}

export async function refreshUserNotificationsOnce(options: {
  force?: boolean;
  minIntervalMs?: number;
} = {}): Promise<UserNotification[]> {
  const now = Date.now();
  const minIntervalMs = Math.max(0, Math.floor(Number(options.minIntervalMs ?? 0)) || 0);
  if (!options.force && minIntervalMs > 0) {
    const lastRefreshMs = await readLastRefreshMs();
    if (lastRefreshMs > 0 && now - lastRefreshMs < minIntervalMs) {
      return readCachedUserNotifications();
    }
  }

  const query = await getNotificationsQuery();
  if (!query) return readCachedUserNotifications();
  try {
    const snap = await query.get();
    const list = (snap.docs || []).map((doc: any) => normalizeNotification(doc.id, doc.data?.() || {}));
    writeCache(list);
    await writeLastRefreshMs(now);
    return list;
  } catch {
    return readCachedUserNotifications();
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
    const query = await getNotificationsQuery();
    if (disposed) return;
    if (!query) return;
    unsubscribeSnapshot = query.onSnapshot(
      (snap: any) => {
        if (disposed || !snap) return;
        const list = (snap.docs || []).map((doc: any) => normalizeNotification(doc.id, doc.data?.() || {}));
        writeCache(list);
        onChange(list);
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

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
  | 'arena_partner_invite'
  | 'arena_partner_nudge'
  | 'friend_nudge'
  | 'arena_friend_invite'
  | 'arena_friend_accepted'
  | 'arena_friend_declined'
  | 'arena_friend_cancelled'
  | 'arena_friend_expired'
  | 'report_reply';

export interface UserNotificationNavFriends {
  kind: 'friends';
}

export interface UserNotificationNavReportReply {
  kind: 'report_reply';
  messageId: string;
}

export interface UserNotificationNavArenaPartner {
  kind: 'arena_partner';
  partnershipId: string;
}

export type UserNotificationFriendEventAction =
  | 'high_five'
  | 'study_invite'
  | 'duel_invite'
  | 'duel_state'
  | 'gift';

export interface UserNotificationNavFriendEvent {
  kind: 'friend_event';
  actorStableUid: string;
  eventId: string;
  action: UserNotificationFriendEventAction;
  inviteId?: string;
}

export type UserNotificationNav =
  | UserNotificationNavFriends
  | UserNotificationNavArenaPartner
  | UserNotificationNavFriendEvent
  | UserNotificationNavReportReply;

export interface UserNotificationReportReply {
  messageId: string;
  title: string;
  body: string;
  coins: number;
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

export const VISIBLE_USER_NOTIFICATION_TYPES: ReadonlySet<string> = new Set<UserNotificationType>([
  'friend_request',
  'friend_accepted',
  'activity_like',
  'friend_gift_received',
  'friend_gift_thanks',
  'arena_partner_invite',
  'arena_partner_nudge',
  'friend_nudge',
  'arena_friend_invite',
  'arena_friend_accepted',
  'arena_friend_declined',
  'arena_friend_cancelled',
  'arena_friend_expired',
  'report_reply',
]);

export function isUserNotificationVisible(row: UserNotification): boolean {
  // Unknown/legacy types are fail-closed. In particular, cached tournament
  // bank notifications cannot reappear in the notification center.
  return Boolean(row) && VISIBLE_USER_NOTIFICATION_TYPES.has(String(row.type || ''));
}

function onlyVisibleUserNotifications(list: readonly UserNotification[]): UserNotification[] {
  return list.filter(isUserNotificationVisible);
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

const FRIEND_EVENT_ACTIONS: ReadonlySet<string> = new Set<UserNotificationFriendEventAction>([
  'high_five',
  'study_invite',
  'duel_invite',
  'duel_state',
  'gift',
]);

export function parseUserNotificationNav(value: unknown): UserNotificationNav | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const kind = cleanText(row.kind, 32);
  if (kind === 'friends') return { kind: 'friends' };
  if (kind === 'report_reply') {
    const messageId = cleanText(row.messageId, 128);
    return messageId ? { kind: 'report_reply', messageId } : null;
  }
  if (kind === 'arena_partner') {
    const partnershipId = cleanText(row.partnershipId, 160);
    return partnershipId ? { kind: 'arena_partner', partnershipId } : null;
  }
  if (kind !== 'friend_event') return null;
  const actorStableUid = cleanText(row.actorStableUid, 160);
  const eventId = cleanText(row.eventId, 160);
  const action = cleanText(row.action, 32);
  if (!actorStableUid || !eventId || !FRIEND_EVENT_ACTIONS.has(action)) return null;
  const inviteId = cleanText(row.inviteId, 256);
  return {
    kind: 'friend_event',
    actorStableUid,
    eventId,
    action: action as UserNotificationFriendEventAction,
    ...(inviteId ? { inviteId } : {}),
  };
}

function normalizeReportReply(value: unknown): UserNotificationReportReply | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const messageId = cleanText(row.messageId, 128);
  if (!messageId) return null;
  const coins = Math.max(0, Math.min(1, Math.floor(Number(row.coins ?? row.shards ?? 0) || 0)));
  const claimedAtMsRaw = Math.floor(Number(row.claimedAtMs ?? 0) || 0);
  return {
    messageId,
    title: cleanText(row.title, 120),
    body: cleanText(row.body, 1200),
    coins,
    claimed: row.claimed === true,
    claimedAtMs: claimedAtMsRaw > 0 ? claimedAtMsRaw : null,
  };
}

function normalizeNotification(id: string, data: Record<string, unknown>): UserNotification {
  const nav = parseUserNotificationNav(data.nav);
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
const locallyReadIdsByOwner = new Map<string, Set<string>>();
const locallyDeletedIdsByOwner = new Map<string, Set<string>>();
let legacyCacheCleanupStarted = false;

function notificationIdSet(map: Map<string, Set<string>>, ownerUid: string): Set<string> {
  const existing = map.get(ownerUid);
  if (existing) return existing;
  const created = new Set<string>();
  map.set(ownerUid, created);
  return created;
}

function applyOwnerNotificationOverrides(ownerUid: string, list: readonly UserNotification[]): UserNotification[] {
  const readIds = locallyReadIdsByOwner.get(ownerUid);
  const deletedIds = locallyDeletedIdsByOwner.get(ownerUid);
  return list
    .filter((row) => !deletedIds?.has(row.id))
    .map((row) => readIds?.has(row.id) && !row.read ? { ...row, read: true } : row);
}

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
    locallyReadIdsByOwner.delete(oldestOwnerUid);
    locallyDeletedIdsByOwner.delete(oldestOwnerUid);
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
    const stored = parsed.filter((row) =>
      row && typeof row === 'object' && typeof row.id === 'string') as UserNotification[];
    const list = applyOwnerNotificationOverrides(ownerUid, onlyVisibleUserNotifications(stored));
    rememberOwnerCache(ownerUid, list);
    if (list.length !== stored.length) {
      // Physically purge retired/unknown records from the account-scoped cache
      // so they cannot return after a restart or count as unread offline.
      AsyncStorage.setItem(ownerStorageKey(CACHE_KEY_PREFIX, ownerUid), JSON.stringify(list)).catch(() => {});
    }
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

function writeCache(ownerUid: string, list: UserNotification[]): UserNotification[] {
  const visible = applyOwnerNotificationOverrides(ownerUid, onlyVisibleUserNotifications(list));
  rememberOwnerCache(ownerUid, visible);
  AsyncStorage.setItem(ownerStorageKey(CACHE_KEY_PREFIX, ownerUid), JSON.stringify(visible)).catch(() => {});
  return visible;
}

async function updateOwnerCache(
  ownerUid: string,
  update: (list: readonly UserNotification[]) => UserNotification[],
): Promise<void> {
  const current = cachedMemoryByOwner.get(ownerUid) ?? await readCachedUserNotifications();
  if (await getNotificationOwnerUid() !== ownerUid) return;
  writeCache(ownerUid, update(current));
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
  return list.reduce(
    (acc, row) => acc + (isUserNotificationVisible(row) && !row.read ? 1 : 0),
    0,
  );
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
      const list = onlyVisibleUserNotifications(
        (snap.docs || []).map((doc: any) => normalizeNotification(doc.id, doc.data?.() || {})),
      );
      const cachedList = writeCache(ownerUid, list);
      await writeLastRefreshMs(ownerUid, now);
      return cachedList;
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

/** Пометить события прочитанными (батчем; правила пускают только read/readAt/updatedAt). */
export async function markUserNotificationsRead(ids: string[]): Promise<void> {
  const normalizedIds = new Set(ids.slice(0, MAX_NOTIFICATIONS).map((id) => String(id || '').trim()).filter(Boolean));
  if (normalizedIds.size === 0) return;
  const stableUid = await getNotificationOwnerUid();
  if (!stableUid) return;
  const locallyReadIds = notificationIdSet(locallyReadIdsByOwner, stableUid);
  normalizedIds.forEach((id) => locallyReadIds.add(id));
  const markCachedRowsRead = (list: readonly UserNotification[]) => list.map((row) => (
    normalizedIds.has(row.id) ? { ...row, read: true } : row
  ));
  await updateOwnerCache(stableUid, markCachedRowsRead);
  const db = getFirestore();
  if (!db) return;
  const now = Date.now();
  try {
    const batch = db.batch();
    normalizedIds.forEach((id) => {
      const ref = db.collection('users').doc(stableUid).collection('notifications').doc(id);
      batch.update(ref, { read: true, readAt: now, updatedAt: now });
    });
    await batch.commit();
  } catch {
    // best-effort: непрочитанность догонит следующий снапшот
  } finally {
    await updateOwnerCache(stableUid, markCachedRowsRead);
  }
}

export async function deleteUserNotification(id: string): Promise<void> {
  const notificationId = String(id || '').trim();
  if (!notificationId) return;
  const stableUid = await getNotificationOwnerUid();
  if (!stableUid) return;
  notificationIdSet(locallyDeletedIdsByOwner, stableUid).add(notificationId);
  const removeCachedRow = (list: readonly UserNotification[]) => list.filter((row) => row.id !== notificationId);
  await updateOwnerCache(stableUid, removeCachedRow);
  const db = getFirestore();
  if (!db) return;
  try {
    await db.collection('users').doc(stableUid).collection('notifications').doc(notificationId).delete();
  } catch {
    // Keep the user's explicit local deletion even while offline.
  } finally {
    await updateOwnerCache(stableUid, removeCachedRow);
  }
}

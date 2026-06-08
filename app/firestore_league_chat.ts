import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { ensureAnonUser, ensureStableAuthLink } from './cloud_sync';
import { getWeekId } from './league_engine';
import { moderateLeagueChatMessage, sanitizeLeagueChatText } from './league_chat_moderation';

const CHAT_COLLECTION = 'league_chat_messages';
const BLOCKS_KEY = 'league_chat_blocked_users_v1';
const ROOM_CACHE_KEY = 'league_chat_room_cache_v1';
const ROOM_AUTH_CACHE_PREFIX = 'league_chat_room_auth_v1:';
const ROOM_AUTH_TTL_MS = 6 * 60 * 60 * 1000;
const MESSAGES_CACHE_PREFIX = 'league_chat_messages_cache_v1:';
const SEND_THROTTLE_MS = 12_000;
const MAX_VISIBLE_MESSAGES = 80;
const FUNCTIONS_REGION = 'us-central1';

let lastSendAt = 0;
let cachedRoomMemory: LeagueChatRoom | null = null;
const cachedMessagesMemory: Record<string, LeagueChatMessage[]> = {};

export interface LeagueChatRoom {
  groupId: string;
  weekId: string;
  leagueId: number;
}

// Системная логика чата вынесена в отдельный лёгкий модуль (без firebase),
// чтобы её можно было импортировать в тестах/UI без тяжёлых зависимостей.
export {
  isSystemLeagueChatMessage,
  LEAGUE_CHAT_SYSTEM_UID,
  type LeagueChatSystemType,
} from './league_chat_system';
import type { LeagueChatSystemType } from './league_chat_system';

export interface LeagueChatMessage {
  id: string;
  groupId: string;
  weekId: string;
  leagueId: number;
  authorUid: string;
  authorName: string;
  authorAvatar?: string;
  authorAura?: string;
  text: string;
  status: 'visible' | 'review' | 'blocked' | 'deleted';
  reportCount?: number;
  createdAt: number;
  /** 'system' — служебное событие лиги (рендерится по центру, мельче, с иконкой). По умолчанию 'user'. */
  kind?: 'user' | 'system';
  /** Тип системного события (только при kind === 'system'). Управляет иконкой в UI. */
  systemType?: LeagueChatSystemType;
}

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    return firestore();
  } catch {
    return null;
  }
};

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name);
}

function sameRoom(a: LeagueChatRoom | null | undefined, b: LeagueChatRoom | null | undefined): boolean {
  return !!a && !!b && a.groupId === b.groupId && a.weekId === b.weekId && a.leagueId === b.leagueId;
}

function normalizeRoom(value: unknown): LeagueChatRoom | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<LeagueChatRoom>;
  const groupId = typeof data.groupId === 'string' ? data.groupId.trim() : '';
  const weekId = typeof data.weekId === 'string' ? data.weekId.trim() : '';
  const leagueId = Math.trunc(Number(data.leagueId) || 0);
  if (!groupId || weekId !== getWeekId()) return null;
  return { groupId, weekId, leagueId };
}

function roomMessagesCacheKey(room: LeagueChatRoom): string {
  return `${MESSAGES_CACHE_PREFIX}${room.weekId}:${room.groupId}`;
}

function roomAuthorizationCacheKey(room: LeagueChatRoom): string {
  return `${ROOM_AUTH_CACHE_PREFIX}${room.weekId}:${room.leagueId}:${room.groupId}`;
}

function normalizeMessages(value: unknown, room: LeagueChatRoom): LeagueChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row): row is LeagueChatMessage => {
      if (!row || typeof row !== 'object') return false;
      const m = row as Partial<LeagueChatMessage>;
      return (
        typeof m.id === 'string' &&
        m.groupId === room.groupId &&
        m.weekId === room.weekId &&
        typeof m.authorUid === 'string' &&
        typeof m.text === 'string' &&
        typeof m.createdAt === 'number'
      );
    })
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-MAX_VISIBLE_MESSAGES);
}

export function getCachedLeagueChatRoomSync(): LeagueChatRoom | null {
  const room = normalizeRoom(cachedRoomMemory);
  cachedRoomMemory = room;
  return room;
}

export async function loadCachedLeagueChatRoom(): Promise<LeagueChatRoom | null> {
  const memory = getCachedLeagueChatRoomSync();
  if (memory) return memory;
  const raw = await AsyncStorage.getItem(ROOM_CACHE_KEY).catch(() => null);
  if (!raw) return null;
  try {
    const room = normalizeRoom(JSON.parse(raw));
    cachedRoomMemory = room;
    if (!room) await AsyncStorage.removeItem(ROOM_CACHE_KEY).catch(() => {});
    return room;
  } catch {
    await AsyncStorage.removeItem(ROOM_CACHE_KEY).catch(() => {});
    return null;
  }
}

export async function cacheLeagueChatRoom(room: LeagueChatRoom): Promise<void> {
  const normalized = normalizeRoom(room);
  if (!normalized) return;
  cachedRoomMemory = normalized;
  await AsyncStorage.setItem(ROOM_CACHE_KEY, JSON.stringify(normalized)).catch(() => {});
}

export async function forgetCachedLeagueChatRoom(room?: LeagueChatRoom | null): Promise<void> {
  if (!room || sameRoom(cachedRoomMemory, room)) cachedRoomMemory = null;
  await AsyncStorage.removeItem(ROOM_CACHE_KEY).catch(() => {});
}

export function getCachedLeagueChatMessagesSync(room: LeagueChatRoom): LeagueChatMessage[] {
  const rows = normalizeMessages(cachedMessagesMemory[roomMessagesCacheKey(room)], room);
  cachedMessagesMemory[roomMessagesCacheKey(room)] = rows;
  return rows;
}

export async function loadCachedLeagueChatMessages(room: LeagueChatRoom): Promise<LeagueChatMessage[]> {
  const memory = getCachedLeagueChatMessagesSync(room);
  if (memory.length > 0) return memory;
  const key = roomMessagesCacheKey(room);
  const raw = await AsyncStorage.getItem(key).catch(() => null);
  if (!raw) return [];
  try {
    const rows = normalizeMessages(JSON.parse(raw), room);
    cachedMessagesMemory[key] = rows;
    return rows;
  } catch {
    await AsyncStorage.removeItem(key).catch(() => {});
    return [];
  }
}

async function cacheLeagueChatMessages(room: LeagueChatRoom, messages: LeagueChatMessage[]): Promise<void> {
  const rows = normalizeMessages(messages, room);
  const key = roomMessagesCacheKey(room);
  cachedMessagesMemory[key] = rows;
  await AsyncStorage.setItem(key, JSON.stringify(rows)).catch(() => {});
}

async function loadCachedLeagueChatAuthorization(room: LeagueChatRoom, stableId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(roomAuthorizationCacheKey(room)).catch(() => null);
  if (!raw) return false;
  let authorizedAt = 0;
  let cachedStableId = '';
  try {
    const parsed = JSON.parse(raw);
    authorizedAt = Number(parsed?.authorizedAt || 0);
    cachedStableId = String(parsed?.stableId || '');
  } catch {
    authorizedAt = Number(raw);
  }
  if (!Number.isFinite(authorizedAt) || Date.now() - authorizedAt > ROOM_AUTH_TTL_MS) {
    await forgetCachedLeagueChatAuthorization(room);
    return false;
  }
  if (cachedStableId && cachedStableId !== stableId) return false;
  return true;
}

async function cacheLeagueChatAuthorization(room: LeagueChatRoom, stableId: string): Promise<void> {
  await AsyncStorage.setItem(
    roomAuthorizationCacheKey(room),
    JSON.stringify({ authorizedAt: Date.now(), stableId }),
  ).catch(() => {});
}

export async function forgetCachedLeagueChatAuthorization(room: LeagueChatRoom): Promise<void> {
  await AsyncStorage.removeItem(roomAuthorizationCacheKey(room)).catch(() => {});
}

export async function authorizeLeagueChatRoom(room: LeagueChatRoom): Promise<'authorized' | 'forbidden' | 'unavailable'> {
  if (!getFirestore()) return 'unavailable';
  const normalized = normalizeRoom(room);
  if (!normalized) return 'forbidden';
  try {
    const stableId = await ensureAnonUser();
    if (!stableId) return 'unavailable';
    if (await loadCachedLeagueChatAuthorization(normalized, stableId)) {
      await cacheLeagueChatRoom(normalized);
      return 'authorized';
    }
    await ensureStableAuthLink().catch(() => false);
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = callable<LeagueChatRoom & { stableId?: string }, { ok: boolean }>('leagueChatAuthorizeRoom');
    await fn({ ...normalized, stableId });
    await cacheLeagueChatRoom(normalized);
    await cacheLeagueChatAuthorization(normalized, stableId);
    return 'authorized';
  } catch (e: any) {
    const code = String(e?.code || e?.message || '');
    if (
      code.includes('permission-denied') ||
      code.includes('not-found') ||
      code.includes('invalid-argument')
    ) {
      await forgetCachedLeagueChatAuthorization(normalized);
      return 'forbidden';
    }
    return 'unavailable';
  }
}

export async function resolveMyLeagueChatRoom(): Promise<LeagueChatRoom | null> {
  const db = getFirestore();
  if (!db) return null;
  const uid = await ensureAnonUser().catch(() => null);
  if (!uid) return null;
  await ensureStableAuthLink().catch(() => false);
  const snap = await db.collection('leaderboard').doc(uid).get().catch(() => null);
  const data = snap?.exists ? snap.data() : null;
  const groupId = typeof data?.groupId === 'string' ? data.groupId : '';
  const weekId = typeof data?.groupWeekId === 'string' ? data.groupWeekId : getWeekId();
  const leagueId = Math.trunc(Number(data?.leagueId) || 0);
  if (!groupId || weekId !== getWeekId()) return null;
  const room = { groupId, weekId, leagueId };
  await cacheLeagueChatRoom(room);
  return room;
}

export async function getBlockedLeagueChatUsers(): Promise<Record<string, boolean>> {
  const raw = await AsyncStorage.getItem(BLOCKS_KEY).catch(() => null);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function blockLeagueChatUser(uid: string): Promise<void> {
  const cur = await getBlockedLeagueChatUsers();
  cur[uid] = true;
  await AsyncStorage.setItem(BLOCKS_KEY, JSON.stringify(cur));
}

export function subscribeLeagueChatMessages(
  room: LeagueChatRoom,
  onNext: (messages: LeagueChatMessage[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const db = getFirestore();
  if (!db) {
    onNext([]);
    return () => {};
  }
  return db
    .collection(CHAT_COLLECTION)
    .where('groupId', '==', room.groupId)
    .where('weekId', '==', room.weekId)
    .where('status', '==', 'visible')
    .orderBy('createdAt', 'desc')
    .limit(MAX_VISIBLE_MESSAGES)
    .onSnapshot(
      (snap: any) => {
        const rows = snap.docs
          .map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) }) as LeagueChatMessage)
          .sort((a: LeagueChatMessage, b: LeagueChatMessage) => a.createdAt - b.createdAt);
        void cacheLeagueChatMessages(room, rows);
        onNext(rows);
      },
      (err: unknown) => onError?.(err),
    );
}

export async function sendLeagueChatMessage(room: LeagueChatRoom, text: string): Promise<'sent' | 'review' | 'blocked' | 'throttled' | 'offline'> {
  const now = Date.now();
  if (now - lastSendAt < SEND_THROTTLE_MS) return 'throttled';

  const cleanText = sanitizeLeagueChatText(text);
  if (!cleanText) return 'blocked';
  const localModeration = moderateLeagueChatMessage(cleanText);
  if (localModeration.status === 'blocked') return 'blocked';

  lastSendAt = now;
  try {
    const stableId = await ensureAnonUser();
    if (!stableId) return 'offline';
    await ensureStableAuthLink().catch(() => false);
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = callable<
      { groupId: string; weekId: string; leagueId: number; stableId?: string; text: string; platform: string; appVersion: string },
      { ok: boolean; status: 'sent' | 'review' | 'blocked'; messageId?: string }
    >('leagueChatSendMessage');
    const res = await fn({
      groupId: room.groupId,
      weekId: room.weekId,
      leagueId: room.leagueId,
      stableId,
      text: cleanText,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version ?? 'unknown',
    });
    if (res.data.status === 'sent') return 'sent';
    if (res.data.status === 'review') return 'review';
    return 'blocked';
  } catch (e: any) {
    const code = String(e?.code || e?.message || '');
    if (code.includes('resource-exhausted') || code.includes('send_throttled')) return 'throttled';
    return 'offline';
  }
}

export async function reportLeagueChatMessage(message: LeagueChatMessage, reason: string): Promise<void> {
  if (!getFirestore()) return;
  const stableId = await ensureAnonUser();
  await ensureStableAuthLink().catch(() => false);
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = callable<{ messageId: string; stableId?: string | null; reason: string }, { ok: boolean }>('leagueChatReportMessage');
  await fn({ messageId: message.id, stableId, reason });
}

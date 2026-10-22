import AsyncStorage from '@react-native-async-storage/async-storage';
import * as firestoreModule from '@react-native-firebase/firestore';
import { rnfbInstance } from './rnfb_modular';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureStableAuthLink } from './cloud_sync';
import { getCanonicalUserId } from './user_id_policy';
import { DebugLogger, reportSwallowed, swallowError } from './debug-logger';
import { resolveArenaStudyTarget, type ArenaStudyTarget } from '../modules/arena/target_registry';
import type { ReportRewardBundle } from './report_reward_bundle';
import { logFriendAdd } from './friend_add_trace';

/**
 * Клиентский слой единого центра событий (колокольчик на главной).
 * Данные: users/{stableUid}/notifications — пишут ТОЛЬКО cloud functions
 * (functions/src/user_notifications.ts), клиент читает/помечает/удаляет.
 */

const LEGACY_CACHE_KEY = 'user_notifications_cache_v1';
const LEGACY_LAST_REFRESH_KEY = 'user_notifications_last_refresh_ms_v1';
const CACHE_KEY_PREFIX = 'user_notifications_cache_v2:';
const LAST_REFRESH_KEY_PREFIX = 'user_notifications_last_refresh_ms_v2:';
// зачем (Q44, координатор 01.10): первая страница 50 → 20 — у «Активности» есть
// «Показать ещё» («Дизайн»), старое догружается по запросу; на старте 20 чтений вместо 50.
const MAX_NOTIFICATIONS = 20;
// Пометка прочитанным не зависит от размера первой страницы: после «Показать ещё»
// на экране бывает больше строк, батч Firestore держит до 500 операций.
const MAX_MARK_READ_IDS = 200;
const MAX_MEMORY_OWNERS = 2;
/**
 * PM-172: страница «Активности» при догрузке старых событий (курсор по createdAt).
 * зачем: на старте читаем только первую страницу (MAX_NOTIFICATIONS), старое —
 * только по запросу экрана; в кэше держим не больше USER_NOTIFICATIONS_CACHE_MAX.
 */
export const USER_NOTIFICATIONS_PAGE_SIZE = 20;
const USER_NOTIFICATIONS_CACHE_MAX = 200;
/**
 * PM-172: даже «принудительное» обновление не чаще раза в это окно.
 * зачем: баннер ответа на главной и открытие центра просили force на КАЖДОЕ
 * появление — 50 чтений за каждый заход на главную. Свежее 30 секунд — то же самое.
 */
export const USER_NOTIFICATIONS_FORCE_FLOOR_MS = 30_000;
const LOG = '[ACTIVITY-FEED]';

export type UserNotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'activity_like'
  | 'arena_partner_invite'
  | 'arena_partner_nudge'
  | 'friend_nudge'
  | 'arena_friend_invite'
  | 'arena_friend_accepted'
  | 'arena_friend_declined'
  | 'arena_friend_cancelled'
  | 'arena_friend_expired'
  | 'report_reply'
  | 'pack_comment';

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

/**
 * Deep-link к отклику под своим набором (владелец 2026-09-17: «сразу перейти
 * к этому комментарию без открытия промежуточных экранов»). Экран набора
 * (flashcards_collection.tsx) сам открывает шторку и подсвечивает строку —
 * см. ?openComments=1&commentId=.
 */
export interface UserNotificationNavPackComment {
  kind: 'pack_comment';
  packId: string;
  commentId: string;
}

export type UserNotificationFriendEventAction =
  | 'high_five'
  | 'study_invite'
  | 'duel_invite'
  | 'duel_state'
  | 'gift'
  | 'lesson_invite'
  // «Дуэль на 5 фраз» (идея 3): не путать с duel_invite/duel_state удалённой Арены (D83)
  | 'duel_challenge'
  | 'duel_result'
  | 'duel_declined';

/** Вызов на «Дуэль на 5 фраз» (идея 3, формат 1 · ЯДРО 22.10): id фраз — тексты берём из курса на телефоне. */
export type UserNotificationDuelChallenge = Readonly<{ duelId: string; expiresAtMs: number; phraseIds: readonly string[] }>;

/** Итог дуэли у вызвавшего: исход с его стороны, счёт обоих; свои отметки и id фраз — если сервер их положил. */
export type UserNotificationDuelResult = Readonly<{
  duelId: string;
  outcome: 'win' | 'loss' | 'draw';
  mine: Readonly<{ correct: number; elapsedMs: number; results: readonly boolean[] | null }>;
  theirs: Readonly<{ correct: number; elapsedMs: number; results: readonly boolean[] }>;
  phraseIds: readonly string[] | null;
}>;

/**
 * «Урок вместе» (идея 2, формат 1 · ЯДРО 22.10): номера урока и занятия — «это занятие» в СВОЁМ курсе друга (языки у пары
 * могут отличаться, D188); lessonKey — только для журнала; expiresAtMs — полночь друга; minutes/stars — факты отправителя.
 */
export type UserNotificationLessonInvite = Readonly<{
  lessonOrdinal: number;
  sessionOrdinal: number;
  lessonKey?: string;
  expiresAtMs?: number;
  minutes?: number;
  stars?: number;
}>;

export interface UserNotificationNavFriendEvent {
  kind: 'friend_event';
  actorStableUid: string;
  eventId: string;
  action: UserNotificationFriendEventAction;
  inviteId?: string;
  lesson?: UserNotificationLessonInvite;
  /** Required for a direct Arena invite route; missing legacy rows open the hub. */
  studyTarget?: ArenaStudyTarget;
  duelChallenge?: UserNotificationDuelChallenge;
  duelResult?: UserNotificationDuelResult;
  /** duel_declined: какая дуэль закрыта отказом. */
  duelId?: string;
}

export type UserNotificationNav =
  | UserNotificationNavFriends
  | UserNotificationNavArenaPartner
  | UserNotificationNavFriendEvent
  | UserNotificationNavReportReply
  | UserNotificationNavPackComment;

export interface UserNotificationReportReply {
  messageId: string;
  title: string;
  body: string;
  /** v1 (спины/руны/жемчуг) у старых ответов, v2 (монеты) — с Q4 01.10. */
  rewardBundle: ReportRewardBundle;
  /** Legacy alias retained while cached v1 notifications age out. */
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

/**
 * Что показывает «Активность» (центр событий).
 * зачем (PM-167, D74/D83): Арена и Лиги удалены — их приглашения/ответы
 * (arena_partner_*, arena_friend_*) больше не создаются, а старые строки в базе
 * и в кэше остались. Типы в union оставлены только чтобы читать старые данные;
 * показ — по этому списку, всё прочее fail-closed.
 */
export const VISIBLE_USER_NOTIFICATION_TYPES: ReadonlySet<string> = new Set<UserNotificationType>([
  'friend_request',
  'friend_accepted',
  'activity_like',
  'friend_nudge',
  'report_reply',
  'pack_comment',
]);

/** PM-167: мёртвые действия друзей — подарки (PM-170) и дуэли Арены (D83). */
export const RETIRED_FRIEND_EVENT_ACTIONS: ReadonlySet<string> = new Set<UserNotificationFriendEventAction>([
  'gift',
  'duel_invite',
  'duel_state',
]);

export function isUserNotificationVisible(row: UserNotification): boolean {
  // Unknown/legacy types are fail-closed. In particular, cached tournament
  // bank notifications cannot reappear in the notification center.
  if (!row || !VISIBLE_USER_NOTIFICATION_TYPES.has(String(row.type || ''))) return false;
  const nav = row.nav;
  if (nav && nav.kind === 'friend_event' && RETIRED_FRIEND_EVENT_ACTIONS.has(nav.action)) return false;
  return true;
}

function onlyVisibleUserNotifications(list: readonly UserNotification[]): UserNotification[] {
  return list.filter(isUserNotificationVisible);
}

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // зачем (координатор §67): модульный экземпляр — без «use getApp()» на вызов.
    return rnfbInstance(firestoreModule, 'getFirestore');
  } catch (e) {
    console.warn('[ACTIVITY-FEED] firestore unavailable:', e instanceof Error ? e.message.slice(0, 80) : String(e).slice(0, 80)); // guard-ok: немой catch закрыт (аудит [AUTH-OPTIMISTIC] 17.10)
    return null;
  }
};

async function getNotificationOwnerUid(): Promise<string | null> {
  await ensureAnonUser();
  await ensureStableAuthLink().catch((error: unknown) => { reportSwallowed('user_notifications:getNotificationOwnerUid', error); return false; });
  const stableUid = await getCanonicalUserId().catch((error: unknown) => { reportSwallowed('user_notifications:getNotificationOwnerUid', error); return null; });
  return String(stableUid || '').trim() || null;
}

function cleanText(value: unknown, maxLen: number): string {
  return String(value ?? '').trim().slice(0, maxLen);
}

const intIn = (value: unknown, min: number, max: number): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : null;

/** Приглашение на занятие без номеров урока и занятия бесполезно — такую строку не берём (null). */
function parseLessonInvite(row: Record<string, unknown>): UserNotificationLessonInvite | null {
  const lessonOrdinal = intIn(row.lessonOrdinal, 1, 999);
  const sessionOrdinal = intIn(row.sessionOrdinal, 1, 999);
  if (lessonOrdinal === null || sessionOrdinal === null) return null;
  const lessonKey = cleanText(row.lessonKey, 160);
  const expiresAtMs = intIn(row.expiresAtMs, 1, Number.MAX_SAFE_INTEGER);
  // зачем (ЯДРО 22.10): числа телефона отправителя сервер только обрезает — здесь так же: вне пределов поле не берём
  const minutes = intIn(row.minutes, 0, 180);
  const stars = intIn(row.stars, 0, 999);
  return {
    lessonOrdinal,
    sessionOrdinal,
    ...(lessonKey ? { lessonKey } : {}),
    ...(expiresAtMs !== null ? { expiresAtMs } : {}),
    ...(minutes !== null ? { minutes } : {}),
    ...(stars !== null ? { stars } : {}),
  };
}

const FRIEND_EVENT_ACTIONS: ReadonlySet<string> = new Set<UserNotificationFriendEventAction>([
  'high_five',
  'study_invite',
  'duel_invite',
  'duel_state',
  'gift',
  'lesson_invite',
  'duel_challenge',
  'duel_result',
  'duel_declined',
]);

const DUEL_PHRASE_COUNT = 5;
const DUEL_MAX_ELAPSED_MS = 15 * 60 * 1000;

/** Ровно 5 разных id фраз ≤ 96 символов — иначе null (дуэль не открыть). */
function duelPhraseIds(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || value.length !== DUEL_PHRASE_COUNT) return null;
  const ids = value.map((id) => cleanText(id, 97));
  return ids.every((id) => id.length > 0 && id.length <= 96) && new Set(ids).size === DUEL_PHRASE_COUNT ? ids : null;
}

function duelResults(value: unknown): readonly boolean[] | null {
  return Array.isArray(value) && value.length === DUEL_PHRASE_COUNT && value.every((v) => typeof v === 'boolean') ? value as boolean[] : null;
}

function duelScore(value: unknown): Readonly<{ correct: number; elapsedMs: number }> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const correct = intIn(row.correct, 0, DUEL_PHRASE_COUNT);
  const elapsedMs = intIn(row.elapsedMs, 0, DUEL_MAX_ELAPSED_MS);
  return correct === null || elapsedMs === null ? null : { correct, elapsedMs };
}

/** Вызов без номера дуэли, срока или пяти фраз — сыграть нечего: строку не берём. */
function parseDuelChallenge(row: Record<string, unknown>): UserNotificationDuelChallenge | null {
  const duelId = cleanText(row.duelId, 160);
  const expiresAtMs = intIn(row.expiresAtMs, 1, Number.MAX_SAFE_INTEGER);
  const phraseIds = duelPhraseIds(row.phraseIds);
  return duelId && expiresAtMs !== null && phraseIds ? { duelId, expiresAtMs, phraseIds } : null;
}

/** Итог без исхода или счёта обоих — показать нечего; свои отметки и фразы — по возможности. */
function parseDuelResult(row: Record<string, unknown>): UserNotificationDuelResult | null {
  const duelId = cleanText(row.duelId, 160);
  const outcome = row.outcome === 'win' || row.outcome === 'loss' || row.outcome === 'draw' ? row.outcome : null;
  const mine = duelScore(row.mine);
  const theirs = duelScore(row.theirs);
  const theirResults = duelResults((row.theirs as Record<string, unknown> | undefined)?.results);
  if (!duelId || !outcome || !mine || !theirs || !theirResults) return null;
  return {
    duelId,
    outcome,
    mine: { ...mine, results: duelResults((row.mine as Record<string, unknown>).results) },
    theirs: { ...theirs, results: theirResults },
    phraseIds: duelPhraseIds(row.phraseIds),
  };
}

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
  if (kind === 'pack_comment') {
    const packId = cleanText(row.packId, 180);
    const commentId = cleanText(row.commentId, 180);
    return packId && commentId ? { kind: 'pack_comment', packId, commentId } : null;
  }
  if (kind !== 'friend_event') return null;
  const actorStableUid = cleanText(row.actorStableUid, 160);
  const eventId = cleanText(row.eventId, 160);
  const action = cleanText(row.action, 32);
  if (!actorStableUid || !eventId || !FRIEND_EVENT_ACTIONS.has(action)) return null;
  const inviteId = cleanText(row.inviteId, 256);
  const studyTarget = resolveArenaStudyTarget(row.studyTarget);
  const lesson = action === 'lesson_invite' ? parseLessonInvite(row) : null;
  if (action === 'lesson_invite' && !lesson) return null;
  // зачем (идея 3): строки дуэли разбираем на границе — у вызова и итога без полей играть и показывать нечего
  const duelChallenge = action === 'duel_challenge' ? parseDuelChallenge(row) : null;
  if (action === 'duel_challenge' && !duelChallenge) return null;
  const duelResult = action === 'duel_result' ? parseDuelResult(row) : null;
  if (action === 'duel_result' && !duelResult) return null;
  const duelId = action === 'duel_declined' ? cleanText(row.duelId, 160) : '';
  if (action === 'duel_declined' && !duelId) return null;
  return {
    kind: 'friend_event',
    actorStableUid,
    eventId,
    action: action as UserNotificationFriendEventAction,
    ...(inviteId ? { inviteId } : {}),
    ...(studyTarget ? { studyTarget } : {}),
    ...(lesson ? { lesson } : {}),
    ...(duelChallenge ? { duelChallenge } : {}),
    ...(duelResult ? { duelResult } : {}),
    ...(duelId ? { duelId } : {}),
  };
}

export function normalizeUserNotificationReportReply(value: unknown): UserNotificationReportReply | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const messageId = cleanText(row.messageId, 128);
  if (!messageId) return null;
  const coins = Math.max(0, Math.min(1, Math.floor(Number(row.coins ?? row.shards ?? 0) || 0)));
  const bundleRow = row.rewardBundle && typeof row.rewardBundle === 'object' && !Array.isArray(row.rewardBundle)
    ? row.rewardBundle as Record<string, unknown>
    : null;
  const severity = cleanText(bundleRow?.severity, 16);
  const tiers: Readonly<Record<string, readonly [number, number, number]>> = {
    none: [0, 0, 0], minor: [1, 300, 1], serious: [2, 600, 5], critical: [3, 1000, 10], legacy: [0, 0, 1],
  };
  // зачем: Q4 (координатор 01.10) — новые ответы несут награду в монетах (v2).
  const coinTiers: Readonly<Record<string, number>> = { none: 0, minor: 300, serious: 600, critical: 1000 };
  const tier = tiers[severity];
  const rewardBundle: ReportRewardBundle = bundleRow && Number(bundleRow.version) === 2
    && Object.prototype.hasOwnProperty.call(coinTiers, severity)
    && Number(bundleRow.coins) === coinTiers[severity]
    ? { version: 2, severity: severity as 'none' | 'minor' | 'serious' | 'critical', coins: coinTiers[severity] }
    : bundleRow && Number(bundleRow.version) === 1 && tier
    && Number(bundleRow.spins) === tier[0]
    && Number(bundleRow.runes) === tier[1]
    && Number(bundleRow.pearls) === tier[2]
    ? { version: 1, severity: severity as ReportRewardBundle['severity'], spins: tier[0], runes: tier[1], pearls: tier[2] }
    : coins === 1
      ? { version: 1, severity: 'legacy', spins: 0, runes: 0, pearls: 1 }
      : { version: 1, severity: 'none', spins: 0, runes: 0, pearls: 0 };
  const claimedAtMsRaw = Math.floor(Number(row.claimedAtMs ?? 0) || 0);
  return {
    messageId,
    title: cleanText(row.title, 120),
    body: cleanText(row.body, 1200),
    rewardBundle,
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
    reportReply: normalizeUserNotificationReportReply(data.reportReply),
    read: data.read === true,
    createdAt: Number(data.createdAt || 0),
  };
}

const cachedMemoryByOwner = new Map<string, UserNotification[]>();
const refreshInFlightByOwner = new Map<string, Promise<UserNotification[]>>();
const cacheReadInFlightByOwner = new Map<string, Promise<UserNotification[]>>();
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

// зачем (макет system.html «Точка — есть новое в Сообществе»): таббар узнаёт о
// свежих событиях друзей из ЭТОГО кэша — без своей подписки на Firestore.
const cacheListeners = new Set<(list: readonly UserNotification[]) => void>();

export function subscribeUserNotificationsCache(
  listener: (list: readonly UserNotification[]) => void,
): () => void {
  cacheListeners.add(listener);
  return () => { cacheListeners.delete(listener); };
}

/** События, которые живут во вкладке «Сообщество» (друзья, лайки активности). */
export const COMMUNITY_NOTIFICATION_TYPES: ReadonlySet<UserNotificationType> = new Set<UserNotificationType>([
  'friend_request',
  'friend_accepted',
  'activity_like',
  'friend_nudge',
]);

export function hasCommunityUnreadSince(list: readonly UserNotification[], sinceMs: number): boolean {
  return list.some((row) => !row.read
    && COMMUNITY_NOTIFICATION_TYPES.has(row.type)
    && isUserNotificationVisible(row)
    && Number(row.createdAt || 0) > sinceMs);
}

function rememberOwnerCache(ownerUid: string, list: UserNotification[]): void {
  cachedMemoryByOwner.delete(ownerUid);
  cachedMemoryByOwner.set(ownerUid, list);
  for (const listener of cacheListeners) listener(list);
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
  void AsyncStorage.multiRemove([LEGACY_CACHE_KEY, LEGACY_LAST_REFRESH_KEY]).catch(swallowError('user_notifications:cleanupUnownedLegacyCache'));
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
  // зачем (fin7, 04.10): на старте кэш уведомлений читался 6 раз подряд (колокольчик, точка вкладки «Сообщество» и др. ждут владельца
  // раньше, чем появится копия в памяти) — шесть вызовов в очереди хранилища вместо одного. Один общий проход на владельца.
  const inFlight = cacheReadInFlightByOwner.get(ownerUid);
  if (inFlight) return inFlight;
  const read = readCachedUserNotificationsFromStorage(ownerUid).finally(() => {
    if (cacheReadInFlightByOwner.get(ownerUid) === read) cacheReadInFlightByOwner.delete(ownerUid);
  });
  cacheReadInFlightByOwner.set(ownerUid, read);
  return read;
}

async function readCachedUserNotificationsFromStorage(ownerUid: string): Promise<UserNotification[]> {
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
      AsyncStorage.setItem(ownerStorageKey(CACHE_KEY_PREFIX, ownerUid), JSON.stringify(list)).catch(swallowError('user_notifications:readCachedUserNotifications'));
    }
    return list;
  } catch (error: unknown) {
    console.warn('[USER-NOTIFICATIONS] cache read failed', { message: error instanceof Error ? error.message : String(error) });
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
  AsyncStorage.setItem(ownerStorageKey(CACHE_KEY_PREFIX, ownerUid), JSON.stringify(visible)).catch(swallowError('user_notifications:writeCache'));
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
  } catch (e) {
    console.warn('[ACTIVITY-FEED] last refresh read failed — читаем как первый раз:', e instanceof Error ? e.message.slice(0, 80) : String(e).slice(0, 80)); // guard-ok: немой catch закрыт (аудит [AUTH-OPTIMISTIC] 17.10)
    return 0;
  }
}

async function writeLastRefreshMs(ownerUid: string, ms: number): Promise<void> {
  await AsyncStorage.setItem(
    ownerStorageKey(LAST_REFRESH_KEY_PREFIX, ownerUid),
    String(Math.max(0, Math.floor(ms))),
  ).catch(swallowError('user_notifications:writeLastRefreshMs'));
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
  /** Проба уже увидела новый документ — читать без порога 30 с (иначе свежая заявка ждала бы ещё минуту). */
  newerSeen?: boolean;
} = {}): Promise<UserNotification[]> {
  cleanupUnownedLegacyCache();
  const ownerUid = await getNotificationOwnerUid();
  if (!ownerUid) return [];
  const existingRefresh = refreshInFlightByOwner.get(ownerUid);
  if (existingRefresh) return existingRefresh;

  const refresh = (async (): Promise<UserNotification[]> => {
    const now = Date.now();
    const requestedIntervalMs = Math.max(0, Math.floor(Number(options.minIntervalMs ?? 0)) || 0);
    // зачем (PM-172): force — это «не ждать TTL экрана», но не «читать заново каждый раз».
    const minIntervalMs = options.newerSeen
      ? 0
      : options.force
      ? USER_NOTIFICATIONS_FORCE_FLOOR_MS
      : Math.max(requestedIntervalMs, USER_NOTIFICATIONS_FORCE_FLOOR_MS);
    const lastRefreshMs = await readLastRefreshMs(ownerUid);
    const sinceLastMs = lastRefreshMs > 0 ? now - lastRefreshMs : null;
    if (sinceLastMs !== null && sinceLastMs >= 0 && sinceLastMs < minIntervalMs) {
      console.log(LOG, 'refresh skipped: ttl', { force: options.force === true, sinceLastMs, minIntervalMs });
      const currentOwnerUid = await getNotificationOwnerUid();
      return currentOwnerUid === ownerUid ? (cachedMemoryByOwner.get(ownerUid) ?? readCachedUserNotifications()) : [];
    }

    const query = getNotificationsQuery(ownerUid);
    if (!query) {
      console.log(LOG, 'refresh skipped: no firestore (expo go / sync off)');
      return readCachedUserNotifications();
    }
    try {
      const startedAt = Date.now();
      const snap = await query.get();
      const currentOwnerUid = await getNotificationOwnerUid();
      if (currentOwnerUid !== ownerUid) {
        console.log(LOG, 'refresh dropped: account changed during request');
        return [];
      }
      const docs = snap.docs || [];
      const list = onlyVisibleUserNotifications(
        docs.map((doc: any) => normalizeNotification(doc.id, doc.data?.() || {})),
      );
      console.log(LOG, 'refresh ok', { reads: docs.length, visible: list.length, tookMs: Date.now() - startedAt, force: options.force === true });
      const cachedList = writeCache(ownerUid, list);
      await writeLastRefreshMs(ownerUid, now);
      return cachedList;
    } catch (error: unknown) {
      console.warn(LOG, 'refresh failed, serving cache', { message: error instanceof Error ? error.message : String(error) });
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

/** Проба «есть ли новое уведомление» не чаще раза в минуту на владельца. */
export const USER_NOTIFICATIONS_PROBE_MIN_INTERVAL_MS = 60_000;
const lastProbeAtByOwner = new Map<string, number>();

/**
 * Дешёвая проверка новых уведомлений: один документ (самый свежий) вместо всего списка.
 *
 * зачем (владелец 17.10 «друзья должны находиться мгновенно, а не через полчаса»): колокольчик перечитывал уведомления
 * не чаще раза в 12 часов, и заявка в друзья, которую сервер уже положил в notifications, не появлялась часами. Проба
 * стоит 1 чтение и делается не чаще раза в минуту; полный список читается только когда пришло что-то новое.
 * Возвращает обновлённый список, если было новое, иначе null.
 */
export async function probeUserNotificationsHead(
  reason: string,
  options: Readonly<{ minIntervalMs?: number }> = {},
): Promise<UserNotification[] | null> {
  // зачем (владелец 21.10, №45 шаг 6; Ревизор п.4): Главная пробует реже (5 мин), «Друзья» — прежняя минута (правило 17.10).
  const minIntervalMs = options.minIntervalMs ?? USER_NOTIFICATIONS_PROBE_MIN_INTERVAL_MS;
  const ownerUid = await getNotificationOwnerUid();
  if (!ownerUid) {
    logFriendAdd('bell_probe', { reason, decision: 'no_owner' });
    return null;
  }
  const now = Date.now();
  const lastProbeAt = lastProbeAtByOwner.get(ownerUid) ?? 0;
  if (now - lastProbeAt < minIntervalMs) {
    logFriendAdd('bell_probe', { reason, decision: 'ttl_skip', sinceLastMs: now - lastProbeAt, minIntervalMs });
    return null;
  }
  const db = getFirestore();
  if (!db) {
    logFriendAdd('bell_probe', { reason, decision: 'no_firestore' });
    return null;
  }
  lastProbeAtByOwner.set(ownerUid, now);
  try {
    const startedAt = Date.now();
    const snap = await db
      .collection('users')
      .doc(ownerUid)
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    if (await getNotificationOwnerUid() !== ownerUid) {
      logFriendAdd('bell_probe', { reason, decision: 'owner_changed' });
      return null;
    }
    const head = (snap.docs || [])[0];
    const headCreatedAt = head ? Number(head.data?.()?.createdAt || 0) : 0;
    const cached = cachedMemoryByOwner.get(ownerUid) ?? await readCachedUserNotifications();
    const cachedNewest = cached.reduce((max, row) => Math.max(max, Number(row.createdAt) || 0), 0);
    const cachedHasHead = head ? cached.some((row) => row.id === head.id) : true;
    const isNewer = Boolean(head) && (headCreatedAt > cachedNewest || !cachedHasHead);
    logFriendAdd('bell_probe', { reason, decision: isNewer ? 'network_newer' : 'network_same', headType: head ? String(head.data?.()?.type ?? '') : null, ms: Date.now() - startedAt });
    if (!isNewer) return null;
    return await refreshUserNotificationsOnce({ force: true, newerSeen: true });
  } catch (error: unknown) {
    logFriendAdd('bell_probe', { reason, decision: 'failed', message: error instanceof Error ? error.message.slice(0, 80) : String(error).slice(0, 80) });
    return null;
  }
}

export type OlderUserNotificationsPage = Readonly<{
  /** Весь список «Активности» после догрузки (первая страница + старые). */
  list: UserNotification[];
  /** Сколько строк пришло этой страницей (до фильтра мёртвых типов). */
  fetched: number;
  /** Есть ли ещё старее — по полноте страницы. */
  hasMore: boolean;
}>;

/**
 * PM-172: догрузить события старше последнего показанного (курсор = createdAt).
 * Вызывается ТОЛЬКО экраном по прокрутке/кнопке «Показать ещё» — на старте не нужно.
 * Без realtime: одно чтение страницы (limit), кэш дополняется и обрезается.
 */
export async function loadOlderUserNotifications(): Promise<OlderUserNotificationsPage> {
  const ownerUid = await getNotificationOwnerUid();
  if (!ownerUid) {
    console.log(LOG, 'older skipped: no owner');
    return { list: [], fetched: 0, hasMore: false };
  }
  const current = cachedMemoryByOwner.get(ownerUid) ?? await readCachedUserNotifications();
  const oldest = current.reduce((min, row) => Math.min(min, Number(row.createdAt) || Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
  const db = getFirestore();
  if (!db || current.length === 0 || oldest === Number.MAX_SAFE_INTEGER) {
    console.log(LOG, 'older skipped', { hasDb: Boolean(db), cached: current.length });
    return { list: current, fetched: 0, hasMore: false };
  }
  try {
    const snap = await db.collection('users').doc(ownerUid).collection('notifications')
      .orderBy('createdAt', 'desc')
      .startAfter(oldest)
      .limit(USER_NOTIFICATIONS_PAGE_SIZE)
      .get();
    if (await getNotificationOwnerUid() !== ownerUid) {
      console.log(LOG, 'older dropped: account changed during request');
      return { list: [], fetched: 0, hasMore: false };
    }
    const docs = snap.docs || [];
    const older = docs.map((doc: any) => normalizeNotification(doc.id, doc.data?.() || {}));
    const known = new Set(current.map((row) => row.id));
    const merged = [...current, ...older.filter((row: UserNotification) => !known.has(row.id))]
      .slice(0, USER_NOTIFICATIONS_CACHE_MAX);
    const list = writeCache(ownerUid, merged);
    const hasMore = docs.length >= USER_NOTIFICATIONS_PAGE_SIZE && list.length < USER_NOTIFICATIONS_CACHE_MAX;
    console.log(LOG, 'older ok', { reads: docs.length, total: list.length, hasMore });
    return { list, fetched: docs.length, hasMore };
  } catch (error: unknown) {
    console.warn(LOG, 'older failed', { message: error instanceof Error ? error.message : String(error) });
    return { list: current, fetched: 0, hasMore: true };
  }
}

/** Пометить события прочитанными (батчем; правила пускают только read/readAt/updatedAt). */
export async function markUserNotificationsRead(ids: string[]): Promise<void> {
  const normalizedIds = new Set(ids.slice(0, MAX_MARK_READ_IDS).map((id) => String(id || '').trim()).filter(Boolean));
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
  } catch (e) {
      // best-effort: непрочитанность догонит следующий снапшот
      DebugLogger.error('user_notifications:ref', e instanceof Error ? e : new Error(String(e)), 'warning');
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
  } catch (e) {
      // Keep the user's explicit local deletion even while offline.
      DebugLogger.error('user_notifications:db', e instanceof Error ? e : new Error(String(e)), 'warning');
    } finally {
    await updateOwnerCache(stableUid, removeCachedRow);
  }
}

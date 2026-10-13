import { readStoredItem } from './storage_snapshot';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO, IS_STORE_RELEASE } from './config';
import { emitAppEvent } from './events';
import { getCanonicalUserId } from './user_id_policy';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { VIP_SURVEY_ID } from './vip_survey_content';
import type { Lang } from '../constants/i18n';
import { normalizeReportRewardBundle, type ReportRewardBundle } from './report_reward_bundle';
import { DebugLogger, reportSwallowed, swallowError } from './debug-logger';
import { rnfbInstance } from './rnfb_modular';

export type AppMessageReaction = 'like' | 'dislike';
export type AppMessageAudience = 'all' | 'free' | 'premium';
export type AppMessageLang = Lang;
export type AppMessageKind = 'message' | 'poll' | 'vip_survey' | 'report_reply' | 'personal_admin_message';
export type PersonalAppMessageDeliveryMode = 'inbox' | 'next_login_modal';
export type AppMessageDeliverySurface = 'inbox' | 'settings';
export type SettingsMessageSlot = 'top' | 'bottom';
export type AppMessageVoteMode = 'changeable' | 'fixed';

export const APP_MESSAGES_COLLECTION = 'app_messages';
export const APP_MESSAGE_STATES_COLLECTION = 'app_message_states';
/** Персональные сообщения юзеру (ответы на репорты) — пишет ТОЛЬКО CF adminReplyToReport. */
export const USER_MESSAGES_COLLECTION = 'user_messages';
export const APP_MESSAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Ответ на репорт живёт дольше рассылок: в нём может лежать невостребованная награда. */
export const REPORT_REPLY_TTL_MS = 365 * 24 * 60 * 60 * 1000;
export const APP_MESSAGES_BACKGROUND_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const APP_MESSAGES_CACHE_KEY_PREFIX = 'app_messages_cache_v2';
const APP_MESSAGES_LAST_BACKGROUND_REFRESH_KEY_PREFIX = 'app_messages_last_background_refresh_ms_v2';
const LEGACY_APP_MESSAGES_CACHE_KEY = 'app_messages_cache_v1';
const LEGACY_APP_MESSAGES_LAST_BACKGROUND_REFRESH_KEY = 'app_messages_last_background_refresh_ms_v1';
const LOCAL_APP_MESSAGES_KEY_PREFIX = 'app_messages_local_preview_v2';
const LOCAL_APP_MESSAGE_STATES_KEY_PREFIX = 'app_message_local_preview_states_v2';
const LEGACY_LOCAL_APP_MESSAGES_KEY = 'app_messages_local_preview_v1';
const LEGACY_LOCAL_APP_MESSAGE_STATES_KEY = 'app_message_local_preview_states_v1';
const APP_MESSAGES_BACKGROUND_FETCH_LIMIT = 80;
const REPORT_REPLY_PENDING_CLAIMS_KEY_PREFIX = 'app_messages_report_reply_pending_claims_v2';
// Kept untouched: v1 has no owner metadata, so assigning it to the next signed-in account is unsafe.
export const LEGACY_REPORT_REPLY_PENDING_CLAIMS_KEY = 'app_messages_report_reply_pending_claims_v1';
const REPORT_REPLY_PENDING_CLAIMS_CAP = 200;
const APP_MESSAGE_VISIBILITY_OUTBOX_KEY_PREFIX = 'app_message_visibility_outbox_v1';
const APP_MESSAGE_VISIBILITY_OUTBOX_CAP = 200;
const PERSONAL_MODAL_ACK_OUTBOX_KEY_PREFIX = 'app_message_personal_modal_ack_outbox_v1';
const PERSONAL_MODAL_ACK_OUTBOX_CAP = 200;
const APP_MESSAGE_MODAL_ACK_OUTBOX_KEY_PREFIX = 'app_message_modal_ack_outbox_v1';
const APP_MESSAGE_MODAL_ACK_OUTBOX_CAP = 200;
const LEGACY_ANIMATED_MESSAGE_IDS_KEY = 'app_message_received_anim_ids_v1';
const ANIMATED_MESSAGE_IDS_KEY_PREFIX = 'app_message_received_anim_ids_v2';
let unownedAppMessageStorageCleanupStarted = false;
const visibilityMutationQueueByOwner = new Map<string, Promise<void>>();
const visibilityActionQueueByOwner = new Map<string, Promise<void>>();
const personalModalAckMutationQueueByOwner = new Map<string, Promise<void>>();
const appMessageModalAckMutationQueueByOwner = new Map<string, Promise<void>>();
const lastVisibilityRevisionByOwner = new Map<string, number>();
const VISIBILITY_REVISION_OWNER_CAP = 20;
let visibilitySchedulingQueue: Promise<void> = Promise.resolve();

function rememberVisibilityRevision(ownerUid: string, revision: number): void {
  lastVisibilityRevisionByOwner.delete(ownerUid);
  lastVisibilityRevisionByOwner.set(ownerUid, revision);
  while (lastVisibilityRevisionByOwner.size > VISIBILITY_REVISION_OWNER_CAP) {
    const oldestOwner = lastVisibilityRevisionByOwner.keys().next().value as string | undefined;
    if (!oldestOwner) break;
    lastVisibilityRevisionByOwner.delete(oldestOwner);
  }
}

export type PendingAppMessageVisibility = {
  messageId: string;
  dismissedAtMs: number | null;
  revision: number;
};

export type PendingPersonalModalAcknowledgement = {
  messageId: string;
  acknowledgedAtMs: number;
};

export type PendingAppMessageModalAcknowledgement = {
  messageId: string;
  acknowledgedAtMs: number;
};

function appMessagesOwnerStorageKey(prefix: string, ownerUid: string): string {
  return `${prefix}:${encodeURIComponent(ownerUid)}`;
}

/**
 * зачем (координатор 12.10, п.70 №1, аудит FIRESTORE_BOOT_READS_R1): метка «входящие уже прочитаны принудительно»
 * жила в памяти процесса — КАЖДЫЙ холодный старт считался входом и тянул 3 запроса до 80 документов (до 240 чтений).
 * Теперь метка на диске по stableId: force — только при настоящем входе (метки для этого аккаунта ещё нет), дальше —
 * общий срок жизни 6 ч (и в «Настройках»).
 */
export const APP_MESSAGES_SCREEN_MIN_INTERVAL_MS = 6 * 60 * 60_000;
const APP_MESSAGES_LOGIN_FORCED_KEY_PREFIX = 'app_messages_login_forced_v1';

/**
 * Ключи сообщений аккаунта, которые стирает `wipeLocalAccountData` при выходе, смене и удалении аккаунта
 * (`<prefix>:<stableId>` через appMessagesOwnerStorageKey, плюс устаревшие v1 без владельца).
 * зачем (PRIVACY_DELTA_R1 п.5, координатор 12.10): эти ключи переживали выход и удаление, а политика (§3, §20) обещает удаление
 * локальных данных. Очередь наград за отчёты (REPORT_REPLY_PENDING_CLAIMS_*) сюда НЕ входит: это незавершённые начисления монет,
 * их досылает синхронизация — стереть их значит потерять награду.
 */
export const APP_MESSAGES_ACCOUNT_WIPE_PREFIXES: readonly string[] = [
  APP_MESSAGES_CACHE_KEY_PREFIX,
  APP_MESSAGES_LAST_BACKGROUND_REFRESH_KEY_PREFIX,
  LOCAL_APP_MESSAGES_KEY_PREFIX,
  LOCAL_APP_MESSAGE_STATES_KEY_PREFIX,
  APP_MESSAGE_VISIBILITY_OUTBOX_KEY_PREFIX,
  PERSONAL_MODAL_ACK_OUTBOX_KEY_PREFIX,
  APP_MESSAGE_MODAL_ACK_OUTBOX_KEY_PREFIX,
  ANIMATED_MESSAGE_IDS_KEY_PREFIX,
  APP_MESSAGES_LOGIN_FORCED_KEY_PREFIX,
];
export const APP_MESSAGES_ACCOUNT_WIPE_LEGACY_KEYS: readonly string[] = [
  LEGACY_APP_MESSAGES_CACHE_KEY,
  LEGACY_APP_MESSAGES_LAST_BACKGROUND_REFRESH_KEY,
  LEGACY_LOCAL_APP_MESSAGES_KEY,
  LEGACY_LOCAL_APP_MESSAGE_STATES_KEY,
  LEGACY_ANIMATED_MESSAGE_IDS_KEY,
];
const appMessagesLoginForcedInProcess = new Set<string>();

export type AppMessagesLoginForceDecision = Readonly<{
  force: boolean;
  source: 'memory' | 'storage' | 'first_login' | 'storage_read_failed';
}>;

/** Решить, нужен ли принудительный запрос входящих для этого аккаунта; при «да» метка ставится сразу. */
export async function claimAppMessagesLoginForce(stableId: string): Promise<AppMessagesLoginForceDecision> {
  if (!stableId) return { force: false, source: 'memory' };
  if (appMessagesLoginForcedInProcess.has(stableId)) return { force: false, source: 'memory' };
  appMessagesLoginForcedInProcess.add(stableId);
  const key = appMessagesOwnerStorageKey(APP_MESSAGES_LOGIN_FORCED_KEY_PREFIX, stableId);
  let stored: string | null;
  try {
    stored = await AsyncStorage.getItem(key);
  } catch (error: unknown) {
    // Диск недоступен — читаем по сроку жизни (не форсим): лишний запрос хуже, чем входящие на 6 ч позже.
    console.warn('[APP-MESSAGES-REFRESH] метка входа не прочитана → без force', error instanceof Error ? error.message : String(error));
    return { force: false, source: 'storage_read_failed' };
  }
  if (stored) return { force: false, source: 'storage' };
  await AsyncStorage.setItem(key, String(Date.now())).catch((error: unknown) => {
    console.warn('[APP-MESSAGES-REFRESH] метка входа не записана (следующий старт снова форсит)', error instanceof Error ? error.message : String(error));
  });
  return { force: true, source: 'first_login' };
}

/** Только для тестов: сбросить память процесса. */
export function resetAppMessagesLoginForceForTests(): void {
  appMessagesLoginForcedInProcess.clear();
}

async function getAppMessagesOwnerUid(): Promise<string | null> {
  return String(await getCanonicalUserId().catch((e: unknown) => { reportSwallowed('app_messages:getAppMessagesOwnerUid', e); return ''; })).trim() || null;
}

function cleanupUnownedAppMessageStorage(): void {
  if (unownedAppMessageStorageCleanupStarted) return;
  unownedAppMessageStorageCleanupStarted = true;
  void AsyncStorage.multiRemove([
    LEGACY_APP_MESSAGES_CACHE_KEY,
    LEGACY_APP_MESSAGES_LAST_BACKGROUND_REFRESH_KEY,
    LEGACY_ANIMATED_MESSAGE_IDS_KEY,
    LEGACY_LOCAL_APP_MESSAGES_KEY,
    LEGACY_LOCAL_APP_MESSAGE_STATES_KEY,
  ]).catch(swallowError('app_messages:cleanupUnownedStorage'));
}

export async function readPendingAppMessageVisibility(ownerUid: string | null): Promise<PendingAppMessageVisibility[]> {
  if (!ownerUid) return [];
  try {
    const raw = await AsyncStorage.getItem(appMessagesOwnerStorageKey(APP_MESSAGE_VISIBILITY_OUTBOX_KEY_PREFIX, ownerUid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is PendingAppMessageVisibility => (
      !!row
      && typeof row.messageId === 'string'
      && row.messageId.length > 0
      && (row.dismissedAtMs === null || Number.isFinite(row.dismissedAtMs))
      && Number.isFinite(row.revision)
    )).slice(-APP_MESSAGE_VISIBILITY_OUTBOX_CAP);
  } catch {
    return [];
  }
}

async function writePendingAppMessageVisibility(ownerUid: string, rows: PendingAppMessageVisibility[]): Promise<void> {
  await AsyncStorage.setItem(
    appMessagesOwnerStorageKey(APP_MESSAGE_VISIBILITY_OUTBOX_KEY_PREFIX, ownerUid),
    JSON.stringify(rows.slice(-APP_MESSAGE_VISIBILITY_OUTBOX_CAP)),
  );
}

async function acknowledgePendingAppMessageVisibility(
  ownerUid: string,
  states: AppMessageState[],
): Promise<PendingAppMessageVisibility[]> {
  const serverRevisionByMessage = new Map(
    states.map((state) => [state.messageId, state.visibilityRevision ?? 0]),
  );
  const current = await readPendingAppMessageVisibility(ownerUid);
  const remaining = current.filter((operation) => (
    (serverRevisionByMessage.get(operation.messageId) ?? 0) < operation.revision
  ));
  if (remaining.length !== current.length) {
    await writePendingAppMessageVisibility(ownerUid, remaining);
  }
  return remaining;
}

async function recordPendingAppMessageVisibility(
  ownerUid: string,
  messageId: string,
  dismissedAtMs: number | null,
): Promise<PendingAppMessageVisibility> {
  let recorded!: PendingAppMessageVisibility;
  const previous = visibilityMutationQueueByOwner.get(ownerUid) ?? Promise.resolve();
  const current = previous.catch(swallowError('app_messages:queue_previous')).then(async () => {
    const rows = await readPendingAppMessageVisibility(ownerUid);
    const maxStoredRevision = rows.reduce((max, row) => Math.max(max, row.revision), 0);
    const revision = Math.max(
      Date.now(),
      maxStoredRevision + 1,
      (lastVisibilityRevisionByOwner.get(ownerUid) ?? 0) + 1,
    );
    rememberVisibilityRevision(ownerUid, revision);
    recorded = { messageId, dismissedAtMs, revision };
    const next = [...rows.filter((row) => row.messageId !== messageId), recorded]
      .sort((a, b) => a.revision - b.revision);
    await writePendingAppMessageVisibility(ownerUid, next);
  });
  visibilityMutationQueueByOwner.set(ownerUid, current);
  await current.finally(() => {
    if (visibilityMutationQueueByOwner.get(ownerUid) === current) visibilityMutationQueueByOwner.delete(ownerUid);
  });
  return recorded;
}

async function flushPendingAppMessageVisibility(
  firestoreFactory: FirestoreFactory | null,
  ownerUid: string | null,
): Promise<void> {
  if (!firestoreFactory || !ownerUid) return;
  const pending = await readPendingAppMessageVisibility(ownerUid);
  if (pending.length === 0) return;
  const db = firestoreFactory();
  for (const operation of pending) {
    try {
      const stateRef = db.collection('users').doc(ownerUid).collection(APP_MESSAGE_STATES_COLLECTION).doc(operation.messageId);
      await db.runTransaction(async (transaction: any) => {
        const stateSnap = await transaction.get(stateRef);
        const serverRevision = toMs(stateSnap?.exists ? stateSnap.data?.()?.visibilityRevision : 0, 0);
        if (serverRevision > operation.revision) return;
        transaction.set(stateRef, {
          messageId: operation.messageId,
          dismissedAtMs: operation.dismissedAtMs,
          updatedAtMs: operation.revision,
          visibilityRevision: operation.revision,
        }, { merge: true });
      });
    } catch (e) {
      // Keep the operation until a server snapshot acknowledges this revision.
      DebugLogger.error('app_messages:serverRevision', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
}

export async function flushPendingAppMessageVisibilityForCurrentOwner(): Promise<void> {
  const ownerUid = await getAppMessagesOwnerUid();
  if (!ownerUid) return;
  await flushPendingAppMessageVisibility(await getFirestoreModule(), ownerUid);
}

export function applyPendingVisibilityToStates(
  states: AppMessageState[],
  rows: PendingAppMessageVisibility[],
): AppMessageState[] {
  const stateByMessage = new Map(states.map((state) => [state.messageId, state]));
  rows.forEach((row) => {
    const existing = stateByMessage.get(row.messageId);
    if ((existing?.visibilityRevision ?? 0) > row.revision) return;
    stateByMessage.set(row.messageId, {
      messageId: row.messageId,
      readAtMs: existing?.readAtMs ?? null,
      dismissedAtMs: row.dismissedAtMs,
      reaction: existing?.reaction ?? null,
      pollOptionId: existing?.pollOptionId ?? null,
      updatedAtMs: Math.max(existing?.updatedAtMs ?? 0, row.revision),
      visibilityRevision: row.revision,
    });
  });
  return [...stateByMessage.values()];
}

export function applyPendingVisibilityToSnapshot(
  snapshot: AppMessagesSnapshot,
  rows: PendingAppMessageVisibility[],
): AppMessagesSnapshot {
  if (rows.length === 0) return snapshot;
  const latestByMessage = new Map(rows.map((row) => [row.messageId, row]));
  const messages = snapshot.messages.filter((message) => !latestByMessage.get(message.id)?.dismissedAtMs);
  return { messages, unreadCount: messages.reduce((count, message) => count + (message.unread ? 1 : 0), 0) };
}

export async function readPendingPersonalModalAcknowledgements(
  ownerUid: string | null,
): Promise<PendingPersonalModalAcknowledgement[]> {
  if (!ownerUid) return [];
  try {
    const raw = await AsyncStorage.getItem(appMessagesOwnerStorageKey(PERSONAL_MODAL_ACK_OUTBOX_KEY_PREFIX, ownerUid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is PendingPersonalModalAcknowledgement => (
      !!row
      && typeof row.messageId === 'string'
      && row.messageId.length > 0
      && Number.isFinite(row.acknowledgedAtMs)
      && row.acknowledgedAtMs > 0
    )).slice(-PERSONAL_MODAL_ACK_OUTBOX_CAP);
  } catch {
    return [];
  }
}

async function writePendingPersonalModalAcknowledgements(
  ownerUid: string,
  rows: PendingPersonalModalAcknowledgement[],
): Promise<void> {
  const storageKey = appMessagesOwnerStorageKey(PERSONAL_MODAL_ACK_OUTBOX_KEY_PREFIX, ownerUid);
  const next = rows.slice(-PERSONAL_MODAL_ACK_OUTBOX_CAP);
  if (next.length === 0) {
    await AsyncStorage.removeItem(storageKey).catch(swallowError('app_messages:removeItem'));
    return;
  }
  await AsyncStorage.setItem(storageKey, JSON.stringify(next));
}

async function recordPendingPersonalModalAcknowledgement(
  ownerUid: string,
  messageId: string,
  acknowledgedAtMs: number,
): Promise<void> {
  const previous = personalModalAckMutationQueueByOwner.get(ownerUid) ?? Promise.resolve();
  const current = previous.catch(swallowError('app_messages:queue_previous')).then(async () => {
    const rows = await readPendingPersonalModalAcknowledgements(ownerUid);
    const next = [
      ...rows.filter((row) => row.messageId !== messageId),
      { messageId, acknowledgedAtMs },
    ].sort((left, right) => left.acknowledgedAtMs - right.acknowledgedAtMs);
    await writePendingPersonalModalAcknowledgements(ownerUid, next);
  });
  personalModalAckMutationQueueByOwner.set(ownerUid, current);
  await current.finally(() => {
    if (personalModalAckMutationQueueByOwner.get(ownerUid) === current) {
      personalModalAckMutationQueueByOwner.delete(ownerUid);
    }
  });
}

async function acknowledgePendingPersonalModalAcknowledgements(
  ownerUid: string,
  states: AppMessageState[],
): Promise<PendingPersonalModalAcknowledgement[]> {
  const serverAcknowledgementByMessage = new Map(
    states.map((state) => [state.messageId, state.personalModalAcknowledgedAtMs ?? 0]),
  );
  const current = await readPendingPersonalModalAcknowledgements(ownerUid);
  const remaining = current.filter((operation) => (
    (serverAcknowledgementByMessage.get(operation.messageId) ?? 0) < operation.acknowledgedAtMs
  ));
  if (remaining.length !== current.length) {
    await writePendingPersonalModalAcknowledgements(ownerUid, remaining);
  }
  return remaining;
}

async function flushPendingPersonalModalAcknowledgements(
  firestoreFactory: FirestoreFactory | null,
  ownerUid: string | null,
): Promise<void> {
  if (!firestoreFactory || !ownerUid) return;
  const pending = await readPendingPersonalModalAcknowledgements(ownerUid);
  if (pending.length === 0) return;
  const db = firestoreFactory();
  for (const operation of pending) {
    try {
      const stateRef = db.collection('users').doc(ownerUid).collection(APP_MESSAGE_STATES_COLLECTION).doc(operation.messageId);
      await db.runTransaction(async (transaction: any) => {
        const stateSnap = await transaction.get(stateRef);
        const serverAcknowledgedAtMs = toMs(
          stateSnap?.exists ? stateSnap.data?.()?.personalModalAcknowledgedAtMs : 0,
          0,
        );
        if (serverAcknowledgedAtMs >= operation.acknowledgedAtMs) return;
        transaction.set(stateRef, {
          messageId: operation.messageId,
          readAtMs: operation.acknowledgedAtMs,
          personalModalAcknowledgedAtMs: operation.acknowledgedAtMs,
          updatedAtMs: operation.acknowledgedAtMs,
        }, { merge: true });
      });
    } catch (e) {
      // Keep the account-scoped operation until a server snapshot acknowledges it.
      DebugLogger.error('app_messages:serverAcknowledgedAtMs', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
}

function applyPendingPersonalModalAcknowledgementsToStates(
  states: AppMessageState[],
  rows: PendingPersonalModalAcknowledgement[],
): AppMessageState[] {
  const stateByMessage = new Map(states.map((state) => [state.messageId, state]));
  rows.forEach((row) => {
    const existing = stateByMessage.get(row.messageId);
    stateByMessage.set(row.messageId, {
      messageId: row.messageId,
      readAtMs: existing?.readAtMs ?? row.acknowledgedAtMs,
      dismissedAtMs: existing?.dismissedAtMs ?? null,
      reaction: existing?.reaction ?? null,
      pollOptionId: existing?.pollOptionId ?? null,
      updatedAtMs: Math.max(existing?.updatedAtMs ?? 0, row.acknowledgedAtMs),
      visibilityRevision: existing?.visibilityRevision,
      personalModalAcknowledgedAtMs: Math.max(
        existing?.personalModalAcknowledgedAtMs ?? 0,
        row.acknowledgedAtMs,
      ),
    });
  });
  return [...stateByMessage.values()];
}

export function applyPendingPersonalModalAcknowledgementsToSnapshot(
  snapshot: AppMessagesSnapshot,
  rows: PendingPersonalModalAcknowledgement[],
): AppMessagesSnapshot {
  if (rows.length === 0) return snapshot;
  const pendingByMessage = new Map(rows.map((row) => [row.messageId, row.acknowledgedAtMs]));
  const messages = snapshot.messages.map((message) => {
    const acknowledgedAtMs = pendingByMessage.get(message.id);
    if (!acknowledgedAtMs) return message;
    return {
      ...message,
      readAtMs: message.readAtMs ?? acknowledgedAtMs,
      unread: false,
      personalModalAcknowledgedAtMs: Math.max(
        message.personalModalAcknowledgedAtMs ?? 0,
        acknowledgedAtMs,
      ),
    };
  });
  return {
    messages,
    unreadCount: messages.reduce((count, message) => count + (message.unread ? 1 : 0), 0),
  };
}

export async function readPendingAppMessageModalAcknowledgements(
  ownerUid: string | null,
): Promise<PendingAppMessageModalAcknowledgement[]> {
  if (!ownerUid) return [];
  try {
    const raw = await AsyncStorage.getItem(appMessagesOwnerStorageKey(APP_MESSAGE_MODAL_ACK_OUTBOX_KEY_PREFIX, ownerUid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is PendingAppMessageModalAcknowledgement => (
      !!row
      && typeof row.messageId === 'string'
      && row.messageId.length > 0
      && Number.isFinite(row.acknowledgedAtMs)
      && row.acknowledgedAtMs > 0
    )).slice(-APP_MESSAGE_MODAL_ACK_OUTBOX_CAP);
  } catch {
    return [];
  }
}

async function writePendingAppMessageModalAcknowledgements(
  ownerUid: string,
  rows: PendingAppMessageModalAcknowledgement[],
): Promise<void> {
  const storageKey = appMessagesOwnerStorageKey(APP_MESSAGE_MODAL_ACK_OUTBOX_KEY_PREFIX, ownerUid);
  const next = rows.slice(-APP_MESSAGE_MODAL_ACK_OUTBOX_CAP);
  if (next.length === 0) {
    await AsyncStorage.removeItem(storageKey).catch(swallowError('app_messages:removeItem'));
    return;
  }
  await AsyncStorage.setItem(storageKey, JSON.stringify(next));
}

async function recordPendingAppMessageModalAcknowledgement(
  ownerUid: string,
  messageId: string,
  acknowledgedAtMs: number,
): Promise<void> {
  const previous = appMessageModalAckMutationQueueByOwner.get(ownerUid) ?? Promise.resolve();
  const current = previous.catch(swallowError('app_messages:queue_previous')).then(async () => {
    const rows = await readPendingAppMessageModalAcknowledgements(ownerUid);
    const next = [
      ...rows.filter((row) => row.messageId !== messageId),
      { messageId, acknowledgedAtMs },
    ].sort((left, right) => left.acknowledgedAtMs - right.acknowledgedAtMs);
    await writePendingAppMessageModalAcknowledgements(ownerUid, next);
  });
  appMessageModalAckMutationQueueByOwner.set(ownerUid, current);
  await current.finally(() => {
    if (appMessageModalAckMutationQueueByOwner.get(ownerUid) === current) {
      appMessageModalAckMutationQueueByOwner.delete(ownerUid);
    }
  });
}

async function acknowledgePendingAppMessageModalAcknowledgements(
  ownerUid: string,
  states: AppMessageState[],
): Promise<PendingAppMessageModalAcknowledgement[]> {
  const serverAcknowledgementByMessage = new Map(
    states.map((state) => [state.messageId, state.appMessageModalAcknowledgedAtMs ?? 0]),
  );
  const current = await readPendingAppMessageModalAcknowledgements(ownerUid);
  const remaining = current.filter((operation) => (
    (serverAcknowledgementByMessage.get(operation.messageId) ?? 0) < operation.acknowledgedAtMs
  ));
  if (remaining.length !== current.length) {
    await writePendingAppMessageModalAcknowledgements(ownerUid, remaining);
  }
  return remaining;
}

async function flushPendingAppMessageModalAcknowledgements(
  firestoreFactory: FirestoreFactory | null,
  ownerUid: string | null,
): Promise<void> {
  if (!firestoreFactory || !ownerUid) return;
  const pending = await readPendingAppMessageModalAcknowledgements(ownerUid);
  if (pending.length === 0) return;
  const db = firestoreFactory();
  for (const operation of pending) {
    try {
      const stateRef = db.collection('users').doc(ownerUid).collection(APP_MESSAGE_STATES_COLLECTION).doc(operation.messageId);
      await db.runTransaction(async (transaction: any) => {
        const stateSnap = await transaction.get(stateRef);
        const serverAcknowledgedAtMs = toMs(
          stateSnap?.exists ? stateSnap.data?.()?.appMessageModalAcknowledgedAtMs : 0,
          0,
        );
        if (serverAcknowledgedAtMs >= operation.acknowledgedAtMs) return;
        transaction.set(stateRef, {
          messageId: operation.messageId,
          readAtMs: operation.acknowledgedAtMs,
          appMessageModalAcknowledgedAtMs: operation.acknowledgedAtMs,
          updatedAtMs: operation.acknowledgedAtMs,
        }, { merge: true });
      });
    } catch (e) {
      // Keep the account-scoped operation until a server snapshot acknowledges it.
      DebugLogger.error('app_messages:appMessageModalAcknowledgedAtMs', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
}

function applyPendingAppMessageModalAcknowledgementsToStates(
  states: AppMessageState[],
  rows: PendingAppMessageModalAcknowledgement[],
): AppMessageState[] {
  const stateByMessage = new Map(states.map((state) => [state.messageId, state]));
  rows.forEach((row) => {
    const existing = stateByMessage.get(row.messageId);
    stateByMessage.set(row.messageId, {
      messageId: row.messageId,
      readAtMs: existing?.readAtMs ?? row.acknowledgedAtMs,
      dismissedAtMs: existing?.dismissedAtMs ?? null,
      reaction: existing?.reaction ?? null,
      pollOptionId: existing?.pollOptionId ?? null,
      updatedAtMs: Math.max(existing?.updatedAtMs ?? 0, row.acknowledgedAtMs),
      visibilityRevision: existing?.visibilityRevision,
      personalModalAcknowledgedAtMs: existing?.personalModalAcknowledgedAtMs,
      appMessageModalAcknowledgedAtMs: Math.max(
        existing?.appMessageModalAcknowledgedAtMs ?? 0,
        row.acknowledgedAtMs,
      ),
    });
  });
  return [...stateByMessage.values()];
}

export function applyPendingAppMessageModalAcknowledgementsToSnapshot(
  snapshot: AppMessagesSnapshot,
  rows: PendingAppMessageModalAcknowledgement[],
): AppMessagesSnapshot {
  if (rows.length === 0) return snapshot;
  const pendingByMessage = new Map(rows.map((row) => [row.messageId, row.acknowledgedAtMs]));
  const messages = snapshot.messages.map((message) => {
    const acknowledgedAtMs = pendingByMessage.get(message.id);
    if (!acknowledgedAtMs) return message;
    return {
      ...message,
      readAtMs: message.readAtMs ?? acknowledgedAtMs,
      unread: false,
      appMessageModalAcknowledgedAtMs: Math.max(
        message.appMessageModalAcknowledgedAtMs ?? 0,
        acknowledgedAtMs,
      ),
    };
  });
  return {
    messages,
    unreadCount: messages.reduce((count, message) => count + (message.unread ? 1 : 0), 0),
  };
}

export type AppMessagePollOption = {
  id: string;
  textRu: string;
  textUk: string;
  textEs: string;
  textPtBr: string;
  textVi: string;
  textId: string;
  textTr: string;
  textPl: string;
  /** зачем (EN-проход settings-gap-002): английский текст варианта; пустой — опрос не показывается на en, без русского. */
  textEn: string;
};

export type AppMessagePoll = {
  questionRu: string;
  questionUk: string;
  questionEs: string;
  questionPtBr: string;
  questionVi: string;
  questionId: string;
  questionTr: string;
  questionPl: string;
  questionEn: string;
  options: AppMessagePollOption[];
  optionIds: string[];
  counts: Record<string, number>;
  voteCount: number;
};

export type AppMessageVipSurvey = {
  surveyId: string;
  rewardDays: number;
  reviewUrlIos: string;
  reviewUrlAndroid: string;
};

/** Награда в ответе на репорт: монеты к клейму через CF claimReportReward. */
export type AppMessageReportReply = {
  coins: number;
  rewardBundle: ReportRewardBundle;
  claimed: boolean;
};

export type AppMessage = {
  id: string;
  kind: AppMessageKind;
  active: boolean;
  audience: AppMessageAudience;
  deliverySurface: AppMessageDeliverySurface;
  settingsSlot: SettingsMessageSlot | null;
  voteMode: AppMessageVoteMode;
  controlPercent: number;
  titleRu: string;
  titleUk: string;
  titleEs: string;
  titlePtBr: string;
  titleVi: string;
  titleId: string;
  titleTr: string;
  titlePl: string;
  /** зачем (EN-проход settings-gap-002): английский интерфейс показывал русский текст кампании — своих en-полей не было. */
  titleEn: string;
  messageRu: string;
  messageUk: string;
  messageEs: string;
  messagePtBr: string;
  messageVi: string;
  messageId: string;
  messageTr: string;
  messagePl: string;
  messageEn: string;
  createdAt: string;
  createdAtMs: number;
  updatedAt: string;
  updatedAtMs: number;
  expiresAt: string;
  expiresAtMs: number;
  priority: number;
  targetAppVersions: string[];
  poll: AppMessagePoll | null;
  vipSurvey: AppMessageVipSurvey | null;
  reportReply: AppMessageReportReply | null;
  recipientUid: string;
  deliveryMode: PersonalAppMessageDeliveryMode | null;
  nextLoginModalPending: boolean;
  showOnNextLoginModal: boolean;
};

export type AppMessageState = {
  messageId: string;
  readAtMs: number | null;
  dismissedAtMs: number | null;
  reaction: AppMessageReaction | null;
  pollOptionId?: string | null;
  updatedAtMs: number;
  visibilityRevision?: number;
  personalModalAcknowledgedAtMs?: number | null;
  appMessageModalAcknowledgedAtMs?: number | null;
};

export type AppMessageWithState = AppMessage & {
  readAtMs: number | null;
  dismissedAtMs: number | null;
  reaction: AppMessageReaction | null;
  pollOptionId: string | null;
  unread: boolean;
  personalModalAcknowledgedAtMs: number | null;
  appMessageModalAcknowledgedAtMs: number | null;
};

export type AppMessagesSnapshot = {
  messages: AppMessageWithState[];
  unreadCount: number;
};

let latestAppMessagesSnapshot: AppMessagesSnapshot | null = null;

export function peekAppMessagesSnapshot(): AppMessagesSnapshot | null {
  return latestAppMessagesSnapshot;
}

export type PendingReportReplyShardClaim = {
  messageId: string;
  amount: number;
  creditedAtMs: number;
};

type FirestoreFactory = {
  (): any;
  FieldValue?: {
    serverTimestamp?: () => unknown;
  };
};

function toMs(value: unknown, backup = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.floor(n);
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : backup;
  }
  if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    const n = (value as { toMillis: () => number }).toMillis();
    return Number.isFinite(n) ? Math.floor(n) : backup;
  }
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    const n = (value as { toDate: () => Date }).toDate().getTime();
    return Number.isFinite(n) ? Math.floor(n) : backup;
  }
  return backup;
}

function cleanText(value: unknown, backup = ''): string {
  return String(value ?? backup).trim();
}

function cleanPollOptionId(value: unknown, backup: string): string {
  const raw = cleanText(value, backup).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
  return raw || backup;
}

function cleanPollCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
    const optionId = cleanPollOptionId(key, '');
    if (!optionId) return;
    const n = Math.floor(Number(raw ?? 0));
    out[optionId] = Number.isFinite(n) && n > 0 ? n : 0;
  });
  return out;
}

function normalizePendingReportReplyShardClaim(value: unknown): PendingReportReplyShardClaim | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const messageId = cleanPollOptionId(row.messageId, '');
  if (!messageId) return null;
  const amount = Math.max(0, Math.min(1, Math.floor(Number(row.amount) || 0)));
  if (amount <= 0) return null;
  const creditedAtMs = toMs(row.creditedAtMs, Date.now());
  return { messageId, amount, creditedAtMs };
}

export async function readPendingReportReplyShardClaims(
  expectedOwnerUid?: string | null,
): Promise<PendingReportReplyShardClaim[]> {
  cleanupUnownedAppMessageStorage();
  const ownerUid = expectedOwnerUid ?? await getAppMessagesOwnerUid();
  if (!ownerUid) return [];
  try {
    const storageKey = appMessagesOwnerStorageKey(REPORT_REPLY_PENDING_CLAIMS_KEY_PREFIX, ownerUid);
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const byId = new Map<string, PendingReportReplyShardClaim>();
    parsed.forEach((row) => {
      const claim = normalizePendingReportReplyShardClaim(row);
      if (claim) byId.set(claim.messageId, claim);
    });
    return [...byId.values()].slice(-REPORT_REPLY_PENDING_CLAIMS_CAP);
  } catch {
    return [];
  }
}

async function writePendingReportReplyShardClaims(
  claims: PendingReportReplyShardClaim[],
  expectedOwnerUid?: string | null,
): Promise<void> {
  cleanupUnownedAppMessageStorage();
  const ownerUid = expectedOwnerUid ?? await getAppMessagesOwnerUid();
  if (!ownerUid) return;
  const storageKey = appMessagesOwnerStorageKey(REPORT_REPLY_PENDING_CLAIMS_KEY_PREFIX, ownerUid);
  const byId = new Map<string, PendingReportReplyShardClaim>();
  claims.forEach((claim) => {
    const normalized = normalizePendingReportReplyShardClaim(claim);
    if (normalized) byId.set(normalized.messageId, normalized);
  });
  const next = [...byId.values()].slice(-REPORT_REPLY_PENDING_CLAIMS_CAP);
  if (next.length === 0) {
    await AsyncStorage.removeItem(storageKey).catch(swallowError('app_messages:removeItem'));
    return;
  }
  await AsyncStorage.setItem(storageKey, JSON.stringify(next));
}

export async function migrateLegacyReportReplyClaimsForOwnedMessages(
  ownerUid: string,
  ownedMessages: AppMessage[],
): Promise<PendingReportReplyShardClaim[]> {
  const ownedReportReplyIds = new Set(
    ownedMessages.filter((message) => message.kind === 'report_reply').map((message) => message.id),
  );
  if (ownedReportReplyIds.size === 0) return readPendingReportReplyShardClaims(ownerUid);
  const legacyRows = await readJsonArray<unknown>(LEGACY_REPORT_REPLY_PENDING_CLAIMS_KEY);
  const legacyClaims = legacyRows
    .map(normalizePendingReportReplyShardClaim)
    .filter((claim): claim is PendingReportReplyShardClaim => !!claim);
  const ownedLegacyClaims = legacyClaims.filter((claim) => ownedReportReplyIds.has(claim.messageId));
  if (ownedLegacyClaims.length === 0) return readPendingReportReplyShardClaims(ownerUid);

  const scopedClaims = await readPendingReportReplyShardClaims(ownerUid);
  await writePendingReportReplyShardClaims([...scopedClaims, ...ownedLegacyClaims], ownerUid);
  const remainingLegacyClaims = legacyClaims.filter((claim) => !ownedReportReplyIds.has(claim.messageId));
  if (remainingLegacyClaims.length > 0) {
    await AsyncStorage.setItem(LEGACY_REPORT_REPLY_PENDING_CLAIMS_KEY, JSON.stringify(remainingLegacyClaims));
  } else {
    await AsyncStorage.removeItem(LEGACY_REPORT_REPLY_PENDING_CLAIMS_KEY);
  }
  const migrated = await readPendingReportReplyShardClaims(ownerUid);
  emitAppEvent('app_messages_local_changed');
  void resumePendingReportReplyShardClaims();
  return migrated;
}

async function addPendingReportReplyShardClaim(
  messageId: string,
  amount: number,
  accountToken: AccountGenerationToken,
  ownerUid: string,
): Promise<boolean> {
  const clean = cleanPollOptionId(messageId, '');
  const safeAmount = Math.max(0, Math.min(1, Math.floor(Number(amount) || 0)));
  if (!clean || safeAmount <= 0) return false;
  if (!ownerUid || !isCurrentAccountGeneration(accountToken, ownerUid)) return false;
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(accountToken, ownerUid)) return false;
    const pending = await readPendingReportReplyShardClaims(ownerUid);
    if (!isCurrentAccountGeneration(accountToken, ownerUid)) return false;
    if (pending.some((claim) => claim.messageId === clean)) return false;
    await writePendingReportReplyShardClaims([
      ...pending,
      { messageId: clean, amount: safeAmount, creditedAtMs: Date.now() },
    ], ownerUid);
    return isCurrentAccountGeneration(accountToken, ownerUid);
  });
}

async function removePendingReportReplyShardClaim(
  messageId: string,
  accountToken: AccountGenerationToken,
  ownerUid: string,
): Promise<boolean> {
  const clean = cleanPollOptionId(messageId, '');
  if (!clean) return false;
  if (!ownerUid || !isCurrentAccountGeneration(accountToken, ownerUid)) return false;
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(accountToken, ownerUid)) return false;
    const pending = await readPendingReportReplyShardClaims(ownerUid);
    if (!isCurrentAccountGeneration(accountToken, ownerUid)) return false;
    const next = pending.filter((claim) => claim.messageId !== clean);
    if (next.length === pending.length) return false;
    await writePendingReportReplyShardClaims(next, ownerUid);
    return isCurrentAccountGeneration(accountToken, ownerUid);
  });
}

function currentAppVersion(): string {
  return String(Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '').trim();
}

function cleanAppVersion(value: unknown): string {
  return String(value ?? '').trim().slice(0, 40).replace(/[^0-9A-Za-z._+-]/g, '');
}

function cleanAppVersionList(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  const versions = raw
    .flatMap((row) => (typeof row === 'string' ? row.split(',') : [row]))
    .map(cleanAppVersion)
    .filter(Boolean);
  return [...new Set(versions)].slice(0, 20);
}

function normalizeAppMessageVipSurvey(data: Record<string, unknown>): AppMessageVipSurvey {
  const rawVipSurvey = data.vipSurvey;
  const vipSurveyData =
    rawVipSurvey && typeof rawVipSurvey === 'object' && !Array.isArray(rawVipSurvey)
      ? rawVipSurvey as Record<string, unknown>
      : {};
  const rewardDays = Math.floor(Number(vipSurveyData.rewardDays ?? data.vipSurveyRewardDays ?? 30));
  return {
    surveyId: cleanPollOptionId(vipSurveyData.surveyId ?? data.vipSurveyId, VIP_SURVEY_ID),
    rewardDays: Number.isFinite(rewardDays) && rewardDays > 0 ? Math.min(365, rewardDays) : 30,
    reviewUrlIos: cleanText(vipSurveyData.reviewUrlIos ?? data.reviewUrlIos, ''),
    reviewUrlAndroid: cleanText(vipSurveyData.reviewUrlAndroid ?? data.reviewUrlAndroid, ''),
  };
}

function normalizeAppMessagePoll(
  data: Record<string, unknown>,
  titleBackup: string,
  messageBackup: string,
): AppMessagePoll | null {
  const rawPoll = data.poll;
  if (!rawPoll || typeof rawPoll !== 'object' || Array.isArray(rawPoll)) return null;

  const pollData = rawPoll as Record<string, unknown>;
  const rawOptions = Array.isArray(pollData.options) ? pollData.options : [];
  const options: AppMessagePollOption[] = [];

  rawOptions.forEach((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return;
    const optionData = row as Record<string, unknown>;
    const textRu = cleanText(optionData.textRu ?? optionData.labelRu ?? optionData.text, '');
    if (!textRu) return;
    const backupId = `opt_${options.length + 1}`;
    const id = cleanPollOptionId(optionData.id, backupId);
    if (options.some((option) => option.id === id)) return;
    options.push({
      id,
      textRu,
      textUk: cleanText(optionData.textUk ?? optionData.labelUk, textRu),
      textEs: cleanText(optionData.textEs ?? optionData.labelEs, textRu),
      textPtBr: cleanText(optionData.textPtBr ?? optionData.textPtBR ?? optionData.labelPtBr ?? optionData.labelPtBR, ''),
      textVi: cleanText(optionData.textVi ?? optionData.labelVi, ''),
      textId: cleanText(optionData.textId ?? optionData.labelId, ''),
      textTr: cleanText(optionData.textTr ?? optionData.labelTr, ''),
      textPl: cleanText(optionData.textPl ?? optionData.labelPl, ''),
      textEn: cleanText(optionData.textEn ?? optionData.labelEn, ''),
    });
  });

  if (options.length < 2) return null;

  const counts = cleanPollCounts(data.pollCounts ?? pollData.counts);
  const countSum = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const rawVoteCount = Math.floor(Number(data.pollVoteCount ?? pollData.voteCount ?? countSum));
  const voteCount = Number.isFinite(rawVoteCount) && rawVoteCount > 0 ? rawVoteCount : countSum;
  const questionRu = cleanText(
    pollData.questionRu ?? pollData.question ?? data.pollQuestionRu,
    titleBackup || messageBackup || 'Poll',
  );

  return {
    questionRu,
    questionUk: cleanText(pollData.questionUk ?? data.pollQuestionUk, questionRu),
    questionEs: cleanText(pollData.questionEs ?? data.pollQuestionEs, questionRu),
    questionPtBr: cleanText(pollData.questionPtBr ?? pollData.questionPtBR ?? data.pollQuestionPtBr ?? data.pollQuestionPtBR, ''),
    questionVi: cleanText(pollData.questionVi ?? data.pollQuestionVi, ''),
    questionId: cleanText(pollData.questionId ?? data.pollQuestionId, ''),
    questionTr: cleanText(pollData.questionTr ?? data.pollQuestionTr, ''),
    questionPl: cleanText(pollData.questionPl ?? data.pollQuestionPl, ''),
    questionEn: cleanText(pollData.questionEn ?? data.pollQuestionEn, ''),
    options,
    optionIds: options.map((option) => option.id),
    counts,
    voteCount,
  };
}

export function normalizeAppMessage(id: string, data: Record<string, unknown>, nowMs = Date.now()): AppMessage {
  const createdAt = cleanText(data.createdAt, new Date(nowMs).toISOString());
  const createdAtMs = toMs(data.createdAtMs ?? data.createdAt, Date.parse(createdAt) || nowMs);
  const updatedAt = cleanText(data.updatedAt, createdAt);
  const updatedAtMs = toMs(data.updatedAtMs ?? data.updatedAt, createdAtMs);
  const backupExpiresMs = createdAtMs + APP_MESSAGE_TTL_MS;
  const expiresAtMs = toMs(data.expiresAtMs ?? data.expiresAt, backupExpiresMs);
  const expiresAt = cleanText(data.expiresAt, new Date(expiresAtMs).toISOString());
  const audienceRaw = cleanText(data.audience, 'all') as AppMessageAudience;
  const audience: AppMessageAudience =
    audienceRaw === 'free' || audienceRaw === 'premium' ? audienceRaw : 'all';
  const deliverySurface: AppMessageDeliverySurface = data.deliverySurface === 'settings' ? 'settings' : 'inbox';
  const settingsSlot: SettingsMessageSlot | null = deliverySurface === 'settings'
    && (data.settingsSlot === 'top' || data.settingsSlot === 'bottom')
    ? data.settingsSlot
    : null;
  const titleRu = cleanText(data.titleRu, 'Message from the team');
  const messageRu = cleanText(data.messageRu, '');
  const poll = normalizeAppMessagePoll(data, titleRu, messageRu);
  const kindRaw = cleanText(data.kind, poll ? 'poll' : 'message');
  const kind: AppMessageKind =
    kindRaw === 'poll' && poll ? 'poll'
    : kindRaw === 'vip_survey' ? 'vip_survey'
    : kindRaw === 'report_reply' ? 'report_reply'
    : kindRaw === 'personal_admin_message' ? 'personal_admin_message'
    : 'message';
  const vipSurvey = kind === 'vip_survey' ? normalizeAppMessageVipSurvey(data) : null;
  const replyCoins = Math.max(0, Math.min(1, Math.floor(Number(data.coins ?? data.shards ?? 0) || 0)));
  const reportReply: AppMessageReportReply | null = kind === 'report_reply'
    ? { coins: replyCoins, rewardBundle: normalizeReportRewardBundle(data.rewardBundle, replyCoins), claimed: data.claimed === true }
    : null;
  const targetAppVersions = cleanAppVersionList(
    data.targetAppVersions ?? data.appVersions ?? data.appVersion,
  );

  return {
    id,
    kind,
    active: data.active !== false,
    audience,
    deliverySurface,
    settingsSlot,
    voteMode: deliverySurface === 'settings' ? 'fixed' : 'changeable',
    controlPercent: Math.max(0, Math.min(50, Math.floor(Number(data.controlPercent ?? 0) || 0))),
    titleRu,
    titleUk: cleanText(data.titleUk, titleRu),
    titleEs: cleanText(data.titleEs, titleRu),
    titlePtBr: cleanText(data.titlePtBr ?? data.titlePtBR, ''),
    titleVi: cleanText(data.titleVi, ''),
    titleId: cleanText(data.titleId, ''),
    titleTr: cleanText(data.titleTr, ''),
    titlePl: cleanText(data.titlePl, ''),
    titleEn: cleanText(data.titleEn, ''),
    messageRu,
    messageUk: cleanText(data.messageUk, messageRu),
    messageEs: cleanText(data.messageEs, messageRu),
    messagePtBr: cleanText(data.messagePtBr ?? data.messagePtBR, ''),
    messageVi: cleanText(data.messageVi, ''),
    messageId: cleanText(data.messageId, ''),
    messageTr: cleanText(data.messageTr, ''),
    messagePl: cleanText(data.messagePl, ''),
    messageEn: cleanText(data.messageEn, ''),
    createdAt,
    createdAtMs,
    updatedAt,
    updatedAtMs,
    expiresAt,
    expiresAtMs,
    priority: Math.max(0, Math.floor(Number(data.priority ?? 0) || 0)),
    targetAppVersions,
    poll,
    vipSurvey,
    reportReply,
    recipientUid: cleanText(data.recipientUid, ''),
    deliveryMode: data.deliveryMode === 'inbox' || data.deliveryMode === 'next_login_modal'
      ? data.deliveryMode
      : null,
    nextLoginModalPending: data.nextLoginModalPending === true,
    showOnNextLoginModal: data.showOnNextLoginModal === true,
  };
}

/**
 * Нормализация ПЕРСОНАЛЬНОГО сообщения из users/{uid}/user_messages (ответ на репорт).
 * Документ хранит один title/body уже на языке юзера (написан админом/ИИ по его репорту),
 * поэтому текст раскладывается во все языковые поля без перевода. TTL длинный: внутри
 * может лежать невостребованная награда.
 */
export function normalizeUserAppMessage(id: string, data: Record<string, unknown>, nowMs = Date.now()): AppMessage {
  const title = cleanText(data.title, '');
  const body = cleanText(data.body, '');
  const createdAtMs = toMs(data.createdAtMs ?? data.createdAt, nowMs);
  return normalizeAppMessage(id, {
    ...data,
    kind: data.kind === 'personal_admin_message' ? 'personal_admin_message' : 'report_reply',
    audience: 'all',
    expiresAtMs: toMs(data.expiresAtMs, createdAtMs + REPORT_REPLY_TTL_MS),
    titleRu: title, titleUk: title, titleEs: title, titlePtBr: title,
    titleVi: title, titleId: title, titleTr: title, titlePl: title, titleEn: title,
    messageRu: body, messageUk: body, messageEs: body, messagePtBr: body,
    messageVi: body, messageId: body, messageTr: body, messagePl: body, messageEn: body,
  }, nowMs);
}

export function normalizeOwnedUserAppMessage(
  id: string,
  data: Record<string, unknown>,
  ownerUid: string,
  nowMs = Date.now(),
): AppMessage | null {
  const message = normalizeUserAppMessage(id, data, nowMs);
  if (message.kind !== 'personal_admin_message') return message;
  return message.recipientUid === ownerUid ? message : null;
}

export function normalizeAppMessageState(messageId: string, data: Record<string, unknown>): AppMessageState {
  const reactionRaw = cleanText(data.reaction, '');
  const pollOptionId = cleanText(data.pollOptionId, '');
  return {
    messageId,
    readAtMs: toMs(data.readAtMs ?? data.readAt, 0) || null,
    dismissedAtMs: toMs(data.dismissedAtMs ?? data.dismissedAt, 0) || null,
    reaction: reactionRaw === 'like' || reactionRaw === 'dislike' ? reactionRaw : null,
    pollOptionId: pollOptionId || null,
    updatedAtMs: toMs(data.updatedAtMs ?? data.updatedAt, 0),
    visibilityRevision: toMs(data.visibilityRevision, 0),
    personalModalAcknowledgedAtMs: toMs(data.personalModalAcknowledgedAtMs, 0) || null,
    appMessageModalAcknowledgedAtMs: toMs(data.appMessageModalAcknowledgedAtMs, 0) || null,
  };
}

export function isAppMessageVisible(message: AppMessage, nowMs = Date.now()): boolean {
  return message.active && message.expiresAtMs > nowMs && message.createdAtMs <= nowMs + 60_000;
}

export function isAppMessageAllowedForAudience(
  message: Pick<AppMessage, 'audience'> & Partial<Pick<AppMessage, 'kind'>>,
  hasPremiumAccess: boolean,
): boolean {
  if (message.kind === 'vip_survey') return !hasPremiumAccess;
  if (message.audience === 'premium') return hasPremiumAccess;
  if (message.audience === 'free') return !hasPremiumAccess;
  return true;
}

export function isAppMessageAllowedForVersion(
  message: Pick<AppMessage, 'targetAppVersions'>,
  appVersion = currentAppVersion(),
): boolean {
  if (!message.targetAppVersions.length) return true;
  const current = cleanAppVersion(appVersion);
  return current ? message.targetAppVersions.includes(current) : false;
}

export function pickAppMessageText(
  message: Pick<AppMessage,
    | 'titleRu' | 'titleUk' | 'titleEs' | 'titlePtBr' | 'titleVi' | 'titleId' | 'titleTr' | 'titlePl' | 'titleEn'
    | 'messageRu' | 'messageUk' | 'messageEs' | 'messagePtBr' | 'messageVi' | 'messageId' | 'messageTr' | 'messagePl' | 'messageEn'
  >,
  lang: AppMessageLang,
): { title: string; body: string } {
  // Переводы заполняет админка авто-переводом (OpenAI) при отправке — для каждого языка
  // приходит настоящий текст, поэтому здесь намеренно НЕТ фолбэка на RU: «planned»-сообщения
  // на чужом языке не должны молча показываться по-русски (см. тест app_messages.test.ts).
  // зачем (EN-проход Сверки settings-gap-002, 12.10): раньше en намеренно падал на RU — английский интерфейс видел
  // «Важное от Phraseman» по-русски. Теперь у кампании свои titleEn/messageEn (админка переводит, сервер пишет без
  // RU-подстановки); пустой en → сообщение для en не показывается (hasAppMessageCopyForLang), как у pt-BR/vi/…
  const byLang: Record<AppMessageLang, { title: string; body: string }> = {
    ru: { title: message.titleRu, body: message.messageRu },
    uk: { title: message.titleUk || message.titleRu, body: message.messageUk || message.messageRu },
    en: { title: message.titleEn, body: message.messageEn },
    es: { title: message.titleEs || message.titleRu, body: message.messageEs || message.messageRu },
    'pt-BR': { title: message.titlePtBr, body: message.messagePtBr },
    vi: { title: message.titleVi, body: message.messageVi },
    id: { title: message.titleId, body: message.messageId },
    tr: { title: message.titleTr, body: message.messageTr },
    pl: { title: message.titlePl, body: message.messagePl },
  };
  return byLang[lang];
}

export function pickAppMessagePollQuestion(poll: AppMessagePoll, lang: AppMessageLang): string {
  const byLang: Record<AppMessageLang, string> = {
    ru: poll.questionRu,
    uk: poll.questionUk || poll.questionRu,
    en: poll.questionEn,
    es: poll.questionEs || poll.questionRu,
    'pt-BR': poll.questionPtBr,
    vi: poll.questionVi,
    id: poll.questionId,
    tr: poll.questionTr,
    pl: poll.questionPl,
  };
  return byLang[lang];
}

export function pickAppMessagePollOptionText(option: AppMessagePollOption, lang: AppMessageLang): string {
  const byLang: Record<AppMessageLang, string> = {
    ru: option.textRu,
    uk: option.textUk || option.textRu,
    en: option.textEn,
    es: option.textEs || option.textRu,
    'pt-BR': option.textPtBr,
    vi: option.textVi,
    id: option.textId,
    tr: option.textTr,
    pl: option.textPl,
  };
  return byLang[lang];
}

/**
 * Есть ли у сообщения текст на этом языке. зачем (settings-gap-002): без перевода сообщение не показываем вовсе —
 * пустая карточка или русский текст на чужом интерфейсе хуже, чем её отсутствие. Опрос — ещё вопрос и все варианты.
 */
export function hasAppMessageCopyForLang(message: AppMessage, lang: AppMessageLang): boolean {
  const text = pickAppMessageText(message, lang);
  if (!String(text.title ?? '').trim()) return false;
  if (!message.poll) return true;
  if (!String(pickAppMessagePollQuestion(message.poll, lang) ?? '').trim()) return false;
  return message.poll.options.every((option) => String(pickAppMessagePollOptionText(option, lang) ?? '').trim() !== '');
}

export function buildAppMessagePreview(body: string, maxChars = 120): string {
  const compact = String(body || '').replace(/\s+/g, ' ').trim();
  if (compact.length <= maxChars) return compact;
  if (maxChars <= 3) return '.'.repeat(Math.max(0, maxChars));
  const raw = compact.slice(0, maxChars - 3).trimEnd();
  const lastSpace = raw.lastIndexOf(' ');
  const head = lastSpace >= Math.floor((maxChars - 3) * 0.55) ? raw.slice(0, lastSpace) : raw;
  return `${head}...`;
}

/**
 * Removes no server-owned message kinds; this boundary only recalculates the unread count.
 */
export function sanitizeAppMessagesInboxSnapshot(snapshot: AppMessagesSnapshot): AppMessagesSnapshot {
  const messages = snapshot.messages;
  const sanitized = {
    messages,
    unreadCount: messages.reduce((count, message) => (
      count + (message.deliverySurface === 'inbox' && message.unread ? 1 : 0)
    ), 0),
  };
  latestAppMessagesSnapshot = sanitized;
  return sanitized;
}

export function mergeAppMessagesWithStates(
  messages: AppMessage[],
  states: AppMessageState[],
  nowMs = Date.now(),
  pendingReportReplyClaimIds: readonly string[] = [],
): AppMessagesSnapshot {
  const stateByMessage = new Map(states.map((state) => [state.messageId, state]));
  const pendingReportReplyClaims = new Set(pendingReportReplyClaimIds);
  const merged = messages
    .filter((message) => {
      const state = stateByMessage.get(message.id);
      const hiddenByUserState = !!state?.dismissedAtMs;
      return !hiddenByUserState && isAppMessageVisible(message, nowMs);
    })
    .sort((a, b) => (b.priority - a.priority) || (b.createdAtMs - a.createdAtMs))
    .map((message) => {
      const state = stateByMessage.get(message.id);
      const readAtMs = state?.readAtMs ?? null;
      const dismissedAtMs = state?.dismissedAtMs ?? null;
      const reportReply = pendingReportReplyClaims.has(message.id) && message.reportReply
        ? { ...message.reportReply, claimed: true }
        : message.reportReply;
      return {
        ...message,
        reportReply,
        readAtMs,
        dismissedAtMs,
        reaction: state?.reaction ?? null,
        pollOptionId: state?.pollOptionId ?? null,
        unread: !readAtMs,
        personalModalAcknowledgedAtMs: state?.personalModalAcknowledgedAtMs ?? null,
        appMessageModalAcknowledgedAtMs: state?.appMessageModalAcknowledgedAtMs ?? null,
      };
    });
  return sanitizeAppMessagesInboxSnapshot({
    messages: merged,
    unreadCount: merged.reduce((n, message) => n + (message.unread ? 1 : 0), 0),
  });
}

export function pickNextLoginPersonalMessage(snapshot: AppMessagesSnapshot): AppMessageWithState | null {
  return snapshot.messages.find((message) => (
    message.kind === 'personal_admin_message'
    && message.deliveryMode === 'next_login_modal'
    && message.nextLoginModalPending
    && !message.personalModalAcknowledgedAtMs
  )) ?? null;
}

export function listPendingAppMessageModals(
  snapshot: AppMessagesSnapshot,
  hasPremiumAccess: boolean,
  appVersion = currentAppVersion(),
): AppMessageWithState[] {
  return filterAppMessagesSnapshotForAudience(snapshot, hasPremiumAccess, appVersion).messages.filter((message) => (
    (message.kind === 'message' || message.kind === 'poll')
    && message.showOnNextLoginModal
    && !message.appMessageModalAcknowledgedAtMs
  ));
}

export function applyPendingReportReplyClaimsToSnapshot(
  snapshot: AppMessagesSnapshot,
  pendingClaims: readonly PendingReportReplyShardClaim[],
): AppMessagesSnapshot {
  if (!pendingClaims.length) return snapshot;
  const pendingIds = new Set(pendingClaims.map((claim) => claim.messageId));
  let changed = false;
  const messages = snapshot.messages.map((message) => {
    if (!pendingIds.has(message.id) || !message.reportReply || message.reportReply.claimed) return message;
    changed = true;
    return { ...message, reportReply: { ...message.reportReply, claimed: true } };
  });
  return changed ? { ...snapshot, messages } : snapshot;
}

export function filterAppMessagesSnapshotForAudience(
  snapshot: AppMessagesSnapshot,
  hasPremiumAccess: boolean,
  appVersion = currentAppVersion(),
  // зачем (settings-gap-002): язык интерфейса — сообщение без текста на нём не попадает ни в список, ни в счётчик.
  lang?: AppMessageLang,
): AppMessagesSnapshot {
  const messages = snapshot.messages.filter((message) =>
    message.deliverySurface === 'inbox' &&
    isAppMessageAllowedForAudience(message, hasPremiumAccess) &&
    isAppMessageAllowedForVersion(message, appVersion) &&
    (lang === undefined || hasAppMessageCopyForLang(message, lang))
  );
  return {
    messages,
    unreadCount: messages.reduce((n, message) => n + (message.unread ? 1 : 0), 0),
  };
}

/**
 * Modern report replies have an atomic mirror in users/{uid}/notifications,
 * where the unified bell renders the complete reward bundle. Keep historical
 * one-pearl messages, but remove modern mirrors and their duplicate unread count.
 */
export function filterAppMessagesSnapshotForNotificationCenter(
  snapshot: AppMessagesSnapshot,
): AppMessagesSnapshot {
  const messages = snapshot.messages.filter((message) => (
    message.kind !== 'report_reply' || message.reportReply?.rewardBundle.severity === 'legacy'
  ));
  return {
    messages,
    unreadCount: messages.reduce((count, message) => count + (message.unread ? 1 : 0), 0),
  };
}

async function readJsonArray<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

async function readLocalPreviewMessages(expectedOwnerUid?: string | null): Promise<AppMessage[]> {
  const ownerUid = expectedOwnerUid ?? await getAppMessagesOwnerUid();
  if (!ownerUid) return [];
  const rows = await readJsonArray<Record<string, unknown> & { id?: string }>(
    appMessagesOwnerStorageKey(LOCAL_APP_MESSAGES_KEY_PREFIX, ownerUid),
  );
  return rows
    .map((row) => {
      const id = cleanPollOptionId(row.id, '');
      return id ? normalizeAppMessage(id, row) : null;
    })
    .filter((row): row is AppMessage => !!row);
}

async function readLocalPreviewStates(expectedOwnerUid?: string | null): Promise<AppMessageState[]> {
  const ownerUid = expectedOwnerUid ?? await getAppMessagesOwnerUid();
  if (!ownerUid) return [];
  const rows = await readJsonArray<Record<string, unknown> & { messageId?: string }>(
    appMessagesOwnerStorageKey(LOCAL_APP_MESSAGE_STATES_KEY_PREFIX, ownerUid),
  );
  return rows
    .map((row) => {
      const messageId = cleanPollOptionId(row.messageId, '');
      return messageId ? normalizeAppMessageState(messageId, row) : null;
    })
    .filter((row): row is AppMessageState => !!row);
}

async function writeLocalPreviewMessages(messages: AppMessage[], expectedOwnerUid?: string | null): Promise<void> {
  const ownerUid = expectedOwnerUid ?? await getAppMessagesOwnerUid();
  if (!ownerUid) return;
  try {
    await AsyncStorage.setItem(appMessagesOwnerStorageKey(LOCAL_APP_MESSAGES_KEY_PREFIX, ownerUid), JSON.stringify(messages));
  } catch (e) {
      // Local preview is best-effort only.
      DebugLogger.error('app_messages:ownerUid', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

async function writeLocalPreviewStates(states: AppMessageState[], expectedOwnerUid?: string | null): Promise<void> {
  const ownerUid = expectedOwnerUid ?? await getAppMessagesOwnerUid();
  if (!ownerUid) return;
  try {
    await AsyncStorage.setItem(appMessagesOwnerStorageKey(LOCAL_APP_MESSAGE_STATES_KEY_PREFIX, ownerUid), JSON.stringify(states));
  } catch (e) {
      // Local preview is best-effort only.
      DebugLogger.error('app_messages:ownerUid', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

async function updateLocalPreviewState(
  messageId: string,
  patch: Partial<AppMessageState>,
  expectedOwnerUid?: string | null,
): Promise<boolean> {
  const cleanMessageId = cleanPollOptionId(messageId, '');
  if (!cleanMessageId) return false;
  const ownerUid = expectedOwnerUid ?? await getAppMessagesOwnerUid();
  if (!ownerUid) return false;
  const localMessages = await readLocalPreviewMessages(ownerUid);
  if (!localMessages.some((message) => message.id === cleanMessageId)) return false;

  const nowMs = Date.now();
  const localStates = await readLocalPreviewStates(ownerUid);
  const existing = localStates.find((state) => state.messageId === cleanMessageId);
  const nextState: AppMessageState = {
    messageId: cleanMessageId,
    readAtMs: patch.readAtMs !== undefined ? patch.readAtMs : (existing?.readAtMs ?? null),
    dismissedAtMs: patch.dismissedAtMs !== undefined ? patch.dismissedAtMs : (existing?.dismissedAtMs ?? null),
    reaction: patch.reaction !== undefined ? patch.reaction : (existing?.reaction ?? null),
    pollOptionId: patch.pollOptionId !== undefined ? patch.pollOptionId : (existing?.pollOptionId ?? null),
    personalModalAcknowledgedAtMs: patch.personalModalAcknowledgedAtMs !== undefined
      ? patch.personalModalAcknowledgedAtMs
      : (existing?.personalModalAcknowledgedAtMs ?? null),
    appMessageModalAcknowledgedAtMs: patch.appMessageModalAcknowledgedAtMs !== undefined
      ? patch.appMessageModalAcknowledgedAtMs
      : (existing?.appMessageModalAcknowledgedAtMs ?? null),
    updatedAtMs: patch.updatedAtMs ?? nowMs,
    visibilityRevision: patch.visibilityRevision ?? existing?.visibilityRevision,
  };
  const nextStates = [
    ...localStates.filter((state) => state.messageId !== cleanMessageId),
    nextState,
  ];
  await writeLocalPreviewStates(nextStates, ownerUid);
  emitAppEvent('app_messages_local_changed');
  return true;
}

async function getFirestoreModule(): Promise<FirestoreFactory | null> {
  if (Platform.OS === 'web' || IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    const mod = await import('@react-native-firebase/firestore');
    // зачем (координатор §67): модульный getFirestore() вместо mod.default — тот же
    // экземпляр базы, но без предупреждения «use getApp()» на каждый вызов фабрики.
    return (() => rnfbInstance(mod, 'getFirestore')) as unknown as FirestoreFactory;
  } catch {
    return null;
  }
}

async function readCachedSnapshot(): Promise<AppMessagesSnapshot> {
  cleanupUnownedAppMessageStorage();
  const ownerUid = await getAppMessagesOwnerUid();
  if (!ownerUid) return { messages: [], unreadCount: 0 };
  try {
    // зачем (§122, замер 04.10): кэш читается несколько раз за старт — через снапшот: хранилище один раз
    const raw = await readStoredItem(appMessagesOwnerStorageKey(APP_MESSAGES_CACHE_KEY_PREFIX, ownerUid));
    if (!raw) return { messages: [], unreadCount: 0 };
    const parsed = JSON.parse(raw) as AppMessagesSnapshot;
    if (!Array.isArray(parsed.messages)) return { messages: [], unreadCount: 0 };
    const snapshot = {
      messages: parsed.messages,
      unreadCount: Math.max(0, Math.floor(Number(parsed.unreadCount || 0))),
    };
    const withClaims = applyPendingReportReplyClaimsToSnapshot(
      sanitizeAppMessagesInboxSnapshot(snapshot),
      await readPendingReportReplyShardClaims(),
    );
    const withVisibility = applyPendingVisibilityToSnapshot(
      withClaims,
      await readPendingAppMessageVisibility(ownerUid),
    );
    const withPersonalModalAcknowledgements = applyPendingPersonalModalAcknowledgementsToSnapshot(
      withVisibility,
      await readPendingPersonalModalAcknowledgements(ownerUid),
    );
    return applyPendingAppMessageModalAcknowledgementsToSnapshot(
      withPersonalModalAcknowledgements,
      await readPendingAppMessageModalAcknowledgements(ownerUid),
    );
  } catch {
    return { messages: [], unreadCount: 0 };
  }
}

export async function readCachedAppMessagesSnapshot(): Promise<AppMessagesSnapshot> {
  return readCachedSnapshot();
}

async function writeCachedSnapshot(
  snapshot: AppMessagesSnapshot,
  expectedOwnerUid?: string | null,
): Promise<void> {
  cleanupUnownedAppMessageStorage();
  const ownerUid = await getAppMessagesOwnerUid();
  if (!ownerUid || (expectedOwnerUid && ownerUid !== expectedOwnerUid)) return;
  try {
    const cacheKey = appMessagesOwnerStorageKey(APP_MESSAGES_CACHE_KEY_PREFIX, ownerUid);
    const next = JSON.stringify(sanitizeAppMessagesInboxSnapshot(snapshot));
    // зачем (замер холодного старта 04.10: запись app_messages_cache 2,9 с в очереди): кэш пишется после каждого обновления с сервера,
    // а сообщения чаще всего те же — одинаковый снимок не пишем.
    if (await readStoredItem(cacheKey) === next) {
      console.warn(`[APP-MESSAGES-CACHE] write:skipped unchanged bytes=${next.length}`);
      return;
    }
    await AsyncStorage.setItem(cacheKey, next);
  } catch (e) {
      // Cache is a comfort feature only.
      DebugLogger.error('app_messages:ownerUid', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

async function readLastBackgroundRefreshMs(): Promise<number> {
  cleanupUnownedAppMessageStorage();
  const ownerUid = await getAppMessagesOwnerUid();
  if (!ownerUid) return 0;
  try {
    const raw = await AsyncStorage.getItem(appMessagesOwnerStorageKey(APP_MESSAGES_LAST_BACKGROUND_REFRESH_KEY_PREFIX, ownerUid));
    const n = Math.floor(Number(raw || 0));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

async function writeLastBackgroundRefreshMs(ms: number, expectedOwnerUid?: string | null): Promise<void> {
  cleanupUnownedAppMessageStorage();
  const ownerUid = await getAppMessagesOwnerUid();
  if (!ownerUid || (expectedOwnerUid && ownerUid !== expectedOwnerUid)) return;
  try {
    await AsyncStorage.setItem(
      appMessagesOwnerStorageKey(APP_MESSAGES_LAST_BACKGROUND_REFRESH_KEY_PREFIX, ownerUid),
      String(Math.max(0, Math.floor(ms))),
    );
  } catch (e) {
      // Best-effort throttle only.
      DebugLogger.error('app_messages:ownerUid', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

/**
 * зачем (смета Ядра e72a5417b №2, координатор 13.10): колокольчик пишет [INBOX-REFRESH] — было ли чтение Firestore и сколько
 * документов; без этого стоимость открытия не видна. Необязателен — прочие вызовы без изменений.
 */
export type AppMessagesRefreshOutcome =
  | Readonly<{ source: 'cache_interval'; ageMs: number; minIntervalMs: number }>
  | Readonly<{ source: 'unavailable'; firestore: boolean; uid: boolean }>
  | Readonly<{ source: 'network'; messages: number; userMessages: number; states: number }>
  | Readonly<{ source: 'error' }>;

export async function refreshAppMessagesSnapshotOnce(options: {
  force?: boolean;
  minIntervalMs?: number;
  nowMs?: number;
  onOutcome?: (outcome: AppMessagesRefreshOutcome) => void;
} = {}): Promise<AppMessagesSnapshot> {
  const rawNowMs = Math.floor(Number(options.nowMs ?? Date.now()));
  const nowMs = Number.isFinite(rawNowMs) ? rawNowMs : Date.now();
  const rawMinIntervalMs = Math.floor(Number(options.minIntervalMs ?? APP_MESSAGES_BACKGROUND_REFRESH_INTERVAL_MS));
  const minIntervalMs = Number.isFinite(rawMinIntervalMs)
    ? Math.max(0, rawMinIntervalMs)
    : APP_MESSAGES_BACKGROUND_REFRESH_INTERVAL_MS;
  const cached = await readCachedSnapshot();
  const uid = await getAppMessagesOwnerUid();
  const firestoreFactory = await getFirestoreModule();
  if (firestoreFactory && uid) {
    await flushPendingAppMessageVisibility(firestoreFactory, uid);
    await flushPendingPersonalModalAcknowledgements(firestoreFactory, uid);
    await flushPendingAppMessageModalAcknowledgements(firestoreFactory, uid);
  }

  if (!options.force) {
    const lastRefreshMs = await readLastBackgroundRefreshMs();
    if (lastRefreshMs > 0 && nowMs - lastRefreshMs < minIntervalMs) {
      DebugLogger.info('[STARTUP-READS]', `app_messages: cache (ageMs=${nowMs - lastRefreshMs} < minIntervalMs=${minIntervalMs}) -> network skipped`);
      options.onOutcome?.({ source: 'cache_interval', ageMs: nowMs - lastRefreshMs, minIntervalMs });
      return cached;
    }
  }

  if (!firestoreFactory || !uid) {
    DebugLogger.info('[STARTUP-READS]', `app_messages: network unavailable (firestore=${firestoreFactory ? 'yes' : 'no'}, uid=${uid ? 'yes' : 'no'}) -> cache`);
    options.onOutcome?.({ source: 'unavailable', firestore: !!firestoreFactory, uid: !!uid });
    return cached;
  }

  try {
    const db = firestoreFactory();
    // зачем (координатор §67): горячее чтение старта — модульные collection/query/orderBy/limit/getDocs
    // (те же три запроса и те же лимиты, без предупреждений устаревшего API).
    const fsMod = await import('@react-native-firebase/firestore');
    const latest = (path: string[], field: string) =>
      fsMod.getDocs(
        fsMod.query(
          fsMod.collection(db, path[0], ...path.slice(1)),
          fsMod.orderBy(field, 'desc'),
          fsMod.limit(APP_MESSAGES_BACKGROUND_FETCH_LIMIT),
        ),
      );
    const [messagesSnap, userMessagesSnap, statesSnap, localMessages, localStates] = await Promise.all([
      latest([APP_MESSAGES_COLLECTION], 'createdAtMs'),
      latest(['users', uid, USER_MESSAGES_COLLECTION], 'createdAtMs')
        // Подколлекции может не быть / rules ещё не задеплоены — глобальная лента важнее.
        .catch(() => ({ docs: [] })),
      // зачем (PM-210, экономия чтений): коллекция состояний растёт монотонно
      // (документ на каждое прочитанное/скрытое сообщение) и не чистится — без
      // limit давний аккаунт читал её ЦЕЛИКОМ. Берём свежие 80, как прежний живой
      // поток: состояния нужны только для сообщений из двух
      // лент выше (тоже по 80), а любая запись состояния ставит updatedAtMs, так
      // что только что тронутое сообщение всегда попадает в выборку.
      latest(['users', uid, APP_MESSAGE_STATES_COLLECTION], 'updatedAtMs'),
      readLocalPreviewMessages(uid),
      readLocalPreviewStates(uid),
    ]);
    const messages = (messagesSnap.docs || []).map((docSnap: any) =>
      normalizeAppMessage(docSnap.id, docSnap.data?.() ?? {}, nowMs),
    );
    const userMessages = (userMessagesSnap.docs || []).map((docSnap: any) =>
      normalizeOwnedUserAppMessage(docSnap.id, docSnap.data?.() ?? {}, uid, nowMs),
    ).filter((message: AppMessage | null): message is AppMessage => !!message);
    const pendingClaims = await migrateLegacyReportReplyClaimsForOwnedMessages(uid, userMessages);
    const states = (statesSnap.docs || []).map((docSnap: any) =>
      normalizeAppMessageState(docSnap.id, docSnap.data?.() ?? {}),
    );
    const pendingVisibility = await acknowledgePendingAppMessageVisibility(uid, states);
    const pendingPersonalModalAcknowledgements = await acknowledgePendingPersonalModalAcknowledgements(uid, states);
    const pendingAppMessageModalAcknowledgements = await acknowledgePendingAppMessageModalAcknowledgements(uid, states);
    const snapshot = mergeAppMessagesWithStates(
      [...messages, ...userMessages, ...localMessages],
      applyPendingAppMessageModalAcknowledgementsToStates(
        applyPendingPersonalModalAcknowledgementsToStates(
          applyPendingVisibilityToStates([...states, ...localStates], pendingVisibility),
          pendingPersonalModalAcknowledgements,
        ),
        pendingAppMessageModalAcknowledgements,
      ),
      nowMs,
      pendingClaims.map((claim) => claim.messageId),
    );
    await writeCachedSnapshot(snapshot, uid);
    await writeLastBackgroundRefreshMs(nowMs, uid);
    DebugLogger.info('[STARTUP-READS]', `app_messages: network read messages=${messages.length} userMessages=${userMessages.length} states=${states.length}`);
    options.onOutcome?.({ source: 'network', messages: messages.length, userMessages: userMessages.length, states: states.length });
    return snapshot;
  } catch (error) {
    reportSwallowed('app_messages:refreshAppMessagesSnapshotOnce', error);
    options.onOutcome?.({ source: 'error' });
    return cached;
  }
}

// зачем (§CORE-0162, аудит стоимости Firebase): живой поток subscribeUserAppMessages (три интервала по 5 мин,
// по 80 документов) удалён — вызовов не было; входящие читаются разово и раз в сутки (refreshAppMessagesSnapshotOnce).
function enqueueAppMessageVisibilityMutation(
  messageId: string,
  dismissedAtMs: number | null,
  requestedAtMs: number,
  capturedOwnerUid: Promise<string | null>,
): Promise<void> {
  const cleanMessageId = cleanPollOptionId(messageId, '');
  if (!cleanMessageId) return Promise.resolve();
  let operation: Promise<void> = Promise.resolve();
  const scheduled = visibilitySchedulingQueue.catch(swallowError('app_messages:visibility_scheduling_queue')).then(async () => {
    const ownerUid = await capturedOwnerUid;
    if (!ownerUid) return;
    const previous = visibilityActionQueueByOwner.get(ownerUid) ?? Promise.resolve();
    operation = previous.catch(swallowError('app_messages:queue_previous')).then(async () => {
      const localHandled = await updateLocalPreviewState(cleanMessageId, {
        dismissedAtMs,
        updatedAtMs: requestedAtMs,
      }, ownerUid);
      if (localHandled) return;
      await recordPendingAppMessageVisibility(ownerUid, cleanMessageId, dismissedAtMs);
      emitAppEvent('app_messages_local_changed');
      await flushPendingAppMessageVisibility(await getFirestoreModule(), ownerUid);
    });
    visibilityActionQueueByOwner.set(ownerUid, operation);
    void operation.finally(() => {
      if (visibilityActionQueueByOwner.get(ownerUid) === operation) visibilityActionQueueByOwner.delete(ownerUid);
    }).catch(swallowError('app_messages:visibility_queue_cleanup'));
  });
  visibilitySchedulingQueue = scheduled;
  return scheduled.then(() => operation);
}

export async function dismissAppMessage(messageId: string): Promise<void> {
  const requestedAtMs = Date.now();
  const capturedOwnerUid = getAppMessagesOwnerUid();
  return enqueueAppMessageVisibilityMutation(messageId, requestedAtMs, requestedAtMs, capturedOwnerUid);
}

export async function restoreAppMessage(messageId: string): Promise<void> {
  const requestedAtMs = Date.now();
  const capturedOwnerUid = getAppMessagesOwnerUid();
  return enqueueAppMessageVisibilityMutation(messageId, null, requestedAtMs, capturedOwnerUid);
}

export async function markAppMessageRead(messageId: string): Promise<void> {
  const nowMs = Date.now();
  const localHandled = await updateLocalPreviewState(messageId, {
    readAtMs: nowMs,
    updatedAtMs: nowMs,
  });
  if (localHandled) return;
  const firestoreFactory = await getFirestoreModule();
  const uid = await getCanonicalUserId().catch((e: unknown) => { reportSwallowed('app_messages:getCanonicalUserId', e); return null; });
  if (!firestoreFactory || !uid || !messageId) return;
  const db = firestoreFactory();
  await db.collection('users').doc(uid).collection(APP_MESSAGE_STATES_COLLECTION).doc(messageId).set(
    {
      messageId,
      readAtMs: nowMs,
      updatedAtMs: nowMs,
    },
    { merge: true },
  );
}

export async function setAppMessageReaction(
  messageId: string,
  reaction: AppMessageReaction | null,
): Promise<void> {
  const firestoreFactory = await getFirestoreModule();
  const uid = await getCanonicalUserId().catch((e: unknown) => { reportSwallowed('app_messages:getCanonicalUserId', e); return null; });
  if (!firestoreFactory || !uid || !messageId) return;
  const nowMs = Date.now();
  const db = firestoreFactory();
  const stateRef = db.collection('users').doc(uid).collection(APP_MESSAGE_STATES_COLLECTION).doc(messageId);
  const reactionRef = db.collection(APP_MESSAGES_COLLECTION).doc(messageId).collection('reactions').doc(uid);

  if (reaction) {
    await Promise.all([
      stateRef.set({ messageId, reaction, updatedAtMs: nowMs }, { merge: true }),
      reactionRef.set({ messageId, userId: uid, reaction, updatedAtMs: nowMs }, { merge: true }),
    ]);
    return;
  }

  await Promise.all([
    stateRef.set({ messageId, reaction: null, updatedAtMs: nowMs }, { merge: true }),
    typeof reactionRef.delete === 'function' ? reactionRef.delete() : Promise.resolve(),
  ]);
}

export async function setAppMessagePollVote(messageId: string, optionId: string): Promise<void> {
  const cleanOptionId = String(optionId || '').trim();
  if (!messageId || !/^[A-Za-z0-9_-]{1,40}$/.test(cleanOptionId)) return;
  const firestoreFactory = await getFirestoreModule();
  const uid = await getCanonicalUserId().catch((e: unknown) => { reportSwallowed('app_messages:getCanonicalUserId', e); return null; });
  if (!firestoreFactory || !uid) return;
  const nowMs = Date.now();
  const db = firestoreFactory();
  const stateRef = db.collection('users').doc(uid).collection(APP_MESSAGE_STATES_COLLECTION).doc(messageId);
  const voteRef = db.collection(APP_MESSAGES_COLLECTION).doc(messageId).collection('poll_votes').doc(uid);

  await Promise.all([
    stateRef.set({ messageId, pollOptionId: cleanOptionId, updatedAtMs: nowMs }, { merge: true }),
    voteRef.set({ messageId, userId: uid, optionId: cleanOptionId, updatedAtMs: nowMs }, { merge: true }),
  ]);
}

// ── «Письмо прилетело» — анимация ровно ОДИН раз на сообщение ──────────────────
// Раньше анимация привязывалась к росту unreadCount в памяти компонента, поэтому
// при каждом перезаходе в приложение (ref сбрасывался) письмо «прилетало» заново.
// Теперь храним ID сообщений, для которых анимация УЖЕ проигрывалась, в AsyncStorage:
// прилёт показывается один раз на сообщение, независимо от перезапусков и от того,
// прочитал юзер его или нет.
const ANIMATED_IDS_CAP = 300;

export async function readAnimatedMessageIds(expectedOwnerUid?: string | null): Promise<string[]> {
  cleanupUnownedAppMessageStorage();
  const ownerUid = expectedOwnerUid ?? await getAppMessagesOwnerUid();
  if (!ownerUid) return [];
  try {
    const raw = await AsyncStorage.getItem(appMessagesOwnerStorageKey(ANIMATED_MESSAGE_IDS_KEY_PREFIX, ownerUid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Записывает переданные ID как «анимация показана». Возвращает обновлённый список
 * (новейшие в конце, обрезан до ANIMATED_IDS_CAP). Идемпотентно для уже известных ID.
 */
export async function markMessageIdsAnimated(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  cleanupUnownedAppMessageStorage();
  const ownerUid = await getAppMessagesOwnerUid();
  if (!ownerUid) return;
  try {
    const existing = await readAnimatedMessageIds(ownerUid);
    const set = new Set(existing);
    for (const id of ids) if (id) set.add(id);
    const next = [...set].slice(-ANIMATED_IDS_CAP);
    await AsyncStorage.setItem(
      appMessagesOwnerStorageKey(ANIMATED_MESSAGE_IDS_KEY_PREFIX, ownerUid),
      JSON.stringify(next),
    );
  } catch (e) {
      // Best-effort: при сбое в худшем случае анимация повторится один раз.
      DebugLogger.error('app_messages:next', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

function isAlreadyClaimedReportReplyError(error: unknown): boolean {
  const code = String((error as { code?: unknown })?.code ?? '');
  const message = String((error as { message?: unknown })?.message ?? '');
  return code.includes('already-exists') || message.includes('already claimed');
}

async function claimReportReplyShardsForAccount(
  messageId: string,
  options: { reconcileLocalBalance?: boolean },
  accountToken: AccountGenerationToken,
  ownerUid: string,
): Promise<{ amount: number; balance: number }> {
  // Compatibility option is intentionally ignored. The callable confirms the
  // claim document only; the client-owned external-event operation projects it.
  void options;
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) throw new Error('cloud_disabled');
  const clean = String(messageId ?? '').trim();
  if (!clean) throw new Error('message_id_required');
  if (!isCurrentAccountGeneration(accountToken, ownerUid)) {
    throw new Error('report_reply_claim_account_changed');
  }

  // Lazy require — модуль functions не должен грузиться (и падать в Expo Go) на импорте.
  const { getApp } = require('@react-native-firebase/app');
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  if (!isCurrentAccountGeneration(accountToken, ownerUid)) {
    throw new Error('report_reply_claim_account_changed');
  }
  const canonicalUid = await getCanonicalUserId().catch((e: unknown) => { reportSwallowed('app_messages:getCanonicalUserId', e); return null; });
  if (
    canonicalUid !== ownerUid
    || !isCurrentAccountGeneration(accountToken, ownerUid)
  ) {
    throw new Error('report_reply_claim_account_changed');
  }

  const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'claimReportReward');
  const res = await fn({ messageId: clean });
  if (!isCurrentAccountGeneration(accountToken, ownerUid)) {
    throw new Error('report_reply_claim_account_changed');
  }
  const amount = Math.max(0, Math.floor(Number((res?.data as any)?.amount) || 0));
  return { amount, balance: 0 };
}

export async function acknowledgePersonalAdminMessageModal(
  messageId: string,
  expectedOwnerUid?: string | null,
): Promise<void> {
  const cleanMessageId = cleanPollOptionId(messageId, '');
  const ownerUid = await getAppMessagesOwnerUid();
  if (!cleanMessageId || !ownerUid || (expectedOwnerUid && ownerUid !== expectedOwnerUid)) return;
  const nowMs = Date.now();
  await recordPendingPersonalModalAcknowledgement(ownerUid, cleanMessageId, nowMs);
  const localHandled = await updateLocalPreviewState(cleanMessageId, {
    readAtMs: nowMs,
    personalModalAcknowledgedAtMs: nowMs,
    updatedAtMs: nowMs,
  }, ownerUid);
  if (localHandled) {
    const pending = await readPendingPersonalModalAcknowledgements(ownerUid);
    await writePendingPersonalModalAcknowledgements(
      ownerUid,
      pending.filter((row) => row.messageId !== cleanMessageId),
    );
    return;
  }
  emitAppEvent('app_messages_local_changed');
  await flushPendingPersonalModalAcknowledgements(await getFirestoreModule(), ownerUid);
}

export async function acknowledgeAppMessageModal(
  messageId: string,
  expectedOwnerUid?: string | null,
): Promise<void> {
  const cleanMessageId = cleanPollOptionId(messageId, '');
  const ownerUid = await getAppMessagesOwnerUid();
  if (!cleanMessageId || !ownerUid || (expectedOwnerUid && ownerUid !== expectedOwnerUid)) return;
  const nowMs = Date.now();
  await recordPendingAppMessageModalAcknowledgement(ownerUid, cleanMessageId, nowMs);
  const localHandled = await updateLocalPreviewState(cleanMessageId, {
    readAtMs: nowMs,
    appMessageModalAcknowledgedAtMs: nowMs,
    updatedAtMs: nowMs,
  }, ownerUid);
  if (localHandled) {
    const pending = await readPendingAppMessageModalAcknowledgements(ownerUid);
    await writePendingAppMessageModalAcknowledgements(
      ownerUid,
      pending.filter((row) => row.messageId !== cleanMessageId),
    );
    return;
  }
  emitAppEvent('app_messages_local_changed');
  await flushPendingAppMessageModalAcknowledgements(await getFirestoreModule(), ownerUid);
}

export async function claimReportReplyShards(
  messageId: string,
  options: { reconcileLocalBalance?: boolean } = {},
): Promise<{ amount: number; balance: number }> {
  const accountToken = captureAccountGeneration();
  const ownerUid = accountToken.stableId;
  if (!ownerUid || !isCurrentAccountGeneration(accountToken, ownerUid)) {
    throw new Error('report_reply_claim_account_changed');
  }
  return claimReportReplyShardsForAccount(messageId, options, accountToken, ownerUid);
}

export async function claimReportReplyShardsOptimistically(
  messageId: string,
  amount: number,
): Promise<boolean> {
  const clean = cleanPollOptionId(messageId, '');
  const safeAmount = Math.max(0, Math.min(1, Math.floor(Number(amount) || 0)));
  if (!clean || safeAmount <= 0) return false;
  const accountToken = captureAccountGeneration();
  const ownerUid = accountToken.stableId;
  if (!ownerUid || !isCurrentAccountGeneration(accountToken, ownerUid)) return false;
  const canonicalUid = await getCanonicalUserId().catch((e: unknown) => { reportSwallowed('app_messages:getCanonicalUserId', e); return null; });
  if (
    canonicalUid !== ownerUid
    || !isCurrentAccountGeneration(accountToken, ownerUid)
  ) return false;
  const queued = await addPendingReportReplyShardClaim(
    clean,
    safeAmount,
    accountToken,
    ownerUid,
  ).catch((e: unknown) => { reportSwallowed('app_messages:addPendingReportReplyShardClaim', e); return false; });
  if (!isCurrentAccountGeneration(accountToken, ownerUid)) return false;
  emitAppEvent('app_messages_local_changed');
  // зачем: D70/D104 — старая награда «1 жемчужина» за ответ на репорт больше не
  // начисляется. Отметку «забрано» на сервере по-прежнему ставим, чтобы кнопка
  // не висела вечно; монет у этого старого формата нет (см. отчёт D104).
  if (!queued) DebugLogger.warn('REPORT-REWARD', `legacy claim not queued id=${clean}`);
  void resumePendingReportReplyShardClaims();
  return true;
}

export const claimReportReplyCoinsOptimistically = claimReportReplyShardsOptimistically;

export async function resumePendingReportReplyShardClaims(): Promise<{ resolved: number; pending: number }> {
  const accountToken = captureAccountGeneration();
  const ownerUid = accountToken.stableId;
  if (!ownerUid || !isCurrentAccountGeneration(accountToken, ownerUid)) {
    return { resolved: 0, pending: 0 };
  }
  const canonicalUid = await getCanonicalUserId().catch((e: unknown) => { reportSwallowed('app_messages:getCanonicalUserId', e); return null; });
  if (
    canonicalUid !== ownerUid
    || !isCurrentAccountGeneration(accountToken, ownerUid)
  ) return { resolved: 0, pending: 0 };
  const claims = await readPendingReportReplyShardClaims(ownerUid);
  if (!isCurrentAccountGeneration(accountToken, ownerUid)) {
    return { resolved: 0, pending: claims.length };
  }
  if (claims.length === 0) return { resolved: 0, pending: 0 };
  let resolved = 0;
  let pending = 0;
  for (const claim of claims) {
    try {
      const result = await claimReportReplyShardsForAccount(
        claim.messageId,
        {},
        accountToken,
        ownerUid,
      );
      if (!isCurrentAccountGeneration(accountToken, ownerUid)) {
        pending += 1;
        continue;
      }
      const removed = await removePendingReportReplyShardClaim(
        claim.messageId,
        accountToken,
        ownerUid,
      );
      if (!removed || !isCurrentAccountGeneration(accountToken, ownerUid)) {
        pending += 1;
        continue;
      }
      resolved += 1;
    } catch (error) {
      if (isAlreadyClaimedReportReplyError(error)) {
        const removed = await removePendingReportReplyShardClaim(
          claim.messageId,
          accountToken,
          ownerUid,
        );
        if (removed && isCurrentAccountGeneration(accountToken, ownerUid)) resolved += 1;
        else pending += 1;
      } else {
        pending += 1;
      }
    }
  }
  if (resolved > 0) emitAppEvent('app_messages_local_changed');
  return { resolved, pending };
}

// ── DEV: кампании слота сообщений Настроек для съёмки R1 ───────────────────────────────────
// зачем (координатор 14.10, R1_SHOT_LIST settings-gap-007…009, 029): слот и опрос Настроек целиком серверные (Firestore app_messages),
// без кампании в админке кадры не снять. Сид кладёт ВЫДУМАННЫЕ кампании (id с префиксом dev-state-) только в локальные ключи устройства:
// локальное хранилище превью сообщений (его читает refreshAppMessagesSnapshotOnce) и кэш снимка. В Firestore НЕ пишет; голос за такую
// кампанию в сеть не уходит (settings_poll_vote.ts). В стор-сборке функция отказывает.
export const DEV_SETTINGS_CAMPAIGN_PREFIX = 'dev-state-';
export type DevSettingsSlotKind = 'poll' | 'poll_voted' | 'message' | 'top' | 'off';
export const DEV_SETTINGS_SLOT_KINDS: readonly DevSettingsSlotKind[] = ['poll', 'poll_voted', 'message', 'top', 'off'];

// зачем (settings-gap-002): у сидов есть en — английский интерфейс иначе не видел бы dev-плашку вовсе (пустой en скрывает сообщение).
type DevCampaignText = Readonly<Record<'ru' | 'uk' | 'es' | 'ptBr' | 'vi' | 'id' | 'tr' | 'pl' | 'en', string>>;
const DEV_POLL_QUESTION: DevCampaignText = {
  // зачем (settings-gap-008, Дизайн 12.10): вопрос и ответы опроса — как в макете settings-gaps-states.html («Что добавить…», 4 варианта, 41/27/21/11 %), иначе кадр и образец расходятся по тексту
  ru: 'Что добавить в первую очередь?', uk: 'Що додати насамперед?', es: '¿Qué añadimos primero?', ptBr: 'O que adicionar primeiro?',
  vi: 'Nên thêm gì trước tiên?', id: 'Apa yang harus ditambahkan dulu?', tr: 'Önce neyi ekleyelim?', pl: 'Co dodać w pierwszej kolejności?',
  en: 'What should we add first?',
};
// зачем (settings-gap-008, Макеты 12.10): сид клал вопрос и в заголовок, и в текст сообщения — на кадре «Что улучшить…» стояло трижды (заголовок, абзац, вопрос).
// Это данные сида, а не шаблон карточки (SettingsMessageSlotCard выводит title / body / question из РАЗНЫХ полей). Теперь заголовок — «Важное от Phraseman» (макет `.gs-sti`), абзаца у опроса нет.
const DEV_POLL_TITLE: DevCampaignText = {
  ru: 'Важное от Phraseman', uk: 'Важливе від Phraseman', es: 'Importante de Phraseman', ptBr: 'Importante do Phraseman',
  vi: 'Quan trọng từ Phraseman', id: 'Penting dari Phraseman', tr: "Phraseman'dan önemli", pl: 'Ważne od Phraseman',
  en: 'Important from Phraseman',
};
// зачем (settings-gap-008): абзац над вопросом — как в макете («Расскажи, чего тебе не хватает…»); он отличается от вопроса, поэтому прежнего тройного повтора нет
const DEV_POLL_BODY: DevCampaignText = {
  ru: 'Расскажи, чего тебе не хватает в приложении — мы читаем каждый ответ.', uk: 'Розкажи, чого тобі не вистачає в застосунку — ми читаємо кожну відповідь.',
  es: 'Cuéntanos qué te falta en la app: leemos cada respuesta.', ptBr: 'Conte o que falta no app: lemos cada resposta.',
  vi: 'Hãy cho chúng tôi biết bạn còn thiếu gì trong ứng dụng — chúng tôi đọc từng câu trả lời.', id: 'Ceritakan apa yang kurang di aplikasi — kami membaca setiap jawaban.',
  tr: 'Uygulamada neyi eksik bulduğunu söyle — her yanıtı okuyoruz.', pl: 'Napisz, czego brakuje ci w aplikacji — czytamy każdą odpowiedź.',
  en: 'Tell us what the app is missing — we read every answer.',
};
// зачем: счётчики 41/27/21/11 дают в сумме 100 — проценты на кадре совпадают с макетом без округления
const DEV_POLL_OPTIONS: ReadonlyArray<{ id: string; text: DevCampaignText; count: number }> = [
  { id: 'lessons', count: 41, text: { ru: 'Больше уроков', uk: 'Більше уроків', es: 'Más lecciones', ptBr: 'Mais lições', vi: 'Thêm bài học', id: 'Lebih banyak pelajaran', tr: 'Daha fazla ders', pl: 'Więcej lekcji', en: 'More lessons' } },
  { id: 'dialogs', count: 27, text: { ru: 'Больше диалогов', uk: 'Більше діалогів', es: 'Más diálogos', ptBr: 'Mais diálogos', vi: 'Thêm hội thoại', id: 'Lebih banyak dialog', tr: 'Daha fazla diyalog', pl: 'Więcej dialogów', en: 'More dialogs' } },
  { id: 'cards', count: 21, text: { ru: 'Больше карточек', uk: 'Більше карток', es: 'Más tarjetas', ptBr: 'Mais cartões', vi: 'Thêm thẻ', id: 'Lebih banyak kartu', tr: 'Daha fazla kart', pl: 'Więcej kart', en: 'More cards' } },
  { id: 'other', count: 11, text: { ru: 'Другое', uk: 'Інше', es: 'Otro', ptBr: 'Outro', vi: 'Khác', id: 'Lainnya', tr: 'Diğer', pl: 'Inne', en: 'Other' } },
];
const DEV_MESSAGE_TITLE: DevCampaignText = {
  ru: 'Новое в Phraseman', uk: 'Нове в Phraseman', es: 'Novedades en Phraseman', ptBr: 'Novidades no Phraseman',
  vi: 'Có gì mới trong Phraseman', id: 'Baru di Phraseman', tr: "Phraseman'da yenilikler", pl: 'Nowości w Phraseman',
  en: "What's new in Phraseman",
};
const DEV_MESSAGE_BODY: DevCampaignText = {
  ru: 'Мы добавили Шпиль и обновили Карточки. Загляни и расскажи, как тебе.', uk: 'Ми додали Шпиль і оновили Картки. Зазирни та розкажи, як тобі.',
  // зачем (владелец 11.10): Шпиль в первом выпуске только для интерфейса ru/uk — остальным о нём не рассказываем.
  es: 'Renovamos las Tarjetas. Échales un vistazo.', ptBr: 'Renovamos os Cartões. Dê uma olhada.',
  vi: 'Chúng tôi đã làm mới Thẻ. Hãy xem thử.', id: 'Kami memperbarui Kartu. Coba lihat.',
  tr: 'Kartlar yenilendi. Bir göz at.', pl: 'Odświeżyliśmy Karty. Zajrzyj.',
  en: 'We refreshed Cards. Take a look.',
};

function devCampaignRow(id: string, slot: SettingsMessageSlot, kind: 'poll' | 'message', nowMs: number): Record<string, unknown> {
  const texts = (prefix: string, t: DevCampaignText): Record<string, string> => ({
    [prefix + 'Ru']: t.ru, [prefix + 'Uk']: t.uk, [prefix + 'Es']: t.es, [prefix + 'PtBr']: t.ptBr,
    [prefix + 'Vi']: t.vi, [prefix + 'Id']: t.id, [prefix + 'Tr']: t.tr, [prefix + 'Pl']: t.pl, [prefix + 'En']: t.en,
  });
  const row: Record<string, unknown> = {
    id, kind, active: true, audience: 'all', deliverySurface: 'settings', settingsSlot: slot, controlPercent: 0, priority: 1,
    createdAtMs: nowMs, updatedAtMs: nowMs, expiresAtMs: nowMs + APP_MESSAGE_TTL_MS,
    ...texts('title', kind === 'poll' ? DEV_POLL_TITLE : DEV_MESSAGE_TITLE),
    ...texts('message', kind === 'poll' ? DEV_POLL_BODY : DEV_MESSAGE_BODY),
  };
  if (kind === 'poll') {
    row.poll = {
      ...texts('question', DEV_POLL_QUESTION),
      options: DEV_POLL_OPTIONS.map((option) => ({ id: option.id, ...texts('text', option.text) })),
      counts: Object.fromEntries(DEV_POLL_OPTIONS.map((option) => [option.id, option.count])),
      voteCount: DEV_POLL_OPTIONS.reduce((sum, option) => sum + option.count, 0),
    };
  }
  return row;
}

/** Выставить dev-кампанию слота Настроек (poll — опрос без голоса, poll_voted — опрос с голосом, message — сообщение внизу, top — сообщение вверху, off — убрать). */
export async function devSeedSettingsMessageSlot(kind: DevSettingsSlotKind, stableId: string): Promise<{ ok: boolean; reason: string }> {
  const tag = '[DEV-STATE] settings_slot';
  if (!(typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE)) {
    console.warn(`${tag} отказ: не dev-сборка kind=${kind}`);
    return { ok: false, reason: 'not_dev_build' };
  }
  const ownerUid = await getAppMessagesOwnerUid();
  console.log(`${tag} вход kind=${kind} stableId=${stableId ? 'есть' : 'нет'} ownerUid=${ownerUid ? 'есть' : 'нет'}`);
  if (!ownerUid) {
    console.warn(`${tag} отказ: владелец сообщений не определён (нет аккаунта/гостя)`);
    return { ok: false, reason: 'no_owner' };
  }
  const nowMs = Date.now();
  const rows: Record<string, unknown>[] = kind === 'off' ? []
    : kind === 'message' ? [devCampaignRow(`${DEV_SETTINGS_CAMPAIGN_PREFIX}message`, 'bottom', 'message', nowMs)]
      : kind === 'top' ? [devCampaignRow(`${DEV_SETTINGS_CAMPAIGN_PREFIX}top`, 'top', 'message', nowMs)]
        : [devCampaignRow(`${DEV_SETTINGS_CAMPAIGN_PREFIX}poll`, 'bottom', 'poll', nowMs)];
  const devMessages = rows.map((row) => normalizeAppMessage(String(row.id), row, nowMs));
  const isDev = (id: string) => id.startsWith(DEV_SETTINGS_CAMPAIGN_PREFIX);

  const localBefore = await readLocalPreviewMessages(ownerUid);
  await writeLocalPreviewMessages([...localBefore.filter((message) => !isDev(message.id)), ...devMessages], ownerUid);

  const cached = await readCachedSnapshot();
  const withState = devMessages.map((message): AppMessageWithState => ({
    ...message, readAtMs: null, dismissedAtMs: null, reaction: null, pollOptionId: null, unread: false,
    personalModalAcknowledgedAtMs: null, appMessageModalAcknowledgedAtMs: null,
  }));
  const snapshot: AppMessagesSnapshot = { messages: [...cached.messages.filter((message) => !isDev(message.id)), ...withState], unreadCount: cached.unreadCount };
  await writeCachedSnapshot(snapshot, ownerUid);

  const { devSetSettingsPollVote, ownerTail } = await import('./settings_poll_vote');
  const voteOk = await devSetSettingsPollVote(stableId, `${DEV_SETTINGS_CAMPAIGN_PREFIX}poll`, kind === 'poll_voted' ? DEV_POLL_OPTIONS[0]!.id : null);
  emitAppEvent('app_messages_local_changed');
  // зачем (settings-gap-008, логи до починки): голос пишется под stableId сида, экран читает под stableId поколения аккаунта — сравнить хвосты.
  console.log(`[SETTINGS-POLL] сид голоса kind=${kind} voteOwner=${ownerTail(stableId)} messagesOwner=${ownerTail(ownerUid)}`);
  console.log(`${tag} итог kind=${kind} кампаний=${devMessages.length} (id: ${devMessages.map((message) => message.id).join(',') || 'нет'}) голос=${kind === 'poll_voted' ? 'отдан локально' : 'снят'} voteStoreOk=${String(voteOk)} кэш=${snapshot.messages.length} сообщений`);
  return { ok: true, reason: kind };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

/**
 * Демо-сообщение окна «сообщение команды» (Авторизация 12.10, system-012; dev `appmessage=announcement`): та же dev-кампания, что слот Настроек,
 * но во «Входящих» и с показом окна. Только память: ни записи в хранилище, ни сети. id с префиксом dev-state- — закрытие не подтверждается.
 */
export function devAnnouncementModalMessage(nowMs: number): AppMessageWithState {
  const row: Record<string, unknown> = {
    ...devCampaignRow(`${DEV_SETTINGS_CAMPAIGN_PREFIX}announcement`, 'bottom', 'message', nowMs),
    deliverySurface: 'inbox',
    showOnNextLoginModal: true,
  };
  const message = normalizeAppMessage(String(row.id), row, nowMs);
  return {
    ...message, readAtMs: null, dismissedAtMs: null, reaction: null, pollOptionId: null, unread: true,
    personalModalAcknowledgedAtMs: null, appMessageModalAcknowledgedAtMs: null,
  };
}

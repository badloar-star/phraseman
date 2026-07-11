import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { ensureAnonUser } from './cloud_sync';
import { mergeStreakByActivityDate } from './streak_safety';
import { getCanonicalUserId } from './user_id_policy';
import { getCurrentWeekStartIso } from './weekly_xp';
import { getLevelFromXP } from '../constants/theme';
import { emitAppEvent } from './events';

export type ProgressEventType =
  | 'lesson_answer'
  | 'lesson_complete'
  | 'quiz_answer'
  | 'dialog_complete'
  | 'exam_complete'
  | 'daily_task_reward'
  | 'achievement_reward'
  | 'level_up_bonus'
  | 'daily_login_bonus'
  | 'daily_phrase_quest'
  | 'bonus_chest'
  | 'vocabulary_learned'
  | 'verb_learned'
  | 'preposition_drill_answer'
  | 'preposition_drill_perfect'
  | 'review_answer'
  | 'diagnostic_test'
  | 'plan_task_complete'
  | 'club_mission_complete'
  | 'wager_win';

export type ProgressEventRequest = {
  eventId?: string;
  type: ProgressEventType;
  payload: Record<string, unknown>;
};

export type ProgressEventResult = {
  ok: true;
  stableUid: string;
  eventId: string;
  type: ProgressEventType;
  duplicate: boolean;
  xpDelta: number;
  totalXp: number;
  level: number;
  streakCount: number;
  activeDate: string;
  weekKey: string;
  weekXp: number;
};

export type ProgressSubmitOptions = {
  migrationSnapshot?: Record<string, string> | null;
};

type QueuedProgressEvent = {
  eventId: string;
  type: ProgressEventType;
  clientLocalDate: string;
  clientCreatedAt: number;
  appVersion: string;
  platform: string;
  stableId: string;
  payload: Record<string, unknown>;
};

const FUNCTIONS_REGION = 'us-central1';
const PROGRESS_EVENT_QUEUE_KEY = 'progress_server_event_queue_v1';
const PROGRESS_MIGRATED_KEY = 'progress_server_snapshot_migrated_v1';
const PROGRESS_MIGRATION_BASELINE_KEY = 'progress_server_snapshot_baseline_v1';
const PROGRESS_EVENT_DEAD_LETTER_KEY = 'progress_server_event_dead_letter_v1';
const PROGRESS_EVENT_DEAD_LETTER_MAX = 100;
const CALLABLE_TIMEOUT_MS = 15000;

const SERVER_PROGRESS_BASE_KEYS = [
  'user_total_xp',
  'user_prev_xp',
  'user_level',
  'weekly_xp',
  'weekly_xp_period_start',
  'week_points',
  'week_points_v2',
  'streak_count',
  'last_active_date',
  'streak_last_date',
  'unlocked_lessons',
];

const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'final'];
const TARGETS = ['en', 'fr'] as const;

const EVENT_ID_HASH_PREFIX_LEN = 10;
const EVENT_ID_UNSTABLE_PAYLOAD_KEYS = new Set<string>([
  'localTotalBeforeServer',
  'multiplier',
  'baseAmount',
]);

function stripUnstableEventIdPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (EVENT_ID_UNSTABLE_PAYLOAD_KEYS.has(key)) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

function stableNormalizeForEventId(value: unknown, depth = 0): unknown {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim().slice(0, 80);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    return Math.trunc(value * 1000) / 1000;
  }
  if (typeof value === 'boolean' || typeof value === 'bigint') return value;
  if (Array.isArray(value)) {
    if (depth >= 4) return value.length;
    return value.slice(0, 12).map((entry) => stableNormalizeForEventId(entry, depth + 1));
  }
  if (typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const keys = Object.keys(input).sort();
    const normalized: Record<string, unknown> = {};
    for (const key of keys) {
      normalized[key] = stableNormalizeForEventId(input[key], depth + 1);
    }
    return normalized;
  }
  return String(value).slice(0, 80);
}

function stableJsonForEventId(value: unknown): string {
  return JSON.stringify(stableNormalizeForEventId(value), null, 0);
}

function hashStringForEventId(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
    hash >>>= 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function makeEventId(type: ProgressEventType, payload: Record<string, unknown> = {}): string {
  const dayKey = localDateKey();
  const stablePayload = stripUnstableEventIdPayload(payload);
  const payloadShape = stableJsonForEventId({
    type,
    dayKey,
    payload: stableNormalizeForEventId(stablePayload),
  });
  const fingerprint = hashStringForEventId(payloadShape).slice(0, EVENT_ID_HASH_PREFIX_LEN);
  return `${eventPrefix(type)}:${type}:${dayKey}:${fingerprint}`;
}

export function makeDeterministicProgressEventId(
  type: ProgressEventType,
  payload: Record<string, unknown> = {},
): string {
  return makeEventId(type, payload);
}

function targetScopedKey(domain: 'lesson_progress' | 'level_exams', target: 'en' | 'fr', id: string | number): string {
  return target === 'fr' ? `${domain}_v2::fr::${encodeURIComponent(String(id))}` : String(id);
}

function lessonProgressKey(lessonId: number, target: 'en' | 'fr'): string {
  return target === 'fr' ? targetScopedKey('lesson_progress', target, lessonId) : `lesson${lessonId}_progress`;
}

function lessonFieldKey(lessonId: number, field: 'best_score' | 'pass_count' | 'cellIndex', target: 'en' | 'fr'): string {
  return targetScopedKey('lesson_progress', target, `lesson${lessonId}_${field}`);
}

function unlockedLessonsKey(target: 'en' | 'fr'): string {
  return targetScopedKey('lesson_progress', target, 'unlocked_lessons');
}

function levelExamFieldKey(level: string, field: 'pct' | 'best_pct' | 'passed' | 'pass_count' | 'completed_at', target: 'en' | 'fr'): string {
  const normalized = level === 'final' ? 'final' : level.toUpperCase();
  return targetScopedKey('level_exams', target, `level_exam_${normalized}_${field}`);
}

function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function appVersion(): string {
  return String(Constants.expoConfig?.version || Constants.manifest2?.extra?.expoClient?.version || 'unknown');
}

function eventPrefix(type: ProgressEventType): string {
  if (type.includes('exam')) return 'exam';
  if (type.includes('quiz')) return 'quiz';
  if (type.includes('lesson') || type.includes('vocabulary') || type.includes('verb')) return 'lesson';
  if (type.includes('plan')) return 'plan';
  if (type.includes('club')) return 'club';
  return 'progress';
}

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name, { timeout: CALLABLE_TIMEOUT_MS });
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}_timeout`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function progressSnapshotKeys(): string[] {
  const keys = new Set<string>(SERVER_PROGRESS_BASE_KEYS);
  for (const target of TARGETS) {
    keys.add(unlockedLessonsKey(target));
    for (let i = 1; i <= 80; i += 1) {
      keys.add(lessonFieldKey(i, 'best_score', target));
      keys.add(lessonFieldKey(i, 'pass_count', target));
      keys.add(lessonProgressKey(i, target));
      keys.add(lessonFieldKey(i, 'cellIndex', target));
    }
    for (const level of LEVELS) {
      keys.add(levelExamFieldKey(level, 'pct', target));
      keys.add(levelExamFieldKey(level, 'best_pct', target));
      keys.add(levelExamFieldKey(level, 'passed', target));
      keys.add(levelExamFieldKey(level, 'pass_count', target));
      keys.add(levelExamFieldKey(level, 'completed_at', target));
    }
  }
  return Array.from(keys);
}

async function readLocalProgressSnapshot(): Promise<Record<string, string>> {
  const pairs = await AsyncStorage.multiGet(progressSnapshotKeys());
  const out: Record<string, string> = {};
  for (const [key, value] of pairs) {
    if (value != null && value !== '') out[key] = value;
  }
  return out;
}

function progressOwnerKey(baseKey: string, stableId: string): string {
  return `${baseKey}:${encodeURIComponent(stableId)}`;
}

function parseQueuedEvents(raw: string | null): QueuedProgressEvent[] {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.eventId === 'string') : [];
  } catch {
    return [];
  }
}

async function readQueue(stableId: string): Promise<QueuedProgressEvent[]> {
  const key = progressOwnerKey(PROGRESS_EVENT_QUEUE_KEY, stableId);
  const [scopedRaw, legacyRaw] = await Promise.all([
    AsyncStorage.getItem(key),
    AsyncStorage.getItem(PROGRESS_EVENT_QUEUE_KEY),
  ]);
  const scoped = parseQueuedEvents(scopedRaw).filter((event) => event.stableId === stableId);
  const legacy = parseQueuedEvents(legacyRaw);
  const ownedLegacy = legacy.filter((event) => event.stableId === stableId);
  if (ownedLegacy.length === 0) return scoped;

  const merged = [...scoped];
  for (const event of ownedLegacy) {
    if (!merged.some((item) => item.eventId === event.eventId)) merged.push(event);
  }
  const foreignLegacy = legacy.filter((event) => event.stableId !== stableId);
  await AsyncStorage.multiSet([
    [key, JSON.stringify(merged)],
    [PROGRESS_EVENT_QUEUE_KEY, JSON.stringify(foreignLegacy)],
  ]);
  return merged;
}

export async function hasPendingProgressServerEvents(): Promise<boolean> {
  try {
    const stableId = await getCanonicalUserId();
    if (!stableId) return false;
    const queue = await readQueue(stableId);
    return queue.length > 0;
  } catch {
    return false;
  }
}

async function writeQueue(stableId: string, queue: QueuedProgressEvent[]): Promise<void> {
  await AsyncStorage.setItem(progressOwnerKey(PROGRESS_EVENT_QUEUE_KEY, stableId), JSON.stringify(queue));
}

function parseProgressSnapshot(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

function parseOwnedProgressSnapshot(raw: string | null, stableId: string): Record<string, string> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { ownerStableUid?: unknown; progress?: unknown };
    if (parsed?.ownerStableUid !== stableId) return null;
    return parseProgressSnapshot(parsed.progress);
  } catch {
    return null;
  }
}

async function readOwnedProgressBaseline(stableId: string): Promise<Record<string, string> | null> {
  return parseOwnedProgressSnapshot(
    await AsyncStorage.getItem(progressOwnerKey(PROGRESS_MIGRATION_BASELINE_KEY, stableId)),
    stableId,
  );
}

async function writeOwnedProgressBaseline(stableId: string, progress: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(
    progressOwnerKey(PROGRESS_MIGRATION_BASELINE_KEY, stableId),
    JSON.stringify({ ownerStableUid: stableId, progress }),
  );
}

function progressErrorDiagnostic(error: unknown): string {
  const e = error as { code?: unknown; message?: unknown } | null;
  return String(e?.code ?? e?.message ?? error ?? 'unknown').slice(0, 160);
}

function isPermanentProgressEventError(error: unknown): boolean {
  const diagnostic = progressErrorDiagnostic(error).toLowerCase();
  return [
    'invalid-argument',
    'out-of-range',
    'unimplemented',
    'invalid_progress_event',
    'unsupported_progress_event',
    'invalid_event_payload',
  ].some((token) => diagnostic.includes(token));
}

async function appendDeadLetter(stableId: string, event: QueuedProgressEvent, error: unknown): Promise<void> {
  const key = progressOwnerKey(PROGRESS_EVENT_DEAD_LETTER_KEY, stableId);
  const raw = await AsyncStorage.getItem(key);
  let entries: Array<Record<string, unknown>> = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) entries = parsed;
  } catch {
    entries = [];
  }
  entries.push({ event, failedAt: Date.now(), diagnostic: progressErrorDiagnostic(error) });
  await AsyncStorage.setItem(key, JSON.stringify(entries.slice(-PROGRESS_EVENT_DEAD_LETTER_MAX)));
  if (__DEV__) console.warn('[progress_events_client] permanent event moved to dead-letter', {
    eventId: event.eventId,
    diagnostic: progressErrorDiagnostic(error),
  });
}

function parseNonNegativeNumber(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function sameWeekPoints(raw: unknown, weekKey: string): number | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  try {
    const parsed = JSON.parse(raw) as { weekKey?: unknown; points?: unknown };
    if (parsed?.weekKey !== weekKey) return null;
    return parseNonNegativeNumber(parsed.points);
  } catch {
    return null;
  }
}

async function enqueueMirroredLevelUps(prevTotalXp: number, nextTotalXp: number): Promise<void> {
  const prevLevel = getLevelFromXP(Math.max(0, Math.floor(prevTotalXp)));
  const nextLevel = getLevelFromXP(Math.max(0, Math.floor(nextTotalXp)));
  if (nextLevel <= prevLevel) return;

  try {
    const raw = await AsyncStorage.getItem('pending_level_up_queue');
    let queue: number[] = [];
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      queue = Array.isArray(parsed)
        ? parsed.filter((item): item is number => Number.isFinite(item) && item > 0)
        : [];
    } catch {
      queue = [];
    }
    for (let level = prevLevel + 1; level <= nextLevel; level += 1) {
      if (!queue.includes(level)) queue.push(level);
    }
    await AsyncStorage.setItem('pending_level_up_queue', JSON.stringify(queue));
    emitAppEvent('level_up_pending');
  } catch {
    // Losing this queue would lose a visible reward; keep mirror robust and retry on next XP event/startup.
  }
}

// Prevents two concurrent flush loops from racing on the same queue.
let flushInFlight: Promise<number> | null = null;
const flushedProgressResults = new Map<string, ProgressEventResult>();

async function enqueue(event: QueuedProgressEvent): Promise<void> {
  const queue = await readQueue(event.stableId);
  if (!queue.some((item) => item.eventId === event.eventId)) {
    queue.push(event);
    await writeQueue(event.stableId, queue);
  }
}

export async function ensureProgressSnapshotMigrated(): Promise<boolean> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return true;
  await ensureAnonUser();
  const stableId = await getCanonicalUserId();
  if (!stableId) throw new Error('progress_stable_id_unavailable');
  const migratedKey = progressOwnerKey(PROGRESS_MIGRATED_KEY, stableId);
  if (await AsyncStorage.getItem(migratedKey)) return true;
  const appCheckReady = await initFirebaseAppCheckIfAvailable().catch(() => false);
  if (!appCheckReady) return false;
  const frozen = await readOwnedProgressBaseline(stableId);
  const progress = frozen ?? await readLocalProgressSnapshot();
  const fn = callable<{ stableId: string; progress: Record<string, string> }, { ok: true; migrated: boolean }>('progressMigrateSnapshot');
  await withTimeout(fn({ stableId, progress }), CALLABLE_TIMEOUT_MS, 'progress_migrate_snapshot');
  await AsyncStorage.setItem(migratedKey, '1');
  await AsyncStorage.removeItem(progressOwnerKey(PROGRESS_MIGRATION_BASELINE_KEY, stableId));
  return true;
}

export async function prepareProgressMigrationSnapshot(): Promise<Record<string, string> | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  const stableId = await getCanonicalUserId();
  if (!stableId) return null;
  if (await AsyncStorage.getItem(progressOwnerKey(PROGRESS_MIGRATED_KEY, stableId))) return null;
  const frozen = await readOwnedProgressBaseline(stableId);
  if (frozen) return frozen;
  const progress = await readLocalProgressSnapshot();
  await writeOwnedProgressBaseline(stableId, progress);
  return progress;
}

async function ensureProgressSnapshotMigratedWithBaseline(
  snapshotOverride?: Record<string, string> | null,
): Promise<boolean> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return true;
  await ensureAnonUser();
  const stableId = await getCanonicalUserId();
  if (!stableId) throw new Error('progress_stable_id_unavailable');
  const migratedKey = progressOwnerKey(PROGRESS_MIGRATED_KEY, stableId);
  if (await AsyncStorage.getItem(migratedKey)) return true;
  const appCheckReady = await initFirebaseAppCheckIfAvailable().catch(() => false);
  if (!appCheckReady) return false;
  const frozen = await readOwnedProgressBaseline(stableId);
  const progress = frozen ?? snapshotOverride ?? await readLocalProgressSnapshot();
  const fn = callable<{ stableId: string; progress: Record<string, string> }, { ok: true; migrated: boolean }>('progressMigrateSnapshot');
  await withTimeout(fn({ stableId, progress }), CALLABLE_TIMEOUT_MS, 'progress_migrate_snapshot');
  await AsyncStorage.setItem(migratedKey, '1');
  await AsyncStorage.removeItem(progressOwnerKey(PROGRESS_MIGRATION_BASELINE_KEY, stableId));
  return true;
}

export async function mirrorProgressResultToLocal(result: ProgressEventResult): Promise<void> {
  const weekStart = getCurrentWeekStartIso(new Date(`${result.activeDate}T00:00:00.000Z`));
  const [[, localTotalXp], [, localWeekStart], [, localWeeklyXp], [, localWeekPointsRaw], [, localStreak], [, localLastActive], [, localStreakLast]] = await AsyncStorage.multiGet([
    'user_total_xp',
    'weekly_xp_period_start',
    'weekly_xp',
    'week_points_v2',
    'streak_count',
    'last_active_date',
    'streak_last_date',
  ]);
  const localTotalBeforeMirror = parseNonNegativeNumber(localTotalXp);
  const serverTotalXp = parseNonNegativeNumber(result.totalXp);
  const serverWeekXp = parseNonNegativeNumber(result.weekXp);
  const serverStreak = Math.max(0, Math.floor(parseNonNegativeNumber(result.streakCount)));
  const localWeekPoints = sameWeekPoints(localWeekPointsRaw, result.weekKey);
  const localWeeklyIsCurrent = localWeekStart === weekStart || localWeekPoints !== null;
  const mergedTotalXp = Math.max(localTotalBeforeMirror, serverTotalXp);
  const currentWeekCandidates = [serverWeekXp];
  if (localWeeklyIsCurrent) {
    currentWeekCandidates.push(parseNonNegativeNumber(localWeeklyXp));
    if (localWeekPoints !== null) currentWeekCandidates.push(localWeekPoints);
  }
  const mergedWeekXp = Math.max(...currentWeekCandidates);
  const mergedStreakState = mergeStreakByActivityDate(
    { streak: localStreak, lastActive: localLastActive, streakLast: localStreakLast },
    { streak: serverStreak, lastActive: result.activeDate, streakLast: result.activeDate },
  );
  const mergedStreak = mergedStreakState.streak;
  const mergedActiveDate = mergedStreakState.lastActive ?? result.activeDate;
  await AsyncStorage.multiSet([
    ['user_total_xp', String(mergedTotalXp)],
    ['user_prev_xp', String(mergedTotalXp)],
    ['user_level', String(getLevelFromXP(mergedTotalXp))],
    ['weekly_xp', String(mergedWeekXp)],
    ['weekly_xp_period_start', weekStart],
    ['week_points', String(Math.round(mergedWeekXp))],
    ['week_points_v2', JSON.stringify({ weekKey: result.weekKey, points: mergedWeekXp })],
    ['streak_count', String(mergedStreak)],
    ['last_active_date', mergedActiveDate],
    ['streak_last_date', mergedActiveDate],
  ]);
  if (mergedTotalXp > localTotalBeforeMirror) {
    await enqueueMirroredLevelUps(localTotalBeforeMirror, mergedTotalXp);
  }
}

async function submitQueuedEvent(event: QueuedProgressEvent): Promise<ProgressEventResult> {
  const appCheckReady = await initFirebaseAppCheckIfAvailable().catch(() => false);
  if (!appCheckReady) throw new Error('app_check_unavailable');
  const fn = callable<QueuedProgressEvent, ProgressEventResult>('progressSubmitEvent');
  const res = await withTimeout(fn(event), CALLABLE_TIMEOUT_MS, 'progress_submit_event');
  flushedProgressResults.set(event.eventId, res.data);
  while (flushedProgressResults.size > 256) {
    const oldest = flushedProgressResults.keys().next().value;
    if (!oldest) break;
    flushedProgressResults.delete(oldest);
  }
  await mirrorProgressResultToLocal(res.data);
  return res.data;
}

async function doFlush(): Promise<number> {
  if (!(await ensureProgressSnapshotMigrated())) return 0;
  const stableId = await getCanonicalUserId();
  if (!stableId) throw new Error('progress_stable_id_unavailable');
  // Реферал: отложенный код (введён офлайн) должен примениться ДО отправки прогресса.
  // Квалификация «урок 1 пройден» срабатывает только по живому событию урока — если событие
  // долетит раньше attribution, оба участника навсегда останутся без своих 7 дней.
  // Без кода в очереди — мгновенный no-op (одно чтение AsyncStorage).
  try {
    const m = await import('./referral_bootstrap');
    await m.tryApplyPendingReferral();
  } catch { /* нет сети/кода — прогресс не блокируем, ретрай на следующем flush */ }
  const queue = await readQueue(stableId);
  if (queue.length === 0) return 0;
  const remaining = [...queue];
  let sent = 0;
  while (remaining.length > 0) {
    const next = remaining[0];
    try {
      await submitQueuedEvent(next);
    } catch (error) {
      if (!isPermanentProgressEventError(error)) {
        // Transient transport/auth failures stay at the head for a later retry.
        break;
      }
      await appendDeadLetter(stableId, next, error).catch(() => {});
      remaining.shift();
      await writeQueue(stableId, remaining);
      continue;
    }
    remaining.shift();
    sent += 1;
    await writeQueue(stableId, remaining);
  }
  return sent;
}

export function flushPendingProgressEvents(): Promise<number> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return Promise.resolve(0);
  if (flushInFlight) return flushInFlight;
  flushInFlight = doFlush().finally(() => { flushInFlight = null; });
  return flushInFlight;
}

export async function submitProgressEvent(
  request: ProgressEventRequest,
  options?: ProgressSubmitOptions,
): Promise<ProgressEventResult> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    throw new Error('progress_server_unavailable');
  }
  const stableId = await getCanonicalUserId();
  if (!stableId) throw new Error('progress_stable_id_unavailable');
  const [[, clientStreakCount], [, clientLastActive], [, clientStreakLast]] = await AsyncStorage.multiGet([
    'streak_count',
    'last_active_date',
    'streak_last_date',
  ]);
  const event: QueuedProgressEvent = {
    eventId: request.eventId || makeDeterministicProgressEventId(request.type, request.payload),
    type: request.type,
    clientLocalDate: localDateKey(),
    clientCreatedAt: Date.now(),
    appVersion: appVersion(),
    platform: Platform.OS,
    stableId,
    payload: {
      ...request.payload,
      clientStreakCount: clientStreakCount ?? undefined,
      clientLastActiveDate: clientLastActive ?? clientStreakLast ?? undefined,
    },
  };
  // Commit to the durable outbox before any network work. A crash during the
  // request must not lose a completed answer or its XP event.
  await enqueue(event);
  try {
    await ensureProgressSnapshotMigratedWithBaseline(options?.migrationSnapshot);
    await flushPendingProgressEvents();
    const flushed = flushedProgressResults.get(event.eventId);
    if (flushed) {
      flushedProgressResults.delete(event.eventId);
      return flushed;
    }
    const stillQueued = (await readQueue(stableId)).some((item) => item.eventId === event.eventId);
    if (stillQueued) throw new Error('progress_event_pending');
    throw new Error('progress_event_result_unavailable');
  } catch (error) {
    await enqueue(event).catch(() => {});
    throw error;
  }
}

export default function __RouteShim() { return null; }

export const __progressEventsClientTestHooks = {
  progressOwnerKey,
  isPermanentProgressEventError,
  PROGRESS_EVENT_DEAD_LETTER_MAX,
};

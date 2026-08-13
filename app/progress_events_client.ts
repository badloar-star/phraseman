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
import { enqueueAuthoritativeLevelSpinLevels } from './level_spin_level_up_queue';
import { persistAuthoritativeLevelSpinBalance } from './level_reward_spins_client';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from './account_generation';

export type ProgressEventType =
  | 'lesson_answer'
  | 'lesson_complete'
  | 'dialog_complete'
  | 'exam_complete'
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
  // зачем: порядок обязан совпадать с PROGRESS_EVENT_TYPES в functions/src/progress_events.ts —
  // tests/progress_event_type_contract сверяет списки как упорядоченные, чтобы новый тип события
  // нельзя было завести только на одной стороне.
  | 'plan_task_complete'
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
  levelSpinMintedCredits?: Array<{
    id: string;
    level: number;
    kind: 'standard' | 'milestone';
  }>;
  levelSpinBalance?: number;
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
  levelSpinProtocol: 'v1';
  stableId: string;
  payload: Record<string, unknown>;
};

const FUNCTIONS_REGION = 'us-central1';
const PROGRESS_EVENT_QUEUE_KEY = 'progress_server_event_queue_v1';
const PROGRESS_MIGRATED_KEY = 'progress_server_snapshot_migrated_v1';
const PROGRESS_MIGRATION_BASELINE_KEY = 'progress_server_snapshot_baseline_v1';
const PROGRESS_EVENT_DEAD_LETTER_KEY = 'progress_server_event_dead_letter_v1';
const PROGRESS_EVENT_RETRY_KEY = 'progress_server_event_retry_v1';
const PROGRESS_EVENT_DEAD_LETTER_MAX = 100;
const PROGRESS_EVENT_FLUSH_BATCH_MAX = 10;
const PROGRESS_EVENT_RETRY_MIN_MS = 5_000;
const PROGRESS_EVENT_RETRY_MAX_MS = 300_000;
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
    return withOwnerQueueMutation(stableId, async (state) => state.queue!.length > 0);
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
    'progress_event_owner_mismatch',
  ].some((token) => diagnostic.includes(token));
}

async function hasDeadLetterEvent(stableId: string, eventId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(progressOwnerKey(PROGRESS_EVENT_DEAD_LETTER_KEY, stableId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) && parsed.some((entry) => entry?.event?.eventId === eventId);
  } catch {
    return false;
  }
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

const flushedProgressResults = new Map<string, ProgressEventResult>();
const terminalProgressEvents = new Map<string, true>();

type ProgressRetryState = {
  headEventId: string;
  attempts: number;
  nextRetryAt: number;
};

type OwnerQueueState = {
  stableId: string;
  queue: QueuedProgressEvent[] | null;
  eventIds: Set<string>;
  mutationTail: Promise<void>;
  pendingMutations: number;
  flushInFlight: Promise<number> | null;
};

const OWNER_QUEUE_STATE_MAX = 8;
const ownerQueueStates = new Map<string, OwnerQueueState>();

function progressResultKey(stableId: string, eventId: string): string {
  return `${encodeURIComponent(stableId)}:${eventId}`;
}

function getOwnerQueueState(stableId: string): OwnerQueueState {
  const existing = ownerQueueStates.get(stableId);
  if (existing) return existing;
  if (ownerQueueStates.size >= OWNER_QUEUE_STATE_MAX) {
    for (const [key, state] of ownerQueueStates) {
      if (state.pendingMutations === 0 && !state.flushInFlight) {
        ownerQueueStates.delete(key);
        break;
      }
    }
  }
  const created: OwnerQueueState = {
    stableId,
    queue: null,
    eventIds: new Set<string>(),
    mutationTail: Promise.resolve(),
    pendingMutations: 0,
    flushInFlight: null,
  };
  ownerQueueStates.set(stableId, created);
  return created;
}

async function withOwnerQueueMutation<T>(
  stableId: string,
  mutation: (state: OwnerQueueState) => Promise<T>,
): Promise<T> {
  const state = getOwnerQueueState(stableId);
  const previous = state.mutationTail;
  let release!: () => void;
  state.pendingMutations += 1;
  state.mutationTail = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    if (state.queue === null) {
      state.queue = await readQueue(stableId);
      state.eventIds = new Set(state.queue.map((event) => event.eventId));
    }
    return await mutation(state);
  } finally {
    state.pendingMutations -= 1;
    release();
  }
}

function terminalProgressEventKey(stableId: string, eventId: string): string {
  return `${encodeURIComponent(stableId)}:${eventId}`;
}

function markTerminalProgressEvent(stableId: string, eventId: string): void {
  const key = terminalProgressEventKey(stableId, eventId);
  terminalProgressEvents.delete(key);
  terminalProgressEvents.set(key, true);
  while (terminalProgressEvents.size > 256) {
    const oldest = terminalProgressEvents.keys().next().value;
    if (!oldest) break;
    terminalProgressEvents.delete(oldest);
  }
}

function takeTerminalProgressEvent(stableId: string, eventId: string): boolean {
  return terminalProgressEvents.delete(terminalProgressEventKey(stableId, eventId));
}

async function enqueue(event: QueuedProgressEvent): Promise<void> {
  await withOwnerQueueMutation(event.stableId, async (state) => {
    if (state.eventIds.has(event.eventId)) return;
    const next = [...state.queue!, event];
    await writeQueue(event.stableId, next);
    state.queue = next;
    state.eventIds.add(event.eventId);
  });
}

async function ensureProgressSnapshotMigratedForOwner(stableId: string): Promise<boolean> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return true;
  await ensureAnonUser();
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

export async function ensureProgressSnapshotMigrated(): Promise<boolean> {
  const stableId = await getCanonicalUserId();
  if (!stableId) throw new Error('progress_stable_id_unavailable');
  return ensureProgressSnapshotMigratedForOwner(stableId);
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
  stableId: string,
  snapshotOverride?: Record<string, string> | null,
): Promise<boolean> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return true;
  await ensureAnonUser();
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
  const mintedCredits = result.levelSpinMintedCredits;
  const spinBalance = result.levelSpinBalance;
  if (!Array.isArray(mintedCredits)
    || !Number.isSafeInteger(spinBalance)
    || Number(spinBalance) < 0) return;
  const milestoneLevels = new Set([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]);
  const validCredits = mintedCredits.every((credit) => {
    if (!Number.isInteger(credit.level) || credit.level < 2 || credit.level > 60) return false;
    const expectedId = `level_spin_v1_${String(credit.level).padStart(3, '0')}`;
    const expectedKind = milestoneLevels.has(credit.level) ? 'milestone' : 'standard';
    const examCredit = /^level_exam_spin_v1_(A1|A2|B1|B2)$/.exec(credit.id);
    const examDisplayLevel: Record<string, number> = { A1: 2, A2: 3, B1: 4, B2: 5 };
    return (credit.id === expectedId && credit.kind === expectedKind)
      || (examCredit !== null && examDisplayLevel[examCredit[1]] === credit.level && credit.kind === 'standard');
  });
  if (!validCredits) return;
  await persistAuthoritativeLevelSpinBalance(result.stableUid, Number(spinBalance));
  const mintedLevels = [...new Set(mintedCredits.map((credit) => credit.level))].sort((a, b) => a - b);
  if (mintedLevels.length > 0) {
    await enqueueAuthoritativeLevelSpinLevels(mintedLevels);
  }
}

async function submitQueuedEvent(event: QueuedProgressEvent): Promise<ProgressEventResult> {
  const appCheckReady = await initFirebaseAppCheckIfAvailable().catch(() => false);
  if (!appCheckReady) throw new Error('app_check_unavailable');
  const fn = callable<QueuedProgressEvent, ProgressEventResult>('progressSubmitEvent');
  const accountGeneration = captureAccountGeneration();
  const res = await withTimeout(fn(event), CALLABLE_TIMEOUT_MS, 'progress_submit_event');
  if (res.data.stableUid !== event.stableId) {
    throw new Error('progress_event_owner_mismatch');
  }
  await withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(accountGeneration, event.stableId)) return;
    await mirrorProgressResultToLocal(res.data);
  });
  flushedProgressResults.set(progressResultKey(event.stableId, event.eventId), res.data);
  while (flushedProgressResults.size > 256) {
    const oldest = flushedProgressResults.keys().next().value;
    if (!oldest) break;
    flushedProgressResults.delete(oldest);
  }
  return res.data;
}

function parseRetryState(raw: string | null): ProgressRetryState | null {
  try {
    const parsed = raw ? JSON.parse(raw) as Partial<ProgressRetryState> : null;
    if (!parsed || typeof parsed.headEventId !== 'string') return null;
    const attempts = Math.max(0, Math.floor(Number(parsed.attempts) || 0));
    const nextRetryAt = Math.max(0, Number(parsed.nextRetryAt) || 0);
    return { headEventId: parsed.headEventId, attempts, nextRetryAt };
  } catch {
    return null;
  }
}

async function doFlush(stableId: string): Promise<number> {
  if (!(await ensureProgressSnapshotMigratedForOwner(stableId))) return 0;
  // Реферал: отложенный код (введён офлайн) должен примениться ДО отправки прогресса.
  // Квалификация «урок 1 пройден» срабатывает только по живому событию урока — если событие
  // долетит раньше attribution, оба участника навсегда останутся без своих 7 дней.
  // Без кода в очереди — мгновенный no-op (одно чтение AsyncStorage).
  try {
    const m = await import('./referral_bootstrap');
    await m.tryApplyPendingReferral();
  } catch { /* нет сети/кода — прогресс не блокируем, ретрай на следующем flush */ }
  return withOwnerQueueMutation(stableId, async (state) => {
    if (state.queue!.length === 0) return 0;
    const retryKey = progressOwnerKey(PROGRESS_EVENT_RETRY_KEY, stableId);
    const retry = parseRetryState(await AsyncStorage.getItem(retryKey));
    const initialHead = state.queue![0];
    if (retry?.headEventId === initialHead.eventId && Date.now() < retry.nextRetryAt) return 0;
    if (retry && retry.headEventId !== initialHead.eventId) {
      await AsyncStorage.removeItem(retryKey).catch(() => {});
    }

    const remaining = [...state.queue!];
    let sent = 0;
    let removed = 0;
    let processed = 0;
    let transientFailure = false;
    while (remaining.length > 0 && processed < PROGRESS_EVENT_FLUSH_BATCH_MAX) {
      const next = remaining[0];
      try {
        await submitQueuedEvent(next);
      } catch (error) {
        if (!isPermanentProgressEventError(error)) {
          const attempts = retry?.headEventId === next.eventId ? retry.attempts + 1 : 1;
          const delay = Math.min(
            PROGRESS_EVENT_RETRY_MAX_MS,
            PROGRESS_EVENT_RETRY_MIN_MS * (2 ** Math.min(16, attempts - 1)),
          );
          await AsyncStorage.setItem(retryKey, JSON.stringify({
            headEventId: next.eventId,
            attempts,
            nextRetryAt: Date.now() + delay,
          }));
          transientFailure = true;
          break;
        }
        markTerminalProgressEvent(stableId, next.eventId);
        await appendDeadLetter(stableId, next, error).catch(() => {});
        remaining.shift();
        removed += 1;
        processed += 1;
        continue;
      }
      remaining.shift();
      sent += 1;
      removed += 1;
      processed += 1;
    }
    if (removed > 0) {
      await writeQueue(stableId, remaining);
      state.queue = remaining;
      state.eventIds = new Set(remaining.map((event) => event.eventId));
    }
    if (!transientFailure && retry) await AsyncStorage.removeItem(retryKey).catch(() => {});
    return sent;
  });
}

async function flushPendingProgressEventsForOwner(stableId: string): Promise<number> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return Promise.resolve(0);
  const state = getOwnerQueueState(stableId);
  if (state.flushInFlight) return state.flushInFlight;
  state.flushInFlight = doFlush(stableId).finally(() => { state.flushInFlight = null; });
  return state.flushInFlight;
}

export async function flushPendingProgressEvents(): Promise<number> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return 0;
  const stableId = await getCanonicalUserId();
  if (!stableId) throw new Error('progress_stable_id_unavailable');
  return flushPendingProgressEventsForOwner(stableId);
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
    levelSpinProtocol: 'v1',
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
    await ensureProgressSnapshotMigratedWithBaseline(stableId, options?.migrationSnapshot);
    await flushPendingProgressEventsForOwner(stableId);
    const resultKey = progressResultKey(stableId, event.eventId);
    const flushed = flushedProgressResults.get(resultKey);
    if (flushed) {
      flushedProgressResults.delete(resultKey);
      return flushed;
    }
    const stillQueued = await withOwnerQueueMutation(
      stableId,
      async (state) => state.eventIds.has(event.eventId),
    );
    if (stillQueued) throw new Error('progress_event_pending');
    if (
      takeTerminalProgressEvent(stableId, event.eventId)
      || await hasDeadLetterEvent(stableId, event.eventId)
    ) {
      throw Object.assign(new Error('progress_event_terminal'), { code: 'invalid_progress_event' });
    }
    throw new Error('progress_event_result_unavailable');
  } catch (error) {
    if (!isPermanentProgressEventError(error)) {
      await enqueue(event).catch(() => {});
    }
    throw error;
  }
}

export default function __RouteShim() { return null; }

export const __progressEventsClientTestHooks = {
  progressOwnerKey,
  progressResultKey,
  isPermanentProgressEventError,
  resetRuntimeState: () => {
    ownerQueueStates.clear();
    flushedProgressResults.clear();
    terminalProgressEvents.clear();
  },
  PROGRESS_EVENT_DEAD_LETTER_MAX,
  PROGRESS_EVENT_FLUSH_BATCH_MAX,
};

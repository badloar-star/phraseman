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
  return 'progress';
}

function makeEventId(type: ProgressEventType): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${eventPrefix(type)}:${type}:${Date.now()}:${rand}`;
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

async function readQueue(): Promise<QueuedProgressEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_EVENT_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.eventId === 'string') : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedProgressEvent[]): Promise<void> {
  await AsyncStorage.setItem(PROGRESS_EVENT_QUEUE_KEY, JSON.stringify(queue.slice(0, 100)));
}

function parseProgressSnapshot(raw: string | null): Record<string, string> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') out[key] = value;
    }
    return out;
  } catch {
    return null;
  }
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

async function enqueue(event: QueuedProgressEvent): Promise<void> {
  const queue = await readQueue();
  if (!queue.some((item) => item.eventId === event.eventId)) {
    queue.push(event);
    await writeQueue(queue);
  }
}

export async function ensureProgressSnapshotMigrated(): Promise<void> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
  if (await AsyncStorage.getItem(PROGRESS_MIGRATED_KEY)) return;
  const stableId = await ensureAnonUser();
  if (!stableId) throw new Error('progress_stable_id_unavailable');
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const frozen = parseProgressSnapshot(await AsyncStorage.getItem(PROGRESS_MIGRATION_BASELINE_KEY));
  const progress = frozen ?? await readLocalProgressSnapshot();
  const fn = callable<{ stableId: string; progress: Record<string, string> }, { ok: true; migrated: boolean }>('progressMigrateSnapshot');
  await withTimeout(fn({ stableId, progress }), CALLABLE_TIMEOUT_MS, 'progress_migrate_snapshot');
  await AsyncStorage.setItem(PROGRESS_MIGRATED_KEY, '1');
  await AsyncStorage.removeItem(PROGRESS_MIGRATION_BASELINE_KEY);
}

export async function prepareProgressMigrationSnapshot(): Promise<Record<string, string> | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  if (await AsyncStorage.getItem(PROGRESS_MIGRATED_KEY)) return null;
  const frozen = parseProgressSnapshot(await AsyncStorage.getItem(PROGRESS_MIGRATION_BASELINE_KEY));
  if (frozen) return frozen;
  const progress = await readLocalProgressSnapshot();
  await AsyncStorage.setItem(PROGRESS_MIGRATION_BASELINE_KEY, JSON.stringify(progress));
  return progress;
}

async function ensureProgressSnapshotMigratedWithBaseline(
  snapshotOverride?: Record<string, string> | null,
): Promise<void> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
  if (await AsyncStorage.getItem(PROGRESS_MIGRATED_KEY)) return;
  const stableId = await ensureAnonUser();
  if (!stableId) throw new Error('progress_stable_id_unavailable');
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const frozen = parseProgressSnapshot(await AsyncStorage.getItem(PROGRESS_MIGRATION_BASELINE_KEY));
  const progress = frozen ?? snapshotOverride ?? await readLocalProgressSnapshot();
  const fn = callable<{ stableId: string; progress: Record<string, string> }, { ok: true; migrated: boolean }>('progressMigrateSnapshot');
  await withTimeout(fn({ stableId, progress }), CALLABLE_TIMEOUT_MS, 'progress_migrate_snapshot');
  await AsyncStorage.setItem(PROGRESS_MIGRATED_KEY, '1');
  await AsyncStorage.removeItem(PROGRESS_MIGRATION_BASELINE_KEY);
}

export async function mirrorProgressResultToLocal(result: ProgressEventResult): Promise<void> {
  const weekStart = getCurrentWeekStartIso(new Date(`${result.activeDate}T00:00:00.000Z`));
  const [
    [, localStreak],
    [, localLastActive],
    [, localStreakLast],
    [, localTotalXp],
    [, localWeeklyXp],
    [, localWeeklyPeriodStart],
    [, localWeekPointsV2],
  ] = await AsyncStorage.multiGet([
    'streak_count',
    'last_active_date',
    'streak_last_date',
    'user_total_xp',
    'weekly_xp',
    'weekly_xp_period_start',
    'week_points_v2',
  ]);
  const mergedStreak = mergeStreakByActivityDate(
    { streak: localStreak, lastActive: localLastActive, streakLast: localStreakLast },
    { streak: result.streakCount, lastActive: result.activeDate },
  );
  const localTotalBeforeMirror = parseNonNegativeNumber(localTotalXp);
  const mergedTotalXp = Math.max(
    localTotalBeforeMirror,
    parseNonNegativeNumber(result.totalXp),
  );
  const currentWeekCandidates = [
    parseNonNegativeNumber(result.weekXp),
    localWeeklyPeriodStart === weekStart ? parseNonNegativeNumber(localWeeklyXp) : 0,
    sameWeekPoints(localWeekPointsV2, result.weekKey) ?? 0,
  ];
  const mergedWeekXp = Math.max(...currentWeekCandidates);
  await AsyncStorage.multiSet([
    ['user_total_xp', String(mergedTotalXp)],
    ['user_prev_xp', String(mergedTotalXp)],
    ['user_level', String(getLevelFromXP(mergedTotalXp))],
    ['weekly_xp', String(mergedWeekXp)],
    ['weekly_xp_period_start', weekStart],
    ['week_points', String(Math.round(mergedWeekXp))],
    ['week_points_v2', JSON.stringify({ weekKey: result.weekKey, points: mergedWeekXp })],
    ['streak_count', String(mergedStreak.streak)],
    ['last_active_date', mergedStreak.lastActive ?? result.activeDate],
    ['streak_last_date', mergedStreak.lastActive ?? result.activeDate],
  ]);
  if (mergedTotalXp > localTotalBeforeMirror) {
    await enqueueMirroredLevelUps(localTotalBeforeMirror, mergedTotalXp);
  }
}

async function submitQueuedEvent(event: QueuedProgressEvent): Promise<ProgressEventResult> {
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = callable<QueuedProgressEvent, ProgressEventResult>('progressSubmitEvent');
  const res = await withTimeout(fn(event), CALLABLE_TIMEOUT_MS, 'progress_submit_event');
  await mirrorProgressResultToLocal(res.data);
  return res.data;
}

async function doFlush(): Promise<number> {
  await ensureProgressSnapshotMigrated();
  // Реферал: отложенный код (введён офлайн) должен примениться ДО отправки прогресса.
  // Квалификация «урок 1 пройден» срабатывает только по живому событию урока — если событие
  // долетит раньше attribution, оба участника навсегда останутся без своих 7 дней.
  // Без кода в очереди — мгновенный no-op (одно чтение AsyncStorage).
  try {
    const m = await import('./referral_bootstrap');
    await m.tryApplyPendingReferral();
  } catch { /* нет сети/кода — прогресс не блокируем, ретрай на следующем flush */ }
  const queue = await readQueue();
  if (queue.length === 0) return 0;
  const remaining = [...queue];
  let sent = 0;
  while (remaining.length > 0) {
    const next = remaining[0];
    try {
      await submitQueuedEvent(next);
    } catch {
      // Leave the poison event at the head and abort — it will retry next flush.
      break;
    }
    remaining.shift();
    sent += 1;
    await writeQueue(remaining);
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
    eventId: request.eventId || makeEventId(request.type),
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
  try {
    await ensureProgressSnapshotMigratedWithBaseline(options?.migrationSnapshot);
    await flushPendingProgressEvents();
    return await submitQueuedEvent(event);
  } catch (error) {
    await enqueue(event).catch(() => {});
    throw error;
  }
}

export default function __RouteShim() { return null; }

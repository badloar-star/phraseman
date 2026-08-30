import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { getLevelFromXP } from './xp_levels';
import { applyLessonScoreSample, type LessonScoreStats } from './jarvis/content_lesson_stats';
import { extractLessonScoreSample, lessonStatsDocId, shouldRecordLessonScore } from './jarvis/content_lesson_stats_write';
import { commitPreparedLearningMetrics, prepareLearningCompletionMetrics } from './jarvis/learning_metrics';
import { applyLevelSpinMinting, LEVEL_SPIN_PROTOCOL, type LevelExamSpinLevel } from './level_reward_spins';

export type ProgressMap = Record<string, unknown>;

export const PROGRESS_EVENT_TYPES = [
  'lesson_answer',
  'lesson_complete',
  'dialog_complete',
  'exam_complete',
  'achievement_reward',
  'level_up_bonus',
  'daily_login_bonus',
  'daily_phrase_quest',
  'bonus_chest',
  'vocabulary_learned',
  'verb_learned',
  'preposition_drill_answer',
  'preposition_drill_perfect',
  'mistake_practice_answer',
  'diagnostic_test',
  'plan_task_complete',
  'wager_win',
  // зачем (аудит MAX 2026-08-30): XP голосового урока считал ТОЛЬКО сервер
  // (maxVoiceSessionEnd → billing.xpAwarded), а клиенту начислить его было
  // нечем — источника в контракте не существовало, и платный урок не двигал
  // ни уровень, ни серию. Значение приходит уже посчитанным и капнутым
  // сервером MAX (дневной кэп xpDailyCap там же), клиент передаёт его как есть.
  'max_voice',
] as const;

export type ProgressEventType = typeof PROGRESS_EVENT_TYPES[number];

export type ProgressEventInput = {
  eventId: string;
  type: ProgressEventType;
  clientLocalDate?: string;
  clientCreatedAt?: number;
  appVersion?: string;
  platform?: string;
  levelSpinProtocol?: typeof LEVEL_SPIN_PROTOCOL;
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
  levelSpinsMinted?: number;
  levelSpinMintedCredits?: { id: string; level: number; kind: 'standard' | 'milestone' }[];
  levelSpinBalance?: number;
};

export function examSpinCompletionForEvent(
  event: ProgressEventInput,
  progressBefore: ProgressMap,
): { level: LevelExamSpinLevel; firstPass: boolean } | undefined {
  const blueprintVersion = Number(event.payload.blueprintVersion);
  if (event.type !== 'exam_complete' || ![2, 3].includes(blueprintVersion)) return undefined;
  const level = String(event.payload.level ?? '').toUpperCase() as LevelExamSpinLevel;
  const score = Number(event.payload.score);
  const total = Number(event.payload.total);
  const target = String(event.payload.studyTarget ?? 'en').toLowerCase();
  if (!['A1', 'A2', 'B1', 'B2'].includes(level)
    || target !== 'en'
    || !Number.isInteger(score)
    || total !== 30
    || score < 21
    || score > total) return undefined;
  const alreadyPassed = boolish(progressBefore[`level_exam_${level}_passed`]);
  return { level, firstPass: !alreadyPassed };
}

type ApplyResult = Omit<ProgressEventResult, 'stableUid' | 'duplicate'> & {
  progressPatch: ProgressMap;
};

export type ProgressServerState = {
  totalXp: number;
  level: number;
  weekKey: string;
  weekStart: string;
  weekXp: number;
  weekPoints: number;
  streakCount: number;
  lastActiveDate: string;
};

export type MigrationProvenance = {
  source: 'client_snapshot_v1';
  quarantinedSensitiveKeys: string[];
  beforeXp: number;
  acceptedXp: number;
  appVersion: string | null;
};

const EVENT_TYPE_SET = new Set<string>(PROGRESS_EVENT_TYPES);
const EVENT_ID_RE = /^[a-z][a-z0-9_]{1,32}:[A-Za-z0-9_.:-]{1,140}$/;
const PLAN_COMPLETION_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const FINGERPRINT_EXCLUDED_PAYLOAD_KEYS = new Set<string>([
  'localTotalBeforeServer',
  'multiplier',
  'baseAmount',
  'clientStreakCount',
  'clientLastActiveDate',
]);

const SERVER_OWNED_PROGRESS_KEYS = new Set([
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
]);

const EVENT_XP_CAP: Record<ProgressEventType, number> = {
  lesson_answer: 100,
  lesson_complete: 8000,
  dialog_complete: 1000,
  exam_complete: 12000,
  achievement_reward: 5000,
  level_up_bonus: 100,
  daily_login_bonus: 500,
  daily_phrase_quest: 500,
  bonus_chest: 5000,
  vocabulary_learned: 150,
  verb_learned: 150,
  preposition_drill_answer: 150,
  preposition_drill_perfect: 1500,
  mistake_practice_answer: 150,
  diagnostic_test: 2500,
  plan_task_complete: 1500,
  wager_win: 20000,
  // Дневной потолок MAX-звонков (xpDailyCap в max_voice_config, дефолт 300)
  // применён на сервере MAX ещё до клиента; здесь — потолок ОДНОГО события
  // от подделанного xpDelta, той же величины.
  max_voice: 300,
};

/**
 * зачем: суточные потолки XP (ECON-2: GLOBAL_DAILY_XP_CAP = 25 000 и EVENT_DAILY_XP_CAP по каждому
 * источнику) сняты по решению владельца 2026-07-26. Они срезали XP только на сервере, а клиент
 * пишет user_total_xp локально без каких-либо суточных лимитов и при зеркалировании берёт
 * Math.max(local, server) — то есть срезанное серверное значение всегда проигрывало локальному.
 * Потолки не мешали фарму, но навсегда расщепляли баланс телефона и сервера: активный игрок видел
 * у себя одно число, сервер хранил другое, и сойтись они уже не могли. Активная игра наказывалась,
 * античит-эффекта не давалось. От подделанного xpDelta в запросе защищает оставшийся EVENT_XP_CAP
 * (потолок на одно событие), от бесконечных попыток экзамена — EXAM_DAILY_ATTEMPT_LIMIT, от
 * неограниченных вызовов функции — DAILY_EVENT_LIMIT. Счётчики sourceXp/totalXp в
 * progress_daily_counters продолжают писаться — они нужны админ-аналитике и дают возможность
 * вернуть потолок, не меняя схему данных.
 */

/**
 * ECON-3: суточный лимит попыток экзамена. XP начисляется за каждую попытку, осколок — только за
 * первую, поэтому без лимита экзамен становится бесплатным бесконечным фармом XP. После лимита
 * exam_complete принимается (прогресс/проценты пишутся), но XP не начисляется.
 */
const EXAM_DAILY_ATTEMPT_LIMIT = 5;

/**
 * ECON-11: минимальный процент экзамена, при котором начисляется XP. Ниже порога спам-клик не
 * вознаграждается (раньше пол Math.max(10, …) давал XP даже за 1%).
 */
const EXAM_MIN_XP_PCT = 25;

/**
 * Серверный авторитетный пересчёт XP за экзамен (ECON-11). Клиентский examXp игнорируется: сервер
 * считает по фактическому проценту, без нижнего пола за провал.
 */
function serverExamXp(pct: number, passed: boolean): number {
  if (pct < EXAM_MIN_XP_PCT) return 0;
  if (passed) return 50 + Math.round(pct / 2);
  return Math.round(pct / 4);
}

function cleanString(value: unknown, max = 160): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function readInt(value: unknown, fallback = 0): number {
  const raw = typeof value === 'string' ? value.trim() : value;
  const n = Math.trunc(Number(raw));
  return Number.isFinite(n) ? n : fallback;
}

function clampInt(value: unknown, min: number, max: number): number {
  const n = readInt(value, min);
  return Math.max(min, Math.min(max, n));
}

function boolish(value: unknown): boolean {
  if (value === true) return true;
  if (value === false || value == null) return false;
  const s = String(value).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

function asProgressString(value: number | string | boolean): string {
  if (typeof value === 'number') return String(Math.max(0, Math.trunc(value)));
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return value;
}

function getProgress(data: FirebaseFirestore.DocumentData | undefined): ProgressMap {
  const raw = data?.progress;
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as ProgressMap : {};
}

export function isoDateUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dateKeyToUtcMs(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const ms = Date.UTC(y, mo - 1, d);
  const check = new Date(ms);
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== mo - 1 ||
    check.getUTCDate() !== d
  ) {
    return null;
  }
  return ms;
}

function dayDiff(a: string, b: string): number | null {
  const aMs = dateKeyToUtcMs(a);
  const bMs = dateKeyToUtcMs(b);
  if (aMs == null || bMs == null) return null;
  return Math.round((aMs - bMs) / DAY_MS);
}

export function getWeekKey(dateKey: string): string {
  const ms = dateKeyToUtcMs(dateKey);
  const date = new Date(ms ?? Date.now());
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function getWeekStartIso(dateKey: string): string {
  const ms = dateKeyToUtcMs(dateKey);
  const date = new Date(ms ?? Date.now());
  const utcDay = date.getUTCDay();
  const daysSinceMonday = (utcDay + 6) % 7;
  const monday = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - daysSinceMonday,
  ));
  return isoDateUtc(monday);
}

function readWeekPoints(progress: ProgressMap, weekKey: string): number {
  try {
    const parsed = JSON.parse(String(progress.week_points_v2 ?? '{}')) as { weekKey?: unknown; points?: unknown };
    return parsed.weekKey === weekKey ? Math.max(0, Number(parsed.points ?? 0) || 0) : 0;
  } catch {
    return 0;
  }
}

export function buildProgressBaseline(
  progress: ProgressMap,
  rawShadow: unknown,
  now: Date = new Date(),
): ProgressMap {
  const shadow = rawShadow && typeof rawShadow === 'object' && !Array.isArray(rawShadow)
    ? rawShadow as Partial<ProgressServerState>
    : {};
  const serverDate = isoDateUtc(now);
  const weekKey = getWeekKey(serverDate);
  const weekStart = getWeekStartIso(serverDate);
  const totalXp = Math.max(0, readInt(progress.user_total_xp, 0), readInt(shadow.totalXp, 0));
  const progressWeekXp = cleanString(progress.weekly_xp_period_start, 10) === weekStart
    ? Math.max(0, readInt(progress.weekly_xp, 0))
    : 0;
  const shadowWeekXp = shadow.weekStart === weekStart ? Math.max(0, readInt(shadow.weekXp, 0)) : 0;
  const weekXp = Math.max(progressWeekXp, shadowWeekXp);
  const shadowWeekPoints = shadow.weekKey === weekKey ? Math.max(0, Number(shadow.weekPoints) || 0) : 0;
  const weekPoints = Math.max(readWeekPoints(progress, weekKey), shadowWeekPoints, weekXp);

  const progressLast = cleanString(progress.last_active_date ?? progress.streak_last_date, 10);
  const shadowLast = cleanString(shadow.lastActiveDate, 10);
  const progressStreak = Math.max(0, readInt(progress.streak_count, 0));
  const shadowStreak = Math.max(0, readInt(shadow.streakCount, 0));
  let lastActiveDate = progressLast;
  let streakCount = progressStreak;
  if (shadowLast && (!progressLast || shadowLast > progressLast)) {
    lastActiveDate = shadowLast;
    // зачем (владелец, 2026-08-28: «у меня 137 дней цепочка, а не 93»): теневое
    // состояние обновляют и пути, которые НЕ ведут стрик (награда за друга,
    // арена — они пишут progressServerState со своим totalXp и свежей датой,
    // унося устаревший streakCount). Раньше его счётчик брался вслепую вместе с
    // датой, и честная цепочка обрезалась до отставшего снимка.
    //
    // Правило то же, что уже действует на клиенте (app/streak_safety.ts,
    // mergeStreakByActivityDate): при разрыве в один день свежая сторона —
    // продолжение ТОЙ ЖЕ цепочки, и меньшее значение означает потерю данных, а
    // не сгорание, поэтому берём максимум. При разрыве в два дня и больше
    // цепочка обязана быть сгоревшей — там побеждает счётчик свежей стороны,
    // иначе сгоревший стрик воскресал бы из устаревшего снимка.
    const gapDays = progressLast ? dayDiff(shadowLast, progressLast) : null;
    streakCount = gapDays != null && gapDays <= 1
      ? Math.max(progressStreak, shadowStreak)
      : shadowStreak;
  } else if (shadowLast && shadowLast === progressLast) {
    streakCount = Math.max(progressStreak, shadowStreak);
  }

  const baseline: ProgressMap = {
    ...progress,
    user_total_xp: String(totalXp),
    user_level: String(getLevelFromXP(totalXp)),
    weekly_xp: String(weekXp),
    weekly_xp_period_start: weekStart,
    week_points: String(Math.round(weekPoints)),
    week_points_v2: JSON.stringify({ weekKey, points: weekPoints }),
    streak_count: String(streakCount),
  };
  if (lastActiveDate) {
    baseline.last_active_date = lastActiveDate;
    baseline.streak_last_date = lastActiveDate;
  }
  return baseline;
}

export function progressServerStateFromProgress(progress: ProgressMap, now: Date): ProgressServerState {
  const serverDate = isoDateUtc(now);
  const weekKey = getWeekKey(serverDate);
  const weekStart = getWeekStartIso(serverDate);
  const totalXp = Math.max(0, readInt(progress.user_total_xp, 0));
  const weekXp = cleanString(progress.weekly_xp_period_start, 10) === weekStart
    ? Math.max(0, readInt(progress.weekly_xp, 0))
    : 0;
  return {
    totalXp,
    level: getLevelFromXP(totalXp),
    weekKey,
    weekStart,
    weekXp,
    weekPoints: Math.max(weekXp, readWeekPoints(progress, weekKey)),
    streakCount: Math.max(0, readInt(progress.streak_count, 0)),
    lastActiveDate: cleanString(progress.last_active_date ?? progress.streak_last_date, 10),
  };
}

export function authoritativeProgressPatch(state: ProgressServerState): ProgressMap {
  const patch: ProgressMap = {
    user_total_xp: String(state.totalXp),
    user_level: String(state.level),
    weekly_xp: String(state.weekXp),
    weekly_xp_period_start: state.weekStart,
    week_points: String(Math.round(state.weekPoints)),
    week_points_v2: JSON.stringify({ weekKey: state.weekKey, points: state.weekPoints }),
    streak_count: String(state.streakCount),
  };
  if (state.lastActiveDate) {
    patch.last_active_date = state.lastActiveDate;
    patch.streak_last_date = state.lastActiveDate;
  }
  return patch;
}

async function projectProgressToCurrentLeague(
  db: admin.firestore.Firestore,
  stableUid: string,
  result: ProgressEventResult,
): Promise<void> {
  const leaderboardRef = db.collection('leaderboard').doc(stableUid);
  const leaderboardSnap = await leaderboardRef.get();
  const leaderboard = leaderboardSnap.data() ?? {};
  const groupId = cleanString(leaderboard.groupId, 180);
  if (!groupId || cleanString(leaderboard.groupWeekId, 16) !== result.weekKey) return;

  const groupRef = db.collection('league_groups').doc(groupId);
  await db.runTransaction(async (tx) => {
    const [freshLeaderboardSnap, groupSnap] = await Promise.all([
      tx.get(leaderboardRef),
      tx.get(groupRef),
    ]);
    const freshLeaderboard = freshLeaderboardSnap.data() ?? {};
    const group = groupSnap.data() ?? {};
    if (
      !groupSnap.exists
      || cleanString(group.weekId, 16) !== result.weekKey
      || cleanString(freshLeaderboard.groupId, 180) !== groupId
      || cleanString(freshLeaderboard.groupWeekId, 16) !== result.weekKey
    ) return;

    const members = { ...(group.members ?? {}) } as Record<string, Record<string, unknown>>;
    const existingMember = members[stableUid] ?? {};
    const existingPoints = Math.max(0, readInt(existingMember.points, 0));
    const existingLeaderboardPoints = freshLeaderboard.weekKey === result.weekKey
      ? Math.max(0, readInt(freshLeaderboard.weekPoints, 0))
      : 0;
    const weekPoints = Math.max(existingPoints, existingLeaderboardPoints, result.weekXp);
    members[stableUid] = {
      ...existingMember,
      uid: stableUid,
      points: weekPoints,
      streak: result.streakCount,
      totalXp: result.totalXp,
    };
    tx.set(groupRef, { members, updatedAt: Date.now() }, { merge: true });
    tx.set(leaderboardRef, {
      weekKey: result.weekKey,
      weekPoints,
      streak: result.streakCount,
      points: result.totalXp,
    }, { merge: true });
  });
}

export function resolveClientDateKey(raw: unknown, now: Date): string {
  const serverToday = isoDateUtc(now);
  const candidate = cleanString(raw, 10);
  if (!candidate) return serverToday;
  const diff = dayDiff(candidate, serverToday);
  if (diff == null || Math.abs(diff) > 2) return serverToday;
  return candidate;
}

function normalizePayload(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
}

export function normalizeProgressEvent(raw: unknown): ProgressEventInput {
  const data = normalizePayload(raw);
  const eventId = cleanString(data.eventId, 180);
  if (!EVENT_ID_RE.test(eventId)) {
    throw new HttpsError('invalid-argument', 'bad_progress_event_id');
  }
  const typeRaw = cleanString(data.type, 64);
  if (!EVENT_TYPE_SET.has(typeRaw)) {
    throw new HttpsError('invalid-argument', 'bad_progress_event_type');
  }
  const payload = normalizePayload(data.payload);
  if (typeRaw === 'plan_task_complete') {
    const planInstanceId = payload.planInstanceId;
    const planTaskId = payload.planTaskId;
    if (
      typeof planInstanceId !== 'string'
      || planInstanceId !== planInstanceId.trim()
      || !PLAN_COMPLETION_ID_RE.test(planInstanceId)
      || typeof planTaskId !== 'string'
      || planTaskId !== planTaskId.trim()
      || !PLAN_COMPLETION_ID_RE.test(planTaskId)
    ) {
      throw new HttpsError('invalid-argument', 'bad_plan_completion_identity');
    }
  }
  return {
    eventId,
    type: typeRaw as ProgressEventType,
    clientLocalDate: cleanString(data.clientLocalDate, 10) || undefined,
    clientCreatedAt: readInt(data.clientCreatedAt, 0) || undefined,
    appVersion: cleanString(data.appVersion, 32) || undefined,
    platform: cleanString(data.platform, 32) || undefined,
    levelSpinProtocol: data.levelSpinProtocol === LEVEL_SPIN_PROTOCOL ? LEVEL_SPIN_PROTOCOL : undefined,
    payload,
  };
}

function canonicalizeForFingerprint(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeForFingerprint(item));
  }
  if (typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const entries = Object.keys(input).sort().map((key) => [key, canonicalizeForFingerprint(input[key])]);
    return Object.fromEntries(entries);
  }
  return value;
}

function sanitizeProgressEventPayloadForFingerprint(rawPayload: unknown): Record<string, unknown> {
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return {};
  }
  const payload = rawPayload as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (FINGERPRINT_EXCLUDED_PAYLOAD_KEYS.has(key)) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

function fingerprintableProgressEventPayload(event: ProgressEventInput): Record<string, unknown> {
  return canonicalizeForFingerprint({
    type: event.type,
    clientLocalDate: event.clientLocalDate ?? '',
    payload: sanitizeProgressEventPayloadForFingerprint(event.payload),
  }) as Record<string, unknown>;
}

export function canonicalProgressEventSemantics(event: ProgressEventInput): string {
  return JSON.stringify(fingerprintableProgressEventPayload(event));
}

export function candidateHasSameProgressSemantics(
  event: ProgressEventInput,
  candidate: Record<string, unknown> | undefined,
): boolean {
  if (!candidate || !PROGRESS_EVENT_TYPES.includes(candidate.type as ProgressEventType)) return false;
  try {
    return canonicalProgressEventSemantics(event) === canonicalProgressEventSemantics({
      eventId: 'stored-candidate',
      type: candidate.type as ProgressEventType,
      clientLocalDate: typeof candidate.clientLocalDate === 'string' ? candidate.clientLocalDate : undefined,
      payload: candidate.payload && typeof candidate.payload === 'object' && !Array.isArray(candidate.payload)
        ? candidate.payload as Record<string, unknown>
        : {},
    });
  } catch {
    return false;
  }
}

export function readLegacyLevelUpBonusClaim(
  candidate: Record<string, unknown> | undefined,
  level: number,
): 'unclaimed' | 'claimed' | 'corrupt' {
  if (!candidate) return 'unclaimed';
  const payload = candidate.payload && typeof candidate.payload === 'object' && !Array.isArray(candidate.payload)
    ? candidate.payload as Record<string, unknown>
    : {};
  const result = candidate.result && typeof candidate.result === 'object' && !Array.isArray(candidate.result)
    ? candidate.result as Record<string, unknown>
    : {};
  return candidate.eventId === `level_up:${level}:bonus`
    && candidate.type === 'level_up_bonus'
    && Number(payload.level) === level
    && Number(payload.xpDelta ?? payload.amount ?? payload.baseXp) === 100
    && Number(result.xpDelta) === 100
    ? 'claimed'
    : 'corrupt';
}

export function fingerprintProgressEvent(event: ProgressEventInput): string {
  const serialized = canonicalProgressEventSemantics(event);
  let hash = 0x811c9dc5;
  for (let i = 0; i < serialized.length; i += 1) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
    hash >>>= 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function fingerprintProgressEventV2(event: ProgressEventInput): string {
  return createHash('sha256').update(canonicalProgressEventSemantics(event)).digest('hex');
}

function safeDocId(value: string): string {
  return value.replace(/[^\w.:-]/g, '_').slice(0, 180);
}

type ServerStudyTarget = 'en' | 'fr';

function normalizeStudyTarget(raw: unknown): ServerStudyTarget {
  return cleanString(raw, 12).toLowerCase() === 'fr' ? 'fr' : 'en';
}

function scopedTargetKey(domain: 'lesson_progress' | 'level_exams', target: ServerStudyTarget, id: string | number): string {
  return target === 'fr' ? `${domain}_v2::fr::${encodeURIComponent(String(id))}` : String(id);
}

function lessonProgressKey(lessonId: number, target: ServerStudyTarget): string {
  return target === 'fr' ? scopedTargetKey('lesson_progress', target, lessonId) : `lesson${lessonId}_progress`;
}

function lessonFieldKey(lessonId: number, field: 'best_score' | 'pass_count' | 'pass_live' | 'cellIndex', target: ServerStudyTarget): string {
  return scopedTargetKey('lesson_progress', target, `lesson${lessonId}_${field}`);
}

function unlockedLessonsKey(target: ServerStudyTarget): string {
  return scopedTargetKey('lesson_progress', target, 'unlocked_lessons');
}

function examLevelSegment(level: string): string {
  return level === 'final' ? 'final' : level.toUpperCase();
}

function levelExamFieldKey(level: string, field: 'pct' | 'best_pct' | 'passed' | 'pass_count' | 'completed_at', target: ServerStudyTarget): string {
  return scopedTargetKey('level_exams', target, `level_exam_${examLevelSegment(level)}_${field}`);
}

function addServerOwnedLessonKeys(keys: Set<string>, lessonId: number, target: ServerStudyTarget): void {
  keys.add(lessonFieldKey(lessonId, 'best_score', target));
  keys.add(lessonFieldKey(lessonId, 'pass_count', target));
  keys.add(lessonProgressKey(lessonId, target));
  keys.add(lessonFieldKey(lessonId, 'cellIndex', target));
  keys.add(unlockedLessonsKey(target));
}

export function isServerOwnedProgressKey(key: string): boolean {
  if (SERVER_OWNED_PROGRESS_KEYS.has(key)) return true;
  if (/^lesson\d+_(?:best_score|pass_count|progress|cellIndex)$/.test(key)) return true;
  if (/^level_exam_[A-Za-z0-9_-]+_(?:pct|best_pct|passed|pass_count|completed_at)$/.test(key)) return true;
  if (/^lesson_progress_v2::fr::.+/.test(key)) return true;
  if (/^level_exams_v2::fr::level_exam_[A-Za-z0-9_-]+_(?:pct|best_pct|passed|pass_count|completed_at)$/.test(key)) return true;
  if (/^(?:achievement|bonus_chest|wager)_.*(?:claimed|rewarded|at)$/.test(key)) return true;
  return false;
}

function parseUnlocked(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map((v) => readInt(v, 0)).filter((v) => v > 0);
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((v) => readInt(v, 0)).filter((v) => v > 0) : [];
  } catch {
    return [];
  }
}

function progressArrayScore(raw: unknown): number {
  if (Array.isArray(raw)) return raw.length;
  if (typeof raw !== 'string') return 0;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => item != null && item !== 'empty').length : 0;
  } catch {
    return 0;
  }
}

function setUnlocked(progress: ProgressMap, patch: ProgressMap, lessonId: number, target: ServerStudyTarget): void {
  if (lessonId <= 0) return;
  const key = unlockedLessonsKey(target);
  const merged = new Set<number>(parseUnlocked(progress[key]));
  merged.add(lessonId);
  patch[key] = JSON.stringify(Array.from(merged).sort((a, b) => a - b));
}

/**
 * Контекст одного дня для серверных лимитов (ECON-3). Передаётся из транзакции, где читается
 * progress_daily_counters/{day}. Чистая функция остаётся тестируемой.
 *
 * зачем: суточные потолки XP сняты (см. комментарий у EVENT_XP_CAP), поэтому на начисление здесь
 * влияет только examAttemptsToday. sourceXpToday/totalXpToday остаются в типе и продолжают
 * писаться в счётчики — их читает админ-аналитика, и по ним можно вернуть потолок без миграции.
 */
export type ProgressDailyContext = {
  /** Уже начисленный сегодня XP по каждому источнику. Аналитика; на начисление не влияет. */
  sourceXpToday?: Partial<Record<ProgressEventType, number>>;
  /** Сколько попыток экзамена уже зачтено сегодня (любого уровня). Ограничивает XP за экзамен. */
  examAttemptsToday?: number;
  /** Суммарный XP за сегодня. Аналитика; на начисление не влияет. */
  totalXpToday?: number;
  /** Server-only transaction evidence that this deterministic level bonus was already consumed. */
  levelUpBonusAlreadyClaimed?: boolean;
};

function xpFromPayload(event: ProgressEventInput, daily: ProgressDailyContext | undefined, progress: ProgressMap): number {
  const payload = event.payload;
  let requested = 0;

  if (event.type === 'level_up_bonus') {
    if (daily?.levelUpBonusAlreadyClaimed) return 0;
    const level = Number(payload.level);
    const amount = Number(payload.xpDelta ?? payload.amount ?? payload.baseXp);
    if (!Number.isInteger(level) || level < 2 || level > 60) {
      throw new HttpsError('invalid-argument', 'level_up_bonus_level_invalid');
    }
    if (!Number.isInteger(amount) || amount !== 100) {
      throw new HttpsError('invalid-argument', 'level_up_bonus_amount_invalid');
    }
    const authoritativeLevel = getLevelFromXP(Math.max(0, Number(progress.user_total_xp ?? 0) || 0));
    if (authoritativeLevel < level) {
      throw new HttpsError('failed-precondition', 'level_up_bonus_level_not_reached');
    }
    requested = 100;
  } else if (event.type === 'exam_complete') {
    const level = cleanString(payload.level ?? payload.examLevel, 12).toLowerCase();
    const attemptsSoFar = Math.max(0, daily?.examAttemptsToday ?? 0);
    if (level === 'final') {
      requested = clampInt(
        payload.xpDelta ?? payload.finalXp ?? payload.amount ?? payload.baseXp,
        0,
        EVENT_XP_CAP.exam_complete,
      );
    } else {
      if (attemptsSoFar >= EXAM_DAILY_ATTEMPT_LIMIT) return 0;
      const pct = clampInt(payload.pct ?? payload.percent ?? payload.scorePct, 0, 100);
      const passed = boolish(payload.passed) || pct >= 70;
      requested = Math.max(0, Math.min(EVENT_XP_CAP.exam_complete, serverExamXp(pct, passed)));
    }
  } else {
    requested = clampInt(
      payload.xpDelta ?? payload.finalXp ?? payload.amount ?? payload.baseXp,
      0,
      EVENT_XP_CAP[event.type],
    );
  }

  // зачем: здесь суточные потолки срезали уже честно заработанный XP. Сервер отдавал урезанный
  // total, клиент при зеркалировании брал Math.max(local, server) и оставался со своим большим
  // числом — потолок не ограничивал игрока, а только разводил два баланса навсегда. Оставляем
  // единственную проверку, которая защищает от подделки: потолок на одно событие (EVENT_XP_CAP)
  // применён выше при clampInt.
  return Math.max(0, requested);
}

function applyDailyStreak(progress: ProgressMap, patch: ProgressMap, activeDate: string): number {
  const last = cleanString(progress.last_active_date ?? progress.streak_last_date, 10);
  const current = Math.max(0, readInt(progress.streak_count, 0));
  if (!last) {
    patch.last_active_date = activeDate;
    patch.streak_last_date = activeDate;
    patch.streak_count = '1';
    return 1;
  }
  if (last === activeDate) return current;

  const diff = dayDiff(activeDate, last);
  if (diff == null || diff < 0) return current;

  const next = diff === 1 ? current + 1 : 1;
  patch.last_active_date = activeDate;
  patch.streak_last_date = activeDate;
  patch.streak_count = String(next);
  return next;
}

function applyClientStreakEvidence(progress: ProgressMap, patch: ProgressMap, event: ProgressEventInput, activeDate: string): ProgressMap {
  const clientLast = cleanString(event.payload.clientLastActiveDate, 10);
  const clientStreak = clampInt(event.payload.clientStreakCount, 0, 100000);
  if (!clientLast || clientStreak <= 0) return progress;

  const diffToEventDate = dayDiff(activeDate, clientLast);
  if (diffToEventDate == null || diffToEventDate < 0 || diffToEventDate > 1) {
    return progress;
  }

  const serverLast = cleanString(progress.last_active_date ?? progress.streak_last_date, 10);
  const serverStreak = Math.max(0, readInt(progress.streak_count, 0));
  const clientBeatsServer =
    !serverLast ||
    clientLast > serverLast ||
    (clientLast === serverLast && clientStreak > serverStreak);

  if (!clientBeatsServer) return progress;

  patch.last_active_date = clientLast;
  patch.streak_last_date = clientLast;
  patch.streak_count = String(clientStreak);
  return {
    ...progress,
    last_active_date: clientLast,
    streak_last_date: clientLast,
    streak_count: String(clientStreak),
  };
}

function applyLessonFields(progress: ProgressMap, patch: ProgressMap, event: ProgressEventInput): void {
  const lessonId = clampInt(event.payload.lessonId, 0, 500);
  if (lessonId <= 0) return;
  const target = normalizeStudyTarget(event.payload.studyTarget);
  addServerOwnedLessonKeys(SERVER_OWNED_PROGRESS_KEYS, lessonId, target);

  const bestKey = lessonFieldKey(lessonId, 'best_score', target);
  const passKey = lessonFieldKey(lessonId, 'pass_count', target);
  const score = Number(event.payload.score ?? event.payload.bestScore ?? 0);
  if (Number.isFinite(score) && score > 0) {
    const previous = Number(progress[bestKey] ?? 0);
    patch[bestKey] = String(Math.max(previous || 0, Math.round(score * 100) / 100));
  }

  const passed = boolish(event.payload.passed) || score >= 2.5;
  if (passed) {
    patch[passKey] = String(Math.max(0, readInt(progress[passKey], 0)) + 1);
    if (lessonId === 1) {
      // Live-маркер для реферальной квалификации: ставится ТОЛЬКО здесь (живое passed-событие).
      // Миграция снапшота (buildMigrationPatch) его сознательно НЕ переносит — по нему
      // referralApply отличает реальное прохождение урока 1 от подсунутого pass_count.
      patch[lessonFieldKey(1, 'pass_live', target)] = '1';
    }
    setUnlocked(progress, patch, lessonId + 1, target);
  }

  if (Array.isArray(event.payload.progress)) {
    patch[lessonProgressKey(lessonId, target)] = JSON.stringify(event.payload.progress.slice(0, 300));
  }
  const cellIndex = readInt(event.payload.cellIndex, -1);
  if (cellIndex >= 0) {
    const cellKey = lessonFieldKey(lessonId, 'cellIndex', target);
    patch[cellKey] = String(Math.max(readInt(progress[cellKey], 0), cellIndex));
  }
}

/**
 * @deprecated Реферальная квалификация больше НЕ завязана на урок 1 (с 2026-07-24
 * условие — покупка Plus/Pro приглашённым, см. referral.ts). Функция оставлена как
 * чистый предикат события «урок 1 пройден» для тестов/истории; в проде не вызывается.
 */
export function shouldQualifyReferralFromProgressEvent(event: ProgressEventInput): boolean {
  if (event.type !== 'lesson_complete') return false;
  const lessonId = clampInt(event.payload.lessonId, 0, 500);
  if (lessonId !== 1) return false;
  const score = Number(event.payload.score ?? event.payload.bestScore ?? 0);
  return boolish(event.payload.passed) || (Number.isFinite(score) && score >= 2.5);
}

function applyExamFields(progress: ProgressMap, patch: ProgressMap, event: ProgressEventInput, activeDate: string): void {
  const level = cleanString(event.payload.level ?? event.payload.examLevel, 12).toLowerCase();
  if (!/^(a1|a2|b1|b2|c1|c2|final)$/.test(level)) return;
  const target = normalizeStudyTarget(event.payload.studyTarget);
  const pct = clampInt(event.payload.pct ?? event.payload.percent ?? event.payload.scorePct, 0, 100);
  const passed = boolish(event.payload.passed) || pct >= 70;
  const pctKey = levelExamFieldKey(level, 'pct', target);
  const bestKey = levelExamFieldKey(level, 'best_pct', target);
  const passedKey = levelExamFieldKey(level, 'passed', target);
  const completedKey = levelExamFieldKey(level, 'completed_at', target);
  patch[pctKey] = String(pct);
  patch[bestKey] = String(Math.max(readInt(progress[bestKey], 0), pct));
  patch[passedKey] = asProgressString(passed || boolish(progress[passedKey]));
  patch[completedKey] = activeDate;
  if (passed) {
    const passCountKey = levelExamFieldKey(level, 'pass_count', target);
    patch[passCountKey] = String(Math.max(0, readInt(progress[passCountKey], 0)) + 1);
    const nextUnlock = level === 'a1' ? 9 : level === 'a2' ? 19 : level === 'b1' ? 29 : 0;
    setUnlocked(progress, patch, nextUnlock, target);
  }
}

export function applyProgressEvent(
  progress: ProgressMap,
  event: ProgressEventInput,
  now: Date = new Date(),
  daily?: ProgressDailyContext,
): ApplyResult {
  const activeDate = resolveClientDateKey(event.clientLocalDate, now);
  const serverDate = isoDateUtc(now);
  const weekKey = getWeekKey(serverDate);
  const weekStart = getWeekStartIso(serverDate);
  const patch: ProgressMap = {};

  const previousTotal = Math.max(0, readInt(progress.user_total_xp, 0));
  const xpDelta = xpFromPayload(event, daily, progress);
  const totalXp = previousTotal + xpDelta;
  const level = getLevelFromXP(totalXp);
  const previousWeeklyStart = cleanString(progress.weekly_xp_period_start, 10);
  const previousWeeklyXp = previousWeeklyStart === weekStart ? Math.max(0, readInt(progress.weekly_xp, 0)) : 0;
  const weekXp = previousWeeklyXp + xpDelta;

  if (xpDelta > 0) {
    patch.user_prev_xp = String(previousTotal);
    patch.user_total_xp = String(totalXp);
    patch.user_level = String(level);
    patch.weekly_xp = String(weekXp);
    patch.weekly_xp_period_start = weekStart;

    const previousWeekPoints = (() => {
      try {
        const parsed = JSON.parse(String(progress.week_points_v2 ?? '{}')) as { weekKey?: string; points?: number };
        return parsed.weekKey === weekKey ? Math.max(0, Number(parsed.points ?? 0) || 0) : 0;
      } catch {
        return 0;
      }
    })();
    const nextWeekPoints = Math.round((previousWeekPoints + xpDelta) * 10) / 10;
    patch.week_points = String(Math.round(nextWeekPoints));
    patch.week_points_v2 = JSON.stringify({ weekKey, points: nextWeekPoints });
  }

  const progressWithClientStreak = xpDelta > 0
    ? applyClientStreakEvidence(progress, patch, event, activeDate)
    : progress;
  const streakCount = xpDelta > 0 ? applyDailyStreak(progressWithClientStreak, patch, activeDate) : Math.max(0, readInt(progress.streak_count, 0));

  if (event.type === 'lesson_complete') {
    applyLessonFields(progress, patch, event);
  } else if (event.type === 'exam_complete') {
    applyExamFields(progress, patch, event, serverDate);
  }

  return {
    ok: true,
    eventId: event.eventId,
    type: event.type,
    xpDelta,
    totalXp,
    level,
    streakCount,
    activeDate,
    weekKey,
    weekXp,
    progressPatch: patch,
  };
}

export function buildMigrationPatch(snapshot: ProgressMap, existing: ProgressMap, now: Date = new Date()): ProgressMap {
  const patch: ProgressMap = {
    user_level: String(getLevelFromXP(Math.max(0, readInt(existing.user_total_xp, 0)))),
  };
  Object.keys(snapshot).forEach((key) => {
    if (/^(?:lesson_progress_v2::fr::)?lesson\d+_cellIndex$/.test(key)) {
      const incoming = clampInt(snapshot[key], 0, 100_000);
      const current = Math.max(0, readInt(existing[key], 0));
      if (incoming > current) patch[key] = String(incoming);
    } else if (/^lesson\d+_progress$/.test(key) || /^lesson_progress_v2::fr::\d+$/.test(key)) {
      const incomingScore = progressArrayScore(snapshot[key]);
      const currentScore = progressArrayScore(existing[key]);
      if (incomingScore > currentScore && typeof snapshot[key] === 'string' && snapshot[key].length <= 20_000) {
        try {
          const parsed = JSON.parse(snapshot[key] as string);
          if (Array.isArray(parsed) && parsed.length <= 300) patch[key] = JSON.stringify(parsed);
        } catch {
          // Ignore malformed structural progress.
        }
      }
    }
  });
  void now;
  return patch;
}

function isSafeMigratableStructuralKey(key: string): boolean {
  return /^(?:lesson_progress_v2::fr::)?lesson\d+_cellIndex$/.test(key)
    || /^lesson\d+_progress$/.test(key)
    || /^lesson_progress_v2::fr::\d+$/.test(key);
}

export function getMigrationQuarantinedSensitiveKeys(snapshot: ProgressMap): string[] {
  return Object.keys(snapshot)
    .filter((key) => isServerOwnedProgressKey(key) && !isSafeMigratableStructuralKey(key))
    .sort();
}

export function buildMigrationProvenance(
  snapshot: ProgressMap,
  beforeXp: number,
  acceptedXp: number,
  appVersion: unknown,
): MigrationProvenance {
  return {
    source: 'client_snapshot_v1',
    quarantinedSensitiveKeys: getMigrationQuarantinedSensitiveKeys(snapshot),
    beforeXp: Math.max(0, Math.trunc(beforeXp)),
    acceptedXp: Math.max(0, Math.trunc(acceptedXp)),
    appVersion: cleanString(appVersion, 32) || null,
  };
}

const DAILY_EVENT_LIMIT = 500;

export const progressSubmitEvent = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  const authUid = request.auth?.uid;
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');

  const event = normalizeProgressEvent(request.data);
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, authUid, request.data?.stableId, {
    requireKnownIdentity: true,
    repairLinks: false,
  });

  const userRef = db.collection('users').doc(stableUid);
  const ledgerRef = userRef.collection('progress_events').doc(safeDocId(event.eventId));
  const eventFingerprint = fingerprintProgressEvent(event);
  const eventFingerprintV2 = fingerprintProgressEventV2(event);
  const existingFingerprintRef = userRef.collection('progress_events')
    .where('fingerprint', '==', eventFingerprint)
    .limit(16);
  const existingFingerprintV2Ref = userRef.collection('progress_events')
    .where('fingerprintSha256', '==', eventFingerprintV2)
    .limit(1);
  const now = new Date();
  const todayKey = isoDateUtc(now);
  const dailyCounterRef = userRef.collection('progress_daily_counters').doc(todayKey);
  const bonusLevel = event.type === 'level_up_bonus' ? Number(event.payload.level) : 0;
  const levelUpBonusClaimRef = event.type === 'level_up_bonus'
    && Number.isInteger(bonusLevel)
    && bonusLevel >= 2
    && bonusLevel <= 60
    ? userRef.collection('level_up_bonus_claims').doc(`level_bonus_v1_${String(bonusLevel).padStart(3, '0')}`)
    : null;
  const legacyLevelUpBonusRef = levelUpBonusClaimRef
    ? userRef.collection('progress_events').doc(safeDocId(`level_up:${bonusLevel}:bonus`))
    : null;
  // зачем: департамент «Контент» Джарвиса (владелец 2026-08-02) — дешёвый
  // агрегат среднего балла по уроку. Пишется в той же транзакции, что уже
  // начисляет XP — одна дополнительная запись документа на событие, без
  // отдельного чтения всей истории и без нового collectionGroup-скана.
  const recordLessonScore = shouldRecordLessonScore(event);
  const lessonScoreSample = recordLessonScore ? extractLessonScoreSample(event) : null;
  const lessonStatsRef = lessonScoreSample
    ? db.collection('lesson_stats').doc(lessonStatsDocId(lessonScoreSample.lessonId, lessonScoreSample.target))
    : null;

  const result = await db.runTransaction(async (tx) => {
    const [userSnap, ledgerSnap, counterSnap, lessonStatsSnap, levelUpBonusClaimSnap, legacyLevelUpBonusSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(ledgerRef),
      tx.get(dailyCounterRef),
      lessonStatsRef ? tx.get(lessonStatsRef) : Promise.resolve(null),
      levelUpBonusClaimRef ? tx.get(levelUpBonusClaimRef) : Promise.resolve(null),
      legacyLevelUpBonusRef ? tx.get(legacyLevelUpBonusRef) : Promise.resolve(null),
    ]);
    if (!userSnap.exists || userSnap.data()?.identityHidden === true || userSnap.data()?.levelSpinMergePending === true) {
      throw new HttpsError('failed-precondition', 'level_spin_identity_transition_pending');
    }
    if (ledgerSnap.exists) {
      const result = ledgerSnap.data()?.result as ProgressEventResult | undefined;
      if (result) return { ...result, duplicate: true };
      throw new HttpsError('aborted', 'progress_event_ledger_corrupt');
    }
    const [fingerprintV2Snap, fingerprintSnap] = await Promise.all([
      tx.get(existingFingerprintV2Ref),
      tx.get(existingFingerprintRef),
    ]);
    if (!fingerprintV2Snap.empty) {
      const result = fingerprintV2Snap.docs[0].data()?.result as ProgressEventResult | undefined;
      if (result) return { ...result, duplicate: true };
      throw new HttpsError('aborted', 'progress_event_ledger_corrupt');
    }
    const semanticMatch = fingerprintSnap.docs.find((candidate) =>
      candidateHasSameProgressSemantics(event, candidate.data()));
    if (semanticMatch) {
      const result = semanticMatch.data()?.result as ProgressEventResult | undefined;
      if (result) return { ...result, duplicate: true };
      throw new HttpsError('aborted', 'progress_event_ledger_corrupt');
    }
    const legacyBonusClaimState = readLegacyLevelUpBonusClaim(
      legacyLevelUpBonusSnap?.exists ? legacyLevelUpBonusSnap.data() : undefined,
      bonusLevel,
    );
    if (legacyBonusClaimState === 'corrupt') {
      throw new HttpsError('aborted', 'level_up_bonus_legacy_ledger_corrupt');
    }
    const counterData = counterSnap.data() ?? {};
    const dailyCount = (counterData.count as number | undefined) ?? 0;
    if (dailyCount >= DAILY_EVENT_LIMIT) {
      throw new HttpsError('resource-exhausted', 'daily_progress_event_limit_reached');
    }

    // ECON-2/3/11: серверные суточные лимиты. Читаем уже накопленные сегодня значения, считаем XP с
    // их учётом, затем записываем обновлённые счётчики в той же транзакции (идемпотентно с ledger).
    const sourceXpToday = (counterData.sourceXp as Partial<Record<ProgressEventType, number>> | undefined) ?? {};
    const examAttemptsToday = (counterData.examAttempts as number | undefined) ?? 0;
    const totalXpToday = Math.max(0, Number(counterData.totalXp ?? 0) || 0);

    const rawProgress = getProgress(userSnap.data());
    const progress = buildProgressBaseline(rawProgress, userSnap.data()?.progressServerState, now);
    const applied = applyProgressEvent(progress, event, now, {
      sourceXpToday,
      examAttemptsToday,
      totalXpToday,
      levelUpBonusAlreadyClaimed: levelUpBonusClaimSnap?.exists === true
        || legacyBonusClaimState === 'claimed',
    });
    const learningMetrics = await prepareLearningCompletionMetrics({
      db,
      tx,
      stableUid,
      eventType: event.type,
      completionApplied: event.type !== 'plan_task_complete' || applied.xpDelta > 0,
      occurredAt: now,
      fields: {
        increment: (value) => admin.firestore.FieldValue.increment(value),
        serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
      },
    });
    const levelSpinMint = await applyLevelSpinMinting({
      db,
      tx,
      stableUid,
      authUid,
      userRef,
      userData: (userSnap.data() ?? {}) as Record<string, unknown>,
      progressBefore: progress,
      beforeLevel: getLevelFromXP(Math.max(0, Number(progress.user_total_xp ?? 0) || 0)),
      afterLevel: applied.level,
      protocol: event.levelSpinProtocol,
      earnedAtMs: now.getTime(),
      examCompletion: examSpinCompletionForEvent(event, progress),
    });
    commitPreparedLearningMetrics(tx, learningMetrics);
    const mergedProgress = {
      ...progress,
      ...applied.progressPatch,
      level_reward_spin_balance: String(levelSpinMint.balance),
    };
    const progressServerState = progressServerStateFromProgress(mergedProgress, now);
    const progressPatch = { ...applied.progressPatch, ...authoritativeProgressPatch(progressServerState) };

    const counterPatch: Record<string, unknown> = {
      count: dailyCount + 1,
      totalXp: totalXpToday + applied.xpDelta,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Вложенный sourceXp нельзя дописывать через {merge:true} с точечным ключом (создаст литеральное
    // поле "sourceXp.x"), поэтому собираем объект sourceXp целиком с FieldValue.increment.
    if (applied.xpDelta > 0) {
      counterPatch.sourceXp = { [event.type]: admin.firestore.FieldValue.increment(applied.xpDelta) };
    }
    // Считаем только попытки уровневых зачётов (a1..c2) — финальный экзамен разовый и под лимит не идёт.
    if (event.type === 'exam_complete') {
      const examLevel = cleanString(event.payload.level ?? event.payload.examLevel, 12).toLowerCase();
      if (examLevel !== 'final') {
        counterPatch.examAttempts = admin.firestore.FieldValue.increment(1);
      }
    }
    tx.set(dailyCounterRef, counterPatch, { merge: true });
    if (lessonStatsRef && lessonScoreSample) {
      const previousStats = (lessonStatsSnap?.exists ? lessonStatsSnap.data()?.stats : null) as LessonScoreStats | null;
      const nextStats = applyLessonScoreSample(previousStats, lessonScoreSample.score);
      tx.set(lessonStatsRef, {
        lessonId: lessonScoreSample.lessonId,
        target: lessonScoreSample.target,
        stats: nextStats,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    if (levelUpBonusClaimRef && levelUpBonusClaimSnap?.exists !== true && applied.xpDelta === 100) {
      tx.create(levelUpBonusClaimRef, {
        level: bonusLevel,
        eventId: event.eventId,
        amount: 100,
        claimedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    const result: ProgressEventResult = {
      ok: true,
      stableUid,
      eventId: applied.eventId,
      type: applied.type,
      duplicate: false,
      xpDelta: applied.xpDelta,
      totalXp: applied.totalXp,
      level: applied.level,
      streakCount: applied.streakCount,
      activeDate: applied.activeDate,
      weekKey: applied.weekKey,
      weekXp: applied.weekXp,
      levelSpinsMinted: levelSpinMint.minted,
      levelSpinMintedCredits: levelSpinMint.mintedCredits,
      levelSpinBalance: levelSpinMint.balance,
    };

    tx.set(userRef, {
      progress: progressPatch,
      progressServerState: {
        ...progressServerState,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      levelSpinServerState: levelSpinMint.state,
      firebaseAuthUid: authUid,
      progressServerAuthoritative: true,
      progressServerCutoverAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.set(ledgerRef, {
      eventId: event.eventId,
      type: event.type,
      payload: event.payload,
      fingerprint: eventFingerprint,
      fingerprintSha256: eventFingerprintV2,
      fingerprintCanonicalVersion: 1,
      fingerprintCanonical: canonicalProgressEventSemantics(event),
      clientLocalDate: event.clientLocalDate ?? null,
      clientCreatedAt: event.clientCreatedAt ?? null,
      appVersion: event.appVersion ?? null,
      platform: event.platform ?? null,
      levelSpinProtocol: event.levelSpinProtocol ?? null,
      result,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return result;
  });

  await projectProgressToCurrentLeague(db, stableUid, result).catch((e) => {
    console.warn('[progress_events] league projection failed', e);
  });

  return result;
});

export const progressMigrateSnapshot = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  const authUid = request.auth?.uid;
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');

  const snapshot = normalizePayload(request.data?.progress);
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, authUid, request.data?.stableId, {
    requireKnownIdentity: true,
  });
  const userRef = db.collection('users').doc(stableUid);
  const migrationRef = userRef.collection('progress_migrations').doc('client_snapshot_v1');
  const now = new Date();

  return db.runTransaction(async (tx) => {
    const [userSnap, migrationSnap] = await Promise.all([tx.get(userRef), tx.get(migrationRef)]);
    if (migrationSnap.exists) {
      return { ok: true, stableUid, migrated: false, reason: 'already_migrated' };
    }
    const existing = getProgress(userSnap.data());
    const patch = buildMigrationPatch(snapshot, existing, now);
    tx.set(userRef, {
      progress: patch,
      firebaseAuthUid: authUid,
      progressServerAuthoritative: true,
      progressMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.set(migrationRef, {
      migrated: true,
      keys: Object.keys(patch).sort(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true, stableUid, migrated: true, keys: Object.keys(patch).sort() };
  });
});

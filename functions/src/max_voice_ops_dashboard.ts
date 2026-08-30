import * as admin from 'firebase-admin';
import { AggregateField } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { hasPermission, roleFromAdminToken } from './admin/permissions';
import { ENFORCE_APP_CHECK_ADMIN } from './callable_options';
import { VOICE_BILLING_COLLECTION } from './max_voice_session_end';
import {
  applyMaxVoiceOpsDelta,
  emptyMaxVoiceOpsDaily,
  MAX_VOICE_OPS_COLLECTION,
  type MaxVoiceOpsDailyV1,
} from './max_voice_ops';

const REGION = 'us-central1';
const ALLOWED_DAYS = new Set([1, 7, 30]);
const PRIVACY_THRESHOLD = 5;
const HEALTH_SAMPLE_THRESHOLD = 10;
const DAY_MS = 86_400_000;

type RequestShape = Readonly<{
  auth?: Readonly<{ uid?: string; token?: unknown }>;
  data?: unknown;
}>;

type AuditRow = Readonly<{
  action: 'max_ops_read';
  actorUid: string;
  days: 1 | 7 | 30;
  createdAtMs: number;
}>;

/** Сумма фактического потребления по строкам voice_call_billing. */
export interface MaxVoiceUsageMoneyTotals {
  readonly calls: number;
  readonly seconds: number;
  readonly estCostUsd: number;
  readonly transcriptionCostUsd: number;
}

export interface MaxVoiceOpsDashboardDependencies {
  readonly nowMs: () => number;
  readonly readDays: (dayKeys: readonly string[]) => Promise<readonly unknown[]>;
  readonly appendAudit: (row: AuditRow) => Promise<void>;
  /**
   * зачем (владелец 2026-08-30): «сколько минут MAX использовано в общем и
   * сколько это стоило денег реально (точно)». Серверная sum-агрегация по
   * voice_call_billing (sinceMs=null — за всё время) — документы НЕ
   * выкачиваются (правило Джарвиса), одна агрегация на окно.
   */
  readonly readUsage: (sinceMs: number | null) => Promise<MaxVoiceUsageMoneyTotals>;
  /** Доки дневной сверки с OpenAI (max_voice_usage_recon) за последние дни. */
  readonly readRecon: (dayKeys: readonly string[]) => Promise<readonly unknown[]>;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeInput(value: unknown): Readonly<{ days: 1 | 7 | 30 }> {
  if (!record(value) || Object.keys(value).length !== 1 || !Object.prototype.hasOwnProperty.call(value, 'days')) {
    throw new HttpsError('invalid-argument', 'Only days is accepted');
  }
  const days = Number(value.days);
  if (!Number.isInteger(days) || !ALLOWED_DAYS.has(days)) {
    throw new HttpsError('invalid-argument', 'days must be 1, 7, or 30');
  }
  return { days: days as 1 | 7 | 30 };
}

function authorize(request: RequestShape): Readonly<{ actorUid: string }> {
  const actorUid = request.auth?.uid?.trim() ?? '';
  if (!actorUid) throw new HttpsError('unauthenticated', 'Authentication required');
  const role = roleFromAdminToken(request.auth?.token);
  if (!role || !hasPermission(role, 'diagnostics.read')) {
    throw new HttpsError('permission-denied', 'diagnostics.read required');
  }
  return { actorUid };
}

function dayKeysEndingAt(nowMs: number, days: number): readonly string[] {
  const end = new Date(nowMs);
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Object.freeze(Array.from({ length: days }, (_, index) => (
    new Date(endUtc - (days - index - 1) * DAY_MS).toISOString().slice(0, 10)
  )));
}

function safeDaily(value: unknown, fallbackDayKey: string): MaxVoiceOpsDailyV1 | null {
  if (!record(value)) return null;
  const dayKey = typeof value.dayKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.dayKey)
    ? value.dayKey
    : fallbackDayKey;
  try {
    return applyMaxVoiceOpsDelta(value, dayKey, {}, Number(value.updatedAtMs) || 0);
  } catch {
    return null;
  }
}

function sumRecord(rows: readonly MaxVoiceOpsDailyV1[], key: keyof MaxVoiceOpsDailyV1): Record<string, number> {
  const output: Record<string, number> = {};
  for (const row of rows) {
    const group = row[key] as unknown;
    if (!record(group)) continue;
    for (const [cell, value] of Object.entries(group)) output[cell] = (output[cell] ?? 0) + Number(value || 0);
  }
  return output;
}

function suppressSmallCells(values: Record<string, number>): Record<string, number | null> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value < PRIVACY_THRESHOLD ? null : value]));
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? Math.round((numerator / denominator) * 10_000) / 10_000 : null;
}

function health(callsStarted: number, callsConnected: number, reviewsReady: number, completed: number, reconnectAttempts: number, reconnectRecovered: number) {
  if (callsStarted < HEALTH_SAMPLE_THRESHOLD) {
    return { code: 'unknown', label: 'Недостаточно данных', reason: `Нужно минимум ${HEALTH_SAMPLE_THRESHOLD} начатых разговоров` } as const;
  }
  const connectionRate = callsConnected / callsStarted;
  const reviewBase = Math.max(1, completed);
  const reviewRate = reviewsReady / reviewBase;
  const reconnectRate = reconnectAttempts > 0 ? reconnectRecovered / reconnectAttempts : 1;
  if (connectionRate < 0.85 || reviewRate < 0.8 || reconnectRate < 0.7) {
    return { code: 'critical', label: 'Нужно вмешательство', reason: 'Один из ключевых этапов ниже безопасного порога' } as const;
  }
  if (connectionRate < 0.95 || reviewRate < 0.95 || reconnectRate < 0.9) {
    return { code: 'warning', label: 'Есть отклонения', reason: 'Ключевые этапы работают, но требуют наблюдения' } as const;
  }
  return { code: 'healthy', label: 'Стабильно', reason: 'Ключевые этапы проходят без заметных потерь' } as const;
}

export async function getMaxVoiceOpsDashboard(request: RequestShape, deps: MaxVoiceOpsDashboardDependencies) {
  const { actorUid } = authorize(request);
  const { days } = normalizeInput(request.data);
  const nowMs = deps.nowMs();
  const dayKeys = dayKeysEndingAt(nowMs, days);
  const nowDate = new Date(nowMs);
  const monthStartMs = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), 1);
  // Минуты/деньги — параллельно с дневными агрегатами; сбой агрегации не
  // роняет остальной дашборд (usage: null + причина в консоли функции).
  // Сверка с OpenAI: последние 7 дней, кроме сегодняшнего (его сверит
  // завтрашний крон). Битые доки отбрасываются построчно.
  const reconDayKeys = dayKeysEndingAt(nowMs - DAY_MS, 7);
  const reconRows = await deps.readRecon(reconDayKeys).then((rows) => rows
    .flatMap((raw) => {
      if (!record(raw)) return [];
      const dayKey = typeof raw.dayKey === 'string' ? raw.dayKey : '';
      const status = typeof raw.status === 'string' ? raw.status : '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey) || status === '') return [];
      const ours = record(raw.ours) ? raw.ours : {};
      const openai = record(raw.openai) ? raw.openai : null;
      return [{
        dayKey,
        status,
        note: typeof raw.note === 'string' ? raw.note.slice(0, 300) : '',
        drift: record(raw.drift) ? raw.drift : null,
        oursCostUsd: Number(ours.estCostUsd) || 0,
        openaiCostUsd: openai ? Number(openai.estCostUsd) || 0 : null,
      }];
    })
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey)),
  ).catch((error) => {
    console.error('max_voice_ops_dashboard recon read failed', error);
    return [] as never[];
  });
  const [rawRows, usage] = await Promise.all([
    deps.readDays(dayKeys),
    Promise.all([
      deps.readUsage(null),
      deps.readUsage(monthStartMs),
      deps.readUsage(nowMs - days * DAY_MS),
    ]).then(([allTime, currentMonth, windowTotals]) => ({
      // Источник и метод — прямо в ответе, чтобы админка честно подписывала
      // цифру: фактические токены каждой сессии × официальный прайс
      // (кэш-скидка и транскрипция учтены; priceTableDate — в каждой строке).
      source: VOICE_BILLING_COLLECTION,
      basis: 'usage_tokens_x_price_table',
      allTime,
      currentMonth,
      window: windowTotals,
      recon: {
        latest: reconRows.length > 0 ? reconRows[reconRows.length - 1] : null,
        days: reconRows,
      },
    })).catch((error) => {
      console.error('max_voice_ops_dashboard usage aggregation failed', error);
      return null;
    }),
  ]);
  const rowsByDay = new Map<string, MaxVoiceOpsDailyV1>();
  for (const raw of rawRows.slice(0, 30)) {
    const normalized = safeDaily(raw, dayKeys[0]);
    if (normalized && dayKeys.includes(normalized.dayKey)) rowsByDay.set(normalized.dayKey, normalized);
  }
  const rows = dayKeys.map((dayKey) => rowsByDay.get(dayKey) ?? emptyMaxVoiceOpsDaily(dayKey, 0));
  const scalarKeys = [
    'mintsRequested', 'mintsSucceeded', 'mintsFailed', 'callsStarted', 'callsConnected',
    'callsCompleted', 'callsFailed', 'explicitUserEnds', 'watchdogEnds', 'reconnectAttempts',
    'reconnectRecovered', 'reconnectFailed', 'noRemoteAudio', 'emptyTranscript',
    'finalizationQueued', 'finalizationRetryable', 'finalizationTerminal', 'reviewsReady',
    'reviewsFailed', 'finalizationRetries', 'memoryUpdatesSucceeded', 'memoryUpdatesFailed',
    'sensitiveMemoryCandidatesRejected', 'mintRejections', 'quotaReservations', 'quotaSettlements',
    'watchdogSettlements', 'impossibleSequences',
    // зачем: владелец 2026-08-22 — дисциплина учителя в панели (доли уроков).
    'lessonsFinalized', 'lessonsEndedByTutor', 'lessonsWithHomework', 'lessonsGoalAdvanced',
    'lessonsSceneDone', 'lessonsTutorSafetyFlagged', 'lessonsWithLanguagePreference',
    'phraseResultsPass', 'phraseResultsTotal',
  ] as const;
  const totals = Object.fromEntries(scalarKeys.map((key) => [key, rows.reduce((sum, row) => sum + row[key], 0)])) as Record<typeof scalarKeys[number], number>;
  const newestUpdateMs = rows.reduce((latest, row) => Math.max(latest, row.updatedAtMs), 0);
  const completed = totals.callsCompleted + totals.callsFailed;
  const dashboard = {
    schemaVersion: 'max-voice-ops-dashboard.v1' as const,
    generatedAtMs: nowMs,
    days,
    source: MAX_VOICE_OPS_COLLECTION,
    state: {
      empty: totals.callsStarted === 0 && totals.mintsRequested === 0,
      partial: rowsByDay.size > 0 && rowsByDay.size < dayKeys.length,
      stale: newestUpdateMs > 0 && nowMs - newestUpdateMs > 36 * 60 * 60 * 1_000,
      lastAggregateAtMs: newestUpdateMs,
      availableDays: rowsByDay.size,
      requestedDays: dayKeys.length,
    },
    health: health(totals.callsStarted, totals.callsConnected, totals.reviewsReady, completed, totals.reconnectAttempts, totals.reconnectRecovered),
    usage,
    totals,
    rates: {
      mintSuccess: ratio(totals.mintsSucceeded, totals.mintsRequested),
      connection: ratio(totals.callsConnected, totals.callsStarted),
      completion: ratio(totals.callsCompleted, totals.callsStarted),
      reviewReady: ratio(totals.reviewsReady, completed),
      reconnectRecovery: ratio(totals.reconnectRecovered, totals.reconnectAttempts),
    },
    distributions: {
      endReasons: sumRecord(rows, 'endReasons'),
      preparationLatencyBuckets: sumRecord(rows, 'preparationLatencyBuckets'),
      firstAudioLatencyBuckets: sumRecord(rows, 'firstAudioLatencyBuckets'),
      responseLatencyBuckets: sumRecord(rows, 'responseLatencyBuckets'),
      finalizeLatencyBuckets: sumRecord(rows, 'finalizeLatencyBuckets'),
      reconnectRecoveryBuckets: sumRecord(rows, 'reconnectRecoveryBuckets'),
      callDurationBuckets: sumRecord(rows, 'callDurationBuckets'),
      localeCounts: suppressSmallCells(sumRecord(rows, 'localeCounts')),
      levelCounts: suppressSmallCells(sumRecord(rows, 'levelCounts')),
      providerUsage: sumRecord(rows, 'providerUsage'),
      mintRejectionReasons: sumRecord(rows, 'mintRejectionReasons'),
    },
    trend: rows.map((row) => ({
      dayKey: row.dayKey,
      callsStarted: row.callsStarted,
      callsConnected: row.callsConnected,
      callsCompleted: row.callsCompleted,
      callsFailed: row.callsFailed,
      reviewsReady: row.reviewsReady,
      reviewsFailed: row.reviewsFailed,
      reconnectAttempts: row.reconnectAttempts,
      reconnectRecovered: row.reconnectRecovered,
    })),
  };
  await deps.appendAudit({ action: 'max_ops_read', actorUid, days, createdAtMs: nowMs });
  return dashboard;
}

export const adminGetMaxVoiceOpsDashboard = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_ADMIN,
  timeoutSeconds: 30,
  memory: '256MiB',
}, async (request) => {
  const db = admin.firestore();
  return getMaxVoiceOpsDashboard(request, {
    nowMs: () => Date.now(),
    readDays: async (dayKeys) => {
      const snapshots = await db.getAll(...dayKeys.map((dayKey) => db.collection(MAX_VOICE_OPS_COLLECTION).doc(dayKey)));
      return snapshots.filter((snapshot) => snapshot.exists).map((snapshot) => snapshot.data());
    },
    appendAudit: async (row) => {
      await db.collection('admin_log').add(row);
    },
    readUsage: async (sinceMs) => {
      let query: FirebaseFirestore.Query = db.collection(VOICE_BILLING_COLLECTION);
      if (sinceMs !== null) query = query.where('createdAtMs', '>=', sinceMs);
      const snapshot = await query.aggregate({
        calls: AggregateField.count(),
        seconds: AggregateField.sum('seconds'),
        estCostUsd: AggregateField.sum('estCostUsd'),
        transcriptionCostUsd: AggregateField.sum('transcriptionCostUsd'),
      }).get();
      const data = snapshot.data();
      const num = (value: unknown): number => (Number.isFinite(Number(value)) ? Number(value) : 0);
      return {
        calls: Math.max(0, Math.floor(num(data.calls))),
        seconds: Math.max(0, num(data.seconds)),
        estCostUsd: Math.max(0, num(data.estCostUsd)),
        transcriptionCostUsd: Math.max(0, num(data.transcriptionCostUsd)),
      };
    },
    readRecon: async (dayKeys) => {
      const snapshots = await db.getAll(
        ...dayKeys.map((dayKey) => db.collection('max_voice_usage_recon').doc(dayKey)),
      );
      return snapshots.filter((snapshot) => snapshot.exists).map((snapshot) => snapshot.data());
    },
  });
});

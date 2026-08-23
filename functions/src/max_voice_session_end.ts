// ═══════════════════════════════════════════════════════════════════════════
// max_voice_session_end.ts — heartbeat и сеттлмент MAX-звонка (раздел 2 спеки).
//
// maxVoiceHeartbeat (каждые 30с): отметка живости + аккумулятор usage-токенов
// в доке квоты — если сессия умрёт молча, watchdog и биллинг спишут по
// последнему честному отчёту, а не по полному резерву.
//
// maxVoiceSessionEnd: серверный сеттлмент min(факт, резерв) через
// settleVoiceSession, billing-запись voice_call_billing со всеми полями и
// серверный расчёт XP. Клиентским секундам в деньгах не верим: факт считается
// от серверных часов разговора (activatedAtMs — первый heartbeat, иначе
// sessionStartedAtMs); клиентские цифры — только вниз и в фрод-лог.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import type { Firestore } from 'firebase-admin/firestore';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { resolveMaxVoiceConfig } from './max_voice_config';
import { asVoiceCefr } from './max_voice_prompt';
import {
  VOICE_QUOTA_COLLECTION,
  settleVoiceSessionWithXp,
  voiceQuotaDocId,
  voiceSessionClockStartMs,
} from './max_voice_quota';
import { VOICE_EST_COST_USD_PER_MIN, refundVoiceBudgetEstimate, utcDayKey } from './max_voice_mint';
import {
  MAX_VOICE_OPS_EVENT_SCHEMA,
  recordMaxVoiceOpsOnce,
  type MaxVoiceOpsEventV1,
} from './max_voice_ops';

if (!admin.apps.length) admin.initializeApp();

const REGION = 'us-central1';

export const VOICE_BILLING_COLLECTION = 'voice_call_billing';

/**
 * Дата прайс-листа, по которому посчитан estCostUsd, — пишется в каждую
 * billing-запись, чтобы дневная сверка с Usage API знала, чем считали.
 */
export const VOICE_PRICE_TABLE_DATE = '2026-08-21';

/** $/1M токенов gpt-realtime-2.1-mini + $/мин транскрипции входа. */
export const VOICE_PRICES = {
  audioInputPerM: 10,
  audioOutputPerM: 20,
  cachedPerM: 0.3,
  textInputPerM: 0.6,
  textOutputPerM: 2.4,
  transcriptionPerMin: 0.006,
} as const;

/**
 * Грубая серверная оценка секунд речи ученика из audio-input токенов Realtime
 * (~10 ток/с). Нужна не для денег, а для фрод-детекта клиентского clientSpeechSec.
 */
export const AUDIO_TOKENS_PER_SEC = 10;

const END_REASONS = ['completed', 'capped', 'dropped', 'watchdog', 'background'] as const;
export type VoiceEndReason = typeof END_REASONS[number];

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nonNegInt(value: unknown): number {
  return Math.max(0, Math.floor(num(value)));
}

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

export function asVoiceEndReason(value: unknown): VoiceEndReason {
  const v = text(value, 20) as VoiceEndReason;
  // Неизвестный/чужой reason (например, клиентский 'failed' или version skew) —
  // это НЕ отказ записи: сеттлмент и billing обязаны состояться, а самый честный
  // дефолт для непонятного конца — 'dropped', не оптимистичный 'completed'.
  return END_REASONS.includes(v) ? v : 'dropped';
}

export interface VoiceUsageTotals {
  audioInputTokens: number;
  audioOutputTokens: number;
  cachedTokens: number;
  /** Optional only at the boundary: old clients/documents sent total alone. */
  textInputTokens?: number;
  textOutputTokens?: number;
  textTokens: number;
}

export type SanitizedVoiceUsageTotals = VoiceUsageTotals & {
  textInputTokens: number;
  textOutputTokens: number;
};

/** Клиент шлёт НАКОПЛЕННЫЕ суммы из response.done — санитизация вниз в int ≥0. */
export function sanitizeVoiceUsage(raw: unknown): SanitizedVoiceUsageTotals {
  const u = (raw ?? {}) as Record<string, unknown>;
  const textInputTokens = nonNegInt(u.textInputTokens);
  const textOutputTokens = nonNegInt(u.textOutputTokens);
  return {
    audioInputTokens: nonNegInt(u.audioInputTokens),
    audioOutputTokens: nonNegInt(u.audioOutputTokens),
    cachedTokens: nonNegInt(u.cachedTokens),
    textInputTokens,
    textOutputTokens,
    // Не уменьшаем legacy total: старый сервер/док мог знать только его.
    textTokens: Math.max(nonNegInt(u.textTokens), textInputTokens + textOutputTokens),
  };
}

/** Оценка стоимости сессии по прайс-таблице (+ транскрипция как явная строка). */
export function estimateVoiceCostUsd(usage: VoiceUsageTotals, chargedSec: number): {
  estCostUsd: number;
  transcriptionCostUsd: number;
} {
  const normalized = sanitizeVoiceUsage(usage);
  // Старый клиент присылал только общий textTokens. Направление восстановить
  // нельзя, поэтому остаток оцениваем по более дорогой output-цене: финансовый
  // отчёт может быть консервативным, но не должен снова недосчитывать расход.
  const legacyUnsplitTextTokens = Math.max(
    0,
    normalized.textTokens - normalized.textInputTokens - normalized.textOutputTokens,
  );
  const transcriptionCostUsd = (Math.max(0, chargedSec) / 60) * VOICE_PRICES.transcriptionPerMin;
  const tokensUsd =
    (normalized.audioInputTokens / 1_000_000) * VOICE_PRICES.audioInputPerM +
    (normalized.audioOutputTokens / 1_000_000) * VOICE_PRICES.audioOutputPerM +
    (normalized.cachedTokens / 1_000_000) * VOICE_PRICES.cachedPerM +
    (normalized.textInputTokens / 1_000_000) * VOICE_PRICES.textInputPerM +
    ((normalized.textOutputTokens + legacyUnsplitTextTokens) / 1_000_000) * VOICE_PRICES.textOutputPerM;
  return { estCostUsd: tokensUsd + transcriptionCostUsd, transcriptionCostUsd };
}

// ── XP ──────────────────────────────────────────────────────────────────────

/** rate(CEFR): на высоких уровнях минута речи «тяжелее». */
export const VOICE_XP_CEFR_RATE: Record<'A1' | 'A2' | 'B1' | 'B2', number> = {
  A1: 1,
  A2: 1,
  B1: 1.2,
  B2: 1.4,
};

/**
 * Минимум РЕАЛЬНОЙ речи для XP-floor: 30 секунд по серверной оценке из
 * audio-input токенов Realtime (~AUDIO_TOKENS_PER_SEC ток/с → 300 токенов).
 * Зачем: repliesCount — чисто клиентское поле, и floor «5 XP/минуту при ≥1
 * реплике» без серверного подтверждения фармился бы молчанием в открытый
 * микрофон с repliesCount=1. Аудио-вход накрутить «бесплатно» нельзя — токены
 * входа оплачиваются самим звонком и копятся сервером из heartbeat'ов.
 */
export const VOICE_XP_FLOOR_MIN_SPEECH_SEC = 30;
export const VOICE_XP_FLOOR_MIN_AUDIO_TOKENS = VOICE_XP_FLOOR_MIN_SPEECH_SEC * AUDIO_TOKENS_PER_SEC;

export interface VoiceXpArgs {
  clientSpeechSec: number;
  sessionSec: number;
  transcriptWordCount: number;
  replies: number;
  /** Серверный аккумулятор audio-input токенов — подтверждение, что речь была. */
  audioInputTokens: number;
  cefr: string;
  xpRatePerSpeechMin: number;
  xpDailyCap: number;
}

/**
 * Формула спеки: xp = min(clientSpeechSec, sessionSec×0.8, wordCount/2) × rate(CEFR),
 * где базовая ставка — xpRatePerSpeechMin за минуту речи. Каждый кламп — своя
 * защита от накрутки: речи не может быть больше 80% сессии, и болтовня без слов
 * (тишина в открытый микрофон) не оплачивается. Floor: 5 XP за каждую полную
 * минуту сессии при ≥1 реплике И серверном подтверждении речи
 * (audioInputTokens ≥ VOICE_XP_FLOOR_MIN_AUDIO_TOKENS): клиентскому repliesCount
 * одному не верим. Сверху — дневной кэп.
 */
export function computeVoiceXp(args: VoiceXpArgs): number {
  const sessionSec = Math.max(0, args.sessionSec);
  const speechSec = Math.max(0, Math.min(
    args.clientSpeechSec,
    sessionSec * 0.8,
    Math.max(0, args.transcriptWordCount) / 2,
  ));
  const rate = VOICE_XP_CEFR_RATE[asVoiceCefr(args.cefr)];
  let xp = Math.round((speechSec / 60) * args.xpRatePerSpeechMin * rate);
  const speechConfirmed = Math.max(0, args.audioInputTokens) >= VOICE_XP_FLOOR_MIN_AUDIO_TOKENS;
  if (args.replies >= 1 && speechConfirmed) {
    xp = Math.max(xp, 5 * Math.floor(sessionSec / 60));
  }
  return Math.max(0, Math.min(xp, Math.max(0, args.xpDailyCap)));
}

/** true — клиентские секунды речи завышены к серверной оценке больше чем на 30%. */
export function detectSpeechDrift(clientSpeechSec: number, audioInputTokens: number): boolean {
  if (!(audioInputTokens > 0) || !(clientSpeechSec > 0)) return false;
  const serverEstSec = audioInputTokens / AUDIO_TOKENS_PER_SEC;
  return clientSpeechSec > serverEstSec * 1.3;
}

// зачем (P1-13, 2026-08-23): accrueVoiceXpDaily + VoiceXpAccrualArgs удалены.
// Дневной XP-кэп теперь считается ВНУТРИ settleVoiceSessionWithXp, той же
// транзакцией, что и сеттлмент. Оставлять вторую, отдельную точку начисления
// на тот же документ опасно: вызов её вдобавок к транзакции начислил бы XP
// дважды. Формула кэпа (аккумулятор xpAwardedToday + reset по UTC-дню)
// перенесена в max_voice_quota.ts без изменений.

// ── Billing row ─────────────────────────────────────────────────────────────

export interface VoiceBillingRowArgs {
  uid: string;
  authUid: string;
  sessionId: string;
  /** Корень reconnect-чейна: все ре-минты одного разговора — одна группа. */
  callGroupId: string;
  model: string;
  seconds: number;
  usage: VoiceUsageTotals;
  endReason: VoiceEndReason;
  channel: 'realtime' | 'half_duplex';
  scenarioId: string | null;
  cefr: string | null;
  trialVariant: 'companion' | 'scenario' | null;
  clientSpeechSec: number;
  xpAwarded: number;
  sessionStartedAtMs: number;
  nowMs: number;
}

/**
 * Единственная точка записи voice_call_billing: её делят maxVoiceSessionEnd и
 * watchdog (settle тихо умершей сессии обязан попасть в биллинг с
 * endReason 'watchdog' — иначе дневная сверка с Usage API систематически
 * недосчитывает потраченные токены).
 */
export async function writeVoiceBillingRow(db: Firestore, row: VoiceBillingRowArgs): Promise<void> {
  const usage = sanitizeVoiceUsage(row.usage);
  const { estCostUsd, transcriptionCostUsd } = estimateVoiceCostUsd(usage, row.seconds);
  await db.collection(VOICE_BILLING_COLLECTION).doc().set({
    uid: row.uid,
    authUid: row.authUid,
    sessionId: row.sessionId,
    callGroupId: row.callGroupId,
    model: row.model,
    seconds: row.seconds,
    audioInputTokens: usage.audioInputTokens,
    audioOutputTokens: usage.audioOutputTokens,
    cachedTokens: usage.cachedTokens,
    textInputTokens: usage.textInputTokens,
    textOutputTokens: usage.textOutputTokens,
    textTokens: usage.textTokens,
    transcriptionCostUsd,
    estCostUsd,
    priceTableDate: VOICE_PRICE_TABLE_DATE,
    scenarioId: row.scenarioId,
    cefr: row.cefr,
    channel: row.channel,
    trialVariant: row.trialVariant,
    endReason: row.endReason,
    clientSpeechSec: row.clientSpeechSec,
    xpAwarded: row.xpAwarded,
    sessionStartedAtMs: row.sessionStartedAtMs,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: row.nowMs,
  });
}

// ── Heartbeat ───────────────────────────────────────────────────────────────

export interface VoiceHeartbeatUsageArgs {
  authUid: string;
  stableUid: string;
  sessionId: string;
  elapsedSec: number;
  usage: VoiceUsageTotals;
  nowMs?: number;
}

type VoiceHeartbeatLifecycleResult = Readonly<{
  alive: boolean;
  firstHeartbeat: boolean;
  reconnectAttempted: boolean;
  connectionLatencyMs: number;
}>;

async function recordVoiceHeartbeatLifecycle(db: Firestore, args: VoiceHeartbeatUsageArgs): Promise<VoiceHeartbeatLifecycleResult> {
  const now = args.nowMs ?? Date.now();
  const ref = db.collection(VOICE_QUOTA_COLLECTION).doc(voiceQuotaDocId(args.authUid, args.stableUid));
  return db.runTransaction(async (tx) => {
    const data = ((await tx.get(ref)).data() ?? {}) as Record<string, unknown>;
    if (text(data.activeSessionId, 80) !== text(args.sessionId, 80) || num(data.reservedSec) <= 0) {
      return { alive: false, firstHeartbeat: false, reconnectAttempted: false, connectionLatencyMs: 0 };
    }
    const firstHeartbeat = num(data.activatedAtMs) <= 0;
    const stages = data.maxVoiceOpsStages && typeof data.maxVoiceOpsStages === 'object'
      ? data.maxVoiceOpsStages as Record<string, unknown>
      : {};
    const prev = sanitizeVoiceUsage(data.usageTotals);
    const reported = sanitizeVoiceUsage(args.usage);
    const activatedAtMs = firstHeartbeat
      ? Math.min(now, Math.max(num(data.sessionStartedAtMs, now), now - nonNegInt(args.elapsedSec) * 1000))
      : num(data.activatedAtMs);
    tx.set(ref, {
      activatedAtMs,
      lastHeartbeatMs: now,
      lastHeartbeatElapsedSec: Math.max(nonNegInt(data.lastHeartbeatElapsedSec), nonNegInt(args.elapsedSec)),
      usageTotals: sanitizeVoiceUsage({
        audioInputTokens: Math.max(prev.audioInputTokens, reported.audioInputTokens),
        audioOutputTokens: Math.max(prev.audioOutputTokens, reported.audioOutputTokens),
        cachedTokens: Math.max(prev.cachedTokens, reported.cachedTokens),
        textInputTokens: Math.max(prev.textInputTokens, reported.textInputTokens),
        textOutputTokens: Math.max(prev.textOutputTokens, reported.textOutputTokens),
        textTokens: Math.max(prev.textTokens, reported.textTokens),
      }),
      updatedAtMs: now,
    }, { merge: true });
    return {
      alive: true,
      firstHeartbeat,
      reconnectAttempted: stages.reconnect_attempt === args.sessionId,
      connectionLatencyMs: Math.max(0, now - num(data.sessionStartedAtMs, now)),
    };
  });
}

/**
 * Отметка heartbeat + usage-аккумулятор в доке квоты. Аккумулируем через max():
 * клиент шлёт накопленные суммы, так что повтор/out-of-order пакет не откатывает
 * и не задваивает счётчики. Чужая/закрытая сессия → false (ничего не воскрешаем).
 */
export async function recordVoiceHeartbeatUsage(db: Firestore, args: VoiceHeartbeatUsageArgs): Promise<boolean> {
  return (await recordVoiceHeartbeatLifecycle(db, args)).alive;
}

export const maxVoiceHeartbeat = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 15,
  memory: '256MiB',
  maxInstances: 20,
}, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'auth_required');
  }
  const data = (request.data ?? {}) as Record<string, unknown>;
  const sessionId = text(data.sessionId, 80);
  if (!sessionId) {
    throw new HttpsError('invalid-argument', 'session_id_required');
  }
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid);
  const lifecycle = await recordVoiceHeartbeatLifecycle(db, {
    authUid,
    stableUid,
    sessionId,
    elapsedSec: nonNegInt(data.elapsedSec),
    usage: sanitizeVoiceUsage(data.usage),
  });
  if (lifecycle.alive && lifecycle.firstHeartbeat) {
    const markerRef = db.collection(VOICE_QUOTA_COLLECTION).doc(voiceQuotaDocId(authUid, stableUid));
    const recordStage = (event: MaxVoiceOpsEventV1) => recordMaxVoiceOpsOnce(db, {
      markerRef,
      markerId: sessionId,
      event,
    }).catch(() => undefined);
    await recordStage({ schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage: 'call_started' });
    await recordStage({
      schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA,
      stage: 'call_connected',
    });
    if (lifecycle.reconnectAttempted) {
      await recordStage({
        schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA,
        stage: 'reconnect_recovered',
        latencyMs: lifecycle.connectionLatencyMs,
      });
    }
  }
  return { ok: true, alive: lifecycle.alive };
});

// ── Session end ─────────────────────────────────────────────────────────────

export const maxVoiceSessionEnd = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 30,
  memory: '256MiB',
  maxInstances: 20,
}, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'auth_required');
  }
  const data = (request.data ?? {}) as Record<string, unknown>;
  const sessionId = text(data.sessionId, 80);
  if (!sessionId) {
    throw new HttpsError('invalid-argument', 'session_id_required');
  }

  const db = admin.firestore();
  const nowMs = Date.now();
  const authUid = request.auth.uid;
  const [stableUid, config] = await Promise.all([
    resolveStableUidForAuth(db, authUid),
    resolveMaxVoiceConfig(db),
  ]);

  // зачем (P1-13, 2026-08-23): раньше здесь шли ТРИ последовательных обращения
  // к одному документу voice_call_quotas — quotaRef.get() ради снимка, затем
  // транзакция settleVoiceSession, затем транзакция accrueVoiceXpDaily. Три
  // раунд-трипа на каждый звонок, и между ними документ мог измениться
  // (watchdog, второй end): XP начислялся уже по другому состоянию, чем то,
  // что прочитал снимок.
  //
  // Теперь всё это — одна транзакция settleVoiceSessionWithXp. Она читает док
  // один раз и отдаёт снимок наружу, поэтому расчёт секунд/usage/XP переехал
  // в чистые функции, которые транзакция зовёт у себя внутри. Формулы, клампы
  // и порядок вычислений сохранены 1:1 — менялась только «упаковка».
  // Ссылка на док квоты нужна и после транзакции — как markerRef для
  // идемпотентных ops-событий (recordMaxVoiceOpsOnce ниже).
  const quotaRef = db.collection(VOICE_QUOTA_COLLECTION).doc(voiceQuotaDocId(authUid, stableUid));

  const clientElapsedSec = nonNegInt(data.elapsedSec);
  const reportedUsage = sanitizeVoiceUsage(data.usage);
  const endReason = asVoiceEndReason(data.endReason);
  const cefr = asVoiceCefr(data.cefr);
  const replies = nonNegInt(data.repliesCount);

  /**
   * Серверные часы разговора из снимка дока. Клиентским секундам в деньгах не
   * верим: факт считается от activatedAtMs (первый heartbeat), иначе от минта.
   */
  const serverElapsedFrom = (quotaData: Record<string, unknown>): number => {
    const startedAtMs = voiceSessionClockStartMs(quotaData);
    // «Не активирована» = ни activatedAtMs, ни единого heartbeat после минта
    // (док, заведённый до этой версии сервера, с heartbeat'ами — активна по-старому).
    const mintedAtMs = num(quotaData.sessionStartedAtMs);
    const activated = num(quotaData.activatedAtMs) > 0
      || num(quotaData.lastHeartbeatMs, mintedAtMs) > mintedAtMs;
    const ownActive = startedAtMs > 0 && text(quotaData.activeSessionId, 80) === sessionId;
    const wallElapsedSec = ownActive ? Math.max(0, Math.ceil((nowMs - startedAtMs) / 1000)) : 0;
    // Сессия без активации («алло» не было: брошенная заготовка минта с
    // пре-экрана, провал SDP) — часы от минта врут; берём min(стена, клиент):
    // release заготовки шлёт 0 и платит 0, старый клиент короткого звонка
    // (первый heartbeat через 30с ещё не дошёл) списывается по своим секундам,
    // но не больше стены.
    return ownActive
      ? (activated ? wallElapsedSec : Math.min(wallElapsedSec, clientElapsedSec))
      : clientElapsedSec;
  };

  /**
   * Usage: max(аккумулятор heartbeat'ов, финальный отчёт) — недоехавший последний
   * пакет не обнуляет расход, а финальный отчёт не может занизить heartbeat'ы.
   */
  const usageFrom = (quotaData: Record<string, unknown>): SanitizedVoiceUsageTotals => {
    const heartbeatUsage = sanitizeVoiceUsage(quotaData.usageTotals);
    return sanitizeVoiceUsage({
      audioInputTokens: Math.max(heartbeatUsage.audioInputTokens, reportedUsage.audioInputTokens),
      audioOutputTokens: Math.max(heartbeatUsage.audioOutputTokens, reportedUsage.audioOutputTokens),
      cachedTokens: Math.max(heartbeatUsage.cachedTokens, reportedUsage.cachedTokens),
      textInputTokens: Math.max(heartbeatUsage.textInputTokens, reportedUsage.textInputTokens),
      textOutputTokens: Math.max(heartbeatUsage.textOutputTokens, reportedUsage.textOutputTokens),
      textTokens: Math.max(heartbeatUsage.textTokens, reportedUsage.textTokens),
    });
  };

  const settle = await settleVoiceSessionWithXp(db, {
    authUid,
    stableUid,
    sessionId,
    // Секунды считаются из того же снимка, что видит сама транзакция.
    actualSec: 0,
    resolveActualSec: serverElapsedFrom,
    endReason,
    nowMs,
    xpDayKey: utcDayKey(nowMs),
    xpDailyCap: config.xpDailyCap,
    // Чистая функция: зовётся ВНУТРИ транзакции, к БД не обращается.
    computeXp: (chargedSec: number, quotaData: Record<string, unknown>) => computeVoiceXp({
      clientSpeechSec: Math.min(nonNegInt(data.clientSpeechSec), chargedSec),
      sessionSec: chargedSec,
      transcriptWordCount: nonNegInt(data.transcriptWordCount),
      replies,
      // max(heartbeat-аккумулятор, финальный отчёт) — серверное подтверждение речи.
      audioInputTokens: usageFrom(quotaData).audioInputTokens,
      cefr,
      xpRatePerSpeechMin: config.xpRatePerSpeechMin,
      xpDailyCap: config.xpDailyCap,
    }),
  });

  // зачем: снимок берём из РЕЗУЛЬТАТА транзакции, а не через побочный эффект
  // колбэка — при alreadySettled (двойной end / гонка с watchdog) транзакция
  // выходит раньше и resolveActualSec не зовётся, а снимок для drift-лога и
  // billing нужен в обоих случаях.
  const quotaData = settle.snapshot;
  const startedAtMs = voiceSessionClockStartMs(quotaData);
  const usage: SanitizedVoiceUsageTotals = usageFrom(quotaData);
  const serverElapsedSec = serverElapsedFrom(quotaData);
  const xpAwarded = settle.xpAwarded;

  if (Math.abs(serverElapsedSec - clientElapsedSec) > 30) {
    // Не фрод сам по себе (сон процесса, kill app) — но сигнал в аналитику.
    console.warn('max_voice_session_end timer drift', {
      sessionId, serverElapsedSec, clientElapsedSec,
    });
  }

  if (settle.alreadySettled) {
    // Двойной end / гонка с watchdog: ничего не списываем и не пишем второй billing.
    return { ok: true, alreadySettled: true, chargedSec: 0, refundedSec: 0, xpAwarded: 0 };
  }

  // Сторно бюджета: неиспользованный хвост резерва возвращается в дневной счётчик.
  await refundVoiceBudgetEstimate(db, (settle.refundedSec / 60) * VOICE_EST_COST_USD_PER_MIN, nowMs)
    .catch(() => {});

  const clientSpeechSec = Math.min(nonNegInt(data.clientSpeechSec), settle.chargedSec);
  if (detectSpeechDrift(nonNegInt(data.clientSpeechSec), usage.audioInputTokens)) {
    // Фрод-лог, не бан: клиентская оценка речи разошлась с серверной >30%.
    console.warn('max_voice_session_end speech fraud suspect', {
      sessionId,
      clientSpeechSec: nonNegInt(data.clientSpeechSec),
      audioInputTokens: usage.audioInputTokens,
    });
  }

  const chain = (quotaData.reconnectChain ?? {}) as Record<string, unknown>;
  const channel = text(data.channel, 20) === 'half_duplex' ? 'half_duplex' : 'realtime';
  const trialVariantRaw = text(data.trialVariant, 20);
  await writeVoiceBillingRow(db, {
    uid: stableUid,
    authUid,
    sessionId,
    // Группа звонка = корень reconnect-чейна: все ре-минты одного разговора
    // склеиваются в одну строку аналитики.
    callGroupId: text(chain.rootId, 80) || sessionId,
    model: config.model,
    seconds: settle.chargedSec,
    usage,
    endReason,
    channel,
    scenarioId: text(data.scenarioId, 80) || null,
    cefr,
    trialVariant: trialVariantRaw === 'companion' || trialVariantRaw === 'scenario' ? trialVariantRaw : null,
    clientSpeechSec,
    xpAwarded,
    sessionStartedAtMs: startedAtMs,
    nowMs,
  });

  const opsEndReason = endReason === 'watchdog' ? 'dropped' : endReason;
  const completedNormally = endReason === 'completed' || endReason === 'capped';
  const { estCostUsd } = estimateVoiceCostUsd(usage, settle.chargedSec);
  const opsEvents: MaxVoiceOpsEventV1[] = [
    {
      schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA,
      stage: completedNormally ? 'call_completed' : 'call_failed',
      durationSec: settle.chargedSec,
      endReason: opsEndReason,
      providerUsage: {
        audioInputTokens: usage.audioInputTokens,
        audioOutputTokens: usage.audioOutputTokens,
        cachedTokens: usage.cachedTokens,
        textTokens: usage.textTokens,
        estimatedCostMicros: Math.max(0, Math.round(estCostUsd * 1_000_000)),
      },
    },
    { schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage: 'quota_settled' },
  ];
  if (completedNormally) opsEvents.push({ schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage: 'explicit_user_end' });
  const firstRemoteAudioLatency = Number(data.firstRemoteAudioLatencyMs);
  if (
    data.firstRemoteAudioLatencyMs !== undefined
    && Number.isFinite(firstRemoteAudioLatency)
    && firstRemoteAudioLatency >= 0
  ) {
    opsEvents.push({
      schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA,
      stage: 'first_remote_audio',
      latencyMs: Math.min(Math.floor(firstRemoteAudioLatency), 600_000),
    });
  }
  if (nonNegInt(data.transcriptWordCount) === 0) opsEvents.push({ schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage: 'empty_transcript' });
  if (usage.audioOutputTokens === 0) opsEvents.push({ schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage: 'no_remote_audio' });
  for (const event of opsEvents) {
    await recordMaxVoiceOpsOnce(db, { markerRef: quotaRef, markerId: sessionId, event, nowMs }).catch(() => undefined);
  }

  return {
    ok: true,
    alreadySettled: false,
    chargedSec: settle.chargedSec,
    refundedSec: settle.refundedSec,
    // XP начисляет КЛИЕНТ через существующий xp_manager-контур (XPSource 'max_voice');
    // сервер отдаёт посчитанное значение и фиксирует его в billing для сверки.
    xpAwarded,
    endReason,
  };
});

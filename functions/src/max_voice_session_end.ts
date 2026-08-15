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
// от серверного sessionStartedAtMs; клиентские цифры — только вниз и в фрод-лог.
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
  settleVoiceSession,
  voiceQuotaDocId,
} from './max_voice_quota';
import { VOICE_EST_COST_USD_PER_MIN, refundVoiceBudgetEstimate, utcDayKey } from './max_voice_mint';

if (!admin.apps.length) admin.initializeApp();

const REGION = 'us-central1';

export const VOICE_BILLING_COLLECTION = 'voice_call_billing';

/**
 * Дата прайс-листа, по которому посчитан estCostUsd, — пишется в каждую
 * billing-запись, чтобы дневная сверка с Usage API знала, чем считали.
 */
export const VOICE_PRICE_TABLE_DATE = '2026-08-13';

/** $/1M токенов gpt-realtime-2.1-mini + $/мин транскрипции входа. */
export const VOICE_PRICES = {
  audioInputPerM: 10,
  audioOutputPerM: 20,
  cachedPerM: 0.3,
  textPerM: 0.6,
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
  textTokens: number;
}

/** Клиент шлёт НАКОПЛЕННЫЕ суммы из response.done — санитизация вниз в int ≥0. */
export function sanitizeVoiceUsage(raw: unknown): VoiceUsageTotals {
  const u = (raw ?? {}) as Record<string, unknown>;
  return {
    audioInputTokens: nonNegInt(u.audioInputTokens),
    audioOutputTokens: nonNegInt(u.audioOutputTokens),
    cachedTokens: nonNegInt(u.cachedTokens),
    textTokens: nonNegInt(u.textTokens),
  };
}

/** Оценка стоимости сессии по прайс-таблице (+ транскрипция как явная строка). */
export function estimateVoiceCostUsd(usage: VoiceUsageTotals, chargedSec: number): {
  estCostUsd: number;
  transcriptionCostUsd: number;
} {
  const transcriptionCostUsd = (Math.max(0, chargedSec) / 60) * VOICE_PRICES.transcriptionPerMin;
  const tokensUsd =
    (usage.audioInputTokens / 1_000_000) * VOICE_PRICES.audioInputPerM +
    (usage.audioOutputTokens / 1_000_000) * VOICE_PRICES.audioOutputPerM +
    (usage.cachedTokens / 1_000_000) * VOICE_PRICES.cachedPerM +
    (usage.textTokens / 1_000_000) * VOICE_PRICES.textPerM;
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

export interface VoiceXpAccrualArgs {
  authUid: string;
  stableUid: string;
  /** «Сырой» XP этой сессии (уже с пер-сессионными клампами computeVoiceXp). */
  xp: number;
  xpDailyCap: number;
  nowMs?: number;
}

/**
 * Честный дневной XP-кэп: аккумулятор xpAwardedToday живёт в доке квоты
 * (reset по UTC-дню) и обновляется транзакционно на сеттлменте. Кэп применяется
 * к НАКОПЛЕННОМУ за день, не к одной сессии — иначе N сессий в день давали бы
 * N×cap. Возвращает фактически начисленный остаток (0, если кэп уже выбран).
 */
export async function accrueVoiceXpDaily(db: Firestore, args: VoiceXpAccrualArgs): Promise<number> {
  const now = args.nowMs ?? Date.now();
  const cap = Math.max(0, Math.floor(args.xpDailyCap));
  const xp = Math.max(0, Math.floor(args.xp));
  const ref = db.collection(VOICE_QUOTA_COLLECTION).doc(voiceQuotaDocId(args.authUid, args.stableUid));
  return db.runTransaction(async (tx) => {
    const data = ((await tx.get(ref)).data() ?? {}) as Record<string, unknown>;
    const dayKey = utcDayKey(now);
    const already = String(data.xpDayKey ?? '') === dayKey ? nonNegInt(data.xpAwardedToday) : 0;
    const granted = Math.max(0, Math.min(xp, cap - already));
    tx.set(ref, {
      xpDayKey: dayKey,
      xpAwardedToday: already + granted,
      updatedAtMs: now,
    }, { merge: true });
    return granted;
  });
}

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
  nowMs: number;
}

/**
 * Единственная точка записи voice_call_billing: её делят maxVoiceSessionEnd и
 * watchdog (settle тихо умершей сессии обязан попасть в биллинг с
 * endReason 'watchdog' — иначе дневная сверка с Usage API систематически
 * недосчитывает потраченные токены).
 */
export async function writeVoiceBillingRow(db: Firestore, row: VoiceBillingRowArgs): Promise<void> {
  const { estCostUsd, transcriptionCostUsd } = estimateVoiceCostUsd(row.usage, row.seconds);
  await db.collection(VOICE_BILLING_COLLECTION).doc().set({
    uid: row.uid,
    authUid: row.authUid,
    sessionId: row.sessionId,
    callGroupId: row.callGroupId,
    model: row.model,
    seconds: row.seconds,
    audioInputTokens: row.usage.audioInputTokens,
    audioOutputTokens: row.usage.audioOutputTokens,
    cachedTokens: row.usage.cachedTokens,
    textTokens: row.usage.textTokens,
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

/**
 * Отметка heartbeat + usage-аккумулятор в доке квоты. Аккумулируем через max():
 * клиент шлёт накопленные суммы, так что повтор/out-of-order пакет не откатывает
 * и не задваивает счётчики. Чужая/закрытая сессия → false (ничего не воскрешаем).
 */
export async function recordVoiceHeartbeatUsage(db: Firestore, args: VoiceHeartbeatUsageArgs): Promise<boolean> {
  const now = args.nowMs ?? Date.now();
  const ref = db.collection(VOICE_QUOTA_COLLECTION).doc(voiceQuotaDocId(args.authUid, args.stableUid));
  return db.runTransaction(async (tx) => {
    const data = ((await tx.get(ref)).data() ?? {}) as Record<string, unknown>;
    if (text(data.activeSessionId, 80) !== text(args.sessionId, 80) || num(data.reservedSec) <= 0) {
      return false;
    }
    const prev = sanitizeVoiceUsage(data.usageTotals);
    tx.set(ref, {
      lastHeartbeatMs: now,
      lastHeartbeatElapsedSec: Math.max(nonNegInt(data.lastHeartbeatElapsedSec), nonNegInt(args.elapsedSec)),
      usageTotals: {
        audioInputTokens: Math.max(prev.audioInputTokens, args.usage.audioInputTokens),
        audioOutputTokens: Math.max(prev.audioOutputTokens, args.usage.audioOutputTokens),
        cachedTokens: Math.max(prev.cachedTokens, args.usage.cachedTokens),
        textTokens: Math.max(prev.textTokens, args.usage.textTokens),
      },
      updatedAtMs: now,
    }, { merge: true });
    return true;
  });
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
  const alive = await recordVoiceHeartbeatUsage(db, {
    authUid,
    stableUid,
    sessionId,
    elapsedSec: nonNegInt(data.elapsedSec),
    usage: sanitizeVoiceUsage(data.usage),
  });
  return { ok: true, alive };
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

  // Снимок квоты ДО сеттлмента: серверный факт секунд и корень reconnect-чейна
  // (callGroupId) живут именно там. После settle они уже стёрты.
  const quotaSnap = await db.collection(VOICE_QUOTA_COLLECTION).doc(voiceQuotaDocId(authUid, stableUid)).get();
  const quotaData = (quotaSnap.data() ?? {}) as Record<string, unknown>;
  const startedAtMs = num(quotaData.sessionStartedAtMs);
  const clientElapsedSec = nonNegInt(data.elapsedSec);
  // Факт — серверные часы (клиент не может ни раздуть XP, ни ужать списание).
  const serverElapsedSec = startedAtMs > 0 && text(quotaData.activeSessionId, 80) === sessionId
    ? Math.max(0, Math.ceil((nowMs - startedAtMs) / 1000))
    : clientElapsedSec;
  if (Math.abs(serverElapsedSec - clientElapsedSec) > 30) {
    // Не фрод сам по себе (сон процесса, kill app) — но сигнал в аналитику.
    console.warn('max_voice_session_end timer drift', {
      sessionId, serverElapsedSec, clientElapsedSec,
    });
  }

  // Usage: max(аккумулятор heartbeat'ов, финальный отчёт) — недоехавший последний
  // пакет не обнуляет расход, а финальный отчёт не может занизить heartbeat'ы.
  const heartbeatUsage = sanitizeVoiceUsage(quotaData.usageTotals);
  const reportedUsage = sanitizeVoiceUsage(data.usage);
  const usage: VoiceUsageTotals = {
    audioInputTokens: Math.max(heartbeatUsage.audioInputTokens, reportedUsage.audioInputTokens),
    audioOutputTokens: Math.max(heartbeatUsage.audioOutputTokens, reportedUsage.audioOutputTokens),
    cachedTokens: Math.max(heartbeatUsage.cachedTokens, reportedUsage.cachedTokens),
    textTokens: Math.max(heartbeatUsage.textTokens, reportedUsage.textTokens),
  };

  const endReason = asVoiceEndReason(data.endReason);
  const settle = await settleVoiceSession(db, {
    authUid,
    stableUid,
    sessionId,
    actualSec: serverElapsedSec,
    endReason,
    nowMs,
  });

  if (settle.alreadySettled) {
    // Двойной end / гонка с watchdog: ничего не списываем и не пишем второй billing.
    return { ok: true, alreadySettled: true, chargedSec: 0, refundedSec: 0, xpAwarded: 0 };
  }

  // Сторно бюджета: неиспользованный хвост резерва возвращается в дневной счётчик.
  await refundVoiceBudgetEstimate(db, (settle.refundedSec / 60) * VOICE_EST_COST_USD_PER_MIN, nowMs)
    .catch(() => {});

  const cefr = asVoiceCefr(data.cefr);
  const clientSpeechSec = Math.min(nonNegInt(data.clientSpeechSec), settle.chargedSec);
  if (detectSpeechDrift(nonNegInt(data.clientSpeechSec), usage.audioInputTokens)) {
    // Фрод-лог, не бан: клиентская оценка речи разошлась с серверной >30%.
    console.warn('max_voice_session_end speech fraud suspect', {
      sessionId,
      clientSpeechSec: nonNegInt(data.clientSpeechSec),
      audioInputTokens: usage.audioInputTokens,
    });
  }

  const replies = nonNegInt(data.repliesCount);
  const sessionXp = computeVoiceXp({
    clientSpeechSec,
    sessionSec: settle.chargedSec,
    transcriptWordCount: nonNegInt(data.transcriptWordCount),
    replies,
    // max(heartbeat-аккумулятор, финальный отчёт) — серверное подтверждение речи.
    audioInputTokens: usage.audioInputTokens,
    cefr,
    xpRatePerSpeechMin: config.xpRatePerSpeechMin,
    xpDailyCap: config.xpDailyCap,
  });
  // Честный дневной кэп: применяется к НАКОПЛЕННОМУ за день (док квоты),
  // а не к каждой сессии в отдельности.
  const xpAwarded = await accrueVoiceXpDaily(db, {
    authUid,
    stableUid,
    xp: sessionXp,
    xpDailyCap: config.xpDailyCap,
    nowMs,
  });

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
    nowMs,
  });

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

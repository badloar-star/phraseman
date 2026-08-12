// ═══════════════════════════════════════════════════════════════════════════
// max_voice_mint.ts — выдача ephemeral-токена OpenAI Realtime для MAX-звонка.
//
// Экономическая граница — серверная (принцип (б) спеки): порядок гейтов жёсткий
// и проверяется тестом №11 — App Check → kill switch → подписка/пробник →
// бюджетная лестница → rate limit → транзакционный резерв секунд → и только
// потом платный минт. Клиент НЕ может изменить session-конфиг: он фиксируется
// здесь целиком (раздел 4 спеки), клиенту уходит только value/expiresAt.
//
// maxVoicePreflight — дешёвая проверка тех же гейтов БЕЗ минта и БЕЗ резервов:
// пре-экран узнаёт «можно ли звонить и сколько осталось», не трогая токены.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { createHash, randomUUID } from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { resolvePremiumAccess } from './premium_status';
import { aiGloballyDisabled } from './remote_gates';
import { resolveMaxVoiceConfig, type MaxVoiceConfig } from './max_voice_config';
import { asVoiceCefr, buildVoiceInstructions } from './max_voice_prompt';
import {
  VOICE_QUOTA_COLLECTION,
  releaseVoiceReservation,
  markVoiceTrialUsed,
  reserveVoiceSeconds,
  transferReserve,
  voiceQuotaDocId,
} from './max_voice_quota';

// Идемпотентный бутстрап: модуль может грузиться и напрямую (targeted deploy),
// и через lib/index.js — паттерн premium_dialog.ts.
if (!admin.apps.length) admin.initializeApp();

// Секрет уже определён в premium_dialog.ts; локальный defineSecret с тем же
// именем допустим (params дедуплицируются по имени) и избавляет от импорта
// чужого приватного бинда.
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

const REGION = 'us-central1';
const OPENAI_CLIENT_SECRETS_URL = 'https://api.openai.com/v1/realtime/client_secrets';

export const VOICE_MINT_RATE_COLLECTION = 'voice_mint_rate_limits';
const MINT_WINDOW_MS = 60 * 60 * 1000;

// ── Бюджетная лестница (раздел 5): глобальный дневной счётчик оценок ────────
export const VOICE_COST_DAILY_COLLECTION = 'voice_cost_daily';
export const VOICE_COST_CURRENT_DOC = 'current';
/**
 * Консервативная оценка $/мин для резервирования бюджета на минте
 * (сторно при сеттлменте). Реальный факт сверяет дневной джоб с Usage API.
 */
export const VOICE_EST_COST_USD_PER_MIN = 0.05;
/** Мягкая ступень лестницы: cap новых сессий при 80–100% бюджета. */
export const VOICE_BUDGET_SOFT_SESSION_CAP_SEC = 300;

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Локальная копия docId-паттерна premium_dialog.ts (там не экспортируется).
function docId(prefix: string, authUid: string, stableUid: string): string {
  const hash = createHash('sha256').update(`${prefix}|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
  return `${prefix}_${hash}`;
}

export function voiceMintRateDocId(authUid: string, stableUid: string): string {
  return docId('vmint', authUid, stableUid);
}

/** Безопасный для платёжки идентификатор ученика в заголовке OpenAI. */
export function voiceSafetyIdentifier(uid: string): string {
  return createHash('sha256').update(uid).digest('hex').slice(0, 16);
}

/**
 * Rate limit СВЕЖИХ минтов: 8/час (конфиг), собственная транзакция по паттерну
 * enforceRateLimit из premium_dialog (коллекция своя — окна не смешиваются).
 * Reconnect-минты сюда НЕ приходят вовсе (см. handler): обрыв связи не должен
 * съедать лимит честного пользователя.
 */
export async function enforceVoiceMintRateLimit(
  db: Firestore,
  authUid: string,
  stableUid: string,
  maxPerHour: number,
  nowMs: number = Date.now(),
): Promise<void> {
  const ref = db.collection(VOICE_MINT_RATE_COLLECTION).doc(voiceMintRateDocId(authUid, stableUid));
  await db.runTransaction(async (tx) => {
    const data = ((await tx.get(ref)).data() ?? {}) as Record<string, unknown>;
    const windowStartMs = num(data.windowStartMs);
    const count = num(data.count);
    const sameWindow = nowMs - windowStartMs < MINT_WINDOW_MS;
    if (sameWindow && count >= maxPerHour) {
      console.warn('max_voice_mint rejected', { reason: 'voice_mint_rate_limited', count, maxPerHour });
      throw new HttpsError('resource-exhausted', 'voice_mint_rate_limited');
    }
    tx.set(ref, {
      authUid,
      stableUid,
      windowStartMs: sameWindow ? windowStartMs : nowMs,
      count: sameWindow ? count + 1 : 1,
      updatedAtMs: nowMs,
    }, { merge: true });
  });
}

/**
 * Декремент неиспользованного минта. Два вызывающих с разной семантикой floor:
 *   - watchdog (истёк без SDP-прогрева): floor 1 — как минимум один учтённый
 *     минт в окне остаётся, иначе цикл «минт → бросил брифинг» давал бы
 *     бесконечные бесплатные минты;
 *   - провал OpenAI при минте: floor 0 — слот возвращается целиком, потому что
 *     это сбой провайдера, а не поведение пользователя (F9).
 */
export async function decrementVoiceMintCount(
  db: Firestore,
  authUid: string,
  stableUid: string,
  nowMs: number = Date.now(),
  floorCount = 1,
): Promise<void> {
  const ref = db.collection(VOICE_MINT_RATE_COLLECTION).doc(voiceMintRateDocId(authUid, stableUid));
  await db.runTransaction(async (tx) => {
    const data = ((await tx.get(ref)).data() ?? {}) as Record<string, unknown>;
    const windowStartMs = num(data.windowStartMs);
    const count = num(data.count);
    if (nowMs - windowStartMs >= MINT_WINDOW_MS || count <= floorCount) return; // окно истекло или уже на floor
    tx.set(ref, { count: count - 1, updatedAtMs: nowMs }, { merge: true });
  });
}

// ── Бюджет ──────────────────────────────────────────────────────────────────

export function utcDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/** Сколько уже зарезервировано/потрачено (оценочно) за текущий UTC-день. */
export async function readVoiceBudgetSpentUsd(db: Firestore, nowMs: number = Date.now()): Promise<number> {
  try {
    const snap = await db.collection(VOICE_COST_DAILY_COLLECTION).doc(VOICE_COST_CURRENT_DOC).get();
    const data = snap.data() ?? {};
    if (String(data.dayKey ?? '') !== utcDayKey(nowMs)) return 0; // новый день — счётчик логически обнулён
    return Math.max(0, num(data.estUsd));
  } catch (e) {
    // Сбой чтения бюджета НЕ должен глушить фичу: считаем «трат нет».
    console.warn('max_voice_mint budget read failed', e);
    return 0;
  }
}

export type VoiceBudgetTier = 'normal' | 'soft' | 'exhausted';

/** Ступень лестницы по доле от дневного бюджета: <80% / 80–100% / ≥100%. */
export function voiceBudgetTier(spentUsd: number, config: MaxVoiceConfig): VoiceBudgetTier {
  const budget = config.globalDailyBudgetUsd;
  if (budget <= 0) return 'normal'; // бюджет не задан — лестница выключена
  if (spentUsd >= budget) return 'exhausted';
  if (spentUsd >= budget * config.budgetSoftPct) return 'soft';
  return 'normal';
}

/** Резерв оценки стоимости сессии в дневном счётчике (сторно — при сеттлменте). */
export async function reserveVoiceBudgetEstimate(db: Firestore, estUsd: number, nowMs: number = Date.now()): Promise<void> {
  if (!(estUsd > 0)) return;
  const ref = db.collection(VOICE_COST_DAILY_COLLECTION).doc(VOICE_COST_CURRENT_DOC);
  await db.runTransaction(async (tx) => {
    const data = ((await tx.get(ref)).data() ?? {}) as Record<string, unknown>;
    const key = utcDayKey(nowMs);
    const sameDay = String(data.dayKey ?? '') === key;
    tx.set(ref, {
      dayKey: key,
      estUsd: (sameDay ? Math.max(0, num(data.estUsd)) : 0) + estUsd,
      updatedAtMs: nowMs,
    }, { merge: true });
  });
}

/** Возврат неиспользованной части оценки (unused refund при settle/release). */
export async function refundVoiceBudgetEstimate(db: Firestore, estUsd: number, nowMs: number = Date.now()): Promise<void> {
  if (!(estUsd > 0)) return;
  const ref = db.collection(VOICE_COST_DAILY_COLLECTION).doc(VOICE_COST_CURRENT_DOC);
  await db.runTransaction(async (tx) => {
    const data = ((await tx.get(ref)).data() ?? {}) as Record<string, unknown>;
    if (String(data.dayKey ?? '') !== utcDayKey(nowMs)) return; // день перещёлкнулся — сторно некуда
    tx.set(ref, {
      estUsd: Math.max(0, num(data.estUsd) - estUsd),
      updatedAtMs: nowMs,
    }, { merge: true });
  });
}

// ── Пробник ─────────────────────────────────────────────────────────────────

export interface VoiceTrialState {
  available: boolean;
  usedAtMs: number;
}

/** Пробник доступен, если не использован либо прошло ≥ trialRefreshDays (ре-триал). */
export function resolveTrialState(
  quotaData: Record<string, unknown> | undefined,
  config: MaxVoiceConfig,
  nowMs: number,
): VoiceTrialState {
  const usedAtMs = Math.max(0, num(quotaData?.trialUsedAtMs));
  const refreshMs = config.trialRefreshDays * 24 * 60 * 60 * 1000;
  return { available: usedAtMs <= 0 || nowMs - usedAtMs >= refreshMs, usedAtMs };
}

export type VoiceTrialVariant = 'companion' | 'scenario';

/**
 * Ветвление пробника: SRS ≥ порога И уровень ≥ A2 → companion (есть о чём
 * говорить), иначе кофейный сценарий с Mia. trialMode из конфига — рычаг A/B.
 */
export function chooseTrialVariant(config: MaxVoiceConfig, srsCount: number, cefr: string): VoiceTrialVariant {
  if (config.trialMode === 'companion') return 'companion';
  if (config.trialMode === 'scenario') return 'scenario';
  const level = asVoiceCefr(cefr);
  return srsCount >= config.trialSrsThreshold && level !== 'A1' ? 'companion' : 'scenario';
}

/** Персона и сцена дефолтного пробника (сценарная ветка): кофейня с Mia. */
export const TRIAL_PERSONA_NAME = 'Mia';
export const TRIAL_PERSONA_ROLE = 'a friendly barista at a cozy coffee shop';
export const TRIAL_SCENARIO_BLOCK = `SCENARIO: COFFEE SHOP
Setting: a cozy neighborhood coffee shop; the learner is a customer calling in an order.
You are Mia, the barista: warm, upbeat, a little playful.
The learner's goal: order a drink, choose a size, and ask the price.
Drive toward the goal in 5-8 exchanges, then bring the scene to a satisfying close.`;

/**
 * Текст wrap-up-инструкции генерится сервером; клиент лишь отправляет его
 * conversation-item'ом за wrapUpLeadSec до deadline (session.update запрещён).
 */
export function buildWrapUpText(): string {
  return '[WRAP_UP] The call time is almost over. Bring the conversation to a natural, warm close ' +
    'within one or two short turns, stay in character, and say a complete goodbye. Do not start new topics.';
}

// ── Общие гейты preflight/mint ──────────────────────────────────────────────

interface VoiceGateContext {
  db: Firestore;
  authUid: string;
  stableUid: string;
  config: MaxVoiceConfig;
  isPremium: boolean;
  quotaData: Record<string, unknown>;
  access: 'max' | 'trial';
  trialVariant: VoiceTrialVariant | null;
  nowMs: number;
}

/**
 * Гейты в порядке теста №11: kill switch (aiGloballyDisabled + gate_ai_voice_call)
 * → подписка (resolvePremiumAccess; MAX v1 = премиум при voiceForPremiumBeta)
 * ИЛИ пробник. Бросает HttpsError на первом же закрытом гейте.
 */
async function resolveVoiceGates(
  authUid: string,
  data: Record<string, unknown>,
  nowMs: number,
): Promise<VoiceGateContext> {
  const db = admin.firestore();

  // Kill switch №1: глобальный рубильник всего ИИ.
  if (await aiGloballyDisabled(db)) {
    throw new HttpsError('failed-precondition', 'ai_globally_disabled');
  }
  // Kill switch №2: собственный гейт голосовых звонков (дефолт ВЫКЛ до запуска).
  const config = await resolveMaxVoiceConfig(db);
  if (!config.gate_ai_voice_call) {
    console.warn('max_voice_mint rejected', { reason: 'voice_disabled' });
    throw new HttpsError('failed-precondition', 'voice_disabled');
  }

  const stableUid = await resolveStableUidForAuth(db, authUid);
  // Подписку резолвит сервер — телу запроса не верим (паттерн premium_dialog).
  const isPremium = await resolvePremiumAccess(db, stableUid, Date.now(), authUid);

  const quotaSnap = await db.collection(VOICE_QUOTA_COLLECTION).doc(voiceQuotaDocId(authUid, stableUid)).get();
  const quotaData = (quotaSnap.data() ?? {}) as Record<string, unknown>;

  const hasMax = isPremium && config.voiceForPremiumBeta;
  if (hasMax) {
    return { db, authUid, stableUid, config, isPremium, quotaData, access: 'max', trialVariant: null, nowMs };
  }

  const trial = resolveTrialState(quotaData, config, nowMs);
  // Реконнект НЕ гейтится триалом: первый минт уже проштамповал trialUsedAtMs,
  // и повторная проверка убивала бы живой пробный звонок при обрыве сети.
  // Легитимность реконнекта дальше проверит transferReserve (владелец + живая
  // сессия); фальшивый reconnectOf упрётся в voice_session_mismatch ДО минта.
  const isReconnect = text(data.reconnectOf, 80).length > 0;
  if (!trial.available && !isReconnect) {
    console.warn('max_voice_mint rejected', { reason: 'voice_max_required', isPremium });
    throw new HttpsError('permission-denied', 'voice_max_required');
  }
  // srsCount шлёт клиент из своего SRS-стора. Полю НЕ доверяем в деньгах — оно
  // влияет только на выбор варианта пробника (companion vs scenario), поэтому
  // враньё здесь ничего не стоит серверу; всё равно клампим в разумный коридор.
  const srsCount = Math.max(0, Math.min(10_000, Math.floor(num(data.srsCount))));
  const trialVariant = chooseTrialVariant(config, srsCount, text(data.cefr, 2));
  return { db, authUid, stableUid, config, isPremium, quotaData, access: 'trial', trialVariant, nowMs };
}

/** Read-only остаток дня/месяца (для preflight; резерв всё равно транзакционный). */
export function estimateQuotaRemaining(
  quotaData: Record<string, unknown>,
  config: MaxVoiceConfig,
  nowMs: number,
): { dayRemainingSec: number; monthRemainingSec: number } {
  const dailyUsed = nowMs >= num(quotaData.resetAtMs) ? 0 : Math.max(0, num(quotaData.dailyUsedSec));
  const monthlyUsed = nowMs >= num(quotaData.monthResetAtMs) ? 0 : Math.max(0, num(quotaData.monthlyUsedSec));
  return {
    dayRemainingSec: Math.max(0, config.dailyVoiceSecMax - dailyUsed),
    monthRemainingSec: Math.max(0, config.monthlyVoiceSecMax - monthlyUsed),
  };
}

function formatOf(data: Record<string, unknown>, access: 'max' | 'trial', trialVariant: VoiceTrialVariant | null): 'scenario' | 'companion' | 'trial' {
  if (access === 'trial') return 'trial';
  return text(data.format, 20) === 'companion' ? 'companion' : 'scenario';
}

function sessionCapFor(config: MaxVoiceConfig, format: 'scenario' | 'companion' | 'trial'): number {
  return config.sessionCapSec[format];
}

/**
 * limits ответа минта — по контракту стыка с клиентом:
 * sessionCapSec — число говоримых секунд ИМЕННО этой сессии (не карта форматов),
 * hintDelaySec — число для CEFR этой сессии (не карта уровней),
 * dailyVoiceSecMax — дневной потолок, чтобы клиент рисовал «топливо» честно.
 */
function clientLimits(
  config: MaxVoiceConfig,
  args: { reservedSec: number; maxSeconds: number; cefr: 'A1' | 'A2' | 'B1' | 'B2'; day: number; month: number },
) {
  return {
    reservedSec: args.reservedSec,
    dayRemainingSec: args.day,
    monthRemainingSec: args.month,
    sessionCapSec: args.maxSeconds,
    dailyVoiceSecMax: config.dailyVoiceSecMax,
    wrapUpLeadSec: config.wrapUpLeadSec,
    graceTailSec: config.graceTailSec,
    heartbeatSec: config.heartbeatSec,
    idleTimeoutMs: config.idleTimeoutMs,
    hintDelaySec: config.hintDelaySec[args.cefr],
    hintMaxPerSession: config.hintMaxPerSession,
    reconnectChainMax: config.reconnectChainMax,
    reconnectFreeGapSecTotal: config.reconnectFreeGapSecTotal,
  };
}

// ── maxVoicePreflight ───────────────────────────────────────────────────────

export const maxVoicePreflight = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 15,
  memory: '256MiB',
  maxInstances: 20,
}, async (request) => {
  // Прогрев инстанса — самым первым делом, до auth и Firestore (паттерн premiumDialogSend).
  if ((request.data as { warmupPing?: unknown } | null)?.warmupPing === true) {
    return { ok: true, allowed: false, warmup: true };
  }
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'auth_required');
  }

  const nowMs = Date.now();
  const ctx = await resolveVoiceGates(request.auth.uid, (request.data ?? {}) as Record<string, unknown>, nowMs);
  const { dayRemainingSec, monthRemainingSec } = estimateQuotaRemaining(ctx.quotaData, ctx.config, nowMs);
  if (Math.min(dayRemainingSec, monthRemainingSec) < 60) {
    console.warn('max_voice_preflight rejected', { reason: 'voice_quota_exhausted', dayRemainingSec, monthRemainingSec });
    throw new HttpsError('resource-exhausted', 'voice_quota_exhausted');
  }

  return {
    ok: true,
    allowed: true,
    access: ctx.access,
    trialVariant: ctx.trialVariant,
    degradeMode: ctx.config.degradeMode,
    limits: {
      dayRemainingSec,
      monthRemainingSec,
      sessionCapSec: ctx.config.sessionCapSec,
      dailyVoiceSecMax: ctx.config.dailyVoiceSecMax,
      wrapUpLeadSec: ctx.config.wrapUpLeadSec,
      graceTailSec: ctx.config.graceTailSec,
      heartbeatSec: ctx.config.heartbeatSec,
      idleTimeoutMs: ctx.config.idleTimeoutMs,
      hintDelaySec: ctx.config.hintDelaySec,
      hintMaxPerSession: ctx.config.hintMaxPerSession,
    },
  };
});

// ── maxVoiceMint ────────────────────────────────────────────────────────────

interface MintedSecret {
  value: string;
  expiresAt: number;
}

/** POST /v1/realtime/client_secrets с полным session-конфигом раздела 4 спеки. */
async function mintClientSecret(args: {
  apiKey: string;
  stableUid: string;
  config: MaxVoiceConfig;
  cefr: 'A1' | 'A2' | 'B1' | 'B2';
  instructions: string;
}): Promise<MintedSecret> {
  const { config } = args;
  const response = await fetch(OPENAI_CLIENT_SECRETS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Safety-Identifier': voiceSafetyIdentifier(args.stableUid),
    },
    body: JSON.stringify({
      // Токен короткоживущий: клиент обязан начать SDP сразу после минта.
      expires_after: { anchor: 'created_at', seconds: 60 },
      session: {
        type: 'realtime',
        model: config.model,
        instructions: args.instructions,
        audio: {
          input: {
            // Транскрипция входа ВСЕГДА включена — обучающий цикл несокращаем.
            transcription: { model: config.transcriptionModel },
            turn_detection: {
              type: 'semantic_vad',
              eagerness: config.vadEagerness[args.cefr],
              create_response: true,
              interrupt_response: true,
            },
          },
          output: { voice: config.voice },
        },
        // В GA Realtime API (session type 'realtime', client_secrets) кап токенов
        // называется max_output_tokens; max_response_output_tokens — имя из
        // deprecated-беты. Проверено по официальному SDK openai-node
        // (RealtimeSessionCreateRequest.max_output_tokens).
        max_output_tokens: config.maxResponseOutputTokens[args.cefr],
        truncation: { type: 'retention_ratio', retention_ratio: config.truncationRetentionRatio },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('max_voice_mint provider failed', { status: response.status, detail: detail.slice(0, 500) });
    throw new HttpsError('unavailable', 'voice_provider_failed');
  }
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const value = text(json.value, 400);
  if (!value) {
    console.error('max_voice_mint provider returned no client secret');
    throw new HttpsError('unavailable', 'voice_provider_failed');
  }
  return { value, expiresAt: num(json.expires_at) };
}

export const maxVoiceMint = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 30,
  memory: '256MiB',
  maxInstances: 20,
  secrets: [OPENAI_API_KEY],
}, async (request) => {
  if ((request.data as { warmupPing?: unknown } | null)?.warmupPing === true) {
    return { ok: true, warmup: true };
  }
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'auth_required');
  }

  const nowMs = Date.now();
  const data = (request.data ?? {}) as Record<string, unknown>;
  // Порядок гейтов (тест №11): App Check (опция onCall) → kill switch →
  // подписка/пробник → бюджет → rate limit → резерв → минт.
  const ctx = await resolveVoiceGates(request.auth.uid, data, nowMs);
  const { db, authUid, stableUid, config } = ctx;

  const apiKey = text(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
  if (!apiKey) {
    console.error('max_voice_mint rejected', { reason: 'openai_key_missing' });
    throw new HttpsError('failed-precondition', 'openai_key_missing');
  }

  // reconnectOf читается ДО лестницы: реконнект — продолжение УЖЕ оплаченной
  // живой сессии, а лестница гейтит только НОВЫЕ сессии («живые сессии не рвём
  // никогда», раздел 5 спеки). Легитимность реконнекта проверит transferReserve.
  const reconnectOf = text(data.reconnectOf, 80);

  // Бюджетная лестница ДО расходования rate-слота и резервов — только для свежих минтов.
  const spentUsd = await readVoiceBudgetSpentUsd(db, nowMs);
  const tier = voiceBudgetTier(spentUsd, config);
  if (tier === 'exhausted' && !reconnectOf) {
    // ≥100%: новые realtime-сессии не стартуем — клиент уходит в half-duplex-фолбэк.
    console.warn('max_voice_mint rejected', { reason: 'voice_budget_exhausted', spentUsd });
    throw new HttpsError('resource-exhausted', 'voice_budget_exhausted');
  }
  if (tier === 'soft' && ctx.access === 'trial' && !reconnectOf) {
    // 80–100%: пробники — первое, что режется лестницей (но не живые пробные звонки).
    console.warn('max_voice_mint rejected', { reason: 'voice_trial_paused', spentUsd });
    throw new HttpsError('resource-exhausted', 'voice_trial_paused');
  }

  const cefr = asVoiceCefr(data.cefr);
  const format = formatOf(data, ctx.access, ctx.trialVariant);

  let reservedSec: number;
  let dayRemainingSec: number;
  let monthRemainingSec: number;
  let sessionId: string;

  if (reconnectOf) {
    // Reconnect-минт: ВНЕ rate limit; prevSessionId валидируется транзакцией
    // (владелец + активность), остаток переносится атомарно.
    sessionId = `vs_${randomUUID()}`;
    const transfer = await transferReserve(db, {
      authUid,
      stableUid,
      prevSessionId: reconnectOf,
      newSessionId: sessionId,
      heartbeatElapsedSec: Math.max(0, num(data.heartbeatElapsedSec)),
      freeGapCapSec: config.reconnectFreeGapSecTotal,
      maxChainCount: config.reconnectChainMax.auto + config.reconnectChainMax.manual,
      heartbeatSec: config.heartbeatSec,
      nowMs,
    });
    reservedSec = transfer.reservedSec;
    const remaining = estimateQuotaRemaining(ctx.quotaData, config, nowMs);
    dayRemainingSec = remaining.dayRemainingSec;
    monthRemainingSec = remaining.monthRemainingSec;
  } else {
    // Свежий минт: rate limit → транзакционный резерв (min(cap+хвост, день, месяц)).
    await enforceVoiceMintRateLimit(db, authUid, stableUid, config.mintPerHourMax, nowMs);
    let capSec = sessionCapFor(config, format);
    if (tier === 'soft') capSec = Math.min(capSec, VOICE_BUDGET_SOFT_SESSION_CAP_SEC);
    sessionId = `vs_${randomUUID()}`;
    const reserve = await reserveVoiceSeconds(db, {
      authUid,
      stableUid,
      sessionId,
      formatCapSec: capSec,
      graceTailSec: config.graceTailSec,
      dailyVoiceSecMax: config.dailyVoiceSecMax,
      monthlyVoiceSecMax: config.monthlyVoiceSecMax,
      nowMs,
    });
    reservedSec = reserve.reservedSec;
    dayRemainingSec = reserve.dayRemainingSec;
    monthRemainingSec = reserve.monthRemainingSec;
    if (reserve.staleRefundedSec > 0) {
      // Резерв дозакрыл предыдущую протухшую сессию и вернул её хвост в
      // день/месяц — сторнируем ту же долю в дневном бюджетном счётчике,
      // иначе брошенные сессии навсегда (в пределах дня) надувают лестницу.
      await refundVoiceBudgetEstimate(db, (reserve.staleRefundedSec / 60) * VOICE_EST_COST_USD_PER_MIN, nowMs)
        .catch(() => {});
    }
  }

  // Оценка стоимости — в дневной счётчик бюджета (сторно вернёт сеттлмент).
  // Reconnect бюджет НЕ двигает: перенесённые секунды уже забюджетированы
  // исходным минтом, повторный резерв задваивал бы дневной estUsd.
  const estUsd = reconnectOf ? 0 : (reservedSec / 60) * VOICE_EST_COST_USD_PER_MIN;
  await reserveVoiceBudgetEstimate(db, estUsd, nowMs).catch((e) => {
    console.warn('max_voice_mint budget reserve failed', e); // счётчик не должен блокировать звонок
  });

  // Пробник-сценарий использует встроенную кофейню с Mia; остальное — контент
  // клиента (сервер не знает сценарии, как и premium_dialog), санитайзится в prompt.
  const usesTrialScenario = ctx.access === 'trial' && ctx.trialVariant === 'scenario';
  const instructions = buildVoiceInstructions({
    cefr,
    format: ctx.access === 'trial' ? (ctx.trialVariant === 'companion' ? 'companion' : 'trial') : format === 'trial' ? 'scenario' : format,
    personaName: usesTrialScenario ? TRIAL_PERSONA_NAME : text(data.personaName, 60),
    personaRole: usesTrialScenario ? TRIAL_PERSONA_ROLE : text(data.personaRole, 160),
    scenarioBlock: usesTrialScenario ? TRIAL_SCENARIO_BLOCK : text(data.scenarioBlock, 4000),
    memoryBlock: text(data.memoryBlock, 1200),
    reconnectSummary: reconnectOf ? text(data.reconnectSummary, 1500) : '',
  });

  let minted: MintedSecret;
  try {
    minted = await mintClientSecret({ apiKey, stableUid, config, cefr, instructions });
  } catch (error) {
    // Токена нет — резерв, оценка бюджета и rate-слот возвращаются.
    // Сторно бюджета — по ФАКТИЧЕСКИ освобождённым секундам (released.refundedSec),
    // а не по estUsd: для свежего минта это одно и то же, а для reconnect-провала
    // estUsd=0, но перенесённый остаток был забюджетирован ИСХОДНЫМ минтом и без
    // сторно повис бы навсегда (сессия закрыта, settle не наступит).
    const released = await releaseVoiceReservation(db, {
      authUid, stableUid, sessionId, reason: 'mint_failed', nowMs: Date.now(),
    }).catch((e) => {
      console.error('max_voice_mint release after provider failure failed', e);
      return null;
    });
    const refundedSec = released && !released.alreadySettled ? released.refundedSec : 0;
    await refundVoiceBudgetEstimate(db, (refundedSec / 60) * VOICE_EST_COST_USD_PER_MIN, Date.now())
      .catch(() => {});
    if (!reconnectOf) {
      // Сбой провайдера — не поведение пользователя: слот rate limit
      // возвращается целиком (floor 0). Reconnect слота не занимал.
      await decrementVoiceMintCount(db, authUid, stableUid, Date.now(), 0).catch(() => {});
    }
    if (error instanceof HttpsError) throw error;
    console.error('max_voice_mint provider exception', String((error as Error)?.message ?? error).slice(0, 500));
    throw new HttpsError('unavailable', 'voice_provider_failed');
  }

  if (ctx.access === 'trial' && !reconnectOf) {
    await markVoiceTrialUsed(db, { authUid, stableUid, nowMs }).catch(() => {});
  }

  // Говоримое время: резерв минус хвост teardown'а. Клиент строит deadline от него.
  const maxSeconds = Math.max(0, reservedSec - config.graceTailSec);
  return {
    ok: true,
    value: minted.value,
    // Ключи в ОБОИХ написаниях (контракт стыка): camelCase — исторический ответ
    // сервера, snake_case — то, что парсит клиентский parseMintResponse; дубли
    // защищают от version skew деплоя functions vs app.
    expiresAt: minted.expiresAt,
    expires_at: minted.expiresAt,
    sessionId,
    session_id: sessionId,
    maxSeconds,
    max_seconds: maxSeconds,
    wrapUpText: buildWrapUpText(),
    limits: clientLimits(config, {
      reservedSec,
      maxSeconds,
      cefr,
      day: dayRemainingSec,
      month: monthRemainingSec,
    }),
    trialVariant: ctx.trialVariant,
  };
});

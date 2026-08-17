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
import {
  TUTOR_GREETING_INSTRUCTIONS,
  TUTOR_TOOLS,
  asVoiceCefr,
  buildVoiceInstructions,
  learnerLangNameFor,
} from './max_voice_prompt';
import { loadTutorAppDigest, readTutorMemory, renderTutorMemoryBlock } from './max_voice_tutor_memory';
import { resolveStudyTarget, studyTargetName } from './ai_language_contract';
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
const OPENAI_MINT_TIMEOUT_MS = 12_000;
const OPENAI_MINT_ATTEMPTS = 2;
/** TTL ephemeral client secret (только для SDP-обмена); клиентский premint читает expires_at. */
export const CLIENT_SECRET_TTL_SEC = 120;

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
  isAdmin: boolean,
): Promise<VoiceGateContext> {
  const db = admin.firestore();

  // зачем: владелец 2026-08-16 — соединение должно быть мгновенным. Три чтения
  // не зависят друг от друга, поэтому идут ПАРАЛЛЕЛЬНО (−2 сетевых круга на
  // минте); ПОРЯДОК проверки гейтов при этом прежний (тест №11): рубильник ИИ →
  // гейт звонков → подписка/квота.
  const [globallyDisabled, config, stableUid] = await Promise.all([
    aiGloballyDisabled(db),
    resolveMaxVoiceConfig(db),
    resolveStableUidForAuth(db, authUid),
  ]);

  // Kill switch №1: глобальный рубильник всего ИИ.
  if (globallyDisabled) {
    throw new HttpsError('failed-precondition', 'ai_globally_disabled');
  }
  // Kill switch №2: собственный гейт голосовых звонков.
  // зачем: владелец 2026-08-16 — «звонок должен работать всегда без исключений,
  // единственным гейтом будет пейвол». До релиза линия открыта всем: снят и
  // прежний DEV-аллоулист (админ-claim + devTestUids), и «выключено по умолчанию».
  // Остаётся только рубильник всего ИИ выше — он общий на весь проект.
  // Тумблер gate_ai_voice_call остаётся рабочим выключателем в админке, но его
  // ДЕФОЛТ теперь true (max_voice_config.ts): «выключено» бывает только когда
  // владелец сам снял галочку, а не потому что фича ещё не запущена.
  if (!config.gate_ai_voice_call) {
    console.warn('max_voice_mint rejected', { reason: 'voice_disabled' });
    throw new HttpsError('failed-precondition', 'voice_disabled');
  }

  // Подписку резолвит сервер — телу запроса не верим (паттерн premium_dialog).
  // Подписка и док квоты — независимые чтения, тоже параллельно.
  const [isPremium, quotaSnap] = await Promise.all([
    resolvePremiumAccess(db, stableUid, Date.now(), authUid),
    db.collection(VOICE_QUOTA_COLLECTION).doc(voiceQuotaDocId(authUid, stableUid)).get(),
  ]);
  const quotaData = (quotaSnap.data() ?? {}) as Record<string, unknown>;

  // зачем: владелец 2026-08-16 — до релиза подписка звонок НЕ гейтит («единственный
  // гейт будет пейвол, лимиты введу сам при релизе»). Поэтому доступ 'max' выдаётся
  // всем, а исчерпанный пробник (voice_max_required) больше не закрывает линию.
  // voiceForPremiumBeta оставлен в конфиге: он вернёт разделение одним переключением,
  // когда владелец будет ставить пейвол перед релизом.
  return { db, authUid, stableUid, config, isPremium, quotaData, access: 'max', trialVariant: null, nowMs };
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

type VoiceMintFormat = 'scenario' | 'companion' | 'trial' | 'tutor';

function formatOf(data: Record<string, unknown>, access: 'max' | 'trial', trialVariant: VoiceTrialVariant | null): VoiceMintFormat {
  if (access === 'trial') return 'trial';
  const raw = text(data.format, 20);
  // зачем: 'tutor' — урок-звонок с учителем (вариант A, владелец 2026-08-16).
  if (raw === 'companion' || raw === 'tutor') return raw;
  return 'scenario';
}

function sessionCapFor(config: MaxVoiceConfig, format: VoiceMintFormat): number {
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
  const ctx = await resolveVoiceGates(
    request.auth.uid,
    (request.data ?? {}) as Record<string, unknown>,
    nowMs,
    request.auth.token?.admin === true,
  );
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
  profile: ProviderMintProfile;
}

type ProviderMintProfile = 'full' | 'compatibility';

interface ClientSecretArgs {
  config: MaxVoiceConfig;
  cefr: 'A1' | 'A2' | 'B1' | 'B2';
  instructions: string;
  /** Учитель: свой голос и инструменты (start_scene / assign_homework / end_call…). */
  tutor?: boolean;
}

function clientSecretBody(args: ClientSecretArgs, profile: ProviderMintProfile): string {
  const voice = args.tutor ? args.config.tutorVoice : args.config.voice;
  const core = {
    type: 'realtime',
    model: args.config.model,
    instructions: args.instructions,
    audio: { output: { voice } },
  };

  // Последний аварийный профиль буквально повторяет минимальную конфигурацию
  // из официального WebRTC quickstart. Если OpenAI изменит валидацию одного из
  // необязательных advanced-полей, звонок всё равно поднимется на default VAD.
  const session = profile === 'compatibility' ? core : {
    ...core,
    audio: {
      input: {
        // Транскрипция входа включена в основном профиле — обучающий цикл.
        transcription: { model: args.config.transcriptionModel },
        // зачем: владелец 2026-08-16 — ИИ обрывала себя и говорила заново много
        // раз подряд. Клиент играет через громкую связь (setForceSpeakerphoneOn),
        // и остаток эха/шум комнаты доходил до VAD как «речь ученика» →
        // interrupt_response рвал ответ. far_field — фильтр для громкой связи,
        // он чистит буфер ДО VAD и модели (меньше ложных срабатываний).
        noise_reduction: { type: 'far_field' },
        turn_detection: {
          type: 'semantic_vad',
          eagerness: args.config.vadEagerness[args.cefr],
          create_response: true,
          interrupt_response: true,
          // idle_timeout_ms здесь намеренно НЕТ: OpenAI принимает его только
          // для server_vad, а semantic_vad с этим полем отклоняет весь mint.
        },
      },
      output: { voice },
    },
    max_output_tokens: args.config.maxResponseOutputTokens[args.cefr],
    truncation: {
      type: 'retention_ratio',
      retention_ratio: args.config.truncationRetentionRatio,
    },
    // Инструменты учителя — только в полном профиле: совместимый профиль
    // (аварийный) поднимает звонок без них, урок всё равно завершит клиент по дедлайну.
    ...(args.tutor ? { tools: TUTOR_TOOLS, tool_choice: 'auto' } : {}),
  };

  return JSON.stringify({
    // Токен короткоживущий: он годен только для SDP-обмена. 120с (а не 60):
    // зачем — владелец 2026-08-16 хочет мгновенное соединение, поэтому клиент
    // минтит заранее на пре-экране (max_call_premint) и тратит токен на тапе
    // «Позвонить»; окно должно переживать паузу человека перед тапом.
    expires_after: { anchor: 'created_at', seconds: CLIENT_SECRET_TTL_SEC },
    session,
  });
}

/** POST /v1/realtime/client_secrets с полным session-конфигом раздела 4 спеки. */
async function mintClientSecret(args: ClientSecretArgs & {
  apiKey: string;
  stableUid: string;
}): Promise<MintedSecret> {
  const profiles: ProviderMintProfile[] = ['full', 'compatibility'];

  for (const profile of profiles) {
    const body = clientSecretBody(args, profile);
    for (let attempt = 1; attempt <= OPENAI_MINT_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OPENAI_MINT_TIMEOUT_MS);
      try {
        const response = await fetch(OPENAI_CLIENT_SECRETS_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${args.apiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Safety-Identifier': voiceSafetyIdentifier(args.stableUid),
          },
          body,
          signal: controller.signal,
        });
        if (!response.ok) {
          const detail = await response.text().catch(() => '');
          // 400 на полном профиле обычно означает дрейф схемы необязательного
          // поля. Один раз повторяем официальным минимальным профилем. 401/403,
          // quota/rate и safety-отказы этим путём никогда не обходятся.
          if (response.status === 400 && profile === 'full') {
            console.warn('max_voice_mint full profile rejected; retrying compatibility profile', {
              status: response.status,
              detail: detail.slice(0, 500),
            });
            break;
          }
          const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
          if (retryable && attempt < OPENAI_MINT_ATTEMPTS) {
            console.warn('max_voice_mint provider transient failure; retrying', {
              status: response.status,
              attempt,
              profile,
            });
            continue;
          }
          console.error('max_voice_mint provider failed', {
            status: response.status,
            detail: detail.slice(0, 500),
            profile,
          });
          throw new HttpsError('unavailable', 'voice_provider_failed');
        }
        const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const value = text(json.value, 400);
        if (!value) {
          console.error('max_voice_mint provider returned no client secret', { profile });
          throw new HttpsError('unavailable', 'voice_provider_failed');
        }
        if (profile === 'compatibility') {
          console.warn('max_voice_mint recovered with compatibility profile');
        }
        return { value, expiresAt: num(json.expires_at), profile };
      } catch (error) {
        if (error instanceof HttpsError) throw error;
        if (attempt >= OPENAI_MINT_ATTEMPTS) {
          console.error('max_voice_mint provider request failed', {
            attempt,
            profile,
            error: String((error as Error)?.message ?? error).slice(0, 300),
          });
          throw new HttpsError('unavailable', 'voice_provider_failed');
        }
        console.warn('max_voice_mint provider request failed; retrying', { attempt, profile });
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }
  throw new HttpsError('unavailable', 'voice_provider_failed');
}

export interface MaxVoiceProviderProbeResult {
  profile: ProviderMintProfile;
  expiresAt: number;
}

/**
 * Control-plane probe: создаёт и сразу забывает client secret,
 * не открывая Realtime call и не запуская inference. Проверяет живыми данными
 * API key, доступ к модели, voice ID и текущую схему полного session payload.
 */
export async function runMaxVoiceProviderProbe(
  apiKey: string,
  config: MaxVoiceConfig,
): Promise<MaxVoiceProviderProbeResult> {
  const minted = await mintClientSecret({
    apiKey,
    stableUid: 'max-voice-provider-health',
    config,
    cefr: 'A1',
    instructions: 'Wait silently for the learner to speak, then answer briefly in English.',
  });
  return { profile: minted.profile, expiresAt: minted.expiresAt };
}

export const maxVoiceMint = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 30,
  memory: '256MiB',
  // Голосовой вход не может ждать cold start: один экземпляр всегда тёплый.
  minInstances: 1,
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
  // Чтение дневного бюджета не зависит от гейтов и никогда не бросает —
  // стартуем параллельно с ними (латентность минта), а ПРОВЕРЯЕМ после,
  // чтобы порядок отказов остался прежним.
  const budgetSpentPromise = readVoiceBudgetSpentUsd(admin.firestore(), nowMs);
  // Порядок гейтов (тест №11): App Check (опция onCall) → kill switch →
  // подписка/пробник → бюджет → rate limit → резерв → минт.
  const ctx = await resolveVoiceGates(request.auth.uid, data, nowMs, request.auth.token?.admin === true);
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
  const spentUsd = await budgetSpentPromise;
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
  const isTutor = ctx.access !== 'trial' && format === 'tutor';
  // Учитель: память ученика (сервер) и выжимка устава — параллельно, оба
  // никогда не бросают. Память — 1 чтение на минт, устав — кэш 1ч на инстанс.
  const [tutorMemory, appDigest] = isTutor
    ? await Promise.all([readTutorMemory(db, authUid, stableUid), loadTutorAppDigest(db, nowMs)])
    : [null, ''];
  const instructions = buildVoiceInstructions({
    cefr,
    format: ctx.access === 'trial' ? (ctx.trialVariant === 'companion' ? 'companion' : 'trial') : format === 'trial' ? 'scenario' : format,
    personaName: isTutor ? config.tutorName : usesTrialScenario ? TRIAL_PERSONA_NAME : text(data.personaName, 60),
    personaRole: usesTrialScenario ? TRIAL_PERSONA_ROLE : text(data.personaRole, 160),
    scenarioBlock: usesTrialScenario ? TRIAL_SCENARIO_BLOCK : text(data.scenarioBlock, 4000),
    memoryBlock: text(data.memoryBlock, 1200),
    reconnectSummary: reconnectOf ? text(data.reconnectSummary, 1500) : '',
    ...(isTutor
      ? {
          learnerLangName: learnerLangNameFor(text(data.interfaceLang, 8)),
          targetLangName: studyTargetName(resolveStudyTarget(data.studyTarget)),
          appDigest,
          sceneCatalog: text(data.sceneCatalog, 2000),
          learnerSnapshot: text(data.learnerSnapshot, 1200),
          tutorMemoryBlock: tutorMemory ? renderTutorMemoryBlock(tutorMemory, nowMs) : '',
        }
      : {}),
  });

  let minted: MintedSecret;
  try {
    minted = await mintClientSecret({ apiKey, stableUid, config, cefr, instructions, tutor: isTutor });
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
    // Учитель: имя (шапка экрана звонка) и инструкция первого ответа — клиент
    // шлёт её в response.create вместо ролевого приветствия.
    ...(isTutor
      ? {
          tutor: {
            name: config.tutorName,
            greetingInstructions: TUTOR_GREETING_INSTRUCTIONS,
            lessonsSoFar: tutorMemory?.callCount ?? 0,
            homework: tutorMemory?.homework ?? [],
            nextTopic: tutorMemory?.nextTopic ?? '',
          },
        }
      : {}),
  };
});

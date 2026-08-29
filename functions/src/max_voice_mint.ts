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
import { resolveIsLifetimePlan, resolvePremiumAccess } from './premium_status';
import { aiGloballyDisabled } from './remote_gates';
import { resolveMaxVoiceConfig, type MaxVoiceConfig } from './max_voice_config';
import {
  tutorGreetingInstructionsFor,
  TUTOR_TOOLS,
  asVoiceCefr,
  buildVoiceInstructions,
  learnerLangNameFor,
} from './max_voice_prompt';
import {
  duePhrases,
  loadTutorAppDigest,
  readTutorMemory,
  renderTutorMemoryBlock,
  selectTutorLessonType,
  TUTOR_MEMORY_EMPTY,
  tutorLessonTypeFor,
} from './max_voice_tutor_memory';
import {
  canDoProgress,
  levelFromMastery,
  pickNextGoal,
  planUpcomingLessons,
  renderCanDoGoalBlock,
} from './max_voice_can_do_goals';
import { buildTutorPreview } from './max_voice_tutor_preview';
import { maxVoiceStudyTarget, maxVoiceTargetLanguageName } from './max_voice_target_language';
import {
  LEGACY_VOICE_QUOTA_EXHAUSTED_REASON,
  VOICE_QUOTA_COLLECTION,
  confirmVoiceTrialMinted,
  ensureCanonicalVoiceQuota,
  releaseVoiceReservation,
  reserveVoiceSeconds,
  transferReserve,
  voiceQuotaExhaustedReason,
  voiceQuotaDocId,
} from './max_voice_quota';
import {
  MAX_VOICE_OPS_EVENT_SCHEMA,
  type MaxVoiceMintRejectionReason,
  maxVoiceOpsLevel,
  maxVoiceOpsLocale,
  recordMaxVoiceOpsOnce,
} from './max_voice_ops';
import { readVoiceMinuteWallet, type VoiceMinuteAccessType } from './voice_minutes';

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
//
// ГОРЯЧИЙ ДОКУМЕНТ — осознанное решение, не недосмотр (P1-15, разобрано 2026-08-23).
//
// voice_cost_daily/current — единственный документ, в который пишет КАЖДЫЙ звонок:
// резерв оценки на минте + сторно на сеттлменте (и ещё одно из watchdog, если
// звонок умер молча). Итого ~2–3 записи на звонок. Firestore держит примерно
// одну запись в секунду на документ, то есть потолок ≈ 20–30 стартов/завершений
// в СЕКУНДУ. Звонок длится минуты, так что это порядка тысяч параллельных
// звонков — при дневном бюджете globalDailyBudgetUsd (дефолт $5000) деньги
// кончатся заметно раньше, чем документ упрётся в свой лимит.
//
// Почему НЕ шардируем: этот счётчик работает предохранителем бюджета.
// Шардированный счётчик читается как сумма N шардов и по своей природе отстаёт,
// а voiceBudgetTier по заниженной сумме пропустит звонки за лимитом. Разменять
// несуществующую пока проблему масштаба на дыру в защите денег — плохая сделка.
//
// Когда пересматривать: если появятся ошибки contention/ABORTED на этой
// коллекции или счётчик пиковых стартов приблизится к ~20/сек. Тогда правильный
// ход — не «N шардов + сумма при чтении», а перенос предохранителя на строгий
// источник (например, отдельный лимит одновременных сессий), где отставание
// суммы не открывает перерасход.
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

/**
 * Пробник доступен ровно один раз за жизнь стабильного аккаунта.
 *
 * Только выделенные trial-маркеры доказывают расход бесплатного пробника.
 * activatedAtMs, lastSettledAtMs и monthlyUsedSec описывают обычные звонки и
 * подписочную историю; использовать их как trial-маркер нельзя — после
 * миграции MAX в покупаемые минуты это отбирало неиспользованные 3 минуты.
 */
export function resolveTrialState(
  quotaData: Record<string, unknown> | undefined,
  _config: MaxVoiceConfig,
  _nowMs: number,
): VoiceTrialState {
  const data = quotaData ?? {};
  const trialUsageMarker = Math.max(
    0,
    num(data.lifetimeTrialUsedAtMs),
    num(data.trialUsedAtMs),
  );
  return { available: trialUsageMarker <= 0, usedAtMs: trialUsageMarker };
}

export type VoiceTrialVariant = 'companion' | 'scenario';

/**
 * Пробный звонок для Free/Плюс/Про: доступен, только если ни разу не был
 * использован этим стабильным аккаунтом. null = пробник исчерпан, линия закрыта
 * пейволом MAX. Смена обычного тира не меняет этот штамп.
 *
 * Вариант берём из trialMode: 'auto' даёт сценарий (кофейня с Mia) — он ярче
 * показывает живой голос, чем свободный разговор.
 */
/**
 * Разрешён ли пробный звонок этому тиру (Free / Плюс / Про).
 *
 * Сервер различает ровно три состояния — отдельных подписок «Плюс» и «Про» в
 * продукте нет (см. premium_status):
 *   Free — активного премиума нет;
 *   Про  — активен премиум с разовой покупкой «Навсегда» (premium_plan='lifetime');
 *   Плюс — любой другой активный премиум (monthly/yearly/annual/VIP/грант).
 * Это то же деление, что показывает приложение (PremiumContext: Pro = premium
 * && lifetimePlan), поэтому админский выключатель совпадает с плашкой у игрока.
 *
 * ЭКОНОМИЯ ЧТЕНИЙ: дорогой обход идентичностей (resolveIsLifetimePlan) делаем
 * ТОЛЬКО когда флаги Плюса и Про различаются. Пока они равны — ответ известен
 * без единого лишнего чтения Firestore, а это обычный случай.
 */
export async function isTrialEnabledForTier(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  authUid: string | undefined,
  isPremium: boolean,
  config: MaxVoiceConfig,
  nowMs: number,
): Promise<boolean> {
  if (!isPremium) return config.trialEnabledFree;
  if (config.trialEnabledPlus === config.trialEnabledPro) return config.trialEnabledPlus;

  // Сбой чтения не должен молча раздавать платный пробник: считаем такого
  // пользователя Плюсом (рекуррентная подписка — массовый случай), а не Про.
  const isPro = await resolveIsLifetimePlan(db, stableUid, nowMs, authUid).catch(() => false);
  return isPro ? config.trialEnabledPro : config.trialEnabledPlus;
}

export function resolveTrialAccess(
  quotaData: Record<string, unknown> | undefined,
  config: MaxVoiceConfig,
  nowMs: number,
): VoiceTrialVariant | null {
  const { available } = resolveTrialState(quotaData, config, nowMs);
  if (!available) return null;
  return config.trialMode === 'companion' ? 'companion' : 'scenario';
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
  access: VoiceMinuteAccessType;
  paidAvailableSec: number;
  trialVariant: VoiceTrialVariant | null;
  nowMs: number;
}

/**
 * Купленные минуты живут в неистекающем серверном wallet и не используют
 * календарные лимиты. Trial/admin сохраняют технический резерв с хвостом.
 */
export function monthlyVoiceCapFor(
  config: MaxVoiceConfig,
  access: VoiceMinuteAccessType,
): number {
  // У пробника месячного пакета нет, но своя единственная
  // сессия должна поместиться — иначе резерв упрётся в ноль и звонок не
  // состоится вовсе. Разовость держит trialUsedAtMs, а не месячный счётчик.
  if (access === 'trial') return config.trialCallSec + config.graceTailSec;
  return config.monthlyVoiceSecMax;
}

/**
 * Гейты в порядке теста №11: kill switch (aiGloballyDisabled + gate_ai_voice_call)
 * → купленные минуты ИЛИ trial/admin gate. Бросает HttpsError на
 * первом же закрытом гейте. Устаревший voiceForPremiumBeta больше не участвует.
 */
async function resolveVoiceGates(
  authUid: string,
  data: Record<string, unknown>,
  nowMs: number,
  isAdmin: boolean,
  rejectionMarkerId?: string,
): Promise<VoiceGateContext> {
  const db = admin.firestore();

  // зачем: владелец 2026-08-16 — соединение должно быть мгновенным. Три чтения
  // не зависят друг от друга, поэтому идут ПАРАЛЛЕЛЬНО (−2 сетевых круга на
  // минте); ПОРЯДОК проверки гейтов при этом прежний (тест №11): рубильник ИИ →
  // гейт звонков → кошелёк/trial-квота.
  const [globallyDisabled, config, stableUid] = await Promise.all([
    aiGloballyDisabled(db),
    resolveMaxVoiceConfig(db),
    resolveStableUidForAuth(db, authUid),
  ]);

  const rejectBeforeReserve = async (reason: MaxVoiceMintRejectionReason): Promise<void> => {
    if (!rejectionMarkerId) return;
    await recordMintRejection(db, authUid, stableUid, rejectionMarkerId, reason, nowMs);
  };

  // Kill switch №1: глобальный рубильник всего ИИ.
  if (globallyDisabled) {
    await rejectBeforeReserve('kill_switch');
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
    await rejectBeforeReserve('kill_switch');
    throw new HttpsError('failed-precondition', 'voice_disabled');
  }

  // Premium is read only to select the existing trial flag. Paid voice access
  // is authoritative in the independent server wallet, never an entitlement.
  const [isPremium, quotaData, paidWallet] = await Promise.all([
    resolvePremiumAccess(db, stableUid, Date.now(), authUid),
    ensureCanonicalVoiceQuota(db, { authUid, stableUid, nowMs }),
    readVoiceMinuteWallet(db, stableUid),
  ]);

  if (isAdmin) {
    return {
      db, authUid, stableUid, config, isPremium, quotaData,
      access: 'admin', paidAvailableSec: paidWallet.availableSeconds,
      trialVariant: null, nowMs,
    };
  }

  const isReconnect = text(data.reconnectOf, 80) !== '';
  if (isReconnect) {
    const activeAccess = quotaData.accessType === 'paid_minutes' ? 'paid_minutes' : 'trial';
    return {
      db, authUid, stableUid, config, isPremium, quotaData,
      access: activeAccess,
      paidAvailableSec: paidWallet.availableSeconds,
      trialVariant: activeAccess === 'trial' ? 'scenario' : null,
      nowMs,
    };
  }

  // зачем (владелец 2026-08-29): КУПЛЕННЫЕ МИНУТЫ ИДУТ ПЕРВЫМИ. Раньше trial
  // проверялся раньше кошелька, и у владельца со 120 купленными минутами экран
  // урока не открывался вовсе: сервер выдавал trial с потолком 3 минуты, урок
  // tutor в него не помещался, минт отвечал отказом — а оплаченные минуты
  // лежали нетронутыми. Пробник теперь берётся только когда платить нечем: так
  // он и остаётся тем, чем задуман — пробой для того, у кого минут нет.
  if (paidWallet.availableSeconds >= 60) {
    return {
      db, authUid, stableUid, config, isPremium, quotaData,
      access: 'paid_minutes', paidAvailableSec: paidWallet.availableSeconds,
      trialVariant: null, nowMs,
    };
  }

  const trial = resolveTrialAccess(quotaData, config, nowMs);
  if (trial) {
    const tierTrialEnabled = await isTrialEnabledForTier(
      db, stableUid, authUid, isPremium, config, nowMs,
    );
    if (tierTrialEnabled) {
      return {
        db, authUid, stableUid, config, isPremium, quotaData,
        access: 'trial', paidAvailableSec: paidWallet.availableSeconds,
        trialVariant: trial, nowMs,
      };
    }
  }

  console.warn('max_voice_mint rejected', { reason: 'voice_max_required' });
  await rejectBeforeReserve('paywall');
  throw new HttpsError('permission-denied', 'voice_max_required');
}

/** Read-only остаток дня/месяца (для preflight; резерв всё равно транзакционный). */
export function estimateQuotaRemaining(
  quotaData: Record<string, unknown>,
  config: MaxVoiceConfig,
  nowMs: number,
  tier?: { access: VoiceMinuteAccessType; paidAvailableSec?: number },
): { dayRemainingSec: number; monthRemainingSec: number } {
  if (tier?.access === 'paid_minutes') {
    const available = Math.max(0, Math.floor(tier.paidAvailableSec ?? 0));
    return { dayRemainingSec: available, monthRemainingSec: available };
  }
  const dailyUsed = nowMs >= num(quotaData.resetAtMs) ? 0 : Math.max(0, num(quotaData.dailyUsedSec));
  const monthlyUsed = nowMs >= num(quotaData.monthResetAtMs) ? 0 : Math.max(0, num(quotaData.monthlyUsedSec));
  // Без тира (старые вызовы) считаем по максимальному пакету — прежнее поведение.
  const monthlyCap = tier
    ? monthlyVoiceCapFor(config, tier.access)
    : config.monthlyVoiceSecMax;
  const now = new Date(nowMs);
  const currentMonthStartedAtMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const markerMatchesWindow = nowMs < num(quotaData.monthResetAtMs)
    && num(quotaData.maxAllowanceMonthResetAtMs) === num(quotaData.monthResetAtMs);
  const trialUsedAtMs = num(quotaData.trialUsedAtMs);
  const currentMonthTrialOffset = trialUsedAtMs >= currentMonthStartedAtMs
    && trialUsedAtMs <= nowMs
    && text(quotaData.trialReservationSessionId, 80) !== ''
    && num(quotaData.trialProviderMintedAtMs) > 0
    ? Math.min(monthlyUsed, config.trialCallSec + config.graceTailSec)
    : 0;
  const maxBaseline = tier?.access === 'admin'
    ? markerMatchesWindow
      ? Math.min(monthlyUsed, Math.max(0, num(quotaData.maxAllowanceUsageBaselineSec)))
      : currentMonthTrialOffset
    : 0;
  const effectiveMonthlyUsed = tier?.access === 'admin' ? monthlyUsed - maxBaseline : monthlyUsed;
  return {
    dayRemainingSec: Math.max(0, config.dailyVoiceSecMax - dailyUsed),
    monthRemainingSec: Math.max(0, monthlyCap - effectiveMonthlyUsed),
  };
}

async function recordMintRejection(
  db: Firestore,
  authUid: string,
  stableUid: string,
  markerId: string,
  rejectionReason: MaxVoiceMintRejectionReason,
  nowMs: number,
): Promise<void> {
  const markerRef = db.collection(VOICE_QUOTA_COLLECTION).doc(voiceQuotaDocId(stableUid));
  await recordMaxVoiceOpsOnce(db, {
    markerRef,
    markerId,
    event: { schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage: 'mint_rejected', rejectionReason },
    nowMs,
  }).catch(() => undefined);
}

type VoiceMintFormat = 'scenario' | 'companion' | 'trial' | 'tutor';

function formatOf(data: Record<string, unknown>, access: VoiceMinuteAccessType, trialVariant: VoiceTrialVariant | null): VoiceMintFormat {
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
  const data = (request.data ?? {}) as Record<string, unknown>;
  const ctx = await resolveVoiceGates(
    request.auth.uid,
    data,
    nowMs,
    request.auth.token?.admin === true,
  );
  const { dayRemainingSec, monthRemainingSec } = estimateQuotaRemaining(
    ctx.quotaData,
    ctx.config,
    nowMs,
    { access: ctx.access, paidAvailableSec: ctx.paidAvailableSec },
  );
  const quotaReason = voiceQuotaExhaustedReason(dayRemainingSec, monthRemainingSec);
  if (quotaReason) {
    console.warn('max_voice_preflight rejected', { reason: quotaReason, dayRemainingSec, monthRemainingSec });
    throw new HttpsError('resource-exhausted', quotaReason, LEGACY_VOICE_QUOTA_EXHAUSTED_REASON);
  }
  const format = formatOf(data, ctx.access, ctx.trialVariant);
  const studyTarget = maxVoiceStudyTarget(data.studyTarget);
  const tutorPreview = format === 'tutor'
    ? buildTutorPreview({
        // Tutor memory is not target-scoped yet. Never leak English homework
        // into another course; those courses start from a clean preview.
        memory: studyTarget === 'en'
          ? await readTutorMemory(ctx.db, ctx.authUid, ctx.stableUid)
          : TUTOR_MEMORY_EMPTY,
        cefr: asVoiceCefr(data.cefr),
        interfaceLang: text(data.interfaceLang, 8),
        tutorName: ctx.config.tutorName,
        nowMs,
      })
    : null;

  return {
    ok: true,
    allowed: true,
    access: ctx.access,
    trialVariant: ctx.trialVariant,
    degradeMode: ctx.config.degradeMode,
    ...(tutorPreview ? { tutorPreview } : {}),
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
    // Текстовая транскрипция output-аудио приходит отдельными событиями и не
    // является гарантией, что модель действительно синтезирует голос.
    output_modalities: ['audio'],
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
          // зачем (владелец 2026-08-23, ЖИВОЙ ЗВОНОК): попытка отдать ходы
          // серверу провалилась — «макс не слушает, всё что я говорю
          // игнорируется», вместо ответов сыпались подсказки «you could say...».
          // Ответ на речь ученика не создавался вообще. Возвращено рабочее
          // распределение: ответ создаёт КЛИЕНТ после speech_stopped.
          // Два источника ответа одновременно недопустимы, поэтому здесь false.
          create_response: false,
          // Не обрываем незаконченную фразу MAX по одному VAD start: на громкой
          // связи даже после AEC/far_field возможен ложный speech_start.
          interrupt_response: false,
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
  const rejectionMarkerId = `vr_${randomUUID()}`;
  // Чтение дневного бюджета не зависит от гейтов и никогда не бросает —
  // стартуем параллельно с ними (латентность минта), а ПРОВЕРЯЕМ после,
  // чтобы порядок отказов остался прежним.
  const budgetSpentPromise = readVoiceBudgetSpentUsd(admin.firestore(), nowMs);
  // Порядок гейтов (тест №11): App Check (опция onCall) → kill switch →
  // подписка/пробник → бюджет → rate limit → резерв → минт.
  const ctx = await resolveVoiceGates(
    request.auth.uid,
    data,
    nowMs,
    request.auth.token?.admin === true,
    rejectionMarkerId,
  );
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
    await recordMintRejection(db, authUid, stableUid, rejectionMarkerId, 'budget', nowMs);
    throw new HttpsError('resource-exhausted', 'voice_budget_exhausted');
  }
  if (tier === 'soft' && ctx.access === 'trial' && !reconnectOf) {
    // 80–100%: пробники — первое, что режется лестницей (но не живые пробные звонки).
    console.warn('max_voice_mint rejected', { reason: 'voice_trial_paused', spentUsd });
    await recordMintRejection(db, authUid, stableUid, rejectionMarkerId, 'budget', nowMs);
    throw new HttpsError('resource-exhausted', 'voice_trial_paused');
  }

  const cefr = asVoiceCefr(data.cefr);
  const format = formatOf(data, ctx.access, ctx.trialVariant);
  const studyTarget = maxVoiceStudyTarget(data.studyTarget);

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
    const remaining = estimateQuotaRemaining(
      ctx.quotaData,
      config,
      nowMs,
      { access: ctx.access, paidAvailableSec: ctx.paidAvailableSec },
    );
    dayRemainingSec = remaining.dayRemainingSec;
    monthRemainingSec = remaining.monthRemainingSec;
  } else {
    // Свежий минт: rate limit → транзакционный резерв (min(cap+хвост, день, месяц)).
    const estimatedRemaining = estimateQuotaRemaining(
      ctx.quotaData,
      config,
      nowMs,
      { access: ctx.access, paidAvailableSec: ctx.paidAvailableSec },
    );
    const estimatedQuotaReason = voiceQuotaExhaustedReason(
      estimatedRemaining.dayRemainingSec,
      estimatedRemaining.monthRemainingSec,
    );
    if (estimatedQuotaReason) {
      const rejectionReason = estimatedQuotaReason === 'voice_monthly_quota_exhausted'
        ? 'monthly_quota'
        : 'daily_quota';
      await recordMintRejection(db, authUid, stableUid, rejectionMarkerId, rejectionReason, nowMs);
      throw new HttpsError('resource-exhausted', estimatedQuotaReason, LEGACY_VOICE_QUOTA_EXHAUSTED_REASON);
    }
    try {
      await enforceVoiceMintRateLimit(db, authUid, stableUid, config.mintPerHourMax, nowMs);
    } catch (error) {
      if (error instanceof Error && error.message === 'voice_mint_rate_limited') {
        await recordMintRejection(db, authUid, stableUid, rejectionMarkerId, 'rate_limit', nowMs);
      }
      throw error;
    }
    let capSec = sessionCapFor(config, format);
    if (tier === 'soft') capSec = Math.min(capSec, VOICE_BUDGET_SOFT_SESSION_CAP_SEC);
    sessionId = `vs_${randomUUID()}`;
    let reserve;
    try {
      reserve = await reserveVoiceSeconds(db, {
        authUid,
        stableUid,
        sessionId,
        formatCapSec: capSec,
        graceTailSec: config.graceTailSec,
        dailyVoiceSecMax: config.dailyVoiceSecMax,
        monthlyVoiceSecMax: monthlyVoiceCapFor(config, ctx.access),
        consumeLifetimeTrial: ctx.access === 'trial',
        accessType: ctx.access,
        quotaIdentityClosureProof: text(ctx.quotaData.quotaIdentityClosureProof, 80),
        nowMs,
      });
    } catch (error) {
      const rawReason = error instanceof Error ? error.message : '';
      if (rawReason === 'voice_daily_quota_exhausted'
        || rawReason === 'voice_monthly_quota_exhausted'
        || rawReason === 'voice_minutes_insufficient') {
        await recordMintRejection(
          db,
          authUid,
          stableUid,
          rejectionMarkerId,
          rawReason === 'voice_minutes_insufficient'
            ? 'paywall'
            : rawReason === 'voice_monthly_quota_exhausted' ? 'monthly_quota' : 'daily_quota',
          nowMs,
        );
      }
      throw error;
    }
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

  const opsMarkerRef = db.collection(VOICE_QUOTA_COLLECTION).doc(voiceQuotaDocId(stableUid));
  const recordMintStage = (stage: 'mint_requested' | 'quota_reserved' | 'reconnect_attempt' | 'mint_succeeded' | 'mint_failed', extra: Record<string, unknown> = {}) => (
    recordMaxVoiceOpsOnce(db, {
      markerRef: opsMarkerRef,
      markerId: sessionId,
      event: { schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage, ...extra },
      nowMs: Date.now(),
    }).catch(() => undefined)
  );
  await recordMintStage('mint_requested');
  await recordMintStage('quota_reserved');
  if (reconnectOf) await recordMintStage('reconnect_attempt');

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
    ? await Promise.all([
        studyTarget === 'en' ? readTutorMemory(db, authUid, stableUid) : Promise.resolve(TUTOR_MEMORY_EMPTY),
        loadTutorAppDigest(db, nowMs),
      ])
    : [null, ''];
  // Карта целей (ступень 2): текущая цель по mastery и уровню. Уровень для выбора
  // цели — из закрытых целей, если они уже есть, иначе — cefr клиента.
  const goalProgressNow = tutorMemory ? canDoProgress(tutorMemory.goalMastery) : null;
  const goalLevel = tutorMemory && goalProgressNow && goalProgressNow.done > 0
    ? levelFromMastery(tutorMemory.goalMastery, cefr)
    : cefr;
  const currentGoal = tutorMemory ? pickNextGoal(tutorMemory.goalMastery, goalLevel) : null;
  const tutorPreview = tutorMemory
    ? buildTutorPreview({
        memory: tutorMemory,
        cefr,
        interfaceLang: text(data.interfaceLang, 8),
        tutorName: config.tutorName,
        nowMs,
      })
    : null;
  const goalBlock = tutorMemory && currentGoal && goalProgressNow
    ? renderCanDoGoalBlock(currentGoal, tutorMemory.goalMastery, goalProgressNow, studyTarget)
    : '';
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
          targetLangName: maxVoiceTargetLanguageName(studyTarget),
          appDigest,
          sceneCatalog: text(data.sceneCatalog, 2000),
          syllabusBlock: text(data.syllabusBlock, 1600),
          learnerSnapshot: text(data.learnerSnapshot, 2400),
          tutorMemoryBlock: tutorMemory
            ? renderTutorMemoryBlock(tutorMemory, nowMs) + (goalBlock ? `\n\n${goalBlock}` : '')
            : '',
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
      authUid,
      stableUid,
      sessionId,
      reason: 'mint_failed',
      restoreLifetimeTrial: true,
      nowMs: Date.now(),
    }).catch((e) => {
      console.error('max_voice_mint release after provider failure failed', e);
      return null;
    });
    const refundedSec = released && !released.alreadySettled ? released.refundedSec : 0;
    await refundVoiceBudgetEstimate(db, (refundedSec / 60) * VOICE_EST_COST_USD_PER_MIN, Date.now())
      .catch(() => {});
    await recordMintStage('mint_failed');
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
    try {
      await confirmVoiceTrialMinted(db, { authUid, stableUid, sessionId, nowMs: Date.now() });
    } catch (error) {
      // Provider уже выдал secret: lifetime stamp нельзя откатывать, иначе
      // повтор даст второй provider mint. Сам secret наружу при этом не уходит.
      const released = await releaseVoiceReservation(db, {
        authUid, stableUid, sessionId, reason: 'trial_confirmation_failed', nowMs: Date.now(),
      }).catch(() => null);
      const refundedSec = released && !released.alreadySettled ? released.refundedSec : 0;
      await refundVoiceBudgetEstimate(db, (refundedSec / 60) * VOICE_EST_COST_USD_PER_MIN, Date.now())
        .catch(() => {});
      await recordMintStage('mint_failed');
      console.error('max_voice_mint trial confirmation failed', error);
      throw new HttpsError('internal', 'voice_trial_commit_failed');
    }
  }

  await recordMintStage('mint_succeeded', {
    latencyMs: Math.max(0, Date.now() - nowMs),
    locale: maxVoiceOpsLocale(data.interfaceLang),
    level: maxVoiceOpsLevel(cefr),
  });

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
    access: ctx.access,
    trialVariant: ctx.trialVariant,
    // Учитель: имя (шапка экрана звонка) и инструкция первого ответа — клиент
    // шлёт её в response.create вместо ролевого приветствия.
    ...(isTutor
      ? {
          tutor: {
            name: config.tutorName,
            greetingInstructions: tutorGreetingInstructionsFor(maxSeconds),
            lessonsSoFar: tutorMemory?.callCount ?? 0,
            homework: tutorMemory?.homework ?? [],
            nextTopic: tutorMemory?.nextTopic ?? '',
            ...(tutorPreview ? { preview: tutorPreview } : {}),
            // План сегодняшнего урока для экрана «Учитель»: тип урока и сколько
            // фраз созрело для повторения речи (ступень 1 плана обучения).
            plan: {
              lessonType: tutorMemory ? selectTutorLessonType(tutorMemory, nowMs) : 'new_material',
              duePhrases: tutorMemory ? duePhrases(tutorMemory, nowMs).map((p) => p.text) : [],
              scenesDone: tutorMemory?.scenesDone ?? 0,
              scenesTotal: tutorMemory?.scenesTotal ?? 0,
              // Карта речевых целей: текущая цель + «14 из 60».
              goal: currentGoal
                ? {
                    id: currentGoal.id,
                    level: currentGoal.level,
                    title: currentGoal.title,
                    mastery: tutorMemory?.goalMastery[currentGoal.id] ?? 0,
                    sceneIds: currentGoal.sceneIds,
                  }
                : null,
              // Ступень 3: ближайшие уроки (тип + цель) для экрана «Учитель».
              upcoming: tutorMemory
                ? planUpcomingLessons(tutorMemory.goalMastery, goalLevel, tutorMemory.callCount, 5, tutorLessonTypeFor)
                : [],
            },
          },
        }
      : {}),
  };
});

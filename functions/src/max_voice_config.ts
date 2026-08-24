// ═══════════════════════════════════════════════════════════════════════════
// max_voice_config.ts — runtime-конфиг голосовых MAX-звонков (OpenAI Realtime).
//
// Один док admin_runtime_config/openai_realtime_voice (паттерн
// openai_dialog_model_config.ts). Каждый параметр проходит ЖЁСТКИЙ кламп в коде:
// опечатка админа (sessionCapSec=48000) не должна жечь бюджет — сервер молча
// приводит значение в безопасный коридор, а не падает и не верит доку.
//
// Кэш в памяти инстанса ≤60с: скорость kill switch (gate_ai_voice_call) важнее
// экономии чтений — минта без свежего конфига не бывает дольше минуты.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';
const CONFIG_COLLECTION = 'admin_runtime_config';
export const MAX_VOICE_CONFIG_DOC = 'openai_realtime_voice';

/** Абсолютный потолок длительности сессии — зашит в код, админ-док его не двигает. */
export const HARD_MAX_SESSION_SEC = 600;

/** Денежные/доступные лимиты являются серверным контрактом, а не remote knobs. */
export const MAX_VOICE_LIFETIME_TRIAL_SEC = 180;
/** Technical teardown reserve; never increases user-visible trial talk time. */
export const MAX_VOICE_HARD_GRACE_TAIL_SEC = 120;
export const MAX_VOICE_LIFETIME_TRIAL_RESERVE_SEC =
  MAX_VOICE_LIFETIME_TRIAL_SEC + MAX_VOICE_HARD_GRACE_TAIL_SEC;
export const MAX_VOICE_DAILY_SEC = 1_200;
export const MAX_VOICE_MONTHLY_SEC = 7_200;

// Старые gpt-realtime(-mini) deprecated; закрытый whitelist не позволяет
// Firestore-конфигу незаметно вернуть режим на снимаемую с поддержки модель.
export const ALLOWED_REALTIME_MODELS = ['gpt-realtime-2.1-mini', 'gpt-realtime-2.1'] as const;
export type MaxVoiceModel = typeof ALLOWED_REALTIME_MODELS[number];

/** Только встроенные voice IDs, которые принимает текущий Realtime API. */
export const ALLOWED_REALTIME_VOICES = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
  'marin',
  'cedar',
] as const;

/** Транскрипция входа ВСЕГДА включена (обучающий цикл — несокращаемая статья себестоимости). */
export const ALLOWED_TRANSCRIPTION_MODELS = [
  'gpt-4o-mini-transcribe',
  'gpt-4o-transcribe',
  'whisper-1',
] as const;

export type VoiceCefr = 'A1' | 'A2' | 'B1' | 'B2';
export type VadEagerness = 'low' | 'medium' | 'high' | 'auto';
export type VoiceTrialMode = 'auto' | 'scenario' | 'companion';
export type VoicePruneMode = 'retention' | 'manual' | 'off';
export type VoiceDegradeMode = 'auto' | 'force_fallback' | 'off';

export interface MaxVoiceConfig {
  model: MaxVoiceModel;
  voice: string;
  transcriptionModel: string;
  sessionCapSec: { scenario: number; companion: number; trial: number; tutor: number };
  /**
   * Учитель (формат 'tutor'): имя, которым он представляется, и голос.
   * зачем: владелец 2026-08-16 — «не звонок в кафе, а учитель, который ведёт»;
   * имя/голос — ручки админки, чтобы поменять персонажа без релиза.
   */
  tutorName: string;
  tutorVoice: string;
  graceTailSec: number;
  /** Дневной потолок — общий для всех платных тиров (растягивает месячный пакет). */
  dailyVoiceSecMax: number;
  /** Месячный пакет тира MAX (отдельная подписка на голосового учителя). */
  monthlyVoiceSecMax: number;
  trialCallSec: number;
  trialMode: VoiceTrialMode;
  maxResponseOutputTokens: Record<VoiceCefr, number> & { injected: number };
  vadEagerness: Record<VoiceCefr, VadEagerness>;
  truncationRetentionRatio: number;
  pruneMode: VoicePruneMode;
  reinjectEveryTurns: number;
  hintDelaySec: Record<VoiceCefr, number>;
  hintMaxPerSession: number;
  idleTimeoutMs: number;
  wrapUpLeadSec: number;
  mintPerHourMax: number;
  reconnectChainMax: { auto: number; manual: number };
  reconnectFreeGapSecTotal: number;
  heartbeatSec: number;
  globalDailyBudgetUsd: number;
  budgetSoftPct: number;
  gate_ai_voice_call: boolean;
  /**
   * Аллоулист auth uid для DEV-теста закрытой линии (DEV Hub шлёт devMode).
   * Только для своих тестовых аккаунтов: сервер по-прежнему не верит телу
   * запроса, а решает по uid из проверенного токена. Пустой список = закрыто.
   */
  devTestUids: string[];
  degradeMode: VoiceDegradeMode;
  maxFallbackRepliesDaily: number;
  audioBackchannelsEnabled: boolean;
  interimSelfCaptions: boolean;
  xpRatePerSpeechMin: number;
  xpDailyCap: number;
}

export const MAX_VOICE_CONFIG_DEFAULTS: MaxVoiceConfig = {
  model: 'gpt-realtime-2.1-mini',
  voice: 'marin',
  transcriptionModel: 'gpt-4o-mini-transcribe',
  // tutor — урок-звонок с учителем; учитель сам предупреждает и прощается,
  // клиент шлёт ему заметки времени (T−120с / T−45с).
  sessionCapSec: { scenario: 300, companion: 480, trial: MAX_VOICE_LIFETIME_TRIAL_SEC, tutor: 600 },
  tutorName: 'Max',
  tutorVoice: 'cedar',
  graceTailSec: 20,
  // зачем (владелец 2026-08-23, релизные лимиты): прежние 4ч/день и 48ч/месяц
  // были ТЕСТОВЫМИ («лимиты введу сам при релизе») и позволяли одному человеку
  // нажечь ~$173/мес. Теперь минуты разделены по тирам:
  //   MAX      — 120 мин/мес (2 часа), большой пакет отдельной подписки;
  //   Free/Плюс/Про — один общий пробный звонок до 3 минут за весь срок жизни
  //                    стабильного аккаунта; апгрейд не выдаёт новый пробник.
  // Дневной потолок 20 минут общий: он не мешает нормальному ученику (два урока
  // по 10 минут), но растягивает месячный пакет минимум на 6 дней и не даёт
  // выжечь его за один вечер.
  dailyVoiceSecMax: MAX_VOICE_DAILY_SEC,
  monthlyVoiceSecMax: MAX_VOICE_MONTHLY_SEC,
  trialCallSec: MAX_VOICE_LIFETIME_TRIAL_SEC,
  // Этот пробник не обновляется по календарю и принадлежит аккаунту, а не тиру.
  trialMode: 'auto',
  // зачем: владелец 2026-08-16 — «не договаривает до конца, будто обрывается»:
  // max_output_tokens считает АУДИО-токены (~20 на секунду речи), и 120/160
  // рвали фразу на 6–8-й секунде посреди слова.
  //
  // ⚠️ Это НЕ «просьба говорить короче», а ЖЁСТКИЙ ОБРЫВ: при достижении лимита
  // ответ приходит со статусом incomplete и речь обрывается на полуслове —
  // модель под лимит не подстраивается. Поэтому кап обязан оставаться ЗАПАСОМ
  // (предохранителем от бесконечного монолога), а краткость держит промпт и
  // VOICE RULES. Владелец 2026-08-23: «если будет 20 секунд и оно будет
  // обрезаться — он начнёт говорить и не договорит». Занижать сюда нельзя.
  maxResponseOutputTokens: { A1: 500, A2: 600, B1: 800, B2: 1000, injected: 800 },
  // semantic_vad low может держать законченную фразу до 8 с — пользователь уже
  // всё сказал, а экран всё ещё пишет «Слушаю». Medium оставляет новичкам паузу
  // до 4 с, high ограничивает уверенную речь B1/B2 двумя секундами. При этом
  // interrupt_response выключен в минте, поэтому ложный VAD от громкой связи
  // не обрывает незаконченную реплику MAX.
  vadEagerness: { A1: 'medium', A2: 'medium', B1: 'high', B2: 'high' },
  truncationRetentionRatio: 0.8,
  pruneMode: 'retention',
  reinjectEveryTurns: 9,
  hintDelaySec: { A1: 8, A2: 8, B1: 9, B2: 9 },
  hintMaxPerSession: 4,
  idleTimeoutMs: 90_000,
  wrapUpLeadSec: 75,
  // Не «лимит пользователю», а предохранитель от цикла-бага: экран в бесконечном
  // ретрае не должен молотить минт всю ночь. Живому человеку 60 стартов в час не нужны.
  mintPerHourMax: 60,
  reconnectChainMax: { auto: 2, manual: 1 },
  reconnectFreeGapSecTotal: 60,
  heartbeatSec: 30,
  // зачем (владелец 2026-08-23): прежние $5000/день были ТЕСТОВЫМ значением
  // («перед релизом вернуть реальное число»). $50/день — потолок трат НА ВСЕХ:
  // при себестоимости ~$0.06/мин после кэш-рычагов этого хватает примерно на
  // 80 активных подписчиков MAX, а в случае бага или атаки максимальная потеря
  // за сутки — $50, а не весь баланс OpenAI. Поднимать по мере роста платящих.
  globalDailyBudgetUsd: 50,
  budgetSoftPct: 0.8,
  // зачем: владелец 2026-08-16 — «звонок должен работать всегда без исключений».
  // Дефолт ВКЛ: линия открыта сразу, выключение — только явным админ-действием.
  gate_ai_voice_call: true,
  // DEV-аллоулист больше не гейтит звонок (линия открыта всем). Поле оставлено
  // ради совместимости со схемой дока и админкой; на доступ оно не влияет.
  devTestUids: [],
  degradeMode: 'auto',
  // Фолбэк half-duplex не ест обычный Premium-лимит — свой щедрый пул.
  maxFallbackRepliesDaily: 300,
  audioBackchannelsEnabled: false,
  interimSelfCaptions: false,
  xpRatePerSpeechMin: 10,
  xpDailyCap: 300,
};

// ── Кламп-хелперы ───────────────────────────────────────────────────────────

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const raw = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  const n = typeof raw === 'number' ? raw : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  return Math.floor(clampNumber(value, min, max, fallback));
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const v = String(value ?? '').trim();
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function coerceBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes') return true;
    if (v === 'false' || v === '0' || v === 'no') return false;
  }
  if (value === 1) return true;
  if (value === 0) return false;
  return fallback;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function cefrMap(
  value: unknown,
  clampOne: (raw: unknown, fallback: number) => number,
  defaults: Record<VoiceCefr, number>,
): Record<VoiceCefr, number> {
  const raw = record(value);
  return {
    A1: clampOne(raw.A1, defaults.A1),
    A2: clampOne(raw.A2, defaults.A2),
    B1: clampOne(raw.B1, defaults.B1),
    B2: clampOne(raw.B2, defaults.B2),
  };
}

const VAD_VALUES: readonly VadEagerness[] = ['low', 'medium', 'high', 'auto'];

/** Потолок аллоулиста DEV-тестеров: список руками, а не «полпроекта в доке». */
export const MAX_VOICE_DEV_UIDS_MAX = 20;
const DEV_UID_MAX_LEN = 128;

/**
 * Нормализация аллоулиста uid: только непустые строки, обрезка по длине,
 * дедуп, жёсткий потолок количества. Мусор (число, объект, null) отбрасывается.
 */
function clampUidList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const raw of value) {
    if (typeof raw !== 'string') continue;
    const uid = raw.trim().slice(0, DEV_UID_MAX_LEN);
    if (uid === '' || out.includes(uid)) continue;
    out.push(uid);
    if (out.length >= MAX_VOICE_DEV_UIDS_MAX) break;
  }
  return out;
}

/**
 * Нормализация + жёсткие клампы КАЖДОГО поля. Любой мусор (не тот тип, вне
 * коридора, отсутствие поля) → дефолт либо ближайшая граница. Никогда не бросает.
 */
export function clampMaxVoiceConfig(raw: unknown): MaxVoiceConfig {
  const d = MAX_VOICE_CONFIG_DEFAULTS;
  const r = record(raw);
  const caps = record(r.sessionCapSec);
  const chain = record(r.reconnectChainMax);
  const vad = record(r.vadEagerness);
  const tokens = record(r.maxResponseOutputTokens);

  const capSec = (v: unknown, fallback: number) => clampInt(v, 60, HARD_MAX_SESSION_SEC, fallback);
  const tokenCap = (v: unknown, fallback: number) => clampInt(v, 16, 2000, fallback);
  const hintSec = (v: unknown, fallback: number) => clampInt(v, 3, 60, fallback);

  return {
    model: pickEnum(r.model, ALLOWED_REALTIME_MODELS, d.model),
    // Невалидный/устаревший voice ID из remote config не должен превращать
    // весь client_secrets request в HTTP 400.
    voice: pickEnum(r.voice, ALLOWED_REALTIME_VOICES, d.voice),
    transcriptionModel: pickEnum(r.transcriptionModel, ALLOWED_TRANSCRIPTION_MODELS, d.transcriptionModel),
    sessionCapSec: {
      scenario: capSec(caps.scenario, d.sessionCapSec.scenario),
      companion: capSec(caps.companion, d.sessionCapSec.companion),
      // Монетизируемый lifetime-пробник не управляется stale Firestore config.
      trial: MAX_VOICE_LIFETIME_TRIAL_SEC,
      tutor: capSec(caps.tutor, d.sessionCapSec.tutor),
    },
    tutorName: String(r.tutorName ?? '').replace(/[^\p{L}\p{N} .'-]/gu, '').trim().slice(0, 24) || d.tutorName,
    tutorVoice: pickEnum(r.tutorVoice, ALLOWED_REALTIME_VOICES, d.tutorVoice),
    graceTailSec: clampInt(r.graceTailSec, 0, MAX_VOICE_HARD_GRACE_TAIL_SEC, d.graceTailSec),
    dailyVoiceSecMax: MAX_VOICE_DAILY_SEC,
    monthlyVoiceSecMax: MAX_VOICE_MONTHLY_SEC,
    trialCallSec: MAX_VOICE_LIFETIME_TRIAL_SEC,
    trialMode: pickEnum(r.trialMode, ['auto', 'scenario', 'companion'] as const, d.trialMode),
    maxResponseOutputTokens: {
      ...cefrMap(tokens, tokenCap, d.maxResponseOutputTokens),
      injected: tokenCap(tokens.injected, d.maxResponseOutputTokens.injected),
    },
    vadEagerness: {
      A1: pickEnum(vad.A1, VAD_VALUES, d.vadEagerness.A1),
      A2: pickEnum(vad.A2, VAD_VALUES, d.vadEagerness.A2),
      B1: pickEnum(vad.B1, VAD_VALUES, d.vadEagerness.B1),
      B2: pickEnum(vad.B2, VAD_VALUES, d.vadEagerness.B2),
    },
    truncationRetentionRatio: clampNumber(r.truncationRetentionRatio, 0.1, 1, d.truncationRetentionRatio),
    pruneMode: pickEnum(r.pruneMode, ['retention', 'manual', 'off'] as const, d.pruneMode),
    reinjectEveryTurns: clampInt(r.reinjectEveryTurns, 0, 50, d.reinjectEveryTurns),
    hintDelaySec: cefrMap(r.hintDelaySec, hintSec, d.hintDelaySec),
    hintMaxPerSession: clampInt(r.hintMaxPerSession, 0, 20, d.hintMaxPerSession),
    idleTimeoutMs: clampInt(r.idleTimeoutMs, 10_000, 600_000, d.idleTimeoutMs),
    wrapUpLeadSec: clampInt(r.wrapUpLeadSec, 15, 300, d.wrapUpLeadSec),
    mintPerHourMax: clampInt(r.mintPerHourMax, 1, 100, d.mintPerHourMax),
    reconnectChainMax: {
      auto: clampInt(chain.auto, 0, 10, d.reconnectChainMax.auto),
      manual: clampInt(chain.manual, 0, 5, d.reconnectChainMax.manual),
    },
    reconnectFreeGapSecTotal: clampInt(r.reconnectFreeGapSecTotal, 0, 600, d.reconnectFreeGapSecTotal),
    heartbeatSec: clampInt(r.heartbeatSec, 5, 300, d.heartbeatSec),
    globalDailyBudgetUsd: clampNumber(r.globalDailyBudgetUsd, 0, 100_000, d.globalDailyBudgetUsd),
    budgetSoftPct: clampNumber(r.budgetSoftPct, 0.1, 1, d.budgetSoftPct),
    gate_ai_voice_call: coerceBool(r.gate_ai_voice_call, d.gate_ai_voice_call),
    devTestUids: clampUidList(r.devTestUids),
    degradeMode: pickEnum(r.degradeMode, ['auto', 'force_fallback', 'off'] as const, d.degradeMode),
    maxFallbackRepliesDaily: clampInt(r.maxFallbackRepliesDaily, 0, 100_000, d.maxFallbackRepliesDaily),
    audioBackchannelsEnabled: coerceBool(r.audioBackchannelsEnabled, d.audioBackchannelsEnabled),
    interimSelfCaptions: coerceBool(r.interimSelfCaptions, d.interimSelfCaptions),
    xpRatePerSpeechMin: clampInt(r.xpRatePerSpeechMin, 0, 100, d.xpRatePerSpeechMin),
    xpDailyCap: clampInt(r.xpDailyCap, 0, 100_000, d.xpDailyCap),
  };
}

// ── Кэш инстанса ────────────────────────────────────────────────────────────

export const MAX_VOICE_CONFIG_CACHE_TTL_MS = 60_000;

let configCache: { config: MaxVoiceConfig; atMs: number } | null = null;

/** Сброс кэша (после админ-записи в этом же инстансе и в тестах). */
export function invalidateMaxVoiceConfigCache(): void {
  configCache = null;
}

export function __resetMaxVoiceConfigCacheForTests(): void {
  invalidateMaxVoiceConfigCache();
}

/**
 * Конфиг с кэшем ≤60с. Ошибка чтения → дефолты БЕЗ кэширования (следующий вызов
 * попробует снова — сбой Firestore не должен на минуту замораживать «выключено»).
 */
export async function resolveMaxVoiceConfig(db: Firestore): Promise<MaxVoiceConfig> {
  const now = Date.now();
  if (configCache && now - configCache.atMs < MAX_VOICE_CONFIG_CACHE_TTL_MS) {
    return configCache.config;
  }
  try {
    const snap = await db.collection(CONFIG_COLLECTION).doc(MAX_VOICE_CONFIG_DOC).get();
    const config = clampMaxVoiceConfig(snap.data());
    configCache = { config, atMs: now };
    return config;
  } catch (e) {
    console.warn('resolveMaxVoiceConfig failed, using defaults', e);
    return clampMaxVoiceConfig(undefined);
  }
}

// ── Админ-callable get/set (паттерн openAiDialogModelConfig) ────────────────

export const maxVoiceConfigAdmin = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError('permission-denied', 'Admin only');
  }

  const db = admin.firestore();
  const ref = db.collection(CONFIG_COLLECTION).doc(MAX_VOICE_CONFIG_DOC);
  const action = String(request.data?.action ?? '').trim().slice(0, 20) || 'get';

  if (action === 'set') {
    const patch = record(request.data?.config);
    // Shallow merge поверх текущего дока, затем ПОЛНЫЙ кламп: в док попадает уже
    // нормализованный конфиг — мусор не хранится и не ждёт бага в клампе-читателе.
    const current = record((await ref.get()).data());
    const clamped = clampMaxVoiceConfig({ ...current, ...patch });
    await ref.set({
      ...clamped,
      hardMaxSessionSec: HARD_MAX_SESSION_SEC,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtMs: Date.now(),
      updatedBy: String(request.auth?.token?.email ?? '').trim().slice(0, 200) || 'admin',
    }, { merge: true });
    invalidateMaxVoiceConfigCache();
  } else if (action !== 'get') {
    throw new HttpsError('invalid-argument', 'unsupported_action');
  }

  const snap = await ref.get();
  return {
    ok: true,
    config: clampMaxVoiceConfig(snap.data()),
    defaults: MAX_VOICE_CONFIG_DEFAULTS,
    hardMaxSessionSec: HARD_MAX_SESSION_SEC,
    updatedAtMs: Number(snap.data()?.updatedAtMs || 0),
  };
});

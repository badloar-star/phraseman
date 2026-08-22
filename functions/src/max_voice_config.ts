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
  dailyVoiceSecMax: number;
  monthlyVoiceSecMax: number;
  trialCallSec: number;
  trialRefreshDays: number;
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
  /** v1: MAX-доступ = обычный премиум (голос идёт бетой внутри Premium). false — только будущий MAX-тариф. */
  voiceForPremiumBeta: boolean;
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
  sessionCapSec: { scenario: 300, companion: 480, trial: 180, tutor: 600 },
  tutorName: 'Max',
  tutorVoice: 'cedar',
  graceTailSec: 20,
  // зачем: владелец 2026-08-16 — «все лимиты снять, лимиты введу сам при релизе».
  // Ставим верхнюю границу клампа (4ч/день, 48ч/месяц): счётчик продолжает считать
  // минуты для будущего пейвола, но практически звонок не упирается в потолок.
  dailyVoiceSecMax: 14_400,
  monthlyVoiceSecMax: 172_800,
  trialCallSec: 180,
  trialRefreshDays: 30,
  trialMode: 'auto',
  // зачем: владелец 2026-08-16 — «она очень часто не договаривает до конца,
  // будто обрывается». max_output_tokens в Realtime считает АУДИО-токены
  // (~20 токенов на секунду речи): прежние 120/160 обрезали реплику на 6–8-й
  // секунде посреди слова. Кап — только предохранитель от монолога, краткость
  // держит промпт; поэтому 25–50 с речи, а не 6–8. injected (приветствие,
  // подсказка, прощание) — 40 с: прощание в два хода не должно рваться.
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
  // зачем: владелец 2026-08-16 — лимиты снять до релиза. Бюджетная лестница
  // остаётся живым механизмом (её планка задаётся доком), но дефолт поднят так,
  // чтобы тестовые звонки в неё не упирались. Перед релизом вернуть реальное число.
  globalDailyBudgetUsd: 5_000,
  budgetSoftPct: 0.8,
  // зачем: владелец 2026-08-16 — «звонок должен работать всегда без исключений».
  // Дефолт ВКЛ: линия открыта сразу, выключение — только явным админ-действием.
  gate_ai_voice_call: true,
  // DEV-аллоулист больше не гейтит звонок (линия открыта всем). Поле оставлено
  // ради совместимости со схемой дока и админкой; на доступ оно не влияет.
  devTestUids: [],
  voiceForPremiumBeta: true,
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
      trial: capSec(caps.trial, d.sessionCapSec.trial),
      tutor: capSec(caps.tutor, d.sessionCapSec.tutor),
    },
    tutorName: String(r.tutorName ?? '').replace(/[^\p{L}\p{N} .'-]/gu, '').trim().slice(0, 24) || d.tutorName,
    tutorVoice: pickEnum(r.tutorVoice, ALLOWED_REALTIME_VOICES, d.tutorVoice),
    graceTailSec: clampInt(r.graceTailSec, 0, 120, d.graceTailSec),
    dailyVoiceSecMax: clampInt(r.dailyVoiceSecMax, 60, 14_400, d.dailyVoiceSecMax),
    monthlyVoiceSecMax: clampInt(r.monthlyVoiceSecMax, 60, 172_800, d.monthlyVoiceSecMax),
    trialCallSec: clampInt(r.trialCallSec, 30, HARD_MAX_SESSION_SEC, d.trialCallSec),
    trialRefreshDays: clampInt(r.trialRefreshDays, 1, 365, d.trialRefreshDays),
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
    voiceForPremiumBeta: coerceBool(r.voiceForPremiumBeta, d.voiceForPremiumBeta),
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

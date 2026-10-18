/**
 * mistakeHubAdvice — одна фраза-наблюдение о слабом месте ученика для хаба
 * «Работа над ошибками» и одна о карте источников ошибок.
 *
 * зачем (владелец 2026-09-14): «ИИ раз в сутки», текст готов до открытия
 * раздела. Кап стоимости: ОДНА генерация на (stableUid, UTC-день сервера) - повтор
 * в тот же день отдаёт кэш из Firestore независимо от изменившихся цифр.
 * PM-231: `day` клиента игнорируется; сверх кэша - потолок HUB_ADVICE_DAILY_GEN_CAP
 * платных генераций в сутки и billing-строка в mistake_hub_advice_billing.
 * В сводке нет PII: только учебные фразы, типы ошибок и счётчики.
 *
 * SECURITY (phraseman invariant): identity только из request.auth.uid через
 * resolveStableUidForAuth (два аргумента). App Check запломбирован - НЕ включать.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { aiGloballyDisabled } from './remote_gates';
import { resolveJobConfig } from './openai_jobs_config';
import { openAiChat } from './explain/explain_provider';
import { assertAiOutputLanguage, resolveAiOutputLang, resolveStudyTarget, studyTargetName, type AiOutputLang } from './ai_language_contract';
import { enforceFreeJobGenLimit, refundFreeJobGenLimit, type FreeJobGenReservation } from './explain/explain_budget';
import { PAID_AI_FETCH_TIMEOUT_MS } from './paid_ai_fetch_timeout';
import { enforceCallerRateWindow } from './caller_rate_window';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const REGION = 'us-central1';
const CACHE_COLLECTION = 'mistake_hub_advice';
/** PM-231: серверная коллекция usage для дашборда бюджета (как explain_billing). */
export const BILLING_COLLECTION = 'mistake_hub_advice_billing';
const HUB_ADVICE_JOB = 'hub_advice';
/** PM-231: платных генераций подсказки на ученика в UTC-сутки (кэш-хиты не считаются). */
export const HUB_ADVICE_DAILY_GEN_CAP = 3;
const MAX_TOKENS = 260;
const TEMPERATURE = 0.6;
const MAX_PHRASE = 120;
const MAX_TOP = 5;
const MAX_FACETS = 8;
const MAX_SOURCES = 6;
const MAX_HUB_CHARS = 220;
const MAX_MAP_CHARS = 160;

const FACETS = new Set(['meaning', 'form', 'word_order', 'missing_token', 'listening', 'pronunciation']);
const SOURCES = new Set(['lessons', 'arena', 'cards', 'exams', 'other']);

export interface MistakeHubAdviceResponse {
  ok: true;
  hub: string;
  map: string;
  fromCache: boolean;
}

interface Counted<T extends string> { readonly key: T; readonly count: number; }

interface CleanSummary {
  readonly studyTarget: 'en' | 'fr';
  readonly lang: AiOutputLang;
  readonly active: number;
  readonly ready: number;
  readonly corrected: number;
  readonly mistakes7d: number;
  readonly mistakesPrevious7d: number;
  readonly facets: readonly Counted<string>[];
  readonly sources: readonly Counted<string>[];
  readonly topPhrases: readonly Readonly<{ phrase: string; count: number; facet: string }>[];
  readonly day: string;
}

const int = (value: unknown, max = 100_000): number => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 0 ? Math.min(max, n) : 0;
};

function counted(list: unknown, field: string, allowed: Set<string>, max: number): Counted<string>[] {
  if (!Array.isArray(list)) return [];
  const out: Counted<string>[] = [];
  for (const item of list) {
    const key = String((item as Record<string, unknown> | null)?.[field] ?? '');
    if (!allowed.has(key)) continue;
    out.push({ key, count: int((item as Record<string, unknown>).count) });
    if (out.length >= max) break;
  }
  return out;
}

export function cleanSummary(data: Record<string, unknown>, nowMs: number = Date.now()): CleanSummary {
  // lang: строгий список AiOutputLang (неизвестный → invalid-argument).
  const lang = resolveAiOutputLang(String(data.lang ?? 'ru'), 'mistake_explain');
  // studyTarget: сводится к конечному набору en|fr (es/de клиента → en, как и раньше).
  const studyTarget = resolveStudyTarget(data.studyTarget);
  const topPhrases: Array<Readonly<{ phrase: string; count: number; facet: string }>> = [];
  if (Array.isArray(data.topPhrases)) {
    for (const item of data.topPhrases) {
      const record = (item ?? {}) as Record<string, unknown>;
      const phrase = String(record.phrase ?? '').trim().slice(0, MAX_PHRASE);
      const facet = String(record.facet ?? '');
      if (!phrase || !FACETS.has(facet)) continue;
      topPhrases.push({ phrase, count: int(record.count), facet });
      if (topPhrases.length >= MAX_TOP) break;
    }
  }
  return {
    studyTarget,
    lang,
    active: int(data.active),
    ready: int(data.ready),
    corrected: int(data.corrected),
    mistakes7d: int(data.mistakes7d),
    mistakesPrevious7d: int(data.mistakesPrevious7d),
    facets: counted(data.facets, 'facet', FACETS, MAX_FACETS),
    sources: counted(data.sources, 'source', SOURCES, MAX_SOURCES),
    topPhrases,
    // зачем: PM-231 — день из тела запроса НЕ доверяем: подставляя новый `day`,
    // любой вошедший получал платную генерацию на каждый вызов. День считает
    // сервер (UTC), поле `day` клиента игнорируется.
    day: serverUtcDayKey(nowMs),
  };
}

/** UTC-день YYYY-MM-DD — единственный источник окна «раз в сутки». */
export function serverUtcDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

const LANG_NAME: Record<AiOutputLang, string> = {
  ru: 'Russian', uk: 'Ukrainian', es: 'Spanish', 'pt-BR': 'Brazilian Portuguese',
  vi: 'Vietnamese', id: 'Indonesian', tr: 'Turkish', pl: 'Polish', en: 'English',
};

function buildPrompt(summary: CleanSummary): string {
  const facets = summary.facets.map((item) => `${item.key}: ${item.count}`).join(', ') || 'none';
  const sources = summary.sources.map((item) => `${item.key}: ${item.count}`).join(', ') || 'none';
  const phrases = summary.topPhrases.map((item) => `"${item.phrase}" (${item.facet}, x${item.count})`).join('; ') || 'none';
  return [
    `You write two short observations for a language learner's "Mistakes" screen. The learner studies ${studyTargetName(summary.studyTarget)}.`,
    `Write ONLY in ${LANG_NAME[summary.lang]}. Speak directly to the learner ("you"). Warm adult tone: an observation, never a reproach, no exclamation marks, no emoji, no praise filler.`,
    'Do not use grammar terminology (no "auxiliary", "infinitive", "conjugation"). Name the pattern in plain words, e.g. "questions with do", "the ending -s", "word order in questions".',
    'Do not mention that you are an AI. Do not mention percentages unless they are in the data. Do not invent phrases that are not in the data.',
    'Return strict JSON: {"hub": string, "map": string}.',
    `"hub" (max ${MAX_HUB_CHARS} characters): the single most useful observation about WHERE the learner slips most, grounded in the top facet and top phrases, ending with a gentle suggestion where to start.`,
    `"map" (max ${MAX_MAP_CHARS} characters): one sentence about where the mistakes come from (sources) or how the week compares to the previous one. If sources are "none", write about the week instead.`,
    '',
    'DATA (last 30 days):',
    `active mistakes: ${summary.active}; ready to practise now: ${summary.ready}; fixed for good: ${summary.corrected}`,
    `mistakes this week: ${summary.mistakes7d}; previous week: ${summary.mistakesPrevious7d}`,
    `by type (most frequent first): ${facets}`,
    `by source: ${sources}`,
    `most repeated phrases: ${phrases}`,
  ].join('\n');
}

function parseAdvice(text: string): { hub: string; map: string } | null {
  try {
    const parsed = JSON.parse(text) as { hub?: unknown; map?: unknown };
    const hub = String(parsed.hub ?? '').trim().slice(0, MAX_HUB_CHARS + 40);
    const map = String(parsed.map ?? '').trim().slice(0, MAX_MAP_CHARS + 40);
    return hub ? { hub, map } : null;
  } catch {
    return null;
  }
}

export const mistakeHubAdvice = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 30,
  memory: '512MiB',
  maxInstances: 10,
  secrets: [OPENAI_API_KEY],
}, async (request): Promise<MistakeHubAdviceResponse> => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) throw new HttpsError('failed-precondition', 'openai_key_missing');
  const db = admin.firestore();
  if (await aiGloballyDisabled(db)) throw new HttpsError('failed-precondition', 'ai_globally_disabled');
  const nowMs = Date.now();
  const summary = cleanSummary((request.data ?? {}) as Record<string, unknown>, nowMs);
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid);

  // Кэш: одна генерация на (stableUid, UTC-день, lang, studyTarget). Повтор - бесплатно.
  const ref = db.collection(CACHE_COLLECTION).doc(stableUid);
  const cached = (await ref.get()).data() // guard-ok: чтение ОДНОГО документа по id, не коллекции as Partial<{ day: string; lang: string; studyTarget: string; hub: string; map: string }> | undefined;
  if (cached && cached.day === summary.day && cached.lang === summary.lang && cached.studyTarget === summary.studyTarget && typeof cached.hub === 'string' && cached.hub) {
    return { ok: true, hub: cached.hub, map: typeof cached.map === 'string' ? cached.map : '', fromCache: true };
  }

  const jobCfg = await resolveJobConfig(db, 'explain');
  if (!jobCfg.enabled) {
    console.warn('[AI-LIMIT] mistake_hub_advice early-exit', { reason: 'ai_job_disabled' });
    throw new HttpsError('failed-precondition', 'ai_job_disabled');
  }

  // зачем: PM-231 — кэш держит одну запись на ученика, поэтому смена lang/studyTarget
  // по кругу давала бесконечные платные генерации. Суточный потолок генераций
  // (только cache-miss) ставим ДО OpenAI. Легитимно хватает 1 в день; 3 — запас
  // на смену языка интерфейса/цели. Кэш-хиты выше лимит не тратят.
  let reservation: FreeJobGenReservation | null;
  try {
    reservation = await enforceFreeJobGenLimit(HUB_ADVICE_JOB, authUid, stableUid, HUB_ADVICE_DAILY_GEN_CAP, nowMs);
    // зачем (Ревизор 18.10, аудит п.4): общий дневной потолок ПЛАТНЫХ генераций советов — 2000 на всё приложение (кэш не считается).
    await enforceCallerRateWindow({ scope: 'hub_advice_global', authUid: '__all__', rawRequest: null, maxPerUid: 2000, maxPerIp: 0, windowMs: 24 * 60 * 60 * 1000 });
    // зачем (Ревизор 18.10, аудит п.3): потолок ПЛАТНЫХ генераций советов на IP в сутки (открытие хаба из кэша не считается).
    await enforceCallerRateWindow({ scope: 'hub_advice_ip', authUid, rawRequest: request.rawRequest, maxPerUid: 0, maxPerIp: 30, windowMs: 24 * 60 * 60 * 1000 });
  } catch (limitError) {
    console.warn('[AI-LIMIT] mistake_hub_advice daily cap refused', {
      reason: limitError instanceof HttpsError ? limitError.message : 'limit_check_failed',
      cap: HUB_ADVICE_DAILY_GEN_CAP,
      day: summary.day,
    });
    throw limitError;
  }

  let gen: Awaited<ReturnType<typeof openAiChat>>;
  try {
    gen = await openAiChat({
      apiKey,
      model: jobCfg.model,
      messages: [{ role: 'user', content: buildPrompt(summary) }],
      maxTokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      responseFormat: { type: 'json_object' },
      // Одна попытка под потолок функции 30с (раньше 3×30с — дольше самой функции).
      maxAttempts: 1,
      timeoutMs: PAID_AI_FETCH_TIMEOUT_MS.mistakeHubAdvice,
    });
  } catch (providerError) {
    // Ответа нет → генерации не было: возвращаем кредит дня.
    console.warn('[AI-LIMIT] mistake_hub_advice provider failed, refunding credit', {
      reason: providerError instanceof HttpsError ? providerError.message : 'provider_exception',
    });
    if (reservation) {
      await refundFreeJobGenLimit(reservation).catch((refundError) => {
        console.error('[AI-LIMIT] mistake_hub_advice refund failed', {
          reason: String((refundError as Error)?.message ?? refundError).slice(0, 200),
        });
      });
    }
    throw providerError;
  }

  // Токены уже оплачены — биллинг пишем ДО проверок парсинга/языка. Сбой записи
  // логируем, но ответ ученику не роняем (как premium_dialog).
  await db.collection(BILLING_COLLECTION).doc().set({
    uid: stableUid,
    authUid,
    operation: 'mistake_hub_advice',
    model: jobCfg.model,
    promptTokens: gen.promptTokens,
    completionTokens: gen.completionTokens,
    totalTokens: gen.promptTokens + gen.completionTokens,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
  }).catch((billingError) => {
    console.error('[AI-LIMIT] mistake_hub_advice billing write failed', {
      reason: String((billingError as Error)?.message ?? billingError).slice(0, 200),
      promptTokens: gen.promptTokens,
      completionTokens: gen.completionTokens,
    });
  });

  const parsed = parseAdvice(gen.text);
  if (!parsed) {
    console.warn('[AI-LIMIT] mistake_hub_advice early-exit', { reason: 'advice_parse_failed' });
    throw new HttpsError('internal', 'advice_parse_failed');
  }
  // Языковой контракт: текст обязан быть на языке интерфейса ученика.
  assertAiOutputLanguage({ text: parsed.hub, targetLang: summary.lang, feature: 'mistake_explain' });
  if (parsed.map) assertAiOutputLanguage({ text: parsed.map, targetLang: summary.lang, feature: 'mistake_explain' });

  await ref.set({
    day: summary.day,
    lang: summary.lang,
    studyTarget: summary.studyTarget,
    hub: parsed.hub,
    map: parsed.map,
    model: jobCfg.model,
    promptTokens: gen.promptTokens,
    completionTokens: gen.completionTokens,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: false });
  return { ok: true, hub: parsed.hub, map: parsed.map, fromCache: false };
});

/**
 * mistakeHubAdvice — одна фраза-наблюдение о слабом месте ученика для хаба
 * «Работа над ошибками» и одна о карте источников ошибок.
 *
 * зачем (владелец 2026-09-14): «ИИ раз в сутки», текст готов до открытия
 * раздела. Кап стоимости: ОДНА генерация на (stableUid, локальный день) - повтор
 * в тот же день отдаёт кэш из Firestore независимо от изменившихся цифр.
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

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const REGION = 'us-central1';
const CACHE_COLLECTION = 'mistake_hub_advice';
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

function cleanSummary(data: Record<string, unknown>): CleanSummary {
  const lang = resolveAiOutputLang(String(data.lang ?? 'ru'), 'mistake_explain');
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
  const day = String(data.day ?? '').trim();
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
    // Локальный день клиента задаёт окно «раз в сутки»; без него - UTC.
    day: /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : new Date().toISOString().slice(0, 10),
  };
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
  const summary = cleanSummary((request.data ?? {}) as Record<string, unknown>);
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid);

  // Кэш: одна генерация на (stableUid, день). Повтор в тот же день - бесплатно.
  const ref = db.collection(CACHE_COLLECTION).doc(stableUid);
  const cached = (await ref.get()).data() // guard-ok: чтение ОДНОГО документа по id, не коллекции as Partial<{ day: string; lang: string; studyTarget: string; hub: string; map: string }> | undefined;
  if (cached && cached.day === summary.day && cached.lang === summary.lang && cached.studyTarget === summary.studyTarget && typeof cached.hub === 'string' && cached.hub) {
    return { ok: true, hub: cached.hub, map: typeof cached.map === 'string' ? cached.map : '', fromCache: true };
  }

  const jobCfg = await resolveJobConfig(db, 'explain');
  if (!jobCfg.enabled) throw new HttpsError('failed-precondition', 'ai_job_disabled');

  const gen = await openAiChat({
    apiKey,
    model: jobCfg.model,
    messages: [{ role: 'user', content: buildPrompt(summary) }],
    maxTokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    responseFormat: { type: 'json_object' },
  });
  const parsed = parseAdvice(gen.text);
  if (!parsed) throw new HttpsError('internal', 'advice_parse_failed');
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

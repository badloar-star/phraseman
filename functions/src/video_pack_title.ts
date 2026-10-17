// ═══════════════════════════════════════════════════════════════════════════
// video_pack_title.ts — автоназвание набора карточек из фраз ролика (2–3 слова, на 9 языках).
//
// зачем (владелец 17.10, R110): «Для всех наборов видео, которые добавляются, название придумывается всегда автоматически.
// В админке, когда я добавляю фразы к видео, там же сразу генерируется название набора — не более 2–3 слов, объясняющее,
// что в наборе (типа „Знаешь, как-то так“)». Раньше название набора = имя файла документа («… 500 фраз.docx»).
//
// Здесь: чистые правила (нормализация, промпт, разбор ответа) — тестируются без сети, и admin-callable
// adminSuggestVideoPackTitle, который зовёт тот же OpenAI-ключ и тот же openAiChat, что adminTranslateMessage.
// Новых ключей нет. Callable только предлагает — пишет админ при сохранении черновика (adminSaveVideoPhraseDraft.packTitles).
// Лог [VIDEO-PACK-TITLE].
// ═══════════════════════════════════════════════════════════════════════════
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { openAiChat } from './explain/explain_provider';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { aiOperationUsageSink } from './ai_operation_billing';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';

const REGION = 'us-central1';
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const MODEL = 'gpt-4.1-mini';
const LOG = '[VIDEO-PACK-TITLE]';

/** Суффиксы полей набора: Ru → titleRu … Pl → titlePl (app/flashcards/marketplace.ts PACK_TITLE_FIELD_BY_LANG + En). */
export const VIDEO_PACK_TITLE_LANGS = [
  { key: 'Ru', name: 'Russian' },
  { key: 'Uk', name: 'Ukrainian' },
  { key: 'En', name: 'English' },
  { key: 'Es', name: 'Spanish' },
  { key: 'PtBr', name: 'Brazilian Portuguese' },
  { key: 'Vi', name: 'Vietnamese' },
  { key: 'Id', name: 'Indonesian' },
  { key: 'Tr', name: 'Turkish' },
  { key: 'Pl', name: 'Polish' },
] as const;
export type VideoPackTitleLang = (typeof VIDEO_PACK_TITLE_LANGS)[number]['key'];
export type VideoPackTitles = Readonly<Record<VideoPackTitleLang, string>>;

/** 2–3 слова → до 40 знаков с запасом на длинные языки; больше — это уже не название. */
export const VIDEO_PACK_TITLE_MAX_CHARS = 40;
export const VIDEO_PACK_TITLE_MAX_WORDS = 4;
const MAX_PROMPT_PHRASES = 40;
const MAX_AVOID = 10;

/** Одна строка названия: без кавычек, точек в конце, переносов; обрезка по длине. */
export function cleanVideoPackTitle(value: unknown): string {
  const text = String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/^[\s"'«»“”„`]+|[\s"'«»“”„`.]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return text.slice(0, VIDEO_PACK_TITLE_MAX_CHARS).trim();
}

/**
 * Названия набора из запроса/ответа модели/документа версии. Ru обязателен (иначе null).
 * Пустой язык получает Ru — маппер каталога (communityFirestore) и витрина читают поле своего языка,
 * и пустое поле показало бы код набора вместо названия.
 */
export function normalizeVideoPackTitles(raw: unknown): VideoPackTitles | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const ru = cleanVideoPackTitle(record.Ru ?? record.ru);
  if (!ru) return null;
  const out = {} as Record<VideoPackTitleLang, string>;
  for (const { key } of VIDEO_PACK_TITLE_LANGS) {
    const lower = key === 'PtBr' ? 'ptBr' : key.toLowerCase();
    out[key] = cleanVideoPackTitle(record[key] ?? record[lower]) || ru;
  }
  return out;
}

type PromptPhrase = Readonly<{ phrase?: unknown; translation?: unknown }>;

export function buildVideoPackTitlePrompt(phrases: readonly PromptPhrase[], avoid: readonly string[]): string {
  const sample = phrases.slice(0, MAX_PROMPT_PHRASES)
    .map((p, i) => `${i + 1}. ${String(p.phrase ?? '').trim()} — ${String(p.translation ?? '').trim()}`)
    .join('\n');
  const langs = VIDEO_PACK_TITLE_LANGS.map((l) => `"${l.key}": ${l.name}`).join(', ');
  return [
    'You name flashcard packs in a language-learning app. A pack is a set of spoken phrases taken from one video.',
    'Write ONE short, lively pack title of 2–3 words that tells what the phrases are about or how they sound —',
    'like a natural spoken expression, e.g. Russian «Знаешь, как-то так», «Вежливый отказ», «Болтаем в кафе».',
    'Rules:',
    '- 2–3 words, at most 4 in any language; no quotes, no emoji, no trailing period, no numbers, no word "phrases"/"фразы".',
    '- Write the Russian title first (it is the source), then give a natural equivalent (not word-for-word) in every language.',
    avoid.length ? `- Must be clearly different from these previous suggestions: ${avoid.map((a) => `«${a}»`).join(', ')}.` : '',
    `Languages (JSON key → language): ${langs}.`,
    'Phrases (target language — Russian translation):',
    sample,
    '',
    `Respond with STRICT JSON only: { ${VIDEO_PACK_TITLE_LANGS.map((l) => `"${l.key}": "..."`).join(', ')} }`,
  ].filter(Boolean).join('\n');
}

/** Разбор ответа модели: не-JSON или пустой Ru → понятная ошибка с обрезком сырого ответа (не глухое INTERNAL). */
export function parseVideoPackTitleResponse(text: string): VideoPackTitles {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text || '{}');
  } catch {
    throw new HttpsError('failed-precondition', `ИИ не вернул название в нужном формате: ${String(text || '').trim().slice(0, 200)}`);
  }
  const titles = normalizeVideoPackTitles(parsed);
  if (!titles) throw new HttpsError('failed-precondition', 'ИИ вернул пустое название');
  return titles;
}

function requireVideoTitleAdmin(request: CallableRequest<unknown>): string {
  if (!request.auth?.uid || !request.auth.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const token = request.auth.token as Record<string, unknown>;
  const role: AdminRole = hasAdminRole(token.adminRole) ? token.adminRole : 'owner';
  if (!hasPermission(role, 'content.draft.write')) throw new HttpsError('permission-denied', 'Role cannot name video packs');
  return request.auth.uid;
}

/**
 * Предложить название набора по фразам. Ничего не пишет (запись — при сохранении черновика).
 * Вход: { videoId, phrases: [{phrase, translation}], avoid?: string[] } — avoid = прошлые варианты для «Другой вариант».
 */
export const adminSuggestVideoPackTitle = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 60,
  memory: '256MiB',
  maxInstances: 3,
  secrets: [OPENAI_API_KEY],
}, async (request) => {
  const uid = requireVideoTitleAdmin(request);
  const data = (request.data ?? {}) as Record<string, unknown>;
  const videoId = String(data.videoId ?? '').trim().slice(0, 20);
  const phrases = (Array.isArray(data.phrases) ? data.phrases : [])
    .filter((p): p is PromptPhrase => !!p && typeof p === 'object')
    .filter((p) => String(p.phrase ?? '').trim());
  const avoid = (Array.isArray(data.avoid) ? data.avoid : []).map((a) => cleanVideoPackTitle(a)).filter(Boolean).slice(0, MAX_AVOID);
  console.log(LOG, 'suggest:in', JSON.stringify({ uid, videoId, phrases: phrases.length, avoid: avoid.length }));
  if (!phrases.length) {
    console.warn(LOG, 'suggest:reject no_phrases', JSON.stringify({ videoId }));
    throw new HttpsError('invalid-argument', 'no_phrases');
  }
  const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    console.error(LOG, 'suggest:reject openai_key_missing');
    throw new HttpsError('failed-precondition', 'openai_key_missing');
  }
  const startedAt = Date.now();
  let gen: Awaited<ReturnType<typeof openAiChat>>;
  try {
    gen = await openAiChat({
      apiKey,
      model: MODEL,
      onUsage: aiOperationUsageSink('admin_video_pack_title', MODEL),
      messages: [{ role: 'user', content: buildVideoPackTitlePrompt(phrases, avoid) }],
      maxTokens: 400,
      // зачем: «Другой вариант» должен давать другой вариант — температура выше, чем у перевода
      temperature: avoid.length ? 1 : 0.8,
      responseFormat: { type: 'json_object' },
      timeoutMs: 25_000,
    });
  } catch (error) {
    console.error(LOG, 'suggest:openai_failed', JSON.stringify({ videoId, ms: Date.now() - startedAt, error: String(error).slice(0, 200) }));
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('unavailable', 'title_failed');
  }
  const titles = parseVideoPackTitleResponse(gen.text);
  console.log(LOG, 'suggest:out', JSON.stringify({ videoId, ms: Date.now() - startedAt, ru: titles.Ru, en: titles.En }));
  return { ok: true, titles };
});

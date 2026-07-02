// ════════════════════════════════════════════════════════════════════════════
// admin_translate.ts — переиспользуемый admin-callable авто-перевода текстов.
//
// Зачем: в админке мультиязычный контент (сообщения inbox, опросы, VIP-survey,
// broadcast) раньше приходилось переводить вручную или вовсе отправлять только на
// RU — у части аудитории письма были пустыми. Здесь один callable, который берёт
// RU-исходник и возвращает переводы на все языки приложения одним запросом к OpenAI.
//
// Доступ: ТОЛЬКО админ (request.auth.token.admin === true) — ключ OpenAI никогда не
// уходит в браузер. Клиент шлёт массив строк (поля письма), получает по переводу на
// каждый целевой язык. Модель и kill-switch берутся из openai_jobs (job 'quiz' как
// дешёвый текстовый профиль), с безопасным дефолтом.
// ════════════════════════════════════════════════════════════════════════════
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { openAiChat } from './explain/explain_provider';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';

const REGION = 'us-central1';
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

// Целевые языки = языки приложения минус RU (исходник). Ключи совпадают с суффиксами
// полей Firestore: Uk → titleUk, PtBr → titlePtBr и т.д. (см. app/app_messages.ts).
const TARGET_LANGS: ReadonlyArray<{ key: string; name: string }> = [
  { key: 'Uk', name: 'Ukrainian' },
  { key: 'Es', name: 'Spanish' },
  { key: 'PtBr', name: 'Brazilian Portuguese' },
  { key: 'Vi', name: 'Vietnamese' },
  { key: 'Id', name: 'Indonesian' },
  { key: 'Tr', name: 'Turkish' },
  { key: 'Pl', name: 'Polish' },
];

const DEFAULT_MODEL = 'gpt-4.1-mini';
const MAX_FIELDS = 20;
const MAX_FIELD_CHARS = 2000;
const MAX_OUTPUT_TOKENS = 4000;

function asText(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

type AdminTranslateRequest = {
  // Поля исходника на русском в фиксированном порядке. Пустые строки сохраняются как
  // пустые в каждом языке (нечего переводить).
  fields?: unknown;
  // Необязательная подсказка тона ("дружелюбное уведомление в приложении" и т.п.).
  context?: unknown;
};

type AdminTranslateResponse = {
  ok: true;
  // langKey (Uk/Es/...) → массив переводов той же длины, что и входной fields.
  translations: Record<string, string[]>;
};

function buildPrompt(fields: string[], context: string): string {
  const langList = TARGET_LANGS.map((l) => `"${l.key}": ${l.name}`).join(', ');
  const numbered = fields.map((f, i) => `${i}: ${JSON.stringify(f)}`).join('\n');
  return [
    'You are a professional localization engine for a language-learning mobile app.',
    context ? `Tone/context: ${context}` : 'Tone: friendly, concise in-app notification copy.',
    'Translate the following Russian source fields into each target language.',
    `Target languages (JSON key → language): ${langList}.`,
    'Rules:',
    '- Preserve meaning, tone and any emoji. Keep it natural, not literal.',
    '- Do NOT translate or alter placeholders, URLs, brand names (Phraseman) or numbers.',
    '- An empty source field must stay an empty string in every language.',
    '- Keep array order and length identical to the source.',
    'Source fields (index: text):',
    numbered,
    '',
    'Respond with STRICT JSON only, shape:',
    '{ "Uk": ["...", "..."], "Es": [...], "PtBr": [...], "Vi": [...], "Id": [...], "Tr": [...], "Pl": [...] }',
    'Each array MUST have exactly the same number of items as the source, in the same order.',
  ].join('\n');
}

function coerceArray(value: unknown, length: number, fallback: string[]): string[] {
  const arr = Array.isArray(value) ? value : [];
  return Array.from({ length }, (_, i) => {
    const raw = arr[i];
    const text = typeof raw === 'string' ? raw.trim() : '';
    // Пустой перевод фолбэчит на исходный RU — пустых полей в базе не будет.
    return text || fallback[i] || '';
  });
}

export const adminTranslateMessage = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 60,
  memory: '512MiB',
  maxInstances: 5,
  secrets: [OPENAI_API_KEY],
}, async (request): Promise<AdminTranslateResponse> => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError('permission-denied', 'admin_only');
  }
  const apiKey = asText(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
  if (!apiKey) throw new HttpsError('failed-precondition', 'openai_key_missing');

  const data = (request.data ?? {}) as AdminTranslateRequest;
  const rawFields = Array.isArray(data.fields) ? data.fields : [];
  if (!rawFields.length) throw new HttpsError('invalid-argument', 'no_fields');
  if (rawFields.length > MAX_FIELDS) throw new HttpsError('invalid-argument', 'too_many_fields');
  const fields = rawFields.map((f) => asText(f, MAX_FIELD_CHARS));
  const context = asText(data.context, 200);

  // Нечего переводить (все поля пустые) → возвращаем пустые массивы без вызова OpenAI.
  if (fields.every((f) => !f)) {
    const empty: Record<string, string[]> = {};
    TARGET_LANGS.forEach((l) => { empty[l.key] = fields.map(() => ''); });
    return { ok: true, translations: empty };
  }

  let gen: Awaited<ReturnType<typeof openAiChat>>;
  try {
    gen = await openAiChat({
      apiKey,
      model: DEFAULT_MODEL,
      messages: [{ role: 'user', content: buildPrompt(fields, context) }],
      maxTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.2,
      responseFormat: { type: 'json_object' },
    });
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    throw new HttpsError('unavailable', 'translate_failed');
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(gen.text || '{}') as Record<string, unknown>;
  } catch {
    throw new HttpsError('internal', 'translate_bad_json');
  }

  const translations: Record<string, string[]> = {};
  TARGET_LANGS.forEach((l) => {
    translations[l.key] = coerceArray(parsed[l.key], fields.length, fields);
  });

  return { ok: true, translations };
});

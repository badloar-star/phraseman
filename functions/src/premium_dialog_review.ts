import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { resolveConfiguredDialogModel, modelSupportsJsonObject } from './openai_dialog_model_config';
import { enforceRateLimit, asInterfaceLang } from './premium_dialog';
import { resolveStudyTarget, studyTargetName, type StudyTarget } from './ai_language_contract';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

/**
 * premiumDialogReview — финальный «разбор полётов» завершённого ИИ-диалога.
 *
 * Замысел фичи (владелец): когда диалог окончен, ученик получает не только
 * игровой вердикт, но и мягкий, вежливый разбор ВСЕХ его языковых ошибок:
 * «ты сказал так → естественнее сказать так, потому что …» — на родном языке,
 * без грамматического жаргона, с похвалой за то, что получилось.
 *
 * Отдельный callable (а не поле в игровом конверте premiumDialogSend), потому что:
 *   • разбор нужен один раз за диалог — раздувать бюджет токенов КАЖДОГО хода нельзя;
 *   • терминальный ход заранее неизвестен;
 *   • разбор работает и для «нейтрального» финала (юзер сам нажал «Завершить»).
 *
 * НЕ в deploy:safe whitelist — деплой прицельно:
 *   firebase deploy --only functions:premiumDialogReview
 */

const REGION = 'us-central1';
const BILLING_COLLECTION = 'premium_dialog_billing';
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

const MAX_REVIEW_TURNS = 40;
const MAX_TURN_CHARS = 600;
const MAX_REVIEW_OUTPUT_TOKENS = 900;
const MAX_CORRECTIONS = 8;

const LEARNER_LANG_NAME: Record<string, string> = {
  ru: 'Russian',
  uk: 'Ukrainian',
  es: 'Spanish',
  'pt-BR': 'Brazilian Portuguese',
  vi: 'Vietnamese',
  id: 'Indonesian',
  tr: 'Turkish',
  pl: 'Polish',
  en: 'English',
};

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface DialogReviewRequest {
  history?: unknown;
  cefr?: unknown;
  interfaceLang?: unknown;
  scenarioId?: unknown;
  goalEn?: unknown;
  ageBracket?: unknown;
  /** Language being LEARNED (StudyTarget 'en'|'fr'). Absent/unknown ⇒ 'en' (backward compatible). */
  studyTarget?: unknown;
  /**
   * 'text' (default, backward compatible) — обычный текстовый ИИ-диалог.
   * 'voice' (МАКС ПЛАН §6.2) — разбор транскрипта голосового MAX-звонка:
   * реплики произнесены, а не напечатаны, поэтому промпт разбора мягче к
   * спонтанной устной речи (filler words, сокращения) и жёстче к грамматике,
   * которую слышно на слух.
   */
  mode?: unknown;
}

/** Одно исправление: фраза ученика → естественный вариант + короткое пояснение. */
export interface DialogReviewCorrection {
  original: string;
  corrected: string;
  note: string;
  /**
   * 'fix' — ошибка (по умолчанию); 'polish' — реплика верна, но есть более
   * естественный вариант. Только voice-режим (МАКС-звонок): владелец
   * 2026-08-16 — «разбор ничего не разбирает с точки зрения грамматики»:
   * когда ученик сказал две правильные фразы, разбор состоял из одной похвалы.
   */
  kind?: 'fix' | 'polish';
}

export interface DialogReviewResult {
  praise: string;
  corrections: DialogReviewCorrection[];
  tip: string;
}

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function asCefr(value: unknown): string {
  const c = text(value, 2).toUpperCase();
  return ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(c) ? c : 'A2';
}

export type DialogReviewMode = 'text' | 'voice';

/** Неизвестное/отсутствующее значение ⇒ 'text' — обратная совместимость со старыми клиентами. */
export function asReviewMode(value: unknown): DialogReviewMode {
  return text(value, 8) === 'voice' ? 'voice' : 'text';
}

function sanitizeReviewHistory(value: unknown): ChatTurn[] {
  if (!Array.isArray(value)) return [];
  const result: ChatTurn[] = [];
  for (const raw of value.slice(-MAX_REVIEW_TURNS)) {
    const item = (raw ?? {}) as Record<string, unknown>;
    const role = text(item.role, 12);
    const content = text(item.content, MAX_TURN_CHARS);
    if ((role === 'user' || role === 'assistant') && content) {
      result.push({ role, content });
    }
  }
  return result;
}

/** [[...]]-маркеры ключевых фраз в транскрипте только мешают ревью — снимаем. */
function stripKeyPhraseMarkers(value: string): string {
  return value.replace(/\[\[|\]\]/g, '');
}

export function buildReviewSystemPrompt(
  cefr: string,
  learnerLangName: string,
  goalEn: string,
  studyTarget: StudyTarget = 'en',
  mode: DialogReviewMode = 'text',
): string {
  const goalLine = goalEn ? `\nThe scenario goal was: ${goalEn}.` : '';
  const targetName = studyTargetName(studyTarget);
  // voice: транскрипт — это ASR-текст произнесённой речи, а не напечатанный текст.
  // Модели нужно явно сказать не путать эти два жанра ошибок, иначе она либо
  // придирается к устной речи как к письму (жалуется на "um", отсутствие точек),
  // либо наоборот тихо прощает реальные грамматические/лексические ошибки,
  // спрятанные среди естественных заминок разговорной речи.
  const modeLine =
    mode === 'voice'
      ? `\nThis transcript is from a SPOKEN phone call (speech-to-text), not written chat. Do NOT flag spoken-only features as mistakes: filler words ("um", "uh", "like"), false starts the learner self-corrected, informal contractions, or missing punctuation/capitalization — that is just how speech sounds and text-to-speech is transcribed. DO still flag real grammar, word choice, and word order mistakes that a listener would actually notice in speech.`
      : '';
  // зачем: владелец 2026-08-16 — разбор после звонка «ничего не разбирает».
  // Даже когда все реплики верны, ученику нужен материал: как это сказал бы
  // носитель на его уровне. Такие пункты помечаются "kind":"polish" (клиент
  // не зачёркивает исходник) и всегда идут ПОСЛЕ настоящих ошибок.
  const polishRule =
    mode === 'voice'
      ? `\n- Every learner line deserves a look. If a line is grammatically fine but a native speaker at level ${cefr} would say it more naturally, add an item with "kind": "polish": "original" = the learner's line, "corrected" = the more natural version, "note" = one warm sentence in ${learnerLangName} that clearly says the line was already correct and this is just a nicer way to say it. Mistakes are "kind": "fix" (or omit "kind"). Add at most 3 polish items and put them AFTER all real mistakes.`
      : '';
  return `You are a warm, encouraging ${targetName} tutor inside the Phraseman language app. A learner has just finished a practice conversation with a role-play partner. Your job is a short, kind debrief of the learner's ${targetName}.${goalLine}${modeLine}
The learner's level is ${cefr}. The learner's native language is ${learnerLangName}.

Review ONLY the learner's lines. Respond with a single JSON object and nothing else:
{"praise": "...", "corrections": [{"original": "...", "corrected": "...", "note": "..."}], "tip": "..."}

Rules:
- "praise": 1-2 warm, specific sentences in ${learnerLangName} about what the learner genuinely did well (a phrase they used, politeness, persistence). Never invent things they did not say, never use empty flattery.
- "corrections": go through EVERY learner line. For each line with a language mistake add one item:
  - "original": the learner's line exactly as they wrote it (shorten to the broken part if the line is long);
  - "corrected": the natural ${targetName} a friendly native speaker would use for the same idea, kept at level ${cefr};
  - "note": ONE short, kind sentence in ${learnerLangName} explaining the fix in everyday words — no grammar jargon, no mockery, never shame the learner.
  Skip lines that are already fine. At most ${MAX_CORRECTIONS} items — if there are more mistakes, pick the most useful ones.
- "tip": one short, practical suggestion in ${learnerLangName} for the next conversation; quote any recommended ${targetName} phrase in ${targetName}.
- Comment ONLY on language. Never scold the learner for rudeness, topics, or how the scene went.
- If every learner line is fine, return "corrections": [] and make "praise" a bit warmer.${polishRule}`;
}

interface OpenAIChatResponse {
  choices?: { message?: { content?: unknown } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

/**
 * Разбор JSON-ответа ревью. Бережный: снимает ```-ограждения, режет длины,
 * отбрасывает битые элементы. null — совсем не распарсилось.
 */
export function parseReviewEnvelope(raw: string): DialogReviewResult | null {
  const unfenced = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(unfenced) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const rawCorrections = Array.isArray(parsed.corrections) ? parsed.corrections : [];
  const corrections: DialogReviewCorrection[] = [];
  for (const item of rawCorrections.slice(0, MAX_CORRECTIONS)) {
    const c = (item ?? {}) as Record<string, unknown>;
    const original = text(c.original, 300);
    const corrected = text(c.corrected, 300);
    if (!original || !corrected) continue;
    const kind = text(c.kind, 10) === 'polish' ? 'polish' : 'fix';
    corrections.push({ original, corrected, note: text(c.note, 300), kind });
  }

  const praise = text(parsed.praise, 500);
  const tip = text(parsed.tip, 400);
  if (!praise && corrections.length === 0 && !tip) return null;
  return { praise, corrections, tip };
}

export const premiumDialogReview = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 30,
  memory: '256MiB',
  maxInstances: 20,
  secrets: [OPENAI_API_KEY],
}, async (request) => {
  if (!request.auth?.uid) {
    console.warn('premium_dialog_review rejected', { reason: 'auth_required' });
    throw new HttpsError('unauthenticated', 'auth_required');
  }

  const data = (request.data ?? {}) as DialogReviewRequest;

  const history = sanitizeReviewHistory(data.history);
  const learnerTurns = history.filter((t) => t.role === 'user');
  if (learnerTurns.length === 0) {
    console.warn('premium_dialog_review rejected', { reason: 'history_required' });
    throw new HttpsError('invalid-argument', 'history_required');
  }

  const apiKey = text(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
  if (!apiKey) {
    console.error('premium_dialog_review rejected', { reason: 'openai_key_missing' });
    throw new HttpsError('failed-precondition', 'openai_key_missing');
  }

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid);

  // Общий rate-limit с send/translate: разбор — один вызов на диалог, окна хватает.
  await enforceRateLimit(authUid, stableUid);

  const cefr = asCefr(data.cefr);
  const interfaceLang = asInterfaceLang(data.interfaceLang);
  const learnerLangName = LEARNER_LANG_NAME[interfaceLang] ?? LEARNER_LANG_NAME.ru;
  const goalEn = text(data.goalEn, 200);
  const studyTarget = resolveStudyTarget(data.studyTarget);
  const mode = asReviewMode(data.mode);

  const transcript = history
    .map((t) => `${t.role === 'user' ? 'Learner' : 'Partner'}: ${stripKeyPhraseMarkers(t.content)}`)
    .join('\n');

  const dialogModel = await resolveConfiguredDialogModel(db, process.env.OPENAI_DIALOG_MODEL);
  const useJsonFormat = modelSupportsJsonObject(dialogModel);

  let json: OpenAIChatResponse;
  let review: DialogReviewResult | null;
  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: dialogModel,
        max_tokens: MAX_REVIEW_OUTPUT_TOKENS,
        // Разбор — аналитическая задача: низкая температура ради точности цитат.
        temperature: 0.3,
        messages: [
          { role: 'system', content: buildReviewSystemPrompt(cefr, learnerLangName, goalEn, studyTarget, mode) },
          { role: 'user', content: transcript },
        ],
        ...(useJsonFormat ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('premium_dialog_review chat failed', {
        status: response.status,
        model: dialogModel,
        scenarioId: text(data.scenarioId, 80) || null,
        detail: detail.slice(0, 500),
      });
      throw new HttpsError('unavailable', 'dialog_provider_failed');
    }

    json = (await response.json()) as OpenAIChatResponse;
    review = parseReviewEnvelope(text(json.choices?.[0]?.message?.content, 6000));
    if (!review) {
      console.error('premium_dialog_review unparseable reply', {
        model: dialogModel,
        scenarioId: text(data.scenarioId, 80) || null,
      });
      throw new HttpsError('unavailable', 'dialog_provider_failed');
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('premium_dialog_review provider exception', {
      model: dialogModel,
      scenarioId: text(data.scenarioId, 80) || null,
      error: String((error as Error)?.message ?? error).slice(0, 500),
    });
    throw new HttpsError('unavailable', 'dialog_provider_failed');
  }

  const usage = json.usage ?? {};
  await db.collection(BILLING_COLLECTION).doc().set({
    uid: stableUid,
    authUid,
    // 'review' — старое захардкоженное значение поля, использовавшееся ДО
    // ветки voice: биллинг-дашборды на него уже завязаны, поэтому оставляем
    // как есть и добавляем настоящий режим отдельным полем reviewMode.
    mode: 'review',
    reviewMode: mode,
    model: dialogModel,
    cefr,
    scenarioId: text(data.scenarioId, 80) || null,
    promptTokens: Number(usage.prompt_tokens ?? 0),
    completionTokens: Number(usage.completion_tokens ?? 0),
    totalTokens: Number(usage.total_tokens ?? 0),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
  }).catch(() => {});

  return { ok: true, ...review };
});

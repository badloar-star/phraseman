import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { ADMIN_ALERT_BOT_TOKEN } from './admin_alerts';
import { resolveConfiguredDialogModel, modelSupportsJsonObject } from './openai_dialog_model_config';
import {
  applyTutorMemoryUpdate,
  sanitizeTutorSessionId,
  type TutorMemory,
  type TutorMemoryUpdate,
} from './max_voice_tutor_memory';
import { reviewVoiceSafety, sanitizeClientSafetyFlags } from './max_voice_safety';
import { enforceRateLimit, asInterfaceLang } from './premium_dialog';
import { resolveStudyTarget, studyTargetName, type StudyTarget } from './ai_language_contract';
import { resolvePremiumAccess } from './premium_status';
import { resolveRemoteBool } from './remote_gates';

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
const MAX_TEXT_CORRECTIONS = 8;
const MAX_VOICE_CORRECTIONS = 3;

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
  /** tutor: домашка, которую учитель назначил инструментом assign_homework (клиент собрал). */
  homework?: unknown;
  /** tutor: тема следующего урока (set_next_topic). */
  nextTopic?: unknown;
  /** tutor: просьба ученика, как говорить (set_language_preference): more_target | more_native | default. */
  languagePreference?: unknown;
  /** voice/tutor: флаги учителя (инструмент flag_safety) — { kind, note }[]. */
  safetyFlags?: unknown;
  /** voice/tutor: id сессии звонка — дедуп сейфти-журнала с мгновенными репортами. */
  sessionId?: unknown;
  /** tutor: итоги повторения речи (mark_phrase_result) — { text, ok }[]. */
  phraseResults?: unknown;
  /** tutor: итог сцены-задачи (end_scene outcome). */
  sceneOutcome?: unknown;
  /** tutor: прогресс по текущей цели (mark_goal_progress) — { goalId, mastery }. */
  goalProgress?: unknown;
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

/** tutor: что модель извлекла для памяти учителя (voice_tutor_memory). */
export interface DialogReviewMemoryExtract {
  facts: string[];
  recurringErrors: string[];
  resolvedErrors: string[];
}

export interface DialogReviewResult {
  praise: string;
  corrections: DialogReviewCorrection[];
  tip: string;
  /** Только mode 'tutor'. */
  memory?: DialogReviewMemoryExtract;
}

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function asCefr(value: unknown): string {
  const c = text(value, 2).toUpperCase();
  return ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(c) ? c : 'A2';
}

export type DialogReviewMode = 'text' | 'voice' | 'tutor';

/** Неизвестное/отсутствующее значение ⇒ 'text' — обратная совместимость со старыми клиентами. */
export function asReviewMode(value: unknown): DialogReviewMode {
  const m = text(value, 8);
  return m === 'voice' || m === 'tutor' ? m : 'text';
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
  const maxCorrections = mode === 'text' ? MAX_TEXT_CORRECTIONS : MAX_VOICE_CORRECTIONS;
  // voice: транскрипт — это ASR-текст произнесённой речи, а не напечатанный текст.
  // Модели нужно явно сказать не путать эти два жанра ошибок, иначе она либо
  // придирается к устной речи как к письму (жалуется на "um", отсутствие точек),
  // либо наоборот тихо прощает реальные грамматические/лексические ошибки,
  // спрятанные среди естественных заминок разговорной речи.
  const modeLine =
    mode === 'voice' || mode === 'tutor'
      ? `\nThis transcript is from a SPOKEN phone call (speech-to-text), not written chat. Do NOT flag spoken-only features as mistakes: filler words ("um", "uh", "like"), false starts the learner self-corrected, informal contractions, or missing punctuation/capitalization. If a fragment is ambiguous or could plausibly be a speech-recognition error, skip it instead of inventing a correction. Never diagnose pronunciation from this transcript alone. DO still flag clear grammar, word choice, and word order mistakes that a listener would actually notice in speech.`
      : '';
  // зачем: учитель (вариант A) помнит ученика между уроками: разбор извлекает
  // факты и повторяющиеся ошибки для voice_tutor_memory. Урок двуязычный
  // (родной язык + английский): судим только английские попытки ученика.
  const tutorRule =
    mode === 'tutor'
      ? `\n- This was a LESSON with the learner's personal teacher ("Teacher" lines). The learner may speak partly in ${learnerLangName}; review ONLY their ${targetName} attempts (words and phrases in ${targetName}), never their ${learnerLangName} lines.
- Add a "memory" object for the teacher's notebook: {"facts": [...], "recurringErrors": [...], "resolvedErrors": [...]}.
  - "facts": up to 6 short ${targetName} notes about the learner's LIFE they told the teacher (name, city, job, hobbies, family, plans) — only what they actually said, no guesses, no lesson content. Empty array if nothing personal was said.
  - "recurringErrors": up to 5 short ${targetName} notes of language mistakes worth watching next time ("says 'I go yesterday' — past simple of go"), based on this transcript.
  - "resolvedErrors": mistakes the learner clearly got right today after being corrected earlier (short notes), else [].`
      : '';
  // зачем: владелец 2026-08-16 — разбор после звонка «ничего не разбирает».
  // Даже когда все реплики верны, ученику нужен материал: как это сказал бы
  // носитель на его уровне. Такие пункты помечаются "kind":"polish" (клиент
  // не зачёркивает исходник) и всегда идут ПОСЛЕ настоящих ошибок.
  const polishRule =
    mode === 'voice' || mode === 'tutor'
      ? `\n- Scan every learner line, but add at most 1 polish item. If a correct line has a clearly more natural version at level ${cefr}, use "kind": "polish", keep the learner's meaning, and say warmly in ${learnerLangName} that the original was already correct. Put it AFTER all real mistakes.`
      : '';
  return `You are a warm, encouraging ${targetName} tutor inside the Phraseman language app. A learner has just finished a practice conversation with a role-play partner. Your job is a short, kind debrief of the learner's ${targetName}.${goalLine}${modeLine}
The learner's level is ${cefr}. The learner's native language is ${learnerLangName}.

Review ONLY the learner's lines. Respond with a single JSON object and nothing else:
{"praise": "...", "corrections": [{"original": "...", "corrected": "...", "note": "..."}], "tip": "..."}

Rules:
- "praise": 1-2 warm, specific sentences in ${learnerLangName} about what the learner genuinely did well (a phrase they used, politeness, persistence). Never invent things they did not say, never use empty flattery.
- "corrections": scan all learner lines, then return only the most useful items for the next conversation:
  - "original": the learner's line exactly as they wrote it (shorten to the broken part if the line is long);
  - "corrected": the natural ${targetName} a friendly native speaker would use for the same idea, kept at level ${cefr};
  - "note": ONE short, kind sentence in ${learnerLangName} explaining the fix in everyday words — no grammar jargon, no mockery, never shame the learner.
  Skip lines that are already fine. At most ${maxCorrections} items total${mode === 'text' ? '' : ': one main focus plus up to two details'}.
- "tip": one short, practical suggestion in ${learnerLangName} for the next conversation; quote any recommended ${targetName} phrase in ${targetName}.
- Comment ONLY on language. Never scold the learner for rudeness, topics, or how the scene went.
- If every learner line is fine, return "corrections": [] and make "praise" a bit warmer.${polishRule}${tutorRule}`;
}

interface OpenAIChatResponse {
  choices?: { message?: { content?: unknown } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

/**
 * Разбор JSON-ответа ревью. Бережный: снимает ```-ограждения, режет длины,
 * отбрасывает битые элементы. null — совсем не распарсилось.
 */
export function parseReviewEnvelope(
  raw: string,
  modeOrLimit: DialogReviewMode | number = 'text',
): DialogReviewResult | null {
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
  let polishSeen = false;
  const voiceLike = typeof modeOrLimit === 'number' || modeOrLimit === 'voice' || modeOrLimit === 'tutor';
  const correctionLimit = typeof modeOrLimit === 'number'
    ? Math.min(MAX_TEXT_CORRECTIONS, Math.max(0, Math.floor(modeOrLimit)))
    : modeOrLimit === 'text' ? MAX_TEXT_CORRECTIONS : MAX_VOICE_CORRECTIONS;
  const originalMax = voiceLike ? 160 : 300;
  const correctedMax = voiceLike ? 160 : 300;
  const noteMax = voiceLike ? 180 : 300;
  for (const item of rawCorrections.slice(0, correctionLimit)) {
    const c = (item ?? {}) as Record<string, unknown>;
    const original = text(c.original, originalMax);
    const corrected = text(c.corrected, correctedMax);
    if (!original || !corrected) continue;
    const kind = text(c.kind, 10) === 'polish' ? 'polish' : 'fix';
    if (voiceLike && kind === 'polish' && polishSeen) continue;
    if (voiceLike && kind === 'polish') polishSeen = true;
    corrections.push({ original, corrected, note: text(c.note, noteMax), kind });
  }

  const praise = text(parsed.praise, voiceLike ? 240 : 500);
  const tip = text(parsed.tip, voiceLike ? 220 : 400);
  if (!praise && corrections.length === 0 && !tip) return null;
  const rawMemory = parsed.memory && typeof parsed.memory === 'object' ? (parsed.memory as Record<string, unknown>) : null;
  const list = (v: unknown, max: number): string[] =>
    Array.isArray(v) ? v.map((x) => text(x, 140)).filter((x) => x !== '').slice(0, max) : [];
  const memory: DialogReviewMemoryExtract | undefined = rawMemory
    ? {
        facts: list(rawMemory.facts, 6),
        recurringErrors: list(rawMemory.recurringErrors, 5),
        resolvedErrors: list(rawMemory.resolvedErrors, 5),
      }
    : undefined;
  return memory ? { praise, corrections, tip, memory } : { praise, corrections, tip };
}

/** Клиентские итоги урока не зависят от ответа провайдера и сохраняются первыми. */
function buildTutorEvidenceUpdate(data: DialogReviewRequest, cefr: string, nowMs: number): TutorMemoryUpdate {
  const list = (v: unknown, max: number): string[] =>
    Array.isArray(v) ? v.map((x) => text(x, 140)).filter((x) => x !== '').slice(0, max) : [];
  return {
    sessionId: data.sessionId,
    enforceHomeworkEvidence: true,
    homework: list(data.homework, 3),
    nextTopic: text(data.nextTopic, 140),
    cefr,
    // 'default' → сброс на политику уровня; пусто/нет поля → предпочтение не трогаем.
    languagePreference: text(data.languagePreference, 16) === '' ? undefined : text(data.languagePreference, 16),
    phraseResults: Array.isArray(data.phraseResults)
      ? data.phraseResults.slice(0, 12).map((r) => {
          const item = (r ?? {}) as Record<string, unknown>;
          const raw = text(item.result, 16);
          const result = (raw === 'pass' || raw === 'needs_work' || raw === 'uncertain' || raw === 'invalid'
            ? raw
            : typeof item.ok === 'boolean'
              ? (item.ok ? 'pass' : 'needs_work')
              : 'invalid') as 'pass' | 'needs_work' | 'uncertain' | 'invalid';
          return { text: text(item.text, 140), result };
        }).filter((r) => r.text !== '')
      : [],
    sceneOutcome: text(data.sceneOutcome, 12),
    goalProgress: data.goalProgress && typeof data.goalProgress === 'object'
      ? {
          goalId: (data.goalProgress as Record<string, unknown>).goalId,
          mastery: (data.goalProgress as Record<string, unknown>).mastery,
          evidence: (data.goalProgress as Record<string, unknown>).evidence,
          sceneId: (data.goalProgress as Record<string, unknown>).sceneId,
        }
      : null,
    nowMs,
  };
}

function tutorMemoryProjection(memory: TutorMemory, data: DialogReviewRequest) {
  const requested = data.goalProgress && typeof data.goalProgress === 'object'
    ? data.goalProgress as Record<string, unknown>
    : null;
  const goalId = text(requested?.goalId, 40);
  const acceptedGoalProgress = goalId
    ? { goalId, mastery: memory.goalMastery[goalId] ?? 0 }
    : undefined;
  return {
    callCount: memory.callCount,
    homework: memory.homework,
    nextTopic: memory.nextTopic,
    ...(acceptedGoalProgress ? { acceptedGoalProgress } : {}),
  };
}

export const premiumDialogReview = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 30,
  memory: '256MiB',
  maxInstances: 20,
  secrets: [OPENAI_API_KEY, ADMIN_ALERT_BOT_TOKEN],
}, async (request) => {
  if (!request.auth?.uid) {
    console.warn('premium_dialog_review rejected', { reason: 'auth_required' });
    throw new HttpsError('unauthenticated', 'auth_required');
  }

  const data = (request.data ?? {}) as DialogReviewRequest;

  const history = sanitizeReviewHistory(data.history);
  const learnerTurns = history.filter((t) => t.role === 'user');
  const mode = asReviewMode(data.mode);
  if (learnerTurns.length === 0 && mode !== 'tutor') {
    console.warn('premium_dialog_review rejected', { reason: 'history_required' });
    throw new HttpsError('invalid-argument', 'history_required');
  }

  const apiKey = text(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
  // Для text/voice сохраняем прежний fail-fast до любых Firestore-действий.
  if (!apiKey && mode !== 'tutor') {
    console.error('premium_dialog_review rejected', { reason: 'openai_key_missing' });
    throw new HttpsError('failed-precondition', 'openai_key_missing');
  }

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid);
  const cefr = asCefr(data.cefr);
  const tutorEvidenceNowMs = Date.now();
  const tutorEvidence = mode === 'tutor' ? buildTutorEvidenceUpdate(data, cefr, tutorEvidenceNowMs) : undefined;

  // Детерминированные итоги уже известны клиенту: пишем и дожидаемся транзакции
  // ДО rate-limit/model/fetch, чтобы сбой API не стирал домашку и прогресс урока.
  const tutorEvidenceMemory = tutorEvidence
    ? await applyTutorMemoryUpdate(db, authUid, stableUid, tutorEvidence, { strict: true })
    : undefined;

  if (learnerTurns.length === 0 && tutorEvidenceMemory) {
    return {
      ok: true,
      praise: '',
      corrections: [],
      tip: '',
      tutorMemory: tutorMemoryProjection(tutorEvidenceMemory, data),
    };
  }

  if (!apiKey) {
    console.error('premium_dialog_review rejected', { reason: 'openai_key_missing' });
    throw new HttpsError('failed-precondition', 'openai_key_missing');
  }

  // зачем: аудит безопасности 2026-08-22 — разбор диалога (заведомо платный
  // OpenAI-вызов ниже) вызывается напрямую в обход premiumDialogSend и раньше
  // не гейтился подпиской вообще, только общим часовым лимитом. Тот же гейт и
  // тот же рубильник, что у send/translate — при gate_ai_dialog_premium=false
  // фича намеренно общая для всех.
  const aiDialogGatedByPremium = await resolveRemoteBool(db, 'gate_ai_dialog_premium', true);
  const isPremium = await resolvePremiumAccess(db, stableUid, Date.now(), authUid);
  if (!isPremium && aiDialogGatedByPremium) {
    console.warn('premium_dialog_review rejected', { reason: 'dialog_plus_required' });
    throw new HttpsError('permission-denied', 'dialog_plus_required');
  }

  // Общий rate-limit с send/translate: разбор — один вызов на диалог, окна хватает.
  await enforceRateLimit(authUid, stableUid);

  const interfaceLang = asInterfaceLang(data.interfaceLang);
  const learnerLangName = LEARNER_LANG_NAME[interfaceLang] ?? LEARNER_LANG_NAME.ru;
  const goalEn = text(data.goalEn, 200);
  const studyTarget = resolveStudyTarget(data.studyTarget);

  const partnerLabel = mode === 'tutor' ? 'Teacher' : 'Partner';
  const transcript = history
    .map((t) => `${t.role === 'user' ? 'Learner' : partnerLabel}: ${stripKeyPhraseMarkers(t.content)}`)
    .join('\n');

  const dialogModel = await resolveConfiguredDialogModel(db, process.env.OPENAI_DIALOG_MODEL);
  const useJsonFormat = modelSupportsJsonObject(dialogModel);

  // MAX safety-проверка использует транскрипт только во время текущего разбора.
  // Оператор получает обезличенную категорию; текст, UID и session не сохраняются
  // и не отправляются. Проверка идёт параллельно и никогда не роняет разбор.
  const safetyPromise = mode === 'voice' || mode === 'tutor'
    ? reviewVoiceSafety({
        apiKey,
        authUid,
        stableUid,
        mode: mode === 'tutor' ? 'voice_tutor' : 'voice_call',
        history,
        clientFlags: sanitizeClientSafetyFlags(data.safetyFlags),
        sessionId: text(data.sessionId, 80) || undefined,
      })
    : Promise.resolve({ categories: [] });

  // Разбор и сейфти-журнал идут параллельно; журнал ДОЛЖЕН дописаться даже
  // если провайдер разбора упал (иначе Cloud Functions обрежет фоновую запись).
  const runReview = async (): Promise<{ json: OpenAIChatResponse; review: DialogReviewResult }> => {
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
      review = parseReviewEnvelope(text(json.choices?.[0]?.message?.content, 6000), mode);
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
    return { json, review };
  };
  const [, reviewSettled] = await Promise.allSettled([safetyPromise, runReview()]);
  if (reviewSettled.status === 'rejected') throw reviewSettled.reason;
  const { json, review } = reviewSettled.value;

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

  // Учитель: обновить память между уроками (домашка/тема — от клиента, из
  // инструментов учителя; факты/ошибки — из разбора). Ошибка записи — не
  // причина ронять разбор.
  let tutorMemoryOut: ReturnType<typeof tutorMemoryProjection> | undefined;
  if (tutorEvidence) {
    const reviewMemory = {
      facts: review.memory?.facts ?? [],
      recurringErrors: review.memory?.recurringErrors ?? [],
      resolvedErrors: review.memory?.resolvedErrors ?? [],
    };
    // С sessionId повторяем полную запись: транзакция либо увидит первый этап и
    // возьмёт только review-поля, либо восстановит весь урок, если первая запись
    // не удалась. Legacy-клиент без id использует явный reviewOnly, чтобы не
    // превратить один урок в два.
    const next = await applyTutorMemoryUpdate(db, authUid, stableUid, {
      ...(sanitizeTutorSessionId(data.sessionId)
        ? tutorEvidence
        : { reviewOnly: true, nowMs: tutorEvidenceNowMs }),
      ...reviewMemory,
    }, { strict: true });
    tutorMemoryOut = tutorMemoryProjection(next, data);
  }

  // Память — внутренняя кухня учителя: клиенту она не нужна и не уходит.
  const { memory: _memory, ...publicReview } = review;
  return { ok: true, ...publicReview, ...(tutorMemoryOut ? { tutorMemory: tutorMemoryOut } : {}) };
});

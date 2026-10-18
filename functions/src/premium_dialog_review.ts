import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { ADMIN_ALERT_BOT_TOKEN } from './admin_alerts';
import { resolveConfiguredDialogModel, modelSupportsJsonObject } from './openai_dialog_model_config';
import { enforceRateLimit, asInterfaceLang } from './premium_dialog';
import {
  assertDialogueStudyLanguage,
  dialogueStudyTargetName,
  resolveDialogueTargetBeforeWarmup,
  type DialogueStudyTarget,
} from './dialogue_ai_language_contract';
import { resolvePremiumAccess } from './premium_status';
import { resolveRemoteBool } from './remote_gates';
import { aiKillSwitchOn } from './ai_kill_switch';
import { enforceFreeJobGenLimit, refundFreeJobGenLimit, type FreeJobGenReservation } from './explain/explain_budget';
import { PAID_AI_FETCH_TIMEOUT_MS, paidAiFetchFailureReason } from './paid_ai_fetch_timeout';
import {
  DialogueV2CompletionServerError,
  executeDialogueV2CompletionReview,
} from './dialogue_v2_completion_server';
import {
  loadDialogueV2CompletionReleaseCandidate,
  type DialogueV2CompletionReleaseRepository,
} from './dialogue_v2_completion_release_source';
import { authorizeDialogueV2ServerPacket } from './dialogue_v2_server_authorization';
import {
  makeFirestoreDialogueV2MemoryRepository,
  persistDialogueV2CompletionMemory,
} from './dialogue_v2_memory_writer';
import { reserveDailySpend } from './spend_cap';

import { swallowed } from './swallowed_error'; // зачем: PM-229 — немой catch пишет причину [PM-229]
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const DIALOGUE_V2_MEMORY_ID_SECRET = defineSecret('DIALOGUE_V2_MEMORY_ID_SECRET');

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

/** PM-231: платных текстовых разборов в UTC-сутки для Free (Plus без суточного потолка). */
export const FREE_TEXT_REVIEW_DAILY_CAP = 3;
const FREE_TEXT_REVIEW_JOB = 'dialog_text_review';

/**
 * PM-231: резерв Free-кредита текстового разбора ДО OpenAI. Не Free-превью →
 * null (ничего не списываем). Исчерпан → 'dialog_free_limit'.
 */
export async function reserveFreeTextReviewCredit(params: {
  isFreeTextPreview: boolean;
  authUid: string;
  stableUid: string;
  nowMs?: number;
}): Promise<FreeJobGenReservation | null> {
  if (!params.isFreeTextPreview) return null;
  try {
    return await enforceFreeJobGenLimit(
      FREE_TEXT_REVIEW_JOB,
      params.authUid,
      params.stableUid,
      FREE_TEXT_REVIEW_DAILY_CAP,
      params.nowMs ?? Date.now(),
    );
  } catch (error) {
    const reason = error instanceof HttpsError ? error.message : 'limit_check_failed';
    console.warn('[AI-LIMIT] premium_dialog_review free daily cap refused', {
      reason,
      cap: FREE_TEXT_REVIEW_DAILY_CAP,
    });
    if (error instanceof HttpsError && error.code === 'resource-exhausted') {
      throw new HttpsError('resource-exhausted', 'dialog_free_limit');
    }
    throw error;
  }
}
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
  /** Explicit opt-in to the released V2 completion contract. */
  dialogueVersion?: unknown;
  history?: unknown;
  cefr?: unknown;
  interfaceLang?: unknown;
  scenarioId?: unknown;
  goalEn?: unknown;
  ageBracket?: unknown;
  /** Language being learned. Required and validated by the dialogue-specific contract. */
  studyTarget?: unknown;
  /** Required for non-English: exact native dialogue pack binding; English remains metadata-free. */
  packVersion?: unknown;
  packSha256?: unknown;
  sharedManifestSha256?: unknown;
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

function dialogueV2ReleaseRepository(
  db: FirebaseFirestore.Firestore,
): DialogueV2CompletionReleaseRepository {
  return {
    readDocument: async (path) => {
      const snapshot = await db.doc(path).get();
      return snapshot.exists ? snapshot.data() ?? null : null;
    },
    readCollection: async (path) => {
      const snapshot = await db.collection(path).get();
      return snapshot.docs.map((document) => ({ id: document.id, data: document.data() }));
    },
  };
}

function dialogueV2CompletionHttpError(error: unknown): HttpsError {
  if (!(error instanceof DialogueV2CompletionServerError)) {
    if (error instanceof HttpsError) return error;
    return new HttpsError('unavailable', 'dialogue_v2_completion_provider_failed');
  }
  if (error.code === 'request_invalid' || error.code === 'history_required') {
    return new HttpsError('invalid-argument', `dialogue_v2_completion_${error.code}`);
  }
  if (error.code === 'release_unavailable') {
    return new HttpsError('failed-precondition', 'dialogue_v2_completion_release_unavailable');
  }
  if (error.code === 'pack_reference_mismatch') {
    return new HttpsError('failed-precondition', 'dialogue_v2_completion_pack_mismatch');
  }
  return new HttpsError('unavailable', 'dialogue_v2_completion_provider_failed');
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

/**
 * Разбор ОДНОЙ реплики ученика (редизайн Диалогов, владелец 2026-09-14:
 * «разбор фраз полноценный, каждой фразы»). 'ok' — реплика верна (note хвалит
 * или отмечает, что так и говорят); 'fix' — ошибка; 'polish' — верно, но есть
 * более естественный вариант.
 */
export interface DialogReviewPhrase {
  original: string;
  corrected: string;
  note: string;
  kind: 'fix' | 'ok' | 'polish';
}

/** A model observation explicitly anchored to one verbatim learner message. */
export interface DialogReviewEvidence {
  learnerTurn: string;
  note: string;
}

export interface DialogReviewResult {
  praise: string;
  /** Overall, partner-perspective assessment of this specific conversation. */
  assessment?: string;
  /** Concrete evidence for the assessment. Entries are grounded server-side. */
  evidence?: DialogReviewEvidence[];
  corrections: DialogReviewCorrection[];
  tip: string;
  /** text-режим: разбор каждой реплики ученика по порядку (до 12). */
  phrases?: DialogReviewPhrase[];
  /** text-режим: оценка разговора 0-100 (качество языка ученика на его уровне). */
  score?: number;
  /** Только mode 'tutor'. */
  memory?: DialogReviewMemoryExtract;
}

export function assertDialogReviewTargetLanguage(
  review: DialogReviewResult,
  studyTarget: DialogueStudyTarget,
): void {
  const targetTexts = [
    ...review.corrections.map((item) => item.corrected),
    ...(review.phrases ?? []).map((item) => item.corrected),
  ].filter(Boolean);

  for (const targetText of targetTexts) {
    assertDialogueStudyLanguage({
      text: targetText,
      studyTarget,
      feature: 'premium_dialog_review',
    });
  }
}

const MAX_REVIEW_PHRASES = 12;

function clampScore(value: unknown): number | undefined {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(100, Math.round(n)));
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
  // зачем (владелец 04.10, «вычистить весь MAX»): режимы voice/tutor были только у звонка MAX (клиент удалён,
  // вызовов с 04.09 нет). Старый клиент, приславший их, получает обычный текстовый разбор, причина — в лог.
  if (m === 'voice' || m === 'tutor') {
    console.warn('[DIALOG-REVIEW] retired MAX mode coerced to text', JSON.stringify({ mode: m }));
  }
  return 'text';
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
  studyTarget: DialogueStudyTarget = 'en',
  mode: DialogReviewMode = 'text',
): string {
  const goalLine = goalEn ? `\nThe scenario goal was: ${goalEn}.` : '';
  const targetName = dialogueStudyTargetName(studyTarget);
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
  // зачем (владелец 2026-09-14): разбор обязан быть по КАЖДОЙ фразе ученика,
  // а не только по ошибкам — верная фраза тоже получает строку («так и говорят»).
  // Плюс общая оценка разговора числом. Только text-режим: голос/учитель живут
  // по своим правилам (3 поправки + polish) и их форму ответа не трогаем.
  const phrasesRule =
    mode === 'text'
      ? `\n- "phrases": one item for EVERY learner line, in order (at most ${MAX_REVIEW_PHRASES}; if there are more, keep the first ${MAX_REVIEW_PHRASES}): {"original": "<the line as written>", "corrected": "<natural ${targetName} at level ${cefr}; the same line if it is already fine>", "note": "<ONE kind sentence in ${learnerLangName}: what was good, or what to fix and why, everyday words, no grammar jargon>", "kind": "fix" | "ok" | "polish"}. "ok" = correct and natural; "polish" = correct but a more natural version exists; "fix" = a real mistake.
- "score": an integer 0-100 for the learner's ${targetName} in this conversation at level ${cefr} (100 = every line correct and natural; a couple of small slips ≈ 80-90; many mistakes or one-word answers ≈ 40-60).`
      : '';
  const phrasesShape = mode === 'text'
    ? ', "assessment": "...", "evidence": [{"learnerTurn": "...", "note": "..."}], "phrases": [{"original": "...", "corrected": "...", "note": "...", "kind": "ok"}], "score": 85'
    : '';
  return `You are a warm, encouraging ${targetName} tutor inside the Phraseman language app. A learner has just finished a practice conversation with a role-play partner. Your job is a short, kind debrief of the learner's ${targetName}.${goalLine}${modeLine}
The learner's level is ${cefr}. The learner's native language is ${learnerLangName}.

Review ONLY the learner's lines. Respond with a single JSON object and nothing else:
{"praise": "...", "assessment": "...", "evidence": [{"learnerTurn": "...", "note": "..."}], "corrections": [{"original": "...", "corrected": "...", "note": "..."}], "tip": "..."${phrasesShape}}

Rules:
- "praise": 1-2 warm, specific sentences in ${learnerLangName} about what the learner genuinely did well (a phrase they used, politeness, persistence). Never invent things they did not say, never use empty flattery.
- "assessment": 2-3 concise sentences in ${learnerLangName}, written from the role-play partner's point of view ("I understood…", "It helped when…"). Give an overall assessment of how the conversation worked. Ground every claim in the learner's actual lines; do not pretend the partner saw anything outside this transcript.
- "evidence": 1-3 items supporting "assessment". "learnerTurn" MUST be copied verbatim from one learner line in this transcript; "note" is one short explanation in ${learnerLangName}. Never invent or paraphrase a learner turn.
- "corrections": scan all learner lines, then return only the most useful items for the next conversation:
  - "original": the learner's line exactly as they wrote it (shorten to the broken part if the line is long);
  - "corrected": the natural ${targetName} a friendly native speaker would use for the same idea, kept at level ${cefr};
  - "note": ONE short, kind sentence in ${learnerLangName} explaining the fix in everyday words — no grammar jargon, no mockery, never shame the learner.
  Skip lines that are already fine. At most ${maxCorrections} items total${mode === 'text' ? '' : ': one main focus plus up to two details'}.
- "tip": one short, practical suggestion in ${learnerLangName} for the next conversation; quote any recommended ${targetName} phrase in ${targetName}.
- Comment ONLY on language. Never scold the learner for rudeness, topics, or how the scene went.
- If every learner line is fine, return "corrections": [] and make "praise" a bit warmer.${phrasesRule}${polishRule}${tutorRule}`;
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
  const assessment = text(parsed.assessment, voiceLike ? 240 : 500);
  const tip = text(parsed.tip, voiceLike ? 220 : 400);
  const rawEvidence = Array.isArray(parsed.evidence) ? parsed.evidence : [];
  const evidence: DialogReviewEvidence[] = [];
  for (const item of rawEvidence.slice(0, 3)) {
    const source = (item ?? {}) as Record<string, unknown>;
    const learnerTurn = text(source.learnerTurn, 300);
    const note = text(source.note, 300);
    if (learnerTurn && note) evidence.push({ learnerTurn, note });
  }
  // зачем (владелец 2026-09-14): полный разбор КАЖДОЙ реплики ученика + оценка
  // разговора числом. Только text-режим; для voice/tutor поле отсутствует и
  // клиент ведёт себя как раньше.
  const rawPhrases = Array.isArray(parsed.phrases) ? parsed.phrases : [];
  const phrases: DialogReviewPhrase[] = [];
  for (const item of rawPhrases.slice(0, MAX_REVIEW_PHRASES)) {
    const p = (item ?? {}) as Record<string, unknown>;
    const original = text(p.original, 300);
    if (!original) continue;
    const rawKind = text(p.kind, 10);
    const kind: DialogReviewPhrase['kind'] =
      rawKind === 'fix' || rawKind === 'polish' ? rawKind : 'ok';
    // corrected пуст у верной реплики — подставляем оригинал, чтобы UI всегда
    // имел «как правильно» и не показывал пустую строку.
    const corrected = text(p.corrected, 300) || original;
    phrases.push({ original, corrected, note: text(p.note, 300), kind });
  }
  const score = clampScore(parsed.score);
  if (!praise && corrections.length === 0 && !tip && phrases.length === 0) return null;
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
  return {
    praise,
    ...(assessment ? { assessment } : {}),
    ...(evidence.length > 0 ? { evidence } : {}),
    corrections,
    tip,
    ...(phrases.length > 0 ? { phrases } : {}),
    ...(score != null ? { score } : {}),
    ...(memory ? { memory } : {}),
  };
}

/**
 * A provider may only cite learner turns that actually exist in this request.
 * The returned `learnerTurn` is always the source transcript's verbatim text,
 * never a model-provided paraphrase. This makes the completion assessment
 * inspectable and prevents fabricated evidence from reaching the client.
 */
function groundedLearnerQuote(quote: string, learnerTurns: readonly string[]): string | null {
  const requested = quote.trim();
  if (!requested) return null;
  const matches: string[] = [];
  for (const learnerTurn of learnerTurns) {
    let index = learnerTurn.indexOf(requested);
    while (index >= 0) {
      matches.push(learnerTurn.slice(index, index + requested.length));
      if (matches.length > 1) return null;
      index = learnerTurn.indexOf(requested, index + requested.length);
    }
  }
  return matches[0] ?? null;
}

export function groundReviewEvidence(
  review: DialogReviewResult,
  history: readonly ChatTurn[],
): DialogReviewResult {
  const learnerTurns = history
    .filter((turn) => turn.role === 'user')
    .map((turn) => stripKeyPhraseMarkers(turn.content));
  const seen = new Set<string>();
  const evidence = (review.evidence ?? []).flatMap((item) => {
    const match = groundedLearnerQuote(item.learnerTurn, learnerTurns);
    if (!match || seen.has(match)) return [];
    seen.add(match);
    return [{ learnerTurn: match, note: item.note }];
  });
  const corrections = review.corrections.flatMap((item) => {
    const original = groundedLearnerQuote(item.original, learnerTurns);
    return original ? [{ ...item, original }] : [];
  });
  const phrases = (review.phrases ?? []).flatMap((item) => {
    const original = groundedLearnerQuote(item.original, learnerTurns);
    return original ? [{ ...item, original }] : [];
  });
  const {
    evidence: _untrustedEvidence,
    corrections: _untrustedCorrections,
    phrases: _untrustedPhrases,
    ...reviewWithoutUntrustedLearnerQuotes
  } = review;
  return {
    ...reviewWithoutUntrustedLearnerQuotes,
    corrections,
    ...(evidence.length > 0 ? { evidence } : {}),
    ...(phrases.length > 0 ? { phrases } : {}),
  };
}

/** A completion debrief is safe to present as a partner assessment only with evidence. */
export function hasGroundedCompletionAssessment(review: DialogReviewResult): boolean {
  return Boolean(review.assessment?.trim() && (review.evidence?.length ?? 0) > 0);
}

export const premiumDialogReview = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 30,
  memory: '256MiB',
  maxInstances: 20,
  secrets: [OPENAI_API_KEY, ADMIN_ALERT_BOT_TOKEN, DIALOGUE_V2_MEMORY_ID_SECRET],
}, async (request) => {
  if (!request.auth?.uid) {
    console.warn('premium_dialog_review rejected', { reason: 'auth_required' });
    throw new HttpsError('unauthenticated', 'auth_required');
  }
  // зачем (Q102): аварийный стоп ИИ «Пульта» раньше не закрывал разбор диалога.
  if (await aiKillSwitchOn('premiumDialogReview')) {
    console.warn('[AI-KILL-SWITCH] rejected', JSON.stringify({ callable: 'premiumDialogReview' }));
    throw new HttpsError('unavailable', 'ai_globally_disabled');
  }

  const data = (request.data ?? {}) as DialogReviewRequest;
  if (data.dialogueVersion === 'v2') {
    const db = admin.firestore();
    try {
      let releasePromise: ReturnType<typeof loadDialogueV2CompletionReleaseCandidate> | undefined;
      const resolveRelease = () => {
        releasePromise ??= loadDialogueV2CompletionReleaseCandidate(
          dialogueV2ReleaseRepository(db),
        );
        return releasePromise;
      };
      const v2Completion = await executeDialogueV2CompletionReview(data, {
        resolveRelease,
        // Deliberately fail closed. The current production callable has no
        // approved V2 transcript-processing adapter. Connecting one must be a
        // separate privacy-reviewed change after the immutable release exists.
        generateFeedback: async () => {
          throw new DialogueV2CompletionServerError('provider_failed');
        },
      });
      const authUid = request.auth.uid;
      const v2Memory = await persistDialogueV2CompletionMemory({
        authUid,
        studyTarget: data.studyTarget,
        scenarioId: data.scenarioId,
        completion: v2Completion,
      }, {
        repository: makeFirestoreDialogueV2MemoryRepository(db),
        identifierSecret: DIALOGUE_V2_MEMORY_ID_SECRET.value(),
        resolveStableAccountId: (candidateAuthUid) => resolveStableUidForAuth(db, candidateAuthUid),
        resolvePremiumAccess: (stableAccountId, candidateAuthUid) => resolvePremiumAccess(
          db,
          stableAccountId,
          Date.now(),
          candidateAuthUid,
        ),
        resolveApprovedLanguagePack: async (studyTarget, scenarioId) => (
          authorizeDialogueV2ServerPacket(
            { studyTarget, scenarioId },
            await resolveRelease(),
          )
        ),
      });
      return {
        ok: true,
        v2Completion,
        v2Memory: {
          sharedMemoryStored: v2Memory.sharedMemoryStored,
          scenarioCheckpointStored: v2Memory.scenarioCheckpointStored,
        },
      };
    } catch (error) {
      const mapped = dialogueV2CompletionHttpError(error);
      console.warn('premium_dialog_review V2 rejected', {
        reason: mapped.message,
        scenarioId: text(data.scenarioId, 80) || null,
      });
      throw mapped;
    }
  }

  // Dialogue target validation is intentionally the first request-data check.
  // A direct call with an absent/unknown target must fail before identity reads,
  // tutor evidence writes, access/rate checks, or any provider work.
  const studyTarget = resolveDialogueTargetBeforeWarmup(data);
  const operationStartedAtMs = Date.now();

  const history = sanitizeReviewHistory(data.history);
  const learnerTurns = history.filter((t) => t.role === 'user');
  const mode = asReviewMode(data.mode);
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
  const cefr = asCefr(data.cefr);

  // зачем: аудит безопасности 2026-08-22 — разбор диалога (заведомо платный
  // OpenAI-вызов ниже) вызывается напрямую в обход premiumDialogSend и раньше
  // не гейтился подпиской вообще, только общим часовым лимитом. Тот же гейт и
  // тот же рубильник, что у send/translate — при gate_ai_dialog_premium=false
  // фича намеренно общая для всех.
  const aiDialogGatedByPremium = await resolveRemoteBool(db, 'gate_ai_dialog_premium', true);
  const isPremium = await resolvePremiumAccess(db, stableUid, Date.now(), authUid);
  // зачем (владелец 2026-09-14, редизайн Диалогов): раньше Free получал отказ и
  // видел на экране разбора чёрный ящик «всё в Plus» — ценность фичи была
  // невидима до покупки. Теперь текстовый разбор делается и для Free, но наружу
  // уходит ТОЛЬКО первая фраза (обрезка ниже, freePreview). Голос и учитель
  // остаются Plus-функциями: там разбор идёт после платной минуты.
  const textPreviewForFree = mode === 'text';
  if (!isPremium && aiDialogGatedByPremium && !textPreviewForFree) {
    console.warn('premium_dialog_review rejected', { reason: 'dialog_plus_required', mode });
    throw new HttpsError('permission-denied', 'dialog_plus_required');
  }

  // Общий rate-limit с send/translate: разбор — один вызов на диалог, окна хватает.
  await enforceRateLimit(authUid, stableUid);

  // зачем: PM-231 — Free-превью текстового разбора держал только часовой лимит
  // (60/ч ⇒ до 1440 платных разборов в сутки × 900 токенов). Суточный потолок
  // FREE_TEXT_REVIEW_DAILY_CAP ставим ДО OpenAI; Plus не ограничиваем. Отказ —
  // существующий 'dialog_free_limit', клиент уже показывает на него Plus.
  const freeReviewReservation = await reserveFreeTextReviewCredit({
    isFreeTextPreview: !isPremium && aiDialogGatedByPremium && textPreviewForFree,
    authUid,
    stableUid,
  });

  const interfaceLang = asInterfaceLang(data.interfaceLang);
  const learnerLangName = LEARNER_LANG_NAME[interfaceLang] ?? LEARNER_LANG_NAME.ru;
  const goalEn = text(data.goalEn, 200);
  const partnerLabel = mode === 'tutor' ? 'Teacher' : 'Partner';
  const transcript = history
    .map((t) => `${t.role === 'user' ? 'Learner' : partnerLabel}: ${stripKeyPhraseMarkers(t.content)}`)
    .join('\n');

  const dialogModel = await resolveConfiguredDialogModel(db, process.env.OPENAI_DIALOG_MODEL);
  const useJsonFormat = modelSupportsJsonObject(dialogModel);


  // Разбор и сейфти-журнал идут параллельно; журнал ДОЛЖЕН дописаться даже
  // если провайдер разбора упал (иначе Cloud Functions обрежет фоновую запись).
  const runReview = async (): Promise<{ json: OpenAIChatResponse; review: DialogReviewResult }> => {
    let json: OpenAIChatResponse;
    let review: DialogReviewResult | null;
    try {
      // зачем (владелец 18.10: «не больше 20 $ в день в принципе»): общий дневной потолок расходов — резерв до платного вызова.
      await reserveDailySpend({ fn: 'premiumDialogReview', kind: 'chat', model: dialogModel, inTokens: 4000, outTokens: 1200 });
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
        // зачем: PM-231 — тайм-аут ниже потолка функции 30с, иначе рантайм убивал
        // инстанс раньше, чем срабатывал возврат Free-кредита ниже.
        signal: AbortSignal.timeout(PAID_AI_FETCH_TIMEOUT_MS.dialogReview),
      });

      if (!response.ok) {
        const detail = await response.text().catch(swallowed('premium_dialog_review:text', ''));
        console.error('premium_dialog_review chat failed', {
          status: response.status,
          model: dialogModel,
          scenarioId: text(data.scenarioId, 80) || null,
          detail: detail.slice(0, 500),
        });
        throw new HttpsError('unavailable', 'dialog_provider_failed');
      }

      json = (await response.json()) as OpenAIChatResponse;
      const parsedReview = parseReviewEnvelope(text(json.choices?.[0]?.message?.content, 6000), mode);
      if (!parsedReview) {
        console.error('premium_dialog_review unparseable reply', {
          model: dialogModel,
          scenarioId: text(data.scenarioId, 80) || null,
        });
        throw new HttpsError('unavailable', 'dialog_provider_failed');
      }
      review = groundReviewEvidence(parsedReview, history);
      if (!hasGroundedCompletionAssessment(review)) {
        console.error('premium_dialog_review missing_grounded_completion_assessment', {
          model: dialogModel,
          scenarioId: text(data.scenarioId, 80) || null,
        });
        throw new HttpsError('unavailable', 'dialog_provider_failed');
      }
      assertDialogReviewTargetLanguage(review, studyTarget);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error('[AI-LIMIT] premium_dialog_review provider exception', {
        reason: paidAiFetchFailureReason(error),
        timeoutMs: PAID_AI_FETCH_TIMEOUT_MS.dialogReview,
        model: dialogModel,
        scenarioId: text(data.scenarioId, 80) || null,
        error: String((error as Error)?.message ?? error).slice(0, 500),
      });
      throw new HttpsError('unavailable', 'dialog_provider_failed');
    }
    return { json, review };
  };
  const [reviewSettled] = await Promise.allSettled([runReview()]);
  if (reviewSettled.status === 'rejected') {
    // Разбора нет → Free-кредит дня возвращаем (как у explain/mistake).
    if (freeReviewReservation) {
      console.warn('[AI-LIMIT] premium_dialog_review failed, refunding free credit', {
        reason: String((reviewSettled.reason as Error)?.message ?? reviewSettled.reason).slice(0, 120),
      });
      await refundFreeJobGenLimit(freeReviewReservation).catch((refundError) => {
        console.error('[AI-LIMIT] premium_dialog_review free credit refund failed', {
          reason: String((refundError as Error)?.message ?? refundError).slice(0, 200),
        });
      });
    }
    throw reviewSettled.reason;
  }
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
  }).catch((error: unknown) => {
    // зачем (PM-231, правило «немой catch запрещён»): сбой записи расходов не должен
    // ронять уже оплаченный разбор, но потеря строки биллинга обязана быть видна —
    // иначе траты на OpenAI молча исчезают с панели бюджета.
    console.warn('[DIALOG-REVIEW-BILLING] write_failed', JSON.stringify({
      uid: stableUid,
      reviewMode: mode,
      model: dialogModel,
      totalTokens: Number(usage.total_tokens ?? 0),
      error: String((error as Error)?.message ?? error).slice(0, 300),
    }));
  });

  // Память — внутренняя кухня учителя: клиенту она не нужна и не уходит.
  const { memory: _memory, ...publicReview } = review;

  // Free видит ПЕРВУЮ фразу целиком, остальные заменены счётчиком: клиент
  // показывает их под вуалью с кнопкой Plus. Обрезка на СЕРВЕРЕ — иначе полный
  // разбор уезжал бы на устройство и «замок» снимался бы правкой клиента.
  if (!isPremium && aiDialogGatedByPremium) {
    const allPhrases = publicReview.phrases ?? [];
    const lockedCount = Math.max(0, allPhrases.length - 1);
    console.log('[DIALOG-REVIEW] free preview', {
      phrases: allPhrases.length,
      lockedCount,
      corrections: publicReview.corrections.length,
      score: publicReview.score ?? null,
    });
    return {
      ok: true,
      praise: publicReview.praise,
      ...(publicReview.assessment ? { assessment: publicReview.assessment } : {}),
      ...(publicReview.evidence ? { evidence: publicReview.evidence } : {}),
      // corrections — старый список «только ошибки»; для Free он весь под замком.
      corrections: [],
      tip: '',
      phrases: allPhrases.slice(0, 1),
      score: publicReview.score,
      lockedPhrases: lockedCount,
      locked: true,
    };
  }

  return { ok: true, ...publicReview };
});

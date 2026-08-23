import * as admin from 'firebase-admin';
import { createHash, randomUUID } from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { resolveStableUidForAuth } from './auth_identity';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import {
  VOICE_TUTOR_MEMORY_COLLECTION,
  acceptMemoryCandidate,
  mergeTutorMemory,
  parseTutorMemory,
  voiceTutorMemoryDocId,
  type TutorMemoryUpdate,
} from './max_voice_tutor_memory';
import { VOICE_BILLING_COLLECTION } from './max_voice_session_end';
import { VOICE_QUOTA_COLLECTION, voiceQuotaDocId } from './max_voice_quota';
import {
  MAX_VOICE_OPS_EVENT_SCHEMA,
  recordMaxVoiceOpsOnce,
  type MaxVoiceOpsEventV1,
} from './max_voice_ops';
import { resolveConfiguredDialogModel, modelSupportsJsonObject } from './openai_dialog_model_config';
import { enforceRateLimit } from './premium_dialog';
import { canDoGoalById } from './max_voice_can_do_goals';
import { reviewVoiceSafety, sanitizeClientSafetyFlags } from './max_voice_safety';
import {
  isMaxVoiceReviewReceiptV1,
  sanitizeMaxVoiceMemoryProjection,
  sanitizeMaxVoiceReviewReceipt,
  type MaxVoiceReceiptEndReason,
  type MaxVoiceReviewMemoryProjection,
  type MaxVoiceReviewReceiptV1,
} from './max_voice_review_receipt';

if (!admin.apps.length) admin.initializeApp();

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const REGION = 'us-central1';
const REVIEW_COLLECTION = 'voice_call_reviews';
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const PROCESSING_LEASE_MS = 90_000;
const MAX_PAYLOAD_BYTES = 128 * 1024;
const MAX_HISTORY_TURNS = 80;
const MAX_TURN_CHARS = 1_000;

type VoiceFormat = 'scenario' | 'companion' | 'trial' | 'tutor';
type VoiceCefr = 'A1' | 'A2' | 'B1' | 'B2';
type InterfaceLang = 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';
type PhraseResult = 'pass' | 'needs_work' | 'uncertain' | 'invalid';

interface FinalizeRequest {
  history: { role: 'user' | 'assistant'; text: string }[];
  durationSec: number;
  speechSec: number;
  format: VoiceFormat;
  scenarioId?: string;
  cefr: VoiceCefr;
  interfaceLang: InterfaceLang;
  endReason: MaxVoiceReceiptEndReason;
  goalId?: string;
  // зачем: паритет с premiumDialogReview (аудит 2026-08-22) — без этих полей
  // finalize не двигал goalMastery/сцены, и receipt.goal всегда оставался null.
  sceneOutcome?: 'done' | 'partial' | 'skipped';
  goalProgress?: {
    goalId: string;
    mastery: number;
    evidence?: 'scene' | 'novel_context';
    sceneId?: string;
  };
  phraseResults: { text: string; result: PhraseResult }[];
  tutorEvidence: {
    nextTopic?: string;
    homeworkItems: { text: string; meaning: string }[];
    languagePreference?: string;
    /** Знакомство первого урока (remember_learner, 2026-08-23). */
    preferredName?: string;
    learningGoal?: string;
    safetyFlags: { kind: string; note: string }[];
    /** Учитель сам вызвал end_call (телеметрия дисциплины боевой модели, 2026-08-22). */
    endedByTutor?: boolean;
  };
}

interface ParsedFinalizeData {
  version: 1;
  sessionId: string;
  request: FinalizeRequest;
}

export interface MaxVoiceFinalizeCoreInput {
  authUid: string;
  stableUid: string;
  data: unknown;
}

export type MaxVoiceFinalizeLeaseResult =
  | { kind: 'ready'; receipt: MaxVoiceReviewReceiptV1 }
  | { kind: 'processing'; retryAfterMs: number }
  | { kind: 'claimed'; leaseToken: string };

export interface MaxVoiceFinalizeReviewInput {
  request: FinalizeRequest;
  sessionId: string;
  authUid: string;
  stableUid: string;
}

interface MaxVoiceFinalizeMemoryUpdate {
  isTutor: boolean;
  sessionId: string;
  cefr: VoiceCefr;
  facts: readonly string[];
  recurringErrors: readonly string[];
  resolvedErrors: readonly string[];
  homework: readonly string[];
  nextTopic: string;
  languagePreference?: string;
  preferredName?: string;
  learningGoal?: string;
  phraseResults: readonly { text: string; result: PhraseResult }[];
  /** Цель урока из минта (mint.tutor.plan.goal.id) — для receipt.goal, когда учитель не отметил прогресс. */
  goalId: string;
  sceneOutcome: string;
  goalProgress: FinalizeRequest['goalProgress'] | null;
  endedByTutor: boolean;
  tutorSafetyFlagged: boolean;
  nowMs: number;
  sessionStartedAtMs: number;
  sensitiveRejectedCount: number;
}

export interface MaxVoiceFinalizeDependencies {
  nowMs(): number;
  verifySessionOwner(args: {
    authUid: string;
    stableUid: string;
    sessionId: string;
  }): Promise<{ durationSec?: number; sessionStartedAtMs?: number }>;
  claimLease(args: {
    authUid: string;
    stableUid: string;
    sessionId: string;
    leaseToken: string;
    leaseUntilMs: number;
    nowMs: number;
  }): Promise<MaxVoiceFinalizeLeaseResult>;
  review(input: MaxVoiceFinalizeReviewInput): Promise<unknown>;
  /**
   * Пост-разбор безопасности (словарь + Moderation + флаги учителя) → safety_flags
   * и Telegram. Best-effort: никогда не должен ронять финализацию. Дедуп по
   * категориям сессии живёт внутри reviewVoiceSafety, поэтому ретраи безопасны.
   */
  reviewSafety(input: MaxVoiceFinalizeReviewInput): Promise<void>;
  commitReady(args: {
    authUid: string;
    stableUid: string;
    leaseToken: string;
    receipt: MaxVoiceReviewReceiptV1;
    memoryProjection: MaxVoiceReviewMemoryProjection;
    memoryUpdate: MaxVoiceFinalizeMemoryUpdate;
  }): Promise<MaxVoiceReviewReceiptV1>;
}

function chars(value: string): number {
  return Array.from(value).length;
}

function cleanText(value: unknown, max: number, required = false): string {
  if (typeof value !== 'string') {
    if (required) throw new HttpsError('invalid-argument', 'max_finalize_text_invalid');
    return '';
  }
  const normalized = value.trim();
  if (chars(normalized) > max || (required && normalized === '')) {
    throw new HttpsError('invalid-argument', 'max_finalize_text_invalid');
  }
  return normalized;
}

function finiteInt(value: unknown, max: number): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > max) {
    throw new HttpsError('invalid-argument', 'max_finalize_number_invalid');
  }
  return Math.floor(number);
}

function onlyKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
  const set = new Set(allowed);
  if (Object.keys(value).some((key) => !set.has(key))) {
    throw new HttpsError('invalid-argument', 'max_finalize_unknown_field');
  }
}

function object(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpsError('invalid-argument', code);
  }
  return value as Record<string, unknown>;
}

function parseFinalizeData(raw: unknown): ParsedFinalizeData {
  let encoded = '';
  try { encoded = JSON.stringify(raw); } catch { /* rejected below */ }
  if (!encoded || Buffer.byteLength(encoded, 'utf8') > MAX_PAYLOAD_BYTES) {
    throw new HttpsError('invalid-argument', 'max_finalize_payload_too_large');
  }
  const top = object(raw, 'max_finalize_request_invalid');
  onlyKeys(top, ['version', 'sessionId', 'request']);
  if (top.version !== 1) throw new HttpsError('invalid-argument', 'max_finalize_version_invalid');
  const sessionId = cleanText(top.sessionId, 256, true);
  if (sessionId.includes('/') || sessionId === '__proto__' || sessionId === 'constructor') {
    throw new HttpsError('invalid-argument', 'max_finalize_session_invalid');
  }
  const requestRaw = object(top.request, 'max_finalize_request_invalid');
  onlyKeys(requestRaw, [
    'history', 'durationSec', 'speechSec', 'format', 'scenarioId', 'cefr', 'interfaceLang',
    'endReason', 'goalId', 'sceneOutcome', 'goalProgress', 'phraseResults', 'tutorEvidence',
  ]);
  if (!Array.isArray(requestRaw.history) || requestRaw.history.length > MAX_HISTORY_TURNS) {
    throw new HttpsError('invalid-argument', 'max_finalize_history_invalid');
  }
  const history = requestRaw.history.map((entry) => {
    const row = object(entry, 'max_finalize_turn_invalid');
    onlyKeys(row, ['role', 'text']);
    if (row.role !== 'user' && row.role !== 'assistant') {
      throw new HttpsError('invalid-argument', 'max_finalize_turn_invalid');
    }
    const role: 'user' | 'assistant' = row.role;
    return { role, text: cleanText(row.text, MAX_TURN_CHARS, true) };
  });
  const format = cleanText(requestRaw.format, 20, true);
  if (!['scenario', 'companion', 'trial', 'tutor'].includes(format)) {
    throw new HttpsError('invalid-argument', 'max_finalize_format_invalid');
  }
  const cefr = cleanText(requestRaw.cefr, 2, true);
  if (!['A1', 'A2', 'B1', 'B2'].includes(cefr)) {
    throw new HttpsError('invalid-argument', 'max_finalize_cefr_invalid');
  }
  const interfaceLang = cleanText(requestRaw.interfaceLang, 5, true);
  if (!['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'].includes(interfaceLang)) {
    throw new HttpsError('invalid-argument', 'max_finalize_interface_lang_invalid');
  }
  const endReason = cleanText(requestRaw.endReason, 20, true);
  if (!['completed', 'capped', 'dropped', 'background', 'failed'].includes(endReason)) {
    throw new HttpsError('invalid-argument', 'max_finalize_end_reason_invalid');
  }
  if (!Array.isArray(requestRaw.phraseResults) || requestRaw.phraseResults.length > 80) {
    throw new HttpsError('invalid-argument', 'max_finalize_phrase_results_invalid');
  }
  const phraseResults = requestRaw.phraseResults.map((entry) => {
    const row = object(entry, 'max_finalize_phrase_result_invalid');
    onlyKeys(row, ['text', 'result']);
    const result = cleanText(row.result, 16, true);
    if (!['pass', 'needs_work', 'uncertain', 'invalid'].includes(result)) {
      throw new HttpsError('invalid-argument', 'max_finalize_phrase_result_invalid');
    }
    return { text: cleanText(row.text, MAX_TURN_CHARS, true), result: result as PhraseResult };
  });
  let sceneOutcome: FinalizeRequest['sceneOutcome'];
  if (requestRaw.sceneOutcome !== undefined) {
    const outcome = cleanText(requestRaw.sceneOutcome, 12, true);
    if (!['done', 'partial', 'skipped'].includes(outcome)) {
      throw new HttpsError('invalid-argument', 'max_finalize_scene_outcome_invalid');
    }
    sceneOutcome = outcome as NonNullable<FinalizeRequest['sceneOutcome']>;
  }
  let goalProgress: FinalizeRequest['goalProgress'];
  if (requestRaw.goalProgress !== undefined) {
    const row = object(requestRaw.goalProgress, 'max_finalize_goal_progress_invalid');
    onlyKeys(row, ['goalId', 'mastery', 'evidence', 'sceneId']);
    const mastery = finiteInt(row.mastery, 3);
    let evidence: 'scene' | 'novel_context' | undefined;
    if (row.evidence !== undefined) {
      const cleaned = cleanText(row.evidence, 16, true);
      if (cleaned !== 'scene' && cleaned !== 'novel_context') {
        throw new HttpsError('invalid-argument', 'max_finalize_goal_progress_invalid');
      }
      evidence = cleaned;
    }
    goalProgress = {
      goalId: cleanText(row.goalId, 256, true),
      mastery,
      ...(evidence === undefined ? {} : { evidence }),
      ...(row.sceneId === undefined ? {} : { sceneId: cleanText(row.sceneId, 256) }),
    };
  }
  const evidenceRaw = object(requestRaw.tutorEvidence, 'max_finalize_tutor_evidence_invalid');
  onlyKeys(evidenceRaw, ['nextTopic', 'homeworkItems', 'languagePreference', 'safetyFlags', 'endedByTutor', 'preferredName', 'learningGoal']);
  if (evidenceRaw.endedByTutor !== undefined && typeof evidenceRaw.endedByTutor !== 'boolean') {
    throw new HttpsError('invalid-argument', 'max_finalize_tutor_evidence_invalid');
  }
  if (!Array.isArray(evidenceRaw.homeworkItems) || evidenceRaw.homeworkItems.length > 6) {
    throw new HttpsError('invalid-argument', 'max_finalize_homework_invalid');
  }
  const homeworkItems = evidenceRaw.homeworkItems.map((entry) => {
    const row = object(entry, 'max_finalize_homework_invalid');
    onlyKeys(row, ['text', 'meaning']);
    return {
      text: cleanText(row.text, MAX_TURN_CHARS, true),
      meaning: cleanText(row.meaning, MAX_TURN_CHARS),
    };
  });
  if (!Array.isArray(evidenceRaw.safetyFlags) || evidenceRaw.safetyFlags.length > 20) {
    throw new HttpsError('invalid-argument', 'max_finalize_safety_flags_invalid');
  }
  const safetyFlags = evidenceRaw.safetyFlags.map((entry) => {
    const row = object(entry, 'max_finalize_safety_flag_invalid');
    onlyKeys(row, ['kind', 'note']);
    return { kind: cleanText(row.kind, 160, true), note: cleanText(row.note, MAX_TURN_CHARS) };
  });
  return {
    version: 1,
    sessionId,
    request: {
      history,
      durationSec: finiteInt(requestRaw.durationSec, 24 * 60 * 60),
      speechSec: finiteInt(requestRaw.speechSec, 24 * 60 * 60),
      format: format as VoiceFormat,
      ...(requestRaw.scenarioId === undefined ? {} : { scenarioId: cleanText(requestRaw.scenarioId, 256) }),
      cefr: cefr as VoiceCefr,
      interfaceLang: interfaceLang as InterfaceLang,
      endReason: endReason as MaxVoiceReceiptEndReason,
      ...(requestRaw.goalId === undefined ? {} : { goalId: cleanText(requestRaw.goalId, 256) }),
      ...(sceneOutcome === undefined ? {} : { sceneOutcome }),
      ...(goalProgress === undefined ? {} : { goalProgress }),
      phraseResults,
      tutorEvidence: {
        ...(evidenceRaw.nextTopic === undefined ? {} : { nextTopic: cleanText(evidenceRaw.nextTopic, MAX_TURN_CHARS) }),
        homeworkItems,
        ...(evidenceRaw.languagePreference === undefined
          ? {}
          : { languagePreference: cleanText(evidenceRaw.languagePreference, MAX_TURN_CHARS) }),
        // Знакомство: значения проходят тот же PII-фильтр памяти
        // (acceptMemoryCandidate внутри mergeTutorMemory), что и прочие факты.
        ...(evidenceRaw.preferredName === undefined ? {} : { preferredName: cleanText(evidenceRaw.preferredName, 60) }),
        ...(evidenceRaw.learningGoal === undefined ? {} : { learningGoal: cleanText(evidenceRaw.learningGoal, 160) }),
        // зачем: аудит 2026-08-22 — флаги учителя уходят в reviewSafety (журнал
        // safety_flags + Telegram); раньше они здесь молча выбрасывались.
        safetyFlags,
        ...(evidenceRaw.endedByTutor === undefined ? {} : { endedByTutor: evidenceRaw.endedByTutor === true }),
      },
    },
  };
}

const FALLBACK_ACTION: Record<InterfaceLang, string> = {
  ru: 'Повтори одну полезную фразу из разговора.',
  uk: 'Повтори одну корисну фразу з розмови.',
  es: 'Repite una frase útil de la conversación.',
  'pt-BR': 'Repita uma frase útil da conversa.',
  vi: 'Lặp lại một câu hữu ích trong cuộc trò chuyện.',
  id: 'Ulangi satu frasa berguna dari percakapan.',
  tr: 'Konuşmadaki yararlı bir cümleyi tekrarla.',
  pl: 'Powtórz jedno przydatne zdanie z rozmowy.',
};

function phraseEvidence(results: FinalizeRequest['phraseResults']): MaxVoiceReviewReceiptV1['phraseEvidence'] {
  return results.slice(0, 20).map((item) => ({
    phraseId: createHash('sha256').update(item.text.trim().toLocaleLowerCase()).digest('hex').slice(0, 24),
    result: item.result === 'pass' ? 'pass' : item.result === 'needs_work' ? 'retry' : 'uncertain',
  }));
}

export async function finalizeMaxVoiceRequest(
  input: MaxVoiceFinalizeCoreInput,
  deps: MaxVoiceFinalizeDependencies,
): Promise<MaxVoiceReviewReceiptV1 | { status: 'processing'; retryAfterMs: number }> {
  const data = parseFinalizeData(input.data);
  const ownership = await deps.verifySessionOwner({
    authUid: input.authUid,
    stableUid: input.stableUid,
    sessionId: data.sessionId,
  });
  const nowMs = deps.nowMs();
  const leaseToken = randomUUID();
  const lease = await deps.claimLease({
    authUid: input.authUid,
    stableUid: input.stableUid,
    sessionId: data.sessionId,
    leaseToken,
    leaseUntilMs: nowMs + PROCESSING_LEASE_MS,
    nowMs,
  });
  if (lease.kind === 'ready') return lease.receipt;
  if (lease.kind === 'processing') {
    return { status: 'processing', retryAfterMs: Math.max(1_000, Math.min(PROCESSING_LEASE_MS, lease.retryAfterMs)) };
  }

  const reviewInput: MaxVoiceFinalizeReviewInput = {
    request: data.request,
    sessionId: data.sessionId,
    authUid: input.authUid,
    stableUid: input.stableUid,
  };
  // зачем: safety-журнал обязан отработать даже если AI-разбор упал (владелец
  // 2026-08-16 — «сохранение всех опасных разговоров»); параллельно, как в
  // premium_dialog_review. Ошибка safety никогда не роняет финализацию.
  const [reviewSettled] = await Promise.allSettled([
    deps.review(reviewInput),
    deps.reviewSafety(reviewInput).catch(() => undefined),
  ]);
  if (reviewSettled.status === 'rejected') throw reviewSettled.reason;
  const projection = reviewSettled.value;
  const projectionRecord = projection && typeof projection === 'object' ? projection as Record<string, unknown> : {};
  const rawMemoryProjection = sanitizeMaxVoiceMemoryProjection(projectionRecord.memory);
  const learnerText = data.request.history
    .filter((turn) => turn.role === 'user')
    .map((turn) => turn.text)
    .join(' ');
  const acceptedFacts = rawMemoryProjection.facts.filter((candidate) => acceptMemoryCandidate(candidate, {
    evidenceSessionId: data.sessionId,
    learnerText,
  }));
  const memoryProjection: MaxVoiceReviewMemoryProjection = {
    ...rawMemoryProjection,
    facts: acceptedFacts,
  };
  const firstPhrase = data.request.phraseResults[0]?.text;
  const receipt = sanitizeMaxVoiceReviewReceipt({
    sessionId: data.sessionId,
    stableUid: input.stableUid,
    completedAtMs: nowMs,
    durationSec: ownership.durationSec ?? data.request.durationSec,
    speechSec: data.request.speechSec,
    endReason: data.request.endReason,
    projection,
    fallbackAction: FALLBACK_ACTION[data.request.interfaceLang],
    fallbackTargetPhrase: firstPhrase,
    fallbackNextTopic: data.request.tutorEvidence.nextTopic,
    phraseEvidence: phraseEvidence(data.request.phraseResults),
  });
  return deps.commitReady({
    authUid: input.authUid,
    stableUid: input.stableUid,
    leaseToken: lease.leaseToken,
    receipt,
    memoryProjection,
    memoryUpdate: {
      isTutor: data.request.format === 'tutor',
      sessionId: data.sessionId,
      cefr: data.request.cefr,
      ...memoryProjection,
      homework: data.request.tutorEvidence.homeworkItems.map((item) => item.text),
      nextTopic: data.request.tutorEvidence.nextTopic ?? '',
      ...(data.request.tutorEvidence.languagePreference
        ? { languagePreference: data.request.tutorEvidence.languagePreference }
        : {}),
      ...(data.request.tutorEvidence.preferredName ? { preferredName: data.request.tutorEvidence.preferredName } : {}),
      ...(data.request.tutorEvidence.learningGoal ? { learningGoal: data.request.tutorEvidence.learningGoal } : {}),
      phraseResults: data.request.phraseResults,
      goalId: data.request.goalId ?? '',
      sceneOutcome: data.request.sceneOutcome ?? '',
      goalProgress: data.request.goalProgress ?? null,
      endedByTutor: data.request.tutorEvidence.endedByTutor === true,
      tutorSafetyFlagged: data.request.tutorEvidence.safetyFlags.length > 0,
      nowMs,
      sessionStartedAtMs: Math.floor(number(ownership.sessionStartedAtMs)),
      sensitiveRejectedCount: Math.max(0, rawMemoryProjection.facts.length - acceptedFacts.length),
    },
  });
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function clampMastery(value: unknown): 0 | 1 | 2 | 3 {
  const parsed = Math.floor(number(value));
  return (parsed <= 0 ? 0 : parsed >= 3 ? 3 : parsed) as 0 | 1 | 2 | 3;
}

/** A user clear is a durable privacy boundary for every earlier conversation. */
export function shouldApplyMaxVoiceMemoryUpdate(sessionStartedAtMs: number, memoryClearedAtMs: number): boolean {
  return memoryClearedAtMs <= 0 || sessionStartedAtMs > memoryClearedAtMs;
}

async function verifySessionOwner(db: Firestore, args: {
  authUid: string;
  stableUid: string;
  sessionId: string;
}): Promise<{ durationSec?: number; sessionStartedAtMs?: number }> {
  const billing = await db.collection(VOICE_BILLING_COLLECTION)
    .where('sessionId', '==', args.sessionId)
    .limit(1)
    .get();
  if (!billing.empty) {
    const row = billing.docs[0].data() as Record<string, unknown>;
    if (row.uid !== args.stableUid || row.authUid !== args.authUid) {
      throw new HttpsError('permission-denied', 'max_finalize_session_owner_mismatch');
    }
    return {
      durationSec: Math.floor(number(row.seconds)),
      sessionStartedAtMs: Math.floor(number(row.sessionStartedAtMs) || number(row.createdAtMs)),
    };
  }
  const quota = await db.collection(VOICE_QUOTA_COLLECTION)
    .doc(voiceQuotaDocId(args.authUid, args.stableUid))
    .get();
  const row = (quota.data() ?? {}) as Record<string, unknown>;
  const owned = row.stableUid === args.stableUid
    && row.authUid === args.authUid
    && (row.activeSessionId === args.sessionId || row.lastSettledSessionId === args.sessionId);
  if (!owned) {
    // Settlement and billing may still be finishing in another callable.
    throw new HttpsError('unavailable', 'max_finalize_session_not_ready');
  }
  return { sessionStartedAtMs: Math.floor(number(row.sessionStartedAtMs)) };
}

function receiptFromDoc(data: Record<string, unknown>, sessionId: string, stableUid: string): MaxVoiceReviewReceiptV1 | null {
  if (data.sessionId !== sessionId || data.stableUid !== stableUid || data.finalizeStatus !== 'ready') return null;
  return isMaxVoiceReviewReceiptV1(data) ? data : null;
}

const MAX_VOICE_REVIEW_LANGUAGE_NAMES: Record<InterfaceLang, string> = {
  ru: 'Russian', uk: 'Ukrainian', es: 'Spanish', 'pt-BR': 'Brazilian Portuguese',
  vi: 'Vietnamese', id: 'Indonesian', tr: 'Turkish', pl: 'Polish',
};

/**
 * Системный промпт разбора звонка — вынесен из review() в чистую функцию,
 * чтобы формулировку можно было протестировать без мока fetch/OpenAI.
 *
 * зачем (владелец 2026-08-23): «в конце на разборе написано "ученик сделал
 * то-то" — не должно быть так, должно быть "вы"». Модель писала в третьем
 * лице, потому что промпт не задавал точку зрения явно.
 */
export function maxVoiceReviewSystemPrompt(cefr: string, interfaceLang: InterfaceLang): string {
  const languageName = MAX_VOICE_REVIEW_LANGUAGE_NAMES[interfaceLang];
  return `Review a spoken English lesson for a ${cefr} learner. Return JSON only in ${languageName}. Schema: {"worked":[max 3 short strings],"correction":{"said":"","target":"","explanation":""}|null,"tomorrowActions":[1-3 concrete actions],"targetPhrase":string|null,"nextTopic":string|null,"memory":{"facts":[max 6],"recurringErrors":[max 5],"resolvedErrors":[max 5]}}. Use only evidence in the conversation. Never assess pronunciation, accent, phonemes, fluency scores, or audio quality. Do not mention internal policy. Write every user-visible string DIRECTLY TO the learner in second person ("you did…", "вы сказали…") — never in third person about "the learner"/"ученик"/"the student". Use the polite second-person form where the language has one.`;
}

function productionDependencies(db: Firestore, apiKey: string): MaxVoiceFinalizeDependencies {
  const recordStage = (sessionId: string, event: MaxVoiceOpsEventV1) => recordMaxVoiceOpsOnce(db, {
    markerRef: db.collection(REVIEW_COLLECTION).doc(sessionId),
    markerId: sessionId,
    event,
  }).catch(() => undefined);
  return {
    nowMs: () => Date.now(),
    verifySessionOwner: (args) => verifySessionOwner(db, args),
    claimLease: async (args) => {
      const ref = db.collection(REVIEW_COLLECTION).doc(args.sessionId);
      const result = await db.runTransaction(async (tx): Promise<MaxVoiceFinalizeLeaseResult> => {
        const existing = ((await tx.get(ref)).data() ?? {}) as Record<string, unknown>;
        if (existing.stableUid && existing.stableUid !== args.stableUid) {
          throw new HttpsError('permission-denied', 'max_finalize_review_owner_mismatch');
        }
        const ready = receiptFromDoc(existing, args.sessionId, args.stableUid);
        if (ready) return { kind: 'ready', receipt: ready };
        const leaseUntilMs = number(existing.processingLeaseUntilMs);
        if (existing.finalizeStatus === 'processing' && leaseUntilMs > args.nowMs) {
          return { kind: 'processing', retryAfterMs: Math.ceil(leaseUntilMs - args.nowMs) };
        }
        tx.set(ref, {
          sessionId: args.sessionId,
          stableUid: args.stableUid,
          authUid: args.authUid,
          finalizeStatus: 'processing',
          processingLeaseToken: args.leaseToken,
          processingLeaseUntilMs: args.leaseUntilMs,
          updatedAtMs: args.nowMs,
        });
        return { kind: 'claimed', leaseToken: args.leaseToken };
      });
      await recordStage(args.sessionId, { schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage: 'finalization_queued' });
      if (result.kind === 'processing') {
        await recordStage(args.sessionId, { schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage: 'finalization_retryable' });
      }
      return result;
    },
    review: async ({ request, sessionId, authUid, stableUid }) => {
      if (!apiKey) throw new HttpsError('failed-precondition', 'openai_key_missing');
      try {
        await enforceRateLimit(authUid, stableUid);
        const model = await resolveConfiguredDialogModel(db, process.env.OPENAI_DIALOG_MODEL);
        // зачем (владелец 2026-08-23): «на экране завершения не должно быть
        // написано Learner, там должно быть "вы"». Промпт уже требовал второго
        // лица, но реплики ученика были помечены «Learner:», и модель списывала
        // это имя прямо в текст разбора («Learner выбрал имя»). Метка говорящего
        // — тоже часть промпта: зовём ученика «You», и списывать нечего.
        const transcript = request.history
          .map((turn) => `${turn.role === 'user' ? 'You' : 'MAX'}: ${turn.text}`)
          .join('\n');
        const response = await fetch(OPENAI_CHAT_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            max_tokens: 900,
            temperature: 0.2,
            messages: [
              {
                role: 'system',
                content: maxVoiceReviewSystemPrompt(request.cefr, request.interfaceLang),
              },
              { role: 'user', content: transcript },
            ],
            ...(modelSupportsJsonObject(model) ? { response_format: { type: 'json_object' } } : {}),
          }),
        });
        if (!response.ok) {
          console.error('max_voice_finalize review failed', { status: response.status, model });
          throw new HttpsError('unavailable', 'max_finalize_review_failed');
        }
        const body = await response.json() as { choices?: { message?: { content?: unknown } }[] };
        const content = typeof body.choices?.[0]?.message?.content === 'string'
          ? body.choices[0].message.content.slice(0, 12_000)
          : '';
        try {
          return JSON.parse(content) as unknown;
        } catch {
          console.error('max_voice_finalize review unparseable', { model });
          throw new HttpsError('unavailable', 'max_finalize_review_failed');
        }
      } catch (error) {
        await recordStage(sessionId, { schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage: 'review_failed' });
        await recordStage(sessionId, { schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage: 'finalization_retryable' });
        throw error;
      }
    },
    reviewSafety: async ({ request, sessionId, authUid, stableUid }) => {
      // зачем: аудит 2026-08-22 — прод-путь финализации не запускал пост-скан
      // безопасности вовсе (словарь+Moderation+флаги учителя работали только в
      // legacy premiumDialogReview, который клиент для звонков не зовёт).
      // reviewVoiceSafety внутри никогда не бросает и дедупит по sessionId.
      await reviewVoiceSafety({
        apiKey,
        authUid,
        stableUid,
        mode: request.format === 'tutor' ? 'voice_tutor' : 'voice_call',
        history: request.history.map((turn) => ({ role: turn.role, content: turn.text })),
        clientFlags: sanitizeClientSafetyFlags(request.tutorEvidence.safetyFlags),
        sessionId,
      });
    },
    commitReady: async (args) => {
      const reviewRef = db.collection(REVIEW_COLLECTION).doc(args.receipt.sessionId);
      const memoryRef = db.collection(VOICE_TUTOR_MEMORY_COLLECTION)
        .doc(voiceTutorMemoryDocId(args.authUid, args.stableUid));
      let memoryApplied = false;
      const result = await db.runTransaction(async (tx) => {
        const reviewData = ((await tx.get(reviewRef)).data() ?? {}) as Record<string, unknown>;
        if (reviewData.stableUid !== args.stableUid) {
          throw new HttpsError('permission-denied', 'max_finalize_review_owner_mismatch');
        }
        const ready = receiptFromDoc(reviewData, args.receipt.sessionId, args.stableUid);
        if (ready) return ready;
        if (reviewData.processingLeaseToken !== args.leaseToken) {
          throw new HttpsError('aborted', 'max_finalize_lease_lost');
        }
        // зачем: receipt.goal (аудит 2026-08-22) — mastery до/после известны
        // только внутри этой транзакции; авторитет — серверная память, не клиент.
        let goal: MaxVoiceReviewReceiptV1['goal'] = null;
        if (args.memoryUpdate.isTutor) {
          const memoryData = ((await tx.get(memoryRef)).data() ?? {}) as Record<string, unknown>;
          const memoryClearedAtMs = Math.floor(number(memoryData.memoryClearedAtMs));
          if (shouldApplyMaxVoiceMemoryUpdate(args.memoryUpdate.sessionStartedAtMs, memoryClearedAtMs)) {
            const previous = parseTutorMemory(memoryData);
            const update: TutorMemoryUpdate = {
              sessionId: args.memoryUpdate.sessionId,
              enforceHomeworkEvidence: true,
              facts: args.memoryUpdate.facts,
              recurringErrors: args.memoryUpdate.recurringErrors,
              resolvedErrors: args.memoryUpdate.resolvedErrors,
              homework: args.memoryUpdate.homework,
              nextTopic: args.memoryUpdate.nextTopic,
              cefr: args.memoryUpdate.cefr,
              languagePreference: args.memoryUpdate.languagePreference,
              preferredName: args.memoryUpdate.preferredName,
              learningGoal: args.memoryUpdate.learningGoal,
              phraseResults: args.memoryUpdate.phraseResults,
              sceneOutcome: args.memoryUpdate.sceneOutcome,
              goalProgress: args.memoryUpdate.goalProgress,
              nowMs: args.memoryUpdate.nowMs,
            };
            const next = mergeTutorMemory(previous, update);
            const goalId = String(args.memoryUpdate.goalProgress?.goalId || args.memoryUpdate.goalId || '').trim();
            if (goalId && canDoGoalById(goalId)) {
              goal = {
                id: goalId,
                masteryBefore: clampMastery(previous.goalMastery[goalId]),
                masteryAfter: clampMastery(next.goalMastery[goalId]),
              };
            }
            tx.set(memoryRef, {
              ...next,
              authUid: args.authUid,
              stableUid: args.stableUid,
              memoryClearedAtMs,
              updatedAtMs: args.memoryUpdate.nowMs,
            }, { merge: true });
            memoryApplied = true;
          }
        }
        const finalReceipt: MaxVoiceReviewReceiptV1 = { ...args.receipt, goal };
        tx.set(reviewRef, {
          ...finalReceipt,
          authUid: args.authUid,
          finalizeStatus: 'ready',
          processingLeaseToken: null,
          processingLeaseUntilMs: 0,
          updatedAtMs: finalReceipt.completedAtMs,
        });
        return finalReceipt;
      });
      await recordStage(args.receipt.sessionId, {
        schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA,
        stage: 'review_ready',
        latencyMs: Math.max(0, Date.now() - args.receipt.completedAtMs),
      });
      if (args.memoryUpdate.isTutor) {
        // зачем: владелец 2026-08-22 — дисциплина боевой модели (end_call,
        // домашка, цель, флаги) как счётчики в ops; текст не пишется, дедуп
        // по sessionId живёт внутри recordMaxVoiceOpsOnce.
        await recordStage(args.receipt.sessionId, {
          schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA,
          stage: 'lesson_quality',
          lesson: {
            endedByTutor: args.memoryUpdate.endedByTutor,
            homeworkAssigned: args.memoryUpdate.homework.length > 0,
            goalAdvanced: result.goal !== null && result.goal.masteryAfter > result.goal.masteryBefore,
            sceneDone: args.memoryUpdate.sceneOutcome === 'done',
            tutorSafetyFlagged: args.memoryUpdate.tutorSafetyFlagged,
            languagePreferenceSet: Boolean(args.memoryUpdate.languagePreference),
            phrasePass: args.memoryUpdate.phraseResults.filter((item) => item.result === 'pass').length,
            phraseTotal: args.memoryUpdate.phraseResults.length,
          },
        });
      }
      if (memoryApplied) {
        await recordStage(args.receipt.sessionId, { schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage: 'memory_update_succeeded' });
      }
      if (args.memoryUpdate.sensitiveRejectedCount > 0) {
        await recordStage(args.receipt.sessionId, { schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage: 'sensitive_memory_candidate_rejected' });
      }
      return result;
    },
  };
}

export const maxVoiceFinalize = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 60,
  // зачем: 2026-08-23 — функция вернулась на 256 MiB после переезда в кодбазу
  // functions-max. Причиной падения («Memory limit of 256 MiB exceeded») был не
  // её код, а старт общей кодбазы: он грузил 240 функций (370 МБ). Своя кодбаза
  // грузит 12 функций = 78 МБ, запас к лимиту трёхкратный.
  memory: '256MiB',
  maxInstances: 20,
  secrets: [OPENAI_API_KEY],
}, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(
    db,
    authUid,
    undefined,
    { repairLinks: false, requireKnownIdentity: true },
  );
  const apiKey = cleanText(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
  return finalizeMaxVoiceRequest(
    { authUid, stableUid, data: request.data },
    productionDependencies(db, apiKey),
  );
});

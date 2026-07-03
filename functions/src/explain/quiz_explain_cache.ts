/**
 * Global cache for THEMATIC-QUIZ explanations ("разбор" of each option in a thematic quiz
 * question: Кухня/Дом/… — NOT the easy/medium/hard difficulty quizzes, which keep their
 * hand-authored static explanations). Sibling of choice_explain_cache.ts.
 *
 * One (correct phrase, option-set, language) = one doc at quiz_explanations/{quizHash} =
 * one AI generation for the WHOLE product. The first learner who answers a given thematic
 * question generates the whole batch (a warm "разбор" for the correct option + a short
 * "почему этот не тот" for EACH wrong option); every later reader who taps any option reads
 * it free ($0). This is the "warm the cache, give it to everyone" model — no per-user read cap.
 *
 * KEY DETAIL — option ORDER must not fork the cache: thematic quiz choices are shuffled at
 * runtime (shuffleThematicQuizPhraseChoices). So the hash is built from the SORTED option set,
 * and the per-option texts are keyed by the EXACT option string (not by index). The client maps
 * each shown option → its explanation by text, so shuffling never misaligns the "разбор".
 *
 * SECURITY: only the Cloud Function (Admin SDK) writes here. firestore.rules makes the
 * collection read-only for clients (read: if true; create/update: if false; delete: if isAdmin()).
 * Never trust a client hash — the server derives quizHash from the inputs.
 */
import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { normalizePhrase } from './explain_cache';

export const QUIZ_COLLECTION = 'quiz_explanations';

/** Generation lock TTL — slightly above the CF timeout so a crashed generation is re-claimable. */
export const QUIZ_LOCK_TTL_MS = 30_000;

/** Bump to invalidate stale cached quiz explanations on read.
 *  The prompt is NOT part of the hash, so any prompt/voice change must bump this manually.
 *  v1 (2026-06-21): initial batched разбор — correct-option confirm + per-wrong-option line,
 *  in the easy/medium/hard voice (на «ты», тёплый, лёгкий юмор, без воды), keyed by exact option.
 *  v2 (2026-06-30): never serve partial ready docs; every requested wrong option must have a line. */
export const QUIZ_SCHEMA_VERSION = 2;

/** How long a judge-rejected batch serves nothing before one request may retry generation. */
export const QUIZ_REJECTED_RETRY_TTL_MS = 10 * 60_000;

export type QuizExplanationStatus = 'pending' | 'ready' | 'rejected';

export interface CachedQuizExplanation {
  status: QuizExplanationStatus;
  schemaVersion: number;
  /** Confirmation shown when the user picked the correct option (the "разбор" of the right answer). */
  confirm?: string;
  /** Map normalizedOption → short "почему этот вариант не тот" line, for EACH wrong option. */
  options?: Record<string, string>;
  lang?: string;
  correctEn?: string;
  /** The native-language prompt/meaning of the question (audit only — never echoed to the learner). */
  questionPrompt?: string;
  reason?: string;
  model?: string;
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface QuizReadyMeta {
  lang: string;
  correctEn: string;
  questionPrompt?: string;
  model?: string;
}

function isCurrentSchema(data: { schemaVersion?: number } | undefined | null): boolean {
  return Number(data?.schemaVersion ?? 0) >= QUIZ_SCHEMA_VERSION;
}

/** Normalize a single option string for use as a stable map key. Reuses the phrase normalizer. */
export function normalizeQuizOption(option: string): string {
  return normalizePhrase(option);
}

/**
 * Deterministic 40-hex cache id for a (correct phrase, option-set, LANGUAGE) triple.
 * The FULL option set (correct + wrong) is normalized + sorted so option ORDER never forks the
 * cache, but a genuinely different option SET is correctly a different doc — the разбор references
 * the specific options. Pass the CANONICAL langKey from resolvePromptLangKey().
 */
export function quizHashFor(correctEn: string, allChoices: string[], langKey: string): string {
  const normalizedChoices = [...new Set(allChoices.map(normalizeQuizOption).filter(Boolean))].sort();
  const seed = `${String(langKey ?? '').trim().toLowerCase()}|${normalizePhrase(correctEn)}|${normalizedChoices.join('|')}`;
  return createHash('sha256').update(seed).digest('hex').slice(0, 40);
}

function docRef(quizHash: string) {
  return admin.firestore().collection(QUIZ_COLLECTION).doc(quizHash);
}

/** True iff a rejected doc may be regenerated now (judge false-positive recovery after TTL). */
export function isRetryableRejectedQuiz(
  data: { status?: string; updatedAtMs?: number } | null | undefined,
  nowMs: number,
): boolean {
  if (!data || data.status !== 'rejected') return false;
  const updatedAtMs = Number(data.updatedAtMs ?? 0);
  return nowMs - updatedAtMs > QUIZ_REJECTED_RETRY_TTL_MS;
}

/** Read the cached doc, or null if absent OR written by an older schema (stale → regenerate). */
export async function readCachedQuizExplanation(quizHash: string): Promise<CachedQuizExplanation | null> {
  const snap = await docRef(quizHash).get();
  const data = snap.data();
  if (!data) return null;
  if (!isCurrentSchema(data)) return null;
  return data as CachedQuizExplanation;
}

/** Claim the generation lock in a transaction. Returns true iff the caller should generate. */
export async function claimQuizPendingLock(quizHash: string, nowMs: number): Promise<boolean> {
  const ref = docRef(quizHash);
  const db = admin.firestore();
  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() as CachedQuizExplanation | undefined;
    if (data && isCurrentSchema(data)) {
      if (data.status === 'ready') return false;
      if (data.status === 'rejected' && !isRetryableRejectedQuiz(data, nowMs)) return false;
      if (data.status === 'pending') {
        const createdAtMs = Number(data.createdAtMs ?? 0);
        const stale = nowMs - createdAtMs > QUIZ_LOCK_TTL_MS;
        if (!stale) return false;
      }
    }
    tx.set(ref, {
      status: 'pending',
      schemaVersion: QUIZ_SCHEMA_VERSION,
      reason: null,
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
    }, { merge: true });
    return true;
  });
}

/** Publish a validated batch to the global cache (status=ready). */
export async function writeReadyQuizExplanation(
  quizHash: string,
  payload: { confirm: string; options: Record<string, string> },
  meta: QuizReadyMeta,
): Promise<void> {
  await docRef(quizHash).set({
    status: 'ready',
    schemaVersion: QUIZ_SCHEMA_VERSION,
    confirm: payload.confirm,
    options: payload.options,
    lang: meta.lang,
    correctEn: meta.correctEn,
    questionPrompt: meta.questionPrompt ?? null,
    model: meta.model ?? null,
    reason: null,
    updatedAtMs: Date.now(),
  }, { merge: true });
}

/** Mark a batch rejected (judge). Serves nothing; regenerates after the retry TTL. */
export async function writeRejectedQuizExplanation(quizHash: string, reason: string): Promise<void> {
  await docRef(quizHash).set({
    status: 'rejected',
    schemaVersion: QUIZ_SCHEMA_VERSION,
    reason,
    updatedAtMs: Date.now(),
  }, { merge: true });
}

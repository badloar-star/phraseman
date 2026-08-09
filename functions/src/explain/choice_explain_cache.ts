/**
 * Global cache for CHOICE-exercise explanations (correct confirmation + per-distractor
 * "why this one doesn't fit"). Sibling of explain_cache.ts but with its own collection,
 * shape and schema versioning — see functions/src/explain_choice.ts for the orchestrator.
 *
 * One (correct phrase, option-set, language) = one doc at choice_explanations/{choiceHash} =
 * one AI generation for the WHOLE product. The first caller (whoever answers the exercise
 * first) generates the whole batch; every later reader who taps any option reads it free.
 *
 * SECURITY: only the Cloud Function (Admin SDK) writes here. firestore.rules makes the
 * collection read-only for clients (read: if true; write: if false; delete: if isAdmin()).
 * Never trust a client hash — the server derives choiceHash from the inputs.
 */
import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { normalizePhrase } from './explain_cache';

export const CHOICE_COLLECTION = 'choice_explanations';

/** Generation lock TTL — slightly above the CF timeout so a crashed generation is re-claimable. */
export const CHOICE_LOCK_TTL_MS = 30_000;

/** Bump to invalidate stale cached choice explanations on read.
 *  v1 (2026-06-20): initial batched correct-confirm + per-distractor explanations.
 *  v2 (2026-06-21): prompt now addresses the learner as "ты" (Phraseman Bible) and BANS guessing the
 *  reason a wrong option was picked ("you translated literally") — old v1 batches may use "вы" and
 *  invented causes, so regenerate.
 *  v3 (2026-06-21): audit fixes — dropped the "WRONG option" framing (no «ошибка»/«wrong» to the
 *  learner), tightened length to ≤12 words, added "don't invent a definition you're unsure of", warm
 *  marker + forward nudge in the confirm — old v2 batches predate these, regenerate. */
export const CHOICE_SCHEMA_VERSION = 3;

/** How long a judge-rejected batch serves nothing before one request may retry generation. */
export const CHOICE_REJECTED_RETRY_TTL_MS = 10 * 60_000;

export type ChoiceExplanationStatus = 'pending' | 'ready' | 'rejected';

export interface CachedChoiceExplanation {
  status: ChoiceExplanationStatus;
  schemaVersion: number;
  /** Confirmation shown when the user picked the correct option. */
  confirm?: string;
  /** Map normalizedDistractor → short "why this one doesn't fit" explanation. */
  distractors?: Record<string, string>;
  lang?: string;
  correctEn?: string;
  reason?: string;
  model?: string;
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface ChoiceReadyMeta {
  lang: string;
  correctEn: string;
  model?: string;
}

function isCurrentSchema(data: { schemaVersion?: number } | undefined | null): boolean {
  return Number(data?.schemaVersion ?? 0) >= CHOICE_SCHEMA_VERSION;
}

/** Normalize a single option string for use as a stable map key. Reuses the phrase normalizer. */
export function normalizeChoiceOption(option: string): string {
  return normalizePhrase(option);
}

/**
 * Deterministic 40-hex cache id for a (correct phrase, option-set, LANGUAGE) triple.
 * Distractors are normalized + sorted so option ORDER never forks the cache, but a different
 * option SET (different distractors) is correctly a different doc — explanations reference
 * specific wrong options. Pass the CANONICAL langKey from resolvePromptLangKey().
 */
export function choiceHashFor(correctEn: string, distractors: string[], langKey: string, studyTarget = 'en'): string {
  const normalizedDistractors = [...new Set(distractors.map(normalizeChoiceOption).filter(Boolean))].sort();
  // studyTarget in the key so a fr-learner never gets the en-cached batch for the same string.
  // 'en' emits no segment ⇒ existing English docs keep their hash (see phraseHashFor rationale).
  const target = String(studyTarget ?? 'en').trim().toLowerCase() || 'en';
  const targetSegment = target === 'en' ? '' : `${target}::`;
  const seed = `${targetSegment}${String(langKey ?? '').trim().toLowerCase()}|${normalizePhrase(correctEn)}|${normalizedDistractors.join('|')}`;
  return createHash('sha256').update(seed).digest('hex').slice(0, 40);
}

function docRef(choiceHash: string) {
  return admin.firestore().collection(CHOICE_COLLECTION).doc(choiceHash);
}

/** True iff a rejected doc may be regenerated now (judge false-positive recovery after TTL). */
export function isRetryableRejectedChoice(
  data: { status?: string; updatedAtMs?: number } | null | undefined,
  nowMs: number,
): boolean {
  if (!data || data.status !== 'rejected') return false;
  const updatedAtMs = Number(data.updatedAtMs ?? 0);
  return nowMs - updatedAtMs > CHOICE_REJECTED_RETRY_TTL_MS;
}

/** Read the cached doc, or null if absent OR written by an older schema (stale → regenerate). */
export async function readCachedChoiceExplanation(choiceHash: string): Promise<CachedChoiceExplanation | null> {
  const snap = await docRef(choiceHash).get();
  const data = snap.data();
  if (!data) return null;
  if (!isCurrentSchema(data)) return null;
  return data as CachedChoiceExplanation;
}

/** Claim the generation lock in a transaction. Returns true iff the caller should generate. */
export async function claimChoicePendingLock(choiceHash: string, nowMs: number): Promise<boolean> {
  const ref = docRef(choiceHash);
  const db = admin.firestore();
  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() as CachedChoiceExplanation | undefined;
    if (data && isCurrentSchema(data)) {
      if (data.status === 'ready') return false;
      if (data.status === 'rejected' && !isRetryableRejectedChoice(data, nowMs)) return false;
      if (data.status === 'pending') {
        const createdAtMs = Number(data.createdAtMs ?? 0);
        const stale = nowMs - createdAtMs > CHOICE_LOCK_TTL_MS;
        if (!stale) return false;
      }
    }
    tx.set(ref, {
      status: 'pending',
      schemaVersion: CHOICE_SCHEMA_VERSION,
      reason: null,
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
    }, { merge: true });
    return true;
  });
}

/** Publish a validated batch to the global cache (status=ready). */
export async function writeReadyChoiceExplanation(
  choiceHash: string,
  payload: { confirm: string; distractors: Record<string, string> },
  meta: ChoiceReadyMeta,
): Promise<void> {
  await docRef(choiceHash).set({
    status: 'ready',
    schemaVersion: CHOICE_SCHEMA_VERSION,
    confirm: payload.confirm,
    distractors: payload.distractors,
    lang: meta.lang,
    correctEn: meta.correctEn,
    model: meta.model ?? null,
    reason: null,
    updatedAtMs: Date.now(),
  }, { merge: true });
}

/** Mark a batch rejected (judge). Serves nothing; regenerates after the retry TTL. */
export async function writeRejectedChoiceExplanation(
  choiceHash: string,
  reason: string,
  retryImmediately = false,
): Promise<void> {
  await docRef(choiceHash).set({
    status: 'rejected',
    schemaVersion: CHOICE_SCHEMA_VERSION,
    reason,
    updatedAtMs: retryImmediately ? 0 : Date.now(),
  }, { merge: true });
}

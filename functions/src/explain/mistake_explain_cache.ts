/**
 * Global cache for MISTAKE explanations (lesson "build the phrase" exercise).
 *
 * One (target phrase, user's wrong answer, language) = one doc at
 * mistake_explanations/{mistakeHash} = one AI generation for the WHOLE product.
 * The first learner who makes a given mistake generates it; every later learner
 * who repeats the SAME mistake on the SAME phrase reads it free ($0). This is the
 * "warm the cache, give it to everyone" model — no per-user daily cap on reads.
 *
 * Each doc holds TWO texts:
 *   - full: the careful breakdown (every wrong word + the mini-rule + why).
 *   - eli5: the "explain like I'm five" version shown in the modal (optional,
 *     generated lazily on first tap of «Объяснить»).
 *
 * SECURITY: only the Cloud Function (Admin SDK) writes here. firestore.rules makes
 * the collection read-only for clients (read: if true; write: if false; delete: if isAdmin()).
 * Never trust a client hash — the server derives mistakeHash from the inputs.
 *
 * Sibling of choice_explain_cache.ts — same lock/schema discipline.
 */
import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { normalizePhrase } from './explain_cache';

export const MISTAKE_COLLECTION = 'mistake_explanations';

/** Generation lock TTL — slightly above the CF timeout so a crashed generation is re-claimable. */
export const MISTAKE_LOCK_TTL_MS = 35_000;

/** Bump to invalidate stale cached mistake explanations on read.
 *  v1 (2026-06-20): full breakdown + lazy ELI5 variant.
 *  v2 (2026-06-20): fix — explanations were generated in English; prompts now enforce interfaceLang.
 *  v3 (2026-06-20): prompts re-aimed to teach the SINGLE governing distinction behind each wrong
 *  word (e.g. "that" vs "it") with a minimal pair + a runnable test, on the strong model tier,
 *  instead of generic "short rule, max 4 sentences" filler — old breakdowns AND old ELI5 text are
 *  watered-down and must be regenerated. */
export const MISTAKE_SCHEMA_VERSION = 3;

/** How long a judge-rejected breakdown serves nothing before one request may retry generation. */
export const MISTAKE_REJECTED_RETRY_TTL_MS = 10 * 60_000;

export type MistakeExplanationStatus = 'pending' | 'ready' | 'rejected';
export type MistakeExplainVariant = 'full' | 'eli5';

export interface CachedMistakeExplanation {
  status: MistakeExplanationStatus;
  schemaVersion: number;
  /** The careful breakdown shown inline under the exercise. */
  full?: string;
  /** The "explain like I'm five" text shown in the modal. Generated lazily. */
  eli5?: string;
  lang?: string;
  /** Canonical target answer (the correct phrase). */
  targetEn?: string;
  /** Canonical wrong answer the learner submitted. */
  userAnswer?: string;
  reason?: string;
  model?: string;
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface MistakeReadyMeta {
  lang: string;
  targetEn: string;
  userAnswer: string;
  model?: string;
}

function isCurrentSchema(data: { schemaVersion?: number } | undefined | null): boolean {
  return Number(data?.schemaVersion ?? 0) >= MISTAKE_SCHEMA_VERSION;
}

/**
 * Deterministic 40-hex cache id for a (target phrase, user wrong answer, LANGUAGE) triple.
 * Both phrases are normalized so trivial spacing/case/punctuation differences collapse to one
 * doc, but a genuinely different wrong answer is correctly a different doc — the breakdown
 * references the specific words the learner got wrong.
 */
export function mistakeHashFor(targetEn: string, userAnswer: string, langKey: string): string {
  const seed = `${String(langKey ?? '').trim().toLowerCase()}|${normalizePhrase(targetEn)}|${normalizePhrase(userAnswer)}`;
  return createHash('sha256').update(seed).digest('hex').slice(0, 40);
}

function docRef(mistakeHash: string) {
  return admin.firestore().collection(MISTAKE_COLLECTION).doc(mistakeHash);
}

/** True iff a rejected doc may be regenerated now (judge false-positive recovery after TTL). */
export function isRetryableRejectedMistake(
  data: { status?: string; updatedAtMs?: number } | null | undefined,
  nowMs: number,
): boolean {
  if (!data || data.status !== 'rejected') return false;
  const updatedAtMs = Number(data.updatedAtMs ?? 0);
  return nowMs - updatedAtMs > MISTAKE_REJECTED_RETRY_TTL_MS;
}

/** Read the cached doc, or null if absent OR written by an older schema (stale → regenerate). */
export async function readCachedMistakeExplanation(mistakeHash: string): Promise<CachedMistakeExplanation | null> {
  const snap = await docRef(mistakeHash).get();
  const data = snap.data();
  if (!data) return null;
  if (!isCurrentSchema(data)) return null;
  return data as CachedMistakeExplanation;
}

/**
 * Claim the generation lock for the FULL breakdown in a transaction.
 * Returns true iff the caller should generate it.
 */
export async function claimMistakePendingLock(mistakeHash: string, nowMs: number): Promise<boolean> {
  const ref = docRef(mistakeHash);
  const db = admin.firestore();
  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() as CachedMistakeExplanation | undefined;
    if (data && isCurrentSchema(data)) {
      if (data.status === 'ready') return false;
      if (data.status === 'rejected' && !isRetryableRejectedMistake(data, nowMs)) return false;
      if (data.status === 'pending') {
        const createdAtMs = Number(data.createdAtMs ?? 0);
        const stale = nowMs - createdAtMs > MISTAKE_LOCK_TTL_MS;
        if (!stale) return false;
      }
    }
    tx.set(ref, {
      status: 'pending',
      schemaVersion: MISTAKE_SCHEMA_VERSION,
      reason: null,
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
    }, { merge: true });
    return true;
  });
}

/** Publish a validated full breakdown to the global cache (status=ready). */
export async function writeReadyMistakeExplanation(
  mistakeHash: string,
  full: string,
  meta: MistakeReadyMeta,
): Promise<void> {
  await docRef(mistakeHash).set({
    status: 'ready',
    schemaVersion: MISTAKE_SCHEMA_VERSION,
    full,
    lang: meta.lang,
    targetEn: meta.targetEn,
    userAnswer: meta.userAnswer,
    model: meta.model ?? null,
    reason: null,
    updatedAtMs: Date.now(),
  }, { merge: true });
}

/** Attach a lazily-generated ELI5 variant to an existing ready doc. */
export async function writeEli5MistakeExplanation(mistakeHash: string, eli5: string): Promise<void> {
  await docRef(mistakeHash).set({
    eli5,
    updatedAtMs: Date.now(),
  }, { merge: true });
}

/** Mark a breakdown rejected (judge). Serves nothing; regenerates after the retry TTL. */
export async function writeRejectedMistakeExplanation(mistakeHash: string, reason: string): Promise<void> {
  await docRef(mistakeHash).set({
    status: 'rejected',
    schemaVersion: MISTAKE_SCHEMA_VERSION,
    reason,
    updatedAtMs: Date.now(),
  }, { merge: true });
}

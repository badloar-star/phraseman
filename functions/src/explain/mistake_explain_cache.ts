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
 *   - eli5: the "explain like I'm five" version shown in the modal. New full
 *     generations publish it together; legacy full-only entries fill it lazily.
 *
 * SECURITY: only callable/Admin SDK code reads or writes this cache. firestore.rules denies
 * direct client reads and writes; authenticated admin clients retain delete-only reset access.
 * Never trust a client hash — the server derives mistakeHash from the inputs.
 *
 * Sibling of choice_explain_cache.ts — same lock/schema discipline.
 */
import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { normalizePhrase } from './explain_cache';

export const MISTAKE_COLLECTION = 'mistake_explanations';

/** Generation lock TTL — above the 120s callable timeout so a live retry cannot be reclaimed. */
export const MISTAKE_LOCK_TTL_MS = 135_000;

/** Bump to invalidate stale cached mistake explanations on read.
 *  v1 (2026-06-20): full breakdown + lazy ELI5 variant.
 *  v2 (2026-06-20): fix — explanations were generated in English; prompts now enforce interfaceLang.
 *  v3 (2026-06-20): prompts re-aimed to teach the SINGLE governing distinction behind each wrong
 *  word (e.g. "that" vs "it") with a minimal pair + a runnable test, on the strong model tier,
 *  instead of generic "short rule, max 4 sentences" filler — old breakdowns AND old ELI5 text are
 *  watered-down and must be regenerated.
 *  v4 (2026-06-21): prompts now (a) address the learner as "ты" with a light, friendly touch of humor
 *  (Phraseman Bible voice), and (b) added an ANTONYM / plain-wrong-word branch so trivial opposites
 *  like "bad"→"good" get ONE short line instead of водянистые tirades about "what the question
 *  implies" — old cached breakdowns/ELI5 for such cases are exactly that water and must regenerate.
 *  v5 (2026-06-21): prompts now BAN guessing the learner's reason for the mistake ("you translated
 *  literally", "you didn't think about the context") — a false, unkind mind-read when the learner may
 *  have simply mis-tapped (user report: goodbye→thanks). Old v3/v4 breakdowns contain exactly this
 *  invented-cause water and must regenerate. */
export const MISTAKE_SCHEMA_VERSION = 6;

/** How long a judge-rejected breakdown serves nothing before one request may retry generation. */
export const MISTAKE_REJECTED_RETRY_TTL_MS = 15_000;

export type MistakeExplanationStatus = 'pending' | 'ready' | 'rejected';
export type MistakeExplainVariant = 'full' | 'eli5';

export interface CachedMistakeExplanation {
  /** Absent on a valid ELI5-first partial document until the full variant is generated. */
  status?: MistakeExplanationStatus;
  schemaVersion: number;
  /** The careful breakdown shown inline under the exercise. */
  full?: string;
  /** The "explain like I'm five" text shown in the modal. */
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
  eli5PendingAtMs?: number | null;
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
export function mistakeHashFor(targetEn: string, userAnswer: string, langKey: string, studyTarget = 'en'): string {
  // studyTarget in the key so a fr-learner's breakdown never collides with an en one on the same
  // strings. 'en' emits no segment ⇒ existing English docs keep their hash (see phraseHashFor).
  const target = String(studyTarget ?? 'en').trim().toLowerCase() || 'en';
  const targetSegment = target === 'en' ? '' : `${target}::`;
  const seed = `${targetSegment}${String(langKey ?? '').trim().toLowerCase()}|${normalizePhrase(targetEn)}|${normalizePhrase(userAnswer)}`;
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

/** Claim lazy ELI5 only when no full bundle generation is live. */
export async function claimMistakeEli5PendingLock(mistakeHash: string, nowMs: number): Promise<boolean> {
  const ref = docRef(mistakeHash);
  const db = admin.firestore();
  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() as CachedMistakeExplanation | undefined;
    if (data && isCurrentSchema(data)) {
      if (data.eli5) return false;
      if (data.status === 'pending') {
        const fullPendingAtMs = Number(data.createdAtMs ?? 0);
        if (fullPendingAtMs > 0 && nowMs - fullPendingAtMs <= MISTAKE_LOCK_TTL_MS) return false;
      }
      const pendingAt = Number(data.eli5PendingAtMs ?? 0);
      if (pendingAt > 0 && nowMs - pendingAt <= MISTAKE_LOCK_TTL_MS) return false;
    }
    tx.set(ref, {
      schemaVersion: MISTAKE_SCHEMA_VERSION,
      eli5PendingAtMs: nowMs,
      updatedAtMs: nowMs,
    }, { merge: true });
    return true;
  });
}

/** Release only the FULL lease owned by this request; never clear a newer winner's lease. */
export async function releaseMistakePendingLock(mistakeHash: string, claimedAtMs: number): Promise<void> {
  const ref = docRef(mistakeHash);
  const db = admin.firestore();
  await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() as CachedMistakeExplanation | undefined;
    if (data?.status !== 'pending' || Number(data.createdAtMs ?? 0) !== claimedAtMs) return;
    tx.set(ref, {
      status: admin.firestore.FieldValue.delete(),
      createdAtMs: admin.firestore.FieldValue.delete(),
      reason: admin.firestore.FieldValue.delete(),
      updatedAtMs: Date.now(),
    }, { merge: true });
  });
}

/** Release only the ELI5 lease owned by this request; never clear a newer winner's lease. */
export async function releaseMistakeEli5PendingLock(mistakeHash: string, claimedAtMs: number): Promise<void> {
  const ref = docRef(mistakeHash);
  const db = admin.firestore();
  await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() as CachedMistakeExplanation | undefined;
    if (Number(data?.eli5PendingAtMs ?? 0) !== claimedAtMs) return;
    tx.set(ref, {
      eli5PendingAtMs: admin.firestore.FieldValue.delete(),
      updatedAtMs: Date.now(),
    }, { merge: true });
  });
}

/** Remove only a cached variant that failed the current language/safety contract. */
export async function invalidateMistakeCachedVariant(
  mistakeHash: string,
  variant: MistakeExplainVariant,
): Promise<void> {
  const ref = docRef(mistakeHash);
  const db = admin.firestore();
  await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() as CachedMistakeExplanation | undefined;
    if (!data || !isCurrentSchema(data)) return;
    if (variant === 'eli5') {
      if (!data.eli5) return;
      tx.set(ref, {
        eli5: admin.firestore.FieldValue.delete(),
        eli5PendingAtMs: admin.firestore.FieldValue.delete(),
        updatedAtMs: Date.now(),
      }, { merge: true });
      return;
    }
    if (data.status !== 'ready' || !data.full) return;
    tx.set(ref, {
      status: admin.firestore.FieldValue.delete(),
      full: admin.firestore.FieldValue.delete(),
      createdAtMs: admin.firestore.FieldValue.delete(),
      reason: admin.firestore.FieldValue.delete(),
      updatedAtMs: Date.now(),
    }, { merge: true });
  });
}

/** Publish a validated full breakdown to the global cache (status=ready). */
export async function writeReadyMistakeExplanation(
  mistakeHash: string,
  full: string,
  meta: MistakeReadyMeta,
  claimedAtMs: number,
): Promise<boolean> {
  const ref = docRef(mistakeHash);
  return admin.firestore().runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() as CachedMistakeExplanation | undefined;
    if (data?.status !== 'pending' || Number(data.createdAtMs ?? 0) !== claimedAtMs) return false;
    tx.set(ref, {
      status: 'ready',
      schemaVersion: MISTAKE_SCHEMA_VERSION,
      full,
      createdAtMs: admin.firestore.FieldValue.delete(),
      lang: meta.lang,
      targetEn: admin.firestore.FieldValue.delete(),
      userAnswer: admin.firestore.FieldValue.delete(),
      model: meta.model ?? null,
      reason: null,
      updatedAtMs: Date.now(),
    }, { merge: true });
    return true;
  });
}

/** Publish both validated variants atomically so readers never observe a partial bundle. */
export async function writeReadyMistakeExplanationBundle(
  mistakeHash: string,
  bundle: { full: string; eli5: string },
  meta: MistakeReadyMeta,
  claimedAtMs: number,
): Promise<boolean> {
  const ref = docRef(mistakeHash);
  return admin.firestore().runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() as CachedMistakeExplanation | undefined;
    if (data?.status !== 'pending' || Number(data.createdAtMs ?? 0) !== claimedAtMs) return false;
    tx.set(ref, {
      status: 'ready',
      schemaVersion: MISTAKE_SCHEMA_VERSION,
      full: bundle.full,
      eli5: bundle.eli5,
      eli5PendingAtMs: null,
      createdAtMs: admin.firestore.FieldValue.delete(),
      lang: meta.lang,
      targetEn: admin.firestore.FieldValue.delete(),
      userAnswer: admin.firestore.FieldValue.delete(),
      model: meta.model ?? null,
      reason: null,
      updatedAtMs: Date.now(),
    }, { merge: true });
    return true;
  });
}

/** Publish lazy ELI5 only while this request still owns the lease. */
export async function writeEli5MistakeExplanation(
  mistakeHash: string,
  eli5: string,
  claimedAtMs: number,
): Promise<boolean> {
  const ref = docRef(mistakeHash);
  const db = admin.firestore();
  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() as CachedMistakeExplanation | undefined;
    if (Number(data?.eli5PendingAtMs ?? 0) !== claimedAtMs) return false;
    tx.set(ref, {
      eli5,
      eli5PendingAtMs: null,
      targetEn: admin.firestore.FieldValue.delete(),
      userAnswer: admin.firestore.FieldValue.delete(),
      updatedAtMs: Date.now(),
    }, { merge: true });
    return true;
  });
}

/** Mark a breakdown rejected (judge). Serves nothing; regenerates after the retry TTL. */
export async function writeRejectedMistakeExplanation(
  mistakeHash: string,
  reason: string,
  claimedAtMs: number,
): Promise<boolean> {
  const ref = docRef(mistakeHash);
  return admin.firestore().runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() as CachedMistakeExplanation | undefined;
    if (data?.status !== 'pending' || Number(data.createdAtMs ?? 0) !== claimedAtMs) return false;
    tx.set(ref, {
      status: 'rejected',
      schemaVersion: MISTAKE_SCHEMA_VERSION,
      full: admin.firestore.FieldValue.delete(),
      eli5: admin.firestore.FieldValue.delete(),
      createdAtMs: admin.firestore.FieldValue.delete(),
      targetEn: admin.firestore.FieldValue.delete(),
      userAnswer: admin.firestore.FieldValue.delete(),
      reason,
      updatedAtMs: Date.now(),
    }, { merge: true });
    return true;
  });
}

/**
 * Global explanation cache for "Explain like I'm five".
 *
 * One phrase = one doc at phrase_explanations/{phraseHash} = one AI generation for the WHOLE
 * product, ever. The first caller generates; after the AI judge passes, the doc becomes public
 * and every later read is free (0 tokens).
 *
 * SECURITY: only the Cloud Function (Admin SDK) writes here. firestore.rules makes this
 * collection read-only for clients (read: if true; write: if false). Never trust a client hash —
 * the server derives phraseHash from phraseEn via normalizePhrase.
 *
 * The pure hashing/normalization is dependency-free; the read/lock/write touch Firestore.
 * `now` is passed in (not read from Date.now()) so lock-staleness is deterministically testable.
 */
import * as admin from 'firebase-admin';
import { createHash } from 'crypto';

export const EXPLAIN_COLLECTION = 'phrase_explanations';

/** Generation lock TTL. Slightly above explainPhrase's 150s CF timeout so a
 *  client watchdog retry can never overlap the still-running lease owner. */
export const LOCK_TTL_MS = 165_000;

/** Cache doc schema version — also used to invalidate stale cached explanations on read.
 *  v2 (2026-06-10): prompt rewritten to explain ENGLISH grammar instead of restating the meaning.
 *  v3 (2026-06-10): explanation became LONGER and structured (short paragraphs, quoted English
 *  words for client-side highlighting) — v2 short texts are stale and must be regenerated.
 *  v4 (2026-06-20): prompt re-aimed to teach the SINGLE most-confusable distinction of THIS phrase
 *  (e.g. "it" vs "that") with a minimal pair, instead of narrating every obvious word — the old
 *  90-word "walk through every word" texts are watered-down and must be regenerated.
 *  v5 (2026-06-21): prompt now addresses the learner as "ты" with a light, friendly touch of humor
 *  (Phraseman Bible voice) — older texts use a neutral/formal tone and are regenerated for consistency.
 *  v6 (2026-06-21): audit fixes — removed "simply" (leaked into «просто», a banned filler), banned
 *  filler words, tightened anti-hallucination for out-of-bank traps, softened the single-trap rule,
 *  added the Phraseman word-swap bridge — older texts predate these, regenerate.
 *  A doc whose schemaVersion is below this is treated as absent (see isCurrentSchema). */
export const EXPLAIN_SCHEMA_VERSION = 6;

/** The `reason` written when the REPORT threshold rejects a phrase (explain_reports.ts).
 *  Report-rejected docs are STICKY: they never auto-regenerate (mass-report regen abuse) and can
 *  only be reset by an admin. Judge-rejected docs, by contrast, retry after a TTL — the judge has
 *  false positives (prod 2026-06-10: a fine RU explanation rejected as non_target_language because
 *  it quotes English words), and a transient verdict must not poison a phrase forever. */
export const REPORT_REJECT_REASON = 'report_threshold';

/** How long a JUDGE-rejected phrase serves the fallback before one request may retry generation.
 *  Bounded cost: one retry per TTL per phrase, still inside user/global budgets. */
export const REJECTED_RETRY_TTL_MS = 15_000;

/** True iff a cached doc was written by the CURRENT prompt/schema. Older docs are stale and
 *  must be ignored on read + re-claimable for regeneration. */
function isCurrentSchema(data: { schemaVersion?: number } | undefined | null): boolean {
  return Number(data?.schemaVersion ?? 0) >= EXPLAIN_SCHEMA_VERSION;
}

export type ExplanationStatus = 'pending' | 'ready' | 'rejected';

export interface CachedExplanation {
  status: ExplanationStatus;
  schemaVersion: number;
  text?: string;
  lang?: string;
  phraseEn?: string;
  reason?: string;
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface ReadyMeta {
  lang: string;
  phraseEn: string;
  model?: string;
}

/**
 * Canonical normalization. trim → lowercase → collapse internal whitespace → strip trailing
 * punctuation. So "Hello!", "  hello " and "HELLO?" all map to one cache key (aggressive dedup
 * → one generation per phrase). This is the SINGLE source of truth; the report CF reuses it.
 */
export function normalizePhrase(phraseEn: string): string {
  return String(phraseEn ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[!?.,;:'"]+$/u, '')
    .trim();
}

/**
 * Deterministic 40-hex cache id for a (phrase, OUTPUT-LANGUAGE, STUDY-LANGUAGE) triple.
 *
 * langKey is REQUIRED (audit bug 2026-06-10): the cached text is written in one language, so the
 * key must include it — hashing the phrase alone let an es-user receive the ru-cached explanation.
 * Pass the CANONICAL key from resolvePromptLangKey() (explain_prompts), never the raw client lang —
 * both the generation CF and the report CF must derive the key the same way to hit the same doc.
 *
 * studyTarget (the language being LEARNED) is ALSO part of the key (2026-07-04): the same string can
 * exist as an English phrase AND a French phrase; a fr-learner must never be served the en-cached
 * explanation of that string. To keep the huge existing English cache valid, 'en' produces the SAME
 * hash as before (no target segment); only non-en targets get a `target::` prefix — so English docs
 * are untouched while French docs live in their own namespace.
 * Side effect of the 2026-06-10 key change: all pre-2026-06-10 docs (keyed without lang) are orphaned.
 */
export function phraseHashFor(phraseEn: string, langKey: string, studyTarget = 'en'): string {
  const target = String(studyTarget ?? 'en').trim().toLowerCase() || 'en';
  const targetSegment = target === 'en' ? '' : `${target}::`;
  return createHash('sha256')
    .update(`${targetSegment}${String(langKey ?? '').trim().toLowerCase()}|${normalizePhrase(phraseEn)}`)
    .digest('hex')
    .slice(0, 40);
}

function docRef(phraseHash: string) {
  return admin.firestore().collection(EXPLAIN_COLLECTION).doc(phraseHash);
}

/**
 * True iff a rejected doc may be retried (regenerated) now.
 *  - report_threshold rejects are STICKY — only an admin reset revives them;
 *  - judge rejects become retryable once REJECTED_RETRY_TTL_MS has passed (false-positive recovery);
 *  - a rejected doc with no timestamp (legacy/corrupt) is retryable — better to regenerate than
 *    to stay broken forever.
 */
export function isRetryableRejected(
  data: { status?: string; reason?: string; updatedAtMs?: number } | null | undefined,
  nowMs: number,
): boolean {
  if (!data || data.status !== 'rejected') return false;
  if (String(data.reason ?? '') === REPORT_REJECT_REASON) return false;
  const updatedAtMs = Number(data.updatedAtMs ?? 0);
  return nowMs - updatedAtMs > REJECTED_RETRY_TTL_MS;
}

/** Read the cached doc, or null if absent OR written by an older schema (stale → regenerate). */
export async function readCachedExplanation(phraseHash: string): Promise<CachedExplanation | null> {
  const snap = await docRef(phraseHash).get();
  const data = snap.data();
  if (!data) return null;
  if (!isCurrentSchema(data)) return null; // stale v1 explanation → treat as cache miss
  return data as CachedExplanation;
}

/**
 * Try to claim the generation lock in a transaction.
 * Returns true (caller should generate) iff the doc is absent, is a STALE pending
 * (now - createdAtMs > LOCK_TTL_MS), OR is a retryable judge-rejected doc (TTL passed —
 * see isRetryableRejected). Returns false for ready / sticky-rejected / fresh-pending
 * (caller serves cache or fallback). Writes createdAtMs so staleness is computable.
 * The rejected→pending flip happens INSIDE this tx, so concurrent retries cannot stampede.
 */
export async function claimPendingLock(phraseHash: string, nowMs: number): Promise<boolean> {
  const ref = docRef(phraseHash);
  const db = admin.firestore();
  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() as CachedExplanation | undefined;
    // A doc from an older schema is stale content → allow re-claim (regenerate over it).
    if (data && isCurrentSchema(data)) {
      if (data.status === 'ready') return false; // current-schema ready → never regenerate here
      if (data.status === 'rejected' && !isRetryableRejected(data, nowMs)) return false;
      if (data.status === 'pending') {
        const createdAtMs = Number(data.createdAtMs ?? 0);
        const stale = nowMs - createdAtMs > LOCK_TTL_MS;
        if (!stale) return false; // another request is actively generating
      }
    }
    tx.set(ref, {
      status: 'pending',
      schemaVersion: EXPLAIN_SCHEMA_VERSION,
      // Clear a leftover reject reason (retry over a judge-rejected doc), so a later
      // `ready` merge does not keep a stale `reason` field around.
      reason: null,
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
    }, { merge: true });
    return true;
  });
}

/** Release only the generation lease owned by this request; never clear a newer winner's lease. */
export async function releasePendingLock(phraseHash: string, claimedAtMs: number): Promise<void> {
  const ref = docRef(phraseHash);
  const db = admin.firestore();
  await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() as CachedExplanation | undefined;
    if (data?.status !== 'pending' || Number(data.createdAtMs ?? 0) !== claimedAtMs) return;
    tx.set(ref, {
      status: admin.firestore.FieldValue.delete(),
      createdAtMs: admin.firestore.FieldValue.delete(),
      reason: admin.firestore.FieldValue.delete(),
      updatedAtMs: Date.now(),
    }, { merge: true });
  });
}

/** Publish a validated explanation to the global cache (status=ready). */
export async function writeReadyExplanation(phraseHash: string, text: string, meta: ReadyMeta): Promise<void> {
  await docRef(phraseHash).set({
    status: 'ready',
    schemaVersion: EXPLAIN_SCHEMA_VERSION,
    text,
    lang: meta.lang,
    phraseEn: meta.phraseEn,
    model: meta.model ?? null,
    updatedAtMs: Date.now(),
  }, { merge: true });
}

/** Mark a phrase rejected (judge or report threshold). Serves fallback; never regenerated
 *  automatically (prevents mass-report → expensive regen abuse). */
export async function writeRejectedExplanation(phraseHash: string, reason: string): Promise<void> {
  await docRef(phraseHash).set({
    status: 'rejected',
    schemaVersion: EXPLAIN_SCHEMA_VERSION,
    reason,
    updatedAtMs: Date.now(),
  }, { merge: true });
}

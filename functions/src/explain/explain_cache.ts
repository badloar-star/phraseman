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

/** Generation lock TTL. Slightly above the 30s CF timeout so a crashed generation's lock
 *  becomes re-claimable right after the request that held it dies. */
export const LOCK_TTL_MS = 30_000;

/** Cache doc schema version — also used to invalidate stale cached explanations on read.
 *  Bumped to 2 (2026-06-10): the prompt was rewritten to explain ENGLISH grammar instead of
 *  restating the meaning; every v1 doc holds a now-wrong explanation and MUST be regenerated.
 *  A doc whose schemaVersion is below this is treated as absent (see isCurrentSchema). */
export const EXPLAIN_SCHEMA_VERSION = 2;

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
 * Deterministic 40-hex cache id for a (phrase, LANGUAGE) pair.
 *
 * langKey is REQUIRED (audit bug 2026-06-10): the cached text is written in one language, so the
 * key must include it — hashing the phrase alone let an es-user receive the ru-cached explanation.
 * Pass the CANONICAL key from resolvePromptLangKey() (explain_prompts), never the raw client lang —
 * both the generation CF and the report CF must derive the key the same way to hit the same doc.
 * Side effect of the key change: all pre-2026-06-10 docs (keyed without lang) are orphaned —
 * unreachable by reads, regenerated under new keys. Acceptable: the cache was just invalidated.
 */
export function phraseHashFor(phraseEn: string, langKey: string): string {
  return createHash('sha256')
    .update(`${String(langKey ?? '').trim().toLowerCase()}|${normalizePhrase(phraseEn)}`)
    .digest('hex')
    .slice(0, 40);
}

function docRef(phraseHash: string) {
  return admin.firestore().collection(EXPLAIN_COLLECTION).doc(phraseHash);
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
 * Returns true (caller should generate) iff the doc is absent OR is a STALE pending
 * (now - createdAtMs > LOCK_TTL_MS). Returns false for ready / rejected / fresh-pending
 * (caller serves cache or fallback). Writes createdAtMs so staleness is computable.
 */
export async function claimPendingLock(phraseHash: string, nowMs: number): Promise<boolean> {
  const ref = docRef(phraseHash);
  const db = admin.firestore();
  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() as CachedExplanation | undefined;
    // A doc from an older schema is stale content → allow re-claim (regenerate over it).
    if (data && isCurrentSchema(data)) {
      if (data.status !== 'pending') return false; // current-schema ready/rejected → don't regenerate
      const createdAtMs = Number(data.createdAtMs ?? 0);
      const stale = nowMs - createdAtMs > LOCK_TTL_MS;
      if (!stale) return false; // another request is actively generating
    }
    tx.set(ref, {
      status: 'pending',
      schemaVersion: EXPLAIN_SCHEMA_VERSION,
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
    }, { merge: true });
    return true;
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

/**
 * explainPhrase — "Explain like I'm five" Cloud Function.
 *
 * A thin orchestrator over the plan-01 core (cache, budget, gates) + the AI judge + the OpenAI
 * provider. Clones premium_dialog.ts for onCall options, App Check, identity, fetch→OpenAI and the
 * billing doc. The KEY difference from dialogs is order: read cache FIRST (a hit costs $0), and only
 * on a miss do limits → lock → generate → judge → write.
 *
 * SECURITY (phraseman invariant): identity comes from request.auth.uid via resolveStableUidForAuth
 * (TWO args — never request.data). App Check enforced. Only this CF (Admin SDK) writes the cache.
 *
 * NOT in deploy:safe whitelist on purpose — deploy point-to-point:
 *   firebase deploy --only functions:explainPhrase
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import {
  phraseHashFor,
  readCachedExplanation,
  claimPendingLock,
  writeReadyExplanation,
  writeRejectedExplanation,
  isRetryableRejected,
} from './explain/explain_cache';
import { enforceUserGenLimit, enforceGlobalBudget } from './explain/explain_budget';
import { validateExplainInput, sanitizeExplanationOutput } from './explain/explain_gates';
import { buildExplainPrompt, resolvePromptLangKey } from './explain/explain_prompts';
import { openAiChat } from './explain/explain_provider';
import { judgeExplanation } from './explain/explain_judge';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

const REGION = 'us-central1';
const BILLING_COLLECTION = 'explain_billing';
const MODEL_DEFAULT = 'gpt-4o-mini';
// 90–140 words in Cyrillic ≈ 350–420 tokens; headroom so the model never cuts mid-sentence.
const GEN_MAX_TOKENS = 520;
const GEN_TEMPERATURE = 0.7;

/** Status reported to the client so the UI can distinguish cache vs. fresh vs. degraded paths. */
export type ExplainStatus = 'ok' | 'rejected' | 'exhausted' | 'pending';

export interface ExplainResponse {
  ok: true;
  text: string;
  status: ExplainStatus;
  fromCache: boolean;
}

interface ExplainRequestData {
  phraseEn?: unknown;
  phraseMeaning?: unknown;
  lang?: unknown;
}

function asText(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

/**
 * Deterministic, AI-free fallback the CF returns when it will not (or cannot) generate: rejected
 * cache, exhausted budget, or a lost lock race. Never calls the model; the client never builds this.
 *
 * IMPORTANT (locked with the user 2026-06-10): this feature explains the ENGLISH grammar, it must
 * NEVER restate the phrase's meaning/translation. So the fallback is a NEUTRAL "try again" message —
 * it deliberately does NOT echo phraseMeaning (the old fallback did, which reproduced the very
 * "Russian re-telling" we were fixing). `_phraseMeaning` is kept in the signature only so callers
 * don't have to change and so a future localized fallback could use the lang, never the meaning.
 */
export function buildFallback(_phraseMeaning?: string): string {
  return 'Не получилось подготовить объяснение. Попробуйте позже.';
}

export const explainPhrase = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 30,
  memory: '512MiB',
  maxInstances: 20,
  secrets: [OPENAI_API_KEY],
}, async (request): Promise<ExplainResponse> => {
  // 1. Auth gate — identity NEVER from body.
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const apiKey = asText(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
  if (!apiKey) throw new HttpsError('failed-precondition', 'openai_key_missing');

  const data = (request.data ?? {}) as ExplainRequestData;
  const phraseEn = asText(data.phraseEn, 1000);
  const phraseMeaning = asText(data.phraseMeaning, 2000);
  const lang = asText(data.lang, 12) || 'ru';

  const db = admin.firestore();
  const authUid = request.auth.uid;
  // SECURITY: resolve the stable identity from auth ONLY. Two args — request.data is NOT passed.
  const stableUid = await resolveStableUidForAuth(db, authUid);

  // 2. Deterministic input gate (level 1) — reject junk before any cache/AI work.
  const input = validateExplainInput({ phraseEn, phraseMeaning, lang });
  if (!input.ok) throw new HttpsError('invalid-argument', input.reason ?? 'invalid_input');

  // Cache key = (phrase, CANONICAL language). langKey is also the language the text will be
  // generated in (resolvePromptLang uses the same resolver) — key and content always agree.
  const langKey = resolvePromptLangKey(lang);
  const phraseHash = phraseHashFor(phraseEn, langKey);

  // 3. Read the global cache FIRST. A hit is the ≥99% path and costs $0.
  const cached = await readCachedExplanation(phraseHash);
  if (cached?.status === 'ready' && cached.text) {
    return { ok: true, text: cached.text, status: 'ok', fromCache: true };
  }
  if (cached?.status === 'rejected' && !isRetryableRejected(cached, Date.now())) {
    // Known-bad phrase: serve fallback. Report-threshold rejects are sticky (admin reset only);
    // judge rejects stay sticky only until REJECTED_RETRY_TTL_MS — then ONE request falls through
    // to the generation path below (claimPendingLock flips rejected→pending atomically), because
    // the judge has false positives and must not poison a phrase forever.
    return { ok: true, text: buildFallback(phraseMeaning), status: 'rejected', fromCache: true };
  }

  // 4. Cost guards (cache MISS only). Per-user FIRST, then the global breaker. If EITHER is
  //    exhausted, degrade gracefully to the fallback — do NOT 500 the user.
  try {
    await enforceUserGenLimit(authUid, stableUid);
    await enforceGlobalBudget();
  } catch (err) {
    if (err instanceof HttpsError && err.code === 'resource-exhausted') {
      return { ok: true, text: buildFallback(phraseMeaning), status: 'exhausted', fromCache: false };
    }
    throw err;
  }

  // 5. Claim the generation lock. If another request is actively generating this phrase, serve the
  //    fallback now (status:pending) rather than generating a duplicate.
  const claimed = await claimPendingLock(phraseHash, Date.now());
  if (!claimed) {
    return { ok: true, text: buildFallback(phraseMeaning), status: 'pending', fromCache: true };
  }

  // 6. Generate the full explanation (v1: no streaming — see CONTEXT "Streaming: explicit status").
  const gen = await openAiChat({
    apiKey,
    model: MODEL_DEFAULT,
    messages: [{ role: 'user', content: buildExplainPrompt(phraseEn, phraseMeaning, lang) }],
    maxTokens: GEN_MAX_TOKENS,
    temperature: GEN_TEMPERATURE,
  });

  // 7. Sanitize (level 2) → AI judge (level 3, a SEPARATE cheap call, fail-closed).
  const sanitized = sanitizeExplanationOutput(gen.text);
  const verdict = await judgeExplanation({ text: sanitized, phraseEn, lang, apiKey });

  // 8. Verdict gates the SHARED CACHE only. The live (trigger) caller always receives the generated
  //    text regardless of verdict — we risk showing raw text to one user, never to all.
  if (verdict.ok) {
    await writeReadyExplanation(phraseHash, sanitized, { lang, phraseEn, model: MODEL_DEFAULT });
  } else {
    await writeRejectedExplanation(phraseHash, verdict.reason);
  }

  // 9. Billing doc on EVERY miss: gen + judge token usage, model, verdict, identity (stable uid).
  await db.collection(BILLING_COLLECTION).doc().set({
    uid: stableUid,
    authUid,
    phraseHash,
    lang,
    model: MODEL_DEFAULT,
    genPromptTokens: gen.promptTokens,
    genCompletionTokens: gen.completionTokens,
    judgePromptTokens: verdict.promptTokens,
    judgeCompletionTokens: verdict.completionTokens,
    verdict: verdict.reason,
    published: verdict.ok,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
  });

  return {
    ok: true,
    text: sanitized,
    status: verdict.ok ? 'ok' : 'rejected',
    fromCache: false,
  };
});

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
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { resolvePremiumAccess } from './premium_status';
import {
  phraseHashFor,
  readCachedExplanation,
  claimPendingLock,
  writeReadyExplanation,
  writeRejectedExplanation,
  isRetryableRejected,
} from './explain/explain_cache';
import { reserveExplainBudget, refundExplainBudgetReservation, enforceFreeJobGenLimit, type ExplainBudgetReservation } from './explain/explain_budget';
import { resolveJobConfig } from './openai_jobs_config';
import { aiGloballyDisabled } from './remote_gates';
import { validateExplainInput, sanitizeExplanationOutput } from './explain/explain_gates';
import { buildExplainPrompt, resolvePromptLangKey } from './explain/explain_prompts';
import { openAiChat } from './explain/explain_provider';
import { judgeExplanation } from './explain/explain_judge';
import { resolveAiOutputLang, resolveStudyTarget } from './ai_language_contract';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

const REGION = 'us-central1';
const BILLING_COLLECTION = 'explain_billing';
const MODEL_DEFAULT = 'gpt-4o-mini';
// Single-contrast explanation (≤~110 words) in Cyrillic ≈ 150–250 tokens; 320 leaves headroom for
// a rare two-part nuance without cutting mid-pair, and trims cost vs. the old word-by-word target.
const GEN_MAX_TOKENS = 320;
const GEN_TEMPERATURE = 0.7;
// Дневной кап разборов для free — считает И кэш-хиты (гейт по ценности, решение
// владельца 2026-07-02), проверяется ДО чтения кэша. Premium — без капа.
const FREE_DAILY_CAP = 5;

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
  /** Language being LEARNED (StudyTarget 'en'|'fr'). Absent/unknown ⇒ 'en' (backward compatible). */
  studyTarget?: unknown;
}

function asText(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

export const EXPLAIN_FALLBACK_BY_LANG: Record<string, string> = {
  ru: 'Не получилось подготовить объяснение. Попробуйте позже.',
  uk: 'Не вдалося підготувати пояснення. Спробуйте пізніше.',
  es: 'No se pudo preparar la explicación. Inténtalo más tarde.',
  pt: 'Não foi possível preparar a explicação. Tenta de novo mais tarde.',
  'pt-BR': 'Não foi possível preparar a explicação. Tenta de novo mais tarde.',
  vi: 'Chưa thể chuẩn bị phần giải thích. Hãy thử lại sau.',
  id: 'Penjelasan belum bisa disiapkan. Coba lagi nanti.',
  tr: 'Açıklama hazırlanamadı. Daha sonra tekrar dene.',
  pl: 'Nie udało się przygotować wyjaśnienia. Spróbuj ponownie później.',
  en: 'Could not prepare the explanation. Try again later.',
};

/**
 * Deterministic, AI-free fallback the CF returns when it will not (or cannot) generate: rejected
 * cache, exhausted budget, or a lost lock race. Never calls the model; the client never builds this.
 *
 * NOTE: the ERROR fallback stays a NEUTRAL "try again" message — it must not echo `phraseMeaning`,
 * because a fallback is shown when generation failed (no real explanation to give), and a bare
 * meaning-echo there would look like a broken answer. This is about the failure path only; the live
 * explanation itself (re-scoped 2026-06-28) MAY use the phrase's meaning as one valid angle.
 * `_phraseMeaning` is kept in the signature so callers don't change and a future localized fallback
 * could use the lang.
 */
export function buildFallback(_phraseMeaning?: string, lang = 'ru'): string {
  try {
    const langKey = resolvePromptLangKey(lang);
    return EXPLAIN_FALLBACK_BY_LANG[langKey] ?? EXPLAIN_FALLBACK_BY_LANG.ru;
  } catch {
    return EXPLAIN_FALLBACK_BY_LANG.ru;
  }
}

export const explainPhrase = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
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
  const lang = resolveAiOutputLang(asText(data.lang, 12) || 'ru', 'explain');
  const studyTarget = resolveStudyTarget(data.studyTarget);

  const db = admin.firestore();
  // Глобальный рубильник ИИ (админ «Пульт»): серверный дубль клиентского гейта —
  // чтобы прямой вызов callable в обход UI не запускал ИИ. Клиент по этому коду
  // показывает забавную плашку.
  if (await aiGloballyDisabled(db)) throw new HttpsError('failed-precondition', 'ai_globally_disabled');
  // Админ-конфиг (модель/глобальный кап/выключатель). Fallback = текущие дефолты.
  const jobCfg = await resolveJobConfig(db, 'explain');
  const authUid = request.auth.uid;
  // SECURITY: resolve the stable identity from auth ONLY. Two args — request.data is NOT passed.
  const stableUid = await resolveStableUidForAuth(db, authUid);

  // 2. Deterministic input gate (level 1) — reject junk before any cache/AI work.
  const input = validateExplainInput({ phraseEn, phraseMeaning, lang });
  if (!input.ok) throw new HttpsError('invalid-argument', input.reason ?? 'invalid_input');

  // Free-гейт ДО кэша: у free — FREE_DAILY_CAP разборов в день, кэш-хиты тоже
  // считаются (гейт ценности фичи). При исчерпании — бесплатный fallback-текст.
  const isPremium = await resolvePremiumAccess(db, stableUid, Date.now(), authUid);
  if (!isPremium) {
    try {
      await enforceFreeJobGenLimit('phrase', authUid, stableUid, FREE_DAILY_CAP);
    } catch (err) {
      if (err instanceof HttpsError && err.code === 'resource-exhausted') {
        return { ok: true, text: buildFallback(phraseMeaning, lang), status: 'exhausted', fromCache: false };
      }
      throw err;
    }
  }

  // Cache key = (phrase, CANONICAL language). langKey is also the language the text will be
  // generated in (resolvePromptLang uses the same resolver) — key and content always agree.
  const langKey = resolvePromptLangKey(lang);
  const phraseHash = phraseHashFor(phraseEn, langKey, studyTarget);

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
    return { ok: true, text: buildFallback(phraseMeaning, lang), status: 'rejected', fromCache: true };
  }

  // Kill-switch: если explain выключен админом — НЕ генерируем (экономим OpenAI),
  // отдаём бесплатный fallback (как при exhausted). Кэш выше уже обслужен бесплатно.
  if (!jobCfg.enabled) {
    return { ok: true, text: buildFallback(phraseMeaning, lang), status: 'exhausted', fromCache: false };
  }

  // 4. Cost guards (cache MISS only). Per-user FIRST, then the global breaker. If EITHER is
  //    exhausted, degrade gracefully to the fallback — do NOT 500 the user.
  // Free-кап уже списан выше (до кэша) — здесь только общие счётчики.
  let budgetReservation: ExplainBudgetReservation | null = null;
  try {
    budgetReservation = await reserveExplainBudget(authUid, stableUid, jobCfg.globalDailyCap);
  } catch (err) {
    if (err instanceof HttpsError && err.code === 'resource-exhausted') {
      return { ok: true, text: buildFallback(phraseMeaning, lang), status: 'exhausted', fromCache: false };
    }
    throw err;
  }

  // 5. Claim the generation lock. If another request is actively generating this phrase, serve the
  //    fallback now (status:pending) rather than generating a duplicate.
  const claimed = await claimPendingLock(phraseHash, Date.now());
  if (!claimed) {
    await refundExplainBudgetReservation(budgetReservation, 'lock_not_claimed');
    budgetReservation = null;
    return { ok: true, text: buildFallback(phraseMeaning, lang), status: 'pending', fromCache: true };
  }

  // 6. Generate the full explanation (v1: no streaming — see CONTEXT "Streaming: explicit status").
  let gen: Awaited<ReturnType<typeof openAiChat>>;
  try {
    gen = await openAiChat({
      apiKey,
      model: jobCfg.model,
      messages: [{ role: 'user', content: buildExplainPrompt(phraseEn, phraseMeaning, lang, studyTarget) }],
      maxTokens: GEN_MAX_TOKENS,
      temperature: GEN_TEMPERATURE,
    });
  } catch (err) {
    await refundExplainBudgetReservation(budgetReservation, 'provider_failed');
    budgetReservation = null;
    throw err;
  }

  // 7. Sanitize (level 2) → AI judge (level 3, a SEPARATE cheap call, fail-closed).
  const sanitized = sanitizeExplanationOutput(gen.text);
  const judgeText = sanitized;
  const verdict = await judgeExplanation({ text: judgeText, phraseEn, lang, apiKey, studyTarget });

  // 8. Verdict gates the SHARED CACHE only. The live (trigger) caller always receives the generated
  //    text regardless of verdict — we risk showing raw text to one user, never to all.
  if (verdict.ok) {
    // The judge approved this text and the user will be shown it (line ~215) — it MUST persist,
    // else the phrase reads as «нет в кэше» in admin even though it was generated (audit 2026-06-22).
    // A transient Firestore blip must not discard an already-paid-for, approved generation: retry
    // once. (claimPendingLock left a `pending` doc, so a total failure self-heals after LOCK_TTL_MS.)
    try {
      await writeReadyExplanation(phraseHash, sanitized, { lang, phraseEn, model: jobCfg.model });
    } catch (writeErr) {
      console.error('explain writeReady failed, retrying once', phraseHash, writeErr);
      await writeReadyExplanation(phraseHash, sanitized, { lang, phraseEn, model: jobCfg.model })
        .catch((retryErr) => console.error('explain writeReady retry failed', phraseHash, retryErr));
    }
  } else {
    await writeRejectedExplanation(phraseHash, verdict.reason)
      .catch((rejErr) => console.error('explain writeRejected failed', phraseHash, rejErr));
  }

  // 9. Billing doc on EVERY miss: gen + judge token usage, model, verdict, identity (stable uid).
  await db.collection(BILLING_COLLECTION).doc().set({
    uid: stableUid,
    authUid,
    phraseHash,
    lang,
    model: jobCfg.model,
    genPromptTokens: gen.promptTokens,
    genCompletionTokens: gen.completionTokens,
    judgePromptTokens: verdict.promptTokens,
    judgeCompletionTokens: verdict.completionTokens,
    verdict: verdict.reason,
    published: verdict.ok,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
  });

  if (!verdict.ok) {
    return { ok: true, text: buildFallback(phraseMeaning, lang), status: 'rejected', fromCache: false };
  }

  const approvedText = sanitized;
  return { ok: true, text: approvedText, status: 'ok', fromCache: false };
});

/**
 * explainQuiz — AI "разбор" for a THEMATIC-QUIZ answer (Кухня/Дом/… — isolated to thematic
 * quizzes only; easy/medium/hard difficulty quizzes keep their hand-authored static разборы).
 *
 * One BATCHED generation per (correct phrase, option-set, language): a warm разбор for the correct
 * option + a short "почему этот не тот" line for EACH wrong option. Sibling of explainChoice — it
 * reuses the SAME budget / judge / OpenAI infra but owns a separate cache collection
 * (quiz_explanations) and its own kill-switch job ('quiz').
 *
 * Cache-warm: the client fires this once right after the user answers (fire-and-forget). The first
 * call generates the whole batch; every later reader who taps any option reads it free ($0). Option
 * ORDER never forks the cache (hash uses the sorted option set; texts keyed by exact option string).
 *
 * SECURITY (phraseman invariant): identity comes from request.auth.uid via resolveStableUidForAuth
 * (TWO args — never request.data). App Check enforced. Only this CF (Admin SDK) writes the cache.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { resolvePremiumAccess } from './premium_status';
import {
  quizHashFor,
  readCachedQuizExplanation,
  claimQuizPendingLock,
  writeReadyQuizExplanation,
  writeRejectedQuizExplanation,
  isRetryableRejectedQuiz,
} from './explain/quiz_explain_cache';
import { reserveExplainBudget, refundExplainBudgetReservation, type ExplainBudgetReservation } from './explain/explain_budget';
import { resolveJobConfig } from './openai_jobs_config';
import { validateQuizInput, parseQuizBatch } from './explain/quiz_explain_gates';
import { buildQuizPrompt, quizBatchToJudgeText } from './explain/quiz_explain_prompts';
import { resolvePromptLangKey } from './explain/explain_prompts';
import { openAiChat } from './explain/explain_provider';
import { judgeExplanation } from './explain/explain_judge';
import { resolveAiOutputLang } from './ai_language_contract';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

const REGION = 'us-central1';
const BILLING_COLLECTION = 'quiz_explain_billing';
// Дневной кап ПЛАТНЫХ генераций для free (cache-miss). Premium — без капа джоба.
const FREE_DAILY_GEN_CAP = 3;
const GEN_MAX_TOKENS = 700; // confirm + up to 6 short option lines as JSON
const GEN_TEMPERATURE = 0.7;

export type QuizStatus = 'ok' | 'rejected' | 'exhausted' | 'pending';

export interface QuizResponse {
  ok: true;
  /** Разбор of the correct option (praise + why it's the natural English). */
  confirm: string;
  /** Map: exact wrong-option string → short "почему этот не тот". */
  options: Record<string, string>;
  status: QuizStatus;
  fromCache: boolean;
}

interface QuizRequestData {
  correctEn?: unknown;
  /** Native-language meaning of the question (for the model only; never echoed back). */
  questionPrompt?: unknown;
  /** The wrong options (distractors), as shown to the user. */
  wrongOptions?: unknown;
  lang?: unknown;
}

function asText(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function emptyBatch(status: QuizStatus, fromCache: boolean): QuizResponse {
  return { ok: true, confirm: '', options: {}, status, fromCache };
}

export const explainQuiz = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 30,
  memory: '512MiB',
  maxInstances: 20,
  secrets: [OPENAI_API_KEY],
}, async (request): Promise<QuizResponse> => {
  // 1. Auth gate — identity NEVER from body.
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const apiKey = asText(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
  if (!apiKey) throw new HttpsError('failed-precondition', 'openai_key_missing');

  const data = (request.data ?? {}) as QuizRequestData;
  const correctEn = asText(data.correctEn, 1000);
  const questionPrompt = asText(data.questionPrompt, 2000);
  const rawWrongOptions = Array.isArray(data.wrongOptions) ? data.wrongOptions : [];
  const lang = resolveAiOutputLang(asText(data.lang, 12) || 'ru', 'quiz');

  const db = admin.firestore();
  const jobCfg = await resolveJobConfig(db, 'quiz');
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid);

  // 2. Deterministic input gate — also returns the cleaned/capped wrong-option list.
  const input = validateQuizInput({ correctEn, questionPrompt, wrongOptions: rawWrongOptions, lang });
  if (!input.ok || !input.wrongOptions) {
    throw new HttpsError('invalid-argument', input.reason ?? 'invalid_input');
  }
  const wrongOptions = input.wrongOptions;

  // Cache key = (correct phrase, sorted FULL option-set, CANONICAL language).
  const langKey = resolvePromptLangKey(lang);
  const quizHash = quizHashFor(correctEn, [correctEn, ...wrongOptions], langKey);

  // 3. Read the global cache FIRST. A hit is the ≥99% path and costs $0.
  const cached = await readCachedQuizExplanation(quizHash);
  if (cached?.status === 'ready' && cached.confirm) {
    return {
      ok: true,
      confirm: cached.confirm,
      options: cached.options ?? {},
      status: 'ok',
      fromCache: true,
    };
  }
  if (cached?.status === 'rejected' && !isRetryableRejectedQuiz(cached, Date.now())) {
    return emptyBatch('rejected', true);
  }

  // Kill-switch: quiz выключен админом → не жжём OpenAI.
  if (!jobCfg.enabled) return emptyBatch('exhausted', false);

  // 4. Cost guards (cache MISS only). Shares the explain budget collections.
  // Free-юзер запускает платную генерацию не чаще FREE_DAILY_GEN_CAP раз в день —
  // чтение кэша выше остаётся бесплатным и безлимитным для всех.
  const isPremium = await resolvePremiumAccess(db, stableUid);
  let budgetReservation: ExplainBudgetReservation | null = null;
  try {
    budgetReservation = await reserveExplainBudget(
      authUid,
      stableUid,
      jobCfg.globalDailyCap,
      Date.now(),
      isPremium ? null : { job: 'quiz', cap: FREE_DAILY_GEN_CAP },
    );
  } catch (err) {
    if (err instanceof HttpsError && err.code === 'resource-exhausted') {
      return emptyBatch('exhausted', false);
    }
    throw err;
  }

  // 5. Claim the generation lock (anti-duplicate).
  const claimed = await claimQuizPendingLock(quizHash, Date.now());
  if (!claimed) {
    await refundExplainBudgetReservation(budgetReservation, 'lock_not_claimed');
    budgetReservation = null;
    return emptyBatch('pending', true);
  }

  // 6. Generate the whole batch as STRICT JSON.
  let gen: Awaited<ReturnType<typeof openAiChat>>;
  try {
    gen = await openAiChat({
      apiKey,
      model: jobCfg.model,
      messages: [{ role: 'user', content: buildQuizPrompt(correctEn, questionPrompt, wrongOptions, lang) }],
      maxTokens: GEN_MAX_TOKENS,
      temperature: GEN_TEMPERATURE,
      responseFormat: { type: 'json_object' },
    });
  } catch (err) {
    await refundExplainBudgetReservation(budgetReservation, 'provider_failed');
    budgetReservation = null;
    throw err;
  }

  const parsed = parseQuizBatch(gen.text, wrongOptions);

  // 7. Judge the assembled batch text (language / coherence / safety). Fail-closed.
  const judgeText = quizBatchToJudgeText(parsed.confirm, parsed.options);
  const verdict = parsed.ok && judgeText
    ? await judgeExplanation({ text: judgeText, phraseEn: correctEn, lang, apiKey })
    : { ok: false, reason: 'incoherent' as const, promptTokens: 0, completionTokens: 0 };

  // 8. Verdict gates the SHARED CACHE. Live caller still receives whatever was generated.
  if (verdict.ok) {
    try {
      await writeReadyQuizExplanation(
        quizHash,
        { confirm: parsed.confirm, options: parsed.options },
        { lang, correctEn, questionPrompt, model: jobCfg.model },
      );
    } catch (writeErr) {
      console.error('explainQuiz writeReady failed, retrying once', quizHash, writeErr);
      await writeReadyQuizExplanation(
        quizHash,
        { confirm: parsed.confirm, options: parsed.options },
        { lang, correctEn, questionPrompt, model: jobCfg.model },
      );
    }
  } else {
    await writeRejectedQuizExplanation(quizHash, verdict.reason);
  }

  // 9. Billing doc on EVERY miss.
  await db.collection(BILLING_COLLECTION).doc().set({
    uid: stableUid,
    authUid,
    quizHash,
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

  if (!verdict.ok) return emptyBatch('rejected', false);

  return {
    ok: true,
    confirm: parsed.confirm,
    options: parsed.options,
    status: 'ok',
    fromCache: false,
  };
});

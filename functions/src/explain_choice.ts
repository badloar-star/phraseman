/**
 * explainChoice — AI explanations for a multiple-choice exercise answer.
 *
 * One BATCHED generation per (correct phrase, option-set, language): a cheerful confirmation for
 * the correct option + a short "why this one doesn't fit" line for EACH distractor. Sibling of
 * explainPhrase — it reuses the SAME budget / judge / OpenAI infra but owns a separate cache
 * collection (choice_explanations) and its own kill-switch job ('choice').
 *
 * Cache-warm: the client fires this once right after the user answers (fire-and-forget). The first
 * call generates the whole batch; every later reader who taps any option reads it free ($0).
 *
 * SECURITY (phraseman invariant): identity comes from request.auth.uid via resolveStableUidForAuth
 * (TWO args — never request.data). App Check enforced. Only this CF (Admin SDK) writes the cache.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import {
  choiceHashFor,
  readCachedChoiceExplanation,
  claimChoicePendingLock,
  writeReadyChoiceExplanation,
  writeRejectedChoiceExplanation,
  isRetryableRejectedChoice,
} from './explain/choice_explain_cache';
import { reserveExplainBudget, refundExplainBudgetReservation, type ExplainBudgetReservation } from './explain/explain_budget';
import { resolveJobConfig } from './openai_jobs_config';
import { validateChoiceInput, parseChoiceBatch } from './explain/choice_explain_gates';
import { buildChoicePrompt, choiceBatchToJudgeText } from './explain/choice_explain_prompts';
import { resolvePromptLangKey } from './explain/explain_prompts';
import { openAiChat } from './explain/explain_provider';
import { judgeExplanation } from './explain/explain_judge';
import { resolveAiOutputLang } from './ai_language_contract';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

const REGION = 'us-central1';
const BILLING_COLLECTION = 'choice_explain_billing';
const GEN_MAX_TOKENS = 700; // confirm + up to 8 short distractor lines as JSON
const GEN_TEMPERATURE = 0.7;

export type ChoiceStatus = 'ok' | 'rejected' | 'exhausted' | 'pending';

export interface ChoiceResponse {
  ok: true;
  confirm: string;
  distractors: Record<string, string>;
  status: ChoiceStatus;
  fromCache: boolean;
}

interface ChoiceRequestData {
  correctEn?: unknown;
  phraseMeaning?: unknown;
  distractors?: unknown;
  lang?: unknown;
}

function asText(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function emptyBatch(status: ChoiceStatus, fromCache: boolean): ChoiceResponse {
  return { ok: true, confirm: '', distractors: {}, status, fromCache };
}

export const explainChoice = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 30,
  memory: '512MiB',
  maxInstances: 20,
  secrets: [OPENAI_API_KEY],
}, async (request): Promise<ChoiceResponse> => {
  // 1. Auth gate — identity NEVER from body.
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const apiKey = asText(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
  if (!apiKey) throw new HttpsError('failed-precondition', 'openai_key_missing');

  const data = (request.data ?? {}) as ChoiceRequestData;
  const correctEn = asText(data.correctEn, 1000);
  const phraseMeaning = asText(data.phraseMeaning, 2000);
  const rawDistractors = Array.isArray(data.distractors) ? data.distractors : [];
  const lang = resolveAiOutputLang(asText(data.lang, 12) || 'ru', 'choice');

  const db = admin.firestore();
  const jobCfg = await resolveJobConfig(db, 'choice');
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid);

  // 2. Deterministic input gate — also returns the cleaned/capped distractor list.
  const input = validateChoiceInput({ correctEn, phraseMeaning, distractors: rawDistractors, lang });
  if (!input.ok || !input.distractors) {
    throw new HttpsError('invalid-argument', input.reason ?? 'invalid_input');
  }
  const distractors = input.distractors;

  // Cache key = (correct phrase, sorted option-set, CANONICAL language).
  const langKey = resolvePromptLangKey(lang);
  const choiceHash = choiceHashFor(correctEn, distractors, langKey);

  // 3. Read the global cache FIRST. A hit is the ≥99% path and costs $0.
  const cached = await readCachedChoiceExplanation(choiceHash);
  if (cached?.status === 'ready' && cached.confirm) {
    return {
      ok: true,
      confirm: cached.confirm,
      distractors: cached.distractors ?? {},
      status: 'ok',
      fromCache: true,
    };
  }
  if (cached?.status === 'rejected' && !isRetryableRejectedChoice(cached, Date.now())) {
    return emptyBatch('rejected', true);
  }

  // Kill-switch: choice выключен админом → не жжём OpenAI.
  if (!jobCfg.enabled) return emptyBatch('exhausted', false);

  // 4. Cost guards (cache MISS only). Shares the explain budget collections.
  let budgetReservation: ExplainBudgetReservation | null = null;
  try {
    budgetReservation = await reserveExplainBudget(authUid, stableUid, jobCfg.globalDailyCap);
  } catch (err) {
    if (err instanceof HttpsError && err.code === 'resource-exhausted') {
      return emptyBatch('exhausted', false);
    }
    throw err;
  }

  // 5. Claim the generation lock (anti-duplicate).
  const claimed = await claimChoicePendingLock(choiceHash, Date.now());
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
      messages: [{ role: 'user', content: buildChoicePrompt(correctEn, phraseMeaning, distractors, lang) }],
      maxTokens: GEN_MAX_TOKENS,
      temperature: GEN_TEMPERATURE,
      responseFormat: { type: 'json_object' },
    });
  } catch (err) {
    await refundExplainBudgetReservation(budgetReservation, 'provider_failed');
    budgetReservation = null;
    throw err;
  }

  const parsed = parseChoiceBatch(gen.text, distractors);

  // 7. Judge the assembled batch text (language / coherence / safety). Fail-closed.
  const judgeText = choiceBatchToJudgeText(parsed.confirm, parsed.distractors);
  const verdict = parsed.ok && judgeText
    ? await judgeExplanation({ text: judgeText, phraseEn: correctEn, lang, apiKey })
    : { ok: false, reason: 'incoherent' as const, promptTokens: 0, completionTokens: 0 };

  // 8. Verdict gates the SHARED CACHE. Live caller still receives whatever was generated.
  if (verdict.ok) {
    await writeReadyChoiceExplanation(
      choiceHash,
      { confirm: parsed.confirm, distractors: parsed.distractors },
      { lang, correctEn, model: jobCfg.model },
    );
  } else {
    await writeRejectedChoiceExplanation(choiceHash, verdict.reason);
  }

  // 9. Billing doc on EVERY miss.
  await db.collection(BILLING_COLLECTION).doc().set({
    uid: stableUid,
    authUid,
    choiceHash,
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
    distractors: parsed.distractors,
    status: 'ok',
    fromCache: false,
  };
});

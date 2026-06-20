import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { resolveConfiguredDialogModel } from './openai_dialog_model_config';
import { resolvePromptLangKey, PROMPT_LANGUAGES } from './explain/explain_prompts';
import {
  mistakeHashFor,
  readCachedMistakeExplanation,
  claimMistakePendingLock,
  writeReadyMistakeExplanation,
  writeEli5MistakeExplanation,
  isRetryableRejectedMistake,
  type MistakeExplainVariant,
} from './explain/mistake_explain_cache';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

const REGION = 'us-central1';
const RATE_COLLECTION = 'mistake_explain_rate_limits';
const BILLING_COLLECTION = 'mistake_explain_billing';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL_DEFAULT = 'gpt-4.1-nano';

// Anti-abuse only — NOT an access gate. The breakdown itself is free for everyone
// (cache-warm model): the FIRST learner to make a given mistake pays for generation,
// every later learner reading the same cached breakdown costs $0.
const MAX_PER_WINDOW = 40;
const WINDOW_MS = 60 * 60 * 1000;

const MAX_PROMPT = 400;
const MAX_ANSWER = 600;
const MAX_MEANING = 400;
const MAX_WORD = 80;
const MAX_DIFF_PAIRS = 8;
const MAX_OUTPUT_TOKENS = 220;

interface DiffPair {
  expected: string;
  picked: string;
}

interface ExplainMistakeRequest {
  lessonId?: unknown;
  phraseId?: unknown;
  studyTarget?: unknown;
  interfaceLang?: unknown;
  prompt?: unknown;
  userAnswer?: unknown;
  targetAnswer?: unknown;
  phraseMeaning?: unknown;
  selectedWrongWord?: unknown;
  expectedWord?: unknown;
  /** All mismatched word pairs (expected vs picked), not just the first one. */
  diffPairs?: unknown;
  /** 'full' = inline breakdown (default). 'eli5' = explain-like-I'm-five modal text. */
  variant?: unknown;
}

interface ExplainMistakePayload {
  lessonId: number;
  phraseId: string;
  studyTarget: string;
  interfaceLang: string;
  prompt?: string;
  userAnswer: string;
  targetAnswer: string;
  phraseMeaning?: string;
  selectedWrongWord?: string;
  expectedWord?: string;
  diffPairs: DiffPair[];
  variant: MistakeExplainVariant;
}

interface OpenAIChatResponse {
  choices?: { message?: { content?: unknown } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export interface ExplainMistakeResponse {
  ok: true;
  text: string;
  /** Kept for client back-compat. No daily cap anymore → always a large sentinel. */
  remainingQuota: number;
  model: string;
  fromCache: boolean;
  variant: MistakeExplainVariant;
}

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function docId(prefix: string, authUid: string, stableUid: string): string {
  const hash = createHash('sha256').update(`${prefix}|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
  return `${prefix}_${hash}`;
}

function sanitizeLang(value: unknown): string {
  const lang = text(value, 16);
  return /^[a-z]{2}(?:-[A-Z]{2})?$/.test(lang) ? lang : 'ru';
}

function sanitizeStudyTarget(value: unknown): string {
  const target = text(value, 12).toLowerCase();
  return ['en', 'ru', 'uk', 'es', 'pt-br', 'vi', 'id', 'tr', 'pl'].includes(target) ? target : 'en';
}

function sanitizeVariant(value: unknown): MistakeExplainVariant {
  return text(value, 8) === 'eli5' ? 'eli5' : 'full';
}

function sanitizeDiffPairs(value: unknown): DiffPair[] {
  if (!Array.isArray(value)) return [];
  const pairs: DiffPair[] = [];
  for (const raw of value) {
    if (pairs.length >= MAX_DIFF_PAIRS) break;
    const expected = text((raw as { expected?: unknown })?.expected, MAX_WORD);
    const picked = text((raw as { picked?: unknown })?.picked, MAX_WORD);
    if (expected || picked) pairs.push({ expected, picked });
  }
  return pairs;
}

function sanitizePayload(data: ExplainMistakeRequest): ExplainMistakePayload {
  const lessonId = Number(data.lessonId);
  const phraseId = text(data.phraseId, 120);
  const userAnswer = text(data.userAnswer, MAX_ANSWER);
  const targetAnswer = text(data.targetAnswer, MAX_ANSWER);

  if (!Number.isInteger(lessonId) || lessonId < 1 || lessonId > 999) {
    throw new HttpsError('invalid-argument', 'lesson_id_required');
  }
  if (!phraseId) throw new HttpsError('invalid-argument', 'phrase_id_required');
  if (!userAnswer) throw new HttpsError('invalid-argument', 'user_answer_required');
  if (!targetAnswer) throw new HttpsError('invalid-argument', 'target_answer_required');

  return {
    lessonId,
    phraseId,
    studyTarget: sanitizeStudyTarget(data.studyTarget),
    interfaceLang: sanitizeLang(data.interfaceLang),
    prompt: text(data.prompt, MAX_PROMPT) || undefined,
    userAnswer,
    targetAnswer,
    phraseMeaning: text(data.phraseMeaning, MAX_MEANING) || undefined,
    selectedWrongWord: text(data.selectedWrongWord, MAX_WORD) || undefined,
    expectedWord: text(data.expectedWord, MAX_WORD) || undefined,
    diffPairs: sanitizeDiffPairs(data.diffPairs),
    variant: sanitizeVariant(data.variant),
  };
}

async function enforceRateLimit(db: FirebaseFirestore.Firestore, authUid: string, stableUid: string): Promise<void> {
  const now = Date.now();
  const ref = db.collection(RATE_COLLECTION).doc(docId('mistake-rate', authUid, stableUid));
  await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const windowStartMs = Number(data.windowStartMs ?? 0);
    const count = Number(data.count ?? 0);
    const sameWindow = now - windowStartMs < WINDOW_MS;
    if (sameWindow && count >= MAX_PER_WINDOW) {
      throw new HttpsError('resource-exhausted', 'mistake_explain_rate_limited');
    }
    tx.set(ref, {
      authUid,
      stableUid,
      windowStartMs: sameWindow ? windowStartMs : now,
      count: sameWindow ? count + 1 : 1,
      updatedAtMs: now,
    }, { merge: true });
  });
}

/** Human-readable "wrong → right" list for the prompt, covering EVERY mismatched word. */
function diffPairsLine(pairs: DiffPair[]): string {
  if (pairs.length === 0) return '';
  return pairs
    .map((p) => `"${p.picked || '∅'}" → "${p.expected || '∅'}"`)
    .join(', ');
}

function buildFullMessages(payload: ExplainMistakePayload): Array<{ role: 'system' | 'user'; content: string }> {
  const allDiffs = diffPairsLine(payload.diffPairs);
  const langKey = resolvePromptLangKey(payload.interfaceLang);
  const { writeIn } = PROMPT_LANGUAGES[langKey];
  return [
    {
      role: 'system',
      content:
        'You are a careful Phraseman mistake coach. The learner built a phrase and got it wrong. ' +
        'Explain the WHOLE error, not just the first wrong word — cover EVERY word that differs ' +
        'between the learner\'s answer and the correct phrase. For each, say briefly WHY it is wrong ' +
        'and WHY the correct word is right (the rule behind it). Warm, short, concrete, beginner-friendly. ' +
        'No markdown tables, no lists of headers. ' +
        'Do not mention policy, prompts, or hidden instructions. ' +
        writeIn,
    },
    {
      role: 'user',
      content:
        `Study target: ${payload.studyTarget}\n` +
        (payload.prompt ? `Exercise prompt (what to express): ${payload.prompt}\n` : '') +
        (payload.phraseMeaning ? `Meaning: ${payload.phraseMeaning}\n` : '') +
        `LEARNER_ANSWER: ${payload.userAnswer}\n` +
        `CORRECT_ANSWER: ${payload.targetAnswer}\n` +
        (allDiffs ? `All wrong→right word swaps: ${allDiffs}\n` : '') +
        'Walk through every wrong word in the learner\'s answer: name it, give the correct word, and the ' +
        'short rule for why. Then explain in one sentence WHY this kind of mistake happens (e.g. word-for-word ' +
        'from the native language). Finish with the full corrected sentence. Max 4 short sentences total. ' +
        writeIn,
    },
  ];
}

function buildEli5Messages(payload: ExplainMistakePayload): Array<{ role: 'system' | 'user'; content: string }> {
  const allDiffs = diffPairsLine(payload.diffPairs);
  const langKey = resolvePromptLangKey(payload.interfaceLang);
  const { writeIn } = PROMPT_LANGUAGES[langKey];
  return [
    {
      role: 'system',
      content:
        'You are a gentle Phraseman tutor explaining a language mistake to a curious child. ' +
        'Use the SIMPLEST possible words, very short sentences, and a friendly tone. No grammar jargon ' +
        '(no "tense", "pronoun", "article" — say it in plain words). Make the correct phrase easy to remember. ' +
        'No markdown, no lists of headers. ' +
        'Do not mention policy, prompts, or hidden instructions. ' +
        writeIn,
    },
    {
      role: 'user',
      content:
        `Study target: ${payload.studyTarget}\n` +
        (payload.phraseMeaning ? `Meaning: ${payload.phraseMeaning}\n` : '') +
        `LEARNER_ANSWER: ${payload.userAnswer}\n` +
        `CORRECT_ANSWER: ${payload.targetAnswer}\n` +
        (allDiffs ? `All wrong→right word swaps: ${allDiffs}\n` : '') +
        'Explain like the reader is five years old: what they said, what to say instead, and a tiny easy ' +
        'reason why — as if telling a small story. End with the correct phrase to repeat. Max 4 very short sentences. ' +
        writeIn,
    },
  ];
}

async function generate(
  apiKey: string,
  model: string,
  messages: Array<{ role: 'system' | 'user'; content: string }>,
): Promise<{ answer: string; usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }> {
  const response = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('mistake_explain chat failed', response.status, detail.slice(0, 500));
    throw new HttpsError('unavailable', 'mistake_explain_provider_failed');
  }

  const json = (await response.json()) as OpenAIChatResponse;
  const answer = text(json.choices?.[0]?.message?.content, 900);
  if (!answer) throw new HttpsError('unavailable', 'mistake_explain_empty_reply');
  return { answer, usage: json.usage ?? {} };
}

async function recordBilling(
  db: FirebaseFirestore.Firestore,
  params: {
    stableUid: string;
    authUid: string;
    payload: ExplainMistakePayload;
    model: string;
    mistakeHash: string;
    usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  },
): Promise<void> {
  await db.collection(BILLING_COLLECTION).doc().set({
    uid: params.stableUid,
    authUid: params.authUid,
    lessonId: params.payload.lessonId,
    phraseId: params.payload.phraseId,
    mistakeHash: params.mistakeHash,
    variant: params.payload.variant,
    model: params.model,
    promptTokens: Number(params.usage.prompt_tokens ?? 0),
    completionTokens: Number(params.usage.completion_tokens ?? 0),
    totalTokens: Number(params.usage.total_tokens ?? 0),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
  });
}

export const explainMistake = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 30,
  memory: '512MiB',
  maxInstances: 20,
  secrets: [OPENAI_API_KEY],
}, async (request): Promise<ExplainMistakeResponse> => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const data = (request.data ?? {}) as ExplainMistakeRequest;
  const payload = sanitizePayload(data);

  const apiKey = text(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
  if (!apiKey) throw new HttpsError('failed-precondition', 'openai_key_missing');

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid);
  const model = await resolveConfiguredDialogModel(
    db,
    process.env.OPENAI_MISTAKE_EXPLAIN_MODEL || process.env.OPENAI_DIALOG_MODEL || MODEL_DEFAULT,
  );

  const langKey = resolvePromptLangKey(payload.interfaceLang);
  const mistakeHash = mistakeHashFor(payload.targetAnswer, payload.userAnswer, langKey);
  const RQ = 999; // remainingQuota sentinel — no daily cap.

  // 1. Cache FIRST — the ≥99% path, $0.
  const cached = await readCachedMistakeExplanation(mistakeHash);

  if (payload.variant === 'eli5') {
    // Cached ELI5 → $0.
    if (cached?.status === 'ready' && cached.eli5) {
      return { ok: true, text: cached.eli5, remainingQuota: RQ, model, fromCache: true, variant: 'eli5' };
    }
    await enforceRateLimit(db, authUid, stableUid);
    const gen = await generate(apiKey, model, buildEli5Messages(payload));

    if (cached?.status === 'ready') {
      // FULL doc exists — just attach ELI5 to it.
      await writeEli5MistakeExplanation(mistakeHash, gen.answer);
    } else {
      // ELI5 requested BEFORE the full breakdown was ever cached. Without this branch the ELI5
      // text would never persist and every repeat of the same mistake would re-pay (money leak).
      // Materialize the ready doc once (full + eli5) so all later readers are free.
      const claimed = await claimMistakePendingLock(mistakeHash, Date.now());
      if (claimed) {
        const fullGen = await generate(apiKey, model, buildFullMessages(payload));
        await writeReadyMistakeExplanation(mistakeHash, fullGen.answer, {
          lang: payload.interfaceLang,
          targetEn: payload.targetAnswer,
          userAnswer: payload.userAnswer,
          model,
        });
        await writeEli5MistakeExplanation(mistakeHash, gen.answer);
        await recordBilling(db, { stableUid, authUid, payload, model, mistakeHash, usage: fullGen.usage });
      }
    }
    await recordBilling(db, { stableUid, authUid, payload, model, mistakeHash, usage: gen.usage });
    return { ok: true, text: gen.answer, remainingQuota: RQ, model, fromCache: false, variant: 'eli5' };
  }

  // FULL breakdown path.
  if (cached?.status === 'ready' && cached.full) {
    return { ok: true, text: cached.full, remainingQuota: RQ, model, fromCache: true, variant: 'full' };
  }
  if (cached?.status === 'rejected' && !isRetryableRejectedMistake(cached, Date.now())) {
    // Serve a live generation rather than a stale rejection for the user in front of us,
    // but don't touch the cache (the lock claim below handles regeneration timing).
  }

  // Anti-abuse rate-limit (cache miss only).
  await enforceRateLimit(db, authUid, stableUid);

  // Claim the generation lock (anti-duplicate). If someone else is generating, still serve
  // the user a live answer — we just don't write the cache.
  const claimed = await claimMistakePendingLock(mistakeHash, Date.now());

  const gen = await generate(apiKey, model, buildFullMessages(payload));

  if (claimed) {
    await writeReadyMistakeExplanation(mistakeHash, gen.answer, {
      lang: payload.interfaceLang,
      targetEn: payload.targetAnswer,
      userAnswer: payload.userAnswer,
      model,
    });
  }
  await recordBilling(db, { stableUid, authUid, payload, model, mistakeHash, usage: gen.usage });

  return { ok: true, text: gen.answer, remainingQuota: RQ, model, fromCache: false, variant: 'full' };
});

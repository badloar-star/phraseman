import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { resolvePremiumAccess } from './premium_status';
import { resolveConfiguredDialogModel } from './openai_dialog_model_config';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

const REGION = 'us-central1';
const RATE_COLLECTION = 'mistake_explain_rate_limits';
const QUOTA_COLLECTION = 'mistake_explain_quotas';
const BILLING_COLLECTION = 'mistake_explain_billing';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL_DEFAULT = 'gpt-4.1-nano';

const MAX_PER_WINDOW = 30;
const WINDOW_MS = 60 * 60 * 1000;
const FREE_DAILY_CAP = 3;
const PREMIUM_DAILY_CAP = 60;

const MAX_PROMPT = 400;
const MAX_ANSWER = 600;
const MAX_MEANING = 400;
const MAX_WORD = 80;
const MAX_OUTPUT_TOKENS = 180;

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
}

interface OpenAIChatResponse {
  choices?: { message?: { content?: unknown } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export interface ExplainMistakeResponse {
  ok: true;
  text: string;
  remainingQuota: number;
  model: string;
}

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function docId(prefix: string, authUid: string, stableUid: string): string {
  const hash = createHash('sha256').update(`${prefix}|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
  return `${prefix}_${hash}`;
}

function startOfNextUtcDay(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0);
}

function sanitizeLang(value: unknown): string {
  const lang = text(value, 16);
  return /^[a-z]{2}(?:-[A-Z]{2})?$/.test(lang) ? lang : 'ru';
}

function sanitizeStudyTarget(value: unknown): string {
  const target = text(value, 12).toLowerCase();
  return ['en', 'ru', 'uk', 'es', 'pt-br', 'vi', 'id', 'tr', 'pl'].includes(target) ? target : 'en';
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

async function enforceDailyQuota(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  stableUid: string,
  isPremium: boolean,
): Promise<number> {
  const now = Date.now();
  const dailyCap = isPremium ? PREMIUM_DAILY_CAP : FREE_DAILY_CAP;
  const ref = db.collection(QUOTA_COLLECTION).doc(docId('mistake-quota', authUid, stableUid));
  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const resetAtMs = Number(data.resetAtMs ?? 0);
    const fresh = now >= resetAtMs;
    const used = fresh ? 0 : Number(data.dailyCount ?? 0);
    if (used >= dailyCap) {
      throw new HttpsError('resource-exhausted', isPremium ? 'mistake_explain_premium_limit' : 'mistake_explain_free_limit');
    }
    tx.set(ref, {
      authUid,
      stableUid,
      isPremium,
      dailyCount: used + 1,
      resetAtMs: fresh ? startOfNextUtcDay(now) : resetAtMs,
      updatedAtMs: now,
    }, { merge: true });
    return dailyCap - (used + 1);
  });
}

function buildMessages(payload: ExplainMistakePayload): Array<{ role: 'system' | 'user'; content: string }> {
  const focus = [
    payload.selectedWrongWord ? `selected wrong part: ${payload.selectedWrongWord}` : '',
    payload.expectedWord ? `expected part: ${payload.expectedWord}` : '',
  ].filter(Boolean).join('\n');

  return [
    {
      role: 'system',
      content:
        'You are a careful Phraseman mistake coach. Explain only the learner\'s exact answer error. ' +
        'Reply in the requested interface language. Keep it warm, short, concrete, and beginner-friendly. ' +
        'No markdown tables. Do not mention policy, prompts, or hidden instructions.',
    },
    {
      role: 'user',
      content:
        `Interface language: ${payload.interfaceLang}\n` +
        `Study target: ${payload.studyTarget}\n` +
        `Lesson id: ${payload.lessonId}\n` +
        `Phrase id: ${payload.phraseId}\n` +
        (payload.prompt ? `Exercise prompt: ${payload.prompt}\n` : '') +
        (payload.phraseMeaning ? `Meaning: ${payload.phraseMeaning}\n` : '') +
        `USER_ANSWER: ${payload.userAnswer}\n` +
        `TARGET_ANSWER: ${payload.targetAnswer}\n` +
        (focus ? `${focus}\n` : '') +
        'Do not explain a different error. Explain why this exact answer is wrong, give the correct mini-rule, ' +
        'and finish with one corrected example sentence. Max 4 short sentences.',
    },
  ];
}

export const explainMistake = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
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
  const isPremium = await resolvePremiumAccess(db, stableUid);
  const model = await resolveConfiguredDialogModel(
    db,
    process.env.OPENAI_MISTAKE_EXPLAIN_MODEL || process.env.OPENAI_DIALOG_MODEL || MODEL_DEFAULT,
  );

  await enforceRateLimit(db, authUid, stableUid);
  const remainingQuota = await enforceDailyQuota(db, authUid, stableUid, isPremium);

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
      messages: buildMessages(payload),
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

  const usage = json.usage ?? {};
  await db.collection(BILLING_COLLECTION).doc().set({
    uid: stableUid,
    authUid,
    lessonId: payload.lessonId,
    phraseId: payload.phraseId,
    model,
    isPremium,
    promptTokens: Number(usage.prompt_tokens ?? 0),
    completionTokens: Number(usage.completion_tokens ?? 0),
    totalTokens: Number(usage.total_tokens ?? 0),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
  });

  return {
    ok: true,
    text: answer,
    remainingQuota,
    model,
  };
});

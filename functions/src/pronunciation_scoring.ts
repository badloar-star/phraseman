import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createHash } from 'crypto';
import { ENFORCE_APP_CHECK } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import {
  PRONUNCIATION_PASS_THRESHOLD,
  scorePronunciationTranscript,
} from './pronunciation_scoring_core';

const REGION = 'us-central1';
const RATE_COLLECTION = 'pronunciation_score_rate_limits';
const DAILY_COLLECTION = 'pronunciation_score_daily_quota';
const GLOBAL_BUDGET_COLLECTION = 'pronunciation_global_budget';
const MAX_AUDIO_BYTES = 1_500_000;
const MAX_TARGET_TEXT = 220;
const MAX_DURATION_MS = 15_000;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 80;
// Per-user daily ceiling: practising pronunciation is high-volume, but no real
// learner needs hundreds of paid transcriptions/day. Caps a single farmed
// account at MAX_PER_DAY even if it spreads calls across many hourly windows.
const MAX_PER_DAY = 60;
// Product-wide daily breaker — protects the OpenAI wallet from a viral spike or
// coordinated account-farming (App Check is not enforced yet). Mirrors
// stats_insights / explain_budget.
const GLOBAL_DAILY_CAP = 8000;
const OPENAI_TRANSCRIPTION_URL = 'https://api.openai.com/v1/audio/transcriptions';
const OPENAI_TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe';

type ScorePronunciationRequest = {
  targetText?: unknown;
  recordingBase64?: unknown;
  recordingMimeType?: unknown;
  recordingDurationMs?: unknown;
  contentUnitId?: unknown;
  planInstanceId?: unknown;
  planId?: unknown;
  dayIndex?: unknown;
};

type OpenAITranscriptionResponse = {
  text?: unknown;
};

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function positiveNumber(value: unknown, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(max, Math.round(n));
}

function rateDocId(authUid: string, stableUid: string): string {
  const hash = createHash('sha256').update(`pronunciation|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
  return `pronunciation_${hash}`;
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mpeg')) return 'mp3';
  return 'm4a';
}

async function enforceRateLimit(authUid: string, stableUid: string): Promise<void> {
  const db = admin.firestore();
  const now = Date.now();
  const rateRef = db.collection(RATE_COLLECTION).doc(rateDocId(authUid, stableUid));

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(rateRef);
    const data = snap.data() ?? {};
    const windowStartMs = Number(data.windowStartMs ?? 0);
    const count = Number(data.count ?? 0);
    const sameWindow = now - windowStartMs < WINDOW_MS;
    if (sameWindow && count >= MAX_PER_WINDOW) {
      throw new HttpsError('resource-exhausted', 'pronunciation_rate_limited');
    }
    tx.set(rateRef, {
      authUid,
      stableUid,
      windowStartMs: sameWindow ? windowStartMs : now,
      count: sameWindow ? count + 1 : 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtMs: now,
    }, { merge: true });
  });
}

function utcDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/**
 * Per-user daily quota. Atomic check+increment on a {YYYY-MM-DD} counter so
 * concurrent calls can't bypass the cap. Counts attempts (not refunded on
 * provider failure) — mirrors the rate limiter's accounting.
 */
async function enforceDailyQuota(authUid: string, stableUid: string, nowMs: number = Date.now()): Promise<void> {
  const db = admin.firestore();
  const dayKey = utcDayKey(nowMs);
  const ref = db.collection(DAILY_COLLECTION).doc(`${rateDocId(authUid, stableUid)}_${dayKey}`);
  await db.runTransaction(async (tx) => {
    const count = Number((await tx.get(ref)).data()?.count ?? 0);
    if (count >= MAX_PER_DAY) {
      throw new HttpsError('resource-exhausted', 'pronunciation_daily_limit');
    }
    tx.set(ref, {
      authUid,
      stableUid,
      dayKey,
      count: count + 1,
      updatedAtMs: nowMs,
    }, { merge: true });
  });
}

/**
 * Product-wide daily generation breaker. Throws once the day's count would
 * exceed GLOBAL_DAILY_CAP. Mirrors stats_insights / explain_budget.
 */
async function enforceGlobalBudget(nowMs: number = Date.now()): Promise<void> {
  const db = admin.firestore();
  const ref = db.collection(GLOBAL_BUDGET_COLLECTION).doc(utcDayKey(nowMs));
  await db.runTransaction(async (tx) => {
    const genCount = Number((await tx.get(ref)).data()?.genCount ?? 0);
    if (genCount >= GLOBAL_DAILY_CAP) {
      throw new HttpsError('resource-exhausted', 'pronunciation_global_budget_exceeded');
    }
    tx.set(ref, { genCount: genCount + 1, updatedAtMs: nowMs }, { merge: true });
  });
}

async function transcribeWithOpenAI(input: {
  apiKey: string;
  audio: Buffer;
  mimeType: string;
  targetText: string;
}): Promise<string> {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(input.audio)], { type: input.mimeType });
  form.append('file', blob, `pronunciation.${extensionForMime(input.mimeType)}`);
  form.append('model', OPENAI_TRANSCRIPTION_MODEL);
  form.append('response_format', 'json');
  form.append('language', 'en');
  form.append('prompt', `The speaker is repeating this English phrase: ${input.targetText}`);

  const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('OpenAI pronunciation transcription failed', response.status, detail.slice(0, 500));
    throw new HttpsError('unavailable', 'pronunciation_transcription_failed');
  }

  const json = await response.json() as OpenAITranscriptionResponse;
  const transcript = text(json.text, 500);
  if (!transcript) throw new HttpsError('failed-precondition', 'empty_transcript');
  return transcript;
}

export const scorePronunciationAttempt = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 30,
  memory: '512MiB',
  maxInstances: 20,
}, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const apiKey = text(process.env.OPENAI_API_KEY, 300);
  if (!apiKey) throw new HttpsError('failed-precondition', 'openai_key_missing');

  const data = (request.data ?? {}) as ScorePronunciationRequest;
  const targetText = text(data.targetText, MAX_TARGET_TEXT);
  if (!targetText) throw new HttpsError('invalid-argument', 'target_text_required');

  const recordingBase64 = text(data.recordingBase64, Math.ceil(MAX_AUDIO_BYTES * 1.4));
  if (!recordingBase64) throw new HttpsError('invalid-argument', 'recording_required');

  const audio = Buffer.from(recordingBase64, 'base64');
  if (audio.length <= 0 || audio.length > MAX_AUDIO_BYTES) {
    throw new HttpsError('invalid-argument', 'recording_size_invalid');
  }

  const recordingMimeType = text(data.recordingMimeType, 80) || 'audio/m4a';
  const recordingDurationMs = positiveNumber(data.recordingDurationMs, MAX_DURATION_MS);
  if (!recordingDurationMs) throw new HttpsError('invalid-argument', 'recording_duration_invalid');

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid);
  await enforceRateLimit(authUid, stableUid);
  await enforceDailyQuota(authUid, stableUid);
  await enforceGlobalBudget();

  const transcript = await transcribeWithOpenAI({
    apiKey,
    audio,
    mimeType: recordingMimeType,
    targetText,
  });
  const result = scorePronunciationTranscript({
    targetText,
    transcript,
    threshold: PRONUNCIATION_PASS_THRESHOLD,
  });

  await db.collection('pronunciation_attempt_scores').doc().set({
    uid: stableUid,
    authUid,
    targetText,
    transcript,
    score: result.score,
    passed: result.passed,
    threshold: result.threshold,
    breakdown: result.breakdown,
    normalizedTarget: result.normalizedTarget,
    normalizedTranscript: result.normalizedTranscript,
    contentUnitId: text(data.contentUnitId, 180) || null,
    planInstanceId: text(data.planInstanceId, 180) || null,
    planId: text(data.planId, 80) || null,
    dayIndex: positiveNumber(data.dayIndex, 365) || null,
    recordingDurationMs,
    recordingMimeType,
    audioBytes: audio.length,
    provider: 'openai',
    transcriptionModel: OPENAI_TRANSCRIPTION_MODEL,
    scoringVersion: 'pronunciation-transcript-match-v1',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
  });

  return {
    ok: true,
    transcript,
    score: result.score,
    passed: result.passed,
    threshold: result.threshold,
    breakdown: result.breakdown,
    provider: 'openai',
    scoringVersion: 'pronunciation-transcript-match-v1',
    recognitionConfidence: 0.91,
  };
});

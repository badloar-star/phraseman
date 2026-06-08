"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.scorePronunciationAttempt = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const crypto_1 = require("crypto");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const pronunciation_scoring_core_1 = require("./pronunciation_scoring_core");
const REGION = 'us-central1';
const RATE_COLLECTION = 'pronunciation_score_rate_limits';
const MAX_AUDIO_BYTES = 1500000;
const MAX_TARGET_TEXT = 220;
const MAX_DURATION_MS = 15000;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 80;
const OPENAI_TRANSCRIPTION_URL = 'https://api.openai.com/v1/audio/transcriptions';
const OPENAI_TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe';
function text(value, max) {
    return String(value ?? '').trim().slice(0, max);
}
function positiveNumber(value, max) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0)
        return 0;
    return Math.min(max, Math.round(n));
}
function rateDocId(authUid, stableUid) {
    const hash = (0, crypto_1.createHash)('sha256').update(`pronunciation|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
    return `pronunciation_${hash}`;
}
function extensionForMime(mimeType) {
    if (mimeType.includes('wav'))
        return 'wav';
    if (mimeType.includes('mp4'))
        return 'mp4';
    if (mimeType.includes('webm'))
        return 'webm';
    if (mimeType.includes('mpeg'))
        return 'mp3';
    return 'm4a';
}
async function enforceRateLimit(authUid, stableUid) {
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
            throw new https_1.HttpsError('resource-exhausted', 'pronunciation_rate_limited');
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
async function transcribeWithOpenAI(input) {
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
        throw new https_1.HttpsError('unavailable', 'pronunciation_transcription_failed');
    }
    const json = await response.json();
    const transcript = text(json.text, 500);
    if (!transcript)
        throw new https_1.HttpsError('failed-precondition', 'empty_transcript');
    return transcript;
}
exports.scorePronunciationAttempt = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK,
    timeoutSeconds: 30,
    memory: '512MiB',
    maxInstances: 20,
}, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const apiKey = text(process.env.OPENAI_API_KEY, 300);
    if (!apiKey)
        throw new https_1.HttpsError('failed-precondition', 'openai_key_missing');
    const data = (request.data ?? {});
    const targetText = text(data.targetText, MAX_TARGET_TEXT);
    if (!targetText)
        throw new https_1.HttpsError('invalid-argument', 'target_text_required');
    const recordingBase64 = text(data.recordingBase64, Math.ceil(MAX_AUDIO_BYTES * 1.4));
    if (!recordingBase64)
        throw new https_1.HttpsError('invalid-argument', 'recording_required');
    const audio = Buffer.from(recordingBase64, 'base64');
    if (audio.length <= 0 || audio.length > MAX_AUDIO_BYTES) {
        throw new https_1.HttpsError('invalid-argument', 'recording_size_invalid');
    }
    const recordingMimeType = text(data.recordingMimeType, 80) || 'audio/m4a';
    const recordingDurationMs = positiveNumber(data.recordingDurationMs, MAX_DURATION_MS);
    if (!recordingDurationMs)
        throw new https_1.HttpsError('invalid-argument', 'recording_duration_invalid');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid);
    await enforceRateLimit(authUid, stableUid);
    const transcript = await transcribeWithOpenAI({
        apiKey,
        audio,
        mimeType: recordingMimeType,
        targetText,
    });
    const result = (0, pronunciation_scoring_core_1.scorePronunciationTranscript)({
        targetText,
        transcript,
        threshold: pronunciation_scoring_core_1.PRONUNCIATION_PASS_THRESHOLD,
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
//# sourceMappingURL=pronunciation_scoring.js.map
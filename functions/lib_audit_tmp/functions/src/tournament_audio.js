"use strict";
// ═══════════════════════════════════════════════════════════════════════════
// tournament_audio.ts — озвучка заданий турнира.
//
// зачем (владелец 2026-07-27): «озвучка может генерироваться сразу в
// генераторе, когда фразы уже одобрены?» — да, и только так. Задание
// одобряется ОДИН раз, а играется сотнями игроков: генерить звук в момент
// вопроса значило бы платить за одну фразу заново каждый турнир и добавлять
// 1-3 с задержки на таймере. Здесь фраза озвучивается при одобрении, файл
// ложится в Storage, клиент качает его в лобби заранее.
//
// Голос — тот же, что в обучении (alloy): человек привыкает к произношению,
// и турнир не должен звучать чужим тембром.
//
// Чистая логика (пути, дедуп, свежесть) отделена от сети и Firebase —
// покрывается тестами без эмулятора.
// ═══════════════════════════════════════════════════════════════════════════
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
exports.TOURNAMENT_AUDIO_SECRETS = exports.TOURNAMENT_TTS_MAX_CHARS = exports.TOURNAMENT_TTS_INSTRUCTIONS = exports.TOURNAMENT_TTS_SPEED = exports.TOURNAMENT_TTS_VOICE = exports.TOURNAMENT_TTS_MODEL = void 0;
exports.tournamentAudioTextHash = tournamentAudioTextHash;
exports.tournamentAudioObjectPath = tournamentAudioObjectPath;
exports.tournamentAudioDownloadUrl = tournamentAudioDownloadUrl;
exports.tournamentAudioToken = tournamentAudioToken;
exports.checkTournamentAudioFreshness = checkTournamentAudioFreshness;
exports.audioTextForTask = audioTextForTask;
exports.modeNeedsAudio = modeNeedsAudio;
exports.planTournamentSpeech = planTournamentSpeech;
exports.ensureTournamentAudio = ensureTournamentAudio;
const crypto_1 = require("crypto");
/** Голос и модель — те же, что у фраз обучения (scripts/regen_plan_listen_audio.mjs). */
exports.TOURNAMENT_TTS_MODEL = 'gpt-4o-mini-tts';
exports.TOURNAMENT_TTS_VOICE = 'alloy';
/**
 * Чуть медленнее обычной речи: игрок слышит фразу один раз под таймером,
 * и «проглоченное» окончание превращает задание в лотерею.
 */
exports.TOURNAMENT_TTS_SPEED = 0.95;
/** Инструкция диктору: ровный учительский тон без актёрской игры. */
exports.TOURNAMENT_TTS_INSTRUCTIONS = 'Speak clear neutral English at a calm teaching pace. Natural intonation, '
    + 'no dramatic acting, no trailing off. Pronounce every ending distinctly.';
/** Длиннее фразы турнира не бывают — предохранитель от случайной простыни. */
exports.TOURNAMENT_TTS_MAX_CHARS = 300;
/**
 * Хэш текста фразы. Нормализуем регистр и пробелы: «Nice  to meet you » и
 * «nice to meet you» — одна и та же озвучка, платить дважды незачем.
 */
function tournamentAudioTextHash(text) {
    const normalized = String(text ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
    return (0, crypto_1.createHash)('sha1').update(normalized).digest('hex').slice(0, 32);
}
/**
 * Путь в Storage по ХЭШУ ТЕКСТА, а не по taskId.
 *
 * зачем: одна и та же фраза может встретиться в нескольких заданиях (например
 * «Выбор на слух» и «Диктант» на одном предложении). По хэшу файл переиспользу-
 * ется — платим за озвучку один раз на уникальный текст.
 */
function tournamentAudioObjectPath(text) {
    return `tournament-audio/${tournamentAudioTextHash(text)}.mp3`;
}
/** Ссылка на объект Storage с download-токеном (формат Firebase). */
function tournamentAudioDownloadUrl(bucketName, objectPath, token) {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}`
        + `/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
}
/**
 * Детерминированный download-токен из пути: тот же файл — тот же токен, значит
 * повторная запись не ломает уже разосланные клиентам ссылки.
 */
function tournamentAudioToken(objectPath) {
    const hex = (0, crypto_1.createHash)('sha1').update(`tournament-audio:${objectPath}`).digest('hex');
    return [
        hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32),
    ].join('-');
}
/**
 * Страж свежести: озвучка обязана соответствовать ТЕКУЩЕМУ тексту задания.
 *
 * зачем: без него правка фразы в админке оставляла бы старый звук — игрок
 * слышал бы одно, а варианты ответа были бы от другого текста. В проекте это
 * известный класс бага (см. страж свежести озвучки фраз планов).
 */
function checkTournamentAudioFreshness(asset, currentText, currentVoice = exports.TOURNAMENT_TTS_VOICE) {
    if (!asset?.downloadUrl || !asset.textHash)
        return { fresh: false, reason: 'missing' };
    if (asset.textHash !== tournamentAudioTextHash(currentText)) {
        return { fresh: false, reason: 'text_changed' };
    }
    if (asset.voice && asset.voice !== currentVoice)
        return { fresh: false, reason: 'voice_changed' };
    return { fresh: true };
}
/** Текст, который нужно озвучить для задания (для каждого аудио-режима свой). */
function audioTextForTask(mode, payload) {
    // Во всех аудио-режимах озвучивается поле phrase: в «Парах звуков» это одно
    // слово из пары, в остальных — фраза целиком.
    if (mode !== 'listen_choose' && mode !== 'sound_contrast' && mode !== 'listen_build')
        return null;
    const phrase = String(payload?.phrase ?? '').trim();
    if (!phrase || phrase.length > exports.TOURNAMENT_TTS_MAX_CHARS)
        return null;
    return phrase;
}
/** Нужна ли этому режиму озвучка вообще. */
function modeNeedsAudio(mode) {
    return mode === 'listen_choose' || mode === 'sound_contrast' || mode === 'listen_build';
}
/** Заявка на озвучку: что именно и куда положить. Без сети — чистая функция. */
function planTournamentSpeech(mode, payload) {
    const text = audioTextForTask(mode, payload);
    if (!text)
        return null;
    return {
        request: {
            text,
            model: exports.TOURNAMENT_TTS_MODEL,
            voice: exports.TOURNAMENT_TTS_VOICE,
            speed: exports.TOURNAMENT_TTS_SPEED,
            instructions: exports.TOURNAMENT_TTS_INSTRUCTIONS,
        },
        objectPath: tournamentAudioObjectPath(text),
        textHash: tournamentAudioTextHash(text),
    };
}
// ── Серверная генерация: сеть + Storage ─────────────────────────────────────
const admin = __importStar(require("firebase-admin"));
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
const OPENAI_SPEECH_URL = 'https://api.openai.com/v1/audio/speech';
exports.TOURNAMENT_AUDIO_SECRETS = [OPENAI_API_KEY];
/** Один вызов OpenAI TTS → mp3-буфер. Паттерн из admin_director_digest_audio. */
async function requestSpeech(request) {
    const response = await fetch(OPENAI_SPEECH_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${OPENAI_API_KEY.value().trim()}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: request.model,
            voice: request.voice,
            input: request.text,
            speed: request.speed,
            instructions: request.instructions,
            response_format: 'mp3',
        }),
        signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        console.error('[tournaments] TTS failed', response.status, detail.slice(0, 240));
        throw new https_1.HttpsError('unavailable', 'tts_provider_failed');
    }
    return Buffer.from(await response.arrayBuffer());
}
/**
 * Гарантирует наличие озвучки для задания и возвращает готовый ассет.
 *
 * Дедуп по хэшу текста: если файл этой фразы уже лежит в Storage, повторно у
 * OpenAI ничего не просим — платим за уникальный текст один раз. Именно это
 * делает генерацию при одобрении дешёвой.
 */
async function ensureTournamentAudio(mode, payload, dependencies = {}) {
    const plan = planTournamentSpeech(mode, payload);
    if (!plan)
        return null;
    const bucket = admin.storage().bucket();
    const file = bucket.file(plan.objectPath);
    const token = tournamentAudioToken(plan.objectPath);
    const nowMs = dependencies.now?.() ?? Date.now();
    const [exists] = await file.exists();
    if (!exists) {
        const generate = dependencies.generateSpeech ?? requestSpeech;
        const audio = await generate(plan.request);
        await file.save(audio, {
            resumable: false,
            contentType: 'audio/mpeg',
            metadata: {
                // Токен фиксирован (детерминирован от пути): перезапись файла не
                // ломает ссылки, уже разосланные клиентам.
                metadata: {
                    firebaseStorageDownloadTokens: token,
                    sourceText: plan.request.text,
                    textHash: plan.textHash,
                    voice: plan.request.voice,
                    model: plan.request.model,
                },
                cacheControl: 'public, max-age=31536000, immutable',
            },
        });
    }
    return {
        objectPath: plan.objectPath,
        downloadUrl: tournamentAudioDownloadUrl(bucket.name, plan.objectPath, token),
        sourceText: plan.request.text,
        textHash: plan.textHash,
        voice: plan.request.voice,
        model: plan.request.model,
        createdAtMs: nowMs,
    };
}
//# sourceMappingURL=tournament_audio.js.map
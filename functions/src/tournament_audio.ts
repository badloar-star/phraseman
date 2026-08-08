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

import { createHash } from 'crypto';

/** Голос и модель — те же, что у фраз обучения (scripts/regen_plan_listen_audio.mjs). */
export const TOURNAMENT_TTS_MODEL = 'gpt-4o-mini-tts';
export const TOURNAMENT_TTS_VOICE = 'alloy';

/**
 * Чуть медленнее обычной речи: игрок слышит фразу один раз под таймером,
 * и «проглоченное» окончание превращает задание в лотерею.
 */
export const TOURNAMENT_TTS_SPEED = 0.95;

/** Инструкция диктору: ровный учительский тон без актёрской игры. */
export const TOURNAMENT_TTS_INSTRUCTIONS =
  'Speak clear neutral English at a calm teaching pace. Natural intonation, '
  + 'no dramatic acting, no trailing off. Pronounce every ending distinctly.';

/** Длиннее фразы турнира не бывают — предохранитель от случайной простыни. */
export const TOURNAMENT_TTS_MAX_CHARS = 300;

export type TournamentAudioAsset = {
  /** Путь объекта в Storage. */
  objectPath: string;
  /** Публичная ссылка для клиента. */
  downloadUrl: string;
  /** Текст, по которому сделана озвучка — для стража свежести. */
  sourceText: string;
  /** Хэш текста: дедуп и быстрая сверка «текст поменяли?». */
  textHash: string;
  voice: string;
  model: string;
  createdAtMs: number;
};

/**
 * Хэш текста фразы. Нормализуем регистр и пробелы: «Nice  to meet you » и
 * «nice to meet you» — одна и та же озвучка, платить дважды незачем.
 */
export function tournamentAudioTextHash(text: string): string {
  const normalized = String(text ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  return createHash('sha1').update(normalized).digest('hex').slice(0, 32);
}

/**
 * Путь в Storage по ХЭШУ ТЕКСТА, а не по taskId.
 *
 * зачем: одна и та же фраза может встретиться в нескольких заданиях (например
 * «Выбор на слух» и «Диктант» на одном предложении). По хэшу файл переиспользу-
 * ется — платим за озвучку один раз на уникальный текст.
 */
export function tournamentAudioObjectPath(text: string): string {
  return `tournament-audio/${tournamentAudioTextHash(text)}.mp3`;
}

/** Ссылка на объект Storage с download-токеном (формат Firebase). */
export function tournamentAudioDownloadUrl(bucketName: string, objectPath: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}`
    + `/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
}

/**
 * Детерминированный download-токен из пути: тот же файл — тот же токен, значит
 * повторная запись не ломает уже разосланные клиентам ссылки.
 */
export function tournamentAudioToken(objectPath: string): string {
  const hex = createHash('sha1').update(`tournament-audio:${objectPath}`).digest('hex');
  return [
    hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32),
  ].join('-');
}

export type FreshnessVerdict =
  | { fresh: true }
  | { fresh: false; reason: 'missing' | 'text_changed' | 'voice_changed' };

/**
 * Страж свежести: озвучка обязана соответствовать ТЕКУЩЕМУ тексту задания.
 *
 * зачем: без него правка фразы в админке оставляла бы старый звук — игрок
 * слышал бы одно, а варианты ответа были бы от другого текста. В проекте это
 * известный класс бага (см. страж свежести озвучки фраз планов).
 */
export function checkTournamentAudioFreshness(
  asset: Partial<TournamentAudioAsset> | null | undefined,
  currentText: string,
  currentVoice: string = TOURNAMENT_TTS_VOICE,
): FreshnessVerdict {
  if (!asset?.downloadUrl || !asset.textHash) return { fresh: false, reason: 'missing' };
  if (asset.textHash !== tournamentAudioTextHash(currentText)) {
    return { fresh: false, reason: 'text_changed' };
  }
  if (asset.voice && asset.voice !== currentVoice) return { fresh: false, reason: 'voice_changed' };
  return { fresh: true };
}

/** Текст, который нужно озвучить для задания (для каждого аудио-режима свой). */
export function audioTextForTask(mode: string, payload: Record<string, unknown>): string | null {
  // Во всех аудио-режимах озвучивается поле phrase: в «Парах звуков» это одно
  // слово из пары, в остальных — фраза целиком.
  if (mode !== 'listen_choose' && mode !== 'sound_contrast' && mode !== 'listen_build') return null;
  const phrase = String(payload?.phrase ?? '').trim();
  if (!phrase || phrase.length > TOURNAMENT_TTS_MAX_CHARS) return null;
  return phrase;
}

/** Нужна ли этому режиму озвучка вообще. */
export function modeNeedsAudio(mode: string): boolean {
  return mode === 'listen_choose' || mode === 'sound_contrast' || mode === 'listen_build';
}

export type SpeechRequest = {
  text: string;
  model: string;
  voice: string;
  speed: number;
  instructions: string;
};

/** Заявка на озвучку: что именно и куда положить. Без сети — чистая функция. */
export function planTournamentSpeech(
  mode: string,
  payload: Record<string, unknown>,
): { request: SpeechRequest; objectPath: string; textHash: string } | null {
  const text = audioTextForTask(mode, payload);
  if (!text) return null;
  return {
    request: {
      text,
      model: TOURNAMENT_TTS_MODEL,
      voice: TOURNAMENT_TTS_VOICE,
      speed: TOURNAMENT_TTS_SPEED,
      instructions: TOURNAMENT_TTS_INSTRUCTIONS,
    },
    objectPath: tournamentAudioObjectPath(text),
    textHash: tournamentAudioTextHash(text),
  };
}

// ── Серверная генерация: сеть + Storage ─────────────────────────────────────

import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError } from 'firebase-functions/v2/https';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const OPENAI_SPEECH_URL = 'https://api.openai.com/v1/audio/speech';

export const TOURNAMENT_AUDIO_SECRETS = [OPENAI_API_KEY];

/** Один вызов OpenAI TTS → mp3-буфер. Паттерн из admin_director_digest_audio. */
async function requestSpeech(request: SpeechRequest): Promise<Buffer> {
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
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('[tournaments] TTS failed', response.status, detail.slice(0, 240));
    throw new HttpsError('unavailable', 'tts_provider_failed');
  }
  return Buffer.from(await response.arrayBuffer());
}

export type EnsureAudioDependencies = {
  generateSpeech?: (request: SpeechRequest) => Promise<Buffer>;
  now?: () => number;
};

/**
 * Гарантирует наличие озвучки для задания и возвращает готовый ассет.
 *
 * Дедуп по хэшу текста: если файл этой фразы уже лежит в Storage, повторно у
 * OpenAI ничего не просим — платим за уникальный текст один раз. Именно это
 * делает генерацию при одобрении дешёвой.
 */
export async function ensureTournamentAudio(
  mode: string,
  payload: Record<string, unknown>,
  dependencies: EnsureAudioDependencies = {},
): Promise<TournamentAudioAsset | null> {
  const plan = planTournamentSpeech(mode, payload);
  if (!plan) return null;

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

export type VideoPhrase = Readonly<{
  id: string;
  ordinal: number;
  phrase: string;
  translation: string;
  explanation: string;
  /**
   * Секунда ролика, где звучит фраза. Необязательна: старые наборы без неё
   * остаются валидными, просто без прыжка к моменту.
   * зачем: владелец 2026-09-25 — тап по фразе перематывает видео к ней.
   */
  startSec?: number;
}>;

/** Потолок таймкода — 12 часов: длиннее роликов на канале не бывает. */
const MAX_START_SEC = 12 * 60 * 60;

/** Таймкод либо корректное число с шагом 0.1 с, либо отсутствует. */
export function normalizeVideoPhraseStartSec(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > MAX_START_SEC) {
    throw new Error('video_phrase_start_sec_invalid');
  }
  return Math.round(seconds * 10) / 10;
}

export type VideoPhraseVersion = Readonly<{
  id: string;
  videoId: string;
  status: 'draft' | 'published' | 'archived';
  sourceName: string;
  phrases: readonly VideoPhrase[];
  createdAt: string;
  createdBy: string;
}>;

const VIDEO_ID_RE = /^[0-9A-Za-z_-]{11}$/;

function text(value: unknown, code: string, max = 2000): string {
  if (typeof value !== 'string') throw new Error(code);
  const normalized = value.trim();
  if (!normalized) throw new Error(code);
  if (normalized.length > max) throw new Error(`${code}_too_long`);
  return normalized;
}

export function videoPhraseId(videoId: string, ordinal: number): string {
  if (!VIDEO_ID_RE.test(videoId)) throw new Error('video_phrase_video_id_invalid');
  if (!Number.isSafeInteger(ordinal) || ordinal < 1 || ordinal > 100000) {
    throw new Error('video_phrase_ordinal_invalid');
  }
  return `${videoId}:${ordinal}`;
}

export function normalizeVideoPhraseDraft(value: unknown): VideoPhrase {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('video_phrase_invalid');
  const row = value as Record<string, unknown>;
  const videoId = text(row.videoId, 'video_phrase_video_id_required', 11);
  if (!VIDEO_ID_RE.test(videoId)) throw new Error('video_phrase_video_id_invalid');
  const ordinal = Number(row.ordinal);
  const startSec = normalizeVideoPhraseStartSec(row.startSec);
  return Object.freeze({
    id: videoPhraseId(videoId, ordinal),
    ordinal,
    phrase: text(row.phrase, 'video_phrase_phrase_required'),
    translation: text(row.translation, 'video_phrase_translation_required'),
    explanation: text(row.explanation, 'video_phrase_explanation_required'),
    // Ключ добавляется только при наличии: у фраз без таймкода форма прежняя.
    ...(startSec === undefined ? {} : { startSec }),
  });
}

export function normalizeVideoPhraseList(videoId: string, values: unknown): readonly VideoPhrase[] {
  if (!VIDEO_ID_RE.test(videoId)) throw new Error('video_phrase_video_id_invalid');
  if (!Array.isArray(values) || values.length > 500) throw new Error('video_phrase_list_invalid');
  const phrases = values.map((value, index) => {
    const row = value && typeof value === 'object' && !Array.isArray(value)
      ? { ...(value as Record<string, unknown>), videoId }
      : value;
    // AI extraction deliberately returns only phrase/translation/explanation.
    // The list position is the canonical ordinal; an explicitly supplied ordinal
    // is still validated below so malformed manual drafts cannot be published.
    const normalizedRow = row && typeof row === 'object' && !Array.isArray(row)
      ? { ...(row as Record<string, unknown>), ordinal: (row as Record<string, unknown>).ordinal ?? index + 1 }
      : row;
    const phrase = normalizeVideoPhraseDraft(normalizedRow);
    if (phrase.ordinal !== index + 1) throw new Error('video_phrase_ordinals_must_be_contiguous');
    return phrase;
  });
  return Object.freeze(phrases);
}

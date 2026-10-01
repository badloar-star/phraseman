import { normalizeVideoPhraseList, type VideoPhrase } from '../shared/video_phrases_contract';

export type VideoPhraseReader = { get(path: string): Promise<unknown | null> };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export async function fetchPublishedVideoPhrasesWithReader(videoId: string, reader: VideoPhraseReader): Promise<readonly VideoPhrase[]> {
  const meta = record(await reader.get(`video_phrase_sets/${videoId}`));
  const activeVersion = typeof meta?.activeVersion === 'string' ? meta.activeVersion : '';
  if (!activeVersion) return [];
  const version = record(await reader.get(`video_phrase_sets/${videoId}/versions/${activeVersion}`));
  if (version?.status !== 'published') return [];
  const phrases = version?.phrases;
  if (!Array.isArray(phrases)) return [];
  try {
    return normalizeVideoPhraseList(videoId, phrases);
  } catch (error) {
    // A malformed server payload must fail closed instead of showing or saving
    // partially trusted phrase data in the learner app.
    console.warn(`[PM117-VIDEO-PHRASES] ${videoId}: фразы версии ${activeVersion} не прошли контракт — ${String(error)}`);
    return [];
  }
}

/**
 * PM-117-A2: потолок ожидания фраз ролика. Зависший запрос держал бы под роликом
 * скелетон бесконечно; по таймауту экран получает отказ и показывает честное
 * состояние «не удалось загрузить» с повтором (YoutubeVideoPhrases → state 'error').
 * Снятый/закрытый набор (нет activeVersion или версия не published) — это
 * пустой список, блок фраз скрывается, а не крутит загрузку.
 */
export const VIDEO_PHRASES_FETCH_TIMEOUT_MS = 15_000;

export function withVideoPhrasesTimeout<T>(work: Promise<T>, videoId: string, timeoutMs = VIDEO_PHRASES_FETCH_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      console.warn(`[PM117-VIDEO-PHRASES] ${videoId}: таймаут ${timeoutMs} мс — отдаю отказ, а не вечную загрузку`);
      reject(new Error('video_phrases_timeout'));
    }, timeoutMs);
  });
  return Promise.race([work, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export async function fetchPublishedVideoPhrases(videoId: string): Promise<readonly VideoPhrase[]> {
  const firestoreModule = await import('@react-native-firebase/firestore');
  const firestore = firestoreModule.default();
  return withVideoPhrasesTimeout(fetchPublishedVideoPhrasesWithReader(videoId, {
    get: async (path) => {
      const snapshot = await firestore.doc(path).get();
      return snapshot.exists ? snapshot.data() ?? null : null;
    },
  }), videoId);
}

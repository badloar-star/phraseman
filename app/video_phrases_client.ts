import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeVideoPhraseList, type VideoPhrase } from '../shared/video_phrases_contract';
import { rnfbInstance } from './rnfb_modular';
import { getDevVideoPhrases } from './dev_youtube_demo';

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
  // зачем (координатор 12.10, video-011): фразы демо-ролика с таймкодами из памяти (dev `videopacks=catalog`), без Firestore; в стор-сборке null
  const devPhrases = getDevVideoPhrases(videoId);
  if (devPhrases) return devPhrases;
  const firestoreModule = await import('@react-native-firebase/firestore');
  // зачем (координатор §67): модульный путь — без предупреждений устаревшего API на каждое чтение.
  const firestore = rnfbInstance(firestoreModule, 'getFirestore');
  return withVideoPhrasesTimeout(fetchPublishedVideoPhrasesWithReader(videoId, {
    get: async (path) => {
      const snapshot = await firestoreModule.getDoc(firestoreModule.doc(firestore, path));
      return snapshot.exists ? snapshot.data() ?? null : null;
    },
  }), videoId);
}

// ── Кэш фраз ролика ─────────────────────────────────────────────────────────
// зачем (video-011, координатор 05.10: «экран ролика открывается мгновенно … фразы из кэша»; правило «каждый раздел
// без ожиданий»): раньше каждое открытие ролика читало 2 документа Firestore и до ответа держало скелетоны. Теперь
// память процесса → диск → сеть только если кэш старше TTL. Фразы — публичный опубликованный контент.
export const VIDEO_PHRASES_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const VIDEO_PHRASES_CACHE_PREFIX = 'video_phrases_cache_v1:';

type CachedVideoPhrases = Readonly<{ savedAtMs: number; phrases: readonly VideoPhrase[] }>;
const phrasesMemory = new Map<string, CachedVideoPhrases>();

export type VideoPhrasesSource = 'memory' | 'disk' | 'net' | 'stale_after_net_error';

/** Синхронный первый кадр: только память процесса. */
export function peekCachedVideoPhrases(videoId: string): readonly VideoPhrase[] | null {
  return phrasesMemory.get(videoId)?.phrases ?? null;
}

async function readDiskPhrases(videoId: string): Promise<CachedVideoPhrases | null> {
  try {
    const raw = await AsyncStorage.getItem(`${VIDEO_PHRASES_CACHE_PREFIX}${videoId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAtMs?: unknown; phrases?: unknown };
    if (typeof parsed.savedAtMs !== 'number' || !Array.isArray(parsed.phrases)) return null;
    // Кэш тоже проходит контракт: повреждённая запись не должна попасть на экран.
    return { savedAtMs: parsed.savedAtMs, phrases: normalizeVideoPhraseList(videoId, parsed.phrases) };
  } catch (error) {
    console.warn(`[VIDEO-PHRASES-CACHE] ${videoId}: диск не прочитан — ${String(error)}`); // guard-ok: catch логируется
    return null;
  }
}

function rememberPhrases(videoId: string, phrases: readonly VideoPhrase[], savedAtMs: number): void {
  phrasesMemory.set(videoId, { savedAtMs, phrases });
}

/**
 * Фразы ролика с кэшем. Свежий кэш (память/диск моложе TTL) — без сети. Протух или нет — сеть; при её отказе отдаём
 * старый кэш, если он есть, иначе пробрасываем ошибку (вызывающий тихо повторяет).
 */
export async function loadVideoPhrasesCached(
  videoId: string,
  options: Readonly<{ nowMs?: number; fetcher?: (id: string) => Promise<readonly VideoPhrase[]> }> = {},
): Promise<Readonly<{ phrases: readonly VideoPhrase[]; from: VideoPhrasesSource }>> {
  const nowMs = options.nowMs ?? Date.now();
  const fetcher = options.fetcher ?? fetchPublishedVideoPhrases;
  const mem = phrasesMemory.get(videoId);
  if (mem && nowMs - mem.savedAtMs <= VIDEO_PHRASES_CACHE_TTL_MS) return { phrases: mem.phrases, from: 'memory' };
  const disk = mem ?? await readDiskPhrases(videoId);
  if (disk && !mem) rememberPhrases(videoId, disk.phrases, disk.savedAtMs);
  if (disk && nowMs - disk.savedAtMs <= VIDEO_PHRASES_CACHE_TTL_MS) return { phrases: disk.phrases, from: 'disk' };
  try {
    const phrases = await fetcher(videoId);
    rememberPhrases(videoId, phrases, nowMs);
    AsyncStorage.setItem(`${VIDEO_PHRASES_CACHE_PREFIX}${videoId}`, JSON.stringify({ savedAtMs: nowMs, phrases }))
      .catch((error: unknown) => console.warn(`[VIDEO-PHRASES-CACHE] ${videoId}: запись на диск не удалась — ${String(error)}`)); // guard-ok: catch логируется
    return { phrases, from: 'net' };
  } catch (error) {
    if (disk) {
      console.warn(`[VIDEO-PHRASES-CACHE] ${videoId}: сеть отказала, отдаю старый кэш (${Math.round((nowMs - disk.savedAtMs) / 60000)} мин) — ${String(error)}`); // guard-ok: catch логируется
      return { phrases: disk.phrases, from: 'stale_after_net_error' };
    }
    throw error;
  }
}

/** Только для тестов. */
export function __resetVideoPhrasesCacheForTests(): void {
  phrasesMemory.clear();
}

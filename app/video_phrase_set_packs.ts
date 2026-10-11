// ═══════════════════════════════════════════════════════════════════════════
// video_phrase_set_packs.ts — список «Из видео» из ГОТОВЫХ наборов фраз роликов.
//
// зачем (владелец 01.10: «уже собраны там для кучи видео, они открываются по
// нажатию фразы из видео!»): наборы фраз живут в `video_phrase_sets` (10 роликов,
// 1396 фраз на 01.10) и открываются по тапу на фразу под роликом. Экран «Из видео»
// искал `community_packs` с videoId (их 0) и был пуст. Источник переключён на тот
// же, что под роликом; новых документов не создаём.
//
// Стоимость: 1 запрос `video_phrase_sets` (limit) + манифест каналов + каталог
// каждого канала с роликами (те же документы, что читает экран видео) — не чаще
// раза в 6 ч; первый кадр — из кэша на диске.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';
import type { FlashcardMarketPack } from './flashcards/marketplace';
import { normalizePackLanguage, type PackLanguage } from './flashcards/pack_languages';
import { fetchYoutubeCatalogManifest, fetchYoutubeChannelCatalog } from './youtube_catalog_client';

const LOG = '[VIDEO-PACKS]';
// зачем (Карточки 2.0, 12.10): v2 несёт длительность ролика. v1 читаем как устаревший — первый кадр мгновенный,
// а сеть фоном дописывает длительность (без экрана ожидания).
const CACHE_KEY = 'video_phrase_set_packs_cache_v2';
const LEGACY_CACHE_KEY = 'video_phrase_set_packs_cache_v1';
export const VIDEO_PHRASE_SET_PACKS_TTL_MS = 6 * 60 * 60 * 1000;
const SETS_LIMIT = 200;
/** Префикс id: отличает набор фраз ролика от community-набора при открытии. */
export const VIDEO_PHRASE_SET_PACK_PREFIX = 'video:';

type CachedVideoPacks = { savedAtMs: number; packs: FlashcardMarketPack[] };

let memory: CachedVideoPacks | null = null;
let inFlight: Promise<FlashcardMarketPack[]> | null = null;

export function isVideoPhraseSetPackId(id: string): boolean {
  return id.startsWith(VIDEO_PHRASE_SET_PACK_PREFIX);
}

export function videoChannelIdOf(pack: FlashcardMarketPack): string {
  const value = (pack as { videoChannelId?: unknown }).videoChannelId;
  return typeof value === 'string' ? value : '';
}

export function videoIdFromPackId(id: string): string {
  return id.slice(VIDEO_PHRASE_SET_PACK_PREFIX.length);
}

/** Язык канала по его languageTags (en, es-ES → es …); неизвестный → en. */
export function packLanguageFromTags(tags: readonly string[]): PackLanguage {
  const first = (tags[0] ?? '').toLowerCase().split('-')[0];
  return normalizePackLanguage(first || 'en');
}

export type VideoPhraseSetRow = Readonly<{ videoId: string; phraseCount: number; publishedAtMs: number }>;
export type VideoCatalogInfo = Readonly<{ title: string; channelId: string; packLanguage: PackLanguage; durationSec?: number }>;

/**
 * Чистая сборка строк: только ролики с опубликованными фразами. Ролик без
 * записи в каталоге каналов всё равно показываем (название = id), чтобы набор
 * не пропал из-за отставания каталога — открывается он по videoId.
 */
export function buildVideoPhraseSetPacks(
  sets: readonly VideoPhraseSetRow[],
  catalog: ReadonlyMap<string, VideoCatalogInfo>,
): FlashcardMarketPack[] {
  return sets
    .filter((set) => set.phraseCount > 0 && /^[A-Za-z0-9_-]{11}$/.test(set.videoId))
    .sort((a, b) => b.publishedAtMs - a.publishedAtMs)
    .map((set) => {
      const info = catalog.get(set.videoId);
      const title = info?.title?.trim() || set.videoId;
      return {
        id: `${VIDEO_PHRASE_SET_PACK_PREFIX}${set.videoId}`,
        codeName: title,
        titleRu: title, titleUk: title, titleEs: title,
        titlePtBr: title, titleVi: title, titleId: title, titleTr: title, titlePl: title,
        descriptionRu: '', descriptionUk: '', descriptionEs: '',
        category: 'daily',
        cardCount: set.phraseCount,
        priceShards: 0,
        salesCount: 0,
        authorName: '',
        isOfficial: true,
        packLanguage: info?.packLanguage ?? 'en',
        listingStatus: 'published',
        videoId: set.videoId,
        videoTitle: title,
        // Бейдж длительности на превью (VideoPackRow/VideoSetView); нет в каталоге → бейджа нет.
        ...(typeof info?.durationSec === 'number' && info.durationSec > 0 ? { videoDurationSec: Math.round(info.durationSec) } : {}),
        // зачем: ролик открывается в СВОЁМ канале (каналы по языкам, D132).
        videoChannelId: info?.channelId ?? '',
        updatedAt: new Date(set.publishedAtMs || 0).toISOString(),
      } as FlashcardMarketPack & { videoChannelId: string };
    });
}

/** Синхронный первый кадр: память модуля (диск поднимается в loadVideoPhraseSetPacks). */
export function peekVideoPhraseSetPacks(): FlashcardMarketPack[] | null {
  return memory ? memory.packs : null;
}

async function readDiskCache(): Promise<CachedVideoPacks | null> {
  try {
    let raw = await AsyncStorage.getItem(CACHE_KEY);
    let legacy = false;
    if (!raw) {
      raw = await AsyncStorage.getItem(LEGACY_CACHE_KEY);
      legacy = raw !== null;
      if (!raw) return null;
    }
    const parsed = JSON.parse(raw) as CachedVideoPacks;
    if (!parsed || !Array.isArray(parsed.packs) || typeof parsed.savedAtMs !== 'number') {
      DebugLogger.warn(LOG, `кэш на диске отброшен: неверная форма (${legacy ? 'v1' : 'v2'})`);
      return null;
    }
    if (legacy) {
      DebugLogger.info(LOG, `source=disk_v1 наборов ${parsed.packs.length} — без длительности, обновлю фоном`);
      return { savedAtMs: 0, packs: parsed.packs };
    }
    return parsed;
  } catch (error) {
    DebugLogger.error(`${LOG}:readDiskCache`, error, 'warning');
    return null;
  }
}

async function fetchFromNetwork(): Promise<FlashcardMarketPack[]> {
  const startedAt = Date.now();
  const firestoreModule = await import('@react-native-firebase/firestore');
  const snap = await firestoreModule.default()
    .collection('video_phrase_sets')
    .where('activePhraseCount', '>', 0)
    .limit(SETS_LIMIT)
    .get();
  const sets: VideoPhraseSetRow[] = snap.docs.map((doc) => {
    const data = doc.data() ?? {};
    return {
      videoId: String(data.videoId ?? doc.id),
      phraseCount: Number(data.activePhraseCount ?? 0) || 0,
      publishedAtMs: Number(data.publishedAtMs ?? 0) || 0,
    };
  });

  const catalog = new Map<string, VideoCatalogInfo>();
  try {
    const manifest = await fetchYoutubeCatalogManifest();
    for (const channel of manifest.channels) {
      const packLanguage = packLanguageFromTags(channel.languageTags);
      try {
        const channelCatalog = await fetchYoutubeChannelCatalog(channel.id);
        for (const video of channelCatalog.videos) {
          catalog.set(video.id, {
            title: video.title,
            channelId: channel.id,
            packLanguage,
            ...(typeof video.durationSec === 'number' ? { durationSec: video.durationSec } : {}),
          });
        }
      } catch (error) {
        // Один канал без каталога не должен прятать наборы остальных.
        DebugLogger.error(`${LOG}:channelCatalog:${channel.id}`, error, 'warning');
      }
    }
  } catch (error) {
    DebugLogger.error(`${LOG}:manifest`, error, 'warning');
  }

  const packs = buildVideoPhraseSetPacks(sets, catalog);
  DebugLogger.info(LOG, `source=video_phrase_sets сеть: роликов ${sets.length}, с каталогом ${sets.filter((s) => catalog.has(s.videoId)).length}, с длительностью ${packs.filter((p) => (p.videoDurationSec ?? 0) > 0).length}, наборов ${packs.length}, ${Date.now() - startedAt} мс`);
  return packs;
}

/**
 * Кэш → сеть фоном. Сеть — не чаще раза в 6 ч или по forceRemote (кнопка «Повторить»).
 * Пустой ответ сети не затирает непустой кэш (наборы фраз только добавляются).
 */
export async function loadVideoPhraseSetPacks(options?: { forceRemote?: boolean }): Promise<FlashcardMarketPack[]> {
  if (!memory) {
    memory = await readDiskCache();
    if (memory) DebugLogger.info(LOG, `source=disk наборов ${memory.packs.length}, возраст ${Math.round((Date.now() - memory.savedAtMs) / 60000)} мин`);
  }
  const fresh = memory && Date.now() - memory.savedAtMs < VIDEO_PHRASE_SET_PACKS_TTL_MS;
  if (fresh && !options?.forceRemote) {
    DebugLogger.info(LOG, `source=cache наборов ${memory!.packs.length} (сеть пропущена: кэш свежее 6 ч)`);
    return memory!.packs;
  }
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const packs = await fetchFromNetwork();
      if (packs.length === 0 && memory && memory.packs.length > 0) {
        DebugLogger.warn(LOG, `сеть вернула 0 — оставляю кэш (${memory.packs.length})`);
        return memory.packs;
      }
      memory = { savedAtMs: Date.now(), packs };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(memory)).catch((error: unknown) => {
        DebugLogger.error(`${LOG}:writeDiskCache`, error, 'warning');
      });
      await AsyncStorage.removeItem(LEGACY_CACHE_KEY).catch((error: unknown) => {
        DebugLogger.error(`${LOG}:removeLegacyCache`, error, 'warning');
      });
      return packs;
    } catch (error) {
      DebugLogger.error(`${LOG}:network`, error, 'warning');
      if (memory) return memory.packs;
      throw error;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

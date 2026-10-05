/**
 * Лёгкое чтение сохранённой ленты канала с диска — без модуля ленты (fast-xml-parser и сеть).
 *
 * зачем (пакет 10:26: video:cache_read 3,9 с, из них getItem ~1 с, а ~2,9 с — ленивый import('./lingman_youtube')):
 * Главная показывает ролики из кэша сразу, а тяжёлый модуль догружается фоном для обновления из сети и пинов «Пульта».
 * Ключ и формат записи — те же, что пишет lingman_youtube (cacheSuccessfulVideos); он берёт ключ отсюда.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseYoutubeChannelId } from '../shared/youtube_catalog_contract';
import { getYoutubeChannelIdOverride } from './remote_flags';
import type { LingmanYoutubeVideo } from './lingman_youtube';

export const LINGMAN_FEED_SNAPSHOT_STORAGE_KEY = 'lingman_youtube_last_successful_snapshot_v2';
export const LINGMAN_DEFAULT_CHANNEL_ID = 'UCIr8fwZjbDtcUlQ-IKIbndg';

/** id активного канала: переопределение «Пульта» или канал по умолчанию. */
export function activeLingmanFeedChannelId(): string {
  return parseYoutubeChannelId(getYoutubeChannelIdOverride()) || LINGMAN_DEFAULT_CHANNEL_ID;
}

/** Сохранённый список канала (без пинов) или null: нет записи / другой канал / битая запись. */
export async function readRawCachedLingmanFeed(): Promise<LingmanYoutubeVideo[] | null> {
  try {
    const raw = await AsyncStorage.getItem(LINGMAN_FEED_SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { videos?: unknown; channelId?: string };
    if (parsed.channelId && parsed.channelId !== activeLingmanFeedChannelId()) return null;
    if (!Array.isArray(parsed.videos)) return null;
    const videos = parsed.videos.filter((video): video is LingmanYoutubeVideo => !!video
      && typeof (video as LingmanYoutubeVideo).id === 'string'
      && typeof (video as LingmanYoutubeVideo).title === 'string'
      && typeof (video as LingmanYoutubeVideo).thumbnailUrl === 'string');
    return videos.length ? videos : null;
  } catch (error) {
    console.warn('[HOME-COLD] video_raw_cache:read_failed', error instanceof Error ? error.message : String(error)); // guard-ok: catch логируется
    return null;
  }
}

/* expo-router: утилита, не экран */
export default function __LingmanYoutubeFeedDiskRouteShim() {
  return null;
}

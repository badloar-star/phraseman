// ═══════════════════════════════════════════════════════════════════════════
// home_video_rail_source.ts — какие видео показывает лента на Главной для языка.
//
// зачем D130/D132 (владелец 2026-09-30): лента Главной — канал на языке изучения из
// каталога YouTube по тегу языка (resolveVideoChannelForStudyTarget). Канала нет →
// лента скрыта. Английский канал другим языкам НЕ подставляем. Английский остаётся
// на прежней RSS-ленте своего канала Professor Lingman (lingman_youtube.ts): там же
// пины из «Пульта» и счётчик непросмотренных.
//
// Firebase-экономия: манифест + корень + канал + ≤8 роликов, результат держим в
// памяти процесса 6 часов — повторные заходы на Главную не читают Firestore.
// ═══════════════════════════════════════════════════════════════════════════

import type { LearningLanguageTarget } from './learning_language_contour';
import type { LingmanYoutubeVideo } from './lingman_youtube';
import { resolveVideoChannelForStudyTarget } from './video_language_contour';
import type { YoutubeVideoSnapshot } from '../shared/youtube_catalog_contract';

/** Языки, чья лента на Главной идёт из каталога по languageTags (а не из RSS). */
export const HOME_VIDEO_CATALOG_TARGETS: readonly LearningLanguageTarget[] = Object.freeze(['es', 'fr', 'de', 'it']);

const RAIL_TTL_MS = 6 * 60 * 60_000;
const RAIL_LIMIT = 8;

export type HomeVideoRailResult = Readonly<{
  videos: readonly LingmanYoutubeVideo[];
  source: 'catalog_channel' | 'no_channel_for_target';
  channelId: string | null;
  error?: string;
}>;

const cache = new Map<LearningLanguageTarget, { atMs: number; result: HomeVideoRailResult }>();

export function homeVideoRailUsesCatalog(target: LearningLanguageTarget): boolean {
  return HOME_VIDEO_CATALOG_TARGETS.includes(target);
}

export function catalogVideoToRailVideo(video: YoutubeVideoSnapshot): LingmanYoutubeVideo {
  const stamp = video.publishedAt ?? '';
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    publishedAt: stamp,
    updatedAt: stamp,
    watchUrl: video.watchUrl,
    ...(typeof video.viewCount === 'number' ? { viewCount: video.viewCount } : {}),
    // зачем (координатор 22:20: длительность пуста у части роликов): поле было в каталоге, но терялось здесь.
    ...(typeof video.durationSec === 'number' ? { durationSec: video.durationSec } : {}),
  };
}

/** Синхронный взгляд в кэш — первый кадр Главной без «пусто → лента». */
export function peekHomeVideoRailForTarget(target: LearningLanguageTarget): HomeVideoRailResult | null {
  const hit = cache.get(target);
  return hit && Date.now() - hit.atMs < RAIL_TTL_MS ? hit.result : null;
}

export async function loadHomeVideoRailForTarget(target: LearningLanguageTarget): Promise<HomeVideoRailResult> {
  const cached = peekHomeVideoRailForTarget(target);
  if (cached) {
    console.log('[LANG-SURFACE] home_rail:cache_hit', { target, count: cached.videos.length, source: cached.source });
    return cached;
  }
  const startedAt = Date.now();
  const client = await import('./youtube_catalog_client');
  const manifest = await client.fetchYoutubeCatalogManifest();
  const channel = resolveVideoChannelForStudyTarget(manifest.channels, target);
  if (!channel) {
    // Ранний выход: в каталоге нет канала с тегом языка. Английским НЕ подменяем (D132).
    console.warn('[LANG-SURFACE] home_rail:no_channel_for_target → hidden', {
      target,
      channels: manifest.channels.map((item) => ({ id: item.id, tags: item.languageTags })),
    });
    const result: HomeVideoRailResult = { videos: [], source: 'no_channel_for_target', channelId: null };
    cache.set(target, { atMs: Date.now(), result });
    return result;
  }
  const rail = await client.fetchYoutubeHomeRailCatalog(channel.id, manifest, RAIL_LIMIT);
  const result: HomeVideoRailResult = {
    videos: rail.videos.filter((video) => video.state !== 'upcoming').map(catalogVideoToRailVideo),
    source: 'catalog_channel',
    channelId: channel.id,
  };
  console.log('[LANG-SURFACE] home_rail:loaded', {
    target,
    channelId: channel.id,
    count: result.videos.length,
    ms: Date.now() - startedAt,
  });
  cache.set(target, { atMs: Date.now(), result });
  return result;
}

/* expo-router: не регистрировать файл как экран */
export default function __HomeVideoRailSourceRouteShim() {
  return null;
}

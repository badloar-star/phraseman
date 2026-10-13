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

import AsyncStorage from '@react-native-async-storage/async-storage';
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

// зачем (смета Firebase R1, п.11): кэш жил только в памяти — каждый ХОЛОДНЫЙ старт заново читал манифест, корень, канал и ≤8
// роликов (до 11 чтений). Тот же результат и тот же срок 6 ч теперь лежат на диске по языку; публичные данные каталога.
type RailDiskEntry = { atMs: number; result: HomeVideoRailResult };

async function readRailFromDisk(target: LearningLanguageTarget, nowMs: number): Promise<RailDiskEntry | null> {
  try {
    const raw = await AsyncStorage.getItem('home_video_rail_cache_v1');
    if (!raw) return null;
    const entry = (JSON.parse(raw) as Partial<Record<string, RailDiskEntry>>)[target];
    if (!entry || typeof entry.atMs !== 'number' || !entry.result || !Array.isArray(entry.result.videos)) return null;
    const ageMs = nowMs - entry.atMs;
    if (ageMs < 0 || ageMs >= RAIL_TTL_MS) {
      console.log('[LANG-SURFACE] home_rail:disk_stale', { target, ageMin: Math.round(ageMs / 60_000) });
      return null;
    }
    return entry;
  } catch (error) {
    console.warn('[LANG-SURFACE] home_rail:disk_read_failed — иду в сеть', { target, reason: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

async function writeRailToDisk(target: LearningLanguageTarget, entry: RailDiskEntry): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem('home_video_rail_cache_v1');
    const all = raw ? (JSON.parse(raw) as Record<string, RailDiskEntry>) : {};
    await AsyncStorage.setItem('home_video_rail_cache_v1', JSON.stringify({ ...all, [target]: entry }));
    console.log('[LANG-SURFACE] home_rail:disk_write', { target, count: entry.result.videos.length });
  } catch (error) {
    console.warn('[LANG-SURFACE] home_rail:disk_write_failed', { target, reason: error instanceof Error ? error.message : String(error) });
  }
}

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
  const disk = await readRailFromDisk(target, Date.now());
  if (disk) {
    cache.set(target, disk);
    console.log('[LANG-SURFACE] home_rail:disk_hit — без сети', { target, count: disk.result.videos.length, ageMin: Math.round((Date.now() - disk.atMs) / 60_000) });
    return disk.result;
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
    const entry = { atMs: Date.now(), result };
    cache.set(target, entry);
    void writeRailToDisk(target, entry);
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
  const entry = { atMs: Date.now(), result };
  cache.set(target, entry);
  void writeRailToDisk(target, entry);
  return result;
}

/** Только для тестов: сбросить кэш процесса (диск не трогает). */
export function resetHomeVideoRailMemoryForTests(): void {
  cache.clear();
}

/* expo-router: не регистрировать файл как экран */
export default function __HomeVideoRailSourceRouteShim() {
  return null;
}

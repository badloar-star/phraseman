// ═══════════════════════════════════════════════════════════════════════════
// youtube_channel_memory_cache — снимки каталога YouTube по КАНАЛАМ в памяти процесса.
//
// зачем (ревью TG-3BD963DD05D5, R2, 11.10): канал вкладки «Видео» задаётся языком обучения, а
// сохранённый снимок каталога (youtube_catalog_cache) один на аккаунт. При смене языка и
// возврате обратно лента каждый раз шла в сеть (~154 чтения) и до ответа показывала канал
// ЧУЖОГО языка. Здесь — последние снимки нескольких каналов: возврат на язык показывает его
// ленту мгновенно, а снимок уходит в revalidateYoutubeChannelCatalog как `previous` —
// при той же версии каталога это одно чтение манифеста вместо полного каталога.
// Только память (без диска): каталог публичный, после перезапуска хватает общего снимка.
// ═══════════════════════════════════════════════════════════════════════════
import type { YoutubeCatalogScreenSnapshot } from './youtube_catalog_cache';
import type { YoutubeCatalogManifest, YoutubeChannelSnapshot } from '../shared/youtube_catalog_contract';

export type YoutubeChannelSwitchView =
  | { kind: 'shown'; catalog: YoutubeCatalogScreenSnapshot }
  | { kind: 'cache'; catalog: YoutubeCatalogScreenSnapshot }
  | { kind: 'pending'; channel: YoutubeChannelSnapshot | null };

/** Шапка канала из манифеста, пока каталог нового канала ещё не пришёл (лента — скелетоном). */
export function youtubeChannelPlaceholder(manifest: YoutubeCatalogManifest, channelId: string): YoutubeChannelSnapshot | null {
  const entry = manifest.channels.find((item) => item.id === channelId);
  if (!entry) return null;
  return {
    id: entry.id,
    youtubeChannelId: '',
    displayName: entry.displayName,
    handle: '',
    url: '',
    ...(entry.avatarUrl ? { avatarUrl: entry.avatarUrl } : {}),
    languageTags: entry.languageTags,
    order: entry.order,
    recentVideoIds: [],
    playlistIds: [],
  };
}

/**
 * Что показать, когда нужен канал `targetChannelId`: уже показанный каталог, снимок из памяти или
 * «ожидание» (шапка по манифесту + скелетон ленты). Чужой канал под пилюлей нового языка не показываем.
 */
export function resolveYoutubeChannelSwitchView(options: {
  shown: YoutubeCatalogScreenSnapshot | null;
  manifest: YoutubeCatalogManifest;
  targetChannelId: string;
  accountScope: string | null | undefined;
}): YoutubeChannelSwitchView {
  const { shown, manifest, targetChannelId, accountScope } = options;
  if (shown && shown.channel.id === targetChannelId) return { kind: 'shown', catalog: shown };
  const cached = peekYoutubeChannelMemorySnapshot(accountScope, targetChannelId);
  if (cached) return { kind: 'cache', catalog: cached };
  return { kind: 'pending', channel: youtubeChannelPlaceholder(manifest, targetChannelId) };
}

/** Сколько каналов держим одновременно (языков обучения 5). */
export const YOUTUBE_CHANNEL_MEMORY_CACHE_LIMIT = 5;

const snapshots = new Map<string, YoutubeCatalogScreenSnapshot>();

function cacheKey(accountScope: string | null | undefined, channelId: string): string {
  return `${accountScope || 'anon'}:${channelId}`;
}

export function peekYoutubeChannelMemorySnapshot(
  accountScope: string | null | undefined,
  channelId: string,
): YoutubeCatalogScreenSnapshot | null {
  if (!channelId) return null;
  return snapshots.get(cacheKey(accountScope, channelId)) ?? null;
}

export function rememberYoutubeChannelMemorySnapshot(
  accountScope: string | null | undefined,
  snapshot: YoutubeCatalogScreenSnapshot,
): void {
  const channelId = snapshot.channel?.id;
  if (!channelId) return;
  const key = cacheKey(accountScope, channelId);
  // Порядок вставки Map = порядок свежести: перекладываем ключ в конец, вытесняем самый старый.
  snapshots.delete(key);
  snapshots.set(key, snapshot);
  while (snapshots.size > YOUTUBE_CHANNEL_MEMORY_CACHE_LIMIT) {
    const oldest = snapshots.keys().next().value;
    if (oldest === undefined) break;
    snapshots.delete(oldest);
  }
}

export function youtubeChannelMemoryCacheSizeForTests(): number {
  return snapshots.size;
}

export function resetYoutubeChannelMemoryCacheForTests(): void {
  snapshots.clear();
}

/* expo-router: не регистрировать файл как экран */
export default function __YoutubeChannelMemoryCacheRouteShim() {
  return null;
}

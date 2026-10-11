import { createHash } from 'crypto';
import type { YoutubeBuiltSnapshot } from './youtube_catalog_store';

/**
 * Решение «публиковать ли снимок каталога YouTube» (находка K аудита стоимости Firebase, §CORE-0163).
 *
 * зачем: каждая публикация пишет весь снимок (канал + до 100 видео + до 50 плейлистов + страницы — по каждому
 * каналу), тут же перечитывает его и через 7 дней удаляет; синк шёл раз в 15 мин, в эфир — каждую минуту, даже
 * когда ничего не менялось. Теперь:
 *  - изменилось то, что видит человек (ролики, эфир, названия, плейлисты, порядок) — публикуем сразу, как раньше;
 *  - изменилось только число просмотров (приложение его показывает) — не чаще раза в 6 ч и только если
 *    поменялось число НА ЭКРАНЕ (то же округление, что components/video/formatViewCount.ts);
 *  - ручной запуск из админки — всегда публикуем.
 */
export const YOUTUBE_VIEW_COUNT_REFRESH_MS = 6 * 60 * 60 * 1000;

export type YoutubeSnapshotContentHashes = Readonly<{ structure: string; display: string }>;

/**
 * Число просмотров в том виде, в каком его покажет приложение: до 1 000 — точно, до 10 тыс. — с одной цифрой после
 * запятой (сотни), дальше — целыми тысячами; так же миллионы.
 * Двойник components/video/formatViewCount.ts: при расхождении — лишь лишняя/пропущенная публикация, её закроет потолок 6 ч.
 */
export function youtubeViewCountDisplayBucket(count: unknown): string | null {
  const value = Number(count);
  if (count == null || !Number.isFinite(value)) return null;
  if (value >= 1_000_000) return value / 1_000_000 >= 10 ? `${Math.round(value / 1_000_000)}M` : `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return value / 1_000 >= 10 ? `${Math.round(value / 1_000)}K` : `${(value / 1_000).toFixed(1)}K`;
  return String(Math.trunc(value));
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(Object.keys(record).sort().map((key) => [key, stable(record[key])]));
}

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

/** Отпечатки содержимого снимка без того, что меняется само по себе: версии и меток времени сборки. */
export function youtubeSnapshotContentHashes(snapshot: YoutubeBuiltSnapshot): YoutubeSnapshotContentHashes {
  const { activeVersion: _activeVersion, generatedAt: _generatedAt, sourceRefreshedAt: _sourceRefreshedAt, ...manifest } = snapshot.manifest as YoutubeBuiltSnapshot['manifest'] & {
    sourceRefreshedAt?: unknown;
  };
  const project = (viewCount: (count: unknown) => unknown) => ({
    manifest,
    channels: snapshot.channels.map((entry) => ({
      channel: entry.channel,
      playlists: entry.playlists,
      playlistPages: entry.playlistPages,
      videos: entry.videos.map((video) => {
        const { viewCount: count, ...rest } = video as typeof video & { viewCount?: unknown };
        const shown = viewCount(count);
        return shown === undefined ? rest : { ...rest, viewCount: shown };
      }),
    })),
  });
  return Object.freeze({
    structure: sha256(project(() => undefined)),
    display: sha256(project((count) => youtubeViewCountDisplayBucket(count))),
  });
}

export type YoutubeCatalogPublishDecision = Readonly<{ publish: boolean; reason: string }>;

export function decideYoutubeCatalogPublish(input: Readonly<{
  trigger: 'cron' | 'manual';
  nowMs: number;
  hashes: YoutubeSnapshotContentHashes;
  syncState: Readonly<Record<string, unknown>>;
}>): YoutubeCatalogPublishDecision {
  if (input.trigger === 'manual') return { publish: true, reason: 'manual' };
  const lastStructure = typeof input.syncState.lastPublishedStructureHash === 'string' ? input.syncState.lastPublishedStructureHash : '';
  const lastDisplay = typeof input.syncState.lastPublishedDisplayHash === 'string' ? input.syncState.lastPublishedDisplayHash : '';
  const lastPublishedAtMs = Number(input.syncState.lastPublishedAtMs ?? 0);
  if (!lastStructure || !lastDisplay || !Number.isFinite(lastPublishedAtMs) || lastPublishedAtMs <= 0) {
    return { publish: true, reason: 'no_previous_fingerprint' };
  }
  if (lastStructure !== input.hashes.structure) return { publish: true, reason: 'content_changed' };
  if (lastDisplay === input.hashes.display) return { publish: false, reason: 'unchanged' };
  if (input.nowMs - lastPublishedAtMs >= YOUTUBE_VIEW_COUNT_REFRESH_MS) return { publish: true, reason: 'view_counts_refresh' };
  return { publish: false, reason: 'view_counts_only_recent' };
}

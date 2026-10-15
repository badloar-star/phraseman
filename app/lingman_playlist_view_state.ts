// зачем (R57 #23, координатор 15.10): плейлист из «хвоста» каталога (за пределами 8 плейлистов снимка экрана видео) на медленной сети. Решение «что показать» — чистая функция, чтобы все ветки проверялись без экрана:
// пока ничего не пришло — скелет; полный список пришёл (или сети и кэша нет) — честная пустота с «Повторить»; ответа нет дольше PLAYLIST_SLOW_MS — «грузится дольше обычного» с «Повторить» вместо вечного скелета.
import type { AllVideosStatus } from './all_channel_videos_source';

/** Сколько ждём полный список, прежде чем показать «грузится дольше обычного» (скелет не вечный). */
export const PLAYLIST_SLOW_MS = 15_000;

export type PlaylistViewKind =
  | 'skeleton' // плейлиста ещё нет, ждём
  | 'slow' // плейлиста нет, ждём слишком долго
  | 'empty' // плейлиста нет, полный список пришёл или сети и кэша нет
  | 'content' // плейлист и ролики показаны
  | 'content_loading' // плейлист есть, роликов ещё нет, ждём
  | 'content_slow' // плейлист есть, роликов нет, ждём слишком долго
  | 'content_empty'; // плейлист есть, полный список пришёл — роликов в нём нет

export function playlistViewKind(input: Readonly<{ hasPlaylist: boolean; videosCount: number; status: AllVideosStatus; waitedTooLong: boolean }>): PlaylistViewKind {
  const settled = input.status === 'ready' || input.status === 'unavailable';
  if (!input.hasPlaylist) {
    if (settled) return 'empty';
    return input.waitedTooLong ? 'slow' : 'skeleton';
  }
  if (input.videosCount > 0) return 'content';
  if (settled) return 'content_empty';
  return input.waitedTooLong ? 'content_slow' : 'content_loading';
}

/* expo-router route shim: служебный модуль в app/ не должен становиться экраном. */
export default function __LingmanPlaylistViewStateRouteShim() { return null; }

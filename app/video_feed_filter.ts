/**
 * Фильтр ленты раздела «Видео»: «Все», «Не смотрел», «Избранное».
 *
 * зачем (владелец 11.11, макет docs/work/mockups/video-hub-2026-11-11, экран 1: «красиво, удобно… супер просто»):
 * человек одним касанием оставляет в ленте только непросмотренное или только отмеченное звездой. Считается на телефоне
 * по тому, что уже лежит локально (избранное и список роликов с полученной наградой за просмотр) — сети и новых чтений
 * Firestore нет. Модуль чистый, без состояния.
 */
export type VideoFeedFilter = 'all' | 'unwatched' | 'favorites';

export const VIDEO_FEED_FILTERS: readonly VideoFeedFilter[] = ['all', 'unwatched', 'favorites'];

export type VideoFeedFilterContext = Readonly<{
  /** Отмечен ли ролик звездой («Избранное»). */
  isSaved: (videoId: string) => boolean;
  /** Ролики, которые человек уже досмотрел (награда за просмотр получена). */
  watchedIds: ReadonlySet<string>;
}>;

/**
 * Порядок роликов не меняется. Для «Все» возвращается ТОТ ЖЕ массив — список не получает новую ссылку
 * и не перерисовывается без причины.
 */
export function filterVideoFeed<T extends { readonly id: string }>(
  videos: readonly T[],
  filter: VideoFeedFilter,
  ctx: VideoFeedFilterContext,
): readonly T[] {
  if (filter === 'unwatched') return videos.filter((video) => !ctx.watchedIds.has(video.id));
  if (filter === 'favorites') return videos.filter((video) => ctx.isSaved(video.id));
  return videos;
}

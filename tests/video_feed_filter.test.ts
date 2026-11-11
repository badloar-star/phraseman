/**
 * Фильтр ленты «Видео» (владелец 11.11): «Все», «Не смотрел», «Избранное» — считается на телефоне, без сети.
 */
import { filterVideoFeed, VIDEO_FEED_FILTERS } from '../app/video_feed_filter';

const VIDEOS = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }] as const;
const ctx = { isSaved: (id: string) => id === 'b' || id === 'd', watchedIds: new Set(['a', 'b']) };

describe('video_feed_filter', () => {
  it('фильтров три, «Все» — первый', () => {
    expect(VIDEO_FEED_FILTERS).toEqual(['all', 'unwatched', 'favorites']);
  });

  it('«Все» возвращает тот же массив — список не перерисовывается зря', () => {
    expect(filterVideoFeed(VIDEOS, 'all', ctx)).toBe(VIDEOS);
  });

  it('«Не смотрел» убирает досмотренные ролики и сохраняет порядок', () => {
    expect(filterVideoFeed(VIDEOS, 'unwatched', ctx).map((v) => v.id)).toEqual(['c', 'd']);
  });

  it('«Избранное» оставляет только отмеченные звездой и сохраняет порядок', () => {
    expect(filterVideoFeed(VIDEOS, 'favorites', ctx).map((v) => v.id)).toEqual(['b', 'd']);
  });

  it('пустой результат — пустой массив, а не ошибка', () => {
    expect(filterVideoFeed(VIDEOS, 'favorites', { isSaved: () => false, watchedIds: new Set() })).toEqual([]);
    expect(filterVideoFeed([], 'unwatched', ctx)).toEqual([]);
  });

  it('исходный массив не меняется', () => {
    const copy = [...VIDEOS];
    filterVideoFeed(copy, 'unwatched', ctx);
    expect(copy).toEqual([...VIDEOS]);
  });
});

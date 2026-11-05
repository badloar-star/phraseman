// Порядок ленты видео на Главной (слово владельца 05.11): новое — всегда первым, просмотренное уходит в конец списка.
// зачем: чистая функция (без хранилища и сети) — сторож tests/home_video_order_2026_11_05.test.ts проверяет правило напрямую.

export type WatchedVideoMap = Readonly<Record<string, number>>;

/**
 * Непросмотренные — первыми, в порядке источника (новые сверху, как отдаёт home_video_rail_source).
 * Просмотренные — в конец; между собой по давности просмотра: недавно просмотренное — в самом конце.
 */
export function orderHomeVideos<T extends Readonly<{ id: string }>>(videos: readonly T[], watched: WatchedVideoMap): readonly T[] {
  if (videos.length < 2) return videos;
  const fresh: T[] = [];
  const seen: { video: T; at: number; index: number }[] = [];
  videos.forEach((video, index) => {
    const at = watched[video.id];
    if (typeof at === 'number' && Number.isFinite(at)) seen.push({ video, at, index });
    else fresh.push(video);
  });
  if (seen.length === 0) return videos;
  seen.sort((a, b) => (a.at - b.at) || (a.index - b.index));
  return [...fresh, ...seen.map((item) => item.video)];
}

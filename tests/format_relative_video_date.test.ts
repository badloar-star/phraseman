import { formatRelativeVideoDate } from '../components/video/formatRelativeVideoDate';

// зачем (Сверка video-009): даты роликов как в макете — «2 дня назад», «месяц назад».
const NOW = Date.parse('2026-10-05T12:00:00Z');
const ago = (days: number) => new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();

describe('formatRelativeVideoDate', () => {
  it('russian forms match the mockup', () => {
    expect(formatRelativeVideoDate(ago(0), 'ru', NOW)).toBe('сегодня');
    expect(formatRelativeVideoDate(ago(1), 'ru', NOW)).toBe('вчера');
    expect(formatRelativeVideoDate(ago(2), 'ru', NOW)).toBe('2 дня назад');
    expect(formatRelativeVideoDate(ago(5), 'ru', NOW)).toBe('5 дней назад');
    expect(formatRelativeVideoDate(ago(7), 'ru', NOW)).toBe('неделю назад');
    expect(formatRelativeVideoDate(ago(30), 'ru', NOW)).toBe('месяц назад');
    expect(formatRelativeVideoDate(ago(61), 'ru', NOW)).toBe('2 месяца назад');
    expect(formatRelativeVideoDate(ago(800), 'ru', NOW)).toBe('2 года назад');
  });

  it('other languages and edge cases', () => {
    expect(formatRelativeVideoDate(ago(3), 'en', NOW)).toBe('3 days ago');
    expect(formatRelativeVideoDate(ago(3), 'uk', NOW)).toBe('3 дні тому');
    expect(formatRelativeVideoDate(ago(14), 'es', NOW)).toBe('hace 2 semanas');
    expect(formatRelativeVideoDate(ago(3), 'xx', NOW)).toBe('3 days ago');
    expect(formatRelativeVideoDate('', 'ru', NOW)).toBe('');
    expect(formatRelativeVideoDate('not-a-date', 'ru', NOW)).toBe('');
    expect(formatRelativeVideoDate(new Date(NOW + 86_400_000).toISOString(), 'ru', NOW)).toBe('сегодня');
  });
});

describe('formatVideoDuration + durationSec in the catalog contract', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { formatVideoDuration } = require('../components/video/formatVideoDuration');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { parseYoutubeVideoSnapshot } = require('../shared/youtube_catalog_contract');
  const base = {
    id: 'abcdefghijk', channelId: 'phraseman_en', title: 'T', description: '', state: 'video',
    thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg', watchUrl: 'https://www.youtube.com/watch?v=abcdefghijk', playlistIds: [],
  };

  it('formats like the mockup and hides missing values', () => {
    expect(formatVideoDuration(754)).toBe('12:34');
    expect(formatVideoDuration(3723)).toBe('1:02:03');
    expect(formatVideoDuration(undefined)).toBe('');
    expect(formatVideoDuration(0)).toBe('');
  });

  it('keeps a valid durationSec and drops a broken one without failing the video', () => {
    expect(parseYoutubeVideoSnapshot({ ...base, durationSec: 754 }).durationSec).toBe(754);
    expect(parseYoutubeVideoSnapshot({ ...base, durationSec: 'x' }).durationSec).toBeUndefined();
    expect(parseYoutubeVideoSnapshot(base).durationSec).toBeUndefined();
  });
});

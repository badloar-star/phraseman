// зачем (PM-114-A1, координатор 13.10): «переход компактной строки в карточку с плеером не вызывает скачки позиции, перерисовку всех строк».
// После редизайна 11.10 строки «Все видео» — сетка в две колонки одинаковой геометрии; плеер в строке не раскрывается (тап открывает экран ролика),
// встроенный плеер живёт только вместо шапки-премьеры. Сторож фиксирует это свойство: строка не зависит от выбранного ролика.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('«Все видео»: высота строк не прыгает при выборе ролика', () => {
  const screen = read('app/lingman_videos.tsx');
  const card = read('components/youtube/YoutubeVideoGridCard.tsx');

  it('карточка строки не знает про компактный вид и про активный плеер', () => {
    expect(card).not.toMatch(/\bcompact\b/);
    expect(card).not.toMatch(/activeVideoId|YoutubeInlinePlayer/);
  });

  it('renderHomeVideo не зависит от activeVideoId — выбор ролика не перерисовывает строки', () => {
    const start = screen.indexOf('const renderHomeVideo = useCallback(');
    const end = screen.indexOf('const renderPlaylist = useCallback(', start);
    const block = screen.slice(start, end);
    expect(block).not.toContain('activeVideoId');
    expect(block).toContain('<YoutubeVideoGridCard');
  });

  it('встроенный плеер — только в шапке списка вместо премьеры (тот же формат 16:9), в строках его нет', () => {
    const inlineUses = screen.match(/<YoutubeInlinePlayer/g)?.length ?? 0;
    expect(inlineUses).toBe(1);
    expect(screen).toContain('hero.id === activeVideoId ? (');
    expect(screen).toContain("heroPlayer: { width: '100%', aspectRatio: 16 / 9");
  });

  it('тап по строке открывает экран ролика, а не раскрывает строку', () => {
    expect(screen).toContain("pathname: '/lingman_video_watch'");
    expect(screen).toContain('onWatch={() => openVideoRef.current(item)}');
  });
});

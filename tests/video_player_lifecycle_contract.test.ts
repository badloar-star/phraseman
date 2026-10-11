/**
 * PM-118: нет autoplay/прогрева всех роликов; уход с экрана освобождает плеер.
 * Сторож исходников — плеер (WebView) не тестируется в jsdom.
 * Сломался тест — возвращать поведение, а не ослаблять проверку.
 */
import fs from 'fs';
import path from 'path';

const read = (...p: string[]): string => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

describe('жизненный цикл видеоплеера (PM-118)', () => {
  const player = read('components', 'youtube', 'YoutubeInlinePlayer.tsx');
  const screen = read('app', 'lingman_videos.tsx');

  it('неактивный плеер полностью размонтирует WebView', () => {
    expect(player).toContain('if (!active) return null;');
  });

  it('воспроизведение только после действия человека: плеер монтируется по тапу', () => {
    expect(player).toContain('mediaPlaybackRequiresUserAction={!autoPlay}');
    // Экран «Видео»: плеер только у выбранного тапом ролика, один на экран.
    expect(screen).toContain('const [activeVideoId, setActiveVideoId] = useState<string | null>(null);');
    // зачем (владелец 11.10, video-redesign #c1): обычные ролики открываются экраном ролика; встроенный плеер — у премьеры в шапке.
    expect(screen).toContain('hero.id === activeVideoId ? (');
    expect(screen).toContain('active={screenRuntimeActive}');
  });

  it('нет прогрева всех роликов и превью', () => {
    for (const source of [player, screen, read('components', 'youtube', 'YoutubeVideoCard.tsx')]) {
      expect(source).not.toMatch(/Image\.prefetch|prefetchVideo|preloadVideo/);
    }
  });
});

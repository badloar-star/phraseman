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

  it('закрытие плеера возвращает режим звука приложения (озвучка и звуки не молчат) и снимает аренду звука и экран (PM-118-A2)', () => {
    // размонтирование: эффект с cleanup, который ставит режим приложения UI_SFX_AUDIO_MODE через координатор аудиосессии
    expect(player).toContain("import { getManagedAudioModeSnapshot, setManagedAudioMode } from '../../app/audio_session_coordinator';");
    // F20: возврат режима — при любом уходе активного плеера (inactive/смена ролика/размонтирование), а не только при размонтировании;
    // поведение проверяет tests/youtube_player_owner_lifecycle.test.tsx
    expect(player).toMatch(/useEffect\(\(\) => \{\s*if \(!active\) return undefined;\s*return \(\) => \{[\s\S]{0,900}console\.log\('\[VIDEO-PLAYER\] закрыт — возвращаю режим звука приложения'[\s\S]{0,400}\}, \[active, videoId\]\);/);
    expect(player).toContain('if (getManagedAudioModeSnapshot().recordingActive) {'); // запоздалый уход не обрывает запись
    expect(player).toContain('setManagedAudioMode(UI_SFX_AUDIO_MODE)');
    expect(player).toContain("console.warn('[VIDEO-PLAYER] режим звука не вернулся'"); // отказ не молчит
    expect(player).toContain("useEffect(() => () => releaseAudioClaim('unmount'), [releaseAudioClaim]);");
    expect(player).toContain('deactivateKeepAwake(`video:${videoId}`)');
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

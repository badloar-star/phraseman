import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { WebViewMessageEvent } from 'react-native-webview';
import WebView from 'react-native-webview';
import {
  buildLingmanEmbedHtml,
  LINGMAN_PLAYER_BRIDGE_SOURCE,
  LINGMAN_YOUTUBE_EMBED_BASE_URL,
} from '../../app/lingman_youtube';
import { getLingmanYoutubeChrome } from '../../app/lingman_youtube_chrome';
import { publishYoutubePosition, registerYoutubeSeekHandler, takePendingYoutubeSeek } from '../../app/youtube_player_seek_bus';
import { createYoutubeSeekController } from '../../app/youtube_seek_controller';
import { triLang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { useVideoWatchEnergyBoost } from '../../hooks/use_video_watch_energy_boost';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { FlowText } from '../text-integrity';

const LINGMAN_WEBVIEW_ORIGIN_WHITELIST = [
  'https://www.youtube.com',
  'https://youtube.com',
  'https://m.youtube.com',
  'https://app.phraseman',
  'https://accounts.google.com',
  'https://consent.google.com',
  'https://consent.youtube.com',
];

function shouldKeepLingmanPlayerNavigationInApp(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'about:') return false;
    if (host === '') return true;
    if (host === 'play.google.com') return false;
    return (
      host === 'youtube.com'
      || host === 'www.youtube.com'
      || host === 'm.youtube.com'
      || host === 'app.phraseman'
      || host === 'accounts.google.com'
      || host === 'consent.google.com'
      || host === 'consent.youtube.com'
      || host.endsWith('.youtube.com')
    );
  } catch {
    return url === 'about:blank';
  }
}

type YoutubeInlinePlayerProps = {
  videoId: string;
  title: string;
  active: boolean;
  onClose?: () => void;
  autoPlay?: boolean;
  presentation?: 'card' | 'preview';
  /** D131: открыть ролик сразу на этой секунде (момент фразы набора из видео). */
  startSec?: number;
};

/**
 * Единственный тяжёлый элемент видеоповерхности. Родитель монтирует только один
 * экземпляр, а active=false полностью удаляет WebView и освобождает декодер.
 */
export default function YoutubeInlinePlayer({
  videoId,
  title,
  active,
  onClose,
  autoPlay = true,
  presentation = 'card',
  startSec,
}: YoutubeInlinePlayerProps) {
  const { lang } = useLang();
  const { theme: t, isDark, themeMode } = useTheme();
  const [playerError, setPlayerError] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const webViewRef = useRef<WebView>(null);
  const chrome = getLingmanYoutubeChrome(t, isDark, themeMode);
  // зачем (PM-116): бейджи-обещания «энергия быстрее»/«руны за просмотр» убраны
  // из плеера — начисление (логика) остаётся не тронутым, это PM-115. Хук
  // по-прежнему нужен ради setPlaying/reportPlaybackSample — моста плеер→счётчик.
  const { setPlaying, reportPlaybackSample } = useVideoWatchEnergyBoost(videoId);

  // Родитель снимает active (ушли с экрана, свернули приложение, закрыли
  // карточку) — WebView размонтируется и сообщения от него больше не придут.
  // Гасим отсчёт сами, иначе последний отрезок остался бы «играющим».
  useEffect(() => {
    if (!active) setPlaying(false);
  }, [active, setPlaying]);
  // Смена ролика или перезапуск после ошибки — тоже пауза до нового плея.
  useEffect(() => {
    setPlaying(false);
  }, [playerKey, setPlaying, videoId]);
  // Размонтирование плеера закрывает отсчёт при любом пути ухода.
  useEffect(() => () => setPlaying(false), [setPlaying]);

  // зачем (владелец 2026-09-25): тап по фразе под плеером перематывает ролик.
  // Контроллер держит очередь до «плеер готов»; обработчик на шине живёт, пока
  // плеер смонтирован и активен (размонтирование снимает его — без утечки).
  const seekController = useMemo(() => createYoutubeSeekController(
    videoId,
    (seconds) => {
      const view = webViewRef.current;
      if (!view) {
        console.warn(`[VIDEO-SEEK] ${videoId} WebView ещё не смонтирован — ${seconds}s потеряна`);
        return;
      }
      view.injectJavaScript(`(function(){try{window.__lingmanSeek&&window.__lingmanSeek(${Number(seconds)});}catch(e){}})();true;`);
    },
    () => takePendingYoutubeSeek(videoId),
  ), [videoId]);
  useEffect(() => {
    if (!active) return undefined;
    console.log(`[VIDEO-SEEK] ${videoId} плеер зарегистрировал обработчик`);
    const unregister = registerYoutubeSeekHandler(videoId, seekController.requestSeek);
    return () => {
      unregister();
      console.log(`[VIDEO-SEEK] ${videoId} обработчик снят`);
    };
  }, [active, seekController, videoId]);
  // Новый WebView (повтор после ошибки) снова ждёт готовности.
  useEffect(() => {
    seekController.reset();
  }, [active, playerKey, seekController]);

  const copy = useMemo(() => ({
    close: triLang(lang, { ru: 'Закрыть видео', uk: 'Закрити відео', en: 'Close video', es: 'Cerrar vídeo', 'pt-BR': 'Fechar vídeo', vi: 'Đóng video', id: 'Tutup video', tr: 'Videoyu kapat', pl: 'Zamknij wideo' }),
    retry: triLang(lang, { ru: 'Повторить', uk: 'Повторити', en: 'Retry', es: 'Reintentar', 'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie' }),
    loadError: triLang(lang, {
      ru: 'Плеер временно не загрузился. Попробуйте ещё раз.',
      uk: 'Плеєр тимчасово не завантажився. Спробуйте ще раз.',
      en: 'The player did not load. Please try again.',
      es: 'El reproductor no se cargó. Inténtalo de nuevo.',
      'pt-BR': 'O player não carregou. Tente novamente.',
      vi: 'Trình phát chưa tải được. Vui lòng thử lại.',
      id: 'Pemutar gagal dimuat. Coba lagi.',
      tr: 'Oynatıcı yüklenemedi. Lütfen tekrar deneyin.',
      pl: 'Odtwarzacz się nie załadował. Spróbuj ponownie.',
    }),
  }), [lang]);

  const playerHtml = useMemo(
    () => buildLingmanEmbedHtml(videoId, { autoplay: autoPlay, startSec }),
    [autoPlay, startSec, videoId],
  );
  const retry = useCallback(() => {
    hapticTap();
    setPlayerError(false);
    setPlayerKey((value) => value + 1);
  }, []);
  const renderLoading = useCallback(() => (
    <View style={styles.playerLoading}>
      <ActivityIndicator color={chrome.accent} />
    </View>
  ), [chrome.accent]);
  const handleLoadStart = useCallback(() => setPlayerError(false), []);
  // зачем (владелец 2026-09-02): ускорение энергии обязано прекращаться при
  // любой поломке плеера — иначе «сломанное видео» продолжало бы копить время.
  const handlePlayerError = useCallback(() => {
    setPlayerError(true);
    setPlaying(false);
  }, [setPlaying]);

  // Мост из embed-HTML: единственный источник правды о том, играет ли видео.
  const handlePlayerMessage = useCallback((event: WebViewMessageEvent) => {
    const raw = event?.nativeEvent?.data;
    if (typeof raw !== 'string' || raw.length === 0) return;
    try {
      const parsed = JSON.parse(raw) as {
        source?: unknown;
        type?: unknown;
        playing?: unknown;
        positionMs?: unknown;
      };
      // Чужие сообщения (сам YouTube шлёт свои) молча игнорируем — но только их.
      if (parsed?.source !== LINGMAN_PLAYER_BRIDGE_SOURCE) return;
      if (parsed.type === 'ready') {
        seekController.markReady();
        return;
      }
      if (parsed.type !== 'playback') return;
      const positionMs = Number(parsed.positionMs);
      if (!Number.isFinite(positionMs) || positionMs < 0) {
        setPlaying(false);
        return;
      }
      // Позиция для подсветки текущей фразы: канал уже шлёт пробы раз в секунду
      // и только пока видео играет — отдельного опроса не заводим.
      publishYoutubePosition(videoId, positionMs / 1000);
      reportPlaybackSample({
        sourceId: videoId,
        playing: parsed.playing === true,
        positionMs,
      });
    } catch {
      // Не JSON — это не наш мост (YouTube шлёт и свои сообщения). Пишем
      // причину: без неё поломка моста однажды тихо остановит начисление.
      if (__DEV__) console.log(`[VIDEO-ENERGY] bridge: unparsable message=${raw.slice(0, 64)}`);
    }
  }, [reportPlaybackSample, seekController, setPlaying, videoId]);

  if (!active) return null;

  const playerSurface = (
    <View style={[styles.playerWrap, presentation === 'preview' ? styles.previewPlayerWrap : styles.cardPlayerWrap]}>
      {!playerError ? (
        <WebView
          ref={webViewRef}
          key={`${videoId}:${startSec ?? 0}:${playerKey}`}
          testID="lingman-player-webview"
          source={{ html: playerHtml, baseUrl: LINGMAN_YOUTUBE_EMBED_BASE_URL }}
          originWhitelist={LINGMAN_WEBVIEW_ORIGIN_WHITELIST}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={!autoPlay}
          setSupportMultipleWindows={false}
          startInLoadingState
          renderLoading={renderLoading}
          onLoadStart={handleLoadStart}
          onMessage={handlePlayerMessage}
          onError={handlePlayerError}
          onHttpError={handlePlayerError}
          onShouldStartLoadWithRequest={(request) => shouldKeepLingmanPlayerNavigationInApp(request.url)}
          style={styles.webview}
        />
      ) : (
        <View testID="lingman-player-error" style={styles.error}>
          <Ionicons name="alert-circle-outline" size={30} color={chrome.accent} />
          <Text style={[styles.errorText, { color: t.textMuted }]}>{copy.loadError}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={copy.retry}
            onPress={retry}
            style={[styles.retryButton, { borderColor: chrome.accent, backgroundColor: chrome.accentFaint }]}
          >
            <Text style={[styles.retryText, { color: chrome.accent }]}>{copy.retry}</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* зачем (PM-116): значки «энергия быстрее»/«руны за просмотр» убраны —
          владелец просил убрать тексты-обещания наград за просмотр видео.
          Начисление энергии/рун (use_video_watch_energy_boost) не тронуто. */}
      {presentation === 'preview' ? (
        <View pointerEvents="box-none" style={styles.previewActions}>
          {onClose ? (
            <TouchableOpacity
              testID="lingman-inline-player-close"
              accessibilityRole="button"
              accessibilityLabel={copy.close}
              onPress={onClose}
              style={styles.previewButton}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  if (presentation === 'preview') {
    return <View testID="lingman-inline-player" style={styles.previewShell}>{playerSurface}</View>;
  }

  return (
    <View testID="lingman-inline-player" style={[styles.shell, { backgroundColor: chrome.cardBg, borderColor: chrome.cardBorder }]}>
      <View style={styles.header}>
        <FlowText testID="lingman-inline-player-title" provenance="external" style={[styles.title, { color: t.textPrimary }]}>{title}</FlowText>
        {onClose ? (
          <TouchableOpacity
            testID="lingman-inline-player-close"
            accessibilityRole="button"
            accessibilityLabel={copy.close}
            onPress={onClose}
            style={[styles.roundButton, { backgroundColor: chrome.quietButtonBg }]}
          >
            <Ionicons name="close" size={22} color={t.textPrimary} />
          </TouchableOpacity>
        ) : null}
      </View>
      {playerSurface}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  previewShell: { flex: 1, width: '100%', backgroundColor: '#000000' },
  header: { minHeight: 56, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 19, fontWeight: '900' },
  roundButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  playerWrap: { width: '100%', backgroundColor: '#000000' },
  cardPlayerWrap: { aspectRatio: 16 / 9 },
  previewPlayerWrap: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#000000' },
  playerLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 },
  errorText: { fontSize: 13, lineHeight: 18, textAlign: 'center', fontWeight: '800' },
  retryButton: { minHeight: 44, borderRadius: 14, borderWidth: 1, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontSize: 13, fontWeight: '900' },
  previewActions: { position: 'absolute', top: 8, right: 8, zIndex: 2, flexDirection: 'row', gap: 8 },
  previewButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,8,18,0.82)' },
});

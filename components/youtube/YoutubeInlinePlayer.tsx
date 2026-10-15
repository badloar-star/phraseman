import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
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
import { forgetYoutubePosition, readYoutubeResumeSec, rememberYoutubePosition } from '../../app/youtube_resume_position';
import { triLang } from '../../constants/i18n';
import { setManagedAudioMode } from '../../app/audio_session_coordinator';
import { UI_SFX_AUDIO_MODE } from '../../app/audio_playback_mode';
import { claimVideoAudio, type SpokenAudioClaim } from '../../modules/audio/audio_runtime_arbiter';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { plateBoxShadow } from '../v2/ShadowSurface';
import { trainNavMark } from '../../app/train_nav_trace';
import { FlowText } from '../text-integrity';

const MEDIA_INK = '#FFFFFF'; // theme-exempt: белый значок/текст поверх видео — в любой теме

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
  const { theme: t, isDark, themeMode, liquidGlassThemeId } = useTheme();
  // зачем (Сверка video-011): вокруг плеера была толстая светлая рамка старой палитры; в стиле «Тень» (12.10) кромки нет вовсе — плашка с тенью.
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const [playerError, setPlayerError] = useState(false);
  // зачем ([NAV-PAINT-TRACE], 15.10): размонтирование плеера/WebView — отдельная отметка цепочки перехода с ролика
  useEffect(() => () => trainNavMark('player WebView unmount'), []);
  const [playerKey, setPlayerKey] = useState(0);
  const webViewRef = useRef<WebView>(null);
  const chrome = getLingmanYoutubeChrome(t, isDark, themeMode);
  // зачем (Q9, координатор 01.10; D07, PM-080-A3): видео не даёт ни монет, ни рун, ни
  // ускорения энергии. Отсчёт просмотра под награду (use_video_watch_energy_boost) снят
  // целиком; мост плеер→экран остаётся только ради подсветки фразы и перемотки.

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
  // зачем (Ядро 01.10): плеер YouTube перехватывает аудиосессию; после закрытия возвращаем
  // режим приложения (тот же, что ставит запуск), иначе озвучка фраз и звуки интерфейса молчат.
  useEffect(() => () => {
    console.log('[VIDEO-PLAYER] закрыт — возвращаю режим звука приложения', JSON.stringify({ videoId }));
    setManagedAudioMode(UI_SFX_AUDIO_MODE).catch((error: unknown) => {
      console.warn('[VIDEO-PLAYER] режим звука не вернулся', error instanceof Error ? error.message : String(error));
    });
  }, [videoId]);
  // зачем (PM-207): видео и озвучка не звучат одновременно. Пока ролик играет, он держит
  // аренду звука в арбитре; озвучка/микрофон вытесняют его — тогда stop() ставит паузу в
  // плеере. Аренда снимается при паузе, окончании и размонтировании (не залипает).
  const audioClaimRef = useRef<SpokenAudioClaim | null>(null);
  // зачем (§126 п.9, «видео не помнит позицию»): последняя секунда из моста — запоминается на паузе/закрытии.
  const lastPositionSecRef = useRef<number | null>(null);
  const releaseAudioClaim = useCallback((why: string) => {
    if (lastPositionSecRef.current !== null) rememberYoutubePosition(videoId, lastPositionSecRef.current, true);
    const claim = audioClaimRef.current;
    audioClaimRef.current = null;
    if (!claim) return;
    console.log('[VIDEO-PLAYER] аренда звука снята', JSON.stringify({ videoId, why }));
    claim.release();
    // зачем (§126 п.9): экран держим ровно пока видео играет — снимаем вместе с арендой звука.
    void Promise.resolve(deactivateKeepAwake(`video:${videoId}`)).catch((error: unknown) => {
      console.warn('[VIDEO-PLAYER] keep-awake: снять не удалось', String((error as Error)?.message ?? error).slice(0, 120));
    });
  }, [videoId]);
  useEffect(() => () => releaseAudioClaim('unmount'), [releaseAudioClaim]);
  // Новый WebView (повтор после ошибки) снова ждёт готовности.
  useEffect(() => {
    seekController.reset();
  }, [active, playerKey, seekController]);

  const copy = useMemo(() => ({
    close: triLang(lang, { ru: 'Закрыть видео', uk: 'Закрити відео', en: 'Close video', es: 'Cerrar vídeo', 'pt-BR': 'Fechar vídeo', vi: 'Đóng video', id: 'Tutup video', tr: 'Videoyu kapat', pl: 'Zamknij wideo' }),
  }), [lang]);

  const playerHtml = useMemo(
    () => buildLingmanEmbedHtml(videoId, { autoplay: autoPlay, startSec }),
    [autoPlay, startSec, videoId],
  );
  // зачем (владелец 01.10): текста об ошибке и кнопки «Повторить» нет. При сбое плеера
  // остаётся постер (превью ролика), а WebView перезапускается тихо: до 5 попыток по 20 с.
  const retryCountRef = useRef(0);
  useEffect(() => {
    if (!playerError || !active) return undefined;
    if (retryCountRef.current >= 5) {
      console.warn('[VIDEO-PLAYER] тихие повторы исчерпаны (5), остаётся постер', JSON.stringify({ videoId }));
      return undefined;
    }
    const timer = setTimeout(() => {
      retryCountRef.current += 1;
      console.warn('[VIDEO-PLAYER] тихий повтор плеера, попытка', retryCountRef.current, JSON.stringify({ videoId }));
      setPlayerError(false);
      setPlayerKey((value) => value + 1);
    }, 20000);
    return () => clearTimeout(timer);
  }, [playerError, active, videoId, playerKey]);
  const renderLoading = useCallback(() => (
    <View style={styles.playerLoading}>
      <ActivityIndicator color={t.accentGraphic ?? chrome.accent} />
    </View>
  ), [chrome.accent, t.accentGraphic]); // зачем (светлый акцент): спиннер — графика, deps включают токен
  const handleLoadStart = useCallback(() => setPlayerError(false), []);
  const handlePlayerError = useCallback(() => {
    console.warn('[VIDEO-PLAYER] player error', JSON.stringify({ videoId }));
    setPlayerError(true);
  }, [videoId]);

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
        // Явный момент (startSec, фраза из видео) главнее сохранённой позиции.
        if (startSec === undefined) {
          void readYoutubeResumeSec(videoId).then((resumeSec) => {
            console.log('[VIDEO-RESUME] плеер готов', JSON.stringify({ videoId, resumeSec }));
            if (resumeSec !== null) seekController.requestSeek(resumeSec);
          });
        }
        return;
      }
      if (parsed.type !== 'playback') return;
      // Арбитраж звука: playing=true — взять аренду (если её нет или её отняли);
      // playing=false — снять. Пробы раз в секунду идемпотентны.
      if (parsed.playing === true) {
        if (!audioClaimRef.current?.isCurrent()) {
          const pauseVideo = () => {
            console.log('[VIDEO-PLAYER] вытеснен другим звуком — пауза', JSON.stringify({ videoId }));
            webViewRef.current?.injectJavaScript('(function(){try{var p=window.__lingmanPlayer;if(p&&p.pauseVideo)p.pauseVideo();}catch(e){}})();true;');
          };
          audioClaimRef.current = claimVideoAudio(pauseVideo, `video:${videoId}`);
          // Идёт запись с микрофона — видео не имеет права звучать поверх неё.
          if (!audioClaimRef.current) pauseVideo();
          // зачем (§126 п.9, жалоба «видео гаснет через 5 минут»): удержания экрана не было нигде —
          // система гасила экран посреди ролика. Держим, пока у видео есть аренда звука.
          else void activateKeepAwakeAsync(`video:${videoId}`).catch((error: unknown) => {
            console.warn('[VIDEO-PLAYER] keep-awake: включить не удалось', String((error as Error)?.message ?? error).slice(0, 120));
          });
        }
      } else {
        releaseAudioClaim('paused_or_ended');
      }
      // YT state 0 = ended: ролик досмотрен — следующее открытие с начала.
      if ((parsed as { state?: unknown }).state === 0) {
        lastPositionSecRef.current = null;
        forgetYoutubePosition(videoId);
      }
      const positionMs = Number(parsed.positionMs);
      if (!Number.isFinite(positionMs) || positionMs < 0) {
        if (__DEV__) console.log(`[VIDEO-PLAYER] bridge: invalid position=${String(parsed.positionMs)}`);
        return;
      }
      if ((parsed as { state?: unknown }).state !== 0) {
        lastPositionSecRef.current = positionMs / 1000;
        rememberYoutubePosition(videoId, positionMs / 1000);
      }
      // Позиция для подсветки текущей фразы: канал уже шлёт пробы раз в секунду
      // и только пока видео играет — отдельного опроса не заводим.
      publishYoutubePosition(videoId, positionMs / 1000);
    } catch {
      // Не JSON — это не наш мост (YouTube шлёт и свои сообщения). Пишем причину:
      // без неё поломка моста однажды тихо остановит подсветку фраз.
      if (__DEV__) console.log(`[VIDEO-PLAYER] bridge: unparsable message=${raw.slice(0, 64)}`);
    }
  }, [seekController, videoId, releaseAudioClaim, startSec]);

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
        <View testID="lingman-player-poster" style={styles.error}>
          <Image
            source={{ uri: `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            accessible={false}
          />
        </View>
      )}
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
              <Ionicons name="close" size={22} color={MEDIA_INK} />
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
    <View testID="lingman-inline-player" style={[styles.shell, { backgroundColor: glass.plateFillFrom, boxShadow: plateBoxShadow(glass) }]}>
      <View style={styles.header}>
        <FlowText testID="lingman-inline-player-title" provenance="external" style={[styles.title, { color: glass.text }]}>{title}</FlowText>
        {onClose ? (
          <TouchableOpacity
            testID="lingman-inline-player-close"
            accessibilityRole="button"
            accessibilityLabel={copy.close}
            onPress={onClose}
            style={[styles.roundButton, { backgroundColor: glass.buttonFill }]}
          >
            <Ionicons name="close" size={22} color={glass.text} />
          </TouchableOpacity>
        ) : null}
      </View>
      {playerSurface}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { borderRadius: 20, overflow: 'hidden', marginBottom: 12 }, // overflow нужен: углы плеера; boxShadow рисуется вне контейнера клипа (Fabric)
  previewShell: { flex: 1, width: '100%', backgroundColor: '#000000' }, // theme-exempt: фон под видео/превью — чёрный в любой теме
  header: { minHeight: 56, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  roundButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  playerWrap: { width: '100%', backgroundColor: '#000000' }, // theme-exempt: фон под видео/превью — чёрный в любой теме
  cardPlayerWrap: { aspectRatio: 16 / 9 },
  previewPlayerWrap: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#000000' }, // theme-exempt: фон под видео/превью — чёрный в любой теме
  playerLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' }, // theme-exempt: фон под видео/превью — чёрный в любой теме
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 },
  previewActions: { position: 'absolute', top: 8, right: 8, zIndex: 2, flexDirection: 'row', gap: 8 },
  previewButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,8,18,0.82)' }, // theme-exempt: скрим/плашка поверх видео — тёмная в любой теме
});

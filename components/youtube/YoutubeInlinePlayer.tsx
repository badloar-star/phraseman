import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import WebView from 'react-native-webview';
import {
  buildLingmanEmbedHtml,
  LINGMAN_YOUTUBE_EMBED_BASE_URL,
} from '../../app/lingman_youtube';
import { getLingmanYoutubeChrome } from '../../app/lingman_youtube_chrome';
import { triLang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
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
}: YoutubeInlinePlayerProps) {
  const { lang } = useLang();
  const { theme: t, isDark, themeMode } = useTheme();
  const [playerError, setPlayerError] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const chrome = getLingmanYoutubeChrome(t, isDark, themeMode);

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
    () => buildLingmanEmbedHtml(videoId, { autoplay: autoPlay }),
    [autoPlay, videoId],
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
  const handlePlayerError = useCallback(() => setPlayerError(true), []);

  if (!active) return null;

  const playerSurface = (
    <View style={[styles.playerWrap, presentation === 'preview' ? styles.previewPlayerWrap : styles.cardPlayerWrap]}>
      {!playerError ? (
        <WebView
          key={`${videoId}:${playerKey}`}
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

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TapScale from '../components/TapScale';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import ScreenGradient from '../components/ScreenGradient';
import BounceView from '../components/BounceView';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';
import {
  buildLingmanEmbedHtml,
  getTrustedLingmanYoutubeUrl,
  LINGMAN_CHANNEL_URL,
  LINGMAN_YOUTUBE_EMBED_BASE_URL,
} from './lingman_youtube';
import { getLingmanYoutubeChrome } from './lingman_youtube_chrome';

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

export default function LingmanVideoPlayerScreen() {
  const router = useRouter();
  const { id, title, watchUrl } = useLocalSearchParams<{ id?: string; title?: string; watchUrl?: string }>();
  const { lang } = useLang();
  const { theme: t, f, isDark, themeMode } = useTheme();
  const [playerError, setPlayerError] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const chrome = getLingmanYoutubeChrome(t, isDark, themeMode);

  const copy = useMemo(() => ({
    missing: triLang(lang, {
      ru: 'Видео не найдено',
      uk: 'Відео не знайдено',
      es: 'Video not found',
      'pt-BR': 'Video not found',
      vi: 'Video not found',
      id: 'Video not found',
      tr: 'Video not found',
      pl: 'Video not found',
    }),
    openYoutube: triLang(lang, {
      ru: 'Открыть в YouTube',
      uk: 'Відкрити в YouTube',
      es: 'Open in YouTube',
      'pt-BR': 'Open in YouTube',
      vi: 'Open in YouTube',
      id: 'Open in YouTube',
      tr: 'Open in YouTube',
      pl: 'Open in YouTube',
    }),
    retry: triLang(lang, {
      ru: 'Повторить',
      uk: 'Повторити',
      es: 'Retry',
      'pt-BR': 'Retry',
      vi: 'Retry',
      id: 'Retry',
      tr: 'Retry',
      pl: 'Retry',
    }),
    loadError: triLang(lang, {
      ru: 'Плеер временно не загрузился. Можно повторить или открыть видео снаружи.',
      uk: 'Плеєр тимчасово не завантажився. Можна повторити або відкрити відео ззовні.',
      es: 'The player did not load. Retry or open the video externally.',
      'pt-BR': 'The player did not load. Retry or open the video externally.',
      vi: 'The player did not load. Retry or open the video externally.',
      id: 'The player did not load. Retry or open the video externally.',
      tr: 'The player did not load. Retry or open the video externally.',
      pl: 'The player did not load. Retry or open the video externally.',
    }),
  }), [lang]);

  const playerHtml = id ? buildLingmanEmbedHtml(id) : null;
  const externalUrl = getTrustedLingmanYoutubeUrl(watchUrl, id) ?? LINGMAN_CHANNEL_URL;

  const openExternal = () => {
    hapticTap();
    void Linking.openURL(externalUrl);
  };

  return (
    <ScreenGradient artBackdrop="home">
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <BounceView style={styles.container}>
        <View style={styles.header}>
          <TapScale
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => safeRouterBack(router, '/lingman_videos' as any)}
            style={[styles.roundButton, { backgroundColor: chrome.quietButtonBg, borderColor: chrome.quietButtonBorder }]}
          >
            <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
          </TapScale>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: Math.max(15, f.bodyLg) }]} numberOfLines={2}>
            {title || 'Professor Lingman'}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={copy.openYoutube}
            onPress={openExternal}
            style={[styles.roundButton, { backgroundColor: chrome.quietButtonBg, borderColor: chrome.quietButtonBorder }]}
          >
            <Ionicons name="open-outline" size={21} color={t.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.playerWrap, { borderColor: chrome.cardBorder }]}>
          {id && !playerError ? (
            <WebView
              key={playerKey}
              testID="lingman-player-webview"
              source={{ html: playerHtml ?? '', baseUrl: LINGMAN_YOUTUBE_EMBED_BASE_URL }}
              originWhitelist={LINGMAN_WEBVIEW_ORIGIN_WHITELIST}
              javaScriptEnabled
              domStorageEnabled
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction
              setSupportMultipleWindows={false}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.playerLoading}>
                  <ActivityIndicator color={chrome.accent} />
                </View>
              )}
              onLoadStart={() => setPlayerError(false)}
              onError={() => setPlayerError(true)}
              onHttpError={() => setPlayerError(true)}
              onShouldStartLoadWithRequest={(request) => shouldKeepLingmanPlayerNavigationInApp(request.url)}
              style={styles.webview}
            />
          ) : playerError ? (
            <View testID="lingman-player-error" style={styles.missing}>
              <Ionicons name="alert-circle-outline" size={32} color={chrome.accent} />
              <Text style={[styles.missingText, { color: t.textMuted }]}>{copy.loadError}</Text>
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => {
                  hapticTap();
                  setPlayerError(false);
                  setPlayerKey((value) => value + 1);
                }}
                style={[styles.retryButton, { borderColor: chrome.accent, backgroundColor: chrome.accentFaint }]}
              >
                <Text style={[styles.retryButtonText, { color: chrome.accent }]}>{copy.retry}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.missing}>
              <Ionicons name="alert-circle-outline" size={32} color={t.textMuted} />
              <Text style={[styles.missingText, { color: t.textMuted }]}>{copy.missing}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.84}
          onPress={openExternal}
          style={[styles.youtubeButton, { borderColor: chrome.accent, backgroundColor: chrome.accentFaint }]}
        >
          <Ionicons name="open-outline" size={19} color={chrome.accent} />
          <Text style={[styles.youtubeButtonText, { color: chrome.accent }]}>{copy.openYoutube}</Text>
        </TouchableOpacity>
        </BounceView>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: 'transparent',
  },
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontWeight: '900',
    lineHeight: 21,
  },
  playerWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 18,
    borderWidth: 0,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  playerLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  missingText: {
    fontSize: 14,
    fontWeight: '800',
  },
  youtubeButton: {
    minHeight: 48,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  youtubeButtonText: {
    fontSize: 15,
    fontWeight: '900',
  },
  retryButton: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 0,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
});

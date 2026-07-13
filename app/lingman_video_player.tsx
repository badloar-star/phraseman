import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import TapScale from '../components/TapScale';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import ScreenGradient from '../components/ScreenGradient';
import BounceView from '../components/BounceView';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';
import {
  buildLingmanEmbedHtml,
  getActiveYoutubeChannel,
  getValidLingmanYoutubeVideoId,
  getTrustedLingmanYoutubeUrl,
  LINGMAN_CHANNEL_URL,
  LINGMAN_YOUTUBE_EMBED_BASE_URL,
} from './lingman_youtube';
import { getLingmanYoutubeChrome } from './lingman_youtube_chrome';
import { getAnalyticsConsentState, subscribeAnalyticsConsent } from './analytics_consent';
import { emitYoutubeAnalyticsEvent } from './youtube_analytics_emitter';
import { peekLingmanVideoHandoff } from './lingman_video_title_handoff';
import { parseYoutubePlayerMessage } from './youtube_analytics_contract';
import { createYoutubePlaybackAnalyticsController } from './youtube_playback_analytics_controller';
import { handleYoutubePlayerRuntimeMessage } from './youtube_player_runtime_message';
import { runNonBlockingYoutubeAction } from './youtube_player_actions';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { getProductAnalyticsSessionId } from './product_analytics_session_context';

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

function analyticsActiveScript(active: boolean): string {
  return `window.__phrasemanSetAnalyticsActive && window.__phrasemanSetAnalyticsActive(${active});true;`;
}

interface PinnedPlayerContext {
  videoId: string | null;
  channelId: string;
  title: string | null;
  channelUrl: string;
}

function readPinnedPlayerContext(rawVideoId: string | undefined): PinnedPlayerContext {
  const videoId = getValidLingmanYoutubeVideoId(rawVideoId);
  const handoff = peekLingmanVideoHandoff(videoId);
  const channelId = handoff ? handoff.channelId : getActiveYoutubeChannel().channelId;
  const channelUrl = getTrustedLingmanYoutubeUrl(
    `https://www.youtube.com/channel/${encodeURIComponent(channelId)}`,
  ) ?? LINGMAN_CHANNEL_URL;
  return Object.freeze({ videoId, channelId, title: handoff?.title ?? null, channelUrl });
}

export default function LingmanVideoPlayerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isScreenFocused = useIsScreenFocused();
  const [playerContext] = useState(() => readPinnedPlayerContext(id));
  const { videoId: validVideoId, channelId, title: displayTitle, channelUrl } = playerContext;
  const { lang } = useLang();
  const { theme: t, f, isDark, themeMode } = useTheme();
  const [playerError, setPlayerError] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const [appState, setAppState] = useState(AppState.currentState);
  const [consentGranted, setConsentGranted] = useState(() => getAnalyticsConsentState() === 'granted');
  const consentGrantedRef = useRef(consentGranted);
  const webViewRef = useRef<WebView>(null);
  const lastPositionMs = useRef(0);
  const lastDurationMs = useRef(0);
  const initialActive = isScreenFocused && appState === 'active';
  const visibilityActiveRef = useRef(initialActive);
  const [runtime] = useState(() => {
    const controller = createYoutubePlaybackAnalyticsController({
      videoId: validVideoId ?? '', channelId, initiallyActive: initialActive,
      now: Date.now, createId: Crypto.randomUUID, readSessionId: getProductAnalyticsSessionId,
      emit: (event, sessionId) => emitYoutubeAnalyticsEvent(event, { sessionId }),
    });
    controller.setConsent(consentGranted);
    return controller;
  });
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
    openChannel: triLang(lang, {
      ru: 'Открыть канал',
      uk: 'Відкрити канал',
      es: 'Open channel',
      'pt-BR': 'Open channel',
      vi: 'Open channel',
      id: 'Open channel',
      tr: 'Open channel',
      pl: 'Open channel',
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

  const playerHtml = validVideoId ? buildLingmanEmbedHtml(validVideoId) : null;
  const externalUrl = getTrustedLingmanYoutubeUrl(undefined, validVideoId) ?? channelUrl;

  const injectAnalyticsActive = useCallback((active: boolean) => {
    try { webViewRef.current?.injectJavaScript(analyticsActiveScript(active)); } catch { /* page may not be ready */ }
  }, []);

  useEffect(() => subscribeAnalyticsConsent((state) => {
    const granted = state === 'granted';
    consentGrantedRef.current = granted;
    if (granted) runtime.setConsent(true);
    else runtime.revokeConsent();
    setConsentGranted(granted);
    injectAnalyticsActive(granted && isScreenFocused && AppState.currentState === 'active');
  }), [injectAnalyticsActive, isScreenFocused, runtime]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', setAppState);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const active = consentGranted && isScreenFocused && appState === 'active';
    if (active !== visibilityActiveRef.current) {
      runtime.setVisible(active, { positionMs: lastPositionMs.current, durationMs: lastDurationMs.current });
      visibilityActiveRef.current = active;
    }
    injectAnalyticsActive(active);
  }, [appState, consentGranted, injectAnalyticsActive, isScreenFocused, runtime]);

  useEffect(() => () => {
    if (consentGrantedRef.current) runtime.finish('exit', { positionMs: lastPositionMs.current, durationMs: lastDurationMs.current });
    injectAnalyticsActive(false);
  }, [injectAnalyticsActive, runtime]);

  const handlePlayerMessage = useCallback((event: WebViewMessageEvent) => {
    const message = parseYoutubePlayerMessage(event.nativeEvent.data);
    if (!message) return;
    if (message.type === 'ready') {
      if (validVideoId) runtime.emitPlayerEvent({ eventName: 'youtube_player_ready', source: 'player', channelId, videoId: validVideoId });
      return;
    }
    if (message.type === 'error') {
      handleYoutubePlayerRuntimeMessage(runtime, message);
      return;
    }
    lastPositionMs.current = message.positionMs;
    lastDurationMs.current = message.durationMs;
    handleYoutubePlayerRuntimeMessage(runtime, message);
  }, [channelId, runtime, validVideoId]);

  const openExternal = () => {
    hapticTap();
    runtime.finish('external', { positionMs: lastPositionMs.current, durationMs: lastDurationMs.current });
    runNonBlockingYoutubeAction(
      () => validVideoId && runtime.emitPlayerEvent({ eventName: 'youtube_external_video_open', source: 'player', channelId, videoId: validVideoId }),
      () => Linking.openURL(externalUrl),
    );
  };

  const openChannel = () => {
    hapticTap();
    runNonBlockingYoutubeAction(
      () => validVideoId && runtime.emitPlayerEvent({ eventName: 'youtube_channel_open', source: 'player', channelId, videoId: validVideoId }),
      () => Linking.openURL(channelUrl),
    );
  };

  return (
    <ScreenGradient artBackdrop="home">
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <BounceView style={styles.container}>
        <View style={styles.header}>
          <TapScale
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => {
              runtime.finish('exit', { positionMs: lastPositionMs.current, durationMs: lastDurationMs.current });
              safeRouterBack(router, '/lingman_videos' as any);
            }}
            style={[styles.roundButton, { backgroundColor: chrome.quietButtonBg, borderColor: chrome.quietButtonBorder }]}
          >
            <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
          </TapScale>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: Math.max(15, f.bodyLg) }]} numberOfLines={2}>
            {displayTitle || 'Professor Lingman'}
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
          {validVideoId && !playerError ? (
            <WebView
              ref={webViewRef}
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
              injectedJavaScriptBeforeContentLoaded={analyticsActiveScript(consentGranted && isScreenFocused && appState === 'active')}
              renderLoading={() => (
                <View style={styles.playerLoading}>
                  <ActivityIndicator color={chrome.accent} />
                </View>
              )}
              onLoadStart={() => setPlayerError(false)}
              onLoad={() => injectAnalyticsActive(consentGranted && isScreenFocused && AppState.currentState === 'active')}
              onMessage={handlePlayerMessage}
              onError={() => { runtime.finish('error'); setPlayerError(true); }}
              onHttpError={() => { runtime.finish('error'); setPlayerError(true); }}
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
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={copy.openChannel}
          activeOpacity={0.84}
          onPress={openChannel}
          style={[styles.youtubeButton, styles.channelButton, { borderColor: chrome.quietButtonBorder, backgroundColor: chrome.quietButtonBg }]}
        >
          <Ionicons name="people-outline" size={19} color={t.textPrimary} />
          <Text style={[styles.youtubeButtonText, { color: t.textPrimary }]}>{copy.openChannel}</Text>
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
  channelButton: {
    marginTop: 10,
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

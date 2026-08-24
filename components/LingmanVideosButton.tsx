import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
import { getActiveYoutubeChannel, getLingmanYoutubeSnapshot, markLingmanYoutubeCatalogSeen } from '../app/lingman_youtube';
import { getLingmanYoutubeChrome } from '../app/lingman_youtube_chrome';
import { isVideoButtonEnabled } from '../app/remote_flags';
import { onAppEvent } from '../app/events';
import { HOME_NOTIFICATION_BADGE_COLOR, HOME_NOTIFICATION_BADGE_TEXT_COLOR } from './homeNotificationBadge';

function readVideoButtonVisibility() {
  return { enabled: isVideoButtonEnabled() };
}

type LingmanVideosButtonProps = {
  ownerActive?: boolean;
};

function LingmanVideosButton({ ownerActive = true }: LingmanVideosButtonProps) {
  const router = useRouter();
  const { lang } = useLang();
  const { theme: t, themeMode, isDark } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  // Видимость кнопки управляется из «Пульта» (video_button_enabled). Дефолт true.
  // Реагируем на применённое обновление remote_config (кэш/polling → событие) и на фокус.
  const initialVisibility = readVideoButtonVisibility();
  const [enabled, setEnabled] = useState(initialVisibility.enabled);
  const badgePulse = useRef(new Animated.Value(1)).current;
  const latestVideoIdRef = useRef<string | null>(null);
  const chrome = getLingmanYoutubeChrome(t, isDark, themeMode);

  const channelName = getActiveYoutubeChannel().displayName;
  const label = triLang(lang, {
    ru: `Видео ${channelName}`,
    uk: `Відео ${channelName}`,
    es: `${channelName} videos`,
    'pt-BR': `${channelName} videos`,
    vi: `${channelName} videos`,
    id: `${channelName} videos`,
    tr: `${channelName} videos`,
    pl: `${channelName} videos`,
  });

  useEffect(() => {
    if (!ownerActive) return;
    const sync = () => {
      const next = readVideoButtonVisibility();
      setEnabled(next.enabled);
    };
    sync();
    const sub = onAppEvent('remote_config_changed', sync);
    return () => sub.remove();
  }, [ownerActive]);

  const refresh = useCallback(() => {
    if (!isVideoButtonEnabled()) return () => {};
    let alive = true;
    void getLingmanYoutubeSnapshot().then((snapshot) => {
      if (alive) {
        latestVideoIdRef.current = snapshot.latestVideoId ?? snapshot.videos[0]?.id ?? null;
        setUnreadCount(snapshot.unreadCount);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!ownerActive || !enabled) return;
    return refresh();
  }, [enabled, ownerActive, refresh]);

  // Свежий пин/новый канал из «Пульта» (remote_config) → пересчитать бейдж
  // «новых», даже если экран уже открыт (не только по фокусу).
  useEffect(() => {
    if (!ownerActive) return;
    let cleanup: undefined | (() => void);
    const sub = onAppEvent('remote_config_changed', () => {
      if (!isVideoButtonEnabled()) return;
      cleanup?.();
      cleanup = refresh();
    });
    return () => {
      cleanup?.();
      sub.remove();
    };
  }, [ownerActive, refresh]);

  useEffect(() => {
    if (!ownerActive) return;
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, [ownerActive]);

  useEffect(() => {
    // Пульс бейджа крутится только на видимом экране И на переднем плане (плюс
    // сохранённый reduce-motion гард): freezeOnBlur:false держит ушедшие экраны
    // живыми — без гарда луп грел бы телефон в фоне.
    if (!enabled || unreadCount <= 0 || reduceMotion || !ownerActive) {
      badgePulse.setValue(1);
      return;
    }

    let loop: Animated.CompositeAnimation | null = null;
    const start = () => {
      if (loop) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(badgePulse, { toValue: 1.08, duration: 650, useNativeDriver: true }),
          Animated.timing(badgePulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        ]),
      );
      loop.start();
    };
    const stop = () => {
      loop?.stop();
      loop = null;
      badgePulse.setValue(1);
    };

    start();
    return () => {
      stop();
    };
  }, [badgePulse, enabled, ownerActive, reduceMotion, unreadCount]);

  // Кнопка выключена из «Пульта» — не рендерим вход на экран видео (сам экран
  // /lingman_videos остаётся доступным по прямой ссылке). Все хуки выше вызваны
  // безусловно, поэтому ранний return здесь не нарушает правила хуков.
  if (!enabled) return null;

  return (
    <TouchableOpacity
      testID="home-lingman-youtube-button"
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        hapticTap();
        setUnreadCount(0);
        void markLingmanYoutubeCatalogSeen(latestVideoIdRef.current);
        router.push('/lingman_videos' as any);
      }}
      style={styles.button}
    >
      <View style={[styles.image, styles.iconWrap]}>
        <Ionicons name="play-circle-outline" size={32} color={chrome.accent} />
      </View>
      {unreadCount > 0 && (
        <Animated.View style={[styles.badge, { backgroundColor: HOME_NOTIFICATION_BADGE_COLOR, borderColor: t.bgCard, transform: [{ scale: badgePulse }] }]}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
        </Animated.View>
      )}
      {unreadCount > 0 && <View style={[styles.glow, { backgroundColor: HOME_NOTIFICATION_BADGE_COLOR }]} pointerEvents="none" />}
    </TouchableOpacity>
  );
}

export default memo(LingmanVideosButton);

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  image: {
    width: 44,
    height: 38,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 1,
    right: 1,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    zIndex: 3,
  },
  badgeText: {
    color: HOME_NOTIFICATION_BADGE_TEXT_COLOR,
    fontSize: 10,
    fontWeight: '900',
  },
  glow: {
    position: 'absolute',
    top: 3,
    right: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.58,
  },
});

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
import { getActiveYoutubeChannel, getLingmanYoutubeSnapshot } from '../app/lingman_youtube';
import { getLingmanYoutubeChrome } from '../app/lingman_youtube_chrome';
import { isVideoButtonEnabled } from '../app/remote_flags';
import { onAppEvent } from '../app/events';

function LingmanVideosButton() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { lang } = useLang();
  const { theme: t, themeMode, isDark } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  // Видимость кнопки управляется из «Пульта» (video_button_enabled). Дефолт true.
  // Реагируем на смену remote_config живьём (onSnapshot → событие) и на фокус.
  const [enabled, setEnabled] = useState(() => isVideoButtonEnabled());
  const badgePulse = useRef(new Animated.Value(1)).current;
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
    const sync = () => setEnabled(isVideoButtonEnabled());
    sync();
    const sub = onAppEvent('remote_config_changed', sync);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (isFocused) setEnabled(isVideoButtonEnabled());
  }, [isFocused]);

  const refresh = useCallback(() => {
    let alive = true;
    void getLingmanYoutubeSnapshot().then((snapshot) => {
      if (alive) setUnreadCount(snapshot.unreadCount);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    return refresh();
  }, [isFocused, refresh]);

  // Свежий пин/новый канал из «Пульта» (remote_config) → пересчитать бейдж
  // «новых», даже если экран уже открыт (не только по фокусу).
  useEffect(() => {
    const sub = onAppEvent('remote_config_changed', () => { refresh(); });
    return () => sub.remove();
  }, [refresh]);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (unreadCount <= 0 || reduceMotion) {
      badgePulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(badgePulse, { toValue: 1.08, duration: 650, useNativeDriver: true }),
        Animated.timing(badgePulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [badgePulse, reduceMotion, unreadCount]);

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
        router.push('/lingman_videos' as any);
      }}
      style={styles.button}
    >
      <View style={[styles.image, styles.iconWrap]}>
        <Ionicons name="play-circle-outline" size={32} color={chrome.accent} />
      </View>
      {unreadCount > 0 && (
        <Animated.View style={[styles.badge, { backgroundColor: chrome.accent, borderColor: t.bgCard, transform: [{ scale: badgePulse }] }]}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
        </Animated.View>
      )}
      {unreadCount > 0 && <View style={[styles.glow, { backgroundColor: chrome.accent }]} pointerEvents="none" />}
    </TouchableOpacity>
  );
}

export default memo(LingmanVideosButton);

const styles = StyleSheet.create({
  button: {
    width: 66,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  image: {
    width: 56,
    height: 40,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 3,
  },
  badgeText: {
    color: '#FFFFFF',
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

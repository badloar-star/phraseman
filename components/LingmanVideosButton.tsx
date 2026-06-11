import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
import { getLingmanYoutubeSnapshot } from '../app/lingman_youtube';
import { getLingmanYoutubeChrome } from '../app/lingman_youtube_chrome';
import type { ThemeMode } from '../constants/theme';

const YOUTUBE_ICON_IMAGES: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/header_glyphs/theme-accent-buttons/play-button-dark-dalle-v1.webp'),
  neon: require('../assets/images/header_glyphs/theme-accent-buttons/play-button-neon-dalle-v1.webp'),
  gold: require('../assets/images/header_glyphs/theme-accent-buttons/play-button-gold-dalle-v1.webp'),
  coral: require('../assets/images/header_glyphs/theme-accent-buttons/play-button-coral-dalle-v1.webp'),
  minimalLight: require('../assets/images/header_glyphs/theme-accent-buttons/play-button-minimalLight-dalle-v1.webp'),
  minimalDark: require('../assets/images/header_glyphs/theme-accent-buttons/play-button-minimalDark-dalle-v1.webp'),
  compass: require('../assets/images/header_glyphs/theme-accent-buttons/play-button-compass-dalle-v1.webp'),
  midnight: require('../assets/images/header_glyphs/theme-accent-buttons/play-button-compass-dalle-v1.webp'),
  ember: require('../assets/images/header_glyphs/theme-accent-buttons/play-button-compass-dalle-v1.webp'),
  aurora: require('../assets/images/header_glyphs/theme-accent-buttons/play-button-compass-dalle-v1.webp'),
  volt: require('../assets/images/header_glyphs/theme-accent-buttons/play-button-compass-dalle-v1.webp'),
};

function LingmanVideosButton() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { lang } = useLang();
  const { theme: t, themeMode, isDark } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const badgePulse = useRef(new Animated.Value(1)).current;
  const chrome = getLingmanYoutubeChrome(t, isDark, themeMode);

  const label = triLang(lang, {
    ru: 'Видео Professor Lingman',
    uk: 'Видео Professor Lingman',
    es: 'Professor Lingman videos',
    'pt-BR': 'Professor Lingman videos',
    vi: 'Professor Lingman videos',
    id: 'Professor Lingman videos',
    tr: 'Professor Lingman videos',
    pl: 'Professor Lingman videos',
  });

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
      <Image source={YOUTUBE_ICON_IMAGES[themeMode] ?? YOUTUBE_ICON_IMAGES.minimalDark} style={styles.image} contentFit="contain" />
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

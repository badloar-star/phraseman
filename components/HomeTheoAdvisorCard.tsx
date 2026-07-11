import React, { memo, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import type { HomeTheoAction, HomeTheoAdvice } from '../app/home_theo_advisor';
import { homeTheoText } from '../app/home_theo_advisor';
import { compassIconSource } from '../constants/weeklyCompassIcons';

type Props = {
  advice: HomeTheoAdvice;
  onAction: (action: HomeTheoAction) => void;
  embedded?: boolean;
  label?: string;
};

const TYPE_MS = 18;
const TYPE_FRAME_MS = 33;
const MAX_TYPE_MS = 1650;
const COMPASS_ICON_SIZE = 64;
const COMPASS_EMBEDDED_ICON_SIZE = 58;

function HomeTheoAdvisorCard({ advice, onAction, embedded = false, label }: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const text = homeTheoText(advice, lang);
  const [isExpanded, setIsExpanded] = useState(embedded);
  const [typedText, setTypedText] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const isGoldTheme = themeMode === 'gold';

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!cancelled) setReduceMotion(Boolean(enabled));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    pulse.setValue(0);
    Animated.timing(pulse, {
      toValue: 1,
      duration: reduceMotion ? 1 : 260,
      useNativeDriver: true,
    }).start();
  }, [advice.id, pulse, reduceMotion]);

  useEffect(() => {
    setIsExpanded(embedded);
  }, [advice.id, embedded]);

  // Главная смонтирована постоянно (freeze не глушит уже запущенные лупы):
  // без focus/AppState-гарда «плавание» карточки крутилось всегда — вклад в
  // нагрев. Тот же паттерн, что у пульса карточек квизов (quizzes.tsx).
  const focused = useIsScreenFocused();

  useEffect(() => {
    if (reduceMotion || !focused) {
      float.stopAnimation();
      float.setValue(0);
      return;
    }
    let loop: Animated.CompositeAnimation | null = null;
    const start = () => {
      if (loop) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(float, { toValue: 1, duration: 1650, useNativeDriver: true }),
          Animated.timing(float, { toValue: 0, duration: 1650, useNativeDriver: true }),
        ]),
      );
      loop.start();
    };
    const stop = () => {
      loop?.stop();
      loop = null;
      float.setValue(0);
    };
    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      stop();
    };
  }, [float, reduceMotion, focused]);

  useEffect(() => {
    if (!isExpanded) {
      setTypedText('');
      return;
    }
    if (reduceMotion) {
      setTypedText(text);
      return;
    }
    setTypedText('');
    const targetDurationMs = Math.max(TYPE_FRAME_MS, Math.min(MAX_TYPE_MS, text.length * TYPE_MS));
    const totalFrames = Math.max(1, Math.ceil(targetDurationMs / TYPE_FRAME_MS));
    const charsPerFrame = Math.max(1, Math.ceil(text.length / totalFrames));
    let index = 0;
    const timer = setInterval(() => {
      index = Math.min(text.length, index + charsPerFrame);
      setTypedText(text.slice(0, index));
      if (index >= text.length) clearInterval(timer);
    }, TYPE_FRAME_MS);
    return () => clearInterval(timer);
  }, [isExpanded, text, reduceMotion]);

  const isActionable = advice.action !== 'none';
  const accent = isGoldTheme ? '#F2C48D' : t.accent;
  const borderColor = isGoldTheme ? 'rgba(246,227,161,0.34)' : 'rgba(125,174,255,0.26)';
  const bgA = isGoldTheme ? 'rgba(23,20,13,0.78)' : 'rgba(255,255,255,0.055)';
  const bgB = isGoldTheme ? 'rgba(8,8,7,0.66)' : 'rgba(30,38,52,0.50)';
  const cursorVisible = typedText.length < text.length;
  const compassTranslateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  const compassRotate = float.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] });
  const shadowScale = float.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] });
  const shadowOpacity = float.interpolate({ inputRange: [0, 1], outputRange: [0.34, 0.2] });
  const glowScale = float.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });
  const glowOpacity = float.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.48] });
  const title = label ?? '\u041a\u043e\u043c\u043f\u0430\u0441';
  const compassSource = compassIconSource(themeMode);

  return (
    <Animated.View
      style={[
        styles.wrap,
        embedded ? styles.wrapEmbedded : null,
        {
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }),
          transform: [
            {
              translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }),
            },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isExpanded ? `${title}: ${text}` : `${title}. \u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0441\u043e\u0432\u0435\u0442`}
        accessibilityState={{ expanded: isExpanded }}
        onPress={(event) => {
          event.stopPropagation?.();
          setIsExpanded(true);
        }}
        style={({ pressed }) => [
          styles.pressable,
          embedded ? styles.pressableEmbedded : null,
          {
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.compassShadow,
            embedded ? styles.compassShadowEmbedded : null,
            {
              opacity: shadowOpacity,
              transform: [{ scaleX: shadowScale }],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.compassGlow,
            embedded ? styles.compassGlowEmbedded : null,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.compassLayer,
            embedded ? styles.compassLayerEmbedded : null,
            {
              transform: [{ translateY: compassTranslateY }, { rotate: compassRotate }],
            },
          ]}
        >
          <Image source={compassSource} style={[styles.compass, embedded ? styles.compassEmbedded : null]} contentFit="contain" transition={140} accessible={false} />
        </Animated.View>
        <LinearGradient
          colors={[bgA, bgB]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, embedded ? styles.cardEmbedded : null, { borderColor }]}
        >
          <View style={styles.copyCol}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: accent, fontSize: Math.max(11, f.label) }]} numberOfLines={1}>
                {title}
              </Text>
              <View style={[styles.signal, { borderColor: isGoldTheme ? 'rgba(242,196,141,0.22)' : 'rgba(57,231,220,0.22)' }]}>
                <View style={[styles.liveDot, { backgroundColor: accent }]} />
                <View style={[styles.liveDot, { backgroundColor: accent, opacity: 0.66 }]} />
                <View style={[styles.liveDot, { backgroundColor: accent, opacity: 0.42 }]} />
              </View>
            </View>
            {isExpanded ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[
                  styles.copy,
                  {
                    color: t.textPrimary,
                    fontSize: Math.max(13, f.caption),
                    lineHeight: Math.round(Math.max(13, f.caption) * 1.34),
                  },
                ]}
                maxFontSizeMultiplier={1.12}
              >
                {typedText}
                {cursorVisible ? <Text style={{ color: accent }}> |</Text> : null}
              </Text>
            ) : null}
          </View>

          {isActionable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isExpanded ? `${title}: \u043f\u0435\u0440\u0435\u0439\u0442\u0438 \u043a \u0441\u043e\u0432\u0435\u0442\u0443` : `${title}: \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u0441\u043e\u0432\u0435\u0442`}
              onPress={(event) => {
                event.stopPropagation();
                if (isExpanded) {
                  onAction(advice.action);
                } else {
                  setIsExpanded(true);
                }
              }}
              hitSlop={8}
              style={({ pressed }) => [
                styles.chevron,
                {
                  borderColor,
                  backgroundColor: isGoldTheme ? 'rgba(242,196,141,0.08)' : 'rgba(255,255,255,0.08)',
                  opacity: pressed ? 0.82 : 1,
                  transform: [{ rotate: isExpanded ? '0deg' : '90deg' }],
                },
              ]}
            >
              <Ionicons name="chevron-forward" size={16} color={accent} />
            </Pressable>
          ) : null}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 8,
    marginTop: -2,
    marginBottom: 12,
    minHeight: 74,
  },
  wrapEmbedded: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    minHeight: 72,
  },
  pressable: {
    borderRadius: 18,
    minHeight: 74,
  },
  pressableEmbedded: {
    borderRadius: 16,
    minHeight: 72,
  },
  card: {
    minHeight: 74,
    borderRadius: 18,
    borderWidth: 0,
    paddingVertical: 9,
    paddingLeft: 82,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  cardEmbedded: {
    minHeight: 72,
    borderRadius: 16,
    paddingVertical: 8,
    paddingLeft: 72,
    paddingRight: 9,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  compassLayer: {
    position: 'absolute',
    left: 8,
    top: 5,
    width: COMPASS_ICON_SIZE,
    height: COMPASS_ICON_SIZE,
    zIndex: 3,
  },
  compassLayerEmbedded: {
    left: 6,
    top: 7,
    width: COMPASS_EMBEDDED_ICON_SIZE,
    height: COMPASS_EMBEDDED_ICON_SIZE,
  },
  compass: {
    width: COMPASS_ICON_SIZE,
    height: COMPASS_ICON_SIZE,
  },
  compassEmbedded: {
    width: COMPASS_EMBEDDED_ICON_SIZE,
    height: COMPASS_EMBEDDED_ICON_SIZE,
  },
  compassGlow: {
    position: 'absolute',
    left: 19,
    top: 16,
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#39E7DC',
    zIndex: 1,
  },
  compassGlowEmbedded: {
    left: 16,
    top: 17,
    width: 38,
    height: 38,
  },
  compassShadow: {
    position: 'absolute',
    left: 16,
    top: 60,
    width: 48,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#000',
    zIndex: 2,
  },
  compassShadowEmbedded: {
    left: 13,
    top: 58,
    width: 42,
    height: 8,
  },
  copyCol: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  name: {
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 14,
  },
  signal: {
    minHeight: 18,
    borderRadius: 999,
    borderWidth: 0,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(6,18,26,0.34)',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    opacity: 0.86,
  },
  copy: {
    fontWeight: '700',
    letterSpacing: 0,
    paddingRight: 2,
  },
  chevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});

export default memo(HomeTheoAdvisorCard);

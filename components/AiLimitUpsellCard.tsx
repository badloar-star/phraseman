import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MOTION_DURATION } from '../constants/motion';
import { triLang, type Lang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { hapticTap } from '../hooks/use-haptics';
import { useTheme } from './ThemeContext';
import TonalSurface from './TonalSurface';

type AiLimitUpsellCardProps = {
  lang: Lang;
  title: string;
  paywallContext: string;
  /** зачем (2026-09-13): без source вызов падал в legacy-дефолт 'direct'. */
  paywallSource: string;
  testID: string;
};

export default function AiLimitUpsellCard({
  lang,
  title,
  paywallContext,
  paywallSource,
  testID,
}: AiLimitUpsellCardProps) {
  const { theme: t, f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const router = useRouter();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(Boolean(enabled));
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(reduceMotion ? 0 : 14);
    translateX.setValue(0);
    scale.setValue(reduceMotion ? 1 : 0.94);

    const anim = reduceMotion
      ? Animated.timing(opacity, {
        toValue: 1,
        duration: MOTION_DURATION.fast,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
      : Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: MOTION_DURATION.normal,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -4,
            duration: MOTION_DURATION.normal,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1.04,
            tension: 220,
            friction: 9,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: 110,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            tension: 260,
            friction: 11,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(translateX, { toValue: -8, duration: 46, useNativeDriver: true }),
          Animated.timing(translateX, { toValue: 7, duration: 58, useNativeDriver: true }),
          Animated.timing(translateX, { toValue: -4, duration: 50, useNativeDriver: true }),
          Animated.timing(translateX, { toValue: 2, duration: 42, useNativeDriver: true }),
          Animated.timing(translateX, { toValue: 0, duration: 34, useNativeDriver: true }),
        ]),
      ]);

    anim.start();
    return () => anim.stop();
  }, [opacity, reduceMotion, scale, translateX, translateY]);

  const ctaLabel = triLang(lang, {
    ru: 'Посмотреть Plus',
    uk: 'Переглянути Plus',
    en: 'Explore Plus',
    es: 'Ver Plus',
    'pt-BR': 'Conhecer o Plus',
    vi: 'Xem Plus',
    id: 'Lihat Plus',
    tr: 'Plus’a göz at',
    pl: 'Zobacz Plus',
  });

  return (
    <Animated.View
      testID={testID}
      style={[
        styles.animatedShell,
        {
          opacity,
          shadowColor: glass.bg,
          transform: [{ translateY }, { translateX }, { scale }],
        },
      ]}
    >
      <TonalSurface radius={16} tone="raised" style={[styles.card, { borderColor: glass.glassEdge }]}>
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: glass.selected }]}>
            <Ionicons name="flash" size={18} color={glass.cta} />
          </View>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.bodyLg || f.body }]}>
            {title}
          </Text>
        </View>

        <Pressable
          testID={`${testID}-full-access-button`}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          onPress={() => {
            hapticTap();
            router.push({ pathname: '/premium_modal', params: { context: paywallContext, source: paywallSource } } as never);
          }}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: glass.accent },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.ctaLabel, { color: glass.accentInk, fontSize: f.label }]}>
            {ctaLabel}
          </Text>
          <Ionicons name="arrow-forward" size={17} color={glass.ctaInk} />
        </Pressable>
      </TonalSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedShell: {
    elevation: 3,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    overflow: 'hidden',
    padding: 16,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingTop: 2,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 11,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  title: {
    flex: 1,
    fontWeight: '800',
    lineHeight: 23,
  },
  cta: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ctaLabel: {
    flexShrink: 1,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
});

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
import { hapticTap } from '../hooks/use-haptics';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';
import TonalSurface from './TonalSurface';

type AiLimitUpsellCardProps = {
  lang: Lang;
  title: string;
  paywallContext: string;
  testID: string;
};

export default function AiLimitUpsellCard({
  lang,
  title,
  paywallContext,
  testID,
}: AiLimitUpsellCardProps) {
  const { theme: t, f } = useTheme();
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
    ru: 'Получить фулл доступ',
    uk: 'Отримати повний доступ',
    es: 'Obtener acceso completo',
    'pt-BR': 'Obter acesso completo',
    vi: 'Mở toàn quyền truy cập',
    id: 'Dapatkan akses penuh',
    tr: 'Tam erişim al',
    pl: 'Uzyskaj pełny dostęp',
  });

  return (
    <Animated.View
      testID={testID}
      style={[
        styles.animatedShell,
        {
          borderColor: t.accent + '66',
          opacity,
          shadowColor: t.accent,
          transform: [{ translateY }, { translateX }, { scale }],
        },
      ]}
    >
      <TonalSurface radius={10} tone="raised" style={styles.card}>
        <LinearGradient
          colors={[t.accent, '#FFD66B', '#79D6FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topRule}
          pointerEvents="none"
        />

        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: t.textPrimary }]}>
            <Ionicons name="flash" size={18} color={t.bgCard} />
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
            router.push({ pathname: '/premium_modal', params: { context: paywallContext } } as never);
          }}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: t.accent },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="lock-open-outline" size={17} color={t.correctText} />
          <Text style={[styles.ctaLabel, { color: t.correctText, fontSize: f.label }]} numberOfLines={1}>
            {ctaLabel}
          </Text>
        </Pressable>
      </TonalSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedShell: {
    borderWidth: 0,
    elevation: 6,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
  },
  card: {
    borderRadius: 10,
    gap: 12,
    overflow: 'hidden',
    padding: 12,
  },
  topRule: {
    height: 4,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingTop: 2,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 9,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  title: {
    flex: 1,
    fontWeight: '900',
    lineHeight: 22,
  },
  cta: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  ctaLabel: {
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
});

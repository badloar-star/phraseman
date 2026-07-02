// Локальные UI-примитивы АХ-сцены в визуальном языке CleanOnboarding.
// CleanOnboarding.tsx свои примитивы не экспортирует (и занят другой сессией),
// поэтому здесь осознанная копия по спецификации; цвета — только из AHA_THEME.
// Анимации — только transform/opacity, useNativeDriver:true (Performance Bible).

import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { hapticTap } from '../../hooks/use-haptics';
import { AHA_THEME } from './aha_theme';
import type { AhaBeat } from './aha_types';

const COMPASS_LOGO = require('../../assets/images/onboarding_icon_cutout.png');

export interface AhaPrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/** Главная CTA сцены: градиент + псевдо-3D подошва, как primary в онбординге. */
export function AhaPrimaryButton({ label, onPress, disabled }: AhaPrimaryButtonProps) {
  const colors = disabled
    ? ([AHA_THEME.ctaDisabled, AHA_THEME.ctaDisabled] as const)
    : AHA_THEME.ctaGradient;
  return (
    <Pressable
      onPressIn={() => {
        if (!disabled) void hapticTap();
      }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.primaryOuter, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primary}
      >
        <Text style={styles.primaryText}>{label}</Text>
      </LinearGradient>
      <View style={styles.primarySole} />
    </Pressable>
  );
}

export interface AhaSecondaryLinkProps {
  label: string;
  onPress: () => void;
}

/** Мелкая прозрачная кнопка-ссылка (скип и подобное). */
export function AhaSecondaryLink({ label, onPress }: AhaSecondaryLinkProps) {
  return (
    <Pressable
      onPressIn={() => {
        void hapticTap();
      }}
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
      accessibilityRole="button"
      hitSlop={8}
    >
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

export interface AhaCompassBubbleProps {
  children: React.ReactNode;
}

/** Компас + speech-bubble: логотип слева, реплика в стеклянном пузыре. */
export function AhaCompassBubble({ children }: AhaCompassBubbleProps) {
  return (
    <View style={styles.bubbleRow}>
      <Image source={COMPASS_LOGO} style={styles.bubbleLogo} resizeMode="contain" />
      <View style={styles.bubble}>{children}</View>
    </View>
  );
}

/** setTimeout с гарантированной очисткой всех таймеров на unmount. */
export function useSceneTimers(): (fn: () => void, ms: number) => void {
  const idsRef = useRef<readonly ReturnType<typeof setTimeout>[]>([]);
  useEffect(
    () => () => {
      idsRef.current.forEach((id) => clearTimeout(id));
    },
    [],
  );
  return useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    idsRef.current = [...idsRef.current, id];
  }, []);
}

/** Плавная смена битов: выход fade+slide влево 140мс, вход справа 220мс. */
export function useBeatTransition(beat: AhaBeat): {
  displayBeat: AhaBeat;
  transitionStyle: Animated.WithAnimatedObject<ViewStyle>;
} {
  const [displayBeat, setDisplayBeat] = useState<AhaBeat>(beat);
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (beat === displayBeat) return;
    const anim = Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -24, duration: 140, useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => {
      if (finished) setDisplayBeat(beat);
    });
    return () => anim.stop();
  }, [beat, displayBeat, opacity, translateX]);

  useEffect(() => {
    opacity.setValue(0);
    translateX.setValue(24);
    const anim = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [displayBeat, opacity, translateX]);

  const transitionStyle = useMemo(
    () => ({ opacity, transform: [{ translateX }] }),
    [opacity, translateX],
  );
  return { displayBeat, transitionStyle };
}

export interface AhaFadeInProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Появление блока мягким fade (native driver). */
export function AhaFadeIn({ children, style }: AhaFadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(opacity, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  primaryOuter: {
    minHeight: 64,
    borderRadius: 14,
  },
  primary: {
    minHeight: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  primarySole: {
    height: 8,
    marginHorizontal: 2,
    marginTop: -7,
    borderRadius: 14,
    backgroundColor: AHA_THEME.ctaShadow,
    opacity: 0.72,
    zIndex: -1,
  },
  primaryText: {
    color: AHA_THEME.ctaTextColor,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  link: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  linkText: {
    color: AHA_THEME.textMuted,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bubbleLogo: {
    width: 76,
    height: 76,
  },
  bubble: {
    flex: 1,
    borderRadius: AHA_THEME.radiusBubble,
    backgroundColor: AHA_THEME.bubbleBg,
    borderWidth: 1,
    borderColor: AHA_THEME.bubbleBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
});

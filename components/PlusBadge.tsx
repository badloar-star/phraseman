import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, Easing } from 'react-native-reanimated';

import { GOLD_GRADIENTS, GOLD_RICH } from '../constants/goldTheme';
import { isLightThemeMode, type ThemeMode } from '../constants/theme';
import { LinearGradient } from './SafeLinearGradient';
import { OLIVE_GRADIENTS, OLIVE_RICH } from '../constants/oliveTheme';
import { LUM, SUITE } from '../constants/motionHybrid';
import { useReduceMotion } from '../hooks/use_reduce_motion';

// зачем 2026-08-04 (владелец: «плашка Plus тусклая, сливается с фоном на
// светлых темах»): primaryButton — светлое золото → бронза, задумано для
// тёмных фонов (там даёт яркий блик). На светлой (sagePorcelain, bgPrimary
// #F0F1EC) светлый край градиента почти совпадает с фоном экрана — тот же
// класс бага, что уже чинили в GiftExpiryCountdown (светлый акцент на
// светлом фоне нечитаем, нужен отдельный тёмный вариант). На светлой теме
// берём насыщенную тёмно-бронзовую заливку + светлый текст — контраст
// вместо тонального совпадения.
const LIGHT_THEME_GRADIENT = [GOLD_RICH.bronzeDark, GOLD_RICH.bronze, GOLD_RICH.antiqueGold] as const;

type PlusBadgeSize = 'xs' | 'sm' | 'md';

type PlusBadgeProps = {
  label?: string;
  themeMode: ThemeMode | string;
  size?: PlusBadgeSize;
  showIcon?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /**
   * Гибрид «Световод + Чекан» (owner-инициатива, семья «Отклик» B6): bloom
   * при появлении бейджа — свет загорается первым (LUM.bloomMs), форма
   * выходит следом (SUITE.pulse, лёгкий scale 0.88→1). По умолчанию выключен:
   * плашка в 12 существующих местах вызова — постоянный элемент шапки/списка,
   * не свежее событие «только что выдали Plus». Включать точечно там, где
   * бейдж реально появляется впервые (например при активации подписки).
   */
  bloomOnMount?: boolean;
};

const BADGE_SIZE: Record<PlusBadgeSize, {
  padX: number;
  padY: number;
  icon: number;
  font: number;
  gap: number;
}> = {
  xs: { padX: 6, padY: 2, icon: 8, font: 9, gap: 3 },
  sm: { padX: 8, padY: 3, icon: 9, font: 10, gap: 3 },
  md: { padX: 10, padY: 5, icon: 12, font: 12, gap: 5 },
};

export default function PlusBadge({
  label = 'Plus',
  themeMode,
  size = 'sm',
  showIcon = true,
  style,
  testID,
  bloomOnMount = false,
}: PlusBadgeProps) {
  const s = BADGE_SIZE[size];
  // зачем: isLightThemeMode() в constants/theme.ts узнаёт только sagePorcelain
  // — businessLight (тоже белый фон #FFFFFF) под неё не подпадает, но золото
  // там точно так же слепнет. Не трогаем саму функцию (общая, 15+ мест
  // зависят от её текущего поведения) — здесь просто добавляем вторую белую
  // тему к локальной проверке.
  const isLight = isLightThemeMode(themeMode as ThemeMode) || themeMode === 'businessLight';
  const isOliveTheme = themeMode === 'olive';
  const fg = isOliveTheme ? OLIVE_RICH.piano : isLight ? GOLD_RICH.champagne : (themeMode === 'business' ? '#0A0A0A' : GOLD_RICH.bronzeDark);
  const gradientColors = isOliveTheme ? OLIVE_GRADIENTS.primaryButton : isLight ? LIGHT_THEME_GRADIENT : GOLD_GRADIENTS.primaryButton;

  const reduceMotion = useReduceMotion();
  const bloomOpacity = useSharedValue(bloomOnMount ? 0 : 1);
  const bloomScale = useSharedValue(bloomOnMount ? 0.88 : 1);
  const hasBloomedRef = useRef(false);
  useEffect(() => {
    if (!bloomOnMount || hasBloomedRef.current) return;
    hasBloomedRef.current = true;
    if (reduceMotion) {
      bloomOpacity.value = 1;
      bloomScale.value = 1;
      return;
    }
    bloomOpacity.value = withTiming(1, { duration: LUM.bloomMs, easing: Easing.out(Easing.cubic) });
    bloomScale.value = withSpring(1, SUITE.pulse);
  }, [bloomOnMount, bloomOpacity, bloomScale, reduceMotion]);
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: bloomOnMount ? bloomOpacity.value : 1,
    transform: [{ scale: bloomOnMount ? bloomScale.value : 1 }],
  }));

  const content = (
    <View
      testID={testID}
      style={[
        styles.root,
        {
          gap: s.gap,
          paddingHorizontal: s.padX,
          paddingVertical: s.padY,
        },
        style,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {showIcon ? <Ionicons name="diamond" size={s.icon} color={fg} /> : null}
      <Text
        style={[styles.text, { color: fg, fontSize: s.font }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );

  if (!bloomOnMount) return content;
  return <Reanimated.View style={bloomStyle}>{content}</Reanimated.View>;
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: GOLD_RICH.hairlineStrong,
  },
  text: {
    fontWeight: '900',
    letterSpacing: 0,
  },
});

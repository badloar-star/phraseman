import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';

/**
 * Затемняющий верхний край для скролл-экранов (как в Telegram).
 *
 * Это полупрозрачная ЧЁРНАЯ маска: у самой шторки (статус-бар / вырез) она
 * максимально плотная и полностью «гасит» контент, а к низу плавно уходит
 * в прозрачность. Контент, заезжающий наверх при скролле, затемняется и
 * растворяется в тени, а не обрезается резкой кромкой.
 *
 * Маска кладётся от САМОГО верха экрана (top: 0), покрывая всю safe-зону —
 * поэтому шва/ступеньки между статус-баром и контентом нет.
 *
 * Кладётся НАД скроллом, но ПОД хедером (по умолчанию zIndex 5; хедеры обычно 10).
 */
export interface TopFadeMaskProps {
  /**
   * Высота видимого хедера (без safe-area). Если экран измеряет хедер через
   * onLayout — передайте сюда, и затемнение протянется ниже, под хедер.
   * Если 0 — маска покроет только safe-area + extra.
   */
  headerHeight?: number;
  /**
   * Дополнительный заход маски НИЖЕ safe-area/хедера — чтобы переход в прозрачность
   * приходился на контент, а не точно на границу safe-зоны (иначе виден шов).
   * По умолчанию 24.
   */
  extra?: number;
  /**
   * Максимальная непрозрачность маски у самого верха. 0..1, по умолчанию 0.6 —
   * контент просвечивает затемнённым (не пропадает в чёрной полосе).
   */
  maxOpacity?: number;
  /**
   * Принудительный тон маски: 'dark' (чёрная, затемняет) или 'light' (белая,
   * осветляет). По умолчанию определяется по теме — на светлой теме белая.
   */
  tone?: 'dark' | 'light';
  /**
   * Доля высоты от верха, где затемнение держится максимальным (плато у шторки),
   * прежде чем начать таять к прозрачности. 0..1, по умолчанию 0.35.
   */
  solidRatio?: number;
  /**
   * Привязка к скроллу: маски нет, пока контент вверху (opacity 0), и она плавно
   * появляется как только начали скроллить. Если не передан — маска статична.
   *
   * ВАЖНО: opacity анимируется через native-driven timing по ПОРОГУ (а не покадровой
   * интерполяцией scrollY), поэтому JS-поток и скролл остаются плавными.
   */
  scrollY?: Animated.Value;
  /** Порог прокрутки (px), после которого маска включается. По умолчанию 6. */
  showThreshold?: number;
  zIndex?: number;
  style?: ViewStyle;
}

function rgbaWithAlpha(rgb: string, a: number): string {
  const clamped = Math.min(1, Math.max(0, a));
  return `rgba(${rgb},${clamped.toFixed(3)})`;
}

export default function TopFadeMask({
  headerHeight = 0,
  extra = 24,
  maxOpacity = 0.6,
  solidRatio = 0.35,
  tone,
  scrollY,
  showThreshold = 6,
  zIndex = 5,
  style,
}: TopFadeMaskProps) {
  const insets = useSafeAreaInsets();
  const { themeMode } = useTheme();

  // Native-driven opacity маски. Скролл НЕ гонит opacity покадрово (это лагало);
  // вместо этого слушаем scrollY и плавно гасим/зажигаем маску по порогу.
  const maskOpacity = useRef(new Animated.Value(scrollY ? 0 : 1)).current;
  const shownRef = useRef(!scrollY);

  useEffect(() => {
    if (!scrollY) return undefined;
    const id = scrollY.addListener(({ value }) => {
      const shouldShow = value > showThreshold;
      if (shouldShow === shownRef.current) return;
      shownRef.current = shouldShow;
      Animated.timing(maskOpacity, {
        toValue: shouldShow ? 1 : 0,
        duration: shouldShow ? 180 : 260,
        useNativeDriver: true,
      }).start();
    });
    return () => scrollY.removeListener(id);
  }, [scrollY, showThreshold, maskOpacity]);

  const height = insets.top + headerHeight + extra;
  if (height <= 0) return null;

  const animatedOpacity = scrollY ? maskOpacity : undefined;

  // На светлой («бумажной») теме чёрная маска даёт грязное пятно — осветляем белым.
  const resolvedTone = tone ?? (themeMode === 'minimalLight' ? 'light' : 'dark');
  const rgb = resolvedTone === 'light' ? '255,255,255' : '0,0,0';
  const top = rgbaWithAlpha(rgb, maxOpacity);
  const mid = rgbaWithAlpha(rgb, maxOpacity * 0.5);
  const transparent = rgbaWithAlpha(rgb, 0);
  const solid = Math.min(0.9, Math.max(0.05, solidRatio));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.mask, { height, zIndex, elevation: zIndex }, style, animatedOpacity ? { opacity: animatedOpacity } : null]}
    >
      <LinearGradient
        colors={[top, top, mid, transparent]}
        locations={[0, solid, (solid + 1) / 2, 1]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  mask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});

import React, { useContext, useEffect, useRef, memo } from 'react';
import { View, Animated, StyleSheet, Dimensions, Easing, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './ThemeContext';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS } from '../constants/goldTheme';

const GradientActiveCtx = React.createContext(false);

const { width: W, height: H } = Dimensions.get('window');

const ORBS: Record<string, { x: number; y: number; r: number; color: string; opacity: number }[]> = {
  dark: [
    { x: W * 0.85, y: 80,       r: 200, color: '#47C870', opacity: 0.15 },
    { x: W * 0.1,  y: H * 0.42, r: 150, color: '#2A7A4A', opacity: 0.13 },
    { x: W * 0.6,  y: H * 0.78, r: 130, color: '#1A5C35', opacity: 0.10 },
    { x: W * 0.25, y: H * 0.22, r:  70, color: '#58CC89', opacity: 0.07 },
  ],
  neon: [
    { x: W * 0.8,  y: 70,       r: 190, color: '#C8FF00', opacity: 0.13 },
    { x: W * 0.1,  y: H * 0.52, r: 140, color: '#88BB00', opacity: 0.11 },
    { x: W * 0.6,  y: H * 0.82, r: 110, color: '#C8FF00', opacity: 0.08 },
    { x: W * 0.4,  y: H * 0.25, r:  60, color: '#AAFF00', opacity: 0.05 },
  ],
  gold: [
    { x: W * 0.82, y: 70,       r: 165, color: GOLD_RICH.champagne, opacity: 0.032 },
    { x: W * 0.08, y: H * 0.40, r: 150, color: GOLD_RICH.bronze, opacity: 0.045 },
    { x: W * 0.63, y: H * 0.82, r: 135, color: GOLD_RICH.agedGold, opacity: 0.030 },
    { x: W * 0.28, y: H * 0.19, r: 72, color: GOLD_RICH.metalGold, opacity: 0.025 },
  ],
  coral: [
    { x: W * 0.82, y: 74,       r: 190, color: '#FF6464', opacity: 0.15 },
    { x: W * 0.08, y: H * 0.44, r: 160, color: '#4A90FF', opacity: 0.10 },
    { x: W * 0.58, y: H * 0.80, r: 140, color: '#FF8A8A', opacity: 0.08 },
    { x: W * 0.30, y: H * 0.20, r:  82, color: '#6B6BFF', opacity: 0.07 },
  ],
  ocean: [
    { x: W * 0.8,  y: 80,       r: 200, color: '#00B8FF', opacity: 0.2 },
    { x: W * 0.0,  y: H * 0.45, r: 170, color: '#0060A0', opacity: 0.16 },
    { x: W * 0.55, y: H * 0.78, r: 140, color: '#20D0FF', opacity: 0.12 },
    { x: W * 0.32, y: H * 0.2,  r:  85, color: '#A8E8FF', opacity: 0.1 },
  ],
  // Яркие пятна на тёмном (не тусклятина): малиновое свечение + блик
  sakura: [
    { x: W * 0.8,  y: 80,       r: 200, color: '#FF1A6A', opacity: 0.18 },
    { x: W * 0.05, y: H * 0.40, r: 160, color: '#C01060', opacity: 0.14 },
    { x: W * 0.55, y: H * 0.78, r: 150, color: '#FF4080', opacity: 0.10 },
    { x: W * 0.3,  y: H * 0.18, r:  90, color: '#F8B8D0', opacity: 0.12 },
  ],
  // Sketch (minimalLight): warm paper + graphite shading.
  minimalLight: [
    { x: W * 0.82, y: 84,       r: 210, color: '#B8AD96', opacity: 0.16 },
    { x: W * 0.08, y: H * 0.46, r: 165, color: '#C9BEA6', opacity: 0.12 },
    { x: W * 0.58, y: H * 0.80, r: 145, color: '#AFA38C', opacity: 0.10 },
    { x: W * 0.28, y: H * 0.20, r:  84, color: '#D8CFBC', opacity: 0.10 },
  ],
  // Graphite (minimalDark): monochrome cool-dark shading.
  minimalDark: [
    { x: W * 0.82, y: 84,       r: 205, color: '#6B7280', opacity: 0.16 },
    { x: W * 0.08, y: H * 0.46, r: 160, color: '#4B5563', opacity: 0.14 },
    { x: W * 0.58, y: H * 0.80, r: 140, color: '#374151', opacity: 0.12 },
    { x: W * 0.28, y: H * 0.20, r:  80, color: '#9CA3AF', opacity: 0.08 },
  ],
};

const BG_GRADIENTS: Record<string, string[]> = {
  dark:   ['#1A3525', '#0E2116', '#07100A'],
  neon:   ['#212121', '#141414', '#0B0B0B'],
  gold:   GOLD_GRADIENTS.appBackground,
  coral:  ['#22224A', '#11112C', '#050510'],
  // Глубина: яркий верх, книзу почти ночной синий
  ocean:  ['#2088D0', '#0C4A78', '#020A14'],
  // Тёмно-винный, насыщенно; верх чуть светлее — шапка/приветствие с тёмным текстом читаемы
  sakura: ['#B03062', '#581830', '#14040C'],
  // Sketch light paper tone
  minimalLight: ['#F8F4EA', '#EFE7D6', '#E7DDC9'],
  // Graphite dark neutral tone
  minimalDark: ['#202225', '#17181B', '#111214'],
};

/** Те же стопы, что у полного фона приложения — для интро-слоёв без дублирования палитры. */
export const SCREEN_BG_GRADIENT_STOPS: Record<string, string[]> = BG_GRADIENTS;

function Orb({ x, y, r, color, opacity, delay }: {
  x: number; y: number; r: number; color: string; opacity: number; delay: number;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 7600 + delay * 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 7600 + delay * 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const t = setTimeout(() => anim.start(), delay * 600);
    return () => { clearTimeout(t); anim.stop(); };
  }, [delay, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.07] });
  const translateX = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, delay % 2 === 0 ? 12 : -10] });
  const translateY = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, delay % 2 === 0 ? -10 : 12] });
  const animatedOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [opacity * 0.76, opacity] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: color,
        opacity: animatedOpacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    />
  );
}

const FABRIC_THREADS = [0.10, 0.18, 0.28, 0.39, 0.52, 0.66, 0.78, 0.90];

function GoldFabricFlow() {
  const main = useRef(new Animated.Value(0)).current;
  const cross = useRef(new Animated.Value(0)).current;
  const threads = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const mainAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(main, {
          toValue: 1,
          duration: 15000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(main, {
          toValue: 0,
          duration: 15000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const crossAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(cross, {
          toValue: 1,
          duration: 18000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(cross, {
          toValue: 0,
          duration: 18000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const threadAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(threads, {
          toValue: 1,
          duration: 12500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(threads, {
          toValue: 0,
          duration: 12500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const sweepAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 14000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(sweep, {
          toValue: 0,
          duration: 14000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    mainAnim.start();
    crossAnim.start();
    threadAnim.start();
    sweepAnim.start();
    return () => {
      mainAnim.stop();
      crossAnim.stop();
      threadAnim.stop();
      sweepAnim.stop();
    };
  }, [cross, main, sweep, threads]);

  const mainX = main.interpolate({
    inputRange: [0, 1],
    outputRange: [-W * 0.62, W * 0.44],
  });
  const mainY = main.interpolate({ inputRange: [0, 1], outputRange: [-H * 0.13, H * 0.095] });
  const mainScaleY = main.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.72, 1.38, 0.72] });
  const mainOpacity = main.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.66, 0.88, 0.66] });
  const crossX = cross.interpolate({ inputRange: [0, 1], outputRange: [W * 0.52, -W * 0.58] });
  const crossY = cross.interpolate({ inputRange: [0, 1], outputRange: [H * 0.15, -H * 0.11] });
  const crossScaleY = cross.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1.34, 0.72, 1.34] });
  const crossOpacity = cross.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0.52, 0.76, 0.52] });
  const threadX = threads.interpolate({ inputRange: [0, 1], outputRange: [-W * 0.42, W * 0.44] });
  const threadOpacity = threads.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.26, 0.42, 0.26] });
  const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-W * 1.40, W * 0.92] });
  const sweepOpacity = sweep.interpolate({ inputRange: [0, 0.28, 0.62, 1], outputRange: [0, 0.70, 0.38, 0] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['rgba(246,227,161,0.070)', 'rgba(184,144,58,0.034)', 'rgba(0,0,0,0)']}
        locations={[0, 0.36, 1]}
        start={{ x: 0.12, y: 0 }}
        end={{ x: 0.88, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.fabricBand, styles.fabricBandMain, { opacity: mainOpacity, transform: [{ translateX: mainX }, { translateY: mainY }, { rotate: '-18deg' }, { scaleY: mainScaleY }] }]}>
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(246,227,161,0.310)', 'rgba(184,144,58,0.125)', 'rgba(0,0,0,0)']}
          locations={[0, 0.38, 0.58, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.fabricBand, styles.fabricBandCross, { opacity: crossOpacity, transform: [{ translateX: crossX }, { translateY: crossY }, { rotate: '17deg' }, { scaleY: crossScaleY }] }]}>
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(92,66,22,0.220)', 'rgba(246,227,161,0.240)', 'rgba(0,0,0,0)']}
          locations={[0, 0.34, 0.58, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.fabricThreads, { opacity: threadOpacity, transform: [{ translateX: threadX }, { rotate: '-18deg' }] }]}>
        {FABRIC_THREADS.map((top, i) => (
          <LinearGradient
            key={top}
            colors={i % 2 === 0
              ? ['rgba(0,0,0,0)', 'rgba(246,227,161,0.260)', 'rgba(0,0,0,0)']
              : ['rgba(0,0,0,0)', 'rgba(110,75,20,0.250)', 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fabricThread, { top: H * top }]}
          />
        ))}
      </Animated.View>
      <Animated.View style={[styles.fabricSweep, { opacity: sweepOpacity, transform: [{ translateX: sweepX }, { rotate: '-22deg' }] }]}>
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(246,227,161,0.360)', 'rgba(255,245,202,0.250)', 'rgba(184,144,58,0.080)', 'rgba(0,0,0,0)']}
          locations={[0, 0.36, 0.48, 0.62, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <LinearGradient
        colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.16)']}
        locations={[0, 0.46, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

interface Props {
  children?: React.ReactNode;
  style?: any;
  /** Медленный «сдвиг глубины» фона при входе на главный экран (только визуальная мелочь) */
  entranceOffsetY?: Animated.Value;
  /**
   * Фиксированный translateY для слоя фона (таб-оболочка).
   * Число + обычный View вместо Animated.Value — иначе орбы с native-driver на родителе Animated.View дают рывки при JS-layout таб-слайдера.
   */
  staticParallaxY?: number;
  /**
   * Модалка / полноэкранный слой поверх экрана, где уже есть родительский ScreenGradient:
   * без этого флага isNested даёт только transparent View (для табов), и фон модалки остаётся белым.
   */
  forceFullBleed?: boolean;
}

function ScreenGradient({ children, style, entranceOffsetY, staticParallaxY, forceFullBleed }: Props) {
  const { theme: t, themeMode } = useTheme();
  const isNested = useContext(GradientActiveCtx);
  const defaultEntranceY = useRef(new Animated.Value(0)).current;

  // Вложенный: табы уже рисуют один ScreenGradient в (tabs)/_layout — здесь только контент, фон «протекает».
  if (isNested && !forceFullBleed) {
    return <View style={[{ flex: 1, backgroundColor: 'transparent' }, style]}>{children}</View>;
  }

  const isGold = themeMode === 'gold';
  const orbs = ORBS[themeMode] ?? ORBS.dark;
  const gradColors = BG_GRADIENTS[themeMode] ?? [t.bgGradient[0], t.bgGradient[1]];

  const staticY = staticParallaxY;
  const animatedY =
    staticParallaxY === undefined ? (entranceOffsetY ?? defaultEntranceY) : undefined;

  const bgLayerStyle: ViewStyle = {
    ...StyleSheet.absoluteFillObject,
    ...(staticY !== undefined
      ? { transform: [{ translateY: staticY }] }
      : animatedY !== undefined
        ? { transform: [{ translateY: animatedY }] }
        : {}),
  };

  const bgInner = (
    <>
      <LinearGradient
        colors={gradColors as any}
        locations={isGold ? GOLD_SURFACE_LOCATIONS : undefined}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'visible' }]}>
        {isGold ? (
          <GoldFabricFlow />
        ) : (
          <>
            {orbs.map((o, i) => (
              <Orb key={i} {...o} delay={i} />
            ))}
            <View style={{
              position: 'absolute', top: 0, right: -80,
              width: 220,
              height: 220,
              borderRadius: 110,
              backgroundColor: `${t.accent}18`,
              transform: [{ rotate: '30deg' }, { scaleX: 2.2 }],
            }} />
          </>
        )}
        <LinearGradient
          colors={isGold
            ? ['rgba(0,0,0,0.08)', 'rgba(60,42,11,0.10)', 'rgba(0,0,0,0.32)']
              : ['rgba(0,0,0,0.00)', 'rgba(0,0,0,0.08)']}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </>
  );

  return (
    <GradientActiveCtx.Provider value={true}>
      <View style={[{ flex: 1, backgroundColor: t.bgPrimary, overflow: 'visible' }, style]}>
        {staticY !== undefined ? (
          <View pointerEvents="none" collapsable={false} style={bgLayerStyle}>
            {bgInner}
          </View>
        ) : (
          <Animated.View pointerEvents="none" collapsable={false} style={bgLayerStyle}>
            {bgInner}
          </Animated.View>
        )}
        {children}
      </View>
    </GradientActiveCtx.Provider>
  );
}

export default memo(ScreenGradient);

const styles = StyleSheet.create({
  fabricBand: {
    position: 'absolute',
    left: -W * 0.34,
    width: W * 1.68,
    overflow: 'hidden',
  },
  fabricBandMain: {
    top: H * 0.03,
    height: H * 0.42,
    borderRadius: H * 0.22,
  },
  fabricBandCross: {
    top: H * 0.32,
    height: H * 0.36,
    borderRadius: H * 0.18,
  },
  fabricThreads: {
    position: 'absolute',
    top: -H * 0.16,
    left: -W * 0.34,
    width: W * 1.72,
    height: H * 1.28,
  },
  fabricThread: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  fabricSweep: {
    position: 'absolute',
    top: -H * 0.20,
    bottom: -H * 0.18,
    width: W * 0.82,
  },
});

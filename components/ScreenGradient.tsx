import React, { useContext, useEffect, useRef, memo } from 'react';
import { View, Animated, StyleSheet, Dimensions, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './ThemeContext';

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
    { x: W * 0.85, y: 80,       r: 200, color: '#FF6464', opacity: 0.13 },
    { x: W * 0.05, y: H * 0.38, r: 140, color: '#4A50CC', opacity: 0.12 },
    { x: W * 0.5,  y: H * 0.72, r: 120, color: '#FF8080', opacity: 0.09 },
    { x: W * 0.25, y: H * 0.14, r:  70, color: '#FFD060', opacity: 0.07 },
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
  gold:   ['#25254F', '#181835', '#0A0A18'],
  // Глубина: яркий верх, книзу почти ночной синий
  ocean:  ['#2088D0', '#0C4A78', '#020A14'],
  // Тёмно-винный, насыщенно; верх чуть светлее — шапка/приветствие с тёмным текстом читаемы
  sakura: ['#B03062', '#581830', '#14040C'],
  // Sketch light paper tone
  minimalLight: ['#F8F4EA', '#EFE7D6', '#E7DDC9'],
  // Graphite dark neutral tone
  minimalDark: ['#202225', '#17181B', '#111214'],
};

function Orb({ x, y, r, color, opacity, delay }: {
  x: number; y: number; r: number; color: string; opacity: number; delay: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: 4000 + delay * 500, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.00, duration: 4000 + delay * 500, useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => anim.start(), delay * 600);
    return () => { clearTimeout(t); anim.stop(); };
  }, [delay, scale]);

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
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

interface Props {
  children?: React.ReactNode;
  style?: any;
  /** Медленный «сдвиг глубины» фона при входе на главный экран (только визуальная мелочь) */
  entranceOffsetY?: Animated.Value;
  /**
   * Модалка / полноэкранный слой поверх экрана, где уже есть родительский ScreenGradient:
   * без этого флага isNested даёт только transparent View (для табов), и фон модалки остаётся белым.
   */
  forceFullBleed?: boolean;
}

function ScreenGradient({ children, style, entranceOffsetY, forceFullBleed }: Props) {
  const { theme: t, themeMode } = useTheme();
  const isNested = useContext(GradientActiveCtx);
  const defaultEntranceY = useRef(new Animated.Value(0)).current;
  const parallaxY = entranceOffsetY ?? defaultEntranceY;

  // Вложенный: табы уже рисуют один ScreenGradient в (tabs)/_layout — здесь только контент, фон «протекает».
  if (isNested && !forceFullBleed) {
    return <View style={[{ flex: 1, backgroundColor: 'transparent' }, style]}>{children}</View>;
  }

  const orbs = ORBS[themeMode] ?? ORBS.dark;
  const gradColors = BG_GRADIENTS[themeMode] ?? [t.bgGradient[0], t.bgGradient[1]];

  const bgLayerStyle: ViewStyle = {
    ...StyleSheet.absoluteFillObject,
    transform: [{ translateY: parallaxY }],
  };

  return (
    <GradientActiveCtx.Provider value={true}>
      <View style={[{ flex: 1, backgroundColor: t.bgPrimary, overflow: 'visible' }, style]}>
        <Animated.View pointerEvents="none" style={bgLayerStyle}>
          <LinearGradient
            colors={gradColors as any}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'visible' }]}>
            {orbs.map((o, i) => (
              <Orb key={i} {...o} delay={i} />
            ))}
            <View style={{
              position: 'absolute', top: 0, right: -80,
              width: 220, height: 220, borderRadius: 110,
              backgroundColor: themeMode === 'ocean' || themeMode === 'sakura'
                ? 'rgba(255,255,255,0.08)'
                : `${t.accent}18`,
              transform: [{ rotate: '30deg' }, { scaleX: 2.2 }],
            }} />
            <LinearGradient
              colors={['rgba(0,0,0,0.00)', 'rgba(0,0,0,0.08)']}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </Animated.View>
        {children}
      </View>
    </GradientActiveCtx.Provider>
  );
}

export default memo(ScreenGradient);

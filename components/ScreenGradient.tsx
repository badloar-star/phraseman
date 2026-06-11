import React, { useContext, useEffect, useMemo, useRef, memo } from 'react';
import { View, Animated, StyleSheet, Dimensions, Easing, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient as SvgRadialGradient, Stop, Rect, Circle } from 'react-native-svg';
import { useTheme } from './ThemeContext';
import { GOLD_RICH, GOLD_SURFACE_LOCATIONS } from '../constants/goldTheme';
import { CINEMA, CINEMA_STARS, isCinemaMode, type CinemaMode } from '../constants/cinemaThemes';
import { BG_GRADIENTS } from '../constants/screenBackground';
import TopFadeMask, { type TopFadeMaskProps } from './TopFadeMask';
import {
  FABRIC_BACKGROUND_TRANSITIONS_ENABLED,
  usePersistentBackgroundLayers,
  type PersistentBackgroundLayer,
} from './backgroundTransition';
import AppArtBackdrop, { AppRouteArtBackdrop } from './AppArtBackdrop';
import type { AppArtBackdropName } from './appArtBackdropRegistry';
import type { ThemeMode } from '../constants/theme';

const GradientActiveCtx = React.createContext(false);

const { width: W, height: H } = Dimensions.get('window');
const SCREEN_GRADIENT_MOTION_ENABLED = true;
const SCREEN_GRADIENT_USE_NATIVE_DRIVER = true;

const MOTION_OVERLAY_OPACITY: Record<ThemeMode, number> = {
  dark: 0.72,
  neon: 0.68,
  gold: 0.88,
  coral: 0.66,
  minimalLight: 0.34,
  minimalDark: 0.48,
  compass: 0,
  // «Чёрное кино»: альфы зашиты в стопы CinemaBloom, слой не глушим.
  midnight: 1,
  ember: 1,
  aurora: 1,
  volt: 1,
};

type OrbSpec = { x: number; y: number; r: number; color: string; opacity: number };
type ScreenBgLayer = {
  key: string;
  backgroundColor: string;
  accent: string;
  isGold: boolean;
  cinemaMode: CinemaMode | null;
  gradColors: string[];
  orbs: OrbSpec[];
};

const THEME_ORBS: Record<ThemeMode, OrbSpec[]> = {
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
    { x: W * 0.82, y: 74,       r: 190, color: '#D88C82', opacity: 0.10 },
    { x: W * 0.08, y: H * 0.44, r: 160, color: '#8C5751', opacity: 0.10 },
    { x: W * 0.58, y: H * 0.80, r: 140, color: '#B86A62', opacity: 0.07 },
    { x: W * 0.30, y: H * 0.20, r:  82, color: '#6E3F3F', opacity: 0.07 },
  ],
  // Sketch (minimalLight): warm paper + graphite shading.
  minimalLight: [
    { x: W * 0.82, y: 84,       r: 210, color: '#8F8068', opacity: 0.20 },
    { x: W * 0.08, y: H * 0.46, r: 165, color: '#A18F72', opacity: 0.16 },
    { x: W * 0.58, y: H * 0.80, r: 145, color: '#8A7B65', opacity: 0.14 },
    { x: W * 0.28, y: H * 0.20, r:  84, color: '#B8AA92', opacity: 0.13 },
  ],
  // Graphite (minimalDark): monochrome cool-dark shading with blue accents.
  minimalDark: [
    { x: W * 0.82, y: 84,       r: 205, color: '#6B7280', opacity: 0.16 },
    { x: W * 0.08, y: H * 0.46, r: 160, color: '#4B5563', opacity: 0.14 },
    { x: W * 0.58, y: H * 0.80, r: 140, color: '#374151', opacity: 0.12 },
    { x: W * 0.28, y: H * 0.20, r:  80, color: '#9CA3AF', opacity: 0.08 },
  ],
  // Compass: reference-matched graphite field; warm amber is reserved for assets and CTA.
  compass: [],
  // «Чёрное кино»: вместо орбов — слой CinemaBloom (двухцветный блум снизу + звёзды).
  midnight: [],
  ember: [],
  aurora: [],
  volt: [],
};

const LEGACY_UNSUPPORTED_ORBS: Record<'ocean' | 'sakura', OrbSpec[]> = {
  ocean: [
    { x: W * 0.8,  y: 80,       r: 200, color: '#00B8FF', opacity: 0.2 },
    { x: W * 0.0,  y: H * 0.45, r: 170, color: '#0060A0', opacity: 0.16 },
    { x: W * 0.55, y: H * 0.78, r: 140, color: '#20D0FF', opacity: 0.12 },
    { x: W * 0.32, y: H * 0.2,  r:  85, color: '#A8E8FF', opacity: 0.1 },
  ],
  sakura: [
    { x: W * 0.8,  y: 80,       r: 200, color: '#FF1A6A', opacity: 0.18 },
    { x: W * 0.05, y: H * 0.40, r: 160, color: '#C01060', opacity: 0.14 },
    { x: W * 0.55, y: H * 0.78, r: 150, color: '#FF4080', opacity: 0.10 },
    { x: W * 0.3,  y: H * 0.18, r:  90, color: '#F8B8D0', opacity: 0.12 },
  ],
};

const ORBS: Record<ThemeMode | keyof typeof LEGACY_UNSUPPORTED_ORBS, OrbSpec[]> = {
  ...THEME_ORBS,
  ...LEGACY_UNSUPPORTED_ORBS,
};

// Стопы фонового градиента вынесены в constants/screenBackground, чтобы fade-маска
// (TopFadeMask) могла брать тот же цвет без циклического импорта.
// Ре-экспорт сохраняет существующие импорты `SCREEN_BG_GRADIENT_STOPS` из этого модуля.
export { SCREEN_BG_GRADIENT_STOPS } from '../constants/screenBackground';

function Orb({ x, y, r, color, opacity, delay }: {
  x: number; y: number; r: number; color: string; opacity: number; delay: number;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!SCREEN_GRADIENT_MOTION_ENABLED) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return undefined;
    }

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 7600 + delay * 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: SCREEN_GRADIENT_USE_NATIVE_DRIVER,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 7600 + delay * 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: SCREEN_GRADIENT_USE_NATIVE_DRIVER,
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

  if (!SCREEN_GRADIENT_MOTION_ENABLED) {
    return (
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: x - r,
          top: y - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          backgroundColor: color,
          opacity: opacity * 0.76,
        }}
      />
    );
  }

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
const EXPLICIT_ART_BACKDROP_COMPONENT_NAMES = new Set([
  'AppArtBackdrop',
  'AppRouteArtBackdrop',
  'ArenaMatchBackdrop',
  'LessonArtBackdrop',
  'ScreenArtBackdrop',
  'StatsArtBackdrop',
]);

function hasExplicitArtBackdrop(children: React.ReactNode): boolean {
  return React.Children.toArray(children).some(child => {
    if (!React.isValidElement(child)) return false;

    const typeInfo = child.type as { displayName?: string; name?: string } | string;
    const componentName = typeof typeInfo === 'string'
      ? typeInfo
      : typeInfo.displayName ?? typeInfo.name;

    if (componentName && EXPLICIT_ART_BACKDROP_COMPONENT_NAMES.has(componentName)) {
      return true;
    }

    if (child.type !== React.Fragment) return false;

    const nested = (child.props as { children?: React.ReactNode }).children;
    return nested ? hasExplicitArtBackdrop(nested) : false;
  });
}

function GoldFabricFlow() {
  const main = useRef(new Animated.Value(0)).current;
  const cross = useRef(new Animated.Value(0)).current;
  const threads = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!SCREEN_GRADIENT_MOTION_ENABLED) {
      main.stopAnimation();
      cross.stopAnimation();
      threads.stopAnimation();
      sweep.stopAnimation();
      main.setValue(0);
      cross.setValue(0);
      threads.setValue(0);
      sweep.setValue(0);
      return undefined;
    }

    const mainAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(main, {
          toValue: 1,
          duration: 15000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: SCREEN_GRADIENT_USE_NATIVE_DRIVER,
        }),
        Animated.timing(main, {
          toValue: 0,
          duration: 15000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: SCREEN_GRADIENT_USE_NATIVE_DRIVER,
        }),
      ])
    );
    const crossAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(cross, {
          toValue: 1,
          duration: 18000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: SCREEN_GRADIENT_USE_NATIVE_DRIVER,
        }),
        Animated.timing(cross, {
          toValue: 0,
          duration: 18000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: SCREEN_GRADIENT_USE_NATIVE_DRIVER,
        }),
      ])
    );
    const threadAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(threads, {
          toValue: 1,
          duration: 12500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: SCREEN_GRADIENT_USE_NATIVE_DRIVER,
        }),
        Animated.timing(threads, {
          toValue: 0,
          duration: 12500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: SCREEN_GRADIENT_USE_NATIVE_DRIVER,
        }),
      ])
    );
    const sweepAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 14000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: SCREEN_GRADIENT_USE_NATIVE_DRIVER,
        }),
        Animated.timing(sweep, {
          toValue: 0,
          duration: 14000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: SCREEN_GRADIENT_USE_NATIVE_DRIVER,
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

  if (!SCREEN_GRADIENT_MOTION_ENABLED) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['rgba(246,227,161,0.040)', 'rgba(184,144,58,0.018)', 'rgba(0,0,0,0)']}
          locations={[0, 0.36, 1]}
          start={{ x: 0.12, y: 0 }}
          end={{ x: 0.88, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.16)', 'rgba(0,0,0,0.04)', 'rgba(0,0,0,0.38)']}
          locations={[0, 0.46, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['rgba(246,227,161,0.040)', 'rgba(184,144,58,0.018)', 'rgba(0,0,0,0)']}
        locations={[0, 0.36, 1]}
        start={{ x: 0.12, y: 0 }}
        end={{ x: 0.88, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.fabricBand, styles.fabricBandMain, { opacity: mainOpacity, transform: [{ translateX: mainX }, { translateY: mainY }, { rotate: '-18deg' }, { scaleY: mainScaleY }] }]}>
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(246,227,161,0.180)', 'rgba(184,144,58,0.065)', 'rgba(0,0,0,0)']}
          locations={[0, 0.38, 0.58, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.fabricBand, styles.fabricBandCross, { opacity: crossOpacity, transform: [{ translateX: crossX }, { translateY: crossY }, { rotate: '17deg' }, { scaleY: crossScaleY }] }]}>
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(92,66,22,0.120)', 'rgba(246,227,161,0.145)', 'rgba(0,0,0,0)']}
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
              ? ['rgba(0,0,0,0)', 'rgba(246,227,161,0.150)', 'rgba(0,0,0,0)']
              : ['rgba(0,0,0,0)', 'rgba(110,75,20,0.130)', 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fabricThread, { top: H * top }]}
          />
        ))}
      </Animated.View>
      <Animated.View style={[styles.fabricSweep, { opacity: sweepOpacity, transform: [{ translateX: sweepX }, { rotate: '-22deg' }] }]}>
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(246,227,161,0.200)', 'rgba(255,245,202,0.130)', 'rgba(184,144,58,0.040)', 'rgba(0,0,0,0)']}
          locations={[0, 0.36, 0.48, 0.62, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <LinearGradient
        colors={['rgba(0,0,0,0.16)', 'rgba(0,0,0,0.04)', 'rgba(0,0,0,0.38)']}
        locations={[0, 0.46, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/**
 * «Чёрное кино»: кинематографичный блум снизу — белое ядро → bloomA → bloomB
 * ореолом + слабый ответный отсвет сверху + звёздная пыль. Статичный SVG
 * (без анимаций): радиальные градиенты дёшевы и не дёргают UI-поток.
 */
function CinemaBloom({ mode }: { mode: CinemaMode }) {
  const p = CINEMA[mode];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgRadialGradient id={`cinema-halo-${mode}`} cx="50%" cy="116%" rx="92%" ry="64%">
            <Stop offset="0%" stopColor={p.bloomB} stopOpacity={0.55} />
            <Stop offset="55%" stopColor={p.bloomB} stopOpacity={0.22} />
            <Stop offset="100%" stopColor={p.bloomB} stopOpacity={0} />
          </SvgRadialGradient>
          <SvgRadialGradient id={`cinema-main-${mode}`} cx="50%" cy="110%" rx="66%" ry="46%">
            <Stop offset="0%" stopColor={p.bloomA} stopOpacity={0.62} />
            <Stop offset="60%" stopColor={p.bloomA} stopOpacity={0.24} />
            <Stop offset="100%" stopColor={p.bloomA} stopOpacity={0} />
          </SvgRadialGradient>
          <SvgRadialGradient id={`cinema-core-${mode}`} cx="50%" cy="106%" rx="38%" ry="24%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.40} />
            <Stop offset="55%" stopColor="#FFFFFF" stopOpacity={0.14} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </SvgRadialGradient>
          <SvgRadialGradient id={`cinema-top-${mode}`} cx="50%" cy="-14%" rx="80%" ry="42%">
            <Stop offset="0%" stopColor={p.bloomB} stopOpacity={0.10} />
            <Stop offset="100%" stopColor={p.bloomB} stopOpacity={0} />
          </SvgRadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#cinema-halo-${mode})`} />
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#cinema-main-${mode})`} />
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#cinema-core-${mode})`} />
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#cinema-top-${mode})`} />
        {CINEMA_STARS.map(([sx, sy, r, o], i) => (
          <Circle key={`star-${i}`} cx={W * sx} cy={H * sy} r={r} fill="#FFFFFF" opacity={o * 0.8} />
        ))}
      </Svg>
    </View>
  );
}

function ScreenGradientBackgroundLayer({
  layer,
  effectsOnly = false,
}: {
  layer: ScreenBgLayer;
  effectsOnly?: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      collapsable={false}
      style={[
        StyleSheet.absoluteFill,
        !effectsOnly ? { backgroundColor: layer.backgroundColor } : null,
      ]}
    >
      {!effectsOnly ? (
        <LinearGradient
          colors={layer.gradColors as any}
          locations={layer.isGold ? GOLD_SURFACE_LOCATIONS : undefined}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'visible' }]}>
        {effectsOnly ? (
          layer.isGold ? (
            <GoldFabricFlow />
          ) : layer.cinemaMode ? (
            <CinemaBloom mode={layer.cinemaMode} />
          ) : (
            <>
              {layer.orbs.map((o, i) => (
                <Orb key={`${layer.key}-${i}`} {...o} delay={i} />
              ))}
              <View style={{
                position: 'absolute', top: 0, right: -80,
                width: 220,
                height: 220,
                borderRadius: 110,
                backgroundColor: layer.key.startsWith('minimalLight:')
                  ? 'rgba(52,56,66,0.13)'
                  : `${layer.accent}18`,
                transform: [{ rotate: '30deg' }, { scaleX: 2.2 }],
              }} />
            </>
          )
        ) : null}
        {!effectsOnly ? (
          <LinearGradient
            colors={layer.isGold
              ? ['rgba(0,0,0,0.26)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.54)']
                : ['rgba(0,0,0,0.00)', 'rgba(0,0,0,0.08)']}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </View>
    </View>
  );
}

function renderBackgroundLayer(
  layer: PersistentBackgroundLayer<ScreenBgLayer>,
  effectsOnly = false,
  overlayOpacity = 1,
) {
  const key = effectsOnly ? `${layer.id}:effects` : layer.id;

  if (!FABRIC_BACKGROUND_TRANSITIONS_ENABLED) {
    return (
      <View key={key} pointerEvents="none" style={[StyleSheet.absoluteFill, effectsOnly ? { opacity: overlayOpacity } : null]}>
        <ScreenGradientBackgroundLayer layer={layer.value} effectsOnly={effectsOnly} />
      </View>
    );
  }

  return (
    <Animated.View
      key={key}
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity: effectsOnly ? overlayOpacity : layer.opacity }]}
    >
      <ScreenGradientBackgroundLayer layer={layer.value} effectsOnly={effectsOnly} />
    </Animated.View>
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
  artBackdrop?: AppArtBackdropName | false;
  /**
   * Размытый верхний край (safe-зона): контент при скролле растворяется в фоне
   * у статус-бара/выреза, а не уходит резко в «шторку». Включайте на скролл-экранах.
   * Можно передать высоту хедера, чтобы маска покрыла и его.
   */
  topFade?: boolean | TopFadeMaskProps;
}

function ScreenGradient({ children, style, entranceOffsetY, staticParallaxY, forceFullBleed, artBackdrop, topFade }: Props) {
  const { theme: t, themeMode } = useTheme();
  const isNested = useContext(GradientActiveCtx);
  const defaultEntranceY = useRef(new Animated.Value(0)).current;

  const isGold = themeMode === 'gold';
  const cinemaMode = isCinemaMode(themeMode) ? themeMode : null;
  const orbs = ORBS[themeMode] ?? ORBS.dark;
  const gradColors = useMemo(
    () => BG_GRADIENTS[themeMode] ?? [t.bgGradient[0], t.bgGradient[1]],
    [themeMode, t.bgGradient],
  );
  const activeBgKey = `${themeMode}:${t.bgPrimary}:${t.accent}`;
  const targetBgLayer = useMemo<ScreenBgLayer>(() => ({
    key: activeBgKey,
    backgroundColor: t.bgPrimary,
    accent: t.accent,
    isGold,
    cinemaMode,
    gradColors,
    orbs,
  }), [activeBgKey, cinemaMode, gradColors, isGold, orbs, t.accent, t.bgPrimary]);
  const { layers: bgLayers } = usePersistentBackgroundLayers({
    value: targetBgLayer,
    transitionKey: activeBgKey,
    maxLayers: 4,
  });
  const childHasExplicitArtBackdrop = useMemo(() => hasExplicitArtBackdrop(children), [children]);
  const routeArtBackdropEnabled = (artBackdrop === undefined || artBackdrop === false) && !childHasExplicitArtBackdrop;
  const fixedArtBackdrop = typeof artBackdrop === 'string' ? artBackdrop : null;
  const topFadeOpts = topFade === true ? {} : (topFade || null);
  const topFadeNode = topFadeOpts ? <TopFadeMask {...topFadeOpts} /> : null;
  // Nested tab content lets the parent gradient show through.
  if (isNested && !forceFullBleed) {
    return (
      <View style={[{ flex: 1, backgroundColor: 'transparent' }, style]}>
        {children}
        {topFadeNode}
      </View>
    );
  }

  const staticY = staticParallaxY;
  const animatedY =
    SCREEN_GRADIENT_MOTION_ENABLED && staticParallaxY === undefined ? (entranceOffsetY ?? defaultEntranceY) : undefined;

  const bgLayerStyle: ViewStyle = {
    ...StyleSheet.absoluteFillObject,
    ...(staticY !== undefined
      ? { transform: [{ translateY: staticY }] }
      : animatedY !== undefined
        ? { transform: [{ translateY: animatedY }] }
        : {}),
  };
  const backgroundLayers = (
    <>
      {bgLayers.map(layer => renderBackgroundLayer(layer))}
      {fixedArtBackdrop ? <AppArtBackdrop name={fixedArtBackdrop} /> : routeArtBackdropEnabled ? <AppRouteArtBackdrop /> : null}
      {bgLayers.map(layer => renderBackgroundLayer(layer, true, MOTION_OVERLAY_OPACITY[themeMode]))}
    </>
  );

  return (
    <GradientActiveCtx.Provider value={true}>
      <View style={[{ flex: 1, backgroundColor: t.bgPrimary, overflow: 'visible' }, style]}>
        {animatedY === undefined ? (
          <View pointerEvents="none" collapsable={false} style={bgLayerStyle}>
            {backgroundLayers}
          </View>
        ) : (
          <Animated.View pointerEvents="none" collapsable={false} style={bgLayerStyle}>
            {backgroundLayers}
          </Animated.View>
        )}
        {children}
        {topFadeNode}
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

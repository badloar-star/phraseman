/**
 * LightningOverlay — процедурная ветвящаяся молния поверх экрана сессии
 * (спек §2 LightningOverlay, AC 4).
 *
 * Императивный ref: strike(big) рисует новый ветвящийся разряд. Главный канал —
 * ~20 сегментов с джиттером и притяжением к центру; 3-5 ветвей потоньше. Три
 * слоя (широкий полупрозрачный золотой / средний светлый / тонкое белое ядро) +
 * белый flash-слой с двойным миганием. Тайминг двойного удара: полная 70мс →
 * 0.15 60мс → НОВЫЙ путь 0.9 80мс → затухание 300мс. Edge-glow по уровню
 * (props level 0-3 через borderColor/shadow слои). ТРЯСКУ экрана НЕ делает —
 * хост сам (спек прямо это оговаривает).
 *
 * Гроза (level 3): при ВХОДЕ в уровень запускается КОНЕЧНАЯ серия из 5-6 слабых
 * зарниц (withRepeat с положительным счётчиком — не бесконечно, Perf Bible §6);
 * при потере фокуса (useIsScreenFocused) все анимации cancelAnimation. Оверлей —
 * absolute fill, pointerEvents='none'.
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Polyline } from 'react-native-svg';
import { useIsScreenFocused } from '../../hooks/use_is_screen_focused';

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

export interface LightningOverlayHandle {
  /** Ударить молнией. big=true — двойной удар (5/10 порог), false — одиночный. */
  strike(big: boolean): void;
}

export interface LightningOverlayProps {
  /** Уровень серии 0-3 — задаёт edge-glow рамку. */
  level?: number;
  /** Цвета слоёв (по умолчанию золото→светлый→белое ядро). */
  colors?: { wide: string; mid: string; core: string; flash: string };
}

const DEFAULT_COLORS = {
  wide: 'rgba(255, 210, 122, 0.55)',
  mid: 'rgba(255, 246, 230, 0.9)',
  core: '#FFFFFF',
  flash: 'rgba(255,255,255,0.85)',
};

// Детерминированный джиттер по seed (без Math.random в рендере worklet-путей;
// путь генерится в JS при strike, что допустимо — это разовое событие).
function rand(seed: number): number {
  const x = Math.sin(seed * 91.7 + 13.13) * 43758.5453;
  return x - Math.floor(x);
}

/** Главный канал: сверху вниз, джиттер по X с притяжением к центру. */
function buildMainChannel(w: number, h: number, seedBase: number): string {
  const segments = 20;
  const startX = w * (0.3 + rand(seedBase) * 0.4);
  const centerX = w * 0.5;
  const pts: string[] = [];
  for (let i = 0; i <= segments; i++) {
    const tt = i / segments;
    const y = h * tt;
    // База — интерполяция старт→центр, плюс затухающий джиттер.
    const baseX = startX + (centerX - startX) * tt;
    const jitterAmp = w * 0.12 * (1 - tt * 0.5);
    const jx = (rand(seedBase + i * 2.13) - 0.5) * 2 * jitterAmp;
    pts.push(`${(baseX + jx).toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

/** Ветви потоньше: отходят от случайных точек главного канала. */
function buildBranches(w: number, h: number, seedBase: number): string[] {
  const count = 3 + Math.floor(rand(seedBase + 99) * 3); // 3-5
  const branches: string[] = [];
  for (let b = 0; b < count; b++) {
    const startT = 0.2 + rand(seedBase + b * 7.7) * 0.6;
    const y0 = h * startT;
    const x0 = w * (0.35 + rand(seedBase + b * 3.3) * 0.3);
    const segs = 4 + Math.floor(rand(seedBase + b * 5.1) * 3);
    const dir = rand(seedBase + b) > 0.5 ? 1 : -1;
    const pts: string[] = [`${x0.toFixed(1)},${y0.toFixed(1)}`];
    let x = x0;
    let y = y0;
    for (let i = 1; i <= segs; i++) {
      x += dir * w * 0.06 * (0.6 + rand(seedBase + b * 10 + i));
      y += h * 0.05 * (0.5 + rand(seedBase + b * 20 + i));
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    branches.push(pts.join(' '));
  }
  return branches;
}

export const LightningOverlay = forwardRef<
  LightningOverlayHandle,
  LightningOverlayProps
>(function LightningOverlay({ level = 0, colors = DEFAULT_COLORS }, ref) {
  const { width: w, height: h } = useWindowDimensions();
  const focused = useIsScreenFocused();

  // Пути (генерятся при strike). Держим в state, чтобы SVG перерисовался.
  const [mainPath, setMainPath] = useState('');
  const [branches, setBranches] = useState<string[]>([]);

  const boltOpacity = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const stormFlicker = useSharedValue(0);

  const strike = useCallback(
    (big: boolean) => {
      const seed = Date.now() % 100000;
      setMainPath(buildMainChannel(w, h, seed));
      setBranches(buildBranches(w, h, seed));

      // Болт: полная 70мс → 0.15 60мс → (новый путь) 0.9 80мс → затухание 300мс.
      if (big) {
        boltOpacity.value = withSequence(
          withTiming(1, { duration: 70 }),
          withTiming(0.15, { duration: 60 }),
          withTiming(0.9, { duration: 80 }),
          withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) }),
        );
        // Второй путь чуть позже, чтобы двойной удар шёл «по новому каналу».
        const seed2 = seed + 4242;
        setTimeout(() => {
          setMainPath(buildMainChannel(w, h, seed2));
          setBranches(buildBranches(w, h, seed2));
        }, 130);
        // Белая вспышка: двойное мигание.
        flashOpacity.value = withSequence(
          withTiming(0.85, { duration: 50 }),
          withTiming(0.1, { duration: 70 }),
          withTiming(0.6, { duration: 60 }),
          withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) }),
        );
      } else {
        boltOpacity.value = withSequence(
          withTiming(1, { duration: 60 }),
          withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) }),
        );
        flashOpacity.value = withSequence(
          withTiming(0.5, { duration: 45 }),
          withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) }),
        );
      }
    },
    [w, h, boltOpacity, flashOpacity],
  );

  useImperativeHandle(ref, () => ({ strike }), [strike]);

  // Гроза: при входе в level 3 — конечная серия слабых зарниц (не бесконечно).
  useEffect(() => {
    if (level >= 3 && focused) {
      stormFlicker.value = withRepeat(
        withSequence(
          withDelay(
            700,
            withTiming(0.22, { duration: 90, easing: Easing.out(Easing.quad) }),
          ),
          withTiming(0, { duration: 260 }),
        ),
        6, // 5-6 зарниц, КОНЕЧНО
        false,
      );
    } else {
      stormFlicker.value = withTiming(0, { duration: 150 });
    }
    return () => cancelAnimation(stormFlicker);
  }, [level, focused, stormFlicker]);

  // Потеря фокуса — жёстко гасим ВСЕ анимации (Perf Bible §6).
  useEffect(() => {
    if (!focused) {
      cancelAnimation(boltOpacity);
      cancelAnimation(flashOpacity);
      cancelAnimation(stormFlicker);
      boltOpacity.value = 0;
      flashOpacity.value = 0;
      stormFlicker.value = 0;
    }
  }, [focused, boltOpacity, flashOpacity, stormFlicker]);

  useEffect(() => {
    return () => {
      cancelAnimation(boltOpacity);
      cancelAnimation(flashOpacity);
      cancelAnimation(stormFlicker);
    };
  }, [boltOpacity, flashOpacity, stormFlicker]);

  const boltAnimatedProps = useAnimatedProps(() => ({ opacity: boltOpacity.value }));
  const flashStyle = useAnimatedStyle(() => ({
    opacity: Math.max(flashOpacity.value, stormFlicker.value),
  }));

  // Edge-glow по уровню — рамка-свечение (тем ярче, чем выше уровень).
  const edgeStyle = useMemo(() => {
    if (level < 2) return null;
    const strong = level >= 3;
    return {
      borderColor: strong ? 'rgba(255,210,122,0.5)' : 'rgba(255,210,122,0.3)',
      borderWidth: strong ? 3 : 2,
      shadowColor: '#FFD27A',
      shadowOpacity: strong ? 0.6 : 0.35,
      shadowRadius: strong ? 24 : 14,
      shadowOffset: { width: 0, height: 0 },
    };
  }, [level]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* белая вспышка-слой (двойное мигание + зарницы грозы) */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.flash }, flashStyle]}
        pointerEvents="none"
      />

      {/* edge-glow рамка уровня */}
      {edgeStyle ? (
        <View style={[StyleSheet.absoluteFill, edgeStyle]} pointerEvents="none" />
      ) : null}

      {/* сам разряд: 3 слоя (широкий золотой / средний светлый / белое ядро) */}
      {mainPath ? (
        <Svg
          width={w}
          height={h}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {/* широкий полупрозрачный золотой */}
          <AnimatedPolyline
            points={mainPath}
            fill="none"
            stroke={colors.wide}
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
            animatedProps={boltAnimatedProps}
          />
          {branches.map((br, i) => (
            <AnimatedPolyline
              key={`bw-${i}`}
              points={br}
              fill="none"
              stroke={colors.wide}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              animatedProps={boltAnimatedProps}
            />
          ))}
          {/* средний светлый */}
          <AnimatedPolyline
            points={mainPath}
            fill="none"
            stroke={colors.mid}
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            animatedProps={boltAnimatedProps}
          />
          {branches.map((br, i) => (
            <AnimatedPolyline
              key={`bm-${i}`}
              points={br}
              fill="none"
              stroke={colors.mid}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              animatedProps={boltAnimatedProps}
            />
          ))}
          {/* тонкое белое ядро */}
          <AnimatedPolyline
            points={mainPath}
            fill="none"
            stroke={colors.core}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            animatedProps={boltAnimatedProps}
          />
        </Svg>
      ) : null}
    </View>
  );
});

export default LightningOverlay;

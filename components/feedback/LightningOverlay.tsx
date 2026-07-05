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
  // Мягкий тёплый flash вместо чистого белого — снижает контраст пиковой вспышки.
  flash: 'rgba(255, 236, 190, 0.4)',
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

      // A11y: НИКАКОГО стробоскопа. Белый flash-слой на весь экран с быстрым
      // двойным миганием (переходы 45-70мс, частота >3Гц + большая яркая площадь)
      // — классический эпилептический триггер. Поэтому: болт — один плавный
      // подъём и мягкое затухание; flash — одна короткая слабая вспышка без
      // повторных миганий. Второй «канал» двойного удара тоже убран (это и
      // давало второе резкое мигание).
      if (big) {
        boltOpacity.value = withSequence(
          withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) }),
        );
        // Одна мягкая вспышка (пик 0.4 из DEFAULT_COLORS), без двойного мигания.
        flashOpacity.value = withSequence(
          withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 380, easing: Easing.out(Easing.quad) }),
        );
      } else {
        boltOpacity.value = withSequence(
          withTiming(1, { duration: 100, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 340, easing: Easing.out(Easing.quad) }),
        );
        flashOpacity.value = withSequence(
          withTiming(0.7, { duration: 80, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) }),
        );
      }
    },
    [w, h, boltOpacity, flashOpacity],
  );

  useImperativeHandle(ref, () => ({ strike }), [strike]);

  // Гроза (level 3): раньше здесь шла повторяющаяся серия белых зарниц на весь
  // экран — это тоже стробоскоп (мелькание фонового слоя). Убрано ради a11y:
  // грозовой слой больше не мигает. Edge-glow рамка уровня остаётся статичной.
  useEffect(() => {
    stormFlicker.value = 0;
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

  // Статичная жёлтая edge-glow рамка убрана по просьбе пользователя: постоянная
  // обводка на экране урока раздражала. Анимация разряда/вспышки остаётся —
  // именно она даёт ощущение серии, а не статичная рамка.
  const edgeStyle = null;

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
